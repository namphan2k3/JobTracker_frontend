import { Outlet, Link } from 'react-router-dom';
import styles from '../styles/components/PublicLayout.module.css';

/**
 * Layout cho trang public (candidate) - không cần đăng nhập
 * Apply, Track status, Upload attachments
 */
export function PublicLayout() {
  return (
    <div className={styles.publicLayout}>
      <header className={styles.publicLayout__header}>
        <Link to="/" className={styles.publicLayout__brand}>
          JobTracker ATS
        </Link>
      </header>
      <main className={styles.publicLayout__main}>
        <Outlet />
      </main>
    </div>
  );
}
