import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { createApplication } from '../../../api/applications';
import { usePermissions } from '../../../hooks/usePermissions';
import { getApplicationStatuses } from '../../../api/applicationStatuses';
import { getJobs } from '../../../api/jobs';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/ApplicationCreatePage.module.css';

const SOURCES = ['Website', 'Email', 'LinkedIn', 'Referral', 'Other'];

export function ApplicationCreatePage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  if (!hasPermission('APPLICATION_CREATE')) return <Navigate to="/app/applications" replace />;
  const [jobs, setJobs] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    jobId: '',
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    statusId: '',
    source: 'Email',
    appliedDate: new Date().toISOString().slice(0, 10),
    coverLetter: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([getJobs({ size: 100 }), getApplicationStatuses()])
      .then(([{ jobs: j }, s]) => {
        setJobs(j);
        setStatuses(s);
        if (s.length > 0 && !form.statusId) {
          const defaultStatus = s.find((st) => st.name === 'NEW') || s[0];
          setForm((f) => ({ ...f, statusId: defaultStatus.id }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.jobId || !form.candidateName || !form.candidateEmail || !form.statusId || !form.appliedDate) {
      setError('Vui lòng điền Job, Tên, Email, Trạng thái và Ngày ứng tuyển.');
      return;
    }
    setLoading(true);
    const payload = {
      jobId: form.jobId,
      candidateName: form.candidateName,
      candidateEmail: form.candidateEmail,
      candidatePhone: form.candidatePhone || undefined,
      statusId: form.statusId,
      source: form.source || undefined,
      appliedDate: form.appliedDate || undefined,
      coverLetter: form.coverLetter || undefined,
      notes: form.notes || undefined,
    };
    createApplication(payload)
      .then((created) => {
        navigate(`/app/applications/${created.id}`);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tạo ứng tuyển thất bại');
      })
      .finally(() => setLoading(false));
  };

  return (
    <Drawer open onClose={() => navigate('/app/applications')} title="Tạo ứng tuyển (HR thủ công)">
      {error && (
        <div className={styles.applicationCreatePage__error} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.applicationCreatePage__form}>
        <label>
          Job <span className={styles.applicationCreatePage__required}>*</span>
          <select
            value={form.jobId}
            onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
            required
          >
            <option value="">Chọn job</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tên ứng viên <span className={styles.applicationCreatePage__required}>*</span>
          <input
            type="text"
            value={form.candidateName}
            onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))}
            required
          />
        </label>

        <label>
          Email <span className={styles.applicationCreatePage__required}>*</span>
          <input
            type="email"
            value={form.candidateEmail}
            onChange={(e) => setForm((f) => ({ ...f, candidateEmail: e.target.value }))}
            required
          />
        </label>

        <label>
          Số điện thoại
          <input
            type="tel"
            value={form.candidatePhone}
            onChange={(e) => setForm((f) => ({ ...f, candidatePhone: e.target.value }))}
          />
        </label>

        <label>
          Trạng thái <span className={styles.applicationCreatePage__required}>*</span>
          <select
            value={form.statusId}
            onChange={(e) => setForm((f) => ({ ...f, statusId: e.target.value }))}
            required
          >
            <option value="">Chọn trạng thái</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName || s.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Nguồn
          <select
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
          >
            {SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ngày ứng tuyển <span className={styles.applicationCreatePage__required}>*</span>
          <input
            type="date"
            value={form.appliedDate}
            onChange={(e) => setForm((f) => ({ ...f, appliedDate: e.target.value }))}
            required
          />
        </label>

        <label>
          Cover letter
          <textarea
            value={form.coverLetter}
            onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))}
            rows={4}
          />
        </label>

        <label>
          Ghi chú
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
        </label>

        <div className={styles.applicationCreatePage__actions}>
          <button type="submit" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo ứng tuyển'}
          </button>
          <button type="button" onClick={() => navigate('/app/applications')}>
            Hủy
          </button>
        </div>
      </form>
    </Drawer>
  );
}
