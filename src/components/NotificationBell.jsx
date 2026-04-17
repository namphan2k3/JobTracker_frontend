import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { getNotifications, markNotificationAsRead } from '../api/notifications';
import styles from '../styles/components/NotificationBell.module.css';

const POLL_INTERVAL_MS = 10000;

export function NotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const fetch = () => {
      Promise.all([
        getNotifications({ size: 1, isRead: false }),
        getNotifications({ size: 5 }),
      ])
        .then(([unreadRes, previewRes]) => {
          setUnreadCount(unreadRes.pagination?.totalElements ?? 0);
          setPreviewItems(previewRes.notifications || []);
        })
        .catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const formatWhen = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePreviewItemClick = async (item) => {
    try {
      if (!item?.isRead) {
        await markNotificationAsRead(item.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setPreviewItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      }
    } catch {
      // ignore mark-read error to preserve navigation flow
    } finally {
      setPreviewOpen(false);
      if (item?.applicationId) {
        navigate(`/app/applications/${item.applicationId}`);
      } else {
        navigate('/app/notifications');
      }
    }
  };

  return (
    <div
      className={styles.notificationBellWrap}
      onMouseEnter={() => setPreviewOpen(true)}
      onMouseLeave={() => setPreviewOpen(false)}
      onFocus={() => setPreviewOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setPreviewOpen(false);
        }
      }}
    >
      <Link to="/app/notifications" className={styles.notificationBell} aria-label="Thông báo">
        <Bell size={20} className={styles.notificationBell__icon} />
        {unreadCount > 0 && (
          <span className={styles.notificationBell__badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>

      {previewOpen && (
        <div className={styles.notificationBell__preview}>
          <div className={styles.notificationBell__previewHeader}>
            <span>Thông báo gần đây</span>
            <Link to="/app/notifications" className={styles.notificationBell__previewLink}>
              Xem tất cả
            </Link>
          </div>
          {previewItems.length === 0 ? (
            <p className={styles.notificationBell__empty}>Chưa có thông báo</p>
          ) : (
            <ul className={styles.notificationBell__previewList}>
              {previewItems.map((item) => (
                <li key={item.id} className={styles.notificationBell__previewItem}>
                  <button
                    type="button"
                    className={styles.notificationBell__previewItemBtn}
                    onClick={() => handlePreviewItemClick(item)}
                  >
                    <p className={styles.notificationBell__previewTitle}>
                      {item.title || 'Thông báo'}
                    </p>
                    <p className={styles.notificationBell__previewMessage}>
                      {item.message || '-'}
                    </p>
                    <span className={styles.notificationBell__previewTime}>
                      {formatWhen(item.createdAt || item.sentAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
