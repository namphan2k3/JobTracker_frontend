import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getInterviewById,
  updateInterview,
  cancelInterview,
  deleteInterview,
} from '../../../api/interviews';
import { getUsers } from '../../../api/adminUsers';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/InterviewDetailPage.module.css';

const INTERVIEW_TYPES = {
  PHONE: 'Điện thoại',
  VIDEO: 'Video',
  IN_PERSON: 'Trực tiếp',
  TECHNICAL: 'Kỹ thuật',
  HR: 'HR',
  FINAL: 'Vòng cuối',
};

const STATUS_LABELS = {
  SCHEDULED: 'Đã lên lịch',
  RESCHEDULED: 'Đổi lịch',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const RESULT_LABELS = {
  PASSED: 'Đạt',
  FAILED: 'Không đạt',
  PENDING: 'Chờ đánh giá',
};

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    getInterviewById(id)
      .then(setInterview)
      .catch((err) => setError(err.message || 'Tải thất bại'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getUsers({ size: 100 }).then(({ users: u }) => setUsers(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (interview) {
      const sd = toDatetimeLocalValue(interview.scheduledDate);
      const ad = toDatetimeLocalValue(interview.actualDate);
      setForm({
        scheduledDate: sd,
        actualDate: ad,
        durationMinutes: interview.durationMinutes ?? 60,
        result: interview.result || '',
        feedback: interview.feedback || '',
        notes: interview.notes || '',
        questionsAsked: interview.questionsAsked || '',
        answersGiven: interview.answersGiven || '',
        rating: interview.rating ?? '',
        meetingLink: interview.meetingLink || '',
        location: interview.location || '',
        interviewerIds: interview.interviewers?.map((i) => i.id) || [],
        primaryInterviewerId: interview.interviewers?.find((i) => i.isPrimary)?.id || '',
      });
    }
  }, [interview]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const loadInterview = () => getInterviewById(id).then(setInterview);

  const handleUpdate = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      durationMinutes: Number(form.durationMinutes) || 60,
      feedback: form.feedback || undefined,
      notes: form.notes || undefined,
      questionsAsked: form.questionsAsked || undefined,
      answersGiven: form.answersGiven || undefined,
      meetingLink: form.meetingLink || undefined,
      location: form.location || undefined,
    };
    if (form.scheduledDate) {
      payload.scheduledDate = form.scheduledDate.includes('Z')
        ? form.scheduledDate
        : new Date(form.scheduledDate).toISOString();
    }
    if (form.actualDate) {
      payload.actualDate = form.actualDate.includes('Z')
        ? form.actualDate
        : new Date(form.actualDate).toISOString();
    }
    if (form.rating !== '' && form.rating != null) {
      payload.rating = Number(form.rating);
    }
    if (form.result) {
      payload.result = form.result;
    }
    if (form.interviewerIds?.length) {
      payload.interviewerIds = form.interviewerIds;
      payload.primaryInterviewerId = form.primaryInterviewerId || form.interviewerIds[0];
    }
    updateInterview(id, payload)
      .then(loadInterview)
      .then(() => {
        setError('');
        setSuccess('Cập nhật thành công.');
        setEditModalOpen(false);
      })
      .catch((err) => setError(err.message || 'Cập nhật thất bại'));
  };

  const handleCancel = () => {
    if (!window.confirm('Hủy lịch phỏng vấn này?')) return;
    setError('');
    cancelInterview(id)
      .then(loadInterview)
      .catch((err) => setError(err.message || 'Hủy thất bại'));
  };

  const handleDelete = () => {
    if (!window.confirm('Xóa lịch phỏng vấn này?')) return;
    setError('');
    deleteInterview(id)
      .then(() => navigate(interview?.applicationId ? `/app/applications/${interview.applicationId}` : '/app/dashboard'))
      .catch((err) => setError(err.message || 'Xóa thất bại'));
  };

  const toggleInterviewer = (userId) => {
    setForm((f) => {
      const current = f.interviewerIds ?? [];
      const ids = current.includes(userId)
        ? current.filter((i) => i !== userId)
        : [...current, userId];
      const primary = f.primaryInterviewerId && ids.includes(f.primaryInterviewerId)
        ? f.primaryInterviewerId
        : ids[0] || '';
      return { ...f, interviewerIds: ids, primaryInterviewerId: primary };
    });
  };

  if (loading) return <p className={styles.interviewDetailPage__loading}>Đang tải...</p>;
  if (!interview) return <p className={styles.interviewDetailPage__error}>Không tìm thấy lịch phỏng vấn.</p>;

  const isCancelled = interview.status === 'CANCELLED';

  return (
    <div className={styles.interviewDetailPage}>
      <header className={styles.interviewDetailPage__header}>
        <h1 className={styles.interviewDetailPage__title}>
          Phỏng vấn – {INTERVIEW_TYPES[interview.interviewType] || interview.interviewType} (Vòng {interview.roundNumber})
        </h1>
      </header>

      {error && (
        <div className={styles.interviewDetailPage__error} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.interviewDetailPage__success} role="status">
          {success}
        </div>
      )}

      <div className={styles.interviewDetailPage__grid}>
        <section className={styles.interviewDetailPage__section}>
          <h2>Thông tin chung</h2>
          <dl>
            <dt>Ứng viên / Vị trí</dt>
            <dd>
              {interview.candidateName && interview.jobTitle
                ? `${interview.candidateName} – ${interview.jobTitle}`
                : interview.applicationId
                  ? <Link to={`/app/applications/${interview.applicationId}`}>Xem hồ sơ</Link>
                  : '-'}
            </dd>
            <dt>Loại</dt>
            <dd>{INTERVIEW_TYPES[interview.interviewType] || interview.interviewType}</dd>
            <dt>Vòng</dt>
            <dd>{interview.roundNumber}</dd>
            <dt>Trạng thái</dt>
            <dd>
              <span
                className={styles.interviewDetailPage__statusBadge}
                style={{
                  '--status-color':
                    interview.status === 'CANCELLED'
                      ? '#ef4444'
                      : interview.status === 'COMPLETED'
                        ? '#22c55e'
                        : '#3b82f6',
                }}
              >
                {STATUS_LABELS[interview.status] || interview.status}
              </span>
            </dd>
            {interview.result && (
              <>
                <dt>Kết quả</dt>
                <dd>{RESULT_LABELS[interview.result] || interview.result}</dd>
              </>
            )}
          </dl>
        </section>

        <section className={styles.interviewDetailPage__section}>
          <h2>Lịch trình</h2>
          <dl>
            <dt>Ngày giờ dự kiến</dt>
            <dd>{formatDateTime(interview.scheduledDate)}</dd>
            {interview.actualDate && (
              <>
                <dt>Ngày giờ thực tế</dt>
                <dd>{formatDateTime(interview.actualDate)}</dd>
              </>
            )}
            <dt>Thời lượng</dt>
            <dd>{interview.durationMinutes} phút</dd>
            {interview.meetingLink && (
              <>
                <dt>Meeting link</dt>
                <dd>
                  <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                    {interview.meetingLink}
                  </a>
                </dd>
              </>
            )}
            {interview.location && (
              <>
                <dt>Địa điểm</dt>
                <dd>{interview.location}</dd>
              </>
            )}
          </dl>
        </section>

        <section className={styles.interviewDetailPage__section}>
          <h2>Người phỏng vấn</h2>
          <ul className={styles.interviewDetailPage__interviewerList}>
            {interview.interviewers?.map((i) => (
              <li key={i.id}>
                {i.name || i.email} {i.isPrimary && <span className={styles.interviewDetailPage__primaryBadge}>Chính</span>}
              </li>
            ))}
          </ul>
          {(!interview.interviewers || interview.interviewers.length === 0) && <p>Chưa có</p>}
        </section>

        {(interview.feedback || interview.notes || interview.questionsAsked || interview.answersGiven) && (
          <section className={styles.interviewDetailPage__section}>
            <h2>Đánh giá & Ghi chú</h2>
            {interview.feedback && (
              <p><strong>Phản hồi:</strong> {interview.feedback}</p>
            )}
            {interview.notes && (
              <p><strong>Ghi chú:</strong> {interview.notes}</p>
            )}
            {interview.questionsAsked && (
              <p><strong>Câu hỏi:</strong> {interview.questionsAsked}</p>
            )}
            {interview.answersGiven && (
              <p><strong>Trả lời:</strong> {interview.answersGiven}</p>
            )}
            {interview.rating != null && (
              <p><strong>Điểm:</strong> {interview.rating}/5</p>
            )}
          </section>
        )}
      </div>

      {!isCancelled && (
        <footer className={styles.interviewDetailPage__footer}>
          <button type="button" onClick={() => setEditModalOpen(true)}>
            Chỉnh sửa
          </button>
          <button type="button" onClick={handleCancel} className={styles.interviewDetailPage__cancelBtn}>
            Hủy lịch
          </button>
          <button type="button" onClick={handleDelete} className={styles.interviewDetailPage__deleteBtn}>
            Xóa
          </button>
        </footer>
      )}

      <Drawer open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Chỉnh sửa phỏng vấn">
        <form onSubmit={handleUpdate} className={styles.interviewDetailPage__editForm}>
          <label>
            Ngày giờ dự kiến
            <input
              type="datetime-local"
              value={form.scheduledDate}
              onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
            />
          </label>
          <label>
            Ngày giờ thực tế (khi hoàn thành)
            <input
              type="datetime-local"
              value={form.actualDate}
              onChange={(e) => setForm((f) => ({ ...f, actualDate: e.target.value }))}
            />
          </label>
          <label>
            Thời lượng (phút)
            <input
              type="number"
              min={15}
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            />
          </label>
          <label>
            Kết quả
            <select
              value={form.result}
              onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}
            >
              <option value="">--</option>
              {Object.entries(RESULT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Phản hồi
            <textarea
              rows={3}
              value={form.feedback}
              onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))}
            />
          </label>
          <label>
            Ghi chú
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <label>
            Câu hỏi đã hỏi
            <textarea
              rows={2}
              value={form.questionsAsked}
              onChange={(e) => setForm((f) => ({ ...f, questionsAsked: e.target.value }))}
            />
          </label>
          <label>
            Câu trả lời
            <textarea
              rows={2}
              value={form.answersGiven}
              onChange={(e) => setForm((f) => ({ ...f, answersGiven: e.target.value }))}
            />
          </label>
          <label>
            Điểm (1-5)
            <input
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
            />
          </label>
          <label>
            Meeting link
            <input
              type="url"
              value={form.meetingLink}
              onChange={(e) => setForm((f) => ({ ...f, meetingLink: e.target.value }))}
            />
          </label>
          <label>
            Địa điểm
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </label>
          <label>
            Người phỏng vấn
            <div className={styles.interviewDetailPage__interviewerCheckboxes}>
              {users.map((u) => (
                <label key={u.id} className={styles.interviewDetailPage__checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={(form.interviewerIds ?? []).includes(u.id)}
                    onChange={() => toggleInterviewer(u.id)}
                  />
                  {u.firstName} {u.lastName}
                </label>
              ))}
            </div>
          </label>
          <label>
            Người phỏng vấn chính
            <select
              value={form.primaryInterviewerId}
              onChange={(e) => setForm((f) => ({ ...f, primaryInterviewerId: e.target.value }))}
            >
              <option value="">Tự động</option>
              {users.filter((u) => (form.interviewerIds ?? []).includes(u.id)).map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </label>
          <div className={styles.interviewDetailPage__formActions}>
            <button type="submit">Lưu</button>
            <button type="button" onClick={() => setEditModalOpen(false)}>Hủy</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
