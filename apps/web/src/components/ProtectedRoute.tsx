import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { PermissionKey } from '@pixel/shared';
import { useAuth } from '../lib/auth.js';
import { Spinner } from './ui.js';

/** Gate a subtree behind authentication and (optionally) a capability. */
export function ProtectedRoute({
  children,
  permission,
}: {
  children: ReactNode;
  permission?: PermissionKey;
}) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (permission && !can(permission)) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        You don’t have permission to view this page.
      </div>
    );
  }
  return <>{children}</>;
}
