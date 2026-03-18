import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEmailHistory, getEmailHistoryById, resendEmail } from '../../../api/emailHistory';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/AdminEmailHistoryPage.module.css';

const STATUS_LABELS = { PENDING: 'Chờ gửi', SENT: 'Đã gửi', FAILED: 'Thất bại' };

function getStatusClass(status) {
  const map = {
    PENDING: styles.adminEmailHistoryPage__status__PENDING,
    SENT: styles.adminEmailHistoryPage__status__SENT,
    FAILED: styles.adminEmailHistoryPage__status__FAILED,
  };
  return map[status] || '';
}

export function AdminEmailHistoryPage() {
  const [emails, setEmails] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailEmail, setDetailEmail] = useState(null);
  const [resending, setResending] = useState(false);
  const size = 20;

  const loadEmails = () => {
    setLoading(true);
    getEmailHistory({
      page,
      size,
      status: statusFilter || undefined,
    })
      .then(({ emails: list, pagination: p }) => {
        setEmails(list);
        setPagination(p);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải lịch sử email thất bại');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmails();
  }, [page, statusFilter]);

  const openDetail = async (id) => {
    setError('');
    try {
      const data = await getEmailHistoryById(id);
      setDetailEmail(data);
      setDetailModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tải chi tiết thất bại');
    }
  };

  const handleResend = async (id) => {
    setResending(true);
    setError('');
    try {
      await resendEmail(id);
      loadEmails();
      setDetailModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gửi lại thất bại');
    } finally {
      setResending(false);
    }
  };

  const p = pagination || {};
  const totalPages = p.totalPages ?? 1;
  const currentPage = p.page ?? page;

  return (
    <div className={styles.adminEmailHistoryPage}>
      <header className={styles.adminEmailHistoryPage__header}>
        <h1 className={styles.adminEmailHistoryPage__title}>Lịch sử email</h1>
      </header>

      <div className={styles.adminEmailHistoryPage__filters}>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="">-- Tất cả trạng thái --</option>
          <option value="PENDING">Chờ gửi</option>
          <option value="SENT">Đã gửi</option>
          <option value="FAILED">Thất bại</option>
        </select>
      </div>

      {error && (
        <div className={styles.adminEmailHistoryPage__error} role="alert">{error}</div>
      )}

      {loading ? (
        <p className={styles.adminEmailHistoryPage__loading}>Đang tải...</p>
      ) : (
        <>
          <div className={styles.adminEmailHistoryPage__tableWrap}>
            <table className={styles.adminEmailHistoryPage__table}>
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Người nhận</th>
                  <th>Subject</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {emails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.adminEmailHistoryPage__emptyCell}>Chưa có email nào</td>
                  </tr>
                ) : (
                  emails.map((e) => (
                    <tr key={e.id}>
                      <td>{e.emailType || '—'}</td>
                      <td>{e.toEmail}</td>
                      <td className={styles.adminEmailHistoryPage__subjectCell}>{e.subject || '—'}</td>
                      <td>
                        <span className={`${styles.adminEmailHistoryPage__status} ${getStatusClass(e.status)}`}>
                          {STATUS_LABELS[e.status] || e.status}
                        </span>
                      </td>
                      <td>{e.createdAt ? new Date(e.createdAt).toLocaleString('vi-VN') : '—'}</td>
                      <td>
                        <button type="button" className={styles.adminEmailHistoryPage__actionLink} onClick={() => openDetail(e.id)}>Chi tiết</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.adminEmailHistoryPage__pagination}>
              <button type="button" disabled={currentPage <= 0} onClick={() => setPage((p) => p - 1)}>Trang trước</button>
              <span>Trang {currentPage + 1} / {totalPages}</span>
              <button type="button" disabled={currentPage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Trang sau</button>
            </div>
          )}
        </>
      )}

      <Drawer open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Chi tiết email">
        {detailEmail && (
          <div className={styles.adminEmailHistoryPage__detail}>
            <p><strong>Loại:</strong> {detailEmail.emailType}</p>
            <p><strong>Người nhận:</strong> {detailEmail.toEmail}</p>
            <p><strong>Subject:</strong> {detailEmail.subject}</p>
            <p><strong>Trạng thái:</strong> {STATUS_LABELS[detailEmail.status] || detailEmail.status}</p>
            {detailEmail.failedReason && <p><strong>Lỗi:</strong> {detailEmail.failedReason}</p>}
            {detailEmail.htmlBody && (
              <div className={styles.adminEmailHistoryPage__detailBody} dangerouslySetInnerHTML={{ __html: detailEmail.htmlBody }} />
            )}
            {detailEmail.status === 'FAILED' && (
              <button type="button" onClick={() => handleResend(detailEmail.id)} disabled={resending} className={styles.adminEmailHistoryPage__resendButton}>
                {resending ? 'Đang gửi...' : 'Gửi lại'}
              </button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
