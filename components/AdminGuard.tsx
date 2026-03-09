import React from 'react';

interface AdminGuardProps {
  user: { role?: string } | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AdminGuard — only renders children when the current user has role === 'admin'.
 *
 * Usage:
 *   <AdminGuard user={user}>
 *     <AdminDashboard onClose={...} />
 *   </AdminGuard>
 *
 * This is intentionally a component (not just a conditional check in App.tsx)
 * so that admin-only subtrees are truly unmounted when the user is not an admin
 * and cannot be reached by client-side navigation or direct DOM manipulation.
 */
const AdminGuard: React.FC<AdminGuardProps> = ({ user, children, fallback = null }) => {
  if (!user || user.role !== 'admin') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AdminGuard;
