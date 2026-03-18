import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../../store/authStore';
import { forgotPassword } from '../../api/auth';
import styles from '../../styles/components/AuthForm.module.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message;
      const errors = data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        setError(errors.map((e) => e.message).join('. '));
      } else {
        setError(msg || 'Gửi email thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.authForm}>
        <h1 className={styles.authForm__title}>Đã gửi email</h1>
        <p className={styles.authForm__message}>
          Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.
          Kiểm tra hộp thư (và thư mục spam).
        </p>
        <Link to="/auth/login" className={styles.authForm__primaryLink}>
          Về trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.authForm}>
      <h1 className={styles.authForm__title}>Quên mật khẩu</h1>
      <form className={styles.authForm__form} onSubmit={handleSubmit}>
        {error && (
          <div className={styles.authForm__error} role="alert">
            {error}
          </div>
        )}
        <label className={styles.authForm__label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={styles.authForm__input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />
        <button
          type="submit"
          className={styles.authForm__submitButton}
          disabled={loading}
        >
          {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
        </button>
      </form>
      <p className={styles.authForm__footer}>
        <Link to="/auth/login">Quay lại đăng nhập</Link>
      </p>
    </div>
  );
}
