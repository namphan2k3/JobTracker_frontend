import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  resendInvite,
} from '../../../api/adminUsers';
import { getRoles } from '../../../api/adminRoles';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/AdminUserDetailPage.module.css';

export function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([getUserById(id), getRoles()])
      .then(([userData, rolesData]) => {
        setUser(userData);
        setFirstName(userData.firstName || '');
        setLastName(userData.lastName || '');
        setPhone(userData.phone || '');
        setRoleId(userData.roleId || '');
        setIsActive(userData.isActive !== false);
        setRoles(rolesData.filter((r) => r.isActive));
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải thông tin thất bại');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const data = await updateUser(id, {
        firstName,
        lastName,
        phone: phone || undefined,
        roleId: roleId || undefined,
        isActive,
      });
      setUser(data);
      setSuccess('Đã cập nhật.');
      setEditModalOpen(false);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || err.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Vô hiệu hóa user này?')) return;
    setActioning(true);
    try {
      await deleteUser(id);
      setUser((u) => (u ? { ...u, deletedAt: new Date().toISOString() } : null));
      setSuccess('Đã vô hiệu hóa.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Vô hiệu hóa thất bại');
    } finally {
      setActioning(false);
    }
  };

  const handleRestore = async () => {
    setActioning(true);
    try {
      await restoreUser(id);
      setUser((u) => (u ? { ...u, deletedAt: null } : null));
      setSuccess('Đã khôi phục.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Khôi phục thất bại');
    } finally {
      setActioning(false);
    }
  };

  const handleResendInvite = async () => {
    setActioning(true);
    try {
      await resendInvite(id);
      setSuccess('Đã gửi lại email mời.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gửi lại invite thất bại');
    } finally {
      setActioning(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.adminUserDetailPage}>
        <p className={styles.adminUserDetailPage__loading}>Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.adminUserDetailPage}>
        <p className={styles.adminUserDetailPage__error}>{error}</p>
      </div>
    );
  }

  const canResendInvite = !user.emailVerified && !user.deletedAt;

  return (
    <div className={styles.adminUserDetailPage}>
      <header className={styles.adminUserDetailPage__header}>
        <h1 className={styles.adminUserDetailPage__title}>Chi tiết user</h1>
      </header>

      {error && (
        <div className={styles.adminUserDetailPage__error} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.adminUserDetailPage__success}>{success}</div>
      )}

      <div className={styles.adminUserDetailPage__info}>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Vai trò:</strong> {user.roleName || '-'}
        </p>
        <p>
          <strong>Trạng thái:</strong>{' '}
          {user.deletedAt
            ? 'Đã vô hiệu'
            : user.emailVerified
              ? 'Đã xác thực'
              : 'Chờ xác thực'}
        </p>
        <p>
          <strong>Đăng nhập lần cuối:</strong>{' '}
          {user.lastLoginAt
            ? new Date(user.lastLoginAt).toLocaleString('vi-VN')
            : '-'}
        </p>
      </div>

      {canResendInvite && (
        <div className={styles.adminUserDetailPage__actions}>
          <button
            type="button"
            onClick={handleResendInvite}
            disabled={actioning}
          >
            {actioning ? 'Đang gửi...' : 'Gửi lại invite'}
          </button>
        </div>
      )}

      <button
        type="button"
        className={styles.adminUserDetailPage__editButton}
        onClick={() => setEditModalOpen(true)}
      >
        Chỉnh sửa
      </button>

      <Drawer open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Chỉnh sửa user">
        <form onSubmit={handleSave} className={styles.adminUserDetailPage__form}>
          {error && (
            <div className={styles.adminUserDetailPage__error} role="alert">{error}</div>
          )}
          <label className={styles.adminUserDetailPage__label}>Họ</label>
          <input
            type="text"
            className={styles.adminUserDetailPage__input}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <label className={styles.adminUserDetailPage__label}>Tên</label>
          <input
            type="text"
            className={styles.adminUserDetailPage__input}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <label className={styles.adminUserDetailPage__label}>Số điện thoại</label>
          <input
            type="tel"
            className={styles.adminUserDetailPage__input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <label className={styles.adminUserDetailPage__label}>Vai trò</label>
          <select
            className={styles.adminUserDetailPage__input}
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            <option value="">-- Chọn --</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <label className={styles.adminUserDetailPage__checkboxLabel}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Kích hoạt
          </label>
          <div className={styles.adminUserDetailPage__formActions}>
            <button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={() => setEditModalOpen(false)}>Hủy</button>
          </div>
        </form>
      </Drawer>

      <div className={styles.adminUserDetailPage__dangerZone}>
        {user.deletedAt ? (
          <button
            type="button"
            onClick={handleRestore}
            disabled={actioning}
          >
            {actioning ? 'Đang xử lý...' : 'Khôi phục user'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            disabled={actioning}
            className={styles.adminUserDetailPage__deleteButton}
          >
            {actioning ? 'Đang xử lý...' : 'Vô hiệu hóa'}
          </button>
        )}
      </div>
    </div>
  );
}
