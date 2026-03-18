# JobTracker ATS – Frontend Framework

> **Purpose**: This document serves as a scaffold for the frontend (separate repo). Use it with [API.md](./API.md) and [BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md) to implement screens and integrate APIs. Start with this framework, then go deep into each API per module.

---

## 1. Tech Stack & Rules

### 1.1 Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React 18+ | Function components, hooks |
| Language | JavaScript | ES2022+ |
| Build | Vite | Fast HMR, ESM |
| Styling | CSS Modules / Vanilla CSS | Không dùng icon library |
| UI | Text + layout only | Không icon, giao diện hiện đại minimal |

### 1.2 UI Rules

- **Responsive**: Mobile-first, breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- **No icons**: Chỉ dùng text, label, spacing. Không dùng icon library (FontAwesome, Material Icons, etc.)
- **Modern**: Clean, typography-driven, spacing rõ ràng, không clutter

---

## 2. CSS Naming Rules

### 2.1 Nguyên tắc

- **Không dùng tên chung chung**: `.container`, `.card`, `.button`, `.wrapper` – cấm
- **Tên phải mô tả rõ vị trí/context**:
  - ✅ `dashboardActiveJobsCard`
  - ✅ `jobListFilterBar`
  - ✅ `applicationDetailHeader`
  - ✅ `loginFormSubmitButton`
  - ❌ `card`, `box`, `item`, `btn`

### 2.2 Convention: BEM-like

```
[block]__[element]--[modifier]
```

- **block**: Component/module (VD: `dashboardStats`, `jobList`, `applicationPipeline`)
- **element**: Phần con (VD: `dashboardStats__label`, `jobList__row`)
- **modifier**: Trạng thái/biến thể (VD: `jobList__row--selected`, `applicationPipeline__status--active`)

### 2.3 Ví dụ

```css
/* Dashboard */
.dashboardSummary { }
.dashboardSummary__activeJobsCard { }
.dashboardSummary__applicationsTodayCard { }
.dashboardSummary__applicationsTodayCard--highlight { }
.dashboardSummary__pipelineChart { }

/* Job List */
.jobListPage { }
.jobListPage__filterBar { }
.jobListPage__filterBarSearchInput { }
.jobListPage__table { }
.jobListPage__tableRow { }
.jobListPage__tableRow--draft { }

/* Application Detail */
.applicationDetailLayout { }
.applicationDetailLayout__header { }
.applicationDetailLayout__headerTitle { }
.applicationDetailLayout__statusBadge { }
.applicationDetailLayout__statusBadge--screening { }
```

### 2.4 File tổ chức

```
src/
├── styles/
│   ├── variables.css      # Colors, spacing, typography
│   ├── reset.css          # Normalize
│   └── components/
│       ├── DashboardStats.module.css
│       ├── JobListFilter.module.css
│       └── ApplicationPipeline.module.css
```

- **variables.css**: `--color-primary`, `--spacing-md`, `--font-size-base`, `--breakpoint-md`
- **Component CSS**: Một file per component, dùng CSS Modules

---

## 3. Overview

### 3.1 Context

- **Backend**: Spring Boot REST API at `/api/v1`
- **Auth**: JWT (access token in header, refresh token in HTTP-only cookie)
- **Multi-tenant**: Data scoped by `company_id` from JWT
- **Roles**: SYSTEM_ADMIN, ADMIN_COMPANY, RECRUITER

### 3.2 Actors & Access

| Actor | Access | Notes |
|-------|--------|------|
| **Candidate** | Public pages only | Apply, track status — no login |
| **HR / Recruiter** | Protected app | Jobs, applications, interviews, comments |
| **Company Admin** | Protected app + admin | + Users, company, subscription, settings |

### 3.3 Reference Docs

- **[API.md](./API.md)** – Endpoints, request/response, error codes
- **[BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md)** – Flows, status lifecycle, business rules

---

## 4. App Structure

### 4.1 Route Groups

```
/                           → Landing / redirect
/auth                       → Auth (public)
  /login
  /register
  /verify-email
  /forgot-password
  /reset-password
  /accept-invite

/app                        → Main app (protected)
  /dashboard
  /jobs
  /applications
  /interviews
  /...

/public                     → Candidate-facing (no auth)
  /jobs/:jobId/apply
  /applications/:token/status

/admin                      → Admin-only (ADMIN_COMPANY, SYSTEM_ADMIN)
  /users
  /company
  /subscription
  /settings
  ...
```

### 4.2 Suggested Folder Structure

```
src/
├── api/              # API client, base config, interceptors
├── components/      # Shared UI components
├── features/        # Feature modules (jobs, applications, ...)
├── hooks/           # Custom hooks
├── layouts/         # App layout, auth layout
├── pages/           # Route pages
├── routes/          # Route config, guards
├── store/           # State (Zustand/Context)
├── styles/          # variables.css, reset, component CSS Modules
└── utils/           # Helpers
```

---

## 5. Modules & Screens

Each module lists screens and a placeholder for API integration. Fill in from API.md when implementing.

---

### 5.1 Authentication

