import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { getCompanySubscription } from '../../../api/subscriptions';
import styles from '../../../styles/components/AdminSubscriptionPage.module.css';

const STATUS_LABELS = {
  PENDING: 'Chờ kích hoạt',
  ACTIVE: 'Đang hoạt động',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};

function getStatusClass(status) {
  const map = {
    ACTIVE: styles.adminSubscriptionPage__status__ACTIVE,
    PENDING: styles.adminSubscriptionPage__status__PENDING,
    EXPIRED: styles.adminSubscriptionPage__status__EXPIRED,
    CANCELLED: styles.adminSubscriptionPage__status__CANCELLED,
  };
  return map[status] || '';
}

export function AdminSubscriptionPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId;
  const location = useLocation();
  const successMessage = location.state?.message;

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId) {
      setError('Không tìm thấy thông tin công ty.');
      setLoading(false);
      return;
    }

    getCompanySubscription(companyId)
      .then(setSubscription)
      .catch((err) => {
        if (err.response?.status === 404) {
          setSubscription(null);
          setError('');
        } else {
          setError(err.response?.data?.message || err.message || 'Lấy subscription thất bại');
        }
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return (
      <div className={styles.adminSubscriptionPage}>
        <p className={styles.adminSubscriptionPage__loading}>Đang tải...</p>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className={styles.adminSubscriptionPage}>
        <h1 className={styles.adminSubscriptionPage__title}>Gói đăng ký</h1>
        <div className={styles.adminSubscriptionPage__error} role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminSubscriptionPage}>
      <header className={styles.adminSubscriptionPage__header}>
        <h1 className={styles.adminSubscriptionPage__title}>Gói đăng ký</h1>
      </header>

      {successMessage && (
        <div className={styles.adminSubscriptionPage__success}>{successMessage}</div>
      )}
      {error && (
        <div className={styles.adminSubscriptionPage__error} role="alert">
          {error}
        </div>
      )}

      {!subscription ? (
        <div className={styles.adminSubscriptionPage__empty}>
          <p>Chưa có gói đăng ký đang hoạt động.</p>
          <Link
            to="/app/admin/plans"
            className={styles.adminSubscriptionPage__upgradeButton}
          >
            Nâng cấp gói
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.adminSubscriptionPage__card}>
            <div className={styles.adminSubscriptionPage__planHeader}>
              <h2 className={styles.adminSubscriptionPage__planName}>
                {subscription.planName || subscription.planCode}
              </h2>
              <span
                className={`${styles.adminSubscriptionPage__status} ${getStatusClass(subscription.status)}`}
              >
                {STATUS_LABELS[subscription.status] || subscription.status}
              </span>
            </div>
            <dl className={styles.adminSubscriptionPage__limits}>
              <div>
                <dt>Bắt đầu</dt>
                <dd>
                  {subscription.startDate
                    ? new Date(subscription.startDate).toLocaleDateString('vi-VN')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Kết thúc</dt>
                <dd>
                  {subscription.endDate
                    ? new Date(subscription.endDate).toLocaleDateString('vi-VN')
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className={styles.adminSubscriptionPage__actions}>
            <Link
              to="/app/admin/plans"
              className={styles.adminSubscriptionPage__upgradeButton}
            >
              Nâng cấp gói
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
