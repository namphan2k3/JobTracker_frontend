import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { uploadApplicationAttachment } from '../../api/publicApplications';
import styles from '../../styles/components/PublicUploadAttachmentsPage.module.css';

const ATTACHMENT_TYPES = [
  { value: 'CERTIFICATE', label: 'Chứng chỉ' },
  { value: 'PORTFOLIO', label: 'Portfolio' },
  { value: 'OTHER', label: 'Khác' },
];

export function PublicUploadAttachmentsPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    file: null,
    attachmentType: 'CERTIFICATE',
    description: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.file) {
      setError('Vui lòng chọn file.');
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append('file', form.file);
    fd.append('attachmentType', form.attachmentType);
    fd.append('description', form.description || '');
    uploadApplicationAttachment(token, fd)
      .then(() => setSuccess(true))
      .catch((err) => setError(err.message || 'Upload thất bại'))
      .finally(() => setLoading(false));
  };

  if (success) {
    return (
      <div className={styles.publicUploadAttachmentsPage}>
        <div className={styles.publicUploadAttachmentsPage__success}>
          <h1>Upload thành công!</h1>
          <p>Tài liệu của bạn đã được gửi. HR sẽ xem xét.</p>
          <Link to={`/public/applications/${token}/status`}>
            Xem trạng thái đơn ứng tuyển
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.publicUploadAttachmentsPage}>
      <h1 className={styles.publicUploadAttachmentsPage__title}>Upload tài liệu bổ sung</h1>
      <p className={styles.publicUploadAttachmentsPage__subtitle}>
        Chỉ upload khi HR đã yêu cầu (status SCREENING hoặc INTERVIEWING). Nếu chưa được yêu cầu,
        bạn sẽ nhận thông báo lỗi.
      </p>

      {error && (
        <div className={styles.publicUploadAttachmentsPage__error} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.publicUploadAttachmentsPage__form}>
        <label>
          Loại tài liệu
          <select
            value={form.attachmentType}
            onChange={(e) => setForm((f) => ({ ...f, attachmentType: e.target.value }))}
          >
            {ATTACHMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mô tả
          <input
            type="text"
            placeholder="VD: AWS Certification"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <label>
          File <span className={styles.publicUploadAttachmentsPage__required}>*</span>
          <input
            type="file"
            onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Đang upload...' : 'Upload'}
        </button>
      </form>

      <Link to={`/public/applications/${token}/status`} className={styles.publicUploadAttachmentsPage__backLink}>
        ← Xem trạng thái đơn ứng tuyển
      </Link>
    </div>
  );
}
