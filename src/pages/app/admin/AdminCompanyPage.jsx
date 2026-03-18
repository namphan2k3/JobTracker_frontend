import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import {
  getCompanyById,
  updateCompany,
  verifyCompany,
} from '../../../api/companies';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/AdminCompanyPage.module.css';

const COMPANY_SIZE_OPTIONS = [
  { value: '', label: '-- Chọn quy mô --' },
  { value: 'STARTUP', label: 'Startup' },
  { value: 'SMALL', label: 'Nhỏ (< 50)' },
  { value: 'MEDIUM', label: 'Vừa (50-200)' },
  { value: 'LARGE', label: 'Lớn (200-1000)' },
  { value: 'ENTERPRISE', label: 'Enterprise (1000+)' },
];

export function AdminCompanyPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId;

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const isSystemAdmin = user?.roleName === 'SYSTEM_ADMIN';

  useEffect(() => {
    if (!companyId) {
      setError('Không tìm thấy thông tin công ty.');
      setLoading(false);
      return;
    }

    getCompanyById(companyId)
      .then((data) => {
        setCompany(data);
        setWebsite(data.website || '');
        setIndustry(data.industry || '');
        setSize(data.size || '');
        setLocation(data.location || '');
        setDescription(data.description || '');
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải thông tin công ty thất bại');
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const data = await updateCompany(companyId, {
        website: website || undefined,
        industry: industry || undefined,
        size: size || undefined,
        location: location || undefined,
        description: description || undefined,
      });
      setCompany(data);
      setSuccess('Đã cập nhật.');
      setEditModalOpen(false);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || err.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (isVerified) => {
    setError('');
    setSuccess('');
    setVerifying(true);

    try {
      const data = await verifyCompany(companyId, { isVerified });
      setCompany(data);
      setSuccess(isVerified ? 'Đã xác thực công ty.' : 'Đã bỏ xác thực.');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || err.message || 'Cập nhật verified thất bại');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.adminCompanyPage}>
        <p className={styles.adminCompanyPage__loading}>Đang tải...</p>
      </div>
    );
  }

  if (!companyId || !company) {
    return (
      <div className={styles.adminCompanyPage}>
        <h1 className={styles.adminCompanyPage__title}>Thông tin công ty</h1>
        <div className={styles.adminCompanyPage__error} role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminCompanyPage}>
      <header className={styles.adminCompanyPage__header}>
        <h1 className={styles.adminCompanyPage__title}>Thông tin công ty</h1>
      </header>

      {error && (
        <div className={styles.adminCompanyPage__error} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.adminCompanyPage__success}>{success}</div>
      )}

      <div className={styles.adminCompanyPage__info}>
        <p>
          <strong>Tên:</strong> {company.name}
        </p>
        <p>
          <strong>Trạng thái:</strong>{' '}
          {company.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
        </p>
        {company.deletedAt && (
          <p className={styles.adminCompanyPage__deleted}>
            Đã bị xóa: {new Date(company.deletedAt).toLocaleString('vi-VN')}
          </p>
        )}
      </div>

      {isSystemAdmin && (
        <div className={styles.adminCompanyPage__verifySection}>
          <h2 className={styles.adminCompanyPage__sectionTitle}>
            Xác thực công ty (System Admin)
          </h2>
          <div className={styles.adminCompanyPage__verifyActions}>
            <button
              type="button"
              onClick={() => handleVerify(true)}
              disabled={verifying || company.isVerified}
            >
              {verifying ? 'Đang xử lý...' : 'Đánh dấu đã xác thực'}
            </button>
            <button
              type="button"
              onClick={() => handleVerify(false)}
              disabled={verifying || !company.isVerified}
              className={styles.adminCompanyPage__unverifyButton}
            >
              Bỏ xác thực
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={styles.adminCompanyPage__editButton}
        onClick={() => setEditModalOpen(true)}
      >
        Chỉnh sửa
      </button>

      <Drawer
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Chỉnh sửa thông tin công ty"
      >
        <form onSubmit={handleSave} className={styles.adminCompanyPage__form}>
          {error && (
            <div className={styles.adminCompanyPage__error} role="alert">
              {error}
            </div>
          )}
          <label className={styles.adminCompanyPage__label}>Website</label>
          <input
            type="url"
            className={styles.adminCompanyPage__input}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
          />
          <label className={styles.adminCompanyPage__label}>Lĩnh vực</label>
          <input
            type="text"
            className={styles.adminCompanyPage__input}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Technology, E-commerce, ..."
          />
          <label className={styles.adminCompanyPage__label}>Quy mô</label>
          <select
            className={styles.adminCompanyPage__input}
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            {COMPANY_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value || 'empty'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className={styles.adminCompanyPage__label}>Địa chỉ</label>
          <input
            type="text"
            className={styles.adminCompanyPage__input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <label className={styles.adminCompanyPage__label}>Mô tả</label>
          <textarea
            className={styles.adminCompanyPage__textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <div className={styles.adminCompanyPage__formActions}>
            <button
              type="submit"
              className={styles.adminCompanyPage__submitButton}
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button
              type="button"
              className={styles.adminCompanyPage__cancelButton}
              onClick={() => setEditModalOpen(false)}
            >
              Hủy
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
