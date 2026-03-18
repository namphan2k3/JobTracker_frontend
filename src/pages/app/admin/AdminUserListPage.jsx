import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers } from '../../../api/adminUsers';
import styles from '../../../styles/components/AdminUserListPage.module.css';

export function AdminUserListPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const size = 20;

  useEffect(() => {
    setLoading(true);
    getUsers({ page, size, search: searchQuery || undefined })
      .then(({ users: list, pagination: p }) => {
        setUsers(list);
        setPagination(p);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách thất bại');
      })
      .finally(() => setLoading(false));
  }, [page, searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(0);
  };

  return (
    <div className={styles.adminUserListPage}>
      <header className={styles.adminUserListPage__header}>
        <h1 className={styles.adminUserListPage__title}>Quản lý người dùng</h1>
        <div className={styles.adminUserListPage__actions}>
          <Link
            to="/app/admin/users/invite"
            className={styles.adminUserListPage__inviteLink}
          >
            Mời user
          </Link>
          <Link
            to="/app/admin/users/employees"
            className={styles.adminUserListPage__employeeLink}
          >
            Thêm nhân viên
          </Link>
        </div>
      </header>

      <form onSubmit={handleSearch} className={styles.adminUserListPage__searchForm}>
        <input
          type="search"
          className={styles.adminUserListPage__searchInput}
          placeholder="Tìm theo email, tên..."
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
                  <th>Email</th>
                  <th>Họ tên</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={
                      u.deletedAt
                        ? styles.adminUserListPage__tableRowDeactivated
                        : ''
                    }
                  >
                    <td>{u.email}</td>
                    <td>
                      {u.firstName} {u.lastName}
                    </td>
                    <td>{u.roleName || '-'}</td>
                    <td>
                      {u.deletedAt
                        ? 'Đã vô hiệu'
                        : u.emailVerified
                          ? 'Đã xác thực'
                          : 'Chờ xác thực'}
                    </td>
                    <td>
                      <Link
                        to={`/app/admin/users/${u.id}`}
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
