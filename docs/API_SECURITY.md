# API Security – Public vs Private Endpoints, Permissions, Roles

> Base URL: `/api/v1` (context-path)

---

## 1. Public Endpoints (No Auth Required)

These endpoints do **not** require `Authorization: Bearer <token>`.

### 1.1 Authentication (`/auth/`**)


| Method | Endpoint                    | Description                           |
| ------ | --------------------------- | ------------------------------------- |
| POST   | `/auth/register`            | Company + admin signup                |
| POST   | `/auth/login`               | Login (email + password)              |
| POST   | `/auth/refresh`             | Refresh token (uses HTTP-only cookie) |
| POST   | `/auth/logout`              | Logout                                |
| POST   | `/auth/verify-email`        | Verify email (token from link)        |
| POST   | `/auth/resend-verification` | Resend verification email             |
| POST   | `/auth/forgot-password`     | Request password reset                |
| POST   | `/auth/reset-password`      | Reset password (token from link)      |
| POST   | `/auth/accept-invite`       | Accept invite, set password           |


### 1.2 Candidate Public (`/public/**`)


| Method | Endpoint                                              | Description                                                       |
| ------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
| GET    | `/public/jobs`                                        | List jobs đang tuyển (career page, job board) — filter: companyId, search, jobType, isRemote, location |
| GET    | `/public/jobs/{id}`                                   | Chi tiết job đang tuyển (trước khi apply)                         |
| POST   | `/public/jobs/{jobId}/apply`                          | Candidate apply (form-data: name, email, phone, CV, cover letter) |
| GET    | `/public/applications/{applicationToken}/status`      | Candidate track status (no login)                                 |
| POST   | `/public/applications/{applicationToken}/attachments` | Candidate upload attachments (certificates, portfolio)            |


### 1.3 Payment Callback


| Method | Endpoint                 | Description                                 |
| ------ | ------------------------ | ------------------------------------------- |
| GET    | `/payments/vnpay/return` | VNPay redirect after payment (callback URL) |


---

## 2. Private Endpoints (Auth Required)

All endpoints below require `Authorization: Bearer <accessToken>`. Data is scoped by `company_id` from JWT.

### 2.0 Dashboard (`/dashboard`)

| Method | Endpoint           | Permission                          | Notes                    |
| ------ | ------------------ | ----------------------------------- | ------------------------ |
| GET    | `/dashboard/summary` | JOB_READ or APPLICATION_READ       | 4 widgets: active jobs, applications today, by status, upcoming interviews |

### 2.1 Jobs (`/jobs`)


| Method | Endpoint                         | Permission | Notes                            |
| ------ | -------------------------------- | ---------- | -------------------------------- |
| POST   | `/jobs`                          | JOB_CREATE | Create job (plan limit: maxJobs) |
| GET    | `/jobs`                          | JOB_READ   | List jobs                        |
| GET    | `/jobs/{id}`                     | JOB_READ   | Job detail                       |
| PUT    | `/jobs/{id}`                     | JOB_UPDATE | Update job                       |
| PATCH  | `/jobs/{id}/status`              | JOB_UPDATE | Change status                    |
| DELETE | `/jobs/{id}`                     | JOB_DELETE | Soft delete                      |
| GET    | `/jobs/{jobId}/skills`           | JOB_READ   | List job skills                  |
| POST   | `/jobs/{jobId}/skills`           | JOB_UPDATE | Add skill                        |
| PATCH  | `/jobs/{jobId}/skills/{skillId}` | JOB_UPDATE | Update skill                     |
| DELETE | `/jobs/{jobId}/skills/{skillId}` | JOB_UPDATE | Remove skill                     |


### 2.2 Applications (`/applications`)


