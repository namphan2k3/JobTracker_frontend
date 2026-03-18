import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getInterviews, updateInterview } from '../../../api/interviews';
import { getJobs } from '../../../api/jobs';
import { getUsers } from '../../../api/adminUsers';
import { usePermissions } from '../../../hooks/usePermissions';
import { Modal } from '../../../components/Modal';
import styles from '../../../styles/components/InterviewListPage.module.css';

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Đã lên lịch' },
  { value: 'RESCHEDULED', label: 'Đổi lịch' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const TYPE_LABELS = {
  PHONE: 'Điện thoại',
  VIDEO: 'Video',
  IN_PERSON: 'Trực tiếp',
  TECHNICAL: 'Kỹ thuật',
  HR: 'HR',
  FINAL: 'Vòng cuối',
};

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

function formatLocalDateTimeParam(dateOnly, endOfDay = false) {
  if (!dateOnly) return undefined;
  const d = new Date(dateOnly);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = endOfDay ? '23' : '00';
  const mi = endOfDay ? '59' : '00';
  const ss = endOfDay ? '59' : '00';
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

export function InterviewListPage() {
  const { hasPermission } = usePermissions();
  const [interviews, setInterviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [interviewToComplete, setInterviewToComplete] = useState(null);
  const [completeForm, setCompleteForm] = useState({
    actualDate: '',
  });
  const [filters, setFilters] = useState({
    status: '',
    jobId: '',
    interviewerId: '',
    from: '',
    to: '',
    page: 0,
    size: 20,
  });

  useEffect(() => {
    if (!hasPermission('INTERVIEW_READ')) {
      setError('Bạn không có quyền xem danh sách phỏng vấn.');
      setLoading(false);
      return;
    }
    Promise.all([
      getJobs({ size: 100 }),
      getUsers({ size: 100 }),
    ])
      .then(([{ jobs: jobList }, { users: userList }]) => {
        setJobs(jobList);
        setUsers(userList);
      })
      .catch(() => {})
      .finally(() => {});
  }, [hasPermission]);

  useEffect(() => {
    if (!hasPermission('INTERVIEW_READ')) return;
    setLoading(true);
    setError('');
    const params = {
      page: filters.page,
      size: filters.size,
      status: filters.status || undefined,
      jobId: filters.jobId || undefined,
      interviewerId: filters.interviewerId || undefined,
      from: formatLocalDateTimeParam(filters.from, false),
      to: formatLocalDateTimeParam(filters.to, true),
    };
    getInterviews(params)
      .then(({ interviews: list, pagination: p }) => {
        setInterviews(list);
        setPagination(p);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách phỏng vấn thất bại');
      })
      .finally(() => setLoading(false));
  }, [filters.page, filters.size, filters.status, filters.jobId, filters.interviewerId, filters.from, filters.to, hasPermission]);

  const jobMap = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 0 }));
  };

  const handlePageChange = (delta) => {
    setFilters((f) => ({
      ...f,
      page: Math.max(0, (f.page || 0) + delta),
    }));
  };

  const reloadInterviews = async () => {
    if (!hasPermission('INTERVIEW_READ')) return;
    const params = {
      page: filters.page,
      size: filters.size,
      status: filters.status || undefined,
      jobId: filters.jobId || undefined,
      interviewerId: filters.interviewerId || undefined,
      from: formatLocalDateTimeParam(filters.from, false),
      to: formatLocalDateTimeParam(filters.to, true),
    };
    const { interviews: list, pagination: p } = await getInterviews(params);
    setInterviews(list);
    setPagination(p);
  };

  const handleOpenCompleteModal = (interview) => {
    setInterviewToComplete(interview);
    setCompleteForm({
      actualDate: interview.actualDate
        ? interview.actualDate.slice(0, 16)
        : interview.scheduledDate
          ? new Date(interview.scheduledDate).toISOString().slice(0, 16)
          : '',
    });
    setCompleteModalOpen(true);
  };

  const handleSubmitComplete = async (e) => {
    e.preventDefault();
    if (!interviewToComplete || !completeForm.actualDate) return;
    setError('');
    setCompleting(true);
    try {
      const actualDateIso = completeForm.actualDate.includes('Z')
        ? completeForm.actualDate
        : new Date(completeForm.actualDate).toISOString();
      await updateInterview(interviewToComplete.id, {
        actualDate: actualDateIso,
      });
      await reloadInterviews();
      setCompleteModalOpen(false);
      setInterviewToComplete(null);
      setCompleteForm({ actualDate: '' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật phỏng vấn thất bại');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className={styles.interviewListPage}>
      <header className={styles.interviewListPage__header}>
        <h1 className={styles.interviewListPage__title}>Phỏng vấn</h1>
      </header>

      {error && (
        <div className={styles.interviewListPage__error} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleFilterSubmit} className={styles.interviewListPage__filterBar}>
        <select
          className={styles.interviewListPage__filterSelect}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 0 }))}
        >
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className={styles.interviewListPage__filterSelect}
          value={filters.jobId}
          onChange={(e) => setFilters((f) => ({ ...f, jobId: e.target.value, page: 0 }))}
        >
          <option value="">Tất cả job</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <select
          className={styles.interviewListPage__filterSelect}
          value={filters.interviewerId}
          onChange={(e) => setFilters((f) => ({ ...f, interviewerId: e.target.value, page: 0 }))}
        >
          <option value="">Tất cả người phỏng vấn</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={styles.interviewListPage__dateInput}
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 0 }))}
        />
        <input
          type="date"
          className={styles.interviewListPage__dateInput}
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 0 }))}
        />
        <button type="submit" className={styles.interviewListPage__searchButton}>
          Lọc
        </button>
      </form>

      {loading && <p className={styles.interviewListPage__loading}>Đang tải...</p>}

      {!loading && interviews.length === 0 && !error && (
        <p className={styles.interviewListPage__empty}>Không có phỏng vấn nào.</p>
      )}

      {!loading && interviews.length > 0 && (
        <>
          <div className={styles.interviewListPage__tableWrap}>
            <table className={styles.interviewListPage__table}>
              <thead>
                <tr>
                  <th>Ứng viên / Vị trí</th>
                  <th>Vòng</th>
                  <th>Loại</th>
                  <th>Ngày giờ</th>
                  <th>Trạng thái</th>
                  <th>Người phỏng vấn</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {interviews.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div>{i.candidateName || '-'}</div>
                      <div className={styles.interviewListPage__jobText}>
                        {i.jobTitle || jobMap[i.jobId]?.title || i.jobId || '-'}
                      </div>
                    </td>
                    <td>Vòng {i.roundNumber}</td>
                    <td>{TYPE_LABELS[i.interviewType] || i.interviewType}</td>
                    <td>{formatDateTime(i.scheduledDate)}</td>
                    <td>
                      <span className={styles.interviewListPage__statusBadge}>
                        {i.status}
                      </span>
                    </td>
                    <td>
                      {i.interviewers?.length
                        ? i.interviewers.map((iv) => {
                          const user = userMap[iv.id];
                          return user?.firstName || user?.lastName
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : iv.name || iv.email || iv.id;
                        }).join(', ')
                        : 'Chưa có'}
                    </td>
                    <td>
                      <Link to={`/app/interviews/${i.id}`} className={styles.interviewListPage__detailLink}>
                        Chi tiết
                      </Link>
                      {(i.status === 'SCHEDULED' || i.status === 'RESCHEDULED') &&
                        hasPermission('INTERVIEW_UPDATE') && (
                          <button
                            type="button"
                            className={styles.interviewListPage__completeButton}
                            onClick={() => handleOpenCompleteModal(i)}
                          >
                            Đánh dấu hoàn thành
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.interviewListPage__pagination}>
              <button
                type="button"
                onClick={() => handlePageChange(-1)}
                disabled={filters.page <= 0}
              >
                Trang trước
              </button>
              <span>
                Trang {pagination.page + 1} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={pagination.page + 1 >= pagination.totalPages}
              >
                Trang sau
              </button>
            </div>
          )}
        </>
      )}

      {completeModalOpen && interviewToComplete && (
        <Modal
          open={completeModalOpen}
          onClose={() => {
            if (completing) return;
            setCompleteModalOpen(false);
            setInterviewToComplete(null);
            setCompleteForm({ actualDate: '' });
          }}
          title="Đánh dấu phỏng vấn hoàn thành"
        >
          <form onSubmit={handleSubmitComplete}>
            <p className={styles.interviewListPage__modalSubtitle}>
              {interviewToComplete.candidateName || '-' } –{' '}
              {interviewToComplete.jobTitle ||
                jobMap[interviewToComplete.jobId]?.title ||
                interviewToComplete.jobId}
            </p>
            <label className={styles.interviewListPage__modalLabel}>
              Thời gian hoàn thành
              <input
                type="datetime-local"
                required
                value={completeForm.actualDate}
                onChange={(e) => setCompleteForm({ actualDate: e.target.value })}
              />
            </label>
            <div className={styles.interviewListPage__modalActions}>
              <button
                type="submit"
                disabled={completing}
                className={styles.interviewListPage__modalSubmit}
              >
                {completing ? 'Đang cập nhật...' : 'Xác nhận hoàn thành'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (completing) return;
                  setCompleteModalOpen(false);
                  setInterviewToComplete(null);
                  setCompleteForm({ actualDate: '' });
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

