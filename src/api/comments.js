import { apiClient } from './client';

/**
 * GET /applications/{applicationId}/comments
 * @param {{ page?: number, size?: number, sort?: string, isInternal?: boolean }}
 */
export async function getApplicationComments(applicationId, params = {}) {
  const { data } = await apiClient.get(`/applications/${applicationId}/comments`, {
    params,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy comments thất bại');
  }
  return {
    comments: data.data || [],
    pagination: data.paginationInfo,
  };
}

/**
 * POST /applications/{applicationId}/comments
 * @param {{ commentText: string, isInternal?: boolean }}
 */
export async function createComment(applicationId, payload) {
  const { data } = await apiClient.post(`/applications/${applicationId}/comments`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo comment thất bại');
  }
  return data.data;
}

/**
 * PUT /applications/{applicationId}/comments/{commentId}
 * @param {{ commentText?: string, isInternal?: boolean }}
 */
export async function updateComment(applicationId, commentId, payload) {
  const { data } = await apiClient.put(
    `/applications/${applicationId}/comments/${commentId}`,
    payload
  );
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật comment thất bại');
  }
  return data.data;
}

/**
 * DELETE /applications/{applicationId}/comments/{commentId}
 */
export async function deleteComment(applicationId, commentId) {
  const { data } = await apiClient.delete(
    `/applications/${applicationId}/comments/${commentId}`
  );
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa comment thất bại');
  }
  return data;
}
