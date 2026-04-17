import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../../store/authStore';
import { login } from '../../api/auth';
import styles from '../../styles/components/AuthForm.module.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/app/dashboard');
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message;
      const errors = data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        setError(errors.map((e) => e.message).join('. '));
      } else {
        setError(msg || 'Đăng nhập thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authForm}>
      <h1 className={styles.authForm__title}>Đăng nhập</h1>
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
        <label className={styles.authForm__label} htmlFor="password">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          className={styles.authForm__input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
        />
        <Link
          to="/auth/forgot-password"
          className={styles.authForm__forgotLink}
        >
          Quên mật khẩu?
        </Link>
        <button
          type="submit"
          className={styles.authForm__submitButton}
          disabled={loading}
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
      <div className={styles.authForm__demoBox}>
        <p className={styles.authForm__demoTitle}>Tài khoản demo</p>
        <p className={styles.authForm__demoInfo}>
          <span>admin@gmail.com</span> / <span>123456789</span>
        </p>
        <button
          type="button"
          className={styles.authForm__demoButton}
          onClick={() => {
            setEmail('admin@gmail.com');
            setPassword('123456789');
          }}
          disabled={loading}
        >
          Điền tài khoản demo
        </button>
      </div>
      <p className={styles.authForm__footer}>
        Chưa có tài khoản? <Link to="/auth/register">Đăng ký</Link>
      </p>
    </div>
  );
}
