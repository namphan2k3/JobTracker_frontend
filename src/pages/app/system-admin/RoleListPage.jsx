import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
} from '../../../api/adminRoles';
import { getPermissions } from '../../../api/permissions';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/RoleListPage.module.css';

export function RoleListPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [permsModalOpen, setPermsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [permsRole, setPermsRole] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [allPermissions, setAllPermissions] = useState([]);
  const [rolePermissionIds, setRolePermissionIds] = useState(new Set());
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadRoles = () => {
    setLoading(true);
    getRoles()
      .then(setRoles)
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách roles thất bại');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const openCreateModal = () => {
    setFormName('');
    setFormDescription('');
    setFormIsActive(true);
    setError('');
    setCreateModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setFormName(role.name || '');
    setFormDescription(role.description || '');
    setFormIsActive(role.isActive !== false);
    setError('');
    setEditModalOpen(true);
  };

  const openPermsModal = async (role) => {
    setPermsRole(role);
    setError('');
    setPermsModalOpen(true);
    try {
      const [rolePerms, perms] = await Promise.all([
        getRolePermissions(role.id),
        getPermissions(),
      ]);
      setAllPermissions(perms);
      const ids = new Set(
        (rolePerms || []).map((p) => p.permissionId || p.id)
      );
      setRolePermissionIds(ids);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tải permissions thất bại');
    }
  };

  const closeModals = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setPermsModalOpen(false);
    setEditingRole(null);
    setPermsRole(null);
    setDeleteConfirmId(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createRole({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        isActive: formIsActive,
      });
      closeModals();
      loadRoles();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tạo role thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingRole) return;
    setSaving(true);
    setError('');
    try {
      await updateRole(editingRole.id, {
        description: formDescription.trim() || undefined,
        isActive: formIsActive,
      });
      closeModals();
      loadRoles();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật role thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    setError('');
    try {
      await deleteRole(id);
      closeModals();
      loadRoles();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xóa role thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const togglePermission = (permId) => {
    setRolePermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    if (!permsRole) return;
    setSaving(true);
    setError('');
    try {
      await updateRolePermissions(permsRole.id, {
        permissionIds: Array.from(rolePermissionIds),
      });
      closeModals();
      loadRoles();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật permissions thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.roleListPage}>
      <header className={styles.roleListPage__header}>
        <h1 className={styles.roleListPage__title}>Quản lý vai trò</h1>
        <div className={styles.roleListPage__actions}>
          <button
            type="button"
            className={styles.roleListPage__createButton}
            onClick={openCreateModal}
          >
            Thêm vai trò
          </button>
        </div>
      </header>

      {error && !createModalOpen && !editModalOpen && !permsModalOpen && (
        <div className={styles.roleListPage__error} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.roleListPage__loading}>Đang tải...</p>
      ) : (
        <div className={styles.roleListPage__tableWrap}>
          <table className={styles.roleListPage__table}>
            <thead>
              <tr>
                <th>Tên</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.roleListPage__emptyCell}>
                    Chưa có vai trò nào
                  </td>
                </tr>
              ) : (
                roles.map((r) => (
                  <tr
                    key={r.id}
                    className={
                      r.deletedAt || r.isActive === false
                        ? styles.roleListPage__tableRowInactive
                        : ''
                    }
                  >
                    <td>{r.name}</td>
                    <td className={styles.roleListPage__descCell}>
                      {r.description || '—'}
                    </td>
                    <td>{r.isActive !== false ? 'Hoạt động' : 'Tắt'}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.roleListPage__actionLink}
                        onClick={() => openPermsModal(r)}
                      >
                        Phân quyền
                      </button>
                      <button
                        type="button"
                        className={styles.roleListPage__actionLink}
                        onClick={() => openEditModal(r)}
                      >
                        Sửa
                      </button>
                      {deleteConfirmId === r.id ? (
                        <>
                          <span className={styles.roleListPage__confirmText}>
                            Xóa?
                          </span>
                          <button
                            type="button"
                            className={styles.roleListPage__confirmYes}
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting}
                          >
                            Có
                          </button>
                          <button
                            type="button"
                            className={styles.roleListPage__confirmNo}
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Không
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={styles.roleListPage__actionLinkDanger}
                          onClick={() => setDeleteConfirmId(r.id)}
                        >
                          Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={createModalOpen} onClose={closeModals} title="Thêm vai trò">
        <form onSubmit={handleCreate} className={styles.roleListPage__form}>
          {error && (
            <div className={styles.roleListPage__error} role="alert">
              {error}
            </div>
          )}
          <label>Tên</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="VD: RECRUITER"
            required
          />
          <label>Mô tả (tùy chọn)</label>
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Mô tả vai trò"
            rows={3}
          />
          <label className={styles.roleListPage__checkboxLabel}>
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
            />
            Đang hoạt động
          </label>
          <div className={styles.roleListPage__formActions}>
            <button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Tạo'}
            </button>
            <button type="button" onClick={closeModals}>
              Hủy
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer open={editModalOpen} onClose={closeModals} title="Sửa vai trò">
        <form onSubmit={handleUpdate} className={styles.roleListPage__form}>
          {error && (
            <div className={styles.roleListPage__error} role="alert">
              {error}
            </div>
          )}
          <label>Tên</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            disabled
            title="Tên role không thể sửa"
          />
          <label>Mô tả (tùy chọn)</label>
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Mô tả vai trò"
            rows={3}
          />
          <label className={styles.roleListPage__checkboxLabel}>
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
            />
            Đang hoạt động
          </label>
          <div className={styles.roleListPage__formActions}>
            <button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={closeModals}>
              Hủy
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={permsModalOpen}
        onClose={closeModals}
        title={permsRole ? `Phân quyền: ${permsRole.name}` : 'Phân quyền'}
      >
        <form onSubmit={handleSavePermissions} className={styles.roleListPage__form}>
          {error && (
            <div className={styles.roleListPage__error} role="alert">
              {error}
            </div>
          )}
          <div className={styles.roleListPage__permsList}>
            {allPermissions.map((p) => (
              <label key={p.id} className={styles.roleListPage__permItem}>
                <input
                  type="checkbox"
                  checked={rolePermissionIds.has(p.id)}
                  onChange={() => togglePermission(p.id)}
                />
                <span>{p.name}</span>
                {p.description && (
                  <span className={styles.roleListPage__permDesc}>
                    — {p.description}
                  </span>
                )}
              </label>
            ))}
          </div>
          {allPermissions.length === 0 && (
            <p className={styles.roleListPage__emptyPerms}>Chưa có permission nào.</p>
          )}
          <div className={styles.roleListPage__formActions}>
            <button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={closeModals}>
              Hủy
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
