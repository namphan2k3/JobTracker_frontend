import { apiClient } from './client';

/**
 * GET /admin/users
 * @param {{ page?: number, size?: number, role?: string, status?: string, search?: string, createdFrom?: string }}
 */
export async function getUsers(params = {}) {
  const { data } = await apiClient.get('/admin/users', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách users thất bại');
  }
  return { users: data.data, pagination: data.paginationInfo };
}

/**
 * GET /admin/users/{id}
 */
export async function getUserById(id) {
  const { data } = await apiClient.get(`/admin/users/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin user thất bại');
  }
  return data.data;
}

/**
 * POST /admin/users/employees
 * @param {{ email: string, firstName: string, lastName: string, phone?: string }}
 */
export async function addEmployee(payload) {
  const { data } = await apiClient.post('/admin/users/employees', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Thêm nhân viên thất bại');
  }
  return data.data;
}

/**
 * POST /admin/users/invite
 * @param {{ email: string, firstName: string, lastName: string, phone?: string, roleId?: string }}
 */
export async function inviteUser(payload) {
  const { data } = await apiClient.post('/admin/users/invite', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Mời user thất bại');
  }
  return data;
}

/**
 * POST /admin/users/{userId}/resend-invite
 */
export async function resendInvite(userId) {
  const { data } = await apiClient.post(`/admin/users/${userId}/resend-invite`);
  if (!data?.success) {
    throw new Error(data?.message || 'Gửi lại invite thất bại');
  }
  return data;
}

/**
 * PUT /admin/users/{id}
 * @param {{ firstName?: string, lastName?: string, phone?: string, roleId?: string, isActive?: boolean }}
 */
export async function updateUser(id, payload) {
  const { data } = await apiClient.put(`/admin/users/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật user thất bại');
  }
  return data.data;
}

/**
 * DELETE /admin/users/{id}
 */
export async function deleteUser(id) {
  const { data } = await apiClient.delete(`/admin/users/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Vô hiệu hóa user thất bại');
  }
  return data;
}

/**
 * PATCH /admin/users/{id}/restore
 */
export async function restoreUser(id) {
  const { data } = await apiClient.patch(`/admin/users/${id}/restore`);
  if (!data?.success) {
    throw new Error(data?.message || 'Khôi phục user thất bại');
  }
  return data;
}
