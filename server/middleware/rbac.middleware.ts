import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { securityLogger } from '../utils/securityLogger.js';

// Role-based access control middleware
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum Permission {
  // User permissions
  READ_OWN_PROFILE = 'read:own_profile',
  UPDATE_OWN_PROFILE = 'update:own_profile',
  DELETE_OWN_ACCOUNT = 'delete:own_account',
  READ_OWN_ORDERS = 'read:own_orders',
  CREATE_OWN_ORDERS = 'create:own_orders',

  // Product permissions
  READ_PRODUCTS = 'read:products',
  CREATE_PRODUCTS = 'create:products',
  UPDATE_PRODUCTS = 'update:products',
  DELETE_PRODUCTS = 'delete:products',

  // Order permissions
  READ_ALL_ORDERS = 'read:all_orders',
  UPDATE_ORDERS = 'update:orders',
  DELETE_ORDERS = 'delete:orders',
  VERIFY_ORDERS = 'verify:orders',

  // User management permissions
  READ_ALL_USERS = 'read:all_users',
  UPDATE_USERS = 'update:users',
  DELETE_USERS = 'delete:users',
  MANAGE_USER_ROLES = 'manage:user_roles',

  // System permissions
  READ_SYSTEM_LOGS = 'read:system_logs',
  MANAGE_SYSTEM = 'manage:system',
  MANAGE_SECURITY = 'manage:security',
}

// Role permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.DELETE_OWN_ACCOUNT,
    Permission.READ_OWN_ORDERS,
    Permission.CREATE_OWN_ORDERS,
    Permission.READ_PRODUCTS,
  ],

  [UserRole.ADMIN]: [
    // All user permissions
    ...Object.values(Permission),
    // Remove super admin specific
    Permission.MANAGE_SYSTEM,
    Permission.MANAGE_SECURITY,
  ],

  [UserRole.SUPER_ADMIN]: Object.values(Permission),
};

// Resource ownership verification
export interface ResourceOwner {
  userId: string;
  resourceType: string;
  resourceId: string;
}

/**
 * Check if user has required permission
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        securityLogger.logAuthzEvent(
          'permission_check',
          'anonymous',
          permission,
          req.ip || 'unknown',
          false,
          { permission }
        );

        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      const userRole = user.role as UserRole;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];

      if (!userPermissions.includes(permission)) {
        securityLogger.logAuthzEvent(
          'permission_denied',
          user.id,
          permission,
          req.ip || 'unknown',
          false,
          { permission, userRole }
        );

        return next(new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
      }

      securityLogger.logAuthzEvent(
        'permission_granted',
        user.id,
        permission,
        req.ip || 'unknown',
        true,
        { permission, userRole }
      );

      next();
    } catch (error) {
      next(new AppError('Permission check failed', 500, 'PERMISSION_CHECK_ERROR'));
    }
  };
};

/**
 * Check if user has any of the required permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      const userRole = user.role as UserRole;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];

      const hasPermission = permissions.some((permission) => userPermissions.includes(permission));

      if (!hasPermission) {
        securityLogger.logAuthzEvent(
          'any_permission_denied',
          user.id,
          permissions.join(','),
          req.ip || 'unknown',
          false,
          { requiredPermissions: permissions, userRole }
        );

        return next(new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
      }

      securityLogger.logAuthzEvent(
        'any_permission_granted',
        user.id,
        permissions.join(','),
        req.ip || 'unknown',
        true,
        { grantedPermissions: permissions, userRole }
      );

      next();
    } catch (error) {
      next(new AppError('Permission check failed', 500, 'PERMISSION_CHECK_ERROR'));
    }
  };
};

/**
 * Check if user has required role
 */
export const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      const userRole = user.role as UserRole;

      if (userRole !== role) {
        securityLogger.logAuthzEvent('role_denied', user.id, role, req.ip || 'unknown', false, {
          requiredRole: role,
          userRole,
        });

        return next(new AppError('Insufficient role privileges', 403, 'INSUFFICIENT_ROLE'));
      }

      securityLogger.logAuthzEvent('role_granted', user.id, role, req.ip || 'unknown', true, {
        role,
      });

      next();
    } catch (error) {
      next(new AppError('Role check failed', 500, 'ROLE_CHECK_ERROR'));
    }
  };
};

/**
 * Check if user has minimum role level or higher
 */
export const requireMinimumRole = (minimumRole: UserRole) => {
  const roleHierarchy = {
    [UserRole.USER]: 0,
    [UserRole.ADMIN]: 1,
    [UserRole.SUPER_ADMIN]: 2,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      const userRole = user.role as UserRole;
      const userLevel = roleHierarchy[userRole] || 0;
      const requiredLevel = roleHierarchy[minimumRole] || 0;

      if (userLevel < requiredLevel) {
        securityLogger.logAuthzEvent(
          'minimum_role_denied',
          user.id,
          minimumRole,
          req.ip || 'unknown',
          false,
          { minimumRole, userRole, userLevel, requiredLevel }
        );

        return next(new AppError('Insufficient role privileges', 403, 'INSUFFICIENT_ROLE'));
      }

      securityLogger.logAuthzEvent(
        'minimum_role_granted',
        user.id,
        minimumRole,
        req.ip || 'unknown',
        true,
        { minimumRole, userRole }
      );

      next();
    } catch (error) {
      next(new AppError('Role check failed', 500, 'ROLE_CHECK_ERROR'));
    }
  };
};

/**
 * Resource ownership verification middleware
 */
