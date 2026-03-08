import jwtService from '../services/jwtService.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'NO_TOKEN',
                    message: 'Authentication required. Please provide a valid token.'
                }
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwtService.verifyAccessToken(token);

        // Get user from database
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User associated with this token no longer exists'
                }
            });
        }

        // Check if user can login
        if (!user.canLogin()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'ACCOUNT_SUSPENDED',
                    message: `Your account is ${user.status}. Please contact support.`
                }
            });
        }

        // Attach user and decoded token to request
        req.user = user;
        req.tokenPayload = decoded;

        next();
    } catch (error) {
        logger.debug(`Auth middleware error: ${error.message}`);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Your session has expired. Please refresh your token.'
                }
            });
        }

        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid authentication token'
            }
        });
    }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token provided, but attaches user if valid token exists
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwtService.verifyAccessToken(token);
        const user = await User.findById(decoded.userId);

        if (user && user.canLogin()) {
            req.user = user;
            req.tokenPayload = decoded;
        }

        next();
    } catch (error) {
        // Silently continue without auth
        next();
    }
};

export default authenticate;
