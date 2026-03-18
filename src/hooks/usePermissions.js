import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Permissions theo role (API_SECURITY.md)
 * Backend có thể trả permissions trong user - nếu có thì dùng, không thì derive từ role
 */
const ROLE_PERMISSIONS = {
  SYSTEM_ADMIN: null, // null = all
  ADMIN_COMPANY: [
    'USER_READ', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'ROLE_READ',
    'JOB_READ', 'JOB_CREATE', 'JOB_UPDATE', 'JOB_DELETE',
    'APPLICATION_READ', 'APPLICATION_CREATE', 'APPLICATION_UPDATE', 'APPLICATION_DELETE',
    'INTERVIEW_READ', 'INTERVIEW_CREATE', 'INTERVIEW_UPDATE', 'INTERVIEW_DELETE',
    'COMMENT_READ', 'COMMENT_CREATE', 'COMMENT_UPDATE', 'COMMENT_DELETE',
    'ATTACHMENT_READ', 'ATTACHMENT_CREATE', 'ATTACHMENT_DELETE',
    // Skill: chỉ được xem, thao tác CRUD để backend / SYSTEM_COMPANY xử lý
    'SKILL_READ',
    'COMPANY_READ', 'COMPANY_UPDATE',
    'SUBSCRIPTION_READ', 'SUBSCRIPTION_CREATE', 'PAYMENT_READ', 'PAYMENT_CREATE',
    'APPLICATION_STATUS_READ', 'APPLICATION_STATUS_CREATE', 'APPLICATION_STATUS_UPDATE', 'APPLICATION_STATUS_DELETE',
    'EMAIL_TEMPLATE_READ', 'EMAIL_TEMPLATE_CREATE', 'EMAIL_TEMPLATE_UPDATE', 'EMAIL_TEMPLATE_DELETE',
    'EMAIL_HISTORY_READ',
    'NOTIFICATION_READ', 'NOTIFICATION_UPDATE', 'NOTIFICATION_DELETE',
    'AUDIT_LOG_READ',
  ],
  RECRUITER: [
    'USER_READ',
    'JOB_READ',
    'APPLICATION_READ', 'APPLICATION_UPDATE',
    'INTERVIEW_READ', 'INTERVIEW_CREATE', 'INTERVIEW_UPDATE', 'INTERVIEW_DELETE',
    'COMMENT_READ', 'COMMENT_CREATE', 'COMMENT_UPDATE', 'COMMENT_DELETE',
    'ATTACHMENT_READ', 'ATTACHMENT_CREATE', 'ATTACHMENT_DELETE',
    'SKILL_READ',
    'APPLICATION_STATUS_READ',
    'NOTIFICATION_READ', 'NOTIFICATION_UPDATE', 'NOTIFICATION_DELETE',
  ],
};

/**
 * Menu visibility theo role
 */
export const MENU_VISIBILITY = {
  dashboard: ['SYSTEM_ADMIN', 'ADMIN_COMPANY', 'RECRUITER'],
  jobs: ['SYSTEM_ADMIN', 'ADMIN_COMPANY', 'RECRUITER'],
  applications: ['SYSTEM_ADMIN', 'ADMIN_COMPANY', 'RECRUITER'],
  interviews: ['SYSTEM_ADMIN', 'ADMIN_COMPANY', 'RECRUITER'],
  adminUsers: ['SYSTEM_ADMIN', 'ADMIN_COMPANY'],
  adminCompany: ['SYSTEM_ADMIN', 'ADMIN_COMPANY'],
  adminSubscription: ['SYSTEM_ADMIN', 'ADMIN_COMPANY'],
  adminSkills: ['SYSTEM_ADMIN', 'ADMIN_COMPANY'],
  adminApplicationStatuses: ['SYSTEM_ADMIN', 'ADMIN_COMPANY'],
  adminEmail: ['SYSTEM_ADMIN', 'ADMIN_COMPANY'],
  systemAdmin: ['SYSTEM_ADMIN'],
  profile: ['SYSTEM_ADMIN', 'ADMIN_COMPANY', 'RECRUITER'],
};

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const roleName = user?.roleName || 'RECRUITER';

  return useMemo(() => {
    const hasPermission = (perm) => {
      if (roleName === 'SYSTEM_ADMIN') return true;
      const perms = ROLE_PERMISSIONS[roleName] || ROLE_PERMISSIONS.RECRUITER;
      return perms && perms.includes(perm);
    };

    const canSeeMenu = (menuKey) => {
      const roles = MENU_VISIBILITY[menuKey];
      return roles && roles.includes(roleName);
    };

    return {
      roleName,
      isSystemAdmin: roleName === 'SYSTEM_ADMIN',
      isAdminCompany: roleName === 'ADMIN_COMPANY',
      isRecruiter: roleName === 'RECRUITER',
      hasPermission,
      canSeeMenu,
    };
  }, [roleName]);
}
