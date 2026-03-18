import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getApplicationStatuses,
  createApplicationStatus,
  updateApplicationStatus,
  deleteApplicationStatus,
} from '../../../api/applicationStatuses';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/AdminApplicationStatusListPage.module.css';

const DEFAULT_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#EC4899'];

const STATUS_TYPE_OPTIONS = [
  { value: 'APPLIED', label: 'APPLIED – Mới nộp' },
  { value: 'SCREENING', label: 'SCREENING – Sàng lọc' },
  { value: 'INTERVIEW', label: 'INTERVIEW – Phỏng vấn' },
  { value: 'OFFER', label: 'OFFER – Đề nghị' },
  { value: 'HIRED', label: 'HIRED – Trúng tuyển' },
  { value: 'REJECTED', label: 'REJECTED – Từ chối' },
];

export function AdminApplicationStatusListPage() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState(DEFAULT_COLORS[0]);
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formStatusType, setFormStatusType] = useState('APPLIED');
  const [formIsTerminal, setFormIsTerminal] = useState(false);
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAutoSendEmail, setFormAutoSendEmail] = useState(false);
  const [formAskBeforeSend, setFormAskBeforeSend] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadStatuses = () => {
    setLoading(true);
    getApplicationStatuses()
      .then(setStatuses)
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách trạng thái thất bại');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const openCreateModal = () => {
    setFormName('');
    setFormDisplayName('');
    setFormDescription('');
    setFormColor(DEFAULT_COLORS[0]);
    setFormSortOrder((statuses.length || 0) + 1);
    setFormStatusType('APPLIED');
    setFormIsTerminal(false);
    setFormIsDefault(false);
    setFormIsActive(true);
    setFormAutoSendEmail(false);
    setFormAskBeforeSend(false);
    setError('');
    setCreateModalOpen(true);
  };

  const openEditModal = (s) => {
    setEditingStatus(s);
    setFormName(s.name || '');
    setFormDisplayName(s.displayName || '');
    setFormDescription(s.description || '');
    setFormColor(s.color || DEFAULT_COLORS[0]);
    setFormSortOrder(s.sortOrder ?? 1);
    setFormStatusType(s.statusType || 'APPLIED');
    setFormIsTerminal(Boolean(s.isTerminal));
    setFormIsDefault(Boolean(s.isDefault));
    setFormIsActive(s.isActive !== false);
    setFormAutoSendEmail(Boolean(s.autoSendEmail));
    setFormAskBeforeSend(Boolean(s.askBeforeSend));
    setError('');
    setEditModalOpen(true);
  };

  const closeModals = () => {
    setCreateModalOpen(false);
    setEditModalOpen(false);
    setEditingStatus(null);
    setDeleteConfirmId(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createApplicationStatus({
        name: formName.trim(),
        displayName: formDisplayName.trim(),
        description: formDescription.trim() || undefined,
        color: formColor || undefined,
        statusType: formStatusType,
        sortOrder: formSortOrder,
        isTerminal: formIsTerminal,
        isDefault: formIsDefault,
        isActive: formIsActive,
        autoSendEmail: formAutoSendEmail,
        askBeforeSend: formAskBeforeSend,
      });
      closeModals();
      loadStatuses();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tạo trạng thái thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingStatus) return;
    setSaving(true);
    setError('');
    try {
      await updateApplicationStatus(editingStatus.id, {
        displayName: formDisplayName.trim(),
        description: formDescription.trim() || undefined,
        color: formColor || undefined,
        statusType: formStatusType,
        sortOrder: formSortOrder,
        isTerminal: formIsTerminal,
        isDefault: formIsDefault,
        isActive: formIsActive,
        autoSendEmail: formAutoSendEmail,
        askBeforeSend: formAskBeforeSend,
      });
      closeModals();
      loadStatuses();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    setError('');
    try {
      await deleteApplicationStatus(id);
      closeModals();
      loadStatuses();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xóa trạng thái thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const sortedStatuses = [...statuses].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className={styles.adminApplicationStatusListPage}>
      <header className={styles.adminApplicationStatusListPage__header}>
        <h1 className={styles.adminApplicationStatusListPage__title}>Pipeline ứng tuyển</h1>
        <div className={styles.adminApplicationStatusListPage__actions}>
          <button type="button" className={styles.adminApplicationStatusListPage__createButton} onClick={openCreateModal}>
            Thêm trạng thái
          </button>
        </div>
      </header>

      {error && !createModalOpen && !editModalOpen && (
        <div className={styles.adminApplicationStatusListPage__error} role="alert">{error}</div>
      )}

      {loading ? (
        <p className={styles.adminApplicationStatusListPage__loading}>Đang tải...</p>
      ) : (
        <div className={styles.adminApplicationStatusListPage__tableWrap}>
          <table className={styles.adminApplicationStatusListPage__table}>
            <thead>
              <tr>
                <th>Thứ tự</th>
                <th>Tên</th>
                <th>Hiển thị</th>
                <th>Loại</th>
                <th>Màu</th>
                <th>Mô tả</th>
                <th>Đầu / cuối pipeline</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {sortedStatuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.adminApplicationStatusListPage__emptyCell}>
                    Chưa có trạng thái nào. Thêm trạng thái để tạo pipeline.
                  </td>
                </tr>
              ) : (
                sortedStatuses.map((s) => (
                  <tr key={s.id} className={s.deletedAt || s.isActive === false ? styles.adminApplicationStatusListPage__tableRowInactive : ''}>
                    <td>{s.sortOrder ?? '—'}</td>
                    <td>{s.name}</td>
                    <td>{s.displayName || s.name}</td>
                    <td>{s.statusType || '—'}</td>
                    <td>
                      <span className={styles.adminApplicationStatusListPage__colorBadge} style={{ backgroundColor: s.color || '#94a3b8' }} />
                      {s.color || '—'}
                    </td>
                    <td className={styles.adminApplicationStatusListPage__descCell}>{s.description || '—'}</td>
                    <td>
                      {s.isDefault ? 'Mặc định' : ''}
                      {s.isDefault && s.isTerminal ? ' · ' : ''}
                      {s.isTerminal ? 'Kết thúc' : ''}
                      {!s.isDefault && !s.isTerminal && '—'}
                    </td>
                    <td>{s.isActive !== false ? 'Hoạt động' : 'Tắt'}</td>
                    <td>
                      <button type="button" className={styles.adminApplicationStatusListPage__actionLink} onClick={() => openEditModal(s)}>Sửa</button>
                      {deleteConfirmId === s.id ? (
                        <>
                          <span className={styles.adminApplicationStatusListPage__confirmText}>Xóa?</span>
                          <button type="button" className={styles.adminApplicationStatusListPage__confirmYes} onClick={() => handleDelete(s.id)} disabled={deleting}>Có</button>
                          <button type="button" className={styles.adminApplicationStatusListPage__confirmNo} onClick={() => setDeleteConfirmId(null)}>Không</button>
                        </>
                      ) : (
                        <button type="button" className={styles.adminApplicationStatusListPage__actionLinkDanger} onClick={() => setDeleteConfirmId(s.id)}>Xóa</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={createModalOpen} onClose={closeModals} title="Thêm trạng thái">
        <form onSubmit={handleCreate} className={styles.adminApplicationStatusListPage__form}>
          {error && <div className={styles.adminApplicationStatusListPage__error} role="alert">{error}</div>}
          <label>Tên (code)</label>
          <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="VD: ON_HOLD" required />
          <label>Tên hiển thị</label>
          <input type="text" value={formDisplayName} onChange={(e) => setFormDisplayName(e.target.value)} placeholder="VD: Tạm hoãn" required />
          <label>Loại trạng thái (StatusType)</label>
          <select value={formStatusType} onChange={(e) => setFormStatusType(e.target.value)}>
            {STATUS_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <label>Mô tả (tùy chọn)</label>
          <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Mô tả trạng thái" rows={2} />
          <label>Màu</label>
          <div className={styles.adminApplicationStatusListPage__colorPicker}>
            {DEFAULT_COLORS.map((c) => (
              <button key={c} type="button" className={styles.adminApplicationStatusListPage__colorOption} style={{ backgroundColor: c }} onClick={() => setFormColor(c)} title={c} />
            ))}
            <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className={styles.adminApplicationStatusListPage__colorInput} />
          </div>
          <label>Thứ tự <span className={styles.adminApplicationStatusListPage__required}>*</span></label>
          <input type="number" min={1} value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value) || 1)} required />
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsDefault} onChange={(e) => setFormIsDefault(e.target.checked)} />
            Là trạng thái mặc định khi tạo application mới
          </label>
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsTerminal} onChange={(e) => setFormIsTerminal(e.target.checked)} />
            Là trạng thái kết thúc pipeline (terminal)
          </label>
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input
              type="checkbox"
              checked={formAutoSendEmail}
              onChange={(e) => setFormAutoSendEmail(e.target.checked)}
            />
            Tự động gửi email khi đổi sang trạng thái này
          </label>
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input
              type="checkbox"
              checked={formAskBeforeSend}
              onChange={(e) => setFormAskBeforeSend(e.target.checked)}
            />
            Hiện popup hỏi có gửi email không
          </label>
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
            Đang hoạt động
          </label>
          <div className={styles.adminApplicationStatusListPage__formActions}>
            <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo'}</button>
            <button type="button" onClick={closeModals}>Hủy</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={editModalOpen} onClose={closeModals} title="Sửa trạng thái">
        <form onSubmit={handleUpdate} className={styles.adminApplicationStatusListPage__form}>
          {error && <div className={styles.adminApplicationStatusListPage__error} role="alert">{error}</div>}
          <label>Tên (code)</label>
          <input type="text" value={formName} disabled title="Tên không thể sửa" />
          <label>Tên hiển thị</label>
          <input type="text" value={formDisplayName} onChange={(e) => setFormDisplayName(e.target.value)} placeholder="VD: Tạm hoãn" required />
          <label>Loại trạng thái (StatusType)</label>
          <select value={formStatusType} onChange={(e) => setFormStatusType(e.target.value)}>
            {STATUS_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <label>Mô tả (tùy chọn)</label>
          <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Mô tả trạng thái" rows={2} />
          <label>Màu</label>
          <div className={styles.adminApplicationStatusListPage__colorPicker}>
            {DEFAULT_COLORS.map((c) => (
              <button key={c} type="button" className={styles.adminApplicationStatusListPage__colorOption} style={{ backgroundColor: c }} onClick={() => setFormColor(c)} title={c} />
            ))}
            <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className={styles.adminApplicationStatusListPage__colorInput} />
          </div>
          <label>Thứ tự <span className={styles.adminApplicationStatusListPage__required}>*</span></label>
          <input type="number" min={1} value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value) || 1)} required />
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsDefault} onChange={(e) => setFormIsDefault(e.target.checked)} />
            Là trạng thái mặc định khi tạo application mới
          </label>
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsTerminal} onChange={(e) => setFormIsTerminal(e.target.checked)} />
            Là trạng thái kết thúc pipeline (terminal)
          </label>
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input
              type="checkbox"
              checked={formAutoSendEmail}
              onChange={(e) => setFormAutoSendEmail(e.target.checked)}
            />
            Tự động gửi email khi đổi sang trạng thái này (nếu API không override)
          </label>
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input
              type="checkbox"
              checked={formAskBeforeSend}
              onChange={(e) => setFormAskBeforeSend(e.target.checked)}
            />
            Hiện popup hỏi có gửi email không
          </label>
          <label className={styles.adminApplicationStatusListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
            Đang hoạt động
          </label>
          <div className={styles.adminApplicationStatusListPage__formActions}>
            <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
            <button type="button" onClick={closeModals}>Hủy</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
