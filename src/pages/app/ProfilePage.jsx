import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
} from '../../api/users';
import { Drawer } from '../../components/Drawer';
import styles from '../../styles/components/ProfilePage.module.css';

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const updateUserInStore = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setPhone(data.phone || '');
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải profile thất bại');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const data = await updateProfile({ firstName, lastName, phone });
      setProfile(data);
      updateUserInStore({ firstName: data.firstName, lastName: data.lastName });
      setSuccess(true);
      setEditModalOpen(false);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || err.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await uploadAvatar(file);
      setProfile((p) => (p ? { ...p, avatarUrl: data.avatarUrl } : null));
      updateUserInStore({ avatarUrl: data.avatarUrl });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload avatar thất bại');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalOpen(false);
    } catch (err) {
      const data = err.response?.data;
      setPasswordError(data?.message || err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.profilePage}>
        <p className={styles.profilePage__loading}>Đang tải...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.profilePage}>
        <p className={styles.profilePage__error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.profilePage}>
      <h1 className={styles.profilePage__title}>Hồ sơ cá nhân</h1>
      {success && (
        <div className={styles.profilePage__success}>Đã cập nhật.</div>
      )}
      {passwordSuccess && (
        <div className={styles.profilePage__success}>Đã đổi mật khẩu.</div>
      )}

      <div className={styles.profilePage__card}>
        <div className={styles.profilePage__avatarSection}>
          <div className={styles.profilePage__avatar}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" />
            ) : (
              <span>{profile.firstName?.[0] || profile.email?.[0] || '?'}</span>
            )}
          </div>
          <label className={styles.profilePage__avatarLabel}>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className={styles.profilePage__avatarInput}
            />
            Đổi avatar
          </label>
        </div>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Họ:</strong> {profile.lastName}</p>
        <p><strong>Tên:</strong> {profile.firstName}</p>
        <p><strong>Số điện thoại:</strong> {profile.phone || '-'}</p>
        <div className={styles.profilePage__actions}>
          <button
            type="button"
            className={styles.profilePage__editButton}
            onClick={() => setEditModalOpen(true)}
          >
            Sửa thông tin
          </button>
          <button
            type="button"
            className={styles.profilePage__editButton}
            onClick={() => setPasswordModalOpen(true)}
          >
            Đổi mật khẩu
          </button>
        </div>
      </div>

      <Drawer open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Sửa thông tin">
        <form onSubmit={handleSaveProfile} className={styles.profilePage__form}>
          {error && (
            <div className={styles.profilePage__error} role="alert">{error}</div>
          )}
          <label className={styles.profilePage__label}>Họ</label>
          <input
            type="text"
            className={styles.profilePage__input}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <label className={styles.profilePage__label}>Tên</label>
          <input
            type="text"
            className={styles.profilePage__input}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <label className={styles.profilePage__label}>Số điện thoại</label>
          <input
            type="tel"
            className={styles.profilePage__input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className={styles.profilePage__formActions}>
            <button type="submit" className={styles.profilePage__submitButton} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={() => setEditModalOpen(false)}>Hủy</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Đổi mật khẩu">
        <form onSubmit={handleChangePassword} className={styles.profilePage__form}>
          {passwordError && (
            <div className={styles.profilePage__error} role="alert">{passwordError}</div>
          )}
          <label className={styles.profilePage__label}>Mật khẩu hiện tại</label>
          <input
            type="password"
            className={styles.profilePage__input}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <label className={styles.profilePage__label}>Mật khẩu mới</label>
          <input
            type="password"
            className={styles.profilePage__input}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <label className={styles.profilePage__label}>Xác nhận mật khẩu mới</label>
          <input
            type="password"
            className={styles.profilePage__input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
          <div className={styles.profilePage__formActions}>
            <button type="submit" className={styles.profilePage__submitButton} disabled={changingPassword}>
              {changingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
            <button type="button" onClick={() => setPasswordModalOpen(false)}>Hủy</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
