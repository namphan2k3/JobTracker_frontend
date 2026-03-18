# JobTracker ATS API Documentation

## Tổng quan API

JobTracker ATS (Applicant Tracking System) cung cấp RESTful API với thiết kế REST chuẩn, sử dụng JSON cho data exchange và JWT cho authentication. API được thiết kế cho **B2B multi-tenant SaaS** với data isolation theo company.

### API Design Principles
- **RESTful**: Tuân thủ REST conventions
- **Stateless**: JWT-based authentication
- **Multi-Tenant**: Data isolation bằng `company_id` trong mọi requests
- **Versioned**: API versioning với `/api/v1`
- **Consistent**: Uniform response format
- **Secure**: HTTPS, JWT, input validation, RBAC, email verification
- **Documented**: OpenAPI 3.0 specification

### Base Configuration
```
Base URL: https://api.jobtracker.com/api/v1
Content-Type: application/json
Authorization: Bearer <oauth2_access_token>
X-Company-Id: <company_id> (Optional - backend lấy từ JWT; chỉ System Admin cần gửi khi impersonate)
```

> **Public vs Private, Permissions, Roles**: Xem [API_SECURITY.md](./API_SECURITY.md) để biết endpoint nào public, endpoint nào cần auth, permission từng API, và role chứa permission nào.

### Multi-Tenant Context
- Mọi API request tự động filter theo `company_id` của user
- User chỉ có thể truy cập data của company mình
- System Admin có thể truy cập tất cả companies

### JWT Access Token Structure (Multi-Tenant Best Practice)

Access token payload chứa `companyId` và `role` để backend **không cần query DB** mỗi request:

```json
{
  "sub": "userId",
  "companyId": "c1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
  "role": "ADMIN_COMPANY",
  "jti": "random-uuid",
  "iat": 1710000000,
  "exp": 1710000900
}
```

| Claim | Mô tả |
|-------|-------|
| `sub` | User ID (subject) |
| `companyId` | Company ID của tenant — dùng cho `WHERE company_id = ?` |
| `role` | Role name (SYSTEM_ADMIN, ADMIN_COMPANY, RECRUITER) |
| `jti` | JWT ID — dùng cho token invalidation (logout) |
| `iat` | Issued at (Unix timestamp) |
| `exp` | Expiration (Unix timestamp) |

**Vì sao chứa `companyId` trong JWT?**

- **Multi-tenant** → mọi query phải scope theo company
- Nếu JWT không có `companyId`: mỗi request phải query DB để biết user thuộc company nào, hoặc join user table liên tục
- Client gửi `companyId` lên → ❌ security hole (client có thể giả mạo)
- Cho `companyId` vào token giúp: không cần query user mỗi request, scope query trực tiếp `WHERE company_id = token.companyId`, tăng performance và isolation

**Có nguy hiểm không?** Không. JWT được ký (HS256/RS256), client không thể sửa payload nếu không có private key. Backend luôn verify signature. JWT payload không phải secret, chỉ cần integrity.

**`X-Company-Id` header**: Thường **không cần** gửi — backend lấy `companyId` từ JWT. Chỉ System Admin (khi impersonate company) mới cần gửi để override context.

## Authentication APIs

> **🔑 B2B SaaS Auth Flow**: 
> - **Email + Password** (bắt buộc)
> - **Email Verification** (bắt buộc)
> - **Invite-based User Creation** (HR/Admin): Admin tạo user → Gửi invite email → User set password → Email verified
> - **Add Employee** (không auth): Admin thêm nhân viên qua `POST /admin/users/employees` — không invite, không app access, không billing (multi-tenant)
> - **Không có Google OAuth** (trừ enterprise SSO - story khác)

### 1. Company Self-Signup (Company Admin Registration)
**POST** `/auth/register`

Đăng ký công ty mới và tạo Company Admin user. Đây là **mô hình 1 - Self Signup** (phổ biến cho SaaS B2B).

> **Lưu ý**: Chỉ dành cho Company Admin tự signup. Các users khác được tạo qua invite flow.