| Screen | Route | Description | APIs (see API.md) |
|--------|-------|-------------|-------------------|
| Login | `/auth/login` | Email + password | `POST /auth/login` |
| Register | `/auth/register` | Company + admin signup | `POST /auth/register` |
| Verify Email | `/auth/verify-email` | Token from email link | `POST /auth/verify-email` |
| Forgot Password | `/auth/forgot-password` | Request reset link | `POST /auth/forgot-password` |
| Reset Password | `/auth/reset-password` | Set new password with token | `POST /auth/reset-password` |
| Accept Invite | `/auth/accept-invite` | Set password from invite link | `POST /auth/accept-invite` |

**Flow notes** (from BUSINESS_FLOWS):
- Register → email verification → login
- Invite → accept-invite → set password → login
- Refresh token: `POST /auth/refresh` (cookie sent automatically)
- Logout: `POST /auth/logout`

---

### 5.2 Dashboard

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Dashboard | `/app/dashboard` | Overview, stats, quick actions | _TBD_ |

---

### 5.3 Jobs

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Job List | `/app/jobs` | List, filter, search | `GET /jobs` |
| Job Detail | `/app/jobs/:id` | View, edit, status, skills | `GET /jobs/:id`, `PUT /jobs/:id`, `PATCH /jobs/:id/status` |
| Job Create | `/app/jobs/create` | Create job | `POST /jobs` |
| Job Skills | `/app/jobs/:id/skills` | Manage skills (required/optional) | `GET /jobs/:id/skills`, `POST`, `PATCH`, `DELETE` |

**Status workflow**: DRAFT → PUBLISHED → PAUSED / CLOSED / FILLED

**Plan limit**: Creating job checks `maxJobs` before `POST /jobs`.

---

### 5.4 Applications (Core ATS)

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Application List | `/app/applications` | List, filter, sort | `GET /applications` |
| Application Detail | `/app/applications/:id` | View, edit, status, assign, comments | `GET /applications/:id`, `PUT`, `PATCH /status`, `PATCH /assign` |
| Application Create | `/app/applications/create` | HR manual entry | `POST /applications` |
| Status History | `/app/applications/:id/history` | View status history | `GET /applications/:id/status-history` |

**Pipeline**: APPLIED → SCREENING → INTERVIEW → OFFER → HIRED / REJECTED

**Filter**: status, jobId, assignedTo, minMatchScore, maxMatchScore

**Plan limit**: Creating application checks `maxApplications` before `POST /applications`.

---

### 5.5 Public Apply (Candidate)

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Apply Form | `/public/jobs/:jobId/apply` | Form: name, email, phone, CV (PDF), cover letter | `POST /public/jobs/:jobId/apply` (form-data) |
| Track Status | `/public/applications/:token/status` | Candidate checks status (no login) | `GET /public/applications/:token/status` |
| Upload Attachments | `/public/applications/:token/attachments` | Certificates, portfolio (when allowed) | `POST /public/applications/:token/attachments` |

**Note**: Candidate does not see match score.

---

### 5.6 Interviews

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Interview List | `/app/applications/:id/interviews` | List interviews for application | `GET /applications/:id/interviews` |
| Interview Create | `/app/applications/:id/interviews/create` | Schedule interview | `POST /applications/:id/interviews` |
| Interview Detail | `/app/interviews/:id` | View, edit, cancel | `GET /interviews/:id`, `PUT`, `POST /cancel` |

**Interview types**: Phone, Video, In-person, Technical

---

### 3.7 Comments

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Comments | `/app/applications/:id` (tab/section) | Comments on application | `GET /applications/:id/comments`, `POST`, `PUT`, `DELETE` |

**Note**: Internal comments only (HR visibility).

---

### 5.8 Attachments

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Attachments | `/app/applications/:id` (tab/section) | List, upload, download | `GET /applications/:id/attachments`, `POST`, `GET /:id/download`, `DELETE` |

**HR upload**: When `attachmentType = RESUME`, triggers CV re-scoring.

---

### 3.9 Notifications

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Notification List | `/app/notifications` | List, mark read | `GET /notifications`, `PATCH /:id/read`, `PATCH /read-all` |

---

### 5.10 User Management (Admin)

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| User List | `/app/admin/users` | List users, filter | `GET /admin/users` |
| User Detail | `/app/admin/users/:id` | View, edit, delete, restore | `GET`, `PUT`, `DELETE`, `PATCH /restore` |
| Invite User | `/app/admin/users/invite` | Invite form | `POST /admin/users/invite` |
| Add Employee | `/app/admin/users/employees` | Add employee (no app access) | `POST /admin/users/employees` |
| Resend Invite | `/app/admin/users/:id/resend-invite` | Resend invite | `POST /admin/users/:id/resend-invite` |

**Plan limit**: Invite checks `maxUsers` before `POST /admin/users/invite`.

---

### 3.11 Profile

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Profile | `/app/profile` | View, edit profile | `GET /profile`, `PUT /profile` |
| Change Password | `/app/profile` (section) | Change password | `PUT /profile/change-password` |
| Avatar | `/app/profile` (section) | Upload avatar | `POST /profile/avatar` |

