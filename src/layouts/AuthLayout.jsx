import { Outlet, Link } from 'react-router-dom';
import styles from '../styles/components/AuthLayout.module.css';

export function AuthLayout() {
  return (
    <div className={styles.authLayout}>
      <header className={styles.authLayout__header}>
        <Link to="/" className={styles.authLayout__brand}>
          JobTracker ATS
        </Link>
      </header>
      <main className={styles.authLayout__main}>
        <Outlet />
      </main>
    </div>
  );
}
