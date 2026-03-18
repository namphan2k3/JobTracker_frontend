import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEmailTemplates, deleteEmailTemplate } from '../../../api/emailTemplates';
import styles from '../../../styles/components/AdminEmailTemplateListPage.module.css';

export function AdminEmailTemplateListPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = () => {
    setLoading(true);
    getEmailTemplates()
      .then(setTemplates)
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách template thất bại');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = async (id) => {
    setDeleting(true);
    setError('');
    try {
      await deleteEmailTemplate(id);
      setDeleteConfirmId(null);
      loadTemplates();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xóa template thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.adminEmailTemplateListPage}>
      <header className={styles.adminEmailTemplateListPage__header}>
        <h1 className={styles.adminEmailTemplateListPage__title}>Email templates</h1>
        <div className={styles.adminEmailTemplateListPage__actions}>
          <Link to="/app/admin/email-templates/new" className={styles.adminEmailTemplateListPage__createButton}>
            Thêm template
          </Link>
        </div>
      </header>

      {error && (
        <div className={styles.adminEmailTemplateListPage__error} role="alert">{error}</div>
      )}

      {loading ? (
        <p className={styles.adminEmailTemplateListPage__loading}>Đang tải...</p>
      ) : (
        <div className={styles.adminEmailTemplateListPage__tableWrap}>
          <table className={styles.adminEmailTemplateListPage__table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Tên</th>
                <th>Subject</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.adminEmailTemplateListPage__emptyCell}>Chưa có template nào</td>
                </tr>
              ) : (
                templates.map((t) => (
                  <tr key={t.id} className={t.isActive === false ? styles.adminEmailTemplateListPage__tableRowInactive : ''}>
                    <td>{t.code}</td>
                    <td>{t.name}</td>
                    <td className={styles.adminEmailTemplateListPage__subjectCell}>{t.subject || '—'}</td>
                    <td>{t.isActive !== false ? 'Hoạt động' : 'Tắt'}</td>
                    <td>
                      <Link to={`/app/admin/email-templates/${t.id}`} className={styles.adminEmailTemplateListPage__actionLink}>Sửa</Link>
                      {t.companyId != null && (
                        deleteConfirmId === t.id ? (
                          <>
                            <span className={styles.adminEmailTemplateListPage__confirmText}>Xóa?</span>
                            <button type="button" className={styles.adminEmailTemplateListPage__confirmYes} onClick={() => handleDelete(t.id)} disabled={deleting}>Có</button>
                            <button type="button" className={styles.adminEmailTemplateListPage__confirmNo} onClick={() => setDeleteConfirmId(null)}>Không</button>
                          </>
                        ) : (
                          <button type="button" className={styles.adminEmailTemplateListPage__actionLinkDanger} onClick={() => setDeleteConfirmId(t.id)}>Xóa</button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
