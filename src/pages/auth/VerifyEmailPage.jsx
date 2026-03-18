import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../../store/authStore';
import { verifyEmail } from '../../api/auth';
import styles from '../../styles/components/AuthForm.module.css';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [error, setError] = useState('');

  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Thiếu token xác thực. Vui lòng sử dụng link trong email.');
      return;
    }

    verifyEmail({ token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setError(err.response?.data?.message || err.message || 'Xác thực thất bại');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className={styles.authForm}>
        <h1 className={styles.authForm__title}>Xác thực email</h1>
        {isAuthenticated && (
          <p className={styles.authForm__message}>
            Bạn đang đăng nhập. Link xác thực vẫn sẽ được xử lý bình thường.
          </p>
        )}
        <p className={styles.authForm__message}>Đang xác thực...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className={styles.authForm}>
        <h1 className={styles.authForm__title}>Xác thực thành công</h1>
        <p className={styles.authForm__message}>
          Email của bạn đã được xác thực. Bạn có thể đăng nhập ngay.
        </p>
        {isAuthenticated ? (
          <Link to="/app/dashboard" className={styles.authForm__primaryLink}>
            Về Dashboard
          </Link>
        ) : (
          <Link to="/auth/login" className={styles.authForm__primaryLink}>
            Đăng nhập
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={styles.authForm}>
      <h1 className={styles.authForm__title}>Xác thực thất bại</h1>
      <div className={styles.authForm__error} role="alert">
        {error}
      </div>
      <Link to="/auth/login" className={styles.authForm__primaryLink}>
        Về trang đăng nhập
      </Link>
      <p className={styles.authForm__footer}>
        Token hết hạn?{' '}
        <Link to="/auth/resend-verification">Gửi lại email xác thực</Link>
      </p>
    </div>
  );
}
