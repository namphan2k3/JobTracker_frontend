import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../store/authStore';
import { logout } from '../api/auth';
import { NotificationBell } from '../components/NotificationBell';
import { usePermissions } from '../hooks/usePermissions';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  Building2,
  CreditCard,
  Wrench,
  GitBranch,
  Mail,
  Shield,
  Key,
  BellPlus,
  User,
  LogOut,
  Menu,
  ChevronDown,
  CalendarClock,
} from 'lucide-react';
import styles from '../styles/components/AppLayout.module.css';

export function AppLayout() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { canSeeMenu } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [systemAdminOpen, setSystemAdminOpen] = useState(
    () => location.pathname.startsWith('/app/system-admin')
  );

  useEffect(() => {
    if (location.pathname.startsWith('/app/system-admin')) {
      setSystemAdminOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className={styles.appLayout}>
      {sidebarOpen && (
        <div
          className={styles.appLayout__sidebarBackdrop}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`${styles.appLayout__sidebar} ${sidebarOpen ? styles.appLayout__sidebar_open : ''}`}>
        <div className={styles.appLayout__sidebarHeader}>
          <Link to="/app/dashboard" className={styles.appLayout__brand}>
            JobTracker ATS
          </Link>
          <button
            type="button"
            className={styles.appLayout__sidebarToggle}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Thu gọn' : 'Mở rộng'}
          >
            <Menu size={20} />
          </button>
        </div>
        <nav className={styles.appLayout__sidebarNav}>
          {canSeeMenu('dashboard') && (
            <Link
              to="/app/dashboard"
              className={`${styles.appLayout__navItem} ${isActive('/app/dashboard', true) ? styles.appLayout__navItem_active : ''}`}
            >
              <LayoutDashboard size={20} />
              <span>Tổng quan</span>
            </Link>
          )}
          {canSeeMenu('jobs') && (
            <Link
              to="/app/jobs"
              className={`${styles.appLayout__navItem} ${isActive('/app/jobs') ? styles.appLayout__navItem_active : ''}`}
            >
              <Briefcase size={20} />
              <span>Job tuyển dụng</span>
            </Link>
          )}
          {canSeeMenu('interviews') && (
            <Link
              to="/app/interviews"
              className={`${styles.appLayout__navItem} ${isActive('/app/interviews') ? styles.appLayout__navItem_active : ''}`}
            >
              <CalendarClock size={20} />
              <span>Phỏng vấn</span>
            </Link>
          )}
          {canSeeMenu('applications') && (
            <Link
              to="/app/applications"
              className={`${styles.appLayout__navItem} ${isActive('/app/applications') ? styles.appLayout__navItem_active : ''}`}
            >
              <FileText size={20} />
              <span>Ứng tuyển</span>
            </Link>
          )}
          {(canSeeMenu('adminUsers') || canSeeMenu('adminCompany') || canSeeMenu('adminSubscription') || canSeeMenu('adminSkills') || canSeeMenu('adminApplicationStatuses') || canSeeMenu('adminEmail') || canSeeMenu('systemAdmin')) && (
            <div className={styles.appLayout__navGroup}>
              <span className={styles.appLayout__navGroupTitle}>Quản trị</span>
              {canSeeMenu('adminUsers') && (
                <Link
                  to="/app/admin/users"
                  className={`${styles.appLayout__navItem} ${isActive('/app/admin/users') ? styles.appLayout__navItem_active : ''}`}
                >
                  <Users size={20} />
                  <span>Người dùng</span>
                </Link>
              )}
              {canSeeMenu('adminCompany') && (
                <Link
                  to="/app/admin/company"
                  className={`${styles.appLayout__navItem} ${isActive('/app/admin/company') ? styles.appLayout__navItem_active : ''}`}
                >
                  <Building2 size={20} />
                  <span>Công ty</span>
                </Link>
              )}
              {canSeeMenu('adminSubscription') && (
                <Link
                  to="/app/admin/subscription"
                  className={`${styles.appLayout__navItem} ${isActive('/app/admin/subscription') ? styles.appLayout__navItem_active : ''}`}
                >
                  <CreditCard size={20} />
                  <span>Gói</span>
                </Link>
              )}
              {canSeeMenu('adminSkills') && (
                <Link
                  to="/app/admin/skills"
                  className={`${styles.appLayout__navItem} ${isActive('/app/admin/skills') ? styles.appLayout__navItem_active : ''}`}
                >
                  <Wrench size={20} />
                  <span>Kỹ năng</span>
                </Link>
              )}
              {canSeeMenu('adminApplicationStatuses') && (
                <Link
                  to="/app/admin/application-statuses"
                  className={`${styles.appLayout__navItem} ${isActive('/app/admin/application-statuses') ? styles.appLayout__navItem_active : ''}`}
                >
                  <GitBranch size={20} />
                  <span>Pipeline</span>
                </Link>
              )}
              {canSeeMenu('adminEmail') && (
                <Link
                  to="/app/admin/email-templates"
                  className={`${styles.appLayout__navItem} ${isActive('/app/admin/email-templates') || isActive('/app/admin/email-history') ? styles.appLayout__navItem_active : ''}`}
                >
                  <Mail size={20} />
                  <span>Email ứng viên</span>
                </Link>
              )}
              {canSeeMenu('systemAdmin') && (
                <div className={styles.appLayout__navSubmenu}>
                  <button
                    type="button"
                    className={`${styles.appLayout__navItem} ${styles.appLayout__navItem_submenu} ${isActive('/app/system-admin') ? styles.appLayout__navItem_active : ''}`}
                    onClick={() => setSystemAdminOpen((v) => !v)}
                    title="Quản lý toàn hệ thống"
                  >
                    <Shield size={20} />
                    <span>Quản lý hệ thống</span>
                  </button>
                  {systemAdminOpen && (
                    <div className={styles.appLayout__navSubmenuItems}>
                      <Link
                        to="/app/system-admin/companies"
                        className={`${styles.appLayout__navSubItem} ${isActive('/app/system-admin/companies') ? styles.appLayout__navItem_active : ''}`}
                      >
                        <Building2 size={18} />
                        <span>Công ty</span>
                      </Link>
                      <Link
                        to="/app/system-admin/roles"
                        className={`${styles.appLayout__navSubItem} ${isActive('/app/system-admin/roles') ? styles.appLayout__navItem_active : ''}`}
                      >
                        <Users size={18} />
                        <span>Vai trò</span>
                      </Link>
                      <Link
                        to="/app/system-admin/permissions"
                        className={`${styles.appLayout__navSubItem} ${isActive('/app/system-admin/permissions') ? styles.appLayout__navItem_active : ''}`}
                      >
                        <Key size={18} />
                        <span>Quyền</span>
                      </Link>
                      <Link
                        to="/app/system-admin/subscription-plans"
                        className={`${styles.appLayout__navSubItem} ${isActive('/app/system-admin/subscription-plans') ? styles.appLayout__navItem_active : ''}`}
                      >
                        <CreditCard size={18} />
                        <span>Gói</span>
                      </Link>
                      <Link
                        to="/app/system-admin/notifications/create"
                        className={`${styles.appLayout__navSubItem} ${isActive('/app/system-admin/notifications/create') ? styles.appLayout__navItem_active : ''}`}
                      >
                        <BellPlus size={18} />
                        <span>Tạo thông báo</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {canSeeMenu('profile') && (
            <Link
              to="/app/profile"
              className={`${styles.appLayout__navItem} ${isActive('/app/profile') ? styles.appLayout__navItem_active : ''}`}
            >
              <User size={20} />
              <span>Hồ sơ cá nhân</span>
            </Link>
          )}
        </nav>
      </aside>

      <div className={styles.appLayout__body}>
        <header className={styles.appLayout__topBar}>
          <div className={styles.appLayout__topBarLeft}>
            <button
              type="button"
              className={styles.appLayout__menuBtn}
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>
          </div>
          <div className={styles.appLayout__topBarRight}>
            <div className={styles.appLayout__topBarIcon}>
              <NotificationBell />
            </div>
            <div className={styles.appLayout__userMenu}>
              <button
                type="button"
                className={styles.appLayout__userButton}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
              >
                <span className={styles.appLayout__userAvatar}>
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className={styles.appLayout__userAvatarImg} />
                  ) : (
                    user?.firstName?.[0] || user?.email?.[0] || '?'
                  )}
                </span>
                <span className={styles.appLayout__userName}>
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDown size={16} />
              </button>
              {userMenuOpen && (
                <>
                  <div
                    className={styles.appLayout__userMenuBackdrop}
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className={styles.appLayout__userMenuDropdown}>
                    <Link
                      to="/app/profile"
                      className={styles.appLayout__userMenuItem}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User size={16} />
                      Hồ sơ cá nhân
                    </Link>
                    <button
                      type="button"
                      className={styles.appLayout__userMenuItem}
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className={styles.appLayout__main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