| Method | Endpoint                            | Permission         | Notes                                   |
| ------ | ----------------------------------- | ------------------ | --------------------------------------- |
| GET    | `/applications`                     | APPLICATION_READ   | List (filter, sort)                     |
| GET    | `/applications/{id}`                | APPLICATION_READ   | Detail                                  |
| POST   | `/applications`                     | APPLICATION_CREATE | HR create (plan limit: maxApplications) |
| PUT    | `/applications/{id}`                | APPLICATION_UPDATE | Update                                  |
| PATCH  | `/applications/{id}/status`         | APPLICATION_UPDATE | Change status                           |
| PATCH  | `/applications/{id}/assign`         | APPLICATION_UPDATE | Assign to recruiter                     |
| DELETE | `/applications/{id}`                | APPLICATION_DELETE | Soft delete                             |
| GET    | `/applications/{id}/status-history` | APPLICATION_READ   | Status history                          |


### 2.3 Attachments (`/applications/{applicationId}/attachments`)


| Method | Endpoint                                    | Permission        | Notes                                  |
| ------ | ------------------------------------------- | ----------------- | -------------------------------------- |
| POST   | `/applications/{applicationId}/attachments` | ATTACHMENT_CREATE | HR upload (RESUME triggers re-scoring) |
| GET    | `/applications/{applicationId}/attachments` | ATTACHMENT_READ   | List attachments                       |
| GET    | `/{id}/download`                            | ATTACHMENT_READ   | Download (AttachmentController)        |
| DELETE | `/{id}`                                     | ATTACHMENT_DELETE | Delete attachment                      |


### 2.4 Comments (`/applications/{applicationId}/comments`)


| Method | Endpoint                                             | Permission     |
| ------ | ---------------------------------------------------- | -------------- |
| GET    | `/applications/{applicationId}/comments`             | COMMENT_READ   |
| POST   | `/applications/{applicationId}/comments`             | COMMENT_CREATE |
| PUT    | `/applications/{applicationId}/comments/{commentId}` | COMMENT_UPDATE |
| DELETE | `/applications/{applicationId}/comments/{commentId}` | COMMENT_DELETE |


### 2.5 Interviews


| Method | Endpoint                                   | Permission       |
| ------ | ------------------------------------------ | ---------------- |
| GET    | `/interviews`                              | INTERVIEW_READ   | List interviews của company (filter: applicationId, jobId, interviewerId, from, to, status). Company từ JWT. |
| GET    | `/applications/{applicationId}/interviews` | INTERVIEW_READ   |
| POST   | `/applications/{applicationId}/interviews` | INTERVIEW_CREATE |
| GET    | `/interviews/{id}`                         | INTERVIEW_READ   |
| PUT    | `/interviews/{id}`                         | INTERVIEW_UPDATE |
| DELETE | `/interviews/{id}`                         | INTERVIEW_DELETE |
| POST   | `/interviews/{id}/cancel`                  | INTERVIEW_UPDATE |


### 2.6 Notifications (`/notifications`)


| Method | Endpoint                   | Permission          |
| ------ | -------------------------- | ------------------- |
| GET    | `/notifications`           | NOTIFICATION_READ   |
| GET    | `/notifications/{id}`      | NOTIFICATION_READ   |
| POST   | `/notifications`           | NOTIFICATION_READ   |
| PATCH  | `/notifications/{id}/read` | NOTIFICATION_UPDATE |
| PATCH  | `/notifications/read-all`  | NOTIFICATION_UPDATE |
| DELETE | `/notifications/{id}`      | NOTIFICATION_DELETE |


### 2.7 Profile (`/users`)


| Method | Endpoint                 | Permission  |
| ------ | ------------------------ | ----------- |
| GET    | `/users/profile`         | USER_READ   |
| PUT    | `/users/profile`         | USER_UPDATE |
| PUT    | `/users/change-password` | USER_UPDATE |
| POST   | `/users/avatar`          | USER_UPDATE |


### 2.8 User Sessions (`/user-sessions`)


| Method | Endpoint              | Permission  |
| ------ | --------------------- | ----------- |
| GET    | `/user-sessions`      | USER_READ   |
| GET    | `/user-sessions/{id}` | USER_READ   |
| POST   | `/user-sessions`      | USER_CREATE |
| PUT    | `/user-sessions/{id}` | USER_UPDATE |
| DELETE | `/user-sessions/{id}` | USER_DELETE |


