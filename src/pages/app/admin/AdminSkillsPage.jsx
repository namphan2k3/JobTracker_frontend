import { useState, useEffect } from 'react';
import {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
} from '../../../api/skills';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/AdminSkillsPage.module.css';
import { usePermissions } from '../../../hooks/usePermissions';

const SKILL_CATEGORIES = [
  { value: '', label: '-- Tất cả danh mục --' },
  { value: 'PROGRAMMING', label: 'Programming' },
  { value: 'FRAMEWORK', label: 'Framework' },
  { value: 'DATABASE', label: 'Database' },
  { value: 'TOOL', label: 'Tool' },
  { value: 'LANGUAGE', label: 'Language' },
  { value: 'SOFT_SKILL', label: 'Soft Skill' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_OPTIONS = SKILL_CATEGORIES.filter((c) => c.value);

export function AdminSkillsPage() {
  const { hasPermission } = usePermissions();
  const canManageSkills = hasPermission('SKILL_CREATE') || hasPermission('SKILL_UPDATE') || hasPermission('SKILL_DELETE');

  const [skills, setSkills] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(0);
  const size = 20;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('PROGRAMMING');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSkills({
      page,
      size,
      search: searchQuery || undefined,
      category: categoryFilter || undefined,
      sort: 'name,asc',
    })
      .then(({ skills: list, pagination: p }) => {
        setSkills(list);
        setPagination(p);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách skills thất bại');
      })
      .finally(() => setLoading(false));
  }, [page, searchQuery, categoryFilter]);

  const resetForm = () => {
    setFormName('');
    setFormCategory('PROGRAMMING');
    setFormDescription('');
    setFormIsActive(true);
    setError('');
  };

  const openCreateModal = () => {
    if (!canManageSkills) return;
    resetForm();
    setCreateModalOpen(true);
  };

  const openEditModal = (skill) => {
    if (!canManageSkills) return;
    setEditingSkill(skill);
    setFormName(skill.name || '');
    setFormCategory(skill.category || 'PROGRAMMING');
    setFormDescription(skill.description || '');
    setFormIsActive(skill.isActive !== false);
    setError('');
    setEditModalOpen(true);
  };

  const closeModals = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setEditingSkill(null);
    setDeleteConfirmId(null);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(0);
  };

  const refreshList = () => {
    setLoading(true);
    getSkills({
      page,
      size,
      search: searchQuery || undefined,
      category: categoryFilter || undefined,
      sort: 'name,asc',
    })
      .then(({ skills: list, pagination: p }) => {
        setSkills(list);
        setPagination(p);
      })
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    if (!canManageSkills) return;
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createSkill({
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim() || undefined,
        isActive: formIsActive,
      });
      closeModals();
      setPage(0);
      setLoading(true);
      getSkills({
        page: 0,
        size,
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        sort: 'name,asc',
      })
        .then(({ skills: list, pagination: p }) => {
          setSkills(list);
          setPagination(p);
        })
        .finally(() => setLoading(false));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tạo skill thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    if (!canManageSkills) return;
    e.preventDefault();
    if (!editingSkill) return;
    setSaving(true);
    setError('');
    try {
      await updateSkill(editingSkill.id, {
        name: formName.trim(),
        category: formCategory,
        description: formDescription.trim() || undefined,
        isActive: formIsActive,
      });
      closeModals();
      refreshList();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật skill thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManageSkills) return;
    setDeleting(true);
    setError('');
    try {
      await deleteSkill(id);
      closeModals();
      refreshList();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xóa skill thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.adminSkillsPage}>
      <header className={styles.adminSkillsPage__header}>
        <h1 className={styles.adminSkillsPage__title}>Quản lý kỹ năng</h1>
        {canManageSkills && (
          <button
            type="button"
            className={styles.adminSkillsPage__createButton}
            onClick={openCreateModal}
          >
            Thêm kỹ năng
          </button>
        )}
      </header>

      <form onSubmit={handleSearch} className={styles.adminSkillsPage__searchForm}>
        <input
          type="search"
          className={styles.adminSkillsPage__searchInput}
          placeholder="Tìm theo tên..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className={styles.adminSkillsPage__categorySelect}
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(0);
          }}
        >
          {SKILL_CATEGORIES.map((c) => (
            <option key={c.value || 'all'} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.adminSkillsPage__searchButton}>
          Tìm
        </button>
      </form>

      {error && (
        <div className={styles.adminSkillsPage__error} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.adminSkillsPage__loading}>Đang tải...</p>
      ) : (
        <>
          <div className={styles.adminSkillsPage__tableWrap}>
            <table className={styles.adminSkillsPage__table}>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Danh mục</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {skills.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.adminSkillsPage__emptyCell}>
                      Chưa có kỹ năng nào
                    </td>
                  </tr>
                ) : (
                  skills.map((s) => (
                    <tr
                      key={s.id}
                      className={
                        s.deletedAt || s.isActive === false
                          ? styles.adminSkillsPage__tableRowInactive
                          : ''
                      }
                    >
                      <td>{s.name}</td>
                      <td>{s.category || '—'}</td>
                      <td className={styles.adminSkillsPage__descCell}>
                        {s.description
                          ? `${s.description.slice(0, 50)}${s.description.length > 50 ? '…' : ''}`
                          : '—'}
                      </td>
                      <td>{s.isActive !== false ? 'Hoạt động' : 'Tắt'}</td>
                      <td>
                        {canManageSkills ? (
                          <>
                            <button
                              type="button"
                              className={styles.adminSkillsPage__actionLink}
                              onClick={() => openEditModal(s)}
                            >
                              Sửa
                            </button>
                            {deleteConfirmId === s.id ? (
                              <>
                                <span className={styles.adminSkillsPage__confirmText}>
                                  Xóa?
                                </span>
                                <button
                                  type="button"
                                  className={styles.adminSkillsPage__confirmYes}
                                  onClick={() => handleDelete(s.id)}
                                  disabled={deleting}
                                >
                                  Có
                                </button>
                                <button
                                  type="button"
                                  className={styles.adminSkillsPage__confirmNo}
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  Không
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className={styles.adminSkillsPage__actionLinkDanger}
                                onClick={() => setDeleteConfirmId(s.id)}
                              >
                                Xóa
                              </button>
                            )}
                          </>
                        ) : (
                          <span className={styles.adminSkillsPage__readOnlyHint}>Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.adminSkillsPage__pagination}>
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Trang trước
              </button>
              <span>
                Trang {page + 1} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </button>
            </div>
          )}
        </>
      )}

      <Drawer open={createModalOpen} onClose={closeModals} title="Thêm kỹ năng">
        <form onSubmit={handleCreate} className={styles.adminSkillsPage__form}>
          {error && (
            <div className={styles.adminSkillsPage__error} role="alert">
              {error}
            </div>
          )}
          <label>Tên</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="VD: Java, React"
            required
          />
          <label>Danh mục <span className={styles.adminSkillsPage__required}>*</span></label>
          <select
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            required
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label>Mô tả (tùy chọn)</label>
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Mô tả ngắn về kỹ năng"
            rows={3}
          />
          <div className={styles.adminSkillsPage__formActions}>
            <button type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Tạo'}
            </button>
            <button type="button" onClick={closeModals}>
              Hủy
            </button>
          </div>
        </form>
      </Drawer>

      <Drawer open={editModalOpen} onClose={closeModals} title="Sửa kỹ năng">
        <form onSubmit={handleUpdate} className={styles.adminSkillsPage__form}>
          {error && (
            <div className={styles.adminSkillsPage__error} role="alert">
              {error}
            </div>
          )}
          <label>Tên</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="VD: Java, React"
            required
          />
          <label>Danh mục <span className={styles.adminSkillsPage__required}>*</span></label>
          <select
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            required
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label>Mô tả (tùy chọn)</label>
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Mô tả ngắn về kỹ năng"
            rows={3}
          />
          <label className={styles.adminSkillsPage__checkboxLabel}>
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
            />
            Đang hoạt động
          </label>
          <div className={styles.adminSkillsPage__formActions}>
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
