import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
} from '../../../api/subscriptionPlans';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/SubscriptionPlanListPage.module.css';

function formatPrice(price) {
  if (price == null || price === 0) return 'Miễn phí';
  return `${Number(price).toLocaleString('vi-VN')} đ`;
}

function formatLimit(value) {
  if (value == null) return 'Không giới hạn';
  return value.toLocaleString('vi-VN');
}

export function SubscriptionPlanListPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDurationDays, setFormDurationDays] = useState('30');
  const [formMaxJobs, setFormMaxJobs] = useState('');
  const [formMaxUsers, setFormMaxUsers] = useState('');
  const [formMaxApplications, setFormMaxApplications] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const loadPlans = () => {
    setLoading(true);
    getSubscriptionPlans()
      .then(setPlans)
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách gói thất bại');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openCreate = () => {
    setFormCode('');
    setFormName('');
    setFormPrice('');
    setFormDurationDays('30');
    setFormMaxJobs('');
    setFormMaxUsers('');
    setFormMaxApplications('');
    setFormIsActive(true);
    setError('');
    setCreateOpen(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setFormCode(plan.code || '');
    setFormName(plan.name || '');
    setFormPrice(plan.price ?? '');
    setFormDurationDays(String(plan.durationDays ?? 30));
    setFormMaxJobs(plan.maxJobs ?? '');
    setFormMaxUsers(plan.maxUsers ?? '');
    setFormMaxApplications(plan.maxApplications ?? '');
    setFormIsActive(plan.isActive !== false);
    setError('');
    setEditOpen(true);
  };

  const closeModals = () => {
    setCreateOpen(false);
    setEditOpen(false);
    setEditingPlan(null);
    setDeleteConfirmId(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createSubscriptionPlan({
        code: formCode.trim(),
        name: formName.trim(),
        price: formPrice !== '' ? Number(formPrice) : 0,
        durationDays: formDurationDays ? Number(formDurationDays) : 30,
        maxJobs: formMaxJobs !== '' ? Number(formMaxJobs) : null,
        maxUsers: formMaxUsers !== '' ? Number(formMaxUsers) : null,
        maxApplications: formMaxApplications !== '' ? Number(formMaxApplications) : null,
        isActive: formIsActive,
      });
      closeModals();
      loadPlans();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tạo gói thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSaving(true);
    setError('');
    try {
      await updateSubscriptionPlan(editingPlan.id, {
        name: formName.trim(),
        price: formPrice !== '' ? Number(formPrice) : 0,
        durationDays: formDurationDays ? Number(formDurationDays) : 30,
        maxJobs: formMaxJobs !== '' ? Number(formMaxJobs) : null,
        maxUsers: formMaxUsers !== '' ? Number(formMaxUsers) : null,
        maxApplications: formMaxApplications !== '' ? Number(formMaxApplications) : null,
        isActive: formIsActive,
      });
      closeModals();
      loadPlans();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật gói thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    setError('');
    try {
      await deleteSubscriptionPlan(id);
      closeModals();
      loadPlans();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xóa gói thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.subscriptionPlanListPage}>
      <header className={styles.subscriptionPlanListPage__header}>
        <h1 className={styles.subscriptionPlanListPage__title}>Quản lý gói subscription</h1>
        <div className={styles.subscriptionPlanListPage__actions}>
          <button type="button" className={styles.subscriptionPlanListPage__createButton} onClick={openCreate}>
            Thêm gói
          </button>
        </div>
      </header>

      {error && !createOpen && !editOpen && (
        <div className={styles.subscriptionPlanListPage__error} role="alert">{error}</div>
      )}

      {loading ? (
        <p className={styles.subscriptionPlanListPage__loading}>Đang tải...</p>
      ) : (
        <div className={styles.subscriptionPlanListPage__tableWrap}>
          <table className={styles.subscriptionPlanListPage__table}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Giá</th>
                <th>Thời hạn</th>
                <th>Jobs</th>
                <th>Users</th>
                <th>Applications</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.subscriptionPlanListPage__emptyCell}>Chưa có gói nào</td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className={p.isActive === false ? styles.subscriptionPlanListPage__rowInactive : ''}>
                    <td>{p.code || '—'}</td>
                    <td>{p.name || '—'}</td>
                    <td>{formatPrice(p.price)}</td>
                    <td>{p.durationDays ? `${p.durationDays} ngày` : '—'}</td>
                    <td>{formatLimit(p.maxJobs)}</td>
                    <td>{formatLimit(p.maxUsers)}</td>
                    <td>{formatLimit(p.maxApplications)}</td>
                    <td>{p.isActive !== false ? 'Hoạt động' : 'Tắt'}</td>
                    <td>
                      <button type="button" className={styles.subscriptionPlanListPage__actionLink} onClick={() => openEdit(p)}>Sửa</button>
                      {deleteConfirmId === p.id ? (
                        <>
                          <span className={styles.subscriptionPlanListPage__confirmText}>Xóa?</span>
                          <button type="button" className={styles.subscriptionPlanListPage__confirmYes} onClick={() => handleDelete(p.id)} disabled={deleting}>Có</button>
                          <button type="button" className={styles.subscriptionPlanListPage__confirmNo} onClick={() => setDeleteConfirmId(null)}>Không</button>
                        </>
                      ) : (
                        <button type="button" className={styles.subscriptionPlanListPage__actionLinkDanger} onClick={() => setDeleteConfirmId(p.id)}>Xóa</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={createOpen} onClose={closeModals} title="Thêm gói">
        <form onSubmit={handleCreate} className={styles.subscriptionPlanListPage__form}>
          {error && <div className={styles.subscriptionPlanListPage__error} role="alert">{error}</div>}
          <label>Mã (code)</label>
          <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="VD: PRO, BASIC" required />
          <label>Tên</label>
          <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="VD: Pro" required />
          <label>Giá (VNĐ) <span className={styles.subscriptionPlanListPage__required}>*</span></label>
          <input type="number" min="0" step="1000" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="0 = Miễn phí" required />
          <label>Thời hạn (ngày) <span className={styles.subscriptionPlanListPage__required}>*</span></label>
          <input type="number" min="1" value={formDurationDays} onChange={(e) => setFormDurationDays(e.target.value)} required />
          <label>Max Jobs (để trống = không giới hạn)</label>
          <input type="number" min="0" value={formMaxJobs} onChange={(e) => setFormMaxJobs(e.target.value)} placeholder="Không giới hạn" />
          <label>Max Users</label>
          <input type="number" min="0" value={formMaxUsers} onChange={(e) => setFormMaxUsers(e.target.value)} placeholder="Không giới hạn" />
          <label>Max Applications</label>
          <input type="number" min="0" value={formMaxApplications} onChange={(e) => setFormMaxApplications(e.target.value)} placeholder="Không giới hạn" />
          <label className={styles.subscriptionPlanListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
            Đang hoạt động
          </label>
          <div className={styles.subscriptionPlanListPage__formActions}>
            <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo'}</button>
            <button type="button" onClick={closeModals}>Hủy</button>
          </div>
        </form>
      </Drawer>

      <Drawer open={editOpen} onClose={closeModals} title="Sửa gói">
        <form onSubmit={handleUpdate} className={styles.subscriptionPlanListPage__form}>
          {error && <div className={styles.subscriptionPlanListPage__error} role="alert">{error}</div>}
          <label>Mã (code)</label>
          <input type="text" value={formCode} disabled title="Mã không thể sửa" />
          <label>Tên</label>
          <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required />
          <label>Giá (VNĐ) <span className={styles.subscriptionPlanListPage__required}>*</span></label>
          <input type="number" min="0" step="1000" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} required />
          <label>Thời hạn (ngày) <span className={styles.subscriptionPlanListPage__required}>*</span></label>
          <input type="number" min="1" value={formDurationDays} onChange={(e) => setFormDurationDays(e.target.value)} required />
          <label>Max Jobs</label>
          <input type="number" min="0" value={formMaxJobs} onChange={(e) => setFormMaxJobs(e.target.value)} placeholder="Không giới hạn" />
          <label>Max Users</label>
          <input type="number" min="0" value={formMaxUsers} onChange={(e) => setFormMaxUsers(e.target.value)} placeholder="Không giới hạn" />
          <label>Max Applications</label>
          <input type="number" min="0" value={formMaxApplications} onChange={(e) => setFormMaxApplications(e.target.value)} placeholder="Không giới hạn" />
          <label className={styles.subscriptionPlanListPage__checkboxLabel}>
            <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
            Đang hoạt động
          </label>
          <div className={styles.subscriptionPlanListPage__formActions}>
            <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
            <button type="button" onClick={closeModals}>Hủy</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