### 2.9 Companies (`/companies`)


| Method | Endpoint                 | Permission     |
| ------ | ------------------------ | -------------- |
| GET    | `/companies`             | COMPANY_READ   |
| GET    | `/companies/{id}`        | COMPANY_READ   |
| PUT    | `/companies/{id}`        | COMPANY_UPDATE |
| DELETE | `/companies/{id}`        | COMPANY_UPDATE |
| PATCH  | `/companies/{id}/verify` | COMPANY_VERIFY |


### 2.10 Subscription & Payments


| Method | Endpoint                                                  | Permission          |
| ------ | --------------------------------------------------------- | ------------------- |
| GET    | `/companies/{companyId}/subscription`                     | SUBSCRIPTION_READ   |
| GET    | `/companies/{companyId}/subscriptions`                    | SUBSCRIPTION_READ   |
| POST   | `/admin/company-subscriptions`                            | SUBSCRIPTION_CREATE |
| GET    | `/admin/company-subscriptions/{id}`                       | SUBSCRIPTION_READ   |
| GET    | `/admin/company-subscriptions`                            | SUBSCRIPTION_READ   |
| POST   | `/admin/payments`                                         | PAYMENT_CREATE      |
| GET    | `/admin/payments`                                         | PAYMENT_READ        |
| GET    | `/admin/payments/{id}`                                    | PAYMENT_READ        |
| GET    | `/companies/{companyId}/payments`                         | PAYMENT_READ        |
| GET    | `/company-subscriptions/{companySubscriptionId}/payments` | PAYMENT_READ        |


### 2.11 Admin – Users (`/admin/users`)


| Method | Endpoint                              | Permission  | Notes                         |
| ------ | ------------------------------------- | ----------- | ----------------------------- |
| GET    | `/admin/users`                        | USER_READ   | List users                    |
| GET    | `/admin/users/{id}`                   | USER_READ   | User detail                   |
| POST   | `/admin/users/invite`                 | USER_CREATE | Invite (plan limit: maxUsers) |
| POST   | `/admin/users/employees`              | USER_CREATE | Add employee                  |
| POST   | `/admin/users/{userId}/resend-invite` | USER_CREATE | Resend invite                 |
| PUT    | `/admin/users/{id}`                   | USER_UPDATE | Update user                   |
| DELETE | `/admin/users/{id}`                   | USER_DELETE | Soft delete                   |
| PATCH  | `/admin/users/{id}/restore`           | USER_DELETE | Restore user                  |


### 2.12 Admin – Roles (`/admin/roles`)


| Method | Endpoint                                           | Permission  |
| ------ | -------------------------------------------------- | ----------- |
| GET    | `/admin/roles`                                     | ROLE_READ   |
| GET    | `/admin/roles/{id}`                                | ROLE_READ   |
| POST   | `/admin/roles`                                     | ROLE_CREATE |
| PUT    | `/admin/roles/{id}`                                | ROLE_UPDATE |
| DELETE | `/admin/roles/{id}`                                | ROLE_DELETE |
| GET    | `/admin/roles/{roleId}/permissions`                | ROLE_READ   |
| PUT    | `/admin/roles/{roleId}/permissions`                | ROLE_UPDATE |
| POST   | `/admin/roles/{roleId}/permissions`                | ROLE_UPDATE |
| DELETE | `/admin/roles/{roleId}/permissions/{permissionId}` | ROLE_UPDATE |


### 2.13 Admin – Permissions (`/permission`)


| Method | Endpoint           | Permission        |
| ------ | ------------------ | ----------------- |
| GET    | `/permission`      | PERMISSION_READ   |
| GET    | `/permission/{id}` | PERMISSION_READ   |
| POST   | `/permission`      | PERMISSION_CREATE |
| PUT    | `/permission/{id}` | PERMISSION_UPDATE |
| DELETE | `/permission/{id}` | PERMISSION_DELETE |


