import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { getNotifications } from '../api/notifications';
import styles from '../styles/components/NotificationBell.module.css';

const POLL_INTERVAL_MS = 30000;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetch = () => {
      getNotifications({ size: 1, isRead: false })
        .then(({ pagination }) => {
          setUnreadCount(pagination?.totalElements ?? 0);
        })
        .catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link to="/app/notifications" className={styles.notificationBell} aria-label="Thông báo">
      <Bell size={20} className={styles.notificationBell__icon} />
      {unreadCount > 0 && (
        <span className={styles.notificationBell__badge}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
