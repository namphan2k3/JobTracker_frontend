import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { applyToJob } from '../../api/publicApplications';
import styles from '../../styles/components/PublicApplyPage.module.css';

export function PublicApplyPage() {
  const { jobId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    coverLetter: '',
    resume: null,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.resume) {
      setError('Vui lòng đính kèm CV (PDF).');
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append('candidateName', form.candidateName);
    fd.append('candidateEmail', form.candidateEmail);
    fd.append('candidatePhone', form.candidatePhone || '');
    fd.append('coverLetter', form.coverLetter || '');
    fd.append('resume', form.resume);
    applyToJob(jobId, fd)
      .then(() => setSuccess(true))
      .catch((err) => setError(err.message || 'Ứng tuyển thất bại'))
      .finally(() => setLoading(false));
  };

  if (success) {
    return (
      <div className={styles.publicApplyPage}>
        <div className={styles.publicApplyPage__success}>
          <h1>Ứng tuyển thành công!</h1>
          <p>
            Đơn ứng tuyển của bạn đã được gửi. Chúng tôi sẽ liên hệ với bạn qua email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.publicApplyPage}>
      <h1 className={styles.publicApplyPage__title}>Ứng tuyển</h1>
      <p className={styles.publicApplyPage__subtitle}>
        Job ID: {jobId}
      </p>

      {error && (
        <div className={styles.publicApplyPage__error} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.publicApplyPage__form}>
        <label>
          Họ tên <span className={styles.publicApplyPage__required}>*</span>
          <input
            type="text"
            value={form.candidateName}
            onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))}
            required
          />
        </label>
        <label>
          Email <span className={styles.publicApplyPage__required}>*</span>
          <input
            type="email"
            value={form.candidateEmail}
            onChange={(e) => setForm((f) => ({ ...f, candidateEmail: e.target.value }))}
            required
          />
        </label>
        <label>
          Số điện thoại <span className={styles.publicApplyPage__required}>*</span>
          <input
            type="tel"
            value={form.candidatePhone}
            onChange={(e) => setForm((f) => ({ ...f, candidatePhone: e.target.value }))}
            required
          />
        </label>
        <label>
          Thư xin việc
          <textarea
            value={form.coverLetter}
            onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))}
            rows={4}
          />
        </label>
        <label>
          CV (PDF) <span className={styles.publicApplyPage__required}>*</span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setForm((f) => ({ ...f, resume: e.target.files?.[0] || null }))}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Đang gửi...' : 'Gửi đơn ứng tuyển'}
        </button>
      </form>
    </div>
  );
}
