import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getJobs } from '../../../api/jobs';
import { usePermissions } from '../../../hooks/usePermissions';
import styles from '../../../styles/components/JobListPage.module.css';

const JOB_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PUBLISHED', label: 'Đang tuyển' },
  { value: 'PAUSED', label: 'Tạm dừng' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'FILLED', label: 'Đã tuyển' },
];

export function JobListPage() {
  const { hasPermission } = usePermissions();
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    jobStatus: '',
    page: 0,
    size: 20,
  });

  useEffect(() => {
    setLoading(true);
    const params = {
      page: filters.page,
      size: filters.size,
      search: filters.search || undefined,
      jobStatus: filters.jobStatus || undefined,
    };
    getJobs(params)
      .then(({ jobs: list, pagination: p }) => {
        setJobs(list);
        setPagination(p);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách thất bại');
      })
      .finally(() => setLoading(false));
  }, [filters.page, filters.search, filters.jobStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 0 }));
  };

  return (
    <div className={styles.jobListPage}>
      <header className={styles.jobListPage__header}>
        <h1 className={styles.jobListPage__title}>Tin tuyển dụng</h1>
        {hasPermission('JOB_CREATE') && (
          <Link
            to="/app/jobs/create"
            className={styles.jobListPage__createLink}
          >
            Tạo tin tuyển dụng
          </Link>
        )}
      </header>

      <form onSubmit={handleSearch} className={styles.jobListPage__filterBar}>
        <input
          type="search"
          className={styles.jobListPage__searchInput}
          placeholder="Tìm theo tên, vị trí..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <select
          className={styles.jobListPage__filterSelect}
          value={filters.jobStatus}
          onChange={(e) => setFilters((f) => ({ ...f, jobStatus: e.target.value, page: 0 }))}
        >
          {JOB_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.jobListPage__searchButton}>
          Tìm
        </button>
      </form>

      {error && (
        <div className={styles.jobListPage__error} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.jobListPage__loading}>Đang tải...</p>
      ) : (
        <>
          <div className={styles.jobListPage__tableWrap}>
            <table className={styles.jobListPage__table}>
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Vị trí</th>
                  <th>Loại</th>
                  <th>Địa điểm</th>
                  <th>Trạng thái</th>
                  <th>Ứng tuyển</th>
                  <th>Hạn nộp</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className={
                      job.jobStatus === 'DRAFT'
                        ? styles.jobListPage__tableRowDraft
                        : ''
                    }
                  >
                    <td>{job.title}</td>
                    <td>{job.position || '-'}</td>
                    <td>{job.jobType || '-'}</td>
                    <td>{job.location || '-'}</td>
                    <td>
                      <span
                        className={styles.jobListPage__statusBadge}
                        data-status={job.jobStatus}
                      >
                        {job.jobStatus === 'DRAFT' && 'Nháp'}
                        {job.jobStatus === 'PUBLISHED' && 'Đang tuyển'}
                        {job.jobStatus === 'PAUSED' && 'Tạm dừng'}
                        {job.jobStatus === 'CLOSED' && 'Đã đóng'}
                        {job.jobStatus === 'FILLED' && 'Đã tuyển'}
                        {!['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'FILLED'].includes(job.jobStatus) && job.jobStatus}
                      </span>
                    </td>
                    <td>{job.applicationsCount ?? 0}</td>
                    <td>{job.deadlineDate || '-'}</td>
                    <td>
                      <Link
                        to={`/app/jobs/${job.id}`}
                        className={styles.jobListPage__detailLink}
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.jobListPage__pagination}>
              <button
                type="button"
                disabled={filters.page <= 0}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Trang trước
              </button>
              <span>
                Trang {filters.page + 1} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={filters.page >= pagination.totalPages - 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Trang sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