---

### 5.12 User Sessions

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Sessions | `/app/sessions` | List, revoke sessions | `GET /sessions`, `DELETE /sessions/:id` |

---

### 3.13 Company (Admin)

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Company Detail | `/app/admin/company` | View, edit company | `GET /companies/:id`, `PUT`, `PATCH /verify` |

---

### 5.14 Subscription & Billing (Admin)

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Subscription | `/app/admin/subscription` | Current plan, limits | `GET /companies/:id/subscription` |
| Subscription History | `/app/admin/subscriptions` | History | `GET /companies/:id/subscriptions` |
| Plans | `/app/admin/plans` | List plans, chọn gói → create + payment | `GET /admin/subscription-plans`, `POST /admin/company-subscriptions`, `POST /admin/payments` |
| Payments | `/app/admin/payments` | Payment history | `GET /companies/:id/payments` |
| Payment Return | `/app/payments/return` | Redirect từ VNPAY | Query: `?status=success|failed` |

**VNPay flow**:
1. User chọn gói trên Plans → `POST /admin/company-subscriptions` (PENDING)
2. Nếu gói trả phí → `POST /admin/payments` → redirect `paymentUrl` sang VNPAY
3. VNPAY callback → backend xử lý → redirect FE: `{baseUrl}/app/payments/return?status=success|failed`
4. Gói miễn phí: tạo subscription → redirect `/app/admin/subscription`

---

### 5.15 Email Templates (Admin)

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Template List | `/app/admin/email-templates` | List templates | `GET /email-templates` |
| Template Form | `/app/admin/email-templates/:id` | Create, edit, preview, send test | `GET`, `POST`, `PUT`, `POST /preview`, `POST /send-test` |

---

### 3.16 Skills & Roles (Admin)

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Skills | `/app/admin/skills` | CRUD skills | `GET`, `POST`, `PUT`, `DELETE /skills` |
| Roles | `/app/admin/roles` | CRUD roles, permissions | `GET`, `POST`, `PUT`, `DELETE /roles`, `GET/PUT /roles/:id/permissions` |

---

### 5.17 Audit Logs (Admin)

| Screen | Route | Description | APIs |
|--------|-------|-------------|------|
| Audit Logs | `/app/admin/audit-logs` | List audit logs | `GET /audit-logs` |

---

## 6. API Integration Checklist

For each module, when implementing:

1. **Read API.md** – Endpoint, method, request/response, error codes
2. **Read BUSINESS_FLOWS.md** – Flow, validation, side effects
3. **Define types** – `types/` from API DTOs
4. **API client** – Add function in `api/` (e.g. `api/jobs.ts`)
5. **State** – Add slice/hook if needed
6. **Screen** – Implement UI, wire API, handle loading/error
7. **Error handling** – Map error codes to user messages (i18n from backend)

---

## 7. API Client Setup

### 7.1 Base Config

```ts
// Example structure
const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

// Axios/fetch instance
// - Base URL
// - Authorization: Bearer <accessToken>
// - Credentials: 'include' (for refresh token cookie)
// - Interceptor: 401 → call refresh → retry
// - Interceptor: map error response to app error
```

### 5.2 Auth Flow

- Login: Store `accessToken` (memory/state), refresh token in cookie
- Request: `Authorization: Bearer <accessToken>`
- 401: Call `POST /auth/refresh` (cookie auto) → retry with new access token
- Logout: `POST /auth/logout` + clear state

---

## 8. Plan Limits & Error Handling

When user hits plan limits, backend returns:

- `PLAN_LIMIT_JOBS_EXCEEDED` (403)
- `PLAN_LIMIT_APPLICATIONS_EXCEEDED` (403)
- `PLAN_LIMIT_USERS_EXCEEDED` (403)
- `COMPANY_SUBSCRIPTION_NOT_EXISTED` (404)

**UI**: Show error message, suggest upgrade (e.g. link to subscription page).

---

## 9. Deep-Dive Template (per API)

When going deep into each API, use this template:

```markdown
## [Module] – [Feature]

### API: [GET/POST] [path]

**Ref**: API.md § X.X

**Request**:
- Body: ...
- Query: ...

**Response**:
- Success: ...
- Error codes: ...

**Business rules** (from BUSINESS_FLOWS):
- ...

**UI notes**:
- Loading state
- Error handling
- Success feedback
```

---

## 10. Next Steps

1. Tạo project: `npm create vite@latest jobtracker-web -- --template react`
2. Cấu hình API base URL, auth interceptors
3. Thiết lập `styles/variables.css`, `styles/reset.css`, CSS Modules
4. Implement auth screens (login, register, verify, invite)
5. Implement protected layout + route guards
6. Implement modules theo thứ tự: Dashboard → Jobs → Applications → …
7. Mỗi module: đọc API.md + BUSINESS_FLOWS.md → implement → test
8. Tuân thủ CSS naming (BEM-like, tên rõ ràng, không icon)

---

*This doc is a framework. Update it as you add/modify screens and APIs.*
