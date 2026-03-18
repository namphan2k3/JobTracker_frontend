import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { getCompanies } from '../../../api/companies';
import styles from '../../../styles/components/AdminUserListPage.module.css';

export function AdminCompanyListPage() {
  const user = useAuthStore((s) => s.user);
  const isSystemAdmin = user?.roleName === 'SYSTEM_ADMIN';

  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const size = 20;

  useEffect(() => {
    if (!isSystemAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getCompanies({ page, size, search: searchQuery || undefined })
      .then(({ companies: list, pagination: p }) => {
        setCompanies(list);
        setPagination(p);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách thất bại');
      })
      .finally(() => setLoading(false));
  }, [isSystemAdmin, page, searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(0);
  };

  if (!isSystemAdmin) {
    return (
      <div className={styles.adminUserListPage}>
        <p className={styles.adminUserListPage__error}>
          Chỉ System Admin mới có quyền xem danh sách công ty.
        </p>
        <Link to="/app/admin/company">Về thông tin công ty</Link>
      </div>
    );
  }

  return (
    <div className={styles.adminUserListPage}>
      <header className={styles.adminUserListPage__header}>
        <h1 className={styles.adminUserListPage__title}>Danh sách công ty</h1>
        <Link
          to="/app/admin/company"
          className={styles.adminUserListPage__inviteLink}
        >
          Công ty của tôi
        </Link>
      </header>

      <form onSubmit={handleSearch} className={styles.adminUserListPage__searchForm}>
        <input
          type="search"
          className={styles.adminUserListPage__searchInput}
          placeholder="Tìm theo tên, industry..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className={styles.adminUserListPage__searchButton}>
          Tìm
        </button>
      </form>

      {error && (
        <div className={styles.adminUserListPage__error} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.adminUserListPage__loading}>Đang tải...</p>
      ) : (
        <>
          <div className={styles.adminUserListPage__tableWrap}>
            <table className={styles.adminUserListPage__table}>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Website</th>
                  <th>Lĩnh vực</th>
                  <th>Quy mô</th>
                  <th>Xác thực</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    className={
                      c.deletedAt
                        ? styles.adminUserListPage__tableRowDeactivated
                        : ''
                    }
                  >
                    <td>{c.name}</td>
                    <td>{c.website || '-'}</td>
                    <td>{c.industry || '-'}</td>
                    <td>{c.size || '-'}</td>
                    <td>{c.isVerified ? 'Đã xác thực' : 'Chưa'}</td>
                    <td>
                      <Link
                        to={`/app/system-admin/companies/${c.id}`}
                        className={styles.adminUserListPage__detailLink}
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.adminUserListPage__pagination}>
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
    </div>
  );
}
