import { Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { SystemAdminGuard } from '../components/SystemAdminGuard';
import { AdminGuard } from '../components/AdminGuard';
import { SystemAdminLayout } from '../layouts/SystemAdminLayout';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage';
import { ResendVerificationPage } from '../pages/auth/ResendVerificationPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { AcceptInvitePage } from '../pages/auth/AcceptInvitePage';
import { DashboardPage } from '../pages/app/DashboardPage';
import { JobListPage } from '../pages/app/jobs/JobListPage';
import { JobDetailPage } from '../pages/app/jobs/JobDetailPage';
import { JobCreatePage } from '../pages/app/jobs/JobCreatePage';
import { ApplicationListPage } from '../pages/app/applications/ApplicationListPage';
import { ApplicationDetailPage } from '../pages/app/applications/ApplicationDetailPage';
import { ApplicationCreatePage } from '../pages/app/applications/ApplicationCreatePage';
import { InterviewListPage } from '../pages/app/interviews/InterviewListPage';
import { InterviewDetailPage } from '../pages/app/interviews/InterviewDetailPage';
import { NotificationListPage } from '../pages/app/notifications/NotificationListPage';
import { PublicLayout } from '../layouts/PublicLayout';
import { PublicApplyPage } from '../pages/public/PublicApplyPage';
import { PublicJobPage } from '../pages/public/PublicJobPage';
import { PublicTrackStatusPage } from '../pages/public/PublicTrackStatusPage';
import { PublicUploadAttachmentsPage } from '../pages/public/PublicUploadAttachmentsPage';
import { ProfilePage } from '../pages/app/ProfilePage';
import { AdminUserListPage } from '../pages/app/admin/AdminUserListPage';
import { AdminUserDetailPage } from '../pages/app/admin/AdminUserDetailPage';
import { AdminInviteUserPage } from '../pages/app/admin/AdminInviteUserPage';
import { AdminAddEmployeePage } from '../pages/app/admin/AdminAddEmployeePage';
import { AdminCompanyPage } from '../pages/app/admin/AdminCompanyPage';
import { AdminCompanyListPage } from '../pages/app/admin/AdminCompanyListPage';
import { AdminCompanyDetailPage } from '../pages/app/admin/AdminCompanyDetailPage';
import { AdminSubscriptionPage } from '../pages/app/admin/AdminSubscriptionPage';
import { AdminSubscriptionHistoryPage } from '../pages/app/admin/AdminSubscriptionHistoryPage';
import { AdminPlansPage } from '../pages/app/admin/AdminPlansPage';
import { AdminPaymentHistoryPage } from '../pages/app/admin/AdminPaymentHistoryPage';
import { AdminSkillsPage } from '../pages/app/admin/AdminSkillsPage';
import { AdminApplicationStatusListPage } from '../pages/app/admin/AdminApplicationStatusListPage';
import { AdminEmailTemplateListPage } from '../pages/app/admin/AdminEmailTemplateListPage';
import { AdminEmailTemplateFormPage } from '../pages/app/admin/AdminEmailTemplateFormPage';
import { AdminEmailHistoryPage } from '../pages/app/admin/AdminEmailHistoryPage';
import { PaymentReturnPage } from '../pages/app/PaymentReturnPage';
import {
  StatusRedirectPage,
  VerifyEmailRedirectPage,
  AcceptInviteRedirectPage,
  ResetPasswordRedirectPage,
} from '../pages/StatusRedirectPage';
import { RoleListPage } from '../pages/app/system-admin/RoleListPage';
import { PermissionListPage } from '../pages/app/system-admin/PermissionListPage';
import { SubscriptionPlanListPage } from '../pages/app/system-admin/SubscriptionPlanListPage';
import { NotificationCreatePage } from '../pages/app/system-admin/NotificationCreatePage';

/**
 * Route config theo FRONTEND_FRAMEWORK.md
 * / → Landing
 * /auth/* → Auth (public)
 * /app/* → Main app (protected)
 * /app/admin/* → Admin (protected)
 * /public/* → Candidate-facing (no auth)
 */
export const routes = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/app/status',
    element: <StatusRedirectPage />,
  },
  {
    path: '/app/verify-email',
    element: <VerifyEmailRedirectPage />,
  },
  {
    path: '/accept-invite',
    element: <AcceptInviteRedirectPage />,
  },
  {
    path: '/app/accept-invite',
    element: <AcceptInviteRedirectPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordRedirectPage />,
  },
  {
    path: '/app/reset-password',
    element: <ResetPasswordRedirectPage />,
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'resend-verification', element: <ResendVerificationPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'accept-invite', element: <AcceptInvitePage /> },
    ],
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'jobs', element: <JobListPage /> },
      { path: 'jobs/create', element: <JobCreatePage /> },
      { path: 'jobs/:id', element: <JobDetailPage /> },
      { path: 'applications', element: <ApplicationListPage /> },
      { path: 'applications/create', element: <ApplicationCreatePage /> },
      { path: 'applications/:id', element: <ApplicationDetailPage /> },
      { path: 'interviews', element: <InterviewListPage /> },
      { path: 'interviews/:id', element: <InterviewDetailPage /> },
      { path: 'notifications', element: <NotificationListPage /> },
      { path: 'profile', element: <ProfilePage /> },
      {
        path: 'admin',
        element: (
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        ),
        children: [
          { index: true, element: <Navigate to="/app/admin/users" replace /> },
          { path: 'users', element: <AdminUserListPage /> },
          { path: 'users/invite', element: <AdminInviteUserPage /> },
          { path: 'users/employees', element: <AdminAddEmployeePage /> },
          { path: 'users/:id', element: <AdminUserDetailPage /> },
          { path: 'company', element: <AdminCompanyPage /> },
          { path: 'subscription', element: <AdminSubscriptionPage /> },
          { path: 'subscriptions', element: <AdminSubscriptionHistoryPage /> },
          { path: 'plans', element: <AdminPlansPage /> },
          { path: 'payments', element: <AdminPaymentHistoryPage /> },
          { path: 'skills', element: <AdminSkillsPage /> },
          { path: 'application-statuses', element: <AdminApplicationStatusListPage /> },
          { path: 'email-templates', element: <AdminEmailTemplateListPage /> },
          { path: 'email-templates/new', element: <AdminEmailTemplateFormPage /> },
          { path: 'email-templates/:id', element: <AdminEmailTemplateFormPage /> },
          { path: 'email-history', element: <AdminEmailHistoryPage /> },
        ],
      },
      { path: 'payments/return', element: <PaymentReturnPage /> },
      {
        path: 'system-admin',
        element: (
          <SystemAdminGuard>
            <SystemAdminLayout />
          </SystemAdminGuard>
        ),
        children: [
          { index: true, element: <Navigate to="/app/system-admin/companies" replace /> },
          { path: 'companies', element: <AdminCompanyListPage /> },
          { path: 'companies/:id', element: <AdminCompanyDetailPage /> },
          { path: 'roles', element: <RoleListPage /> },
          { path: 'permissions', element: <PermissionListPage /> },
          { path: 'subscription-plans', element: <SubscriptionPlanListPage /> },
          { path: 'notifications/create', element: <NotificationCreatePage /> },
        ],
      },
    ],
  },
  {
    path: '/public',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Navigate to="/" replace /> },
      { path: 'jobs/:jobId/apply', element: <PublicApplyPage /> },
      { path: 'jobs/:id', element: <PublicJobPage /> },
      { path: 'applications/:token/status', element: <PublicTrackStatusPage /> },
      { path: 'applications/:token/attachments', element: <PublicUploadAttachmentsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
