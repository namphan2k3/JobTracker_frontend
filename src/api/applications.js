import { apiClient } from './client';

/**
 * GET /applications
 * @param {{ page?: number, size?: number, sort?: string, status?: string, jobId?: string, assignedTo?: string, search?: string, sortBy?: string, sortOrder?: string, minMatchScore?: number, maxMatchScore?: number }}
 */
export async function getApplications(params = {}) {
  const { data } = await apiClient.get('/applications', { params });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy danh sách applications thất bại');
  }
  return { applications: data.data, pagination: data.paginationInfo };
}

/**
 * GET /applications/{id}
 */
export async function getApplicationById(id) {
  const { data } = await apiClient.get(`/applications/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy thông tin application thất bại');
  }
  return data.data;
}

/**
 * POST /applications - HR manual entry
 * @param {object} payload
 */
export async function createApplication(payload) {
  const { data } = await apiClient.post('/applications', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Tạo application thất bại');
  }
  return data.data;
}

/**
 * PUT /applications/{id}
 * @param {{ notes?: string, rating?: number, coverLetter?: string, allowAdditionalUploads?: boolean }}
 */
export async function updateApplication(id, payload) {
  const { data } = await apiClient.put(`/applications/${id}`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật application thất bại');
  }
  return data.data;
}

/**
 * PATCH /applications/{id}/status
 * @param {{ statusId: string, notes?: string, customMessage?: string, offerRequest?: any, sendEmail?: (boolean|null) }}
 */
export async function updateApplicationStatus(
  id,
  { statusId, notes, customMessage, offerRequest, sendEmail }
) {
  const payload = {
    statusId,
    notes,
    customMessage: customMessage || undefined,
    offerRequest: offerRequest || undefined,
  };
  // `sendEmail` là nullable theo docs: nếu không truyền → backend fallback theo `auto_send_email`
  if (sendEmail !== undefined && sendEmail !== null) {
    payload.sendEmail = Boolean(sendEmail);
  }

  const { data } = await apiClient.patch(`/applications/${id}/status`, payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Cập nhật status thất bại');
  }
  return data.data;
}

/**
 * PATCH /applications/{id}/assign
 * @param {{ assignedTo: string }}
 */
export async function assignApplication(id, { assignedTo }) {
  const { data } = await apiClient.patch(`/applications/${id}/assign`, {
    assignedTo,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Assign application thất bại');
  }
  return data.data;
}

/**
 * DELETE /applications/{id}
 */
export async function deleteApplication(id) {
  const { data } = await apiClient.delete(`/applications/${id}`);
  if (!data?.success) {
    throw new Error(data?.message || 'Xóa application thất bại');
  }
  return data;
}

/**
 * GET /applications/{id}/status-history
 */
export async function getApplicationStatusHistory(id) {
  const { data } = await apiClient.get(`/applications/${id}/status-history`);
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy lịch sử status thất bại');
  }
  return data.data || [];
}

/**
 * POST /applications/{id}/send-email
 * Gửi email theo template (mời PV, offer, từ chối). manualVariables thay thế biến trong template.
 * @param {string} applicationId
 * @param {{ emailType: 'INTERVIEW_SCHEDULED'|'OFFER_LETTER'|'REJECTION', interviewId?: string, manualVariables?: Record<string, string> }}
 */
export async function sendApplicationEmail(applicationId, { emailType, interviewId, manualVariables }) {
  const { data } = await apiClient.post(`/applications/${applicationId}/send-email`, {
    emailType,
    interviewId: interviewId || undefined,
    manualVariables: manualVariables || {},
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Gửi email thất bại');
  }
  return data.data;
}

/**
 * POST /applications/{id}/email-preview
 * Render trước nội dung email (subject + body) dựa trên template và manualVariables.
 * @param {string} applicationId
 * @param {{ emailType: 'INTERVIEW_SCHEDULED'|'OFFER_LETTER'|'REJECTION', manualVariables?: Record<string, string> }}
 */
export async function getApplicationEmailPreview(applicationId, { emailType, manualVariables }) {
  const { data } = await apiClient.post(`/applications/${applicationId}/email-preview`, {
    emailType,
    manualVariables: manualVariables || {},
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy preview email thất bại');
  }
  return data.data || { subject: '', body: '' };
}
