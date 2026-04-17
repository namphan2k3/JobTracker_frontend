import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardSummary } from '../../api/dashboard';
import styles from '../../styles/components/DashboardPage.module.css';

export function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải dashboard thất bại');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.dashboardPage}>
        <h1 className={styles.dashboardPage__title}>Dashboard</h1>
        <p className={styles.dashboardPage__loading}>Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboardPage}>
        <h1 className={styles.dashboardPage__title}>Dashboard</h1>
        <div className={styles.dashboardPage__error} role="alert">
          {error}
        </div>
      </div>
    );
  }

  const activeJobs = summary?.activeJobs || { count: 0, changeFromLastMonth: 0 };
  const applicationsToday = summary?.applicationsToday || { count: 0, countYesterday: 0 };
  const applicationsByStatus = summary?.applicationsByStatus || [];
  const upcomingInterviews = summary?.upcomingInterviews || [];
  const totalApplications = applicationsByStatus.reduce((sum, item) => sum + (item.count || 0), 0);
  const interviewsThisWeek = upcomingInterviews.filter((iv) => {
    if (!iv?.scheduledDate) return false;
    const interviewDate = new Date(iv.scheduledDate);
    const now = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(now.getDate() + 7);
    return interviewDate >= now && interviewDate <= inSevenDays;
  }).length;

  const formatChange = (change) => {
    if (change === 0) return '';
    const sign = change > 0 ? '+' : '';
    return ` (${sign}${change} so với tháng trước)`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.dashboardPage}>
      <section className={styles.dashboardHero}>
        <div>
          <h1 className={styles.dashboardPage__title}>Dashboard tuyển dụng</h1>
          <p className={styles.dashboardPage__subtitle}>
            Theo dõi nhanh hiệu suất tuyển dụng và lịch phỏng vấn sắp tới.
          </p>
        </div>
        <Link to="/app/applications" className={styles.dashboardHero__cta}>
          Xem danh sách ứng viên
        </Link>
      </section>

      <section className={styles.dashboardSummary}>
        <div className={styles.dashboardSummary__cards}>
          <Link
            to="/app/jobs"
            className={styles.dashboardSummary__activeJobsCard}
          >
            <span className={styles.dashboardSummary__cardLabel}>
              Job đang tuyển
            </span>
            <span className={styles.dashboardSummary__cardValue}>
              {activeJobs.count}
            </span>
            {activeJobs.changeFromLastMonth !== undefined && (
              <span className={styles.dashboardSummary__cardChange}>
                {formatChange(activeJobs.changeFromLastMonth)}
              </span>
            )}
          </Link>

          <div
            className={
              applicationsToday.count > applicationsToday.countYesterday
                ? styles.dashboardSummary__applicationsTodayCardHighlight
                : styles.dashboardSummary__applicationsTodayCard
            }
          >
            <span className={styles.dashboardSummary__cardLabel}>
              CV mới hôm nay
            </span>
            <span className={styles.dashboardSummary__cardValue}>
              {applicationsToday.count}
            </span>
            {applicationsToday.countYesterday !== undefined && (
              <span className={styles.dashboardSummary__cardChange}>
                Hôm qua: {applicationsToday.countYesterday}
              </span>
            )}
          </div>

          <div className={styles.dashboardSummary__applicationsTodayCard}>
            <span className={styles.dashboardSummary__cardLabel}>
              Tổng ứng tuyển
            </span>
            <span className={styles.dashboardSummary__cardValue}>
              {totalApplications}
            </span>
            <span className={styles.dashboardSummary__cardChange}>
              Tất cả trạng thái hiện tại
            </span>
          </div>

          <div className={styles.dashboardSummary__applicationsTodayCard}>
            <span className={styles.dashboardSummary__cardLabel}>
              Phỏng vấn 7 ngày tới
            </span>
            <span className={styles.dashboardSummary__cardValue}>
              {interviewsThisWeek}
            </span>
            <span className={styles.dashboardSummary__cardChange}>
              Dựa trên lịch đã tạo
            </span>
          </div>
        </div>

        <div className={styles.dashboardSummary__statusSection}>
          <h2 className={styles.dashboardSummary__sectionTitle}>
            Phân bổ ứng tuyển theo trạng thái
          </h2>
          {applicationsByStatus.length > 0 ? (
            <div className={styles.dashboardSummary__statusList}>
              {applicationsByStatus.map((item) => (
                <div
                  key={item.statusId || item.statusName}
                  className={styles.dashboardSummary__statusItem}
                >
                  <span className={styles.dashboardSummary__statusLabel}>
                    {item.displayName || item.statusName}
                  </span>
                  <span className={styles.dashboardSummary__statusCount}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.dashboardSummary__sectionEmpty}>
              Chưa có dữ liệu
            </p>
          )}
        </div>

        <div className={styles.dashboardSummary__interviewsSection}>
          <h2 className={styles.dashboardSummary__sectionTitle}>
            Phỏng vấn sắp tới
          </h2>
          {upcomingInterviews.length > 0 ? (
            <div className={styles.dashboardSummary__interviewsList}>
              {upcomingInterviews.map((iv) => (
                <Link
                  key={iv.id}
                  to={`/app/interviews/${iv.id}`}
                  className={styles.dashboardSummary__interviewRow}
                >
                  <div className={styles.dashboardSummary__interviewMain}>
                    <span className={styles.dashboardSummary__interviewCandidate}>
                      {iv.candidateName}
                    </span>
                    <span className={styles.dashboardSummary__interviewJob}>
                      {iv.jobTitle}
                    </span>
                  </div>
                  <div className={styles.dashboardSummary__interviewMeta}>
                    <span>{formatDate(iv.scheduledDate)}</span>
                    <span>
                      {iv.durationMinutes} phút · {iv.interviewType || '-'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className={styles.dashboardSummary__sectionEmpty}>
              Không có phỏng vấn sắp tới
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
