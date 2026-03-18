import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Chỉ cho phép ADMIN_COMPANY hoặc SYSTEM_ADMIN truy cập admin routes.
 * RECRUITER bị redirect về /app/dashboard.
 */
export function AdminGuard({ children }) {
  const { isAdminCompany, isSystemAdmin } = usePermissions();

  if (!isAdminCompany && !isSystemAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}
