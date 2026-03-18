import { apiClient } from './client';

/**
 * POST /admin/payments
 * Tạo payment (INIT) và lấy paymentUrl để redirect sang VNPAY.
 * @param {{ companyId: string, companySubscriptionId: string, amount: number, currency?: string, gateway?: string, txnRef?: string }}
 * @returns {{ payment, paymentUrl }} - paymentUrl dùng để window.location.href
 */
export async function initPayment(payload) {
  const { data } = await apiClient.post('/admin/payments', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo thanh toán thất bại');
  }
  const result = data.data;
  const payment = result.payment ?? result;
  const paymentUrl = result.paymentUrl ?? result.payment?.paymentUrl ?? null;
  return { payment, paymentUrl };
}

/**
 * GET /admin/payments/{id}
 */
export async function getPaymentById(id) {
  const { data } = await apiClient.get(`/admin/payments/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin thanh toán thất bại');
  }
  return data.data;
}

/**
 * GET /admin/payments
 * Danh sách payments toàn hệ thống (admin).
 * @param {{ page?: number, size?: number, sort?: string }}
 */
export async function getPayments(params = {}) {
  const { data } = await apiClient.get('/admin/payments', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách thanh toán thất bại');
  }
  return {
    payments: data.data,
    pagination: data.paginationInfo,
  };
}

/**
 * GET /companies/{companyId}/payments
 * Lịch sử thanh toán theo company.
 * @param {{ page?: number, size?: number, sort?: string }}
 */
export async function getCompanyPayments(companyId, params = {}) {
  const { data } = await apiClient.get(`/companies/${companyId}/payments`, {
    params,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy lịch sử thanh toán thất bại');
  }
  return {
    payments: data.data,
    pagination: data.paginationInfo,
  };
}

/**
 * GET /company-subscriptions/{companySubscriptionId}/payments
 * Lịch sử payments cho một subscription.
 * @param {{ page?: number, size?: number }}
 */
export async function getSubscriptionPayments(companySubscriptionId, params = {}) {
  const { data } = await apiClient.get(
    `/company-subscriptions/${companySubscriptionId}/payments`,
    { params }
  );
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy lịch sử thanh toán thất bại');
  }
  return {
    payments: data.data,
    pagination: data.paginationInfo,
  };
}
