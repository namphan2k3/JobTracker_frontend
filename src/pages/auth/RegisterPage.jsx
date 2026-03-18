import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../../store/authStore';
import { register } from '../../api/auth';
import styles from '../../styles/components/AuthForm.module.css';

export function RegisterPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      await register({
        companyName,
        email,
        password,
        firstName,
        lastName,
        phone: phone || undefined,
      });
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message;
      const errors = data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        setError(errors.map((e) => e.message).join('. '));
      } else {
        setError(msg || 'Đăng ký thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.authForm}>
        <h1 className={styles.authForm__title}>Đăng ký thành công</h1>
        <p className={styles.authForm__message}>
          Vui lòng kiểm tra email để xác thực tài khoản. Sau khi xác thực, bạn
          có thể đăng nhập.
        </p>
        <Link to="/auth/login" className={styles.authForm__primaryLink}>
          Đăng nhập
        </Link>
        <p className={styles.authForm__footer}>
          Chưa nhận được email?{' '}
          <Link to="/auth/resend-verification">Gửi lại</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.authForm}>
      <h1 className={styles.authForm__title}>Đăng ký công ty</h1>
      <form className={styles.authForm__form} onSubmit={handleSubmit}>
        {error && (
          <div className={styles.authForm__error} role="alert">
            {error}
          </div>
        )}
        <label className={styles.authForm__label} htmlFor="companyName">
          Tên công ty
        </label>
        <input
          id="companyName"
          type="text"
          className={styles.authForm__input}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          disabled={loading}
        />
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
          minLength={8}
          autoComplete="new-password"
          disabled={loading}
        />
        <label className={styles.authForm__label} htmlFor="firstName">
          Họ
        </label>
        <input
          id="firstName"
          type="text"
          className={styles.authForm__input}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          autoComplete="given-name"
          disabled={loading}
        />
        <label className={styles.authForm__label} htmlFor="lastName">
          Tên
        </label>
        <input
          id="lastName"
          type="text"
          className={styles.authForm__input}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          autoComplete="family-name"
          disabled={loading}
        />
        <label className={styles.authForm__label} htmlFor="phone">
          Số điện thoại
        </label>
        <input
          id="phone"
          type="tel"
          className={styles.authForm__input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          disabled={loading}
        />
        <button
          type="submit"
          className={styles.authForm__submitButton}
          disabled={loading}
        >
          {loading ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>
      <p className={styles.authForm__footer}>
        Đã có tài khoản? <Link to="/auth/login">Đăng nhập</Link>
      </p>
    </div>
  );
}
