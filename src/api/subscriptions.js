import { apiClient } from './client';

/**
 * GET /companies/{companyId}/subscription
 * Lấy subscription hiện tại (ACTIVE) của company, kèm thông tin gói.
 * 404 khi chưa có subscription.
 */
export async function getCompanySubscription(companyId) {
  const { data } = await apiClient.get(`/companies/${companyId}/subscription`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy subscription thất bại');
  }
  return data.data;
}

/**
 * GET /companies/{companyId}/subscriptions
 * Lấy lịch sử subscription của company (billing/audit).
 * @param {{ page?: number, size?: number, status?: string, sort?: string }}
 */
export async function getCompanySubscriptionHistory(companyId, params = {}) {
  const { data } = await apiClient.get(`/companies/${companyId}/subscriptions`, {
    params,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy lịch sử subscription thất bại');
  }
  return {
    subscriptions: data.data,
    pagination: data.paginationInfo,
  };
}
