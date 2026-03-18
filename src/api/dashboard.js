import { apiClient } from './client';

/**
 * GET /dashboard/summary
 * 4 widgets: activeJobs, applicationsToday, applicationsByStatus, upcomingInterviews
 * Scoped theo company từ JWT
 */
export async function getDashboardSummary() {
  const { data } = await apiClient.get('/dashboard/summary');
  if (!data?.success) {
    throw new Error(data?.message || 'Lấy dashboard thất bại');
  }
  return data.data;
}
