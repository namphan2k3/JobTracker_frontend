import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addEmployee } from '../../../api/adminUsers';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/AuthForm.module.css';

export function AdminAddEmployeePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await addEmployee({ email, firstName, lastName, phone: phone || undefined });
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message;
      setError(msg || 'Thêm nhân viên thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Drawer open onClose={() => navigate('/app/admin/users')} title="Đã thêm nhân viên">
        <p className={styles.authForm__message}>
          Nhân viên đã được thêm. Họ không có quyền đăng nhập app — chỉ dùng cho
          liên hệ, gán interview, v.v.
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
          <Link to="/app/admin/users" className={styles.authForm__primaryLink}>
            Về danh sách users
          </Link>
          <button
            type="button"
            onClick={() => {
              setSuccess(false);
              setEmail('');
              setFirstName('');
              setLastName('');
              setPhone('');
            }}
            className={styles.authForm__secondaryButton}
          >
            Thêm tiếp
          </button>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open onClose={() => navigate('/app/admin/users')} title="Thêm nhân viên">
      <p className={styles.authForm__message}>
        Nhân viên không có quyền đăng nhập app. Chỉ lưu thông tin liên hệ.
      </p>
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
          disabled={loading}
        />
        <button
          type="submit"
          className={styles.authForm__submitButton}
          disabled={loading}
        >
          {loading ? 'Đang thêm...' : 'Thêm nhân viên'}
        </button>
      </form>
      <p className={styles.authForm__footer}>
        <Link to="/app/admin/users">Quay lại danh sách</Link>
      </p>
    </Drawer>
  );
}
