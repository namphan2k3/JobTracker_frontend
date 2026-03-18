import { apiClient } from './client';

/**
 * GET /notifications
 * @param {{ page?: number, size?: number, isRead?: boolean, type?: string, applicationId?: string }}
 */
export async function getNotifications(params = {}) {
  const { data } = await apiClient.get('/notifications', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy notifications thất bại');
  }
  return {
    notifications: data.data || [],
    pagination: data.paginationInfo,
  };
}

/**
 * GET /notifications/{id}
 */
export async function getNotificationById(id) {
  const { data } = await apiClient.get(`/notifications/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy notification thất bại');
  }
  return data.data;
}

/**
 * PATCH /notifications/{id}/read
 */
export async function markNotificationAsRead(id) {
  const { data } = await apiClient.patch(`/notifications/${id}/read`);
  if (!data?.success) {
    throw new Error(data?.message || 'Đánh dấu đã đọc thất bại');
  }
  return data.data;
}

/**
 * PATCH /notifications/read-all
 */
export async function markAllNotificationsAsRead() {
  const { data } = await apiClient.patch('/notifications/read-all');
  if (!data?.success) {
    throw new Error(data?.message || 'Đánh dấu tất cả đã đọc thất bại');
  }
  return data.data;
}

/**
 * POST /notifications (Manual/Admin)
 * @param {{ userId: string, companyId: string, jobId?: string, applicationId?: string, type: string, priority?: string, title: string, message: string, scheduledAt?: string, metadata?: object }}
 */
export async function createNotification(payload) {
  const { data } = await apiClient.post('/notifications', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo notification thất bại');
  }
  return data.data;
}

/**
 * DELETE /notifications/{id}
 */
export async function deleteNotification(id) {
  const { data } = await apiClient.delete(`/notifications/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa notification thất bại');
  }
  return data;
}
