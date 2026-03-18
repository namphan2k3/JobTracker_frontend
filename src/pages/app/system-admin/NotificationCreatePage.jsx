import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createNotification } from '../../../api/notifications';
import styles from '../../../styles/components/NotificationCreatePage.module.css';

const NOTIFICATION_TYPES = [
  'APPLICATION_RECEIVED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_REMINDER',
  'STATUS_CHANGE',
  'DEADLINE_REMINDER',
  'COMMENT_ADDED',
  'ASSIGNMENT_CHANGED',
];

const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];

export function NotificationCreatePage() {
  const [userId, setUserId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [jobId, setJobId] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [type, setType] = useState('APPLICATION_RECEIVED');
  const [priority, setPriority] = useState('MEDIUM');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);
    try {
      await createNotification({
        userId: userId.trim(),
        companyId: companyId.trim(),
        jobId: jobId.trim() || undefined,
        applicationId: applicationId.trim() || undefined,
        type,
        priority,
        title: title.trim(),
        message: message.trim(),
        scheduledAt: scheduledAt.trim() || undefined,
      });
      setSuccess(true);
      setUserId('');
      setCompanyId('');
      setJobId('');
      setApplicationId('');
      setTitle('');
      setMessage('');
      setScheduledAt('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tạo thông báo thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.notificationCreatePage}>
      <header className={styles.notificationCreatePage__header}>
        <h1 className={styles.notificationCreatePage__title}>Tạo thông báo</h1>
      </header>

      {error && (
        <div className={styles.notificationCreatePage__error} role="alert">{error}</div>
      )}
      {success && (
        <div className={styles.notificationCreatePage__success} role="status">
          Tạo thông báo thành công.
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.notificationCreatePage__form}>
        <label>User ID *</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="UUID của user nhận thông báo"
          required
        />
        <label>Company ID *</label>
        <input
          type="text"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          placeholder="UUID của company"
          required
        />
        <label>Job ID (tùy chọn)</label>
        <input
          type="text"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          placeholder="UUID của job"
        />
        <label>Application ID (tùy chọn)</label>
        <input
          type="text"
          value={applicationId}
          onChange={(e) => setApplicationId(e.target.value)}
          placeholder="UUID của application"
        />
        <label>Loại thông báo</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {NOTIFICATION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label>Độ ưu tiên</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <label>Tiêu đề *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề thông báo"
          required
        />
        <label>Nội dung *</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nội dung thông báo"
          rows={4}
          required
        />
        <label>Lên lịch gửi (tùy chọn)</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
        <div className={styles.notificationCreatePage__formActions}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Đang tạo...' : 'Tạo thông báo'}
          </button>
          <Link to="/app/system-admin/companies" className={styles.notificationCreatePage__cancelLink}>
            Hủy
          </Link>
        </div>
      </form>
    </div>
  );
}
