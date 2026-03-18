import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../../store/authStore';
import { acceptInvite } from '../../api/auth';
import styles from '../../styles/components/AuthForm.module.css';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (!token) {
    return (
      <div className={styles.authForm}>
        <h1 className={styles.authForm__title}>Link không hợp lệ</h1>
        <p className={styles.authForm__message}>
          Thiếu token. Vui lòng sử dụng link trong email mời tham gia.
        </p>
        <Link to="/auth/login" className={styles.authForm__primaryLink}>
          Về trang đăng nhập
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    try {
      const data = await acceptInvite({ token, password });
      setEmail(data?.email || '');
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message;
      const errors = data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        setError(errors.map((e) => e.message).join('. '));
      } else {
        setError(msg || 'Chấp nhận lời mời thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.authForm}>
        <h1 className={styles.authForm__title}>Chấp nhận lời mời thành công</h1>
        <p className={styles.authForm__message}>
          Tài khoản đã được kích hoạt. Bạn có thể đăng nhập với email
          {email && ` ${email}`}.
        </p>
        <Link to="/auth/login" className={styles.authForm__primaryLink}>
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.authForm}>
      <h1 className={styles.authForm__title}>Chấp nhận lời mời</h1>
      {isAuthenticated && (
        <div className={styles.authForm__error} role="alert">
          Bạn đang đăng nhập. Nếu link invite này dành cho tài khoản khác, hãy đăng xuất trước khi tiếp tục.
        </div>
      )}
      <p className={styles.authForm__message}>
        Đặt mật khẩu cho tài khoản của bạn.
      </p>
      <form className={styles.authForm__form} onSubmit={handleSubmit}>
        {error && (
          <div className={styles.authForm__error} role="alert">
            {error}
          </div>
        )}
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
        <label className={styles.authForm__label} htmlFor="confirmPassword">
          Xác nhận mật khẩu
        </label>
        <input
          id="confirmPassword"
          type="password"
          className={styles.authForm__input}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          disabled={loading}
        />
        <button
          type="submit"
          className={styles.authForm__submitButton}
          disabled={loading}
        >
          {loading ? 'Đang xử lý...' : 'Xác nhận'}
        </button>
      </form>
      <p className={styles.authForm__footer}>
        <Link to="/auth/login">Quay lại đăng nhập</Link>
      </p>
    </div>
  );
}
