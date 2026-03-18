import { apiClient } from './client';

/**
 * GET /admin/application-statuses
 * Lấy danh sách application statuses của company (pipeline)
 * Mỗi status gồm các field: id, companyId, name, displayName, description, color,
 * statusType, sortOrder, isTerminal, isDefault, isActive, timestamps...
 */
export async function getApplicationStatuses() {
  const { data } = await apiClient.get('/admin/application-statuses');
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy application statuses thất bại');
  }
  return data.data || [];
}

/**
 * GET /admin/application-statuses/{id}
 */
export async function getApplicationStatusById(id) {
  const { data } = await apiClient.get(`/admin/application-statuses/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy application status thất bại');
  }
  return data.data;
}

/**
 * POST /admin/application-statuses
 * @param {{ name: string, displayName: string, description?: string, color?: string, statusType: 'APPLIED'|'SCREENING'|'INTERVIEW'|'OFFER'|'HIRED'|'REJECTED', sortOrder?: number, isTerminal?: boolean, isDefault?: boolean, isActive?: boolean }}
 */
export async function createApplicationStatus(payload) {
  const { data } = await apiClient.post('/admin/application-statuses', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo application status thất bại');
  }
  return data.data;
}

/**
 * PUT /admin/application-statuses/{id}
 * @param {{ displayName?: string, description?: string, color?: string, statusType?: 'APPLIED'|'SCREENING'|'INTERVIEW'|'OFFER'|'HIRED'|'REJECTED', sortOrder?: number, isTerminal?: boolean, isDefault?: boolean, isActive?: boolean }}
 */
export async function updateApplicationStatus(id, payload) {
  const { data } = await apiClient.put(`/admin/application-statuses/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật application status thất bại');
  }
  return data.data;
}

/**
 * DELETE /admin/application-statuses/{id}
 */
export async function deleteApplicationStatus(id) {
  const { data } = await apiClient.delete(`/admin/application-statuses/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa application status thất bại');
  }
  return data;
}
