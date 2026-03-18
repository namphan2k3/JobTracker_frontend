import { API_DIRECT } from './config';

/**
 * GET /public/jobs/{id}
 * Lấy thông tin job public (JD) - chỉ job PUBLISHED
 * Gọi thẳng backend (API_DIRECT), credentials:'omit' để không gửi cookie
 */
export async function getPublicJob(jobId) {
  const res = await fetch(`${API_DIRECT}/public/jobs/${jobId}`, {
    credentials: 'omit',
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Không tìm thấy tin tuyển dụng');
  }
  return data.data;
}
