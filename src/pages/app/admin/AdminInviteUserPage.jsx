import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inviteUser } from '../../../api/adminUsers';
import { getRoles } from '../../../api/adminRoles';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/AuthForm.module.css';

export function AdminInviteUserPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getRoles()
      .then((list) => {
        setRoles(list.filter((r) => r.isActive));
        const recruiter = list.find((r) => r.name === 'RECRUITER');
        if (recruiter) setRoleId(recruiter.id);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await inviteUser({ email, firstName, lastName, phone: phone || undefined, roleId: roleId || undefined });
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || err.message;
      const errors = data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        setError(errors.map((e) => e.message).join('. '));
      } else {
        setError(msg || 'Mời user thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Drawer open onClose={() => navigate('/app/admin/users')} title="Đã gửi lời mời">
        <p className={styles.authForm__message}>
          Email mời đã được gửi đến {email}. User sẽ nhận link để đặt mật khẩu và đăng nhập.
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
            Mời thêm
          </button>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open onClose={() => navigate('/app/admin/users')} title="Mời user">
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
        <label className={styles.authForm__label} htmlFor="roleId">
          Vai trò
        </label>
        <select
          id="roleId"
          className={styles.authForm__input}
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          disabled={loading}
        >
          <option value="">RECRUITER (mặc định)</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={styles.authForm__submitButton}
          disabled={loading}
        >
          {loading ? 'Đang gửi...' : 'Gửi lời mời'}
        </button>
      </form>
      <p className={styles.authForm__footer}>
        <Link to="/app/admin/users">Quay lại danh sách</Link>
      </p>
    </Drawer>
  );
}