export const requireResourceOwnership = (
  getResourceOwner: (req: Request) => Promise<ResourceOwner | null>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      // Admin users can access any resource
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
        securityLogger.logAuthzEvent(
          'admin_resource_access',
          user.id,
          'admin_override',
          req.ip || 'unknown',
          true,
          { resourceType: req.params.resourceType, resourceId: req.params.id }
        );
        return next();
      }

      // Get resource owner information
      const resourceOwner = await getResourceOwner(req);

      if (!resourceOwner) {
        return next(new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND'));
      }

      // Check if user owns the resource
      if (resourceOwner.userId !== user.id) {
        securityLogger.logAuthzEvent(
          'resource_ownership_denied',
          user.id,
          'resource_access',
          req.ip || 'unknown',
          false,
          {
            resourceType: resourceOwner.resourceType,
            resourceId: resourceOwner.resourceId,
            resourceOwner: resourceOwner.userId,
          }
        );

        return next(
          new AppError(
            'Access denied: Resource ownership required',
            403,
            'RESOURCE_OWNERSHIP_REQUIRED'
          )
        );
      }

      securityLogger.logAuthzEvent(
        'resource_ownership_granted',
        user.id,
        'resource_access',
        req.ip || 'unknown',
        true,
        {
          resourceType: resourceOwner.resourceType,
          resourceId: resourceOwner.resourceId,
        }
      );

      next();
    } catch (error) {
      next(new AppError('Resource ownership check failed', 500, 'RESOURCE_OWNERSHIP_CHECK_ERROR'));
    }
  };
};

/**
 * Self-access or admin access middleware
 */
export const requireSelfOrAdmin = (getUserId: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      const targetUserId = getUserId(req);
      const currentUserId = user.id;
      const userRole = user.role as UserRole;

      // Allow access if user is accessing their own resource or is admin
      const isSelf = currentUserId === targetUserId;
      const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

      if (!isSelf && !isAdmin) {
        securityLogger.logAuthzEvent(
          'self_or_admin_denied',
          currentUserId,
          'self_or_admin_access',
          req.ip || 'unknown',
          false,
          { targetUserId, userRole, isSelf, isAdmin }
        );

        return next(
          new AppError(
            'Access denied: Self or admin access required',
            403,
            'SELF_OR_ADMIN_REQUIRED'
          )
        );
      }

      securityLogger.logAuthzEvent(
        'self_or_admin_granted',
        currentUserId,
        'self_or_admin_access',
        req.ip || 'unknown',
        true,
        { targetUserId, userRole, accessType: isSelf ? 'self' : 'admin' }
      );

      next();
    } catch (error) {
      next(new AppError('Self or admin check failed', 500, 'SELF_OR_ADMIN_CHECK_ERROR'));
    }
  };
};

/**
 * Rate limiting based on user role
 */
export const roleBasedRateLimit = (
  limits: Partial<Record<UserRole, { windowMs: number; max: number }>>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
      }

      const userRole = user.role as UserRole;
      const limit = limits[userRole];

      if (!limit) {
        return next(); // No rate limit for this role
      }

      // Store rate limit info for rate limiting middleware
      req.rateLimit = {
        windowMs: limit.windowMs,
        max: limit.max,
        keyGenerator: () => `rate_limit:${userRole}:${user.id}`,
      };

      next();
    } catch (error) {
      next(new AppError('Role-based rate limit check failed', 500, 'ROLE_RATE_LIMIT_ERROR'));
    }
  };
};

/**
 * IP-based access control for sensitive operations
 */
export const requireTrustedIP = (trustedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      if (!trustedIPs.includes(clientIP)) {
        securityLogger.logAuthzEvent(
          'trusted_ip_denied',
          req.user?.id || 'anonymous',
          'trusted_ip_access',
          clientIP,
          false,
          { clientIP, trustedIPs }
        );

        return next(new AppError('Access denied: Untrusted IP address', 403, 'UNTRUSTED_IP'));
      }

      securityLogger.logAuthzEvent(
        'trusted_ip_granted',
        req.user?.id || 'anonymous',
        'trusted_ip_access',
        clientIP,
        true,
        { clientIP }
      );

      next();
    } catch (error) {
      next(new AppError('Trusted IP check failed', 500, 'TRUSTED_IP_CHECK_ERROR'));
    }
  };
};

/**
 * Time-based access control
 */
export const requireTimeWindow = (timeWindow: {
  start: string;
  end: string;
  timezone?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const timezone = timeWindow.timezone || 'UTC';

      // Convert times to specified timezone
      const currentTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const startTime = new Date(timeWindow.start);
      const endTime = new Date(timeWindow.end);

      if (currentTime < startTime || currentTime > endTime) {
        securityLogger.logAuthzEvent(
          'time_window_denied',
          req.user?.id || 'anonymous',
          'time_window_access',
          req.ip || 'unknown',
          false,
          { currentTime, timeWindow }
        );

        return next(
          new AppError('Access denied: Outside allowed time window', 403, 'TIME_WINDOW_VIOLATION')
        );
      }

      securityLogger.logAuthzEvent(
        'time_window_granted',
        req.user?.id || 'anonymous',
        'time_window_access',
        req.ip || 'unknown',
        true,
        { currentTime, timeWindow }
      );

      next();
    } catch (error) {
      next(new AppError('Time window check failed', 500, 'TIME_WINDOW_CHECK_ERROR'));
    }
  };
};

// Export types for use in other modules
export { UserRole, Permission };
export default {
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireMinimumRole,
  requireResourceOwnership,
  requireSelfOrAdmin,
  roleBasedRateLimit,
  requireTrustedIP,
  requireTimeWindow,
  UserRole,
  Permission,
};
