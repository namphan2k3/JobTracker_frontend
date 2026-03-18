import { apiClient } from './client';

/**
 * GET /admin/permissions
 * Lấy danh sách permissions (không paginate)
 */
export async function getPermissions() {
  const { data } = await apiClient.get('/admin/permissions');
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách permissions thất bại');
  }
  return data.data || [];
}

/**
 * GET /admin/permissions/{id}
 */
export async function getPermissionById(id) {
  const { data } = await apiClient.get(`/admin/permissions/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin permission thất bại');
  }
  return data.data;
}

/**
 * POST /admin/permissions
 * @param {{ name: string, resource: string, action: string, description?: string, isActive?: boolean }}
 */
export async function createPermission(payload) {
  const { data } = await apiClient.post('/admin/permissions', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo permission thất bại');
  }
  return data.data;
}

/**
 * PUT /admin/permissions/{id}
 * @param {{ description?: string, isActive?: boolean }}
 */
export async function updatePermission(id, payload) {
  const { data } = await apiClient.put(`/admin/permissions/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật permission thất bại');
  }
  return data.data;
}

/**
 * DELETE /admin/permissions/{id}
 */
export async function deletePermission(id) {
  const { data } = await apiClient.delete(`/admin/permissions/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa permission thất bại');
  }
  return data;
}
