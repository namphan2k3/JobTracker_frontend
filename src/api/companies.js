import { apiClient } from './client';

/**
 * GET /companies
 * Lấy danh sách tất cả companies. Chỉ SYSTEM_ADMIN.
 * @param {{ page?: number, size?: number, sort?: string, industry?: string, search?: string }}
 */
export async function getCompanies(params = {}) {
  const { data } = await apiClient.get('/companies', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách công ty thất bại');
  }
  return { companies: data.data, pagination: data.paginationInfo };
}

/**
 * GET /companies/{id}
 * Trả về thông tin chi tiết company.
 */
export async function getCompanyById(id) {
  const { data } = await apiClient.get(`/companies/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin công ty thất bại');
  }
  return data.data;
}

/**
 * PUT /companies/{id}
 * Cập nhật company. Không gửi isVerified — dùng PATCH /verify.
 * @param {{ website?: string, industry?: string, size?: string, location?: string, description?: string }}
 */
export async function updateCompany(id, payload) {
  const { data } = await apiClient.put(`/companies/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật công ty thất bại');
  }
  return data.data;
}

/**
 * DELETE /companies/{id}
 * Soft delete company.
 */
export async function deleteCompany(id) {
  const { data } = await apiClient.delete(`/companies/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa công ty thất bại');
  }
  return data;
}

/**
 * PATCH /companies/{id}/verify
 * Set trạng thái verified. Chỉ SYSTEM_ADMIN.
 * @param {{ isVerified: boolean }}
 */
export async function verifyCompany(id, { isVerified }) {
  const { data } = await apiClient.patch(`/companies/${id}/verify`, {
    isVerified,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật verified thất bại');
  }
  return data.data;
}
