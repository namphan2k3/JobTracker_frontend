import { apiClient } from './client';

/** Interview types: PHONE, VIDEO, IN_PERSON, TECHNICAL, HR, FINAL */
/** Interview statuses: SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED */
/** Interview results: PASSED, FAILED, PENDING */

/**
 * GET /interviews
 * @param {{ page?: number, size?: number, applicationId?: string, jobId?: string, interviewerId?: string, from?: string, to?: string, status?: string }}
 */
export async function getInterviews(params = {}) {
  const { data } = await apiClient.get('/interviews', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách interviews thất bại');
  }
  return {
    interviews: data.data || [],
    pagination: data.paginationInfo,
  };
}

/**
 * GET /applications/{applicationId}/interviews
 */
export async function getApplicationInterviews(applicationId) {
  const { data } = await apiClient.get(`/applications/${applicationId}/interviews`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách interviews thất bại');
  }
  return data.data || [];
}

/**
 * POST /applications/{applicationId}/interviews
 * @param {{ roundNumber?: number, interviewType: string, scheduledDate: string, durationMinutes: number, interviewerIds: string[], primaryInterviewerId?: string, meetingLink?: string, location?: string, notes?: string }}
 */
export async function createInterview(applicationId, payload) {
  try {
    const { data } = await apiClient.post(`/applications/${applicationId}/interviews`, payload);
    if (!data?.success) {
      throw new Error(data?.errors?.[0]?.message || data?.message || 'Tạo interview thất bại');
    }
    return data.data;
  } catch (err) {
    if (err.response?.data) {
      const d = err.response.data;
      throw new Error(d.errors?.[0]?.message || d.message || 'Tạo interview thất bại');
    }
    throw err;
  }
}

/**
 * GET /interviews/{id}
 */
export async function getInterviewById(id) {
  const { data } = await apiClient.get(`/interviews/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin interview thất bại');
  }
  return data.data;
}

/**
 * PUT /interviews/{id}
 * @param {{ scheduledDate?: string, actualDate?: string, durationMinutes?: number, result?: string, feedback?: string, notes?: string, questionsAsked?: string, answersGiven?: string, rating?: number, interviewerIds?: string[], primaryInterviewerId?: string, meetingLink?: string, location?: string }}
 */
export async function updateInterview(id, payload) {
  try {
    const { data } = await apiClient.put(`/interviews/${id}`, payload);
    if (!data?.success) {
      throw new Error(data?.errors?.[0]?.message || data?.message || 'Cập nhật interview thất bại');
    }
    return data.data;
  } catch (err) {
    if (err.response?.data) {
      const d = err.response.data;
      throw new Error(d.errors?.[0]?.message || d.message || 'Cập nhật interview thất bại');
    }
    throw err;
  }
}

/**
 * POST /interviews/{id}/cancel
 */
export async function cancelInterview(id) {
  const { data } = await apiClient.post(`/interviews/${id}/cancel`);
  if (!data?.success) {
    throw new Error(data?.message || 'Hủy interview thất bại');
  }
  return data;
}

/**
 * DELETE /interviews/{id}
 */
export async function deleteInterview(id) {
  const { data } = await apiClient.delete(`/interviews/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa interview thất bại');
  }
  return data;
}
