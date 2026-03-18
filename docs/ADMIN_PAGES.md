# Phân tách trang Admin – System Admin vs Company Admin

> **Mục đích**: Tránh lộn xộn chức năng. System Admin và Company Admin có phạm vi quyền khác nhau.

---

## 1. Company Admin (`/app/admin/*`)

**Roles**: `ADMIN_COMPANY`, `RECRUITER` (theo permission)

**Phạm vi**: Chỉ **công ty của mình** (companyId từ JWT).

| Route | Trang | Mô tả |
|-------|-------|-------|
| /app/admin/users | UserListPage | Quản lý users trong company |
| /app/admin/users/:id | UserDetailPage | Chi tiết, sửa, vô hiệu, gửi lại invite |
| /app/admin/users/invite | InviteUserPage | Mời user mới |
| /app/admin/users/employees | AddEmployeePage | Thêm nhân viên (không app access) |
| /app/admin/company | CompanyPage | Xem/sửa thông tin công ty của mình |
| /app/admin/subscription | AdminSubscriptionPage | Gói hiện tại, nút Nâng cấp |
| /app/admin/subscriptions | AdminSubscriptionHistoryPage | Lịch sử gói |
| /app/admin/plans | AdminPlansPage | Danh sách gói (pricing, chọn nâng cấp) |
| /app/admin/payments | AdminPaymentHistoryPage | Lịch sử thanh toán |
| /app/admin/skills | AdminSkillsPage | CRUD kỹ năng (catalog) |
| /app/admin/application-statuses | AdminApplicationStatusListPage | CRUD pipeline ứng tuyển (per company) |
| /app/admin/email-templates | AdminEmailTemplateListPage | Danh sách email templates |
| /app/admin/email-templates/new | AdminEmailTemplateFormPage | Tạo template |
| /app/admin/email-templates/:id | AdminEmailTemplateFormPage | Sửa, preview, gửi test |
| /app/admin/email-history | AdminEmailHistoryPage | Lịch sử email, resend FAILED |

**Payments**: Chọn gói → create subscription → init payment (VNPAY) → redirect. Return: `/app/payments/return?status=success|failed`

**Permissions**: USER_*, COMPANY_READ, COMPANY_UPDATE, JOB_*, APPLICATION_*, SUBSCRIPTION_READ, SUBSCRIPTION_CREATE, PAYMENT_READ, PAYMENT_CREATE, SKILL_*, ...

---

## 2. System Admin (`/app/system-admin/*`)

**Role**: Chỉ `SYSTEM_ADMIN`

**Phạm vi**: **Toàn hệ thống** (tất cả companies).

| Route | Trang | Mô tả |
|-------|-------|-------|
| /app/system-admin | SystemAdminDashboard | Dashboard tổng quan |
| /app/system-admin/companies | CompanyListPage | Danh sách tất cả công ty |
| /app/system-admin/companies/:id | CompanyDetailPage | Chi tiết công ty + **Verify** |
| /app/system-admin/roles | RoleListPage | CRUD roles |
| /app/system-admin/audit-logs | AuditLogListPage | Xem audit logs |
| /app/system-admin/subscription-plans | SubscriptionPlanListPage | Quản lý gói subscription |
| /app/system-admin/roles | RoleListPage | CRUD roles, phân quyền permissions |
| /app/system-admin/permissions | PermissionListPage | CRUD permissions |

**Permissions**: COMPANY_VERIFY, COMPANY_READ (all), ROLE_*, APPLICATION_STATUS_*, AUDIT_LOG_READ, ...

---

## 3. Layout & Nav

- **AppLayout** (main nav):
  - Dashboard, Jobs, Applications → dùng chung
  - **Admin** (dropdown hoặc link) → /app/admin/users (Company Admin)
  - **System Admin** (chỉ khi role = SYSTEM_ADMIN) → /app/system-admin/companies

- **SystemAdminLayout**: Wrapper cho /app/system-admin/*, check role SYSTEM_ADMIN, nếu không → redirect.

---

## 4. Route guard

```js
// System Admin routes
{
  path: 'system-admin',
  element: <SystemAdminGuard><SystemAdminLayout /></SystemAdminGuard>,
  children: [...]
}
```

`SystemAdminGuard`: Nếu `user.roleName !== 'SYSTEM_ADMIN'` → `<Navigate to="/app/dashboard" />`.