### 2.14 Admin – Subscription Plans (`/admin/subscription-plans`)


| Method | Endpoint                         | Permission          |
| ------ | -------------------------------- | ------------------- |
| GET    | `/admin/subscription-plans`      | SUBSCRIPTION_READ   |
| GET    | `/admin/subscription-plans/{id}` | SUBSCRIPTION_READ   |
| POST   | `/admin/subscription-plans`      | SUBSCRIPTION_CREATE |
| PUT    | `/admin/subscription-plans/{id}` | SUBSCRIPTION_CREATE |
| DELETE | `/admin/subscription-plans/{id}` | SUBSCRIPTION_CREATE |


### 2.15 Admin – Application Statuses (`/admin/application-statuses`)


| Method | Endpoint                           | Permission                |
| ------ | ---------------------------------- | ------------------------- |
| GET    | `/admin/application-statuses`      | APPLICATION_STATUS_READ   |
| GET    | `/admin/application-statuses/{id}` | APPLICATION_STATUS_READ   |
| POST   | `/admin/application-statuses`      | APPLICATION_STATUS_CREATE |
| PUT    | `/admin/application-statuses/{id}` | APPLICATION_STATUS_UPDATE |
| DELETE | `/admin/application-statuses/{id}` | APPLICATION_STATUS_DELETE |


### 2.16 Admin – Email Templates (`/admin/email-templates`)


| Method | Endpoint                                | Permission            |
| ------ | --------------------------------------- | --------------------- |
| GET    | `/admin/email-templates`                | EMAIL_TEMPLATE_READ   |
| GET    | `/admin/email-templates/{id}`           | EMAIL_TEMPLATE_READ   |
| POST   | `/admin/email-templates`                | EMAIL_TEMPLATE_CREATE |
| PUT    | `/admin/email-templates/{id}`           | EMAIL_TEMPLATE_UPDATE |
| DELETE | `/admin/email-templates/{id}`           | EMAIL_TEMPLATE_DELETE |
| POST   | `/admin/email-templates/{id}/preview`   | EMAIL_TEMPLATE_READ   |
| POST   | `/admin/email-templates/{id}/send-test` | EMAIL_TEMPLATE_UPDATE |


### 2.17 Admin – Email History (`/admin/email-history`)


| Method | Endpoint                           | Permission            |
| ------ | ---------------------------------- | --------------------- |
| GET    | `/admin/email-history`             | EMAIL_HISTORY_READ    |
| GET    | `/admin/email-history/{id}`        | EMAIL_HISTORY_READ    |
| POST   | `/admin/email-history/{id}/resend` | EMAIL_TEMPLATE_UPDATE |


### 2.18 Skills (`/skills`)


| Method | Endpoint       | Permission   |
| ------ | -------------- | ------------ |
| GET    | `/skills`      | SKILL_READ   |
| GET    | `/skills/{id}` | SKILL_READ   |
| POST   | `/skills`      | SKILL_CREATE |
| PUT    | `/skills/{id}` | SKILL_UPDATE |
| DELETE | `/skills/{id}` | SKILL_DELETE |


### 2.19 Audit Logs (`/audit-logs`)


| Method | Endpoint           | Permission     |
| ------ | ------------------ | -------------- |
| GET    | `/audit-logs`      | AUDIT_LOG_READ |
| GET    | `/audit-logs/{id}` | AUDIT_LOG_READ |
| POST   | `/audit-logs`      | AUDIT_LOG_READ |
| PUT    | `/audit-logs/{id}` | AUDIT_LOG_READ |
| DELETE | `/audit-logs/{id}` | AUDIT_LOG_READ |


---

## 3. Permissions

Permissions are defined in `permissions` table. User gets permissions via `role_permissions` (role → permission). **Mọi API private đều dùng `@PreAuthorize` với permission** — không có endpoint chỉ cần `authenticated`.

### 3.1 User, Role, Permission (đã implement)


