import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getApplicationStatusByToken } from '../../api/publicApplications';
import styles from '../../styles/components/PublicTrackStatusPage.module.css';

export function PublicTrackStatusPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getApplicationStatusByToken(token)
      .then(setData)
      .catch((err) => setError(err.message || 'Không tìm thấy đơn ứng tuyển'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className={styles.publicTrackStatusPage__loading}>Đang tải...</p>;
  if (error) {
    return (
      <div className={styles.publicTrackStatusPage}>
        <div className={styles.publicTrackStatusPage__error} role="alert">
          {error}
        </div>
        <Link to="/" className={styles.publicTrackStatusPage__homeLink}>
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.publicTrackStatusPage}>
      <h1 className={styles.publicTrackStatusPage__title}>Trạng thái đơn ứng tuyển</h1>

      <div className={styles.publicTrackStatusPage__card}>
        <dl>
          <dt>Ứng viên</dt>
          <dd>{data.candidateName}</dd>
          <dt>Email</dt>
          <dd>{data.candidateEmail}</dd>
          <dt>Vị trí</dt>
          <dd>{data.jobTitle}</dd>
          <dt>Ngày ứng tuyển</dt>
          <dd>{data.appliedDate}</dd>
          <dt>Trạng thái</dt>
          <dd>
            <span
              className={styles.publicTrackStatusPage__statusBadge}
              style={{ '--status-color': data.status?.color || '#6b7280' }}
            >
              {data.status?.displayName || data.status?.name || '-'}
            </span>
          </dd>
        </dl>
      </div>

      <p className={styles.publicTrackStatusPage__hint}>
        Nếu HR yêu cầu bổ sung tài liệu (chứng chỉ, portfolio), bạn có thể upload tại{' '}
        <Link to={`/public/applications/${token}/attachments`}>
          trang upload tài liệu
        </Link>
        .
      </p>

      <Link to="/" className={styles.publicTrackStatusPage__homeLink}>
        Về trang chủ
      </Link>
    </div>
  );
}
