const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

/**
 * GET /public/jobs/{id}
 * Lấy thông tin job public (JD) - chỉ job PUBLISHED
 * Dùng fetch + credentials:'omit' để không gửi cookie (JSESSIONID)
 */
export async function getPublicJob(jobId) {
  const res = await fetch(`${API_BASE}/public/jobs/${jobId}`, {
    credentials: 'omit',
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Không tìm thấy tin tuyển dụng');
  }
  return data.data;
}
