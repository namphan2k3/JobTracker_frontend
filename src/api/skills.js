import { apiClient } from './client';

/**
 * GET /skills
 * @param {{ page?: number, size?: number, sort?: string, category?: string, search?: string }}
 */
export async function getSkills(params = {}) {
  const { data } = await apiClient.get('/skills', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách skills thất bại');
  }
  return { skills: data.data || [], pagination: data.paginationInfo };
}

/**
 * GET /skills/{id}
 */
export async function getSkillById(id) {
  const { data } = await apiClient.get(`/skills/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin skill thất bại');
  }
  return data.data;
}

/**
 * POST /skills
 * @param {{ name: string, category: string, description?: string, isActive?: boolean }}
 */
export async function createSkill(payload) {
  const { data } = await apiClient.post('/skills', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo skill thất bại');
  }
  return data.data;
}

/**
 * PUT /skills/{id}
 * @param {{ name?: string, category?: string, description?: string, isActive?: boolean }}
 */
export async function updateSkill(id, payload) {
  const { data } = await apiClient.put(`/skills/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật skill thất bại');
  }
  return data.data;
}

/**
 * DELETE /skills/{id}
 */
export async function deleteSkill(id) {
  const { data } = await apiClient.delete(`/skills/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa skill thất bại');
  }
  return data;
}
