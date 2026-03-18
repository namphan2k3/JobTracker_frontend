import { Outlet } from 'react-router-dom';

/**
 * Wrapper cho admin routes - chỉ render Outlet.
 * Có thể thêm role check (ADMIN_COMPANY, SYSTEM_ADMIN) sau.
 */
export function AdminLayout() {
  return <Outlet />;
}