#### Request Body
```json
{
  "companyName": "Acme Corp",
  "email": "admin@acme.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Company and admin user created successfully. Please verify your email.",
  "data": {
    "company": {
      "id": "c1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "name": "Acme Corp"
    },
    "user": {
      "id": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "email": "admin@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "roleName": "ADMIN_COMPANY",
      "emailVerified": false,
      "isActive": true
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

> **Flow sau registration**:
> 1. System tạo Company (chỉ có `name` từ companyName; các trường website, industry, size, location, description để trống, có thể cập nhật sau qua **PUT /companies/{id}**).
> 2. System tạo Admin user với `email_verified = false`
> 3. System gửi email verification token
> 4. User click link trong email → Verify email → `email_verified = true` → User có thể login

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. User Login
**POST** `/auth/login`

Đăng nhập với email và password.

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roleName": "RECRUITER",
      "companyId": "c1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "companyName": "Acme Corp",
      "avatarUrl": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-15T11:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Response Headers
```
Set-Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh
```

> **Lưu ý**:
> - `accessToken` dùng trong header `Authorization: Bearer <accessToken>` cho các API cần auth
> - `refreshToken` được set qua **HTTP Cookie** (không trả trong body) — bảo mật hơn, tránh XSS lấy token. Chi tiết tham số cookie (HttpOnly, Secure, SameSite, Path) xem mục **Refresh Token** bên dưới
> - `expiresAt`: Thời điểm access token hết hạn (ISO 8601)
> - **Multi-device**: Mỗi lần login tạo session mới. User có thể đăng nhập trên nhiều thiết bị đồng thời (mobile, desktop, tablet...)

### 3. Email Verification
**POST** `/auth/verify-email`

Xác thực email với token từ email verification link.

>  **Bắt buộc**: User phải verify email trước khi có thể login (trừ khi được Admin tạo và verify sẵn).

> **Token Storage** (bảng `email_verification_tokens`):
> - Token được tạo khi `POST /auth/register` hoặc `POST /auth/resend-verification`
> - Generate token random → lưu `token`. Gửi token qua email.
> - Verify: so sánh token từ request với `token`. Nếu match và chưa expired → `users.email_verified = true`, `used_at = NOW()`
> - Expiry: 24-48 giờ

#### Request Body
```json
{
  "token": "email_verification_token_here"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "email": "admin@acme.com",
    "emailVerified": true
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Invalid or expired verification token",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Resend Verification Email
**POST** `/auth/resend-verification`

Gửi lại email verification.

> **Flow**: Tìm user theo email → tạo token mới → insert vào `email_verification_tokens` → gửi email với link chứa raw token.

#### Request Body
```json
{
  "email": "admin@acme.com"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Verification email sent",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. Refresh Token
**POST** `/auth/refresh`

Làm mới access token. Refresh token được gửi qua **HTTP Cookie** (tự động gửi bởi browser khi request đến `Path=/auth/refresh`).

> **Multi-device**: Mỗi device có refresh token riêng (lưu trong Redis theo `jti`). Refresh chỉ validate và rotate token của device hiện tại, không ảnh hưởng các device khác.

#### Request
- **Cookie**: `refreshToken` (tự động gửi kèm request nếu đã login)
- **Body**: Không cần (hoặc empty)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": {
      "id": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roleName": "RECRUITER",
      "companyId": "c1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "companyName": "Acme Corp",
      "avatarUrl": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-15T11:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Response Headers
```
Set-Cookie: refreshToken=<new_refresh_token>; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh
```

> **Refresh Token Cookie — Giải thích các tham số**:
>
> | Tham số | Giá trị | Ý nghĩa |
> |---------|---------|---------|
> | **HttpOnly** | — | Cookie không thể đọc bởi JavaScript (`document.cookie`). Chống **XSS** — script độc hại không lấy được refresh token |
> | **Secure** | — | Cookie chỉ gửi qua **HTTPS**. Chống **MITM** — token không bị gửi qua kênh không mã hóa |
> | **SameSite=Strict** | — | Cookie chỉ gửi khi request **same-site** (cùng domain). Chống **CSRF** — trang bên ngoài không thể gửi request kèm cookie |
> | **Path=/auth/refresh** | — | Cookie chỉ gửi khi request đến `/auth/refresh`. Giảm phạm vi — token không bị gửi kèm mọi request |
> | **Max-Age** | (optional) | Thời gian sống cookie (giây). Nên bằng thời gian refresh token expiry |

### 6. Logout
**POST** `/auth/logout`

Đăng xuất **chỉ device hiện tại** và vô hiệu hóa token.

> **Multi-device**: Logout chỉ invalidate session của device gọi API (dựa vào `refreshToken` trong cookie). Các device khác vẫn đăng nhập bình thường.
>
> **Token Invalidation Flow**:
> 1. System parse access token từ request body → lưu `jti` vào `invalidated_token` (access token không dùng được nữa)
> 2. System parse refresh token từ cookie → xóa `refresh_token:{jti}` khỏi Redis (device này không refresh được nữa)
> 3. Response set cookie `refreshToken` với `Max-Age=0` để browser xóa cookie

#### Request Headers
```
Authorization: Bearer <access_token>
Cookie: refreshToken=... (tự động gửi bởi browser)
```

#### Request Body
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Response Headers
```
Set-Cookie: refreshToken=; Max-Age=0; Path=/auth/refresh; HttpOnly; Secure; SameSite=Strict
```
(Xóa cookie refreshToken trên browser)

### 7. Forgot Password
**POST** `/auth/forgot-password`

Gửi email reset password.

> **Token Storage** (bảng `password_reset_tokens`):
> - Tìm user theo email → generate token random → insert vào `password_reset_tokens`. Gửi token qua email.
> - Expiry: 1 giờ (có thể config)
> - Multi-tenant: `company_id` từ user

#### Request Body
```json
{
  "email": "user@example.com"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Password reset email sent",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 8. Reset Password
**POST** `/auth/reset-password`

Reset password với token từ email.

> **Flow**: So sánh token từ request với `token` trong `password_reset_tokens` (used_at IS NULL, expires_at > NOW). Nếu match → set password mới, `used_at = NOW()`.

#### Request Body
```json
{
  "token": "reset_token_here",
  "newPassword": "NewSecurePassword123!"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## User Management APIs

### 1. Get Current User Profile
**GET** `/users/profile`

Lấy thông tin profile của user hiện tại.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "avatarUrl": "https://dropbox.com/avatar.jpg",
    "roleName": "USER",
    "isActive": true,
    "isBillable": true,
    "emailVerified": true,
    "googleId": null,
    "lastLoginAt": "2024-01-15T09:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": null,
    "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Update User Profile
**PUT** `/users/profile`

Cập nhật thông tin profile.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Request Body
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "avatarUrl": "https://dropbox.com/avatar.jpg",
    "roleName": "USER",
    "isActive": true,
    "emailVerified": true,
    "googleId": null,
    "lastLoginAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Upload Avatar
**POST** `/users/avatar`

Upload ảnh đại diện.

#### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)
```
file: <image_file>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatarUrl": "https://dropbox.com/avatars/user_1_avatar.jpg"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Change Password
**PUT** `/users/change-password`

Thay đổi mật khẩu.

#### Request Headers
```

Authorization: Bearer <access_token>
```

#### Request Body
```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Admin User Management APIs

> **Hai cách tạo user**:
> 
> | Flow | API | Mục đích | isBillable | App access |
> |------|-----|----------|------------|------------|
> | **Invite User** | POST `/admin/users/invite` | HR/Admin dùng app | `true` | Có (invite → set password → login) |
> | **Add Employee** | POST `/admin/users/employees` | Chỉ thông tin nhân viên (scheduling, contact, v.v.) | `false` | Không (không invite, không password) |
> 
> - **Billing**: Chỉ tính users có `isBillable = true` (Admin, HR) vào plan limit. Employee thêm qua Add Employee không tính.
> - **Multi-tenant**: `company_id` lấy từ JWT (user hiện tại) — không nhận từ client
> 
> Chỉ dành cho **ADMIN_COMPANY** hoặc **RECRUITER** (có quyền) để quản lý users trong company của mình.

### 1. Get Users (List)
**GET** `/admin/users`

Lấy danh sách users của **company hiện tại** (multi-tenant: `company_id` từ JWT).

Query hỗ trợ `role`, `status`, `search`, `createdFrom`.

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "email": "admin@gmail.com",
      "firstName": "Admin",
      "lastName": "User",
      "phone": null,
      "avatarUrl": null,
      "roleId": "34d9a2e3-1a30-4a1a-b1ad-4b6d2619f1ce",
      "roleName": "SYSTEM_ADMIN",
      "isActive": true,
      "isBillable": true,
      "emailVerified": true,
      "lastLoginAt": "2024-01-15T09:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T09:00:00Z",
      "deletedAt": null
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 12,
    "totalPages": 1
  }
}
```

### 2. Get User Details
**GET** `/admin/users/{id}`

Trả về thông tin đầy đủ của user kèm audit.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "avatarUrl": null,
    "roleId": "34d9a2e3-1a30-4a1a-b1ad-4b6d2619f1ce",
    "roleName": "USER",
    "isActive": true,
    "emailVerified": true,
    "googleId": null,
    "lastLoginAt": "2024-01-15T09:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": null,
    "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Add Employee (Non-billing, No App Access)
**POST** `/admin/users/employees`

Thêm nhân viên vào company **không gửi invite**, **không tạo password**. Chỉ dùng cho lưu thông tin liên hệ — dùng trong scheduling, gán interview, contact, v.v. **Không login** vào app, không tính billing.

> **Multi-tenant**: `company_id` lấy từ JWT (company của user hiện tại). Không nhận `companyId` từ client.

#### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "engineer@company.com",
  "firstName": "Jane",
  "lastName": "Engineer",
  "phone": "+12065551234"
}
```

> **Lưu ý**: Chỉ cần thông tin cần thiết (email, firstName, lastName, phone). Không có `roleId` — Add Employee không set role vì user không login, role chỉ có giá trị cho user đã login.

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Employee added successfully",
  "data": {
    "id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
    "email": "engineer@company.com",
    "firstName": "Jane",
    "lastName": "Engineer",
    "phone": "+12065551234",
    "isActive": true,
    "isBillable": false,
    "emailVerified": false,
    "createdAt": "2024-01-20T08:00:00Z"
  },
  "timestamp": "2024-01-20T08:00:00Z"
}
```

> **Lưu ý**:
> - System tự động set `isBillable = false`, `password = NULL`, `is_active = true`, `role_id = NULL`
> - Không gửi invite email — user không có app access
> - Có thể gán vào interview, dùng làm contact, v.v.

#### Error Response (400 - Email đã tồn tại trong company)
```json
{
  "success": false,
  "message": "Email already exists in this company",
  "timestamp": "2024-01-20T08:00:00Z"
}
```

### 4. Invite User (Create User via Invite)
**POST** `/admin/users/invite`

Tạo user mới và gửi invite email. Dành cho **HR/Admin** — user sẽ set password qua link và **login vào app**. Tính billing.

> **Flow**:
> 1. Admin tạo user → `email_verified = false`, `password = NULL`, `is_active = false`
> 2. System generate invite token (random UUID hoặc secure random string) → Lưu vào bảng `user_invitations` với `expires_at = NOW() + 7 days`
> 3. System gửi invite email với link: `https://app.jobtracker.com/accept-invite?token={token}`
> 4. User click link trong email → `POST /auth/accept-invite` với token → Set password → `email_verified = true`, `is_active = true`, `used_at` được set trong `user_invitations`
> 
> **Token Storage**: Token được lưu trong bảng `user_invitations` với các fields:
> - `token`: Unique invite token (VARCHAR(255))
> - `user_id`: FK to users
> - `company_id`: Multi-tenant key
> - `expires_at`: Thời gian hết hạn (7 ngày)
> - `used_at`: NULL nếu chưa dùng, TIMESTAMP nếu đã accept
> - `sent_at`: Thời gian gửi email

#### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "email": "new.hr@company.com",
  "firstName": "New",
  "lastName": "HR",
  "phone": "+12065551212",
  "roleId": "34d9a2e3-1a30-4a1a-b1ad-4b6d2619f1ce"
}
```

> **Lưu ý**:
> - `password` không cần trong request (user sẽ set qua invite link)
> - `roleId` (optional): Chỉ cho phép **ADMIN_COMPANY** hoặc **RECRUITER**. Nếu null/omit → mặc định **RECRUITER**
> - `isBillable`: **System tự set** theo role — ADMIN_COMPANY/RECRUITER → `true`. Không nhận từ client.
> - System tự động set `email_verified = false`, `password = NULL`, `is_active = false`

#### Response (201 Created)
```json
{
  "success": true,
  "message": "User invited successfully. Invitation email sent.",
  "data": null,
  "timestamp": "2024-01-20T08:00:00Z"
}
```

> **Lưu ý**: Invite chỉ tạo user + gửi email. Không cần trả data. Chi tiết user lấy qua **GET /admin/users** (filter email) hoặc **GET /admin/users/{id}** nếu có id.

### 5. Accept Invite (Set Password)
**POST** `/auth/accept-invite`

User nhận invite email, click link, và set password. Sau khi set password, `email_verified = true` và `is_active = true`.

> **Public endpoint**: Không cần authentication (chỉ cần invite token).
> 
> **Token Validation**:
> 1. System tìm record trong `user_invitations` với `token = {token}`
> 2. Validate: `used_at IS NULL` (chưa dùng) AND `expires_at > NOW()` (chưa hết hạn) AND `deleted_at IS NULL`
> 3. Nếu valid → Set password → Update `users.email_verified = true`, `users.is_active = true` → Set `user_invitations.used_at = NOW()`
> 4. Nếu invalid → Return error: "Invalid or expired invitation token"

#### Request Body
```json
{
  "token": "invite_token_from_email",
  "password": "SecurePassword123!"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Invitation accepted. Email verified. You can now login.",
  "data": {
    "email": "new.user@company.com",
    "emailVerified": true,
    "isActive": true
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 6. Resend Invite
**POST** `/admin/users/{userId}/resend-invite`

Gửi lại invite email cho user chưa verify.

> **Flow**:
> 1. System tìm user với `email_verified = false` hoặc `is_active = false`
> 2. System tạo invite token mới → Insert record mới vào `user_invitations` (hoặc update record cũ nếu chưa used)
> 3. System gửi email với token mới
> 4. Token cũ vẫn có thể dùng (nếu chưa expired), nhưng thường chỉ dùng token mới nhất

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Invitation email resent",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 7. Update User
**PUT** `/admin/users/{id}`

#### Request Body
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+84123456789",
  "roleId": "781af566-48d8-4066-9fd7-78284b642df0",
  "isActive": true
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "+84123456789",
    "avatarUrl": null,
    "roleId": "781af566-48d8-4066-9fd7-78284b642df0",
    "roleName": "RECRUITER",
    "isActive": true,
    "emailVerified": true,
    "googleId": null,
    "lastLoginAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 8. Deactivate / Soft Delete User
**DELETE** `/admin/users/{id}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 9. Restore User
**PATCH** `/admin/users/{id}/restore`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "User restored successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Job Management APIs (Job Postings - ATS)

> **SEMANTIC CHANGE**: Jobs = Job Postings (tin tuyển dụng), không phải "job applied". HR/Recruiter tạo job postings để candidates apply.
>
> **Response & security**:
> - **GET /jobs** (list): Trả **summary** — không trả `jobDescription`, `requirements`, `benefits` trong list (tránh payload lớn). Không trả `createdBy`, `updatedBy`, `deletedAt` trong list. Chi tiết đầy đủ dùng **GET /jobs/{id}**.
> - **GET /jobs/{id}** (detail nội bộ): Đủ trường cho HR; `userId`/`companyId`/`createdBy`/`updatedBy` là nội bộ tenant — **không dùng** response này cho API public (candidate). Nếu có **GET public job** (xem tin tuyển trước khi apply) phải dùng DTO riêng: chỉ id, title, position, jobType, location, salary, mô tả, benefits, deadline, companyName, skills — không trả userId, companyId, createdBy, updatedBy, deletedAt, viewsCount, applicationsCount.
> - **POST /jobs**: Không nhận `companyId` từ client — backend set từ JWT (tránh tenant tampering).

### 1. Get All Jobs
**GET** `/jobs`

Lấy danh sách tất cả job postings của company với pagination và filtering. Response dạng **summary** (không có nội dung dài).

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Query Parameters
```
page=0&size=20&sort=createdAt,desc&jobStatus=PUBLISHED&search=developer&isRemote=true
```

#### Response (200 OK) — Summary
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": [
    {
      "id": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
      "title": "Senior Java Developer",
      "position": "Backend Developer",
      "jobType": "FULL_TIME",
      "location": "Mountain View, CA",
      "salaryMin": 120000,
      "salaryMax": 180000,
      "currency": "USD",
      "jobStatus": "PUBLISHED",
      "deadlineDate": "2024-01-25",
      "publishedAt": "2024-01-10T09:00:00Z",
      "expiresAt": "2024-01-25T23:59:59Z",
      "viewsCount": 150,
      "applicationsCount": 25,
      "jobUrl": "https://careers.google.com/jobs/123",
      "isRemote": false,
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-10T09:00:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### 2. Get Job by ID
**GET** `/jobs/{id}`

Lấy thông tin chi tiết một job (dùng trong app nội bộ HR). Response đầy đủ; không dùng cho public/candidate.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "id": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "userId": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "title": "Senior Java Developer",
    "position": "Backend Developer",
    "jobType": "FULL_TIME",
    "location": "Mountain View, CA",
    "salaryMin": 120000,
    "salaryMax": 180000,
    "currency": "USD",
    "jobStatus": "PUBLISHED",
    "deadlineDate": "2024-01-25",
    "publishedAt": "2024-01-10T09:00:00Z",
    "expiresAt": "2024-01-25T23:59:59Z",
    "viewsCount": 150,
    "applicationsCount": 25,
    "jobDescription": "We are looking for a senior Java developer...",
    "requirements": "5+ years of Java experience...",
    "benefits": "Health insurance, 401k, stock options...",
    "jobUrl": "https://careers.google.com/jobs/123",
    "isRemote": false,
    "createdAt": "2024-01-10T09:00:00Z",
    "updatedAt": "2024-01-10T09:00:00Z",
    "createdBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Create New Job Posting
**POST** `/jobs`

Tạo job posting mới (HR/Recruiter tạo tin tuyển dụng).

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Request Body
> **Lưu ý**: Không gửi `companyId` — backend lấy từ JWT (multi-tenant).
```json
{
  "title": "Senior Java Developer",
  "position": "Backend Developer",
  "jobType": "FULL_TIME",
  "location": "Mountain View, CA",
  "salaryMin": 120000,
  "salaryMax": 180000,
  "currency": "USD",
  "jobStatus": "DRAFT",
  "deadlineDate": "2024-01-25",
  "jobDescription": "We are looking for a senior Java developer...",
  "requirements": "5+ years of Java experience...",
  "benefits": "Health insurance, 401k, stock options...",
  "jobUrl": "https://careers.google.com/jobs/123",
  "isRemote": false,
  "skillIds": ["skill1", "skill2", "skill3"]
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "title": "Senior Java Developer",
    "position": "Backend Developer",
    "jobType": "FULL_TIME",
    "location": "Mountain View, CA",
    "salaryMin": 120000,
    "salaryMax": 180000,
    "currency": "USD",
    "jobStatus": "DRAFT",
    "deadlineDate": "2024-01-25",
    "publishedAt": null,
    "expiresAt": null,
    "viewsCount": 0,
    "applicationsCount": 0,
    "isRemote": false,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Update Job
**PUT** `/jobs/{id}`

Cập nhật thông tin job.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Request Body
```json
{
  "title": "Senior Java Developer - Updated",
  "position": "Backend Developer",
  "jobStatus": "PUBLISHED",
  "publishedAt": "2024-01-20T09:00:00Z"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Job updated successfully",
  "data": {
    "id": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "title": "Senior Java Developer - Updated",
    "position": "Backend Developer",
    "jobStatus": "PUBLISHED",
    "publishedAt": "2024-01-20T09:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. Delete Job
**DELETE** `/jobs/{id}`

Xóa job (soft delete).

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Job deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 6. Publish/Unpublish Job Posting
**PATCH** `/jobs/{id}/status`

Publish hoặc unpublish job posting (chuyển từ DRAFT → PUBLISHED, hoặc ngược lại).

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Request Body
```json
{
  "jobStatus": "PUBLISHED",
  "publishedAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2024-02-15T23:59:59Z"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Job status updated successfully",
  "data": {
    "id": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "jobStatus": "PUBLISHED",
    "publishedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-02-15T23:59:59Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 7. Manage Job Skills

**GET** `/jobs/{jobId}/skills`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Job skills retrieved successfully",
  "data": [
    {
      "id": "f8g9h0i1-2j3k-4l5m-6n7o-p8q9r0s1t2u3",
      "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
      "skillId": "a3e6e84c-5f21-4c4d-8d7d-4a38e9ab6f52",
      "name": "Java",
      "category": "PROGRAMMING",
      "isRequired": true,
      "proficiencyLevel": "ADVANCED",
      "createdAt": "2024-01-10T10:30:00Z",
      "updatedAt": "2024-01-10T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**POST** `/jobs/{jobId}/skills`

#### Request Body
```json
{
  "skillId": "b7e58a6e-5c5e-4de8-9a3f-6b1ae2d042b5",
  "isRequired": true,
  "proficiencyLevel": "INTERMEDIATE"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Job skill added successfully",
  "data": {
    "id": "f8g9h0i1-2j3k-4l5m-6n7o-p8q9r0s1t2u3",
    "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "skillId": "b7e58a6e-5c5e-4de8-9a3f-6b1ae2d042b5",
    "name": "Spring Boot",
    "category": "FRAMEWORK",
    "isRequired": true,
    "proficiencyLevel": "INTERMEDIATE",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**PATCH** `/jobs/{jobId}/skills/{skillId}`

#### Request Body
```json
{
  "isRequired": false,
  "proficiencyLevel": "ADVANCED"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Job skill updated successfully",
  "data": {
    "id": "f8g9h0i1-2j3k-4l5m-6n7o-p8q9r0s1t2u3",
    "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "skillId": "b7e58a6e-5c5e-4de8-9a3f-6b1ae2d042b5",
    "name": "Spring Boot",
    "category": "FRAMEWORK",
    "isRequired": false,
    "proficiencyLevel": "ADVANCED",
    "createdAt": "2024-01-10T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**DELETE** `/jobs/{jobId}/skills/{skillId}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Job skill removed",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### ~~8. Manage Job Resumes~~ ❌ **REMOVED**

> **Lý do**: Modern ATS không cần bảng riêng cho resumes. CVs được lưu trong `attachments` table:
> - **Workflow chính**: Candidates tự upload CV qua public API `/public/jobs/{jobId}/apply`
> - **Workflow phụ**: HR upload CV thủ công khi nhận qua email

## Applications Management APIs (CORE ATS) ➕

> **CORE**: Applications là core entity của ATS. **Modern ATS = Candidate Self-Service Portal**: Candidates tự apply online qua trang công ty mà không cần login. HR/Recruiter quản lý applications qua workflow (APPLIED → SCREENING → INTERVIEW → OFFER → HIRED/REJECTED).
> 
> **Workflow chính**: Candidate Self-Service (apply online, upload CV/attachments)  
> **Workflow phụ**: HR manual upload (khi nhận CV qua email)

### Public APIs (Candidate Self-Service - Không cần Authentication)

#### 0. Get Public Jobs (List - Career Page / Job Board)
**GET** `/public/jobs`

Lấy danh sách job **đang tuyển** (PUBLISHED, chưa hết hạn). Dùng cho career page, job board — **không cần login**.

> **Phân tích thiết kế**
>
> **Tại sao public?**
> - Candidate cần **xem tin tuyển** trước khi apply. Nếu bắt login mới xem → friction cao, mất ứng viên.
> - Career page của công ty thường public: `/careers` hoặc `/jobs` — embed từ API này.
> - Job board tổng hợp (nhiều công ty) cũng dùng API này với filter `companyId` (optional).
>
> **Khác gì GET /jobs (private)?**
> | | **GET /jobs** (private) | **GET /public/jobs** (public) |
> |--|------------------------|-------------------------------|
> | Auth | Cần JWT | Không cần |
> | Scope | Chỉ company của user (multi-tenant) | Tất cả company (hoặc filter companyId) |
> | Job status | DRAFT, PUBLISHED, PAUSED, CLOSED, FILLED | **Chỉ PUBLISHED** |
> | Điều kiện | deleted_at IS NULL | + deadline chưa hết, expires_at chưa hết, company active |
> | Response | jobStatus, applicationsCount, audit fields | **Không có** — chỉ thông tin candidate cần |
>
> **Bảo mật & privacy**
> - Không trả: `userId`, `createdBy`, `updatedBy`, `deletedAt`, `jobStatus` (nội bộ)
> - Không trả: `applicationsCount`, `viewsCount` (tuỳ product — có thể expose cho social proof)
> - Chỉ trả: title, position, location, salary, description, benefits, companyName, skills — đủ để candidate quyết định apply

#### Request (Query params - tất cả optional)
| Param | Type | Mô tả |
|-------|------|-------|
| `companyId` | string | Lọc job của 1 công ty (career page) |
| `search` | string | Tìm theo title, position |
| `jobType` | enum | FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE |
| `isRemote` | boolean | Lọc remote |
| `location` | string | Địa điểm (contains) |
| `page` | int | Trang (default 0) |
| `size` | int | Số item/trang (default 20) |

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": [
    {
      "id": "job-uuid",
      "title": "Senior Backend Engineer",
      "position": "Backend Developer",
      "jobType": "FULL_TIME",
      "location": "Ho Chi Minh City",
      "salaryMin": 30000000,
      "salaryMax": 50000000,
      "currency": "VND",
      "deadlineDate": "2024-02-15",
      "companyId": "company-uuid",
      "companyName": "Acme Corp",
      "publishedAt": "2024-01-10T09:00:00",
      "isRemote": false,
      "jobUrl": "https://careers.acme.com/jobs/123"
    }
  ],
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 45,
    "totalPages": 3
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 0b. Get Public Job Detail
**GET** `/public/jobs/{id}`

Chi tiết 1 job đang tuyển — dùng cho trang job detail trước khi apply.

> **Điều kiện**: Job phải PUBLISHED, chưa hết hạn, company active. Nếu không → 404.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Job detail retrieved successfully",
  "data": {
    "id": "job-uuid",
    "title": "Senior Backend Engineer",
    "position": "Backend Developer",
    "jobType": "FULL_TIME",
    "location": "Ho Chi Minh City",
    "salaryMin": 30000000,
    "salaryMax": 50000000,
    "currency": "VND",
    "deadlineDate": "2024-02-15",
    "companyId": "company-uuid",
    "companyName": "Acme Corp",
    "companyWebsite": "https://acme.com",
    "publishedAt": "2024-01-10T09:00:00",
    "isRemote": false,
    "jobUrl": "https://careers.acme.com/jobs/123",
    "jobDescription": "We are looking for...",
    "requirements": "5+ years experience...",
    "benefits": "Competitive salary, health insurance...",
    "skills": [
      {"name": "Java", "isRequired": true, "proficiencyLevel": "ADVANCED"},
      {"name": "Spring Boot", "isRequired": true, "proficiencyLevel": "INTERMEDIATE"}
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 1. Apply to Job (Public - Candidate Self-Service)
**POST** `/public/jobs/{jobId}/apply`

Candidates tự apply online mà không cần login. Đây là **workflow chính** của Modern ATS.

> **Public endpoint**: Không yêu cầu `Authorization` header.  
> **Security**: Rate limiting, CAPTCHA (optional), email verification token

#### Request Headers
```
Content-Type: multipart/form-data
```

#### Request Body (Form Data)
```
candidateName: "John Doe"
candidateEmail: "john.doe@example.com"
candidatePhone: "+1234567890"
coverLetter: "I am interested in this position..."
resume: <file> (PDF - max 5B) [REQUIRED]
```

> **Lưu ý về Attachments:**
> - **Khi apply**: Chỉ upload CV (resume) - đây là bắt buộc
> - **Không upload** certificates/portfolio khi apply lần đầu
> - **Sau khi apply**: Nếu HR yêu cầu thêm documents (khi status = screening/interview), candidate sẽ upload qua API `/public/applications/{applicationToken}/attachments`

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Đơn ứng tuyển đã được gửi thành công! Chúng tôi sẽ liên hệ với bạn qua email.",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

> **Lưu ý**: 
> - Response đơn giản, không expose thông tin không cần thiết
> - Candidate đã biết jobTitle, candidateName, email (họ vừa submit)
> - Application được tạo với `status = applied` (default) tự động
> - Email confirmation được gửi sau đó với `applicationToken` để candidate track status
> - CV scoring được xử lý trong background (2-3 giây), không cần trả về trong response

> **Lưu ý**: 
> - Application được tạo với `status = applied` (default) tự động
> - `created_by` = NULL (candidate không có account)
> - Email confirmation được gửi đến candidate
> - Application token cho phép candidate track status mà không cần login
> - **CV Scoring**: CV được xử lý **synchronous** (2-3 giây) → Match score có ngay trong response
> - `matchScore = null` nếu parsing failed hoặc chưa có CV

> **CV Scoring Process (Synchronous - 2-3 giây)**:
> 
> Sau khi upload CV, system tự động tính match score ngay trong request:
> 1. **PDF Parsing**: Extract text từ CV (PDF) → ~1-2 giây
> 2. **Load Job Skills**: Query `job_skills` table → ~100ms
> 3. **Skill Matching**: Normalize, tokenize, match skills → ~500ms
> 4. **Score Calculation**: Tính điểm (0-100) → ~100ms
> 5. **Save Results**: Lưu `matchScore` và breakdown vào response
> 
> **Total**: ~2-3 giây (sync processing, không cần async)
> 
> **Response**:
> - `matchScore`: Integer 0-100 (hoặc `null` nếu failed)
> - `matchScoreDetails`: Breakdown skills (hoặc `null` nếu failed)

#### 2. Upload Additional Attachments (Public - HR Request Only)
**POST** `/public/applications/{applicationToken}/attachments`

Candidates chỉ có thể upload thêm attachments (certificates, portfolio) **khi HR yêu cầu** trong quá trình review.

> **Public endpoint**: Chỉ cần `applicationToken` (không phải JWT), không cần login

> **Business Logic - Chỉ cho phép upload khi HR đã yêu cầu:**
> 
> **Điều kiện upload:**
> - Application status phải là: `screening` hoặc `interview` (HR đang review)
> - **VÀ** `allow_additional_uploads = true` (HR đã set flag yêu cầu documents)
> 
> **Workflow:**
> 1. Candidate apply → Upload CV (RESUME) - **Bắt buộc khi apply**
>    - `allow_additional_uploads = false` (mặc định)
> 2. HR review → Status chuyển sang screening/interview
> 3. HR yêu cầu thêm documents → Set `allow_additional_uploads = true` (qua API hoặc UI)
>    - HR có thể set flag này khi:
>      - Comment với `requestDocuments = true`
>      - Hoặc qua API `PATCH /applications/{id}` với `allowAdditionalUploads: true`
> 4. Candidate thấy flag được bật → Upload thêm documents qua API này
> 5. Sau khi upload xong → HR có thể set `allow_additional_uploads = false` để tắt
> 
> **Lý do**: 
> - Tránh spam upload, chỉ upload khi HR thực sự yêu cầu
> - HR có control hoàn toàn về việc khi nào cho phép upload
> - Candidate không thể tự ý upload khi chỉ thấy status = screening/interview

#### Request Headers
```
Content-Type: multipart/form-data
```

#### Request Body (Form Data)
```
file: <file>
attachmentType: CERTIFICATE | PORTFOLIO | OTHER
description: "AWS Certification"
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Attachment uploaded successfully",
  "data": {
    "id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
    "publicId": "jobtracker_ats/applications/app_1/cv/file_public_id",
    "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "filename": "aws_certificate.pdf",
    "attachmentType": "CERTIFICATE",
    "fileSize": 256000,
    "uploadedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Error Responses

**403 Forbidden** - Không cho phép upload (status không đúng hoặc HR chưa yêu cầu)
```json
{
  "success": false,
  "message": "Cannot upload attachments. HR has not requested additional documents yet. Please wait for HR to request documents before uploading.",
  "errors": [
    {
      "field": "allowAdditionalUploads",
      "message": "Attachments can only be uploaded when: 1) Application status is SCREENING or INTERVIEWING, AND 2) HR has set allowAdditionalUploads = true. Current status: NEW, allowAdditionalUploads: false"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**403 Forbidden** - Status không đúng (không phải SCREENING/INTERVIEW)
```json
{
  "success": false,
  "message": "Upload is not allowed for this application",
  "errors": [
    {
      "field": "applicationStatus",
      "message": "Attachments can only be uploaded when application status is SCREENING or INTERVIEW (e.g. screening, interview). Current status: offer"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**404 Not Found** - Application token không hợp lệ
```json
{
  "success": false,
  "message": "Application not found",
  "errors": [
    {
      "field": "applicationToken",
      "message": "Invalid application token"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 3. Track Application Status (Public)
**GET** `/public/applications/{applicationToken}/status`

Candidates có thể track status của application bằng token (không cần login). 

> **Lưu ý**: API này **KHÔNG** trả về match score, missing skills, hoặc các thông tin nội bộ. Chỉ trả về thông tin cần thiết cho candidate.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application status retrieved successfully",
  "data": {
    "id": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "jobTitle": "Senior Java Developer",
    "candidateName": "John Doe",
    "candidateEmail": "john.doe@example.com",
    "status": {
      "name": "SCREENING",
      "displayName": "Sàng lọc",
      "color": "#8B5CF6"
    },
    "appliedDate": "2024-01-15",
    "updatedAt": "2024-01-16T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

> **Lưu ý**: 
> - **KHÔNG** trả về `matchScore`, `matchScoreDetails`, `missingSkills` - đây là thông tin nội bộ cho HR
> - Chỉ trả về thông tin cần thiết: status, job title, applied date
> - Candidates không cần biết điểm số hay thiếu skill gì

### Protected APIs (HR/Recruiter Management - Yêu cầu Authentication)

### 1. Get All Applications
**GET** `/applications`

Lấy danh sách tất cả applications của company với pagination và filtering. Hỗ trợ filter/sort theo match score.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Query Parameters
```
page=0&size=20&sort=appliedDate,desc&status=NEW&jobId=xxx&assignedTo=xxx&search=john
&sortBy=matchScore&sortOrder=desc&minMatchScore=50&maxMatchScore=100
```

**Query Parameters:**
- `page`: Page number (default: 0)
- `size`: Page size (default: 20)
- `sort`: Sort field và direction (default: `appliedDate,desc`)
  - Available fields: `appliedDate`, `matchScore`, `candidateName`, `createdAt`
- `status`: Filter by application status name (applied, screening, interview, offer, hired, rejected)
- `jobId`: Filter by job ID
- `assignedTo`: Filter by assigned HR/Recruiter user ID
- `search`: Search by candidate name or email
- `sortBy`: Sort by field (optional, overrides `sort` param)
  - `matchScore`: Sort by match score (highest first)
  - `appliedDate`: Sort by applied date
- `sortOrder`: `asc` or `desc` (default: `desc`)
- `minMatchScore`: Filter applications với match score >= value (0-100)
- `maxMatchScore`: Filter applications với match score <= value (0-100)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Applications retrieved successfully",
  "data": [
    {
      "id": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
      "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
      "candidateName": "John Doe",
      "candidateEmail": "john.doe@example.com",
      "candidatePhone": "+1234567890",
      "statusId": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "status": {
      "id": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "name": "NEW",
      "displayName": "Mới",
      "color": "#3B82F6"
    },
      "source": "Email",
      "appliedDate": "2024-01-15",
      "resumeFilePath": "/applications/app1/resume.pdf",
      "coverLetter": "I am interested in this position...",
      "notes": "Strong candidate, good fit",
      "rating": 4,
      "assignedTo": "user1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "assignedToName": "Jane Recruiter",
      "matchScore": 82,
      "matchScoreDetails": {
        "matchedRequiredCount": 3,
        "totalRequiredCount": 4,
        "matchedOptionalCount": 2,
        "totalOptionalCount": 5,
        "matchedRequiredSkills": ["Java", "Spring Boot", "MySQL"],
        "missingRequiredSkills": ["Docker"],
        "matchedOptionalSkills": ["Git", "JUnit"],
        "missingOptionalSkills": ["AWS", "Redis", "Kubernetes"]
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### 2. Get Application by ID
**GET** `/applications/{id}`

Lấy thông tin chi tiết một application, bao gồm full match score breakdown.

> **Match Score Details**: Response bao gồm đầy đủ thông tin về CV scoring:
> - `matchScore`: Điểm khớp (0-100)
> - `matchScoreDetails`: Breakdown chi tiết skills matched/missing

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application retrieved successfully",
  "data": {
    "id": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "jobTitle": "Senior Java Developer",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "candidateName": "John Doe",
    "candidateEmail": "john.doe@example.com",
    "candidatePhone": "+1234567890",
    "statusId": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "status": {
      "id": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "name": "NEW",
      "displayName": "Mới",
      "color": "#3B82F6"
    },
    "source": "Email",
    "appliedDate": "2024-01-15",
    "resumeFilePath": "/applications/app1/resume.pdf",
    "coverLetter": "I am interested in this position...",
    "notes": "Strong candidate, good fit",
    "rating": 4,
    "assignedTo": "user1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "assignedToName": "Jane Recruiter",
    "matchScore": 82,
    "matchScoreDetails": {
      "matchedRequiredCount": 3,
      "totalRequiredCount": 4,
      "matchedOptionalCount": 2,
      "totalOptionalCount": 5,
      "matchedRequiredSkills": ["Java", "Spring Boot", "MySQL"],
      "missingRequiredSkills": ["Docker"],
      "matchedOptionalSkills": ["Git", "JUnit"],
      "missingOptionalSkills": ["AWS", "Redis", "Kubernetes"]
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

> **Match Score Breakdown Explanation**:
> - **matchScore**: 82/100 - Điểm khớp tổng thể giữa CV và Job Description
> - **matchedRequiredCount**: 3/4 - Đã match 3 trong 4 required skills
> - **matchedOptionalCount**: 2/5 - Đã match 2 trong 5 optional skills
> - **matchedRequiredSkills**: Danh sách required skills đã tìm thấy trong CV
> - **missingRequiredSkills**: Danh sách required skills chưa tìm thấy trong CV (cần cải thiện)
> - **matchedOptionalSkills**: Danh sách optional skills đã tìm thấy trong CV
> - **missingOptionalSkills**: Danh sách optional skills chưa tìm thấy trong CV
> 
> **Cách tính score**:
> - Required skills: 3/4 = 75% (weight: 70%)
> - Optional skills: 2/5 = 40% (weight: 30%)
> - Final score: (75 × 0.7) + (40 × 0.3) = 52.5 + 12 = 64.5 → **82** (rounded)

### 3. Create Application (Manual Entry - HR Workflow)
**POST** `/applications`

HR/Recruiter tạo application thủ công khi nhận CV qua email. Đây là **workflow phụ** (backup workflow), không phải workflow chính.

> **Protected endpoint**: Yêu cầu `Authorization: Bearer <access_token>`  
> **Use case**: HR nhận CV qua email → Upload vào system thủ công → Tạo application

#### Request Body
```json
{
  "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
  "candidateName": "John Doe",
  "candidateEmail": "john.doe@example.com",
  "candidatePhone": "+1234567890",
  "statusId": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
  "source": "Email",
  "appliedDate": "2024-01-15",
  "coverLetter": "I am interested in this position...",
  "notes": "Received via email"
}
```

> **Lưu ý**:
> - Khi tạo application thủ công, CV không đi kèm trong request body
> - HR sẽ upload CV dưới dạng `attachment` (với `attachmentType = RESUME`)
> - Khi upload CV thành công, hệ thống tự cập nhật trường `resumeFilePath` cho application

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Application created successfully",
  "data": {
    "id": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "candidateName": "John Doe",
    "candidateEmail": "john.doe@example.com",
    "statusId": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "status": {
      "id": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "name": "NEW",
      "displayName": "Mới",
      "color": "#3B82F6"
    },
    "appliedDate": "2024-01-15",
    "matchScore": null,
    "matchScoreDetails": null,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```


### 4. Update Application Status
**PATCH** `/applications/{id}/status`

Cập nhật status của application (workflow: APPLIED → SCREENING → INTERVIEW → OFFER → HIRED/REJECTED).

#### Request Body
```json
{
  "statusId": "status2a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
  "notes": "Moved to screening phase",
  "customMessage": "Tin nhắn cá nhân gửi cho ứng viên (optional)",
  "offerRequest": {
    "...": "Trường chi tiết offer nếu status type = OFFER (xem phần Offer API)"
  },
  "sendEmailToCandidate": true
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application status updated successfully",
  "data": {
    "id": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "statusId": "status2a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "previousStatus": "NEW",
    "notes": "Moved to screening phase",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

> **Tóm tắt workflow (Applications & Statuses)**  
> - Khi tạo application (auto/public hoặc HR tạo thủ công), hệ thống chọn `status_id` default theo pipeline của company và ghi một bản ghi vào `application_status_history` (fromStatus = null, toStatus = default).  
> - Khi HR cập nhật status qua `PATCH /applications/{id}/status`, hệ thống kiểm tra status hợp lệ cho company, cập nhật `applications.status_id` và thêm một bản ghi mới vào `application_status_history`.  

#### Business rule (lifecycle)

- **Lifecycle chuẩn theo `StatusType`**:  
  - APPLIED → SCREENING → INTERVIEW → OFFER → HIRED  
  - Từ **bất kỳ stage nào** có thể chuyển sang **REJECTED**.  
- **Không thể đi tiếp từ trạng thái kết thúc**:  
  - Nếu status hiện tại có `statusType = HIRED` hoặc `REJECTED` → không được chuyển sang status khác.  
- **Không đi ngược lifecycle**:  
  - Không cho phép chuyển từ stage có `StatusType` order cao về stage có order thấp (ví dụ OFFER → INTERVIEW, SCREENING → APPLIED).  

#### Không phụ thuộc UI (sort_order chỉ để hiển thị)

- `sortOrder` **chỉ dùng để sắp xếp hiển thị** pipeline trong UI từng company.  
- Logic lifecycle **không dựa vào `sortOrder`** mà dựa vào `statusType.order` trong enum `StatusType`.  
- Company có thể **reorder pipeline** (đổi `sortOrder`, đổi `displayName`, đổi `color`) mà **không ảnh hưởng** tới business rule lifecycle nêu trên.

#### Multi-tenant safe

- Khi update status của một application, backend luôn kiểm tra:  
  - Status mới phải thuộc **cùng company** với application, hoặc là **system default** (`company_id IS NULL`) được clone cho company đó.  
  - **Không thể** dùng status của company khác trong pipeline của mình.  

### 5. Assign Application to Recruiter
**PATCH** `/applications/{id}/assign`

Assign application cho HR/Recruiter để xử lý.

#### Request Body
```json
{
  "assignedTo": "user1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application assigned successfully",
  "data": {
    "id": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "assignedTo": "user1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "assignedToName": "Jane Recruiter",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 6. Update Application Details
**PUT** `/applications/{id}`

Cập nhật thông tin application (notes, rating, allowAdditionalUploads, etc.).

#### Request Body
```json
{
  "notes": "Updated notes after phone screening",
  "rating": 5,
  "coverLetter": "Updated cover letter",
  "allowAdditionalUploads": true
}
```

> **Lưu ý về `allowAdditionalUploads`:**
> - HR set `allowAdditionalUploads = true` khi yêu cầu candidate upload thêm documents.  
> - Candidate chỉ có thể upload khi backend cho phép theo các rule nội bộ (trạng thái phù hợp + `allowAdditionalUploads` bật).  
> - Sau khi candidate upload xong và HR đã review, có thể set `allowAdditionalUploads = false` để tắt cửa upload thêm.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application updated successfully",
  "data": {
    "id": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "notes": "Updated notes after phone screening",
    "rating": 5,
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 7. Delete Application
**DELETE** `/applications/{id}`

Soft delete application.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 8. Get Application Status History
**GET** `/applications/{id}/status-history`

Lấy lịch sử thay đổi status của application.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Status history retrieved successfully",
  "data": [
    {
      "id": "hist1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "fromStatusId": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "fromStatus": {
        "id": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
        "name": "NEW",
        "displayName": "Mới",
        "color": "#3B82F6"
      },
      "toStatusId": "status2a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "toStatus": {
        "id": "status2a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
        "name": "SCREENING",
        "displayName": "Sàng lọc",
        "color": "#8B5CF6"
      },
      "changedBy": "user1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "changedByName": "Jane Recruiter",
      "notes": "Moved to screening phase",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Company Management APIs

> **Phân quyền**:
> - **GET /companies** (list tất cả): Chỉ **SYSTEM_ADMIN**. Company Admin chỉ xem được company của mình qua **GET /companies/{id}** (với id từ JWT/context).
> - Company được tạo duy nhất qua **POST /auth/register** (self-signup: company + admin cùng lúc). Không có endpoint POST /companies.
> - **GET/PUT/DELETE /companies/{id}**: SYSTEM_ADMIN (bất kỳ company) hoặc ADMIN_COMPANY (chỉ company của mình).
> - **PATCH /companies/{id}/verify**: Chỉ **SYSTEM_ADMIN** — set trạng thái verified của company.
>
> **Tiêu chí Verified (cho Admin)**  
> `isVerified` là quyết định **thủ công** của SYSTEM_ADMIN, không có công thức tự động. Admin nên set verified sau khi đánh giá theo checklist (tuỳ quy định nội bộ), ví dụ:
> - Đã xác minh thông tin công ty (giấy phép kinh doanh / trụ sở / website hợp lệ).
> - Đã ký hợp đồng / thanh toán (nếu áp dụng).
> - Email/liên hệ công ty đã xác thực, không phải tài khoản giả mạo.
>  
> Khi đạt đủ điều kiện → gọi **PATCH /companies/{id}/verify** với `"isVerified": true`. Bỏ verified: gửi `"isVerified": false`.  
> *(Sau này có thể bổ sung rule tự động, ví dụ: verified khi có subscription ACTIVE + plan trả phí.)*

### 1. Get All Companies
**GET** `/companies`

Lấy danh sách tất cả companies. **Chỉ SYSTEM_ADMIN.**

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Query Parameters
```
page=0&size=20&sort=name,asc&industry=Technology&search=Google
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
      "name": "Google",
      "website": "https://google.com",
      "industry": "Technology",
      "size": "LARGE",
      "location": "Mountain View, CA",
      "description": "Google is a multinational technology company...",
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "createdBy": null,
      "updatedBy": null,
      "deletedAt": null
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### 2. Get Company by ID
**GET** `/companies/{id}`

Trả về thông tin chi tiết cùng metadata audit.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Company retrieved successfully",
  "data": {
    "id": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "name": "Google",
    "website": "https://google.com",
    "industry": "Technology",
    "size": "LARGE",
    "location": "Mountain View, CA",
    "description": "Google is a multinational technology company...",
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": null,
    "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Update Company
**PUT** `/companies/{id}`

#### Request Body
- `isVerified` không được gửi từ client — chỉ SYSTEM_ADMIN set qua admin API.
```json
{
  "website": "https://newtech.com",
  "industry": "Technology",
  "size": "LARGE",
  "location": "Remote",
  "description": "Updated description"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Company updated successfully",
  "data": {
    "id": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "name": "Google",
    "website": "https://newtech.com",
    "industry": "Technology",
    "size": "LARGE",
    "location": "Remote",
    "description": "Updated description",
    "isVerified": true,
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Delete Company (Soft Delete)
**DELETE** `/companies/{id}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Company deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. Set Company Verified (Admin)
**PATCH** `/companies/{id}/verify`

Chỉ **SYSTEM_ADMIN**. Dùng để set/bỏ trạng thái verified của company (badge "Verified employer").

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Request Body
```json
{
  "isVerified": true
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Company updated successfully",
  "data": {
    "id": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "name": "Google",
    "website": "https://google.com",
    "industry": "Technology",
    "size": "LARGE",
    "location": "Mountain View, CA",
    "description": "Google is a multinational technology company...",
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": null,
    "updatedBy": null,
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Subscription Management APIs (Lookup + History) ➕

> **Thiết kế sau refactor**: Subscription KHÔNG còn là ENUM hay field trong `companies`.  
> Thay vào đó:
> - `subscription_plans`: catalog gói hệ thống (FREE, BASIC, PRO, ENTERPRISE, ...), có metadata (price, duration_days, max_jobs, max_users, max_applications, is_active).  
> - `company_subscriptions`: history theo thời gian cho từng company (plan_id, start_date, end_date, status = PENDING/ACTIVE/EXPIRED/CANCELLED).

### SubscriptionPlan APIs (System Catalog)

#### 1. Get Subscription Plans

**GET** `/admin/subscription-plans`

Lấy danh sách tất cả gói subscription mà hệ thống hỗ trợ (dùng cho UI chọn gói, pricing page, v.v.).

##### Request Headers
```
Authorization: Bearer <access_token>
```

> Thường chỉ **SYSTEM_ADMIN** mới được phép quản lý/nhìn toàn bộ plans.  
> **Lookup/config data → trả về List, không paginate.**

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Subscription plans retrieved successfully",
  "data": [
    {
      "id": "plan-free-uuid",
      "code": "FREE",
      "name": "Free",
      "price": 0.0,
      "durationDays": 0,
      "maxJobs": 5,
      "maxUsers": 3,
      "maxApplications": 100,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "plan-pro-uuid",
      "code": "PRO",
      "name": "Pro",
      "price": 49.0,
      "durationDays": 30,
      "maxJobs": 50,
      "maxUsers": 20,
      "maxApplications": 5000,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
}
```

#### 2. Create Subscription Plan

**POST** `/admin/subscription-plans`

Tạo một subscription plan mới trong hệ thống (catalog level).

##### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

##### Request Body
```json
{
  "code": "PRO",
  "name": "Pro",
  "price": 49.0,
  "durationDays": 30,
  "maxJobs": 50,
  "maxUsers": 20,
  "maxApplications": 5000,
  "isActive": true
}
```

##### Response (201 Created)
```json
{
  "success": true,
  "message": "Subscription plan created successfully",
  "data": {
    "id": "plan-pro-uuid",
    "code": "PRO",
    "name": "Pro",
    "price": 49.0,
    "durationDays": 30,
    "maxJobs": 50,
    "maxUsers": 20,
    "maxApplications": 5000,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 3. Get Subscription Plan by ID

**GET** `/admin/subscription-plans/{id}`

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Subscription plan detail retrieved successfully",
  "data": {
    "id": "plan-pro-uuid",
    "code": "PRO",
    "name": "Pro",
    "price": 49.0,
    "durationDays": 30,
    "maxJobs": 50,
    "maxUsers": 20,
    "maxApplications": 5000,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 4. Update Subscription Plan

**PUT** `/admin/subscription-plans/{id}`

##### Request Body
```json
{
  "name": "Pro (Updated)",
  "price": 59.0,
  "durationDays": 30,
  "maxJobs": 100,
  "maxUsers": 50,
  "maxApplications": 10000,
  "isActive": true
}
```

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Subscription plan updated successfully",
  "data": {
    "id": "plan-pro-uuid",
    "code": "PRO",
    "name": "Pro (Updated)",
    "price": 59.0,
    "durationDays": 30,
    "maxJobs": 100,
    "maxUsers": 50,
    "maxApplications": 10000,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-16T09:00:00Z"
  },
  "timestamp": "2024-01-16T09:00:00Z"
}
```

#### 5. Deactivate Subscription Plan

**DELETE** `/admin/subscription-plans/{id}`

> Thay vì xóa cứng, plan sẽ được mark `isActive = false` để giữ lịch sử billing.

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Subscription plan deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### CompanySubscription APIs (Per-company History)

#### 1. Create Company Subscription (Admin)

**POST** `/admin/company-subscriptions`

Tạo một subscription record cho company (ví dụ: khi upgrade/downgrade plan).

##### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

##### Request Body
```json
{
  "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
  "planId": "plan-pro-uuid",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "status": "PENDING"
}
```

##### Response (201 Created)
```json
{
  "success": true,
  "message": "Company subscription created successfully",
  "data": {
    "id": "sub-uuid-1",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "planId": "plan-pro-uuid",
    "planCode": "PRO",
    "planName": "Pro",
    "status": "ACTIVE",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 2. Get CompanySubscription by ID (Admin)

**GET** `/admin/company-subscriptions/{id}`

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Company subscription detail retrieved successfully",
  "data": {
    "id": "sub-uuid-1",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "planId": "plan-pro-uuid",
    "planCode": "PRO",
    "planName": "Pro",
    "status": "ACTIVE",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 3. Get All CompanySubscriptions (Admin)

**GET** `/admin/company-subscriptions`

##### Query Parameters
```
page=0&size=20&sort=startDate,desc
```

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Company subscriptions retrieved successfully",
  "data": [
    {
      "id": "sub-uuid-1",
      "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
      "planId": "plan-pro-uuid",
      "planCode": "PRO",
      "planName": "Pro",
      "status": "ACTIVE",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### 4. Get Company Active Subscription (Per-company)

**GET** `/companies/{companyId}/subscription`

Lấy **subscription hiện tại** (ACTIVE) của một company, kèm thông tin gói.

##### Request Headers
```
Authorization: Bearer <access_token>
```

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Company subscription retrieved successfully",
  "data": {
    "id": "sub-uuid-1",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "planId": "plan-pro-uuid",
    "planCode": "PRO",
    "planName": "Pro",
    "status": "ACTIVE",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

##### Response khi chưa có subscription (404 Not Found)
```json
{
  "success": false,
  "message": "Company subscription not found",
  "errors": [
    {
      "field": "companyId",
      "message": "No active subscription for this company"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 5. Get Company Subscription History

**GET** `/companies/{companyId}/subscriptions`

Lấy toàn bộ lịch sử subscription của company (phục vụ billing/audit/reporting).

##### Request Headers
```
Authorization: Bearer <access_token>
```

##### Query Parameters
```
page=0&size=20&status=ACTIVE&sort=startDate,desc
```

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Company subscription history retrieved successfully",
  "data": [
    {
      "id": "sub-uuid-1",
      "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
      "planId": "plan-pro-uuid",
      "planCode": "PRO",
      "planName": "Pro",
      "status": "ACTIVE",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    },
    {
      "id": "sub-uuid-0",
      "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
      "planId": "plan-free-uuid",
      "planCode": "FREE",
      "planName": "Free",
      "status": "EXPIRED",
      "startDate": "2023-10-01T00:00:00Z",
      "endDate": "2023-12-31T23:59:59Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1
  }
}
```

### Payment APIs (Billing Transactions – VNPAY ready)

> Các API này dùng để khởi tạo và tra cứu giao dịch thanh toán cho subscription.  
> Không bind cứng vào VNPAY, nhưng đã đủ field để map `vnp_TxnRef`, `vnp_ResponseCode`, payload callback.

#### 1. Init Payment (tạo URL VNPAY)

**POST** `/admin/payments`

Tạo bản ghi `payment` trạng thái `INIT` và build URL redirect sang VNPAY.

##### Request Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

##### Request Body

```json
{
  "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
  "companySubscriptionId": "sub1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
  "amount": 490000,
  "currency": "VND",
  "gateway": "VNPAY",
  "txnRef": null
}
```

- **companyId**: Company trả tiền (tenant).
- **companySubscriptionId**: Bản ghi subscription (plan + thời gian) mà payment này trả cho.
- **amount**: Số tiền (DECIMAL), backend sẽ nhân `x100` để gửi cho VNPAY.
- **currency**: Mặc định `VND` nếu bỏ trống.
- **gateway**: Mặc định `"VNPAY"` nếu bỏ trống.
- **txnRef**: Nếu null, backend tự sinh mã unique (dùng để map với `vnp_TxnRef`).

##### Response (201 Created)

```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "id": "pay1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "companySubscriptionId": "sub1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "amount": 490000,
    "currency": "VND",
    "gateway": "VNPAY",
    "txnRef": "A1B2C3D4E5F6G7H8I9J0",
    "status": "INIT",
    "paidAt": null,
    "metadata": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

Trong thực tế FE sẽ dùng thêm field `paymentUrl` (từ controller/service) để redirect sang VNPAY:

```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "payment": {
      "id": "pay1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
      "companySubscriptionId": "sub1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "amount": 490000,
      "currency": "VND",
      "gateway": "VNPAY",
      "txnRef": "A1B2C3D4E5F6G7H8I9J0",
      "status": "INIT",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...&vnp_TxnRef=A1B2C3D4E5F6G7H8I9J0&vnp_SecureHash=..."
  },
  "timestamp": "2024-01-15T10:00:00Z"
}
```

> **Mapping quan trọng**:
> - `payments.txn_ref` ⇔ `vnp_TxnRef`
> - `payments.gateway` = `"VNPAY"`
> - `payments.status` từ `INIT` → `SUCCESS/FAILED` sau callback.

#### 2. VNPAY Return URL (Frontend redirect)

**GET** `/payments/vnpay/return`

Endpoint này dùng làm `vnp_ReturnUrl` để VNPAY redirect browser về sau khi user thanh toán xong.

- Nhận toàn bộ query params từ VNPAY (`vnp_Amount`, `vnp_BankCode`, `vnp_ResponseCode`, `vnp_TxnRef`, `vnp_SecureHash`, ...).
- Verify chữ ký:
  - Bỏ `vnp_SecureHashType`, `vnp_SecureHash` khỏi map.
  - Tính lại hash bằng secretKey (`VnPayConfig.hashAllFields`) và so sánh với `vnp_SecureHash`.
- Lấy `vnp_TxnRef` → tìm `payments` theo `txn_ref`.
- Nếu:
  - Chữ ký hợp lệ **và** `vnp_ResponseCode = "00"`:
    - Cập nhật:
      - `payments.status = SUCCESS`
      - `payments.paid_at = NOW()`
      - `payments.metadata = full JSON payload từ VNPAY`
      - (tuỳ logic sau này) cập nhật `company_subscriptions.status` từ `PENDING` → `ACTIVE`.
  - Ngược lại:
    - `payments.status = FAILED`
    - `payments.metadata` vẫn lưu payload để debug.

API response có thể đơn giản là redirect sang FE (SPA) với query `status=success|failed`, nên docs chỉ cần mô tả luồng, không bắt buộc trả JSON chuẩn.

#### 3. Get Payment Detail (Admin)

**GET** `/admin/payments/{id}`

##### Response (200 OK)

```json
{
  "success": true,
  "message": "Payment detail retrieved successfully",
  "data": {
    "id": "pay1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "companySubscriptionId": "sub1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "amount": 490000,
    "currency": "VND",
    "gateway": "VNPAY",
    "txnRef": "A1B2C3D4E5F6G7H8I9J0",
    "status": "SUCCESS",
    "paidAt": "2024-01-15T10:05:00Z",
    "metadata": "{\"vnp_ResponseCode\":\"00\",\"vnp_TransactionNo\":\"123456789\"}",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:05:00Z"
  },
  "timestamp": "2024-01-15T10:10:00Z"
}
```

#### 4. List Payments (Admin)

**GET** `/admin/payments?page=0&size=20`

Trả về toàn bộ payments trong hệ thống (phục vụ billing/report).

#### 5. List Payments by Company

**GET** `/companies/{companyId}/payments?page=0&size=20`

Lấy danh sách payment theo từng company.

#### 6. List Payments by Company Subscription

**GET** `/company-subscriptions/{companySubscriptionId}/payments?page=0&size=20`

Lấy lịch sử payments cho một bản ghi subscription cụ thể.

## Lookup Tables APIs

> **CHUYỂN SANG STRING + ENUM ỨNG DỤNG**: Các lookup tables sau đã chuyển sang **string (VARCHAR) trong DB** và **enum ở backend/API**, không cần APIs riêng:
> - **Job Statuses** → Field `jobs.jobStatus` (VARCHAR, các giá trị cố định: DRAFT, PUBLISHED, PAUSED, CLOSED, FILLED)
> - **Job Types** → Field `jobs.jobType` (VARCHAR, các giá trị cố định: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE)
> - **Interview Types** → Field `interviews.interviewType` (VARCHAR, các giá trị cố định: PHONE, VIDEO, IN_PERSON, TECHNICAL, HR, FINAL)
> - **Interview Statuses** → Field `interviews.status` (VARCHAR, các giá trị cố định: SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED)
> - **Interview Results** → Field `interviews.result` (VARCHAR, các giá trị cố định: PASSED, FAILED, PENDING)
> - **Notification Types** → Field `notifications.type` (VARCHAR, các giá trị cố định: APPLICATION_RECEIVED, INTERVIEW_SCHEDULED, etc.)
> - **Notification Priorities** → Field `notifications.priority` (VARCHAR, các giá trị cố định: HIGH, MEDIUM, LOW)
> - **Attachment Types** → Field `attachments.attachmentType` (VARCHAR, các giá trị cố định: RESUME, COVER_LETTER, CERTIFICATE, PORTFOLIO, OTHER)

> **LOOKUP TABLE**: Application Statuses là lookup table vì cần metadata (display_name, color, sort_order, email config) và flexibility:
> - **Application Statuses** → Lookup table `application_statuses` (name: NEW, SCREENING, INTERVIEWING, OFFERED, HIRED, REJECTED; status_type: APPLIED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED; kèm theo `auto_send_email`, `ask_before_send` để điều khiển email automation khi đổi status)

### 1. Get Application Statuses
**GET** `/admin/application-statuses`

Lấy danh sách application statuses của **company hiện tại** cùng metadata (display_name, color, sort_order, statusType, isTerminal, isDefault, autoSendEmail, askBeforeSend) để hiển thị trong UI và điều khiển hành vi email.

> **Application Status = cấu hình pipeline ứng tuyển per company**, không phải ENUM cứng toàn hệ thống.  
> Mỗi company chỉ nhìn/quản lý được pipeline của chính mình; business rule lifecycle & multi-tenant đã được mô tả chi tiết ở API `PATCH /applications/{id}/status`.
>
> **StatusType** (enum `com.jobtracker.jobtracker_app.enums.StatusType`): APPLIED(1), SCREENING(2), INTERVIEW(3), OFFER(4), HIRED(5), REJECTED(99). Logic lifecycle dựa vào `statusType.order`.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application statuses retrieved successfully",
  "data": [
    {
      "id": "status1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "companyId": null,
      "name": "applied",
      "displayName": "Applied",
      "description": "Candidate just applied",
      "color": "#6B7280",
      "statusType": "APPLIED",
      "sortOrder": 1,
      "autoSendEmail": false,
      "askBeforeSend": false,
      "isTerminal": false,
      "isDefault": true,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "createdBy": null,
      "updatedBy": null,
      "deletedAt": null
    },
    {
      "id": "status2a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "companyId": null,
      "name": "screening",
      "displayName": "Screening",
      "description": "Screening in progress",
      "color": "#3B82F6",
      "statusType": "SCREENING",
      "sortOrder": 2,
      "autoSendEmail": false,
      "askBeforeSend": false,
      "isTerminal": false,
      "isDefault": false,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "createdBy": null,
      "updatedBy": null,
      "deletedAt": null
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Create Application Status
**POST** `/admin/application-statuses`

Tạo application status **mới cho company hiện tại** (chỉ dành cho ADMIN_COMPANY/RECRUITER).

**statusType** (bắt buộc): Một trong các giá trị `APPLIED`, `SCREENING`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`. Nếu không truyền `isTerminal`, hệ thống tự set theo `statusType` (HIRED/REJECTED → true).

**Email config per status**:
- `autoSendEmail` (optional, default = `false`): Nếu `true` và client **không** truyền `sendEmail` khi gọi API đổi status, backend sẽ **tự động** gửi email workflow tương ứng (OFFERED/HIRED/REJECTED).
- `askBeforeSend` (optional, default = `false`): Gợi ý cho UI hiển thị popup hỏi HR có gửi email không khi chuyển sang status này (logic UI, backend không enforce).

#### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "screening",
  "displayName": "Sàng lọc",
  "description": "Đang sàng lọc hồ sơ",
  "color": "#3B82F6",
  "statusType": "SCREENING",
  "sortOrder": 2,
  "autoSendEmail": false,
  "askBeforeSend": false,
  "isTerminal": false,
  "isDefault": false,
  "isActive": true
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Application status created successfully",
  "data": {
    "id": "status3a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "companyId": "company-uuid-xxx",
    "name": "screening",
    "displayName": "Sàng lọc",
    "description": "Đang sàng lọc hồ sơ",
    "color": "#3B82F6",
    "statusType": "SCREENING",
    "sortOrder": 2,
      "autoSendEmail": false,
      "askBeforeSend": false,
    "isTerminal": false,
    "isDefault": false,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": null,
    "updatedBy": null,
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Update Application Status
**PUT** `/admin/application-statuses/{id}`

Cập nhật application status (display_name, color, sort_order, statusType, isTerminal, isDefault, autoSendEmail, askBeforeSend, etc.). Tất cả fields đều optional (partial update).

#### Request Body
```json
{
  "displayName": "Sàng lọc (Cập nhật)",
  "color": "#F97316",
  "statusType": "SCREENING",
  "sortOrder": 4,
  "autoSendEmail": false,
  "askBeforeSend": true,
  "isTerminal": false,
  "isDefault": false,
  "isActive": true
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application status updated successfully",
  "data": {
    "id": "status3a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "companyId": "company-uuid-xxx",
    "name": "screening",
    "displayName": "Sàng lọc (Cập nhật)",
    "description": "Đang sàng lọc hồ sơ",
    "color": "#F97316",
    "statusType": "SCREENING",
    "sortOrder": 4,
      "autoSendEmail": false,
      "askBeforeSend": true,
    "isTerminal": false,
    "isDefault": false,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z",
    "createdBy": null,
    "updatedBy": null,
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### 4. Delete Application Status
**DELETE** `/admin/application-statuses/{id}`

Soft delete application status (chỉ khi không có applications nào đang dùng).

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application status deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Email Management APIs

> **Kiến trúc**: Email Engine (Template + Outbox + Scheduler) phục vụ backend; Admin API expose cho HR quản lý template + xem lịch sử gửi.

### Email Types Reference

Bảng ánh xạ **Email Type** ↔ API / flow gửi email:

#### 1. User & Auth Emails (aggregate_type = USER)

| Email Type | API / Trigger | Mô tả |
|------------|---------------|-------|
| — | **POST** `/admin/users/employees` | Add Employee. **Không gửi email** — user không có app access. Multi-tenant (company_id từ JWT). |
| `USER_INVITE` | **POST** `/admin/users/invite` | Invite User (Create User via Invite). Gửi email với link accept-invite. |
| `USER_INVITE_RESEND` | **POST** `/admin/users/{userId}/resend-invite` | Resend Invite. Gửi lại invite email cho user chưa verify. |
| `EMAIL_VERIFICATION` | **POST** `/auth/verify-email` | Email Verification. Token từ link verification trong email. |
| `EMAIL_VERIFICATION_RESEND` | **POST** `/auth/resend-verification` | Resend Verification Email. Gửi lại email verification. |
| `PASSWORD_RESET` | **POST** `/auth/forgot-password` | Forgot Password. Gửi email reset password với link đặt lại mật khẩu. |

#### 2. Application Workflow Emails (aggregate_type = APPLICATION / INTERVIEW)

Các email automation workflow dùng layout type **CANDIDATE_WORKFLOW_LAYOUT** (xem mục dưới):

| Email Type | Trigger | Mô tả |
|------------|---------|-------|
| `APPLICATION_CONFIRMATION` | Candidate apply thành công | Xác nhận nhận đơn, có link track status. |
| `INTERVIEW_SCHEDULED` | HR tạo interview | Mời phỏng vấn (thời gian, meeting link). |
| `INTERVIEW_RESCHEDULED` | HR đổi lịch interview | Thông báo đổi lịch phỏng vấn. |
| `OFFER_CREATED` | Status → OFFER | Thư mời làm việc (auto từ workflow). |
| `MANUAL_OFFER` | HR gửi offer thủ công | Thư offer với salary, start date, custom message. |
| `CANDIDATE_HIRED` | Status → HIRED | Thông báo chúc mừng trúng tuyển. |
| `CANDIDATE_REJECTED` | Status → REJECTED | Thông báo từ chối ứng viên. |

#### 3. CANDIDATE_WORKFLOW_LAYOUT (Layout type cho automation workflow emails)

Layout type: `CANDIDATE_WORKFLOW_LAYOUT`. Email gửi cho candidate trong application workflow có **footer** chứa tracking link. Cấu trúc:

```
{{content}}
---
<footer>
  [Footer cố định: thông tin công ty, unsubscribe, v.v.]
  View your application status: {{application_link}}
</footer>
```

- **`{{content}}`**: Nội dung chính từ template workflow (APPLICATION_CONFIRMATION, INTERVIEW_SCHEDULED, OFFER_CREATED, ...).
- **Footer**: Phần cố định (logo, địa chỉ, link unsubscribe).
- **`{{application_link}}`**: Link track status dạng `app.example.com/status?token={applicationToken}`.

Template workflow chỉ định nghĩa `content`; hệ thống wrap bằng layout type này khi gửi.

---

### Email Template APIs (Full CRUD)

HR quản lý email templates (global hoặc override theo company). Template dùng cho các flow: apply, interview, offer, rejection, v.v.

#### 1. Get Email Templates
**GET** `/admin/email-templates`

Lấy danh sách email templates của company hiện tại (bao gồm global templates `company_id = NULL` và company overrides).

##### Query Parameters
| Param | Type | Mô tả |
|-------|------|-------|
| `code` | string | Filter theo code (WELCOME, INTERVIEW_INVITE, OFFER_LETTER, ...) |
| `name` | string | Search theo tên |
| `isActive` | boolean | Filter theo trạng thái active |

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Email templates retrieved successfully",
  "data": [
    {
      "id": "tpl1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "companyId": null,
      "code": "APPLICATION_RECEIVED",
      "name": "Xác nhận nhận đơn",
      "subject": "Chúng tôi đã nhận đơn ứng tuyển của bạn",
      "variables": [],
      "fromName": null,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2. Get Email Template by ID
**GET** `/admin/email-templates/{id}`

Lấy chi tiết template (bao gồm `htmlContent`).

##### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "tpl1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "companyId": null,
    "code": "APPLICATION_RECEIVED",
    "name": "Xác nhận nhận đơn",
    "subject": "Chúng tôi đã nhận đơn ứng tuyển của bạn",
    "htmlContent": "<p>Xin chào {{candidate_name}}, ...</p>",
    "variables": ["candidate_name", "job_title", "company_name", "application_link"],
    "fromName": null,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 3. Create Email Template
**POST** `/admin/email-templates`

Tạo template mới cho company (override global). Chỉ ADMIN_COMPANY/RECRUITER.

##### Request Body
```json
{
  "code": "INTERVIEW_INVITE",
  "name": "Mời phỏng vấn (Custom)",
  "subject": "Mời bạn tham gia phỏng vấn - {{job_title}}",
  "htmlContent": "<p>Xin chào {{candidate_name}}, ...</p>",
  "variables": ["candidate_name", "job_title", "interview_time", "meeting_link"],
  "fromName": "HR Team",
  "isActive": true
}
```

##### Response (201 Created)
```json
{
  "success": true,
  "message": "Email template created successfully",
  "data": {
    "id": "tpl2a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "code": "INTERVIEW_INVITE",
    "name": "Mời phỏng vấn (Custom)",
    "subject": "Mời bạn tham gia phỏng vấn - {{job_title}}",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 4. Update Email Template
**PUT** `/admin/email-templates/{id}`

Cập nhật template (subject, htmlContent, fromName, isActive).

##### Request Body
```json
{
  "subject": "Mời phỏng vấn - {{company_name}}",
  "htmlContent": "<p>Nội dung cập nhật...</p>",
  "fromName": "Tuyển dụng",
  "isActive": true
}
```

##### Response (200 OK)

Trả về `EmailTemplateResponse` (cùng cấu trúc với Create):

```json
{
  "success": true,
  "message": "Email template updated successfully",
  "data": {
    "id": "tpl2a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "code": "INTERVIEW_INVITE",
    "name": "Mời phỏng vấn (Custom)",
    "subject": "Mời phỏng vấn - {{company_name}}",
    "variables": ["candidate_name", "job_title", "company_name", "meeting_link"],
    "fromName": "Tuyển dụng",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

#### 5. Delete Email Template
**DELETE** `/admin/email-templates/{id}`

Soft delete template (chỉ template thuộc company, không xóa global).

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Email template deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T11:00:00Z"
}
```

#### 6. Preview Email Template
**POST** `/admin/email-templates/{id}/preview`

Render template với data mẫu hoặc data thật (applicationId, interviewId).

##### Request Body
```json
{
  "sampleData": {
    "candidate_name": "Nguyễn Văn A",
    "job_title": "Backend Developer",
    "company_name": "Acme Corp",
    "application_link": "https://app.jobtracker.com/status?token=xxx",
    "interview_time": "2024-01-20 14:00",
    "meeting_link": "https://meet.google.com/xxx"
  }
}
```

Hoặc dùng entity thật:
```json
{
  "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6"
}
```

##### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "subject": "Mời bạn tham gia phỏng vấn - Backend Developer",
    "htmlContent": "<p>Xin chào Nguyễn Văn A, ...</p>"
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

#### 7. Send Test Email
**POST** `/admin/email-templates/{id}/send-test`

Gửi email test tới địa chỉ chỉ định (mặc định email HR hiện tại).

##### Request Body
```json
{
  "toEmail": "hr@company.com"
}
```

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Test email queued successfully",
  "data": null,
  "timestamp": "2024-01-15T11:00:00Z"
}
```

> Record được tạo trong `email_outbox` với `aggregate_type = USER`, scheduler sẽ gửi.

---

### Email History APIs (Read-only + Resend)

> **Mục đích**: Support, debug, compliance. Email outbox không chỉ là queue nội bộ mà còn là **communication history** – audit log, delivery tracking, debug tool.

**Giới hạn**: Chỉ **read** + **resend**. Không CREATE, UPDATE, DELETE.

#### 1. Get Email History
**GET** `/admin/email-history`

Xem lịch sử email đã gửi / đang chờ / thất bại. Filter theo company hiện tại.

##### Query Parameters
| Param | Type | Mô tả |
|-------|------|-------|
| `status` | string | PENDING, SENT, FAILED |
| `emailType` | string | WELCOME, INTERVIEW_INVITE, OFFER_LETTER, REJECTION, ... |
| `aggregateType` | enum | USER, APPLICATION, INTERVIEW (AggregateType) |
| `aggregateId` | string | UUID của entity |
| `toEmail` | string | Filter theo người nhận |
| `startDate` | datetime (ISO 8601) | Filter theo `createdAt` ≥ giá trị này (thời điểm record được tạo) |
| `endDate` | datetime (ISO 8601) | Filter theo `createdAt` ≤ giá trị này (thời điểm record được tạo) |
| `page` | int | Pagination (default 0) |
| `size` | int | Size (default 20) |

##### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "out1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
        "emailType": "INTERVIEW_INVITE",
        "aggregateType": "APPLICATION",
        "aggregateId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
        "toEmail": "candidate@example.com",
        "toName": "Nguyễn Văn A",
        "subject": "Mời phỏng vấn - Backend Developer",
        "status": "SENT",
        "retryCount": 0,
        "sentAt": "2024-01-15T10:00:00Z",
        "createdAt": "2024-01-15T09:55:00Z"
      }
    ],
    "totalElements": 150,
    "totalPages": 8,
    "number": 0,
    "size": 20
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

#### 2. Get Email History Detail
**GET** `/admin/email-history/{id}`

Xem chi tiết 1 email (subject, body, failed_reason nếu FAILED).

##### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "out1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "emailType": "INTERVIEW_INVITE",
    "aggregateType": "APPLICATION",
    "aggregateId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "toEmail": "candidate@example.com",
    "toName": "Nguyễn Văn A",
    "fromEmail": "noreply@jobtracker.com",
    "fromName": "Acme Corp",
    "replyToEmail": "hr@acme.com",
    "subject": "Mời phỏng vấn - Backend Developer",
    "htmlBody": "<p>Xin chào Nguyễn Văn A, ...</p>",
    "status": "FAILED",
    "retryCount": 3,
    "maxRetries": 3,
    "nextRetryAt": null,
    "sentAt": null,
    "failedReason": "Connection timeout to Brevo",
    "providerMessageId": null,
    "createdAt": "2024-01-15T09:55:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

#### 3. Resend Email (Manual)
**POST** `/admin/email-history/{id}/resend`

Resend thủ công email FAILED (reset `status = PENDING`, `retry_count = 0`). Scheduler sẽ pick up và gửi lại.

> **Use case**: Brevo downtime → nhiều email FAILED → HR/Support resend hàng loạt.

##### Response (200 OK)
```json
{
  "success": true,
  "message": "Email queued for resend",
  "data": null,
  "timestamp": "2024-01-15T11:00:00Z"
}
```

##### Error (400 Bad Request)
- Email đang PENDING hoặc đã SENT → không cho resend.

---

## RBAC & Permission APIs

> Các endpoint này yêu cầu quyền `SYSTEM_ADMIN` hoặc `ADMIN_COMPANY` (tùy scope).

### 1. Get Roles
**GET** `/admin/roles`

Lấy danh sách roles cùng metadata để gán cho user.

#### Request Headers
```
Authorization: Bearer <access_token>
```

> **Lookup/config data (RBAC) → trả về List, không paginate.**

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "34d9a2e3-1a30-4a1a-b1ad-4b6d2619f1ce",
      "name": "SYSTEM_ADMIN",
      "description": "Administrator with full system access",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-10T12:00:00Z",
      "createdBy": null,
      "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "deletedAt": null
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
}
```

### 2. Create Role
**POST** `/admin/roles`

Tạo role mới cho hệ thống.

#### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "RECRUITER",
  "description": "Limited admin role for managing job data",
  "isActive": true
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "id": "781af566-48d8-4066-9fd7-78284b642df0",
    "name": "RECRUITER",
    "description": "Limited admin role for managing job data",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Get Role Details
**GET** `/admin/roles/{id}`

Lấy thông tin chi tiết một role kèm metadata.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Role retrieved successfully",
  "data": {
    "id": "34d9a2e3-1a30-4a1a-b1ad-4b6d2619f1ce",
    "name": "ADMIN",
    "description": "Administrator with full system access",
    "isActive": true,
    "permissions": [
      {
        "permissionId": "5a12b2d5-0b42-4b3c-815a-7cf6fca39a8e",
        "name": "JOB_READ",
        "resource": "JOB",
        "action": "READ"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-10T12:00:00Z",
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Update Role
**PUT** `/admin/roles/{id}`

#### Request Body
```json
{
  "description": "System administrator role",
  "isActive": true
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "id": "34d9a2e3-1a30-4a1a-b1ad-4b6d2619f1ce",
    "name": "ADMIN",
    "description": "System administrator role",
    "isActive": true,
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. Delete Role (Soft Delete)
**DELETE** `/admin/roles/{id}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Role deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 6. Get Permissions
**GET** `/admin/permissions`

Liệt kê toàn bộ permissions có thể gán cho roles.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Permissions retrieved successfully",
  "data": [
    {
      "id": "5a12b2d5-0b42-4b3c-815a-7cf6fca39a8e",
      "name": "JOB_READ",
      "resource": "JOB",
      "action": "READ",
      "description": "Read job information",
      "isActive": true
    },
    {
      "id": "6df6adf7-02f0-4d66-92bb-59f32b2b7a25",
      "name": "JOB_CREATE",
      "resource": "JOB",
      "action": "CREATE",
      "description": "Create new jobs",
      "isActive": true
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 7. Create Permission
**POST** `/admin/permissions`

```json
{
  "name": "COMPANY_DELETE",
  "resource": "COMPANY",
  "action": "DELETE",
  "description": "Delete companies",
  "isActive": true
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Permission created successfully",
  "data": {
    "id": "85a1cb38-4e9f-4f90-a7d5-f45df3a5515d",
    "name": "COMPANY_DELETE",
    "resource": "COMPANY",
    "action": "DELETE",
    "description": "Delete companies",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 8. Update Permission
**PUT** `/admin/permissions/{id}`

```json
{
  "description": "Delete company records",
  "isActive": true
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Permission updated successfully",
  "data": {
    "id": "85a1cb38-4e9f-4f90-a7d5-f45df3a5515d",
    "name": "COMPANY_DELETE",
    "resource": "COMPANY",
    "action": "DELETE",
    "description": "Delete company records",
    "isActive": true,
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 9. Delete Permission
**DELETE** `/admin/permissions/{id}`

```json
{
  "success": true,
  "message": "Permission deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 10. Update Role Permissions
**PUT** `/admin/roles/{roleId}/permissions`

Cập nhật danh sách permission cho role cụ thể.

#### Request Body
```json
{
  "permissionIds": [
    "5a12b2d5-0b42-4b3c-815a-7cf6fca39a8e",
    "6df6adf7-02f0-4d66-92bb-59f32b2b7a25"
  ]
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Role permissions updated successfully",
  "data": {
    "roleId": "34d9a2e3-1a30-4a1a-b1ad-4b6d2619f1ce",
    "permissionIds": [
      "5a12b2d5-0b42-4b3c-815a-7cf6fca39a8e",
      "6df6adf7-02f0-4d66-92bb-59f32b2b7a25"
    ],
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 11. Get Role Permissions
**GET** `/admin/roles/{roleId}/permissions`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Role permissions retrieved successfully",
  "data": [
    {
      "permissionId": "5a12b2d5-0b42-4b3c-815a-7cf6fca39a8e",
      "name": "JOB_READ",
      "resource": "JOB",
      "action": "READ"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 12. Add Single Permission to Role
**POST** `/admin/roles/{roleId}/permissions`

#### Request Body
```json
{
  "permissionId": "6df6adf7-02f0-4d66-92bb-59f32b2b7a25"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Permission added to role",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 13. Remove Permission from Role
**DELETE** `/admin/roles/{roleId}/permissions/{permissionId}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Permission removed from role",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Skills Management APIs

### 1. Get All Skills
**GET** `/skills`

Lấy danh sách skills (có phân trang, filter theo tên và category).

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Query Parameters
```
page=0&size=50&sort=name,asc&category=PROGRAMMING&name=Java
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "b7e58a6e-5c5e-4de8-9a3f-6b1ae2d042b5",
      "name": "Java",
      "category": "PROGRAMMING",
      "description": "Object-oriented programming language",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "createdBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "deletedAt": null
    },
    {
      "id": "c8f69b7f-6d6f-5ef9-0b4g-7c2bf3e153c6",
      "name": "Spring Boot",
      "category": "FRAMEWORK",
      "description": "Java framework for building web applications",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "createdBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "deletedAt": null
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 50,
    "totalElements": 2,
    "totalPages": 1
  }
}
```

### 2. Get Skill by ID
**GET** `/skills/{id}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Skill retrieved successfully",
  "data": {
    "id": "b7e58a6e-5c5e-4de8-9a3f-6b1ae2d042b5",
    "name": "Java",
    "category": "PROGRAMMING",
    "description": "Object-oriented programming language",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "createdBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Create Skill
**POST** `/skills`

#### Request Body
```json
{
  "name": "Kubernetes",
  "category": "TOOL",
  "description": "Container orchestration"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Skill created successfully",
  "data": {
    "id": "c8f69b7f-6d6f-5ef9-0b4g-7c2bf3e153c6",
    "name": "Kubernetes",
    "category": "TOOL",
    "description": "Container orchestration",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Update Skill
**PUT** `/skills/{id}`

#### Request Body
```json
{
  "description": "Managed Kubernetes platform",
  "isActive": true
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Skill updated successfully",
  "data": {
    "id": "c8f69b7f-6d6f-5ef9-0b4g-7c2bf3e153c6",
    "name": "Kubernetes",
    "category": "TOOL",
    "description": "Managed Kubernetes platform",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. Delete Skill
**DELETE** `/skills/{id}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Skill deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Comments Management APIs (ATS)

> **Mục đích**: HR/Recruiter trao đổi về candidates trên applications. Comments có thể là internal (không gửi candidate) hoặc external.

### 1. Get Application Comments
**GET** `/applications/{applicationId}/comments`

Lấy danh sách comments của một application.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Query Parameters
```
page=0&size=20&sort=createdAt,desc&isInternal=true
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Comments retrieved successfully",
  "data": [
    {
      "id": "comm1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "userId": "user1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "userName": "Jane Recruiter",
      "userAvatar": "https://...",
      "commentText": "Strong technical background, good fit for the role.",
      "isInternal": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### 2. Create Comment
**POST** `/applications/{applicationId}/comments`

Thêm comment mới cho application.

#### Request Body
```json
{
  "commentText": "Strong technical background, good fit for the role.",
  "isInternal": true
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "id": "comm1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "userId": "user1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "userName": "Jane Recruiter",
    "commentText": "Strong technical background, good fit for the role.",
    "isInternal": true,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Update Comment
**PUT** `/applications/{applicationId}/comments/{commentId}`

Cập nhật comment (chỉ author mới có thể update).

#### Request Body
```json
{
  "commentText": "Updated comment text",
  "isInternal": false
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": "comm1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "commentText": "Updated comment text",
    "isInternal": false,
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Delete Comment
**DELETE** `/applications/{applicationId}/comments/{commentId}`

Soft delete comment (chỉ author hoặc admin mới có thể delete).

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Interview Management APIs (ATS)

> **SEMANTIC CHANGE**: Interviews belong to Applications, không phải Jobs. Một application có thể có nhiều vòng interview.

### 0. Get All Interviews (Company - Tổng hợp)
**GET** `/interviews`

Lấy danh sách interview **của company hiện tại** (company lấy từ JWT, không phải query param) với filter và phân trang.

> **Thiết kế**
> - **Company**: Luôn scope theo company của user đăng nhập (JWT). Không có param `companyId` — tránh lộ data company khác.
> - **Filter** (tất cả optional): `applicationId`, `jobId`, `interviewerId`, `from`, `to`, `status`.
> - Dùng cho: calendar view, list "interviews của tôi", filter theo job/application, theo khoảng thời gian.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Query params (optional)
| Param | Type | Mô tả |
|-------|------|-------|
| `applicationId` | string | Lọc theo application |
| `jobId` | string | Lọc theo job |
| `interviewerId` | string | Lọc interview mà user này tham gia (interviewer) |
| `from` | date-time (ISO) | scheduledDate >= from |
| `to` | date-time (ISO) | scheduledDate <= to |
| `status` | enum | SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED |
| `page` | int | Trang (default 0) |
| `size` | int | Số phần tử/trang (default 20) |

#### Response (200 OK)
Cùng format danh sách như **GET /applications/{applicationId}/interviews**, kèm `paginationInfo`.

### 1. Get Application Interviews
**GET** `/applications/{applicationId}/interviews`

Lấy danh sách interviews của một application.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Interviews retrieved successfully",
  "data": [
    {
      "id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
      "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
      "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
      "roundNumber": 1,
      "meetingLink": "https://meet.google.com/xxx-yyyy-zzz",
      "location": "Office Building A, Room 101",
      "interviewType": "TECHNICAL",
      "scheduledDate": "2024-01-20T14:00:00Z",
      "actualDate": null,
      "durationMinutes": 60,
      "interviewers": [
        {
          "id": "user-id-1",
          "name": "Jane Smith",
          "email": "jane.smith@company.com",
          "isPrimary": true
        },
        {
          "id": "user-id-2",
          "name": "John Doe",
          "email": "john.doe@company.com",
          "isPrimary": false
        }
      ],
      "status": "SCHEDULED",
      "result": null,
      "feedback": null,
      "notes": "Technical interview",
      "questionsAsked": null,
      "answersGiven": null,
      "rating": null,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "createdBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "deletedAt": null
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Create Interview
**POST** `/applications/{applicationId}/interviews`

Tạo interview mới cho application với nhiều interviewers.

> **Multiple Interviewers**: Một interview có thể có nhiều interviewers (array `interviewerIds`).
> 
> **Schedule Validation**: System tự động validate trùng lịch cho từng interviewer:
> - Nếu interviewer đã có interview khác trong khoảng thời gian `scheduledDate` ± `durationMinutes` → Reject với error
> - Chỉ validate cho interviews có status = `SCHEDULED` hoặc `RESCHEDULED`
> - Validate overlap: Nếu interview A từ 10:00-11:00 và interview B từ 10:30-11:30 → Trùng lịch (overlap)

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Request Body
```json
{
  "roundNumber": 1,
  "interviewType": "TECHNICAL",
  "scheduledDate": "2024-01-20T14:00:00Z",
  "durationMinutes": 60,
  "interviewerIds": [
    "user-id-1",
    "user-id-2"
  ],
  "primaryInterviewerId": "user-id-1",
  "meetingLink": "https://meet.google.com/xxx-yyyy-zzz",
  "location": "Office Building A, Room 101",
  "notes": "Technical interview with 2 interviewers"
}
```

> **Lưu ý**:
> - `interviewerIds`: Array các `user_id` với role = `RECRUITER` (hoặc user có quyền interview, bắt buộc ít nhất 1 interviewer)
> - `primaryInterviewerId`: Interviewer chính (optional, nếu không set thì lấy interviewer đầu tiên)
> - **Status khi create luôn = `SCHEDULED`**, client **không gửi** field `status` trong request.

#### Error Response (400 Bad Request - Schedule Conflict)
```json
{
  "success": false,
  "message": "Schedule conflict detected",
  "errors": [
    {
      "field": "interviewerIds",
      "message": "Interviewer user-id-2 already has an interview scheduled at 2024-01-20T14:00:00Z with duration 60 minutes"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Interview created successfully",
  "data": {
    "id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
    "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "roundNumber": 1,
    "interviewType": "TECHNICAL",
    "scheduledDate": "2024-01-20T14:00:00Z",
    "actualDate": null,
    "durationMinutes": 60,
    "interviewers": [
      {
        "id": "user-id-1",
        "name": "Jane Smith",
        "email": "jane.smith@company.com",
        "isPrimary": true
      },
      {
        "id": "user-id-2",
        "name": "John Doe",
        "email": "john.doe@company.com",
        "isPrimary": false
      }
    ],
    "status": "SCHEDULED",
    "result": null,
    "meetingLink": "https://meet.google.com/xxx-yyyy-zzz",
    "location": "Office Building A, Room 101",
    "feedback": null,
    "notes": "Technical interview with 2 interviewers",
    "questionsAsked": null,
    "answersGiven": null,
    "rating": null,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Update Interview
**PUT** `/interviews/{id}`

Update kết quả/phản hồi interview, có thể cập nhật `scheduledDate` (reschedule) và danh sách `interviewerIds`.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Request Body
```json
{
  "scheduledDate": "2024-01-21T10:00:00Z",
  "actualDate": "2024-01-20T14:30:00Z",
  "durationMinutes": 90,
  "result": "PASSED",
  "feedback": "Great technical skills, good communication",
  "notes": "Interview went well, waiting for next round",
  "questionsAsked": "What is your experience with Spring Boot?",
  "answersGiven": "I have 3 years of experience with Spring Boot...",
  "rating": 4,
  "interviewerIds": [
    "user-id-1",
    "user-id-2"
  ],
  "primaryInterviewerId": "user-id-1"
}
```

> **Business rule về status (không cho sửa trực tiếp)**  
> - Khi **tạo interview** → backend luôn set `status = SCHEDULED`.  
> - Khi **update có đổi `scheduledDate` hoặc `durationMinutes`** (mà chưa có `actualDate`) → backend tự set `status = RESCHEDULED`.  
> - Khi **update có `actualDate`** → backend tự set `status = COMPLETED` (ưu tiên hơn RESCHEDULED).  
> - Khi gửi `interviewerIds` trong request, backend sẽ **thay toàn bộ danh sách interviewers** của interview bằng danh sách mới (và validate trùng lịch lại giống khi tạo).

### 5. Cancel Interview
**POST** `/interviews/{id}/cancel`

Huỷ một interview (status → `CANCELLED`).

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Interview cancelled successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Interview updated successfully",
  "data": {
    "id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
    "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "roundNumber": 1,
    "interviewType": "TECHNICAL",
    "scheduledDate": "2024-01-20T14:00:00Z",
    "actualDate": "2024-01-20T14:30:00Z",
    "durationMinutes": 60,
    "interviewers": [
      {
        "id": "user-id-1",
        "name": "Jane Smith",
        "email": "jane.smith@company.com",
        "isPrimary": true
      }
    ],
    "status": "COMPLETED",
    "result": "PASSED",
    "feedback": "Great technical skills, good communication",
    "notes": "Interview went well, waiting for next round",
    "questionsAsked": "What is your experience with Spring Boot?",
    "answersGiven": "I have 3 years of experience with Spring Boot...",
    "rating": 4,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "updatedBy": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "deletedAt": null
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Get Interview Details
**GET** `/interviews/{id}`

Trả về đầy đủ thông tin của một interview (bao gồm audit, feedback).

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Interview retrieved successfully",
  "data": {
    "id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
    "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "roundNumber": 1,
    "interviewType": "TECHNICAL",
    "scheduledDate": "2024-01-20T14:00:00Z",
    "actualDate": "2024-01-20T14:30:00Z",
    "durationMinutes": 60,
    "interviewers": [
      {
        "id": "user-id-1",
        "name": "Jane Smith",
        "email": "jane.smith@company.com",
        "isPrimary": true
      }
    ],
    "status": "COMPLETED",
    "result": "PASSED",
    "feedback": "Great technical skills, good communication",
    "notes": "Interview went well, waiting for next round",
    "questionsAsked": "What is your experience with Spring Boot?",
    "answersGiven": "I have 3 years of experience with Spring Boot...",
    "rating": 4,
    "updatedAt": "2024-01-20T15:00:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. Delete Interview
**DELETE** `/interviews/{id}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Interview deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Dashboard API

> **4 widget tối ưu cho ATS**: Active Jobs, Applications Today, Applications by Status, Upcoming Interviews.

**GET** `/dashboard/summary`

Lấy dữ liệu cho 4 widget dashboard chính (scoped theo company).

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Dashboard summary retrieved successfully",
  "data": {
    "activeJobs": {
      "count": 12,
      "changeFromLastMonth": 2
    },
    "applicationsToday": {
      "count": 5,
      "countYesterday": 3
    },
    "applicationsByStatus": [
      {
        "statusId": "as1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
        "statusName": "NEW",
        "displayName": "Mới",
        "count": 25
      },
      {
        "statusId": "as2b3c4d5-6e7f-8g9h-0i1j-k2l3m4n5o6p7",
        "statusName": "SCREENING",
        "displayName": "Sàng lọc",
        "count": 10
      },
      {
        "statusName": "INTERVIEWING",
        "displayName": "Phỏng vấn",
        "count": 5
      },
      {
        "statusName": "OFFERED",
        "displayName": "Đã đề xuất",
        "count": 2
      }
    ],
    "upcomingInterviews": [
      {
        "id": "i1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
        "candidateName": "Nguyễn Văn A",
        "jobTitle": "Senior Java Developer",
        "scheduledDate": "2024-01-16T09:00:00",
        "durationMinutes": 60,
        "interviewType": "TECHNICAL"
      },
      {
        "id": "i2b3c4d5-6e7f-8g9h-0i1j-k2l3m4n5o6p7",
        "candidateName": "Trần Thị B",
        "jobTitle": "Frontend Developer",
        "scheduledDate": "2024-01-16T14:00:00",
        "durationMinutes": 45,
        "interviewType": "HR"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Widget mô tả

| Widget | Mô tả |
|--------|-------|
| **1. Active Jobs** | Số job đang tuyển (status PUBLISHED). `changeFromLastMonth`: so với tháng trước (↑/↓). |
| **2. Applications Today** | Số CV mới hôm nay. `countYesterday`: so sánh với hôm qua. |
| **3. Applications by Status** | Pipeline overview – số application theo từng status. Dùng cho chart donut/bar. |
| **4. Upcoming Interviews** | 3–5 cuộc phỏng vấn sắp tới (sắp theo `scheduledDate`). |

## Notification APIs (ATS)

> **SEMANTIC CHANGE**: Notifications có thể link đến applications (status changes, interview reminders).

### 1. Get User Notifications
**GET** `/notifications`

Lấy danh sách notifications của user (filtered by company).

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Query Parameters
```
page=0&size=20&isRead=false&type=APPLICATION_RECEIVED&applicationId=xxx
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "n1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "userId": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
      "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
      "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
      "type": "APPLICATION_RECEIVED",
      "title": "New Application Received",
      "message": "John Doe applied for Senior Java Developer",
      "isRead": false,
      "isSent": true,
      "sentAt": "2024-01-15T10:00:00Z",
      "scheduledAt": null,
      "priority": "MEDIUM",
      "metadata": "{\"candidateName\":\"John Doe\",\"jobTitle\":\"Senior Java Developer\"}",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### 2. Mark Notification as Read
**PATCH** `/notifications/{id}/read`

Đánh dấu notification đã đọc.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "n1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "isRead": true,
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 3. Mark All Notifications as Read
**PATCH** `/notifications/read-all`

Đánh dấu tất cả notifications đã đọc.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 5
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Create Notification (Manual/Admin)
**POST** `/notifications`

#### Request Body
```json
{
  "userId": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
  "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
  "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
  "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
  "type": "DEADLINE_REMINDER",
  "priority": "HIGH",
  "title": "Custom Reminder",
  "message": "Follow up with recruiter tomorrow",
  "scheduledAt": "2024-01-16T09:00:00Z",
  "metadata": {
    "channel": "EMAIL"
  }
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Notification created successfully",
  "data": {
    "id": "n2b3c4d5-6e7f-8g9h-0i1j-k2l3m4n5o6p7",
    "userId": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "type": "DEADLINE_REMINDER",
    "priority": "HIGH",
    "title": "Custom Reminder",
    "message": "Follow up with recruiter tomorrow",
    "isRead": false,
    "isSent": false,
    "scheduledAt": "2024-01-16T09:00:00Z",
    "sentAt": null,
    "metadata": {
      "channel": "EMAIL"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. Get Notification Details
**GET** `/notifications/{id}`

Trả về đầy đủ metadata (job, user, template data).

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Notification retrieved successfully",
  "data": {
    "id": "n1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "userId": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "jobId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
    "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "type": "DEADLINE_REMINDER",
    "priority": "MEDIUM",
    "title": "Deadline Reminder",
    "message": "Google application deadline is in 3 days",
    "isRead": false,
    "isSent": true,
    "sentAt": "2024-01-15T10:00:00Z",
    "scheduledAt": null,
    "metadata": {
      "deadlineDate": "2024-01-18",
      "companyName": "Google"
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 6. Delete Notification
**DELETE** `/notifications/{id}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Session Management APIs

### 1. Get Active Sessions
**GET** `/sessions`

Lấy danh sách phiên đăng nhập của user hiện tại (bao gồm thiết bị khác).

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "13af47a3-9f8b-4ab0-8f2b-b0199a55de6b",
      "deviceInfo": {
        "os": "Windows 11",
        "browser": "Chrome 118"
      },
      "ipAddress": "203.0.113.10",
      "userAgent": "Mozilla/5.0 ...",
      "isActive": true,
      "expiresAt": "2024-02-01T09:00:00Z",
      "lastUsedAt": "2024-01-15T09:30:00Z",
      "createdAt": "2024-01-10T08:00:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### 2. Revoke Session
**DELETE** `/sessions/{id}`

Đăng xuất (revoke) một session cụ thể.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Session revoked successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Audit Log APIs

### 1. Get Audit Logs
**GET** `/audit-logs`

> Chỉ dành cho SYSTEM_ADMIN.

Lấy log hành động của người dùng/system để phục vụ kiểm tra.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Query Parameters
```
page=0&size=20&entityType=JOB&action=UPDATE&startDate=2024-01-01&endDate=2024-01-31
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "f4f7c10a-9052-431c-8f4c-92669aa4bcd0",
      "entityType": "JOB",
      "entityId": "d7e6d2c9-0c6e-4ca8-bc52-2e95746bffc3",
      "action": "UPDATE",
      "userId": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
      "userEmail": "admin@gmail.com",
      "oldValues": {
        "jobStatus": "DRAFT"
      },
      "newValues": {
        "jobStatus": "PUBLISHED"
      },
      "ipAddress": "203.0.113.10",
      "userAgent": "Mozilla/5.0 ...",
      "createdAt": "2024-01-12T08:15:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "paginationInfo": {
    "page": 0,
    "size": 20,
    "totalElements": 125,
    "totalPages": 7
  }
}
```

### 2. Delete Audit Log (Archive)
**DELETE** `/audit-logs/{id}`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Audit log archived successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## File Management APIs (ATS)

> **SEMANTIC CHANGE**: Attachments belong to Applications (CVs, certificates), không phải Jobs.

### 1. Upload Application Attachment (HR Workflow)
**POST** `/applications/{applicationId}/attachments`

HR/Recruiter upload file đính kèm cho application (CV, certificate, portfolio). Đây là **workflow phụ** cho HR manual upload.

> **Protected endpoint**: Yêu cầu `Authorization: Bearer <access_token>`  
> **Use case**: HR nhận CV qua email → Upload vào system → Link với application

#### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

#### Request Body (Form Data)
```
file: <file>
attachmentType: RESUME
description: "Candidate's resume"
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Attachment uploaded successfully",
  "data": {
    "id": "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
    "applicationId": "app1a2b3c4-5d6e-7f8g-9h0i-j1k2l3m4n5o6",
    "companyId": "c1f9a8e2-3b4c-5d6e-7f80-1234567890ab",
    "userId": "e2019f85-4a2f-4a6a-94b8-42c9b62b34be",
    "filename": "john_doe_resume.pdf",
    "originalFilename": "John_Doe_Resume_2024.pdf",
    "filePath": "/attachments/app_1/john_doe_resume.pdf",
    "fileSize": 512000,
    "fileType": "application/pdf",
    "attachmentType": "RESUME",
    "description": "Candidate's resume",
    "isPublic": false,
    "uploadedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Download Attachment
**GET** `/attachments/{id}/download`

Download file đính kèm.

#### Request Headers
```
Authorization: Bearer <access_token>
```

#### Response (200 OK)
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="John_Doe_Resume_2024.pdf"
Content-Length: 512000

<binary_file_content>
```

### 3. List Application Attachments
**GET** `/applications/{applicationId}/attachments`

Lấy danh sách attachments của application.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Application attachments retrieved successfully",
  "data": [
    {
      "id": "5f47e8b3-338f-4f1a-8e65-92dbd1dcb2f2",
      "publicId": "jobtracker_ats/applications/app_1/cv/file_public_id",
      "filename": "john_doe_resume.pdf",
      "attachmentType": "RESUME",
      "fileSize": 512000,
      "uploadedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "6g58f9c4-449g-5g2b-9f76-a3ece2edc3g3",
      "publicId": "jobtracker_ats/applications/app_1/cv/cert_public_id",
      "filename": "john_doe_certificate.pdf",
      "attachmentType": "CERTIFICATE",
      "fileSize": 256000,
      "uploadedAt": "2024-01-15T11:00:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 4. Delete Attachment
**DELETE** `/attachments/{id}`

Xóa attachment.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Attachment deleted successfully",
  "data": null,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common HTTP Status Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict
- **422 Unprocessable Entity**: Validation failed
- **500 Internal Server Error**: Server error

### Error Examples

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "errors": [
    {
      "field": "authorization",
      "message": "JWT token is missing or invalid"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found",
  "errors": [
    {
      "field": "id",
      "message": "Job with ID 999 not found"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 422 Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email format is invalid"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## API Configuration

### Rate Limiting
```
Rate Limit: 1000 requests per hour per user
Burst Limit: 100 requests per minute
```

### Request Size Limits
```
Max Request Size: 10MB
Max File Upload: 50MB
Max Array Size: 1000 items
```

### CORS Configuration
```
Allowed Origins: https://jobtracker.com, https://app.jobtracker.com
Allowed Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Allowed Headers: Authorization, Content-Type, X-Requested-With
Max Age: 3600 seconds
```

## OpenAPI Documentation

API documentation được tự động generate bằng SpringDoc OpenAPI 3 và có thể truy cập tại:

- **Swagger UI**: `https://api.jobtracker.com/swagger-ui.html`
- **OpenAPI JSON**: `https://api.jobtracker.com/v3/api-docs`
- **OpenAPI YAML**: `https://api.jobtracker.com/v3/api-docs.yaml`

### API Versioning
```
Current Version: v1
Version Header: X-API-Version
Deprecation Policy: 6 months notice
```

## Security Headers

### Required Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Requested-With: XMLHttpRequest
```

### Security Headers (Server Response)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

```

