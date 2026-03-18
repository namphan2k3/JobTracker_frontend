import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../../store/authStore';
import { resetPassword } from '../../api/auth';
import styles from '../../styles/components/AuthForm.module.css';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (!token) {
    return (
      <div className={styles.authForm}>
        <h1 className={styles.authForm__title}>Link không hợp lệ</h1>
        <p className={styles.authForm__message}>
          Thiếu token. Vui lòng sử dụng link trong email đặt lại mật khẩu.
        </p>
        <Link to="/auth/forgot-password" className={styles.authForm__primaryLink}>
          Gửi lại link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ token, newPassword });
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message;
      const errors = data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        setError(errors.map((e) => e.message).join('. '));
      } else {
        setError(msg || 'Đặt lại mật khẩu thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.authForm}>
        <h1 className={styles.authForm__title}>Đặt lại mật khẩu thành công</h1>
        <p className={styles.authForm__message}>
          Mật khẩu đã được cập nhật. Bạn có thể đăng nhập ngay.
        </p>
        <Link to="/auth/login" className={styles.authForm__primaryLink}>
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.authForm}>
      <h1 className={styles.authForm__title}>Đặt lại mật khẩu</h1>
      {isAuthenticated && (
        <div className={styles.authForm__error} role="alert">
          Bạn đang đăng nhập. Nếu link reset này dành cho tài khoản khác, hãy đăng xuất trước khi tiếp tục.
        </div>
      )}
      <form className={styles.authForm__form} onSubmit={handleSubmit}>
        {error && (
          <div className={styles.authForm__error} role="alert">
            {error}
          </div>
        )}
        <label className={styles.authForm__label} htmlFor="newPassword">
          Mật khẩu mới
        </label>
        <input
          id="newPassword"
          type="password"
          className={styles.authForm__input}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
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
          {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
        </button>
      </form>
      <p className={styles.authForm__footer}>
        <Link to="/auth/login">Quay lại đăng nhập</Link>
      </p>
    </div>
  );
}
