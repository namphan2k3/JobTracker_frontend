import { apiClient } from './client';

/**
 * POST /admin/company-subscriptions
 * Tạo subscription record cho company (upgrade/downgrade plan).
 * @param {{ companyId: string, planId: string, startDate: string, endDate?: string, status?: string }}
 */
export async function createCompanySubscription(payload) {
  const { data } = await apiClient.post('/admin/company-subscriptions', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo subscription thất bại');
  }
  return data.data;
}

/**
 * GET /admin/company-subscriptions/{id}
 */
export async function getCompanySubscriptionById(id) {
  const { data } = await apiClient.get(`/admin/company-subscriptions/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin subscription thất bại');
  }
  return data.data;
}

/**
 * GET /admin/company-subscriptions
 * Danh sách tất cả company subscriptions (admin).
 * @param {{ page?: number, size?: number, sort?: string, companyId?: string, status?: string }}
 */
export async function getCompanySubscriptions(params = {}) {
  const { data } = await apiClient.get('/admin/company-subscriptions', {
    params,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách subscription thất bại');
  }
  return {
    subscriptions: data.data,
    pagination: data.paginationInfo,
  };
}
