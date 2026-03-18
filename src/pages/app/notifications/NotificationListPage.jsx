import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../../../api/notifications';
import styles from '../../../styles/components/NotificationListPage.module.css';

const POLL_INTERVAL_MS = 30000;

const TYPE_LABELS = {
  APPLICATION_RECEIVED: 'Ứng viên mới',
  INTERVIEW_SCHEDULED: 'Lịch phỏng vấn',
  INTERVIEW_REMINDER: 'Nhắc phỏng vấn',
  STATUS_CHANGE: 'Đổi trạng thái',
  DEADLINE_REMINDER: 'Nhắc deadline',
  COMMENT_ADDED: 'Bình luận mới',
  ASSIGNMENT_CHANGED: 'Đổi người phụ trách',
};

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

export function NotificationListPage() {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ isRead: '', page: 0, size: 20 });

  const fetchNotifications = useCallback(() => {
    const params = {
      page: filter.page,
      size: filter.size,
      isRead: filter.isRead === 'true' ? true : filter.isRead === 'false' ? false : undefined,
    };
    return getNotifications(params)
      .then(({ notifications: list, pagination: p }) => {
        setNotifications(list);
        setPagination(p);
      })
      .catch((err) => setError(err.message || 'Tải thất bại'));
  }, [filter.page, filter.size, filter.isRead]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  useEffect(() => {
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = (id) => {
    markNotificationAsRead(id).then(fetchNotifications).catch((err) => setError(err.message));
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead().then(fetchNotifications).catch((err) => setError(err.message));
  };

  const handleDelete = (id) => {
    deleteNotification(id).then(fetchNotifications).catch((err) => setError(err.message));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className={styles.notificationListPage}>
      <header className={styles.notificationListPage__header}>
        <h1 className={styles.notificationListPage__title}>Thông báo</h1>
        <div className={styles.notificationListPage__actions}>
          <select
            className={styles.notificationListPage__filterSelect}
            value={filter.isRead}
            onChange={(e) => setFilter((f) => ({ ...f, isRead: e.target.value, page: 0 }))}
          >
            <option value="">Tất cả</option>
            <option value="false">Chưa đọc</option>
            <option value="true">Đã đọc</option>
          </select>
          <button
            type="button"
            className={styles.notificationListPage__markAllBtn}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.notificationListPage__error} role="alert">
          {error}
        </div>
      )}

      {loading && notifications.length === 0 ? (
        <p className={styles.notificationListPage__loading}>Đang tải...</p>
      ) : (
        <ul className={styles.notificationListPage__list}>
          {notifications.map((n) => (
            <li
              key={n.id}
              className={
                !n.isRead
                  ? `${styles.notificationListPage__item} ${styles.notificationListPage__item_unread}`
                  : styles.notificationListPage__item
              }
            >
              <div className={styles.notificationListPage__itemMain}>
                <span className={styles.notificationListPage__typeBadge}>
                  {TYPE_LABELS[n.type] || n.type}
                </span>
                <h3 className={styles.notificationListPage__itemTitle}>{n.title}</h3>
                <p className={styles.notificationListPage__itemMessage}>{n.message}</p>
                <span className={styles.notificationListPage__itemDate}>
                  {formatDateTime(n.createdAt)}
                </span>
              </div>
              <div className={styles.notificationListPage__itemActions}>
                {n.applicationId && (
                  <Link
                    to={`/app/applications/${n.applicationId}`}
                    className={styles.notificationListPage__linkBtn}
                  >
                    Xem hồ sơ
                  </Link>
                )}
                {!n.isRead && (
                  <button
                    type="button"
                    className={styles.notificationListPage__actionBtn}
                    onClick={() => handleMarkAsRead(n.id)}
                  >
                    Đã đọc
                  </button>
                )}
                <button
                  type="button"
                  className={styles.notificationListPage__deleteBtn}
                  onClick={() => handleDelete(n.id)}
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && notifications.length === 0 && (
        <p className={styles.notificationListPage__empty}>Không có thông báo</p>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className={styles.notificationListPage__pagination}>
          <button
            type="button"
            disabled={filter.page <= 0}
            onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))}
          >
            Trang trước
          </button>
          <span>
            Trang {filter.page + 1} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={filter.page >= pagination.totalPages - 1}
            onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))}
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}
