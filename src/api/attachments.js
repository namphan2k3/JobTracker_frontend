import { apiClient } from './client';

/**
 * GET /applications/{applicationId}/attachments
 */
export async function getApplicationAttachments(applicationId) {
  const { data } = await apiClient.get(`/applications/${applicationId}/attachments`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy attachments thất bại');
  }
  return data.data || [];
}

/**
 * POST /applications/{applicationId}/attachments
 * HR upload - FormData: file, attachmentType (RESUME|COVER_LETTER|CERTIFICATE|PORTFOLIO|OTHER), description?
 * RESUME triggers CV re-scoring
 */
export async function uploadAttachment(applicationId, formData) {
  const { data } = await apiClient.post(
    `/applications/${applicationId}/attachments`,
    formData
  );
  if (!data?.success) {
    throw new Error(data?.message || 'Upload thất bại');
  }
  return data.data;
}

/**
 * GET /attachments/{id}/download-url
 * Backend trả signed URL → window.open để tải file, tránh CORS.
 */
export async function downloadAttachment(attachmentId) {
  const res = await apiClient.get(`/attachments/${attachmentId}/download-url`);
  window.open(res.data, '_blank');
}

/**
 * DELETE /attachments/{id}
 */
export async function deleteAttachment(attachmentId) {
  const { data } = await apiClient.delete(`/attachments/${attachmentId}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa attachment thất bại');
  }
  return data;
}
