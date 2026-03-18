import { apiClient } from './client';

/**
 * GET /admin/subscription-plans
 * Lấy danh sách gói subscription (dùng cho pricing page, chọn gói nâng cấp).
 * Trả về List, không paginate.
 */
export async function getSubscriptionPlans() {
  const { data } = await apiClient.get('/admin/subscription-plans');
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách gói thất bại');
  }
  return data.data || [];
}

/**
 * GET /admin/subscription-plans/{id}
 */
export async function getSubscriptionPlanById(id) {
  const { data } = await apiClient.get(`/admin/subscription-plans/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin gói thất bại');
  }
  return data.data;
}

/**
 * POST /admin/subscription-plans
 * @param {{ code: string, name: string, price?: number, durationDays?: number, maxJobs?: number, maxUsers?: number, maxApplications?: number, isActive?: boolean }}
 */
export async function createSubscriptionPlan(payload) {
  const { data } = await apiClient.post('/admin/subscription-plans', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo gói thất bại');
  }
  return data.data;
}

/**
 * PUT /admin/subscription-plans/{id}
 */
export async function updateSubscriptionPlan(id, payload) {
  const { data } = await apiClient.put(`/admin/subscription-plans/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật gói thất bại');
  }
  return data.data;
}

/**
 * DELETE /admin/subscription-plans/{id}
 * Backend mark isActive = false
 */
export async function deleteSubscriptionPlan(id) {
  const { data } = await apiClient.delete(`/admin/subscription-plans/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa gói thất bại');
  }
  return data.data;
}
