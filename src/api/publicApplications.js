const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

/**
 * Public fetch helper — dùng credentials: 'omit' để KHÔNG gửi cookie (JSESSIONID)
 * Đây là cách duy nhất chặn cookie trên same-origin request.
 */
async function publicFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'omit',
    ...options,
  });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return null;
  }
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Request failed: ${res.status}`);
  }
  return data;
}

/**
 * POST /public/jobs/{jobId}/apply
 * Form-data: candidateName, candidateEmail, candidatePhone, coverLetter, resume (file)
 */
export async function applyToJob(jobId, formData) {
  return publicFetch(`/public/jobs/${jobId}/apply`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * GET /public/applications/{applicationToken}/status
 */
export async function getApplicationStatusByToken(applicationToken) {
  const data = await publicFetch(`/public/applications/${applicationToken}/status`);
  return data.data;
}

/**
 * POST /public/applications/{applicationToken}/attachments
 * Form-data: file, attachmentType (CERTIFICATE|PORTFOLIO|OTHER), description
 */
export async function uploadApplicationAttachment(applicationToken, formData) {
  const data = await publicFetch(`/public/applications/${applicationToken}/attachments`, {
    method: 'POST',
    body: formData,
  });
  return data.data;
}