| Permission        | Resource   | Action | Description                        |
| ----------------- | ---------- | ------ | ---------------------------------- |
| USER_READ         | user       | read   | Read user                          |
| USER_CREATE       | user       | create | Create user (invite, add employee) |
| USER_UPDATE       | user       | update | Update user                        |
| USER_DELETE       | user       | delete | Delete user                        |
| PERMISSION_READ   | permission | read   | Read permission                    |
| PERMISSION_CREATE | permission | create | Create permission                  |
| PERMISSION_UPDATE | permission | update | Update permission                  |
| PERMISSION_DELETE | permission | delete | Delete permission                  |
| ROLE_READ         | role       | read   | Read role                          |
| ROLE_CREATE       | role       | create | Create role                        |
| ROLE_UPDATE       | role       | update | Update role                        |
| ROLE_DELETE       | role       | delete | Delete role                        |


### 3.2 ATS Core (Job, Application, Interview, Comment, Attachment, Skill)


| Permission         | Resource    | Action | Description                |
| ------------------ | ----------- | ------ | -------------------------- |
| JOB_READ           | job         | read   | List, get job              |
| JOB_CREATE         | job         | create | Create job                 |
| JOB_UPDATE         | job         | update | Update job, status, skills |
| JOB_DELETE         | job         | delete | Delete job                 |
| APPLICATION_READ   | application | read   | List, get application      |
| APPLICATION_CREATE | application | create | Create application (HR)    |
| APPLICATION_UPDATE | application | update | Update, status, assign     |
| APPLICATION_DELETE | application | delete | Delete application         |
| INTERVIEW_READ     | interview   | read   | List, get interview        |
| INTERVIEW_CREATE   | interview   | create | Create interview           |
| INTERVIEW_UPDATE   | interview   | update | Update, cancel             |
| INTERVIEW_DELETE   | interview   | delete | Delete interview           |
| COMMENT_READ       | comment     | read   | List comments              |
| COMMENT_CREATE     | comment     | create | Create comment             |
| COMMENT_UPDATE     | comment     | update | Update comment             |
| COMMENT_DELETE     | comment     | delete | Delete comment             |
| ATTACHMENT_READ    | attachment  | read   | List, download             |
| ATTACHMENT_CREATE  | attachment  | create | Upload attachment          |
| ATTACHMENT_DELETE  | attachment  | delete | Delete attachment          |
| SKILL_READ         | skill       | read   | List, get skill            |
| SKILL_CREATE       | skill       | create | Create skill               |
| SKILL_UPDATE       | skill       | update | Update skill               |
| SKILL_DELETE       | skill       | delete | Delete skill               |


### 3.3 Company, Subscription, Admin


| Permission                | Resource           | Action | Description                        |
| ------------------------- | ------------------ | ------ | ---------------------------------- |
| COMPANY_READ              | company            | read   | Get company                        |
| COMPANY_UPDATE            | company            | update | Update company                     |
| COMPANY_VERIFY            | company            | verify | Verify company (System Admin only) |
| SUBSCRIPTION_READ         | subscription       | read   | Get subscription                   |
| SUBSCRIPTION_CREATE       | subscription       | create | Create subscription (admin)        |
| PAYMENT_READ              | payment            | read   | List payments                      |
| PAYMENT_CREATE            | payment            | create | Init payment                       |
| APPLICATION_STATUS_READ   | application_status | read   | List statuses                      |
| APPLICATION_STATUS_CREATE | application_status | create | Create status                      |
| APPLICATION_STATUS_UPDATE | application_status | update | Update status                      |
| APPLICATION_STATUS_DELETE | application_status | delete | Delete status                      |
| EMAIL_TEMPLATE_READ       | email_template     | read   | List templates                     |
| EMAIL_TEMPLATE_CREATE     | email_template     | create | Create template                    |
| EMAIL_TEMPLATE_UPDATE     | email_template     | update | Update template                    |
| EMAIL_TEMPLATE_DELETE     | email_template     | delete | Delete template                    |
| EMAIL_HISTORY_READ        | email_history      | read   | List email history                 |
| NOTIFICATION_READ         | notification       | read   | List notifications                 |
| NOTIFICATION_UPDATE       | notification       | update | Mark read                          |
| NOTIFICATION_DELETE       | notification       | delete | Delete notification                |
| AUDIT_LOG_READ            | audit_log          | read   | List audit logs                    |


