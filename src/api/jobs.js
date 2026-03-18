import { apiClient } from './client';

/**
 * GET /jobs
 * @param {{ page?: number, size?: number, sort?: string, jobStatus?: string, search?: string, isRemote?: boolean }}
 */
export async function getJobs(params = {}) {
  const { data } = await apiClient.get('/jobs', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách jobs thất bại');
  }
  return { jobs: data.data, pagination: data.paginationInfo };
}

/**
 * GET /jobs/{id}
 */
export async function getJobById(id) {
  const { data } = await apiClient.get(`/jobs/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin job thất bại');
  }
  return data.data;
}

/**
 * POST /jobs - Create job posting
 * @param {object} payload - title, position, jobType, location, salaryMin, salaryMax, currency, jobStatus, deadlineDate, jobDescription, requirements, benefits, jobUrl, isRemote, skillIds
 */
export async function createJob(payload) {
  const { data } = await apiClient.post('/jobs', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo job thất bại');
  }
  return data.data;
}

/**
 * PUT /jobs/{id}
 */
export async function updateJob(id, payload) {
  const { data } = await apiClient.put(`/jobs/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật job thất bại');
  }
  return data.data;
}

/**
 * DELETE /jobs/{id} - Soft delete
 */
export async function deleteJob(id) {
  const { data } = await apiClient.delete(`/jobs/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa job thất bại');
  }
  return data;
}

/**
 * PATCH /jobs/{id}/status - Publish/Unpublish
 * @param {{ jobStatus: string, publishedAt?: string, expiresAt?: string }}
 */
export async function updateJobStatus(id, payload) {
  const { data } = await apiClient.patch(`/jobs/${id}/status`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật status job thất bại');
  }
  return data.data;
}

/**
 * GET /jobs/{jobId}/skills
 */
export async function getJobSkills(jobId) {
  const { data } = await apiClient.get(`/jobs/${jobId}/skills`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy skills job thất bại');
  }
  return data.data || [];
}

/**
 * POST /jobs/{jobId}/skills
 * @param {{ skillId: string, isRequired?: boolean, proficiencyLevel?: string }}
 */
export async function addJobSkill(jobId, payload) {
  const { data } = await apiClient.post(`/jobs/${jobId}/skills`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Thêm skill thất bại');
  }
  return data.data;
}

/**
 * PATCH /jobs/{jobId}/skills/{skillId}
 * @param {{ isRequired?: boolean, proficiencyLevel?: string }}
 */
export async function updateJobSkill(jobId, skillId, payload) {
  const { data } = await apiClient.patch(`/jobs/${jobId}/skills/${skillId}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật skill thất bại');
  }
  return data.data;
}

/**
 * DELETE /jobs/{jobId}/skills/{skillId}
 */
export async function deleteJobSkill(jobId, skillId) {
  const { data } = await apiClient.delete(`/jobs/${jobId}/skills/${skillId}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa skill thất bại');
  }
  return data;
}
