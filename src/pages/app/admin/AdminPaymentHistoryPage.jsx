import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { getCompanyPayments } from '../../../api/payments';
import styles from '../../../styles/components/AdminPaymentHistoryPage.module.css';

const STATUS_LABELS = {
  INIT: 'Khởi tạo',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
};

function getStatusClass(status) {
  const map = {
    INIT: styles.adminPaymentHistoryPage__status__INIT,
    SUCCESS: styles.adminPaymentHistoryPage__status__SUCCESS,
    FAILED: styles.adminPaymentHistoryPage__status__FAILED,
  };
  return map[status] || '';
}

function formatAmount(amount, currency = 'VND') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString('vi-VN')} ${currency === 'VND' ? 'đ' : currency}`;
}

export function AdminPaymentHistoryPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId;

  const [payments, setPayments] = useState([]);
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
    getCompanyPayments(companyId, {
      page,
      size,
      sort: 'createdAt,desc',
    })
      .then(({ payments: list, pagination: p }) => {
        setPayments(list);
        setPagination(p);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải lịch sử thanh toán thất bại');
      })
      .finally(() => setLoading(false));
  }, [companyId, page]);

  if (!companyId) {
    return (
      <div className={styles.adminPaymentHistoryPage}>
        <h1 className={styles.adminPaymentHistoryPage__title}>Lịch sử thanh toán</h1>
        <div className={styles.adminPaymentHistoryPage__error} role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminPaymentHistoryPage}>
      <header className={styles.adminPaymentHistoryPage__header}>
        <h1 className={styles.adminPaymentHistoryPage__title}>Lịch sử thanh toán</h1>
      </header>

      {error && (
        <div className={styles.adminPaymentHistoryPage__error} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.adminPaymentHistoryPage__loading}>Đang tải...</p>
      ) : (
        <>
          <div className={styles.adminPaymentHistoryPage__tableWrap}>
            <table className={styles.adminPaymentHistoryPage__table}>
              <thead>
                <tr>
                  <th>Mã GD</th>
                  <th>Số tiền</th>
                  <th>Cổng</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thanh toán</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.adminPaymentHistoryPage__emptyCell}>
                      Chưa có giao dịch thanh toán
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.txnRef || p.id?.slice(0, 8)}</td>
                      <td>{formatAmount(p.amount, p.currency)}</td>
                      <td>{p.gateway || '—'}</td>
                      <td>
                        <span
                          className={`${styles.adminPaymentHistoryPage__status} ${getStatusClass(p.status)}`}
                        >
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      <td>
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                      <td>
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.adminPaymentHistoryPage__pagination}>
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
