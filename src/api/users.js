import { apiClient } from './client';

/**
 * GET /users/profile
 */
export async function getProfile() {
  const { data } = await apiClient.get('/users/profile');
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy profile thất bại');
  }
  return data.data;
}

/**
 * PUT /users/profile
 * @param {{ firstName?: string, lastName?: string, phone?: string }}
 */
export async function updateProfile(payload) {
  const { data } = await apiClient.put('/users/profile', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật profile thất bại');
  }
  return data.data;
}

/**
 * POST /users/avatar
 * @param {File} file
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/users/avatar', formData);
  if (!data?.success) {
    throw new Error(data?.message || 'Upload avatar thất bại');
  }
  return data.data;
}

/**
 * PUT /users/change-password
 * @param {{ currentPassword: string, newPassword: string }}
 */
export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await apiClient.put('/users/change-password', {
    currentPassword,
    newPassword,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Đổi mật khẩu thất bại');
  }
  return data;
}
