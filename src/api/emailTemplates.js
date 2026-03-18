import { apiClient } from './client';

/**
 * GET /admin/email-templates
 * @param {{ code?: string, name?: string, isActive?: boolean }}
 */
export async function getEmailTemplates(params = {}) {
  const { data } = await apiClient.get('/admin/email-templates', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách email templates thất bại');
  }
  return data.data || [];
}

/**
 * GET /admin/email-templates/{id}
 */
export async function getEmailTemplateById(id) {
  const { data } = await apiClient.get(`/admin/email-templates/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy email template thất bại');
  }
  return data.data;
}

/**
 * POST /admin/email-templates
 * @param {{ code: string, name: string, subject: string, htmlContent: string, variables?: string[], fromName?: string, isActive?: boolean }}
 */
export async function createEmailTemplate(payload) {
  const { data } = await apiClient.post('/admin/email-templates', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo email template thất bại');
  }
  return data.data;
}

/**
 * PUT /admin/email-templates/{id}
 * @param {{ subject?: string, htmlContent?: string, fromName?: string, isActive?: boolean }}
 */
export async function updateEmailTemplate(id, payload) {
  const { data } = await apiClient.put(`/admin/email-templates/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật email template thất bại');
  }
  return data.data;
}

/**
 * DELETE /admin/email-templates/{id}
 */
export async function deleteEmailTemplate(id) {
  const { data } = await apiClient.delete(`/admin/email-templates/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa email template thất bại');
  }
  return data;
}

/**
 * POST /admin/email-templates/{id}/preview
 * @param {{ sampleData?: object, applicationId?: string, interviewId?: string }}
 */
export async function previewEmailTemplate(id, payload = {}) {
  const { data } = await apiClient.post(`/admin/email-templates/${id}/preview`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Preview email template thất bại');
  }
  return data.data;
}

/**
 * POST /admin/email-templates/{id}/send-test
 * @param {{ toEmail?: string }}
 */
export async function sendTestEmail(id, payload = {}) {
  const { data } = await apiClient.post(`/admin/email-templates/${id}/send-test`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Gửi email test thất bại');
  }
  return data.data;
}
