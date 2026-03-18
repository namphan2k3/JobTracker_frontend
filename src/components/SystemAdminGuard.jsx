import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Chỉ cho phép SYSTEM_ADMIN truy cập.
 * Company Admin và Recruiter bị redirect về /app/dashboard.
 */
export function SystemAdminGuard({ children }) {
  const user = useAuthStore((s) => s.user);
  const isSystemAdmin = user?.roleName === 'SYSTEM_ADMIN';

  if (!isSystemAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}
