import { apiClient } from './client';

/**
 * GET /admin/roles
 * Lấy danh sách roles (không paginate)
 */
export async function getRoles() {
  const { data } = await apiClient.get('/admin/roles');
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách roles thất bại');
  }
  return data.data || [];
}

/**
 * GET /admin/roles/{id}
 */
export async function getRoleById(id) {
  const { data } = await apiClient.get(`/admin/roles/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin role thất bại');
  }
  return data.data;
}

/**
 * POST /admin/roles
 * @param {{ name: string, description?: string, isActive?: boolean }}
 */
export async function createRole(payload) {
  const { data } = await apiClient.post('/admin/roles', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo role thất bại');
  }
  return data.data;
}

/**
 * PUT /admin/roles/{id}
 * @param {{ description?: string, isActive?: boolean }}
 */
export async function updateRole(id, payload) {
  const { data } = await apiClient.put(`/admin/roles/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật role thất bại');
  }
  return data.data;
}

/**
 * DELETE /admin/roles/{id}
 */
export async function deleteRole(id) {
  const { data } = await apiClient.delete(`/admin/roles/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa role thất bại');
  }
  return data;
}

/**
 * GET /admin/roles/{roleId}/permissions
 */
export async function getRolePermissions(roleId) {
  const { data } = await apiClient.get(`/admin/roles/${roleId}/permissions`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy permissions của role thất bại');
  }
  return data.data || [];
}

/**
 * PUT /admin/roles/{roleId}/permissions
 * @param {{ permissionIds: string[] }}
 */
export async function updateRolePermissions(roleId, { permissionIds }) {
  const { data } = await apiClient.put(`/admin/roles/${roleId}/permissions`, {
    permissionIds,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật permissions thất bại');
  }
  return data.data;
}

/**
 * POST /admin/roles/{roleId}/permissions
 * @param {{ permissionId: string }}
 */
export async function addRolePermission(roleId, { permissionId }) {
  const { data } = await apiClient.post(`/admin/roles/${roleId}/permissions`, {
    permissionId,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Thêm permission thất bại');
  }
  return data.data;
}

/**
 * DELETE /admin/roles/{roleId}/permissions/{permissionId}
 */
export async function removeRolePermission(roleId, permissionId) {
  const { data } = await apiClient.delete(
    `/admin/roles/${roleId}/permissions/${permissionId}`
  );
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa permission khỏi role thất bại');
  }
  return data;
}
