import { apiClient } from './client';

/**
 * GET /admin/email-history
 * @param {{ page?: number, size?: number, status?: string, emailType?: string, aggregateType?: string, aggregateId?: string, toEmail?: string, startDate?: string, endDate?: string }}
 */
export async function getEmailHistory(params = {}) {
  const { data } = await apiClient.get('/admin/email-history', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy lịch sử email thất bại');
  }
  const content = data.data?.content ?? data.data ?? [];
  const pagination = data.data?.totalElements != null
    ? {
        totalElements: data.data.totalElements,
        totalPages: data.data.totalPages ?? 1,
        page: data.data.number ?? 0,
        size: data.data.size ?? 20,
      }
    : data.paginationInfo;
  return { emails: content, pagination };
}

/**
 * GET /admin/email-history/{id}
 */
export async function getEmailHistoryById(id) {
  const { data } = await apiClient.get(`/admin/email-history/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy chi tiết email thất bại');
  }
  return data.data;
}

/**
 * POST /admin/email-history/{id}/resend
 * Resend email FAILED (chỉ khi status = FAILED)
 */
export async function resendEmail(id) {
  const { data } = await apiClient.post(`/admin/email-history/${id}/resend`);
  if (!data?.success) {
    throw new Error(data?.message || 'Gửi lại email thất bại');
  }
  return data;
}