---

## 4. Roles & Permissions

### 4.1 SYSTEM_ADMIN

- **Scope**: Global (all companies)
- **Permissions**: Tất cả (full access)

### 4.2 ADMIN_COMPANY

- **Scope**: Own company
- **Permissions**:
  - USER_READ, USER_CREATE, USER_UPDATE, USER_DELETE, ROLE_READ
  - JOB_READ, JOB_CREATE, JOB_UPDATE, JOB_DELETE
  - APPLICATION_READ, APPLICATION_CREATE, APPLICATION_UPDATE, APPLICATION_DELETE
  - INTERVIEW_READ, INTERVIEW_CREATE, INTERVIEW_UPDATE, INTERVIEW_DELETE
  - COMMENT_READ, COMMENT_CREATE, COMMENT_UPDATE, COMMENT_DELETE
  - ATTACHMENT_READ, ATTACHMENT_CREATE, ATTACHMENT_DELETE
  - SKILL_READ
  - COMPANY_READ, COMPANY_UPDATE
  - SUBSCRIPTION_READ, SUBSCRIPTION_CREATE, PAYMENT_READ, PAYMENT_CREATE
  - APPLICATION_STATUS_READ, APPLICATION_STATUS_CREATE, APPLICATION_STATUS_UPDATE, APPLICATION_STATUS_DELETE
  - EMAIL_TEMPLATE_READ, EMAIL_TEMPLATE_CREATE, EMAIL_TEMPLATE_UPDATE, EMAIL_TEMPLATE_DELETE
  - EMAIL_HISTORY_READ
  - NOTIFICATION_READ, NOTIFICATION_UPDATE, NOTIFICATION_DELETE
  - AUDIT_LOG_READ

### 4.3 RECRUITER

- **Scope**: Own company
- **Permissions**:
  - USER_READ
  - JOB_READ
  - APPLICATION_READ, APPLICATION_UPDATE
  - INTERVIEW_READ, INTERVIEW_CREATE, INTERVIEW_UPDATE, INTERVIEW_DELETE
  - COMMENT_READ, COMMENT_CREATE, COMMENT_UPDATE, COMMENT_DELETE
  - ATTACHMENT_READ, ATTACHMENT_CREATE, ATTACHMENT_DELETE
  - SKILL_READ
  - NOTIFICATION_READ, NOTIFICATION_UPDATE, NOTIFICATION_DELETE

---

## 5. SecurityConfig (Current)

```java
// Public endpoints (permitAll)
private final String[] PUBLIC_ENDPOINT = {
    "/auth/**",
    "/public/**",           // Candidate apply, track status, attachments
    "/payments/vnpay/return"  // VNPay callback
};

// All other requests → authenticated
```

> Đã cấu hình đầy đủ: `/auth/**`, `/public/**`, `/payments/vnpay/return`.

---

## 6. JWT & Auth Flow

- **Access token**: JWT in header `Authorization: Bearer <token>`
- **Refresh token**: HTTP-only cookie, path `/auth/refresh`
- **Permissions**: Loaded from `user → role → role_permissions` → cached in Redis
- **company_id**: JWT claim, backend filters all queries by it

---

## 7. Plan Limits (403)


| Error Code                       | When                                             |
| -------------------------------- | ------------------------------------------------ |
| PLAN_LIMIT_JOBS_EXCEEDED         | Create job when count >= maxJobs                 |
| PLAN_LIMIT_APPLICATIONS_EXCEEDED | Create application when count >= maxApplications |
| PLAN_LIMIT_USERS_EXCEEDED        | Invite user when billable users >= maxUsers      |
| COMPANY_SUBSCRIPTION_NOT_EXISTED | No active subscription                           |


