import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { getCompanySubscriptionHistory } from '../../../api/subscriptions';
import styles from '../../../styles/components/AdminSubscriptionHistoryPage.module.css';

const STATUS_LABELS = {
  PENDING: 'Chờ kích hoạt',
  ACTIVE: 'Đang hoạt động',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};

function getStatusClass(status) {
  const map = {
    ACTIVE: styles.adminSubscriptionHistoryPage__status__ACTIVE,
    PENDING: styles.adminSubscriptionHistoryPage__status__PENDING,
    EXPIRED: styles.adminSubscriptionHistoryPage__status__EXPIRED,
    CANCELLED: styles.adminSubscriptionHistoryPage__status__CANCELLED,
  };
  return map[status] || '';
}

export function AdminSubscriptionHistoryPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId;

  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const size = 20;

  useEffect(() => {
    if (!companyId) {
      setError('Không tìm thấy thông tin công ty.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getCompanySubscriptionHistory(companyId, {
      page,
      size,
      sort: 'startDate,desc',
    })
      .then(({ subscriptions: list, pagination: p }) => {
        setSubscriptions(list);
        setPagination(p);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải lịch sử thất bại');
      })
      .finally(() => setLoading(false));
  }, [companyId, page]);

  if (!companyId) {
    return (
      <div className={styles.adminSubscriptionHistoryPage}>
        <h1 className={styles.adminSubscriptionHistoryPage__title}>Lịch sử gói</h1>
        <div className={styles.adminSubscriptionHistoryPage__error} role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminSubscriptionHistoryPage}>
      <header className={styles.adminSubscriptionHistoryPage__header}>
        <h1 className={styles.adminSubscriptionHistoryPage__title}>Lịch sử gói</h1>
      </header>

      {error && (
        <div className={styles.adminSubscriptionHistoryPage__error} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.adminSubscriptionHistoryPage__loading}>Đang tải...</p>
      ) : (
        <>
          <div className={styles.adminSubscriptionHistoryPage__tableWrap}>
            <table className={styles.adminSubscriptionHistoryPage__table}>
              <thead>
                <tr>
                  <th>Gói</th>
                  <th>Trạng thái</th>
                  <th>Bắt đầu</th>
                  <th>Kết thúc</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.adminSubscriptionHistoryPage__emptyCell}>
                      Chưa có lịch sử gói
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.planName || s.planCode}</td>
                      <td>
                        <span
                          className={`${styles.adminSubscriptionHistoryPage__status} ${getStatusClass(s.status)}`}
                        >
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                      </td>
                      <td>
                        {s.startDate
                          ? new Date(s.startDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
                      <td>
                        {s.endDate
                          ? new Date(s.endDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.adminSubscriptionHistoryPage__pagination}>
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Trang trước
              </button>
              <span>
                Trang {page + 1} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
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
