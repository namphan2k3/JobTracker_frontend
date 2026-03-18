import { Outlet } from 'react-router-dom';

/**
 * Layout cho System Admin - chỉ hiển thị khi user.roleName === SYSTEM_ADMIN.
 * Navigation đã chuyển sang submenu "Quản lý hệ thống" trong sidebar chính.
 */
export function SystemAdminLayout() {
  return <Outlet />;
}
