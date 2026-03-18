import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
} from '../../../api/permissions';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/PermissionListPage.module.css';

const ACTION_OPTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE'];

export function PermissionListPage() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formResource, setFormResource] = useState('');
  const [formAction, setFormAction] = useState('READ');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPermissions = () => {
    setLoading(true);
    getPermissions()
      .then(setPermissions)
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách permissions thất bại');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const openCreateModal = () => {
    setFormName('');
    setFormResource('');
    setFormAction('READ');
    setFormDescription('');
    setFormIsActive(true);
    setError('');
    setCreateModalOpen(true);
  };

  const openEditModal = (perm) => {
    setEditingPermission(perm);
    setFormName(perm.name || '');
    setFormResource(perm.resource || '');
    setFormAction(perm.action || 'READ');
    setFormDescription(perm.description || '');
    setFormIsActive(perm.isActive !== false);
    setError('');
    setEditModalOpen(true);
  };

  const closeModals = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setEditingPermission(null);
    setDeleteConfirmId(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createPermission({
        name: formName.trim(),
        resource: formResource.trim(),
        action: formAction,
        description: formDescription.trim() || undefined,
        isActive: formIsActive,
      });
      closeModals();
      loadPermissions();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tạo permission thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingPermission) return;
    setSaving(true);
    setError('');
    try {
      await updatePermission(editingPermission.id, {
        description: formDescription.trim() || undefined,
        isActive: formIsActive,
      });
      closeModals();
      loadPermissions();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật permission thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    setError('');
    try {
      await deletePermission(id);
      closeModals();
      loadPermissions();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xóa permission thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.permissionListPage}>
      <header className={styles.permissionListPage__header}>
        <h1 className={styles.permissionListPage__title}>Quản lý quyền</h1>
        <div className={styles.permissionListPage__actions}>
          <button type="button" className={styles.permissionListPage__createButton} onClick={openCreateModal}>
            Thêm quyền
          </button>
        </div>
      </header>

      {error && !createModalOpen && !editModalOpen && (
        <div className={styles.permissionListPage__error} role="alert">{error}</div>
      )}

      {loading ? (
        <p className={styles.permissionListPage__loading}>Đang tải...</p>
      ) : (
        <div className={styles.permissionListPage__tableWrap}>
          <table className={styles.permissionListPage__table}>
            <thead>
              <tr>
                <th>Tên</th>
                <th>Resource</th>
                <th>Action</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {permissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.permissionListPage__emptyCell}>Chưa có quyền nào</td>
                </tr>
              ) : (
                permissions.map((p) => (
                  <tr key={p.id} className={p.deletedAt || p.isActive === false ? styles.permissionListPage__tableRowInactive : ''}>
                    <td>{p.name}</td>
                    <td>{p.resource || '—'}</td>
                    <td>{p.action || '—'}</td>
                    <td className={styles.permissionListPage__descCell}>{p.description || '—'}</td>
                    <td>{p.isActive !== false ? 'Hoạt động' : 'Tắt'}</td>
                    <td>
                      <button type="button" className={styles.permissionListPage__actionLink} onClick={() => openEditModal(p)}>Sửa</button>
                      {deleteConfirmId === p.id ? (
                        <>
                          <span className={styles.permissionListPage__confirmText}>Xóa?</span>
                          <button type="button" className={styles.permissionListPage__confirmYes} onClick={() => handleDelete(p.id)} disabled={deleting}>Có</button>
                          <button type="button" className={styles.permissionListPage__confirmNo} onClick={() => setDeleteConfirmId(null)}>Không</button>
                        </>
                      ) : (
                        <button type="button" className={styles.permissionListPage__actionLinkDanger} onClick={() => setDeleteConfirmId(p.id)}>Xóa</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={createModalOpen} onClose={closeModals} title="Thêm quyền">
        <form onSubmit={handleCreate} className={styles.permissionListPage__form}>
          {error && <div className={styles.permissionListPage__error} role="alert">{error}</div>}
          <label>Tên</label>
          <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="VD: JOB_READ" required />
          <label>Resource</label>
          <input type="text" value={formResource} onChange={(e) => setFormResource(e.target.value)} placeholder="VD: JOB, USER" required />
          <label>Action <span className={styles.permissionListPage__required}>*</span></label>
          <select value={formAction} onChange={(e) => setFormAction(e.target.value)} required>
            {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <label>Mô tả (tùy chọn)</label>
          <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Mô tả quyền" rows={2} />
          <label className={styles.permissionListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
            Đang hoạt động
          </label>
          <div className={styles.permissionListPage__formActions}>
            <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo'}</button>
            <button type="button" onClick={closeModals}>Hủy</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={editModalOpen} onClose={closeModals} title="Sửa quyền">
        <form onSubmit={handleUpdate} className={styles.permissionListPage__form}>
          {error && <div className={styles.permissionListPage__error} role="alert">{error}</div>}
          <label>Tên</label>
          <input type="text" value={formName} disabled title="Tên không thể sửa" />
          <label>Resource</label>
          <input type="text" value={formResource} disabled title="Resource không thể sửa" />
          <label>Action</label>
          <input type="text" value={formAction} disabled title="Action không thể sửa" />
          <label>Mô tả (tùy chọn)</label>
          <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Mô tả quyền" rows={2} />
          <label className={styles.permissionListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
            Đang hoạt động
          </label>
          <div className={styles.permissionListPage__formActions}>
            <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
            <button type="button" onClick={closeModals}>Hủy</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
