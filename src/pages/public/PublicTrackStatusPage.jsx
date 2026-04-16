import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getApplicationStatusByToken } from '../../api/publicApplications';
import styles from '../../styles/components/PublicTrackStatusPage.module.css';

const PIPELINE_STEPS = [
  { key: 'NEW', label: 'Đã nộp' },
  { key: 'SCREENING', label: 'Sàng lọc' },
  { key: 'INTERVIEW', label: 'Phỏng vấn' },
  { key: 'OFFER', label: 'Offer' },
  { key: 'HIRED', label: 'Trúng tuyển' },
];

function getStepIndex(statusName) {
  const name = (statusName || '').toUpperCase();
  if (name === 'REJECTED') return -1;
  const idx = PIPELINE_STEPS.findIndex((s) => name.includes(s.key) || name === s.key);
  if (idx !== -1) return idx;
  if (name === 'APPLIED' || name === 'NEW') return 0;
  return 0;
}

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

  if (loading) {
    return (
      <div className={styles.publicTrackStatusPage}>
        <div className={styles.publicTrackStatusPage__loadingWrap}>
          <div className={styles.publicTrackStatusPage__spinner} />
          <p className={styles.publicTrackStatusPage__loading}>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.publicTrackStatusPage}>
        <div className={styles.publicTrackStatusPage__errorCard}>
          <div className={styles.publicTrackStatusPage__errorIcon}>!</div>
          <h2>Không tìm thấy</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const statusName = data.status?.name || data.status?.statusType || '';
  const isRejected = statusName.toUpperCase() === 'REJECTED';
  const currentStep = getStepIndex(statusName);

  return (
    <div className={styles.publicTrackStatusPage}>
      <div className={styles.publicTrackStatusPage__hero}>
        <h1 className={styles.publicTrackStatusPage__title}>Theo dõi đơn ứng tuyển</h1>
        <p className={styles.publicTrackStatusPage__subtitle}>
          Xin chào <strong>{data.candidateName}</strong>, dưới đây là trạng thái đơn ứng tuyển của bạn.
        </p>
      </div>

      <div className={styles.publicTrackStatusPage__card}>
        <div className={styles.publicTrackStatusPage__jobHeader}>
          <span className={styles.publicTrackStatusPage__jobLabel}>Vị trí ứng tuyển</span>
          <h2 className={styles.publicTrackStatusPage__jobTitle}>{data.jobTitle}</h2>
        </div>

        {isRejected ? (
          <div className={styles.publicTrackStatusPage__rejectedBanner}>
            <span className={styles.publicTrackStatusPage__rejectedIcon}>✕</span>
            <div>
              <strong>Đơn ứng tuyển không được tiếp tục</strong>
              <p>Cảm ơn bạn đã quan tâm. Chúc bạn may mắn trong những cơ hội tiếp theo.</p>
            </div>
          </div>
        ) : (
          <div className={styles.publicTrackStatusPage__stepper}>
            {PIPELINE_STEPS.map((step, idx) => {
              let state = 'upcoming';
              if (idx < currentStep) state = 'completed';
              else if (idx === currentStep) state = 'current';
              return (
                <div
                  key={step.key}
                  className={`${styles.publicTrackStatusPage__step} ${styles[`publicTrackStatusPage__step_${state}`]}`}
                >
                  <div className={styles.publicTrackStatusPage__stepDot}>
                    {state === 'completed' ? '✓' : idx + 1}
                  </div>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <div
                      className={`${styles.publicTrackStatusPage__stepLine} ${idx < currentStep ? styles.publicTrackStatusPage__stepLine_done : ''}`}
                    />
                  )}
                  <span className={styles.publicTrackStatusPage__stepLabel}>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.publicTrackStatusPage__details}>
          <div className={styles.publicTrackStatusPage__detailItem}>
            <span className={styles.publicTrackStatusPage__detailLabel}>Trạng thái</span>
            <span
              className={styles.publicTrackStatusPage__statusBadge}
              style={{ '--status-color': data.status?.color || '#6b7280' }}
            >
              {data.status?.displayName || data.status?.name || '-'}
            </span>
          </div>
          <div className={styles.publicTrackStatusPage__detailItem}>
            <span className={styles.publicTrackStatusPage__detailLabel}>Email</span>
            <span className={styles.publicTrackStatusPage__detailValue}>{data.candidateEmail}</span>
          </div>
          <div className={styles.publicTrackStatusPage__detailItem}>
            <span className={styles.publicTrackStatusPage__detailLabel}>Ngày ứng tuyển</span>
            <span className={styles.publicTrackStatusPage__detailValue}>
              {data.appliedDate
                ? new Date(data.appliedDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : '-'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.publicTrackStatusPage__footer}>
        <p className={styles.publicTrackStatusPage__hint}>
          Nếu HR yêu cầu bổ sung tài liệu (chứng chỉ, portfolio), bạn có thể upload tại{' '}
          <Link to={`/public/applications/${token}/attachments`}>
            trang upload tài liệu
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
