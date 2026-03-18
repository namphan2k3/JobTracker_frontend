## Business flows & status lifecycle (JobTracker ATS)

Tài liệu này tổng hợp **luồng nghiệp vụ chính** và **quy tắc thay đổi trạng thái** trong JobTracker ATS, dựa trên `DATABASE.md`, `API.md` và code backend (`ApplicationServiceImpl`, `InterviewServiceImpl`, `NotificationServiceImpl`, ...).

- **Actors chính**:
  - **Candidate**: ứng viên tự apply, upload CV, theo dõi trạng thái.
  - **HR/Recruiter**: tạo job, review pipeline, phỏng vấn, offer/reject.
  - **Company Admin**: quản lý công ty, team, subscription.
  - **System**: scheduled jobs, email outbox, notifications, audit.

- **Core entities & trạng thái**:
  - **Job**: `job_status` = `DRAFT` → `PUBLISHED` → `PAUSED`/`CLOSED`/`FILLED`.
  - **Application**: pipeline `APPLIED` → `SCREENING` → `INTERVIEW` → `OFFER` → `HIRED` / `REJECTED`.
  - **Interview**: `SCHEDULED` → `RESCHEDULED` / `COMPLETED` / `CANCELLED`.
  - **Subscription**: `PENDING` → `ACTIVE` → `EXPIRED` / `CANCELLED`.
  - **Payment**: `INIT` → `SUCCESS` / `FAILED`.
  - **Notification**: logical enum `NotificationType`, `NotificationPriority`.

---

## 1. Authentication & session flow

> **Token tables** (tách riêng theo domain):
> - `user_invitations`: Invite flow (Admin mời user → accept-invite set password)
> - `email_verification_tokens`: Email verification (register, resend)
> - `password_reset_tokens`: Forgot/Reset password

- **Company self-signup** (`POST /auth/register`):
  - Tạo `company` mới + user `ADMIN_COMPANY` (`users`).
  - `email_verified = false`, gửi email verify.
  - Tạo record trong `email_verification_tokens`:
    - Generate token random → lưu `token`. Gửi token qua email.
    - `user_id`, `company_id`, `expires_at = NOW() + 24-48h`, `used_at = NULL`, `sent_at = NOW()`.
  - Sau khi verify qua `POST /auth/verify-email` (so sánh token) → `users.email_verified = true`, `email_verification_tokens.used_at = NOW()` → user mới được login.

- **Resend verification** (`POST /auth/resend-verification`):
  - Tìm user theo email → tạo token mới → insert vào `email_verification_tokens` → gửi email.

- **Invite-based user creation (team members)**:
  - **Flow chuẩn B2B** (Jira/Slack/Linear):
    1. **Admin/HR mời user** (`POST /admin/users/invite`):
       - **Check plan limit**: `PlanLimitService.enforceUserLimit` — đếm users `is_billable = true`, nếu `count >= plan.maxUsers` → `PLAN_LIMIT_USERS_EXCEEDED`.
       - Tạo `users` record với:
         - `email_verified = false`, `password = NULL`, `is_active = false`, `is_billable` tùy role.
       - Tạo record trong `user_invitations`:
         - `token` random (UUID/secure string).
         - `user_id`, `company_id`, `expires_at = NOW() + 7 days`, `used_at = NULL`, `sent_at = NOW()`.
       - Gửi email invite (template `WELCOME` hoặc `INVITE_USER`) qua `email_outbox` với link:
         - `https://app.jobtracker.com/accept-invite?token={token}`.
    2. **User chấp nhận invite** (`POST /auth/accept-invite`):
       - Public endpoint, chỉ cần `token` + `password` mới.
       - Validate `user_invitations`:
         - `token` tồn tại, `used_at IS NULL`, `expires_at > NOW()`, `deleted_at IS NULL`.
       - Nếu hợp lệ:
         - Set password cho user.
         - Cập nhật `users.email_verified = true`, `users.is_active = true`.
         - Set `user_invitations.used_at = NOW()`.
       - Nếu không hợp lệ: trả lỗi "Invalid or expired invitation token".
    3. **Resend invite** (`POST /admin/users/{userId}/resend-invite`):
       - Chỉ cho user chưa verify / chưa active.
       - Tạo token mới trong `user_invitations` (hoặc update record cũ nếu chưa dùng).
       - Gửi lại email invite với token mới.

- **Login** (`POST /auth/login`):
  - Input: `email`, `password`.
  - Validate: user tồn tại, `password` đúng, `email_verified = true`, `role != null`.
  - Generate: `accessToken` (JWT, ngắn hạn) + `refreshToken` (JWT, dài hạn).
  - Response body: `user`, `accessToken`, `expiresAt`.
  - Response header: `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Max-Age=...`
  - **Redis**: Lưu `refresh_token:{jti}` → `userId` (TTL = thời gian hết hạn refresh). SADD `user_refresh_tokens:{userId}` jti.
  - **Multi-device**: Mỗi lần login tạo session mới, không ghi đè session cũ. User có thể đăng nhập đồng thời trên nhiều thiết bị (mobile, desktop, tablet...).

- **Refresh Token** (`POST /auth/refresh`):
  - Input: `refreshToken` từ **HTTP Cookie** (browser tự gửi khi request đến `Path=/auth/refresh`).
  - Validate: JWT signature + expiry + `refresh_token:{jti}` tồn tại trong Redis (token đã được cấp và chưa bị revoke).
  - Nếu không tồn tại trong Redis → `UNAUTHENTICATED` (token đã logout hoặc chưa từng được cấp).
  - **Token rotation**: Thu hồi token cũ (DEL `refresh_token:{jti}`, SREM khỏi user set), generate token mới, lưu vào Redis.
  - Response: giống Login (`user`, `accessToken`, `expiresAt` + Set-Cookie với refresh token mới).
  - **Multi-device**: Mỗi device có refresh token riêng. Refresh chỉ validate và rotate token của device hiện tại, không ảnh hưởng các device khác.

- **Logout** (`POST /auth/logout`):
  - Input: `accessToken` (body) + `refreshToken` (cookie, optional).
  - **Access token**: Parse JWT, lấy `jti` + `expiry_time` → ghi vào `invalidated_token` (`id = jti`). Mọi request sau có `jti` này trong access token bị reject.
  - **Refresh token**: Nếu cookie có `refreshToken` → parse lấy `jti`, DEL `refresh_token:{jti}`, SREM khỏi `user_refresh_tokens:{userId}`. Chỉ device này không refresh được nữa.
  - **Response header**: `Set-Cookie: refreshToken=; Max-Age=0; Path=/auth/refresh` → xóa cookie trên browser.
  - **Multi-device**: Logout chỉ invalidate session của device gọi API. Các device khác vẫn đăng nhập bình thường.

- **Forgot password** (`POST /auth/forgot-password`):
  - Tìm user theo email (multi-tenant: user thuộc company).
  - Generate token random → insert vào `password_reset_tokens` (`user_id`, `company_id`, `token`, `expires_at = NOW() + 1h`, `used_at = NULL`, `sent_at = NOW()`).
  - Gửi email với link chứa token.

- **Reset password** (`POST /auth/reset-password`):
  - So sánh token từ request với `token` trong `password_reset_tokens` (used_at IS NULL, expires_at > NOW, deleted_at IS NULL).
  - Nếu hợp lệ: set password mới cho user, `password_reset_tokens.used_at = NOW()`.
  - Nếu không: trả lỗi "Invalid or expired reset token".

- **Session lifecycle** (Redis):
  - **Login**: Tạo `refresh_token:{jti}` (TTL = refresh expiry), SADD `user_refresh_tokens:{userId}` jti.
  - **Refresh**: Xóa token cũ, tạo token mới (rotation).
  - **Logout**: Xóa `refresh_token:{jti}` khỏi Redis.
  - **TTL**: Redis tự xóa key khi hết TTL. Set `user_refresh_tokens:{userId}` có expiry khi refresh để tránh set rỗng tồn tại vĩnh viễn.

---

## 2. Company & subscription / billing flow

- **Subscription plans** (`subscription_plans`):
  - Catalog các gói (FREE/BASIC/PRO/...), chứa hạn mức: `maxJobs`, `maxUsers`, `maxApplications`, `duration_days`, ...

- **Plan limit enforcement** (qua `PlanLimitService`):
  - **maxApplications**: Khi tạo Application (candidate apply hoặc HR manual entry).
    - Lấy subscription ACTIVE → plan → `max_applications`. Nếu `NULL` → unlimited.
    - Đếm applications của company (`deleted_at IS NULL`). Nếu `count >= max` → `PLAN_LIMIT_APPLICATIONS_EXCEEDED` (403).
  - **maxJobs**: Khi tạo Job (`POST /jobs`).
    - Lấy subscription ACTIVE → plan → `max_jobs`. Nếu `NULL` → unlimited.
    - Đếm jobs của company (`deleted_at IS NULL`). Nếu `count >= max` → `PLAN_LIMIT_JOBS_EXCEEDED` (403).
  - **maxUsers**: Khi invite user (`POST /admin/users/invite`).
    - Chỉ áp dụng cho invite (user `isBillable = true`). Add Employee (`isBillable = false`) không tính.
    - Lấy subscription ACTIVE → plan → `max_users`. Nếu `NULL` → unlimited.
    - Đếm users billable của company (`is_billable = true`, `deleted_at IS NULL`). Nếu `count >= max` → `PLAN_LIMIT_USERS_EXCEEDED` (403).
  - Nếu company không có subscription ACTIVE → `COMPANY_SUBSCRIPTION_NOT_EXISTED`.

- **Company subscriptions** (`company_subscriptions`):
  - Khi company mua/đổi gói:
    - Tạo record với `status = PENDING`, `start_date`, `end_date (nullable)`.
    - Sau thanh toán thành công → `status = ACTIVE`, set `end_date` nếu có kỳ hạn.
  - Khi hết hạn:
    - **PlanLimitScheduler** chạy theo cron (mặc định mỗi giờ): tìm subscription `ACTIVE` có `end_date < NOW()`, chuyển `status` sang `EXPIRED`. Config: `scheduler.plan-limit.cron`.
  - Khi admin hủy:
    - `status = CANCELLED`, có thể cắt quyền ngay hoặc đến `end_date`.

- **Payments** (`payments`):
  - `INIT` → khi tạo giao dịch (redirect VNPAY, ...).
  - Nếu provider callback thành công:
    - `status = SUCCESS`, set `paid_at`.
    - Cập nhật `company_subscriptions` tương ứng (`status = ACTIVE`).
  - Nếu thất bại / timeout:
    - `status = FAILED`.

---

## 3. Job lifecycle (Job Postings)

### 3.1. Tạo & quản lý Job

- **Tạo job** (`POST /jobs`):
  - Actor: **HR/Recruiter**.
  - **Check plan limit**: `PlanLimitService.enforceJobLimit` — nếu `count(jobs) >= plan.maxJobs` → `PLAN_LIMIT_JOBS_EXCEEDED`.
  - DB: tạo record trong `jobs` với:
    - `job_status = DRAFT` (theo API & entity `Job`).
    - `company_id` lấy từ JWT, không cho client tự truyền.
  - `applications_count = 0`, `views_count = 0`.

- **Cập nhật job** (`PUT /jobs/{id}`):
  - Cho phép chỉnh `title`, `position`, `job_type`, lương, mô tả, v.v.
  - Có thể cập nhật `job_status` (nhưng đổi trạng thái chuẩn nên dùng endpoint riêng `/jobs/{id}/status`).

- **Xóa job** (`DELETE /jobs/{id}`):
  - Soft delete: set `deleted_at` (qua `BaseSoftDeleteEntity.softDelete()`).
  - Mọi query business đều filter `deleted_at IS NULL`.

### 3.2. Trạng thái Job & quy tắc chuyển

- **Enum** (`jobs.job_status`):
  - `DRAFT` → job đang nháp, chưa public.
  - `PUBLISHED` → job đã publish, mở apply.
  - `PAUSED` → tạm dừng nhận CV, vẫn còn trong hệ thống.
  - `CLOSED` → đóng job, không nhận thêm ứng viên.
  - `FILLED` → đã tuyển đủ, pipeline kết thúc với job này.

- **Endpoint đổi trạng thái** (`PATCH /jobs/{id}/status`):
  - Request: `{ "jobStatus": "PUBLISHED", "publishedAt": ..., "expiresAt": ... }`.
  - Khi publish:
    - `job_status = PUBLISHED`.
    - `publishedAt` set theo request.
    - `expiresAt` thường = `deadline_date 23:59:59`.
  - Khi pause/close/filled:
    - `job_status` cập nhật tương ứng, business rule chi tiết có thể thêm:
      - Không cho `FILLED` nếu chưa có `HIRED` application, tùy yêu cầu.

---

## 4. Application lifecycle (CORE ATS)

### 4.1. Pipeline & Application Status

- Bảng `application_statuses`:
  - Các trường workflow:
    - `status_type`: `APPLIED | SCREENING | INTERVIEW | OFFER | HIRED | REJECTED`.
    - `sort_order`: thứ tự hiển thị pipeline.
    - `is_terminal`: trạng thái kết thúc (`HIRED`, `REJECTED`).
    - `is_default`: status mặc định khi tạo application mới.
  - Enum `StatusType` (Java) giữ **thứ tự logic**:
    - `APPLIED(1), SCREENING(2), INTERVIEW(3), OFFER(4), HIRED(5), REJECTED(99)`.

- **Application chính** (`applications`):
  - Link tới `job`, `company`, `status` (FK tới `application_statuses`).
  - Các trường quan trọng: `source`, `applied_date`, `match_score`, `matched_skills (JSON)`, `assigned_to`, `allow_additional_uploads`, v.v.
  - `assigned_to`: user (HR/Recruiter) **phụ trách chính** hồ sơ; mặc định khi candidate apply, hệ thống sẽ set `assigned_to = job.created_by` (owner của job). Lead có thể **reassign** hoặc **bulk assign** khi cần.

- **History** (`application_status_history`):
  - Ghi lại mọi lần đổi status:
    - `application_id`, `from_status_id`, `to_status_id`, `changed_by`, `note`, `changed_at`.
  - Dùng cho audit & UI timeline.

### 4.2. Tạo Application – Candidate self-service (flow chính)

- **Endpoint**: `POST /public/jobs/{jobId}/apply`.
  - Actor: **Candidate (public, không login)**.
  - Input: form-data `candidateName`, `candidateEmail`, `candidatePhone`, `coverLetter`, `resume (file)`.

- **Business flow (từ `ApplicationServiceImpl.ApplyToJob`)**:
  1. Load `Job` theo `jobId` (phải `deleted_at IS NULL`).
  2. **Check plan limit**: Lấy subscription ACTIVE của `job.company` → nếu `plan.maxApplications` có giá trị và `count(applications) >= maxApplications` → lỗi `PLAN_LIMIT_APPLICATIONS_EXCEEDED`.
  3. Lấy `ApplicationStatus` default:
     - Ưu tiên status có `company_id = job.company_id` và `is_default = true`.
     - Nếu không có → dùng system default (`company_id IS NULL`, `is_default = true`), nếu không tồn tại → lỗi `DEFAULT_STATUS_NOT_CONFIGURED`.
  4. Validate file CV là PDF (`PdfFileValidator`).
  5. Upload CV lên Cloudinary:
     - Folder: `jobtracker_ats/applications/{applicationToken}/cv`.
     - Lưu `resumeFilePath` = `secure_url`, nếu upload fail → throw + rollback.
  6. Parse text từ PDF, load `job_skills`, gọi `CVScoringService.score()` → tính `matchScore` + `matched / missing skills`.
  7. Tạo `Application`:
     - `status` = default status (thường là kiểu `APPLIED`), `applicationToken` random UUID.
     - `assignedTo` = `job.createdBy` (HR/Recruiter tạo job) để mỗi application ngay từ đầu đã có người phụ trách mặc định.
     - `appliedDate = LocalDate.now()`.
     - `matchScore`, `matchedSkills (JSON)`, `resumeFilePath`, `candidate info`, ...
  8. Save `Application` (nếu fail → xóa file Cloudinary).
  9. (Theo `API.md`): tạo bản ghi đầu tiên trong `application_status_history` với `fromStatus = null`, `toStatus = default`.
  10. Gửi email xác nhận + tạo `Notification` type `APPLICATION_RECEIVED` cho HR/Recruiter (thực hiện qua event + notification/email service).

### 4.3. Tạo Application – HR manual entry (flow phụ)

- **Endpoint**: `POST /applications`.
  - Actor: **HR/Recruiter**.
  - Request chứa `jobId`, `candidateName`, `candidateEmail`, `statusId`, `source`, `appliedDate`, ...
  - Trong `ApplicationServiceImpl.createApplication`:
    - Validate `Job` tồn tại, `ApplicationStatus` tồn tại.
    - **Check plan limit**: Giống ApplyToJob — nếu `count(applications) >= plan.maxApplications` → lỗi `PLAN_LIMIT_APPLICATIONS_EXCEEDED`.
    - Tạo `Application` với status theo `request.statusId`.
    - CV sẽ được upload sau dưới dạng `Attachment` (`attachmentType = RESUME`).

### 4.4. Upload attachments (CV + tài liệu bổ sung)

- **Khi apply**:
  - CV bắt buộc trong `ApplyToJob`, lưu trực tiếp vào `applications.resume_file_path`.

- **Upload bổ sung** (`POST /public/applications/{applicationToken}/attachments`):
  - Actor: **Candidate** (public, dùng `applicationToken`).
  - Logic trong `UploadAttachments`:
    - Tìm `Application` qua `applicationToken`.
    - Check điều kiện:
      - Status type phải là `SCREENING` hoặc `INTERVIEW`, **HOẶC** `allow_additional_uploads = true`.
      - Nếu không → `ErrorCode.UPLOAD_NOT_ALLOWED`.
    - Upload file lên Cloudinary (`.../applications/{applicationToken}/attachment`).
    - Tạo `Attachment`:
      - Link tới `application`, `company`, `user` (nếu có).
      - `attachment_type`: `CERTIFICATE` / `PORTFOLIO` / `OTHER`.

### 4.5. Theo dõi trạng thái Application (Candidate side)

- **Endpoint**: `GET /public/applications/{applicationToken}/status`.
  - Actor: **Candidate**.
  - Logic trong `TrackStatus`:
    - Load application theo token.
    - Trả về:
      - `jobTitle`, `candidateName`, `candidateEmail`.
      - `status { name, displayName, color }`.
      - `appliedDate`, `updatedAt`.
    - **Không** trả về `matchScore` hoặc thông tin nội bộ.

### 4.6. Quản lý Application (HR side)

- **List / detail**:
  - `GET /applications` → filter theo `status`, `jobId`, `assignedTo`, match score range, ...
  - `GET /applications/{id}` → full detail + match score breakdown.
  - Service: `getApplications`, `getApplicationById` dùng `securityUtils.getCurrentUser()` và filter theo `company_id`.

- **Assign Application** (`PATCH /applications/{id}/assign`):
  - `ApplicationServiceImpl.AssignApplication`:
    - Load `User` theo `assignedTo`.
    - Tìm `Application` cùng `company` với user.
    - Set `assignedTo`, save.

- **Update details** (`PUT /applications/{id}`):
  - Cho phép sửa `notes`, `rating`, `coverLetter`, `allowAdditionalUploads`, ...
  - `ApplicationServiceImpl.updateApplication`:
    - Load application theo `company_id` hiện tại.
    - Dùng `ApplicationMapper.updateApplication`.

- **Soft delete Application** (`DELETE /applications/{id}`):
  - Gọi `application.softDelete()` → set `deleted_at`.

### 4.7. Đổi trạng thái Application – Business rules

- **Endpoint**: `PATCH /applications/{id}/status`.
  - Request: `{ "statusId": "...", "notes": "..." }`.
  - Logic trong `updateStatus`:
    1. Load `Application` theo `id` + `company_id` hiện tại.
    2. Lấy `currentStatus` & `newStatus`:
       - `newStatus` phải thuộc cùng `company_id` và `is_active = true`, `deleted_at IS NULL`.
    3. Lấy `StatusType currentType`, `StatusType newType`.
    4. **Validation**:
       - Nếu `currentType.isTerminal()` → lỗi `APPLICATION_STATUS_IS_TERMINAL`.
       - Nếu `currentStatus.id == newStatus.id` → `APPLICATION_STATUS_SAME`.
       - Nếu `!currentType.canMoveTo(newType)` → `APPLICATION_STATUS_INVALID_TRANSITION`.
         - `canMoveTo` đảm bảo:
           - Chuẩn lifecycle: `APPLIED → SCREENING → INTERVIEW → OFFER → HIRED`.
           - Từ **bất kỳ stage** có thể chuyển sang `REJECTED`.
           - Không đi ngược chiều (không `OFFER` → `INTERVIEW`, không `SCREENING` → `APPLIED`).
    5. Ghi `ApplicationStatusHistory`:
       - `fromStatus = currentStatus`, `toStatus = newStatus`, `changedBy = currentUser`, `notes`.
    6. Cập nhật `application.status = newStatus`, save.
    7. Trả về `UpdateApplicationStatusResponse` chứa `previousStatus`, `statusId`, `updatedAt`.

- **Tác động phụ tiềm năng**:
  - Khi status sang `INTERVIEW` / `OFFER` / `HIRED` / `REJECTED`:
    - Tạo `Notification` tương ứng `STATUS_CHANGE`.
    - Gửi email template (`OFFER_LETTER`, `REJECTION`, ...) qua `email_outbox` (theo `EMAIL_TRIGGERS`).

### 4.8. Comments trên hồ sơ ứng viên (Application Comments)

- **Mục đích**:
  - Cho phép HR/Recruiter trao đổi nội bộ về candidate trên từng application.
  - Một phần comments có thể được dùng để **yêu cầu thêm tài liệu** từ candidate.

- **Entity**: `comments`
  - Link tới: `application_id`, `user_id` (author).
  - Trường chính:
    - `comment_text`: nội dung comment.
    - `is_internal`: `true` = chỉ nội bộ HR (candidate không thấy), `false` = có thể hiển thị cho candidate (tùy UX).
    - Audit: `created_at`, `updated_at`, `deleted_at` (soft delete).

- **APIs chính**:
  - `GET /applications/{applicationId}/comments`:
    - Lấy danh sách comments theo application, thường sort theo `created_at`.
  - `POST /applications/{applicationId}/comments`:
    - Tạo comment mới; user hiện tại là author.
  - `PUT /applications/{applicationId}/comments/{commentId}`:
    - Cập nhật comment (chỉ author hoặc admin được sửa).
  - `DELETE /applications/{applicationId}/comments/{commentId}`:
    - Soft delete comment (chỉ author hoặc admin được xoá).

- **Business rules & hooks**:
  - Khi tạo comment:
    - Có thể (tuỳ UI/API) kèm cờ như `requestDocuments = true`:
      - Backend bật `application.allowAdditionalUploads = true` để candidate có thể upload thêm attachments (xem mục 4.4).
    - Tạo `Notification` type `COMMENT_ADDED` cho các HR liên quan (hoặc owner của application), nếu cần.
  - Khi xoá comment:
    - Không xoá cứng, dùng soft delete để bảo toàn audit trail.

### 4.9 CV Scoring (Match Score)

- **Mục đích**: Tự động tính điểm khớp (0–100) giữa CV và Job Description dựa trên skills của job. HR dùng để filter/sort applications, biết candidate thiếu skill gì.

---

#### 4.9.1 Các entry point trigger scoring

| Entry point | API | Service/Method | Thời điểm |
|-------------|-----|---------------|-----------|
| **Candidate apply** | `POST /public/jobs/{jobId}/apply` | `ApplicationServiceImpl.ApplyToJob` | Ngay trong request, **synchronous** |
| **HR upload CV** | `POST /applications/{applicationId}/attachments` | `AttachmentServiceImpl.uploadAttachment` | Chỉ khi `attachmentType = RESUME` |

**Lưu ý**: `POST /public/applications/{token}/attachments` (candidate upload thêm tài liệu) **không** trigger scoring — chỉ dùng cho CERTIFICATE, PORTFOLIO, OTHER. Folder `.../attachment` khác với CV `.../cv`.

---

#### 4.9.2 Flow chi tiết – Candidate apply

**`ApplicationServiceImpl.ApplyToJob`** (bước 4–7 trong flow tổng):

1. `pdfFileValidator.validate(request.getResume())` — validate PDF.
2. Upload CV lên Cloudinary → folder `jobtracker_ats/applications/{applicationToken}/cv`.
3. **Extract text**: `extractText(resume.getInputStream())` — private method dùng Apache PDFBox `Loader.loadPDF()` + `PDFTextStripper.getText()`.
4. **Load job skills**: `jobSkillRepository.findSkillsByJobId(jobId)` — query `job_skills` JOIN `skills` với `isDeleted = false`, `isActive = true`. Trả về `List<JobSkillWithName>` (skillId, skillName, isRequired, proficiencyLevel).
5. **Score**: `cvScoringService.score(extractText, jobSkillWithNames)` → `ApplicationScoringResult`.
6. **Map sang JSON**: `MatchedSkillsJson` → `objectMapper.writeValueAsString()` → lưu vào `matchedSkills`.
7. Tạo `Application` với `matchScore`, `matchedSkills`, `extractedText`, `resumeFilePath`, save.

---

#### 4.9.3 Flow chi tiết – HR upload CV

**`AttachmentServiceImpl.uploadAttachment`** (khi `attachmentType == RESUME`):

1. `pdfFileValidator.validate(request.getFile())`.
2. Upload file lên Cloudinary → folder `jobtracker_ats/applications/{applicationId}/cv`.
3. **Extract text**: `pdfExtractionService.extractText(file.getInputStream())` — `PdfExtractionServiceImpl` dùng PDFBox (giống ApplyToJob).
4. **Load job skills**: `jobSkillRepository.findSkillsByJobId(application.getJob().getId())`.
5. **Score**: `cvScoringService.score(extractText, jobSkillWithNames)`.
6. **Cập nhật Application**: `application.setResumeFilePath`, `setMatchScore`, `setExtractedText`, `setMatchedSkills` → `applicationRepository.save()`.
7. Tạo `Attachment` record (link tới application, type RESUME).

---

#### 4.9.4 Logic scoring – `CVScoringServiceImpl.score`

**Input**: `cvText` (String), `jobSkills` (List&lt;JobSkillWithName&gt;).

**Bước 1 – Guard**: Nếu `cvText == null` hoặc blank, hoặc `jobSkills == null` hoặc empty → `buildZeroResult()`:
- `matchScore = 0`, `missingRequiredSkills` = toàn bộ required, `missingOptionalSkills` = toàn bộ optional.
- Nếu `skills == null` → chỉ trả `matchScore = 0`.

**Bước 2 – Normalize CV**: `normalize(cvText)`:
- `Normalizer.normalize(input, NFD)` → tách dấu (ế → e + ^).
- `replaceAll("\\p{M}", "")` → bỏ dấu.
- `toLowerCase()`.
- `replaceAll("\\s+", " ")` → gom nhiều space thành 1.
- `trim()`.

**Bước 3 – Phân nhóm skills**:
- Required: `jobSkills.stream().filter(s -> isRequired == true)`.
- Optional: `jobSkills.stream().filter(s -> isRequired != true)`.

**Bước 4 – Evaluate skills** (`evaluateSkills`):
- Với mỗi skill: `containsSkill(normalizedCv, skill.getSkillName())`.
- **containsSkill**: normalize skill name, build regex `(?<!\S)` + `Pattern.quote(skill)` + `(?!\S)` — word boundary (trước/sau phải là space hoặc đầu/cuối). Match → `matched`, không match → `missing`.
- Trả về `SkillResult` (matched, missing) cho required và optional.

**Bước 5 – Tính điểm** (`calculateScore`):
- `totalRequired == 0 && totalOptional == 0` → return 0.
- Chỉ required: `(matchedRequired / totalRequired) × 100`.
- Chỉ optional: `(matchedOptional / totalOptional) × 100`.
- Cả hai: `(requiredRatio × 0.7 + optionalRatio × 0.3) × 100`.
- `Math.round()` → Integer 0–100.

**Output**: `ApplicationScoringResult` với matchScore, matchedRequiredCount, totalRequiredCount, matchedOptionalCount, totalOptionalCount, matchedRequiredSkills, missingRequiredSkills, matchedOptionalSkills, missingOptionalSkills.

---

#### 4.9.5 Lưu trữ & cấu trúc dữ liệu

- **Application**: `match_score` (INT), `matched_skills` (JSON), `extracted_text` (TEXT).
- **MatchedSkillsJson** schema:
  ```json
  { "matchedRequired": [], "missingRequired": [], "matchedOptional": [], "missingOptional": [] }
  ```

- **HR**: `GET /applications` — filter `minMatchScore`, `maxMatchScore`. Sort `sortBy=matchScore`.
- **HR**: `GET /applications/{id}` — trả `matchScore`, `matchScoreDetails` (breakdown từ `matched_skills`).
- **Candidate**: `GET /public/applications/{token}/status` — **không** trả match score.

---

#### 4.9.6 Edge cases

| Case | Xử lý |
|------|-------|
| CV rỗng, blank | `buildZeroResult` → matchScore = 0, missing = toàn bộ skills |
| Job không có skill | `buildZeroResult` → matchScore = 0 |
| PDF parsing fail (IOException) | Exception → không lưu Application; matchScore không được set |
| Skill name có ký tự đặc biệt (C++) | `Pattern.quote()` escape để không bị hiểu là regex |

---

## 5. Interview lifecycle

### 5.1. Tạo interview (link với Application)

- **Endpoint**: `POST /applications/{applicationId}/interviews`.
  - Actor: **HR/Recruiter**.
  - Request: `roundNumber`, `interviewType`, `scheduledDate`, `durationMinutes`, `interviewerIds[]`, `primaryInterviewerId`, `meetingLink`, `location`, `notes`.

- **Business flow** (`InterviewServiceImpl.create`):
  1. Lấy `currentUser` (HR), load `Application` theo `applicationId` + `company_id`.
  2. Xác định `primaryInterviewerId`:
     - Nếu null → lấy phần tử đầu tiên trong `interviewerIds`.
  3. Map request → entity `Interview`.
  4. `userRepository.findForUpdate(interviewerIds, companyId)` để lock tránh race.
  5. Gọi `validateScheduleConflict(...)`:
     - Kiểm tra mọi interviewer không bị trùng lịch với các interview `SCHEDULED` / `RESCHEDULED`.
  6. Với mỗi `interviewerId`:
     - Load `User`, tạo `InterviewInterviewer` với `isPrimary` = (id == primary).
  7. Set liên kết:
     - `interview.setApplication(application)`, `setCompany(application.company)`, `setJob(application.job)`, `setInterviewers(...)`.
     - `status = SCHEDULED`.
  8. Save `Interview`, trả `InterviewResponse`.
  9. Side effects điển hình:
     - Tạo `Notification` type `INTERVIEW_SCHEDULED` cho interviewers + HR.
     - Tạo email `INTERVIEW_SCHEDULE` cho Candidate (qua email templates/outbox).

### 5.2. Cập nhật / reschedule / hoàn thành interview

- **Endpoint**: `PUT /interviews/{id}`.
  - Request có thể đổi:
    - `scheduledDate`, `durationMinutes`, `actualDate`, `result`, `feedback`, `notes`, `questionsAsked`, `answersGiven`, `rating`, `interviewerIds`, `primaryInterviewerId`.

- **Business rule chính** (`update`):
  1. Load `Interview` theo `id` + `company_id`.
  2. Tính:
     - `scheduleChanged` nếu `scheduledDate` mới khác cũ.
     - `durationChanged` nếu `durationMinutes` mới khác cũ.
     - `interviewerChanged` nếu request có `interviewerIds`.
  3. Nếu bất kỳ cái nào thay đổi:
     - Gọi lại `userRepository.findForUpdate(...)` + `validateScheduleConflict(...)` với `excludeInterviewId = id` (bỏ qua chính nó).
  4. Nếu có `interviewerIds`:
     - Build set `InterviewInterviewer` mới (tương tự create).
     - Xóa list cũ, add list mới (replace hoàn toàn).
  5. Gọi `interviewMapper.updateInterview(...)` để update các field khác.
  6. **Quy tắc status**:
     - Nếu `request.actualDate != null` → `status = COMPLETED`.
     - Else nếu `scheduleChanged || durationChanged` → `status = RESCHEDULED`.
     - Nếu không đổi thời gian & không có `actualDate` → giữ nguyên status.
  7. Save interview.

### 5.3. Hủy interview

- **Endpoint**: `POST /interviews/{id}/cancel`.
  - Logic (`cancel`):
    - Load interview theo `id` + `company_id`.
    - `status = CANCELLED`, save.
  - Side effects:
    - Gửi notification `INTERVIEW_REMINDER` / `STATUS_CHANGE` tùy design.
    - Gửi email hủy lịch phỏng vấn cho candidate + interviewers.

### 5.4. Tránh trùng lịch (schedule validation)

- **`validateScheduleConflict`**:
  - Input: `interviewerIds`, `newStart`, `durationMinutes`, `companyId`, `excludeInterviewId`.
  - Tính `newEnd = newStart + durationMinutes`.
  - Lấy các interview hiện tại của từng interviewer:
    - Trạng thái trong `SCHEDULED`, `RESCHEDULED`.
    - Thuộc cùng `companyId`.
    - Trừ `excludeInterviewId` nếu update.
  - Với mỗi interview:
    - `existingStart = existing.scheduledDate`.
    - `existingEnd = existingStart + existing.duration_minutes`.
    - Nếu `newStart < existingEnd && newEnd > existingStart` → overlap → throw `ErrorCode.SCHEDULE_CONFLICT`.

---

## 6. Notifications & email flow

### 6.1. Notification entity & APIs

- Bảng `notifications`:
  - Link tới `user`, `company`, `job (nullable)`, `application (nullable)`.
  - Trường chính:
    - `type`: enum logic `NotificationType`:
      - `APPLICATION_RECEIVED`, `INTERVIEW_SCHEDULED`, `INTERVIEW_REMINDER`, `STATUS_CHANGE`, `DEADLINE_REMINDER`, `COMMENT_ADDED`, `ASSIGNMENT_CHANGED`, ...
    - `priority`: `HIGH` / `MEDIUM` / `LOW`.
    - `is_read`, `is_sent`, `sent_at`, `scheduled_at`, `metadata (JSON)`.

- **APIs chính**:
  - `GET /notifications`: list theo user, filter theo `isRead`, `type`, `applicationId`.
  - `PATCH /notifications/{id}/read`: set `isRead = true`.
  - `PATCH /notifications/read-all`: mark tất cả là read (theo company + user).
  - `POST /notifications`: tạo notification manual/admin.
  - `GET /notifications/{id}`: chi tiết một notification.
  - `DELETE /notifications/{id}`: xóa notification.

- **NotificationServiceImpl.create**:
  - Validate `userId` + `companyId` hợp lệ và cùng tenant.
  - Nếu có `jobId`, `applicationId` → validate thuộc company.
  - Map request → `Notification`, set liên kết rồi save.

### 6.2. Email templates & email outbox

- **Templates** (`email_templates`):
  - `code` = `WELCOME`, `INTERVIEW_INVITE`, `OFFER_LETTER`, `REJECTION`, ...
  - Có thể global (`company_id = NULL`) hoặc override theo company.

- **CANDIDATE_WORKFLOW_LAYOUT** (layout type cho email automation gửi candidate):
  - Cấu trúc: `{{content}}` + footer cố định + `{{application_link}}`.
  - `{{content}}`: Nội dung chính từ template workflow (APPLICATION_CONFIRMATION, INTERVIEW_SCHEDULED, OFFER_CREATED, CANDIDATE_REJECTED, ...). Mỗi template chỉ định nghĩa phần content.
  - Footer: Phần cố định (logo công ty, địa chỉ, link unsubscribe).
  - `{{application_link}}`: Link track status dạng `app.example.com/status?token={applicationToken}` — candidate click để xem trạng thái hồ sơ.
  - Hệ thống wrap content bằng layout type này khi gửi các email: apply confirmation, interview invite/reschedule, offer, hired, rejected.

- **User/Auth emails**: `USER_INVITE`, `USER_INVITE_RESEND`, `EMAIL_VERIFICATION`, `EMAIL_VERIFICATION_RESEND`, `PASSWORD_RESET` — trigger từ API invite, verify, forgot-password.

- **Outbox** (`email_outbox`):
  - Trường business:
    - `email_type`, `aggregate_type` (`USER`, `APPLICATION`, `INTERVIEW`), `aggregate_id`, `company_id`.
    - `status`: `PENDING` → `SENT` / `FAILED`, `retry_count`, `next_retry_at`.
  - Flow:
    - Business service (vd: nhận application, tạo interview, đổi status) → push record vào `email_outbox` với snapshot nội dung email.
    - Worker/scheduler đọc `PENDING`, gửi qua provider (Brevo), update `status`, `sent_at`, `failed_reason`.

### 6.3. Ví dụ mapping events → NotificationType / Email

- **New application**:
  - Khi `ApplyToJob` thành công:
    - Notification:
      - `type = APPLICATION_RECEIVED`, link `jobId`, `applicationId`.
    - Email:
      - Candidate: email cảm ơn + token track status (`email_type = APPLICATION_RECEIVED`).
      - HR: optional `APPLICATION_RECEIVED` tóm tắt.

- **Status change (application)**:
  - Khi `updateStatus` → `StatusType` chuyển sang:
    - `INTERVIEW`: có thể gửi email mời phỏng vấn, nhưng chuẩn flow là qua `Interview` entity.
    - `OFFER`: gửi email `OFFER_LETTER`.
    - `REJECTED`: gửi email `REJECTION`.
  - Notification: `type = STATUS_CHANGE`, metadata chứa `fromStatus`, `toStatus`.

- **Interview scheduled / rescheduled / cancelled**:
  - Khi create/update/cancel interview:
    - Notification:
      - `INTERVIEW_SCHEDULED` hoặc `STATUS_CHANGE` cho interviewer(s) + HR.
      - `INTERVIEW_REMINDER` từ scheduler trước giờ phỏng vấn X phút/giờ.
    - Email:
      - Candidate + interviewers: `INTERVIEW_SCHEDULE`, template chứa `meeting_link`, thời gian, location.

- **Deadline reminders**:
  - Scheduled job quét `jobs` với `deadline_date` sắp tới:
    - Tạo `Notification` type `DEADLINE_REMINDER`, metadata chứa `deadlineDate`, `jobTitle`.
    - Push email `DEADLINE_REMINDER` nếu cần.

### 6.4. Các flow email nghiệp vụ cụ thể

#### 6.4.1. Ứng viên apply → nhận email xác nhận (`APPLICATION_RECEIVED`)

- **Trigger**: Candidate gọi `POST /public/jobs/{jobId}/apply` thành công.
- **Hệ thống thực hiện**:
  - Sau khi lưu `Application` và tính `matchScore`, backend:
    - Lấy email template có `code = APPLICATION_RECEIVED`.
    - Tự động điền biến:
      - `{{candidate_name}}` ← `applications.candidate_name`.
      - `{{job_title}}` ← `jobs.title`.
      - `{{company_name}}` ← `companies.name`.
      - `{{application_link}}` ← link dạng `app.wesats.com/status?token={applicationToken}`.
    - Tạo một record trong `email_outbox`:
      - `email_type = APPLICATION_RECEIVED`.
      - `aggregate_type = APPLICATION`, `aggregate_id = application.id`.
      - `company_id = application.company_id`.
      - `status = PENDING`, `retry_count = 0`, `max_retries = 3`.
  - Worker đọc các bản ghi `PENDING`, gửi email qua provider, cập nhật:
    - Nếu gửi ok → `status = SENT`, set `sent_at`.
    - Nếu lỗi → tăng `retry_count`, tính `next_retry_at` cho lần thử sau.
- **Kết quả**: Ứng viên nhận email xác nhận ngay sau khi apply.

#### 6.4.2. HR gửi email mời phỏng vấn (`INTERVIEW_INVITE`)

- **Trigger**: HR mở hồ sơ ứng viên (application detail) và bấm nút **Send Interview Invite**.
- **UI / form**:
  - Chọn template: `INTERVIEW_INVITE`.
  - Form điền:
    - `interview_time`.
    - `meeting_link`.
  - Các thông tin sau được hệ thống tự có, không cho sửa:
    - `candidate_name` (email người nhận `to_email` hệ thống tự biết, không phải template variable).
    - `job_title`, `company_name`.
- **Backend**:
  - Lấy template `INTERVIEW_INVITE`.
  - Resolve biến:
    - Thông tin ứng viên/job (từ `applications` / `jobs` / `companies`).
    - Thông tin lịch phỏng vấn (từ form hoặc từ entity `Interview` nếu đã tồn tại).
  - Tạo record trong `email_outbox`:
    - `email_type = INTERVIEW_INVITE`.
    - `aggregate_type = INTERVIEW` (hoặc `APPLICATION` tuỳ thiết kế), `aggregate_id` liên quan.
    - `reply_to_email` = email HR, để ứng viên reply → trả về HR.
    - `status = PENDING`.
  - Worker gửi email như flow outbox chung.
- **Kết quả**: Ứng viên nhận được email mời phỏng vấn với đầy đủ thời gian, link họp và có thể reply trực tiếp cho HR.

#### 6.4.3. HR đổi lịch phỏng vấn (`INTERVIEW_RESCHEDULE`)

- **Trigger**: HR chỉnh sửa lịch trong màn hình interview (hoặc bấm nút **Reschedule Interview**).
- **Flow**:
  - Cập nhật entity `Interview` (đổi `scheduledDate` / `durationMinutes` → `status = RESCHEDULED` như mô tả ở mục 5.2).
  - Lấy template `INTERVIEW_RESCHEDULE`.
  - Điền biến tương tự `INTERVIEW_INVITE` (thời gian mới, link họp mới, job, candidate, company).
  - Ghi một dòng `email_outbox` với:
    - `email_type = INTERVIEW_RESCHEDULE`.
    - Liên kết tới `Interview` / `Application`.
  - Worker gửi email thông báo đổi lịch tới candidate và interviewers.

#### 6.4.4. Cấu hình email automation per Application Status

- Mỗi record `application_statuses` ngoài metadata hiển thị còn có 2 cờ điều khiển email:
  - `auto_send_email`: backend dùng làm **default** – nếu API đổi trạng thái **không truyền** `sendEmail`, hệ thống sẽ gửi email khi `auto_send_email = TRUE` và status type phù hợp (OFFER/HIRED/REJECTED).
  - `ask_before_send`: UI dùng để quyết định có bật popup hỏi HR "**Có gửi email cho ứng viên không?**" khi chuyển sang status đó hay không.
- Đề xuất default cho system pipeline:
  - `NEW` (APPLIED): `auto_send_email = FALSE`, `ask_before_send = FALSE` (email xác nhận apply dùng flow `APPLICATION_CONFIRMATION` riêng).
  - `SCREENING` (SCREENING): `auto_send_email = FALSE`, `ask_before_send = FALSE`.
  - `INTERVIEWING` (INTERVIEW): `auto_send_email = FALSE`, `ask_before_send = FALSE`.
  - `OFFERED` (OFFER): `auto_send_email = FALSE`, `ask_before_send = TRUE` (UI nên hỏi HR trước khi gửi offer email).
  - `HIRED` (HIRED): `auto_send_email = FALSE`, `ask_before_send = TRUE`.
  - `REJECTED` (REJECTED): `auto_send_email = FALSE`, `ask_before_send = TRUE` (luôn gợi ý HR gửi email từ chối, nhưng vẫn cho phép chọn không gửi).
- API đổi trạng thái (`PATCH /applications/{id}/status`) nhận thêm field `sendEmail`:
  - Nếu `sendEmail` **không null** → backend tôn trọng đúng giá trị client gửi (true/false).
  - Nếu `sendEmail` **null** → backend fallback dùng `auto_send_email` trên status mới để quyết định có tạo email workflow hay không.

#### 6.4.5. HR gửi Offer (`OFFER_LETTER`)

- **Trigger**: HR trong hồ sơ ứng viên bấm **Send Offer**.
- **Form**:
  - `offer_salary`.
  - `offer_start_date`.
  - `offer_expire_date`.
  - `custom_message` (nếu cần thêm điều kiện/ghi chú).
- **Backend**:
  - Lấy template `OFFER_LETTER` (hoặc tương đương).
  - Điền biến:
    - Ứng viên, job, công ty.
    - `offer_salary`, `offer_start_date`, `offer_expire_date` và `custom_message` từ form.
  - Ghi record `email_outbox`:
    - `email_type = OFFER_LETTER`.
    - `aggregate_type = APPLICATION`, `aggregate_id = application.id`.
  - Worker gửi email.
- **Kết quả**: Ứng viên nhận được offer với format chuyên nghiệp, đồng bộ theo template.

#### 6.4.6. HR reject nhiều ứng viên cùng lúc (bulk reject)

- **Trigger**: HR tick chọn nhiều applications (ví dụ 30 ứng viên) rồi chọn hành động **Reject**.
- **Flow**:
  - HR chọn template: `REJECTION`.
  - Backend nhận danh sách `applicationIds`:
    - Với từng ứng viên:
      - (Tuỳ business) cập nhật `Application.status` sang một status tương ứng `StatusType = REJECTED`.
      - Tạo một record riêng trong `email_outbox`:
        - `email_type = REJECTION`.
        - `aggregate_type = APPLICATION`, `aggregate_id = application.id`.
        - `status = PENDING`.
  - Worker xử lý lần lượt các email `PENDING`:
    - Không block request của HR (bản thân action bulk reject chỉ tạo outbox, không gửi sync).
    - Có thể giới hạn concurrency để tránh spam provider.
- **Kết quả**:
  - Không treo hệ thống khi reject số lượng lớn.
  - Mỗi ứng viên chỉ nhận đúng một email reject, không gửi trùng.

#### 6.4.7. Link xem trạng thái hồ sơ trong email

- Trong mọi email liên quan tới ứng tuyển (apply, interview, offer, reject) có thể chèn link:
  - `View your application status: app.wesats.com/status?token={applicationToken}`.
- **Flow khi candidate click**:
  - Frontend gọi `GET /public/applications/{applicationToken}/status`.
  - Backend:
    - Kiểm tra token hợp lệ (`applications.application_token` tồn tại, chưa `deleted_at`).
    - Trả về:
      - `jobTitle`, `candidateName`, `candidateEmail`.
      - `status` hiện tại (theo pipeline: Applied / Screening / Interview / Offer / Hired / Rejected).
      - `appliedDate`, `updatedAt`.
  - UI hiển thị trạng thái pipeline; **không cần** tracking mở email, chỉ cần link hoạt động.

### 6.5. Khả năng quản lý template cho HR & hệ thống biến

- **HR được phép**:
  - Tạo template mới (ví dụ: `APPLICATION_RECEIVED`, `INTERVIEW_INVITE`, `INTERVIEW_RESCHEDULE`, `OFFER_LETTER`, `REJECTION`, ...).
  - Sửa nội dung (subject + body HTML) của template thuộc company mình.
  - Sử dụng **chỉ những biến đã được system expose**, không được tự nghĩ tên biến.
  - Preview template với data mẫu.
  - Gửi test email (ví dụ tới email của chính HR) để kiểm tra trước khi dùng thật.
- **HR không được**:
  - Viết code hoặc logic điều kiện phức tạp trong template.
  - Tự ý tạo biến mới ngoài danh sách biến mà backend cho phép.
  - Truy cập thông tin ngoài phạm vi tenant của mình.

#### 6.5.1. Nguyên tắc tạo biến & nhóm biến chuẩn

> **Nguyên tắc:**  
> - Biến phải bám theo **entity có thật trong DB**.  
> - Biến phải mô tả **workflow ATS có thật** (ứng tuyển, phỏng vấn, offer, billing).  
> - **Không bịa thêm domain** ngoài hệ thống (không phải CMS tự do).

- **Danh sách biến tối giản cho ATS email thực tế (giữ dưới 20 biến)**
  - **Company**:
    - `company_name`
  - **HR**:
    - `hr_name`
  - **Candidate**:
    - `candidate_name`
  - **Job**:
    - `job_title`
  - **Application**:
    - `application_status`
    - `application_link` (link để candidate xem trạng thái hồ sơ)
  - **Interview**:
    - `interview_time`
    - `interview_location`
    - `meeting_link`
  - **Offer**:
    - `offer_salary`
    - `offer_start_date`
    - `offer_expire_date`
  - **Billing (subscription)**:
    - `plan_name`
    - `plan_price`
    - `plan_expire_at`
  - **Flexible**:
    - `custom_message` (đoạn text HR nhập thêm tuỳ tình huống)

> Tổng biến còn **16**. Ngoài list này: **không expose** ra template (tránh maintenance nightmare).

#### 6.5.2. `email_template_types`, allowed_system_vars & allowed_manual_vars

- Mỗi template có:
  - **`email_template_type` / `email_type`**: ví dụ `APPLICATION_CONFIRMATION`, `INTERVIEW_SCHEDULED`, `MANUAL_OFFER`, ...
  - **`allowed_system_vars`**: danh sách biến hệ thống **auto-fill** (HR chỉ chèn placeholder, không nhập giá trị).
  - **`allowed_manual_vars`**: danh sách biến cho phép HR **nhập tay** (thường chỉ 1–2 biến, như `custom_message`).
- UI template chỉ hiển thị **subset hợp lệ** theo từng type, tránh việc HR được chơi với toàn bộ danh sách biến cùng lúc.

---

**0️⃣ User & Auth Emails**

| Template code | allowed_system_vars | allowed_manual_vars |
|---------------|---------------------|----------------------|
| **USER_INVITE** / **USER_INVITE_RESEND** | `company_name`, `user_email`, `user_first_name`, `user_last_name`, `user_name`, `invite_link` | — |
| **EMAIL_VERIFICATION** / **EMAIL_VERIFICATION_RESEND** | `company_name`, `user_email`, `user_first_name`, `user_last_name`, `user_name`, `verification_link` | — |
| **PASSWORD_RESET** | `company_name`, `user_email`, `user_first_name`, `user_last_name`, `user_name`, `reset_link` | — |

- **EmailContext** cho User/Auth: `userId`, `companyId`, `inviteToken` / `verificationToken` / `resetToken`.
- **Resolvers**: `InviteLinkResolver`, `VerificationLinkResolver`, `ResetLinkResolver`, `UserEmailResolver`, `UserFirstNameResolver`, `UserLastNameResolver`, `UserNameResolver`.

---

**1️⃣ Application Emails**

| Template code | allowed_system_vars | allowed_manual_vars |
|---------------|---------------------|----------------------|
| **APPLICATION_CONFIRMATION** (khi candidate apply thành công) | `candidate_name`, `job_title`, `company_name`, `application_link` | — |
| **APPLICATION_STATUS_UPDATED** (chuyển trạng thái: screening → interview → rejected → hired) | `candidate_name`, `job_title`, `company_name`, `application_status`, `application_link` | `custom_message` |
| **CANDIDATE_REJECTED** | `candidate_name`, `job_title`, `company_name`, `hr_name` | `custom_message` |
| **CANDIDATE_HIRED** | `candidate_name`, `job_title`, `company_name`, `hr_name` | `custom_message` |

---

**2️⃣ Interview Emails**

| Template code | allowed_system_vars | allowed_manual_vars |
|---------------|---------------------|----------------------|
| **INTERVIEW_SCHEDULED** | `candidate_name`, `job_title`, `company_name`, `interview_time`, `interview_location`, `meeting_link`, `hr_name` | `custom_message` |
| **INTERVIEW_RESCHEDULED** | `candidate_name`, `job_title`, `company_name`, `interview_time`, `interview_location`, `meeting_link`, `hr_name` | `custom_message` |
| **INTERVIEW_CANCELLED** | `candidate_name`, `job_title`, `company_name`, `hr_name` | `custom_message` |

---

**3️⃣ Offer Emails**

| Template code | allowed_system_vars | allowed_manual_vars |
|---------------|---------------------|----------------------|
| **MANUAL_OFFER** | `candidate_name`, `job_title`, `company_name`, `hr_name` | `offer_salary`, `offer_start_date`, `offer_expire_date`, `custom_message` |

---

### 6.5.4. Default email templates (bilingual EN + VI)

Để tránh mỗi môi trường phải tự tạo thủ công, hệ thống seed sẵn **global email templates** (company = `NULL`) cho toàn bộ `EmailType` đang dùng.  
Tất cả template đều là **song ngữ Anh/Việt trong cùng email**, sử dụng đúng whitelist biến ở trên.

- **APPLICATION_CONFIRMATION**
  - **Subject**:  
    - `"[{{company_name}}] Application received for {{job_title}} / Xác nhận nhận hồ sơ cho vị trí {{job_title}}"`
  - **Body (tóm tắt)**:
    - EN: Cảm ơn ứng viên, xác nhận đã nhận hồ sơ, nhắc lại `{{job_title}}`, `{{company_name}}` và đính kèm `{{application_link}}`.
    - VI: Nội dung tương đương tiếng Việt ngay phía dưới đoạn tiếng Anh.

- **INTERVIEW_SCHEDULED**
  - **Subject**:  
    - `"[{{company_name}}] Interview scheduled for {{job_title}} / Thư mời phỏng vấn vị trí {{job_title}}"`
  - **Body**:
    - EN: Thông báo lịch phỏng vấn với `{{interview_time}}`, `{{interview_location}}` hoặc `{{meeting_link}}`, ký tên `{{hr_name}}`.
    - VI: Bản dịch tiếng Việt đầy đủ ở dưới, dùng cùng biến.

- **INTERVIEW_RESCHEDULED**
  - **Subject**:  
    - `"[{{company_name}}] Interview rescheduled for {{job_title}} / Đổi lịch phỏng vấn vị trí {{job_title}}"`
  - **Body**:
    - EN: Thông báo lịch mới + lý do chung chung, giữ lại thông tin `{{interview_time}}`, `{{interview_location}}`, `{{meeting_link}}`.
    - VI: Đoạn tiếng Việt mô tả lịch mới với cùng thông tin.

- **CANDIDATE_REJECTED**
  - **Subject**:  
    - `"[{{company_name}}] Application update for {{job_title}} / Cập nhật kết quả ứng tuyển vị trí {{job_title}}"`
  - **Body**:
    - EN: Thông báo kết quả không phù hợp, cảm ơn ứng viên, có chỗ chèn `{{custom_message}}` nếu HR muốn cá nhân hóa.
    - VI: Nội dung tiếng Việt tương đương, giải thích lịch sự, tôn trọng.

- **CANDIDATE_HIRED**
  - **Subject**:  
    - `"[{{company_name}}] Congratulations on your new role: {{job_title}} / Chúc mừng trúng tuyển vị trí {{job_title}}"`
  - **Body**:
    - EN: Thông báo chúc mừng, nhấn mạnh `{{job_title}}`, `{{company_name}}`, ký tên `{{hr_name}}`, có thể thêm `{{custom_message}}`.
    - VI: Đoạn chúc mừng tiếng Việt đầy đủ phía dưới.

- **MANUAL_OFFER**
  - **Subject**:  
    - `"[{{company_name}}] Job offer for {{job_title}} / Thư mời làm việc vị trí {{job_title}}"`
  - **Body**:
    - EN: Tóm tắt offer với `{{offer_salary}}`, `{{offer_start_date}}`, `{{offer_expire_date}}` và phần `{{custom_message}}` cho điều khoản bổ sung.
    - VI: Diễn giải lại đầy đủ bằng tiếng Việt với cùng biến.

- **USER_INVITE / USER_INVITE_RESEND**
  - **Subject**:  
    - `"[{{company_name}}] You are invited to join JobTracker / Lời mời tham gia JobTracker của {{company_name}}"`
  - **Body**:
    - EN: Giới thiệu ngắn gọn, hướng dẫn click `{{invite_link}}` để tạo mật khẩu và đăng nhập.
    - VI: Bản tiếng Việt ngay dưới, cùng đường dẫn `{{invite_link}}`.

- **EMAIL_VERIFICATION / EMAIL_VERIFICATION_RESEND**
  - **Subject**:  
    - `"[{{company_name}}] Verify your email address / Xác thực địa chỉ email của bạn"`
  - **Body**:
    - EN: Hướng dẫn click `{{verification_link}}` để xác thực email.
    - VI: Phiên bản tiếng Việt với cùng message và link.

- **PASSWORD_RESET**
  - **Subject**:  
    - `"[{{company_name}}] Reset your password / Đặt lại mật khẩu JobTracker"`
  - **Body**:
    - EN: Hướng dẫn click `{{reset_link}}`, cảnh báo thời gian hết hạn.
    - VI: Nội dung tiếng Việt tương tự, nhấn mạnh thời hạn link.

Các template workflow cho candidate (APPLICATION_CONFIRMATION, INTERVIEW_SCHEDULED, INTERVIEW_RESCHEDULED, CANDIDATE_HIRED, CANDIDATE_REJECTED, MANUAL_OFFER) khi gửi thực tế sẽ được **wrap qua layout** `CANDIDATE_WORKFLOW_LAYOUT` để thêm header/footer và `{{application_link}}` theo mô tả ở trên.

> Nhờ việc **khóa danh sách biến theo từng `email_type`**:
> - Backend biết rõ biến nào **được phép** xuất hiện trong template.
> - Validate được template trước khi lưu/gửi.
> - Dễ maintain khi scale, vì tất cả biến đều bám **entity & workflow ATS có thật**, không biến thành CMS tự do.

#### 6.5.3. Phân loại biến: SystemVariable whitelist vs ManualVariable

> **Nguyên tắc SaaS scale**: HR **không** tự phân loại system/manual. Backend kiểm soát 100%.

- **SystemVariable** (whitelist cứng – enum `SystemVariable`):
  - Parse `{{var}}` → nếu trong whitelist → auto classify system.
  - **User/Auth**: `company_name`, `user_email`, `user_first_name`, `user_last_name`, `user_name`, `invite_link`, `verification_link`, `reset_link`.
  - **Application Workflow**: `hr_name`, `candidate_name`, `job_title`, `application_status`, `application_link`, `interview_time`, `interview_location`, `meeting_link`.

- **ManualVariable** (whitelist cứng – enum `ManualVariable`):
  - `offer_salary`, `offer_start_date`, `offer_expire_date`, `custom_message`.
  - HR nhập giá trị qua form khi gửi → inject vào `context.manualValues`.

- **Validate khi save template**:
  - Parse toàn bộ `{{variable}}` từ subject + htmlContent.
  - Nếu có biến không thuộc SystemVariable hoặc ManualVariable → **reject save**.

- **VariableResolver** (Strategy pattern):
  - Mỗi biến system = 1 resolver class (tự load entity từ context IDs).
  - Không dùng switch; thêm biến mới = thêm class.

- **EmailContext** dùng IDs (applicationId, companyId, userId, ...):
  - Tránh lazy loading lỗi khi async worker chạy ngoài transaction.
  - Resolver tự load entity khi cần.

### 6.6. Kiến trúc Email: Engine Layer vs Admin Layer

#### Email Engine Layer (Backend)

```
EmailTemplateService
EmailRenderService
EmailOutboxService
EmailSchedulerWorker
```

- **Business services** (apply, interview, offer, reject) → push record vào `email_outbox` với snapshot nội dung.
- **Scheduler** đọc `PENDING` / `FAILED` (retry) → gửi qua Brevo → cập nhật status.
- **Email outbox** không chỉ là queue nội bộ mà còn là **communication history** – audit log, delivery tracking, debug tool.

#### Admin Layer (API cho HR)

| API | Mục đích |
|-----|----------|
| **Email Template APIs** | Full CRUD + Preview + Send Test |
| **Email History APIs** | Read-only + Resend (không CREATE/UPDATE/DELETE) |

**Email History API** phục vụ:
- **Support**: HR hỏi "Ứng viên bảo chưa nhận email?" → tra cứu lịch sử.
- **Production**: Brevo downtime → nhiều FAILED → resend thủ công.
- **Compliance**: "Cho tôi log tất cả email đã gửi cho ứng viên A trong tháng 2".

### 6.7. Màn hình / tính năng cần có quanh email

- **Template List**:
  - Liệt kê tất cả templates (code, name, status active/inactive).
  - Cho phép search/filter theo `code`, `name`.
- **Create / Edit Template**:
  - Form chỉnh sửa subject + HTML body + danh sách biến (read-only).
  - Cho phép enable/disable template.
- **Preview Template**:
  - Hiển thị bản render với data mẫu (hoặc data thật của 1 application được chọn).
- **Send Test Email**:
  - Nhập địa chỉ email test (mặc định là email của HR hiện tại).
  - Gửi 1 bản preview qua `email_outbox` với `aggregate_type = USER`.
- **Email History / Email Outbox View**:
  - Xem lịch sử email đã/quá gửi (từ `email_outbox`):
    - Filter theo `status` (`PENDING`, `SENT`, `FAILED`), `email_type`, `aggregate_type`, `aggregate_id`, `created_at`.
  - Cho phép xem chi tiết 1 email (subject, body, lỗi nếu `FAILED`).
  - **Resend thủ công** cho email FAILED (optional).
- **Bulk Email Action**:
  - Hỗ trợ các actions gửi hàng loạt (ví dụ bulk reject) thông qua việc sinh nhiều bản ghi trong `email_outbox` thay vì gửi trực tiếp.

### 6.8. Xử lý lỗi gửi email, retry & resend

- **Worker / scheduler**:
  - Định kỳ quét `email_outbox` với:
    - `status = PENDING`.
    - Hoặc `status = FAILED` nhưng còn `retry_count < max_retries` và `next_retry_at <= NOW()`.
  - Mỗi lần gửi:
    - Nếu provider thành công → `status = SENT`, set `sent_at`.
    - Nếu lỗi (timeout, 4xx/5xx, network, ...) → tăng `retry_count`, set `next_retry_at` cho lần thử kế tiếp.
  - Nếu `retry_count` vượt `max_retries`:
    - Đặt `status = FAILED`, lưu `failed_reason`.
- **UI cho HR** (qua Email History API):
  - Xem lịch sử email đã gửi / đang chờ / thất bại.
  - Hành động **Resend**:
    - Reset `status` về `PENDING`, `retry_count = 0` → scheduler pick up và gửi lại.
    - Use case: Brevo downtime, nhiều email FAILED → HR resend hàng loạt.

### 6.9. Tóm tắt năng lực hệ thống email

- Gửi email **tự động** theo các sự kiện (ứng viên apply, đổi status, tạo/đổi lịch interview, deadline gần, ...).
- Gửi email **thủ công** từ HR (mời phỏng vấn, đổi lịch, offer, reject, bulk reject).
- Hỗ trợ **template động** với biến được quản lý tập trung, không cho HR viết logic.
- **Email Outbox** = queue + communication history:
  - Scheduler: auto retry.
  - Admin API: read-only + resend cho support, debug, compliance.
- Đảm bảo:
  - Reply trong email được route về HR (qua `reply_to_email`).
  - Gửi số lượng lớn thông qua `email_outbox` + worker, không block request.
  - Cơ chế retry khi lỗi + hiển thị trạng thái và cho phép HR resend.
  - Mỗi email liên quan ứng tuyển có thể kèm link xem trạng thái hồ sơ qua `applicationToken`.

---

## 7. Files / Attachments flow

- **Entity** `attachments`:
  - Link tới: `application`, `company`, optional `user`.
  - Trường:
    - `attachment_type`: `RESUME`, `COVER_LETTER`, `CERTIFICATE`, `PORTFOLIO`, `OTHER`.
    - `file_path` (Cloudinary URL), `file_size`, `file_type`, `description`, `is_public`.

- **Flows chính**:
  - CV khi apply:
    - Lưu trực tiếp trong `applications.resume_file_path` (không tạo `Attachment` riêng).
  - Tài liệu bổ sung:
    - Candidate upload qua `POST /public/applications/{applicationToken}/attachments` khi:
      - Status type ∈ {`SCREENING`, `INTERVIEW`} **và/hoặc** `allow_additional_uploads = true`.
    - HR upload thủ công qua UI nội bộ (endpoint file upload riêng, map sang `Attachment`).

---

## 8. Audit, soft delete & multi-tenant safety

- **Audit patterns**:
  - **Full audit** (`BaseFullAuditEntity`): `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`.
    - Áp dụng cho: `users`, `companies`, `jobs`, `skills`, `interviews`, `applications`, `comments`, `attachments`, `roles`, `permissions`, `application_statuses`, `email_templates`, `user_invitations`, `invalidated_token`.
  - **Partial audit** (`BasePartialAuditEntity`): `created_by`, `created_at`, `updated_at`, `is_deleted`.
    - Áp dụng cho junctions: `job_skills`, `role_permissions`, `interview_interviewers`.
  - **System tables** (`BaseSystemEntity` hoặc không base): chỉ `created_at`, `updated_at` (hoặc chỉ `created_at`).
    - `notifications`, `user_sessions`, `audit_logs`, `subscription_plans`, `company_subscriptions`, `payments`, `email_outbox`.

- **Soft delete chiến lược**:
  - Business entities & lookup quan trọng: dùng `deleted_at` (timestamp) để phục vụ audit, compliance.
  - Junction tables: dùng `is_deleted` (boolean) để tối ưu performance.
  - System tables: **không soft delete**, data được cleanup cứng theo job định kỳ.

- **Multi-tenant safety**:
  - Mọi service truy vấn đều:
    - Lấy `currentUser` qua `SecurityUtils`.
    - Filter theo `company_id` (ví dụ: `findByIdAndCompany_IdAndDeletedAtIsNull(...)`).
  - Status / notification / interview luôn kiểm tra entity thuộc cùng company, tránh cross-tenant data leak.

---

## 9. Tóm tắt nhanh theo đầu mục (cheat sheet)

- **Job**:
  - Tạo: `POST /jobs` → `DRAFT`.
  - Publish: `PATCH /jobs/{id}/status` → `PUBLISHED`.
  - Kết thúc: `job_status` → `PAUSED` / `CLOSED` / `FILLED`.

- **Application**:
  - Candidate apply: `POST /public/jobs/{jobId}/apply` → status default (`APPLIED`), tính `matchScore`, gửi email + notification.
  - HR tạo thủ công: `POST /applications` với `statusId`.
  - Đổi status: `PATCH /applications/{id}/status`:
    - Dựa trên `StatusType.canMoveTo`, không cho từ terminal, không đi ngược pipeline, luôn ghi `application_status_history`.
  - Attachments: upload thêm qua public API khi status phù hợp & `allow_additional_uploads`.

- **Interview**:
  - Tạo: `POST /applications/{applicationId}/interviews`:
    - `status = SCHEDULED`, validate trùng lịch cho tất cả interviewer.
  - Update: `PUT /interviews/{id}`:
    - `actualDate != null` → `COMPLETED`.
    - Thay đổi lịch/duration → `RESCHEDULED`.
  - Hủy: `POST /interviews/{id}/cancel` → `CANCELLED`.

- **Notifications / Emails**:
  - Các event (application created, status changed, interview scheduled, deadline gần, comment mới, assignment thay đổi) → tạo `notifications` + ghi `email_outbox` với template tương ứng.

Từ tài liệu này, có thể thiết kế UI/flow hoặc debug theo từng bước mà không cần dive sâu lại vào code & schema mỗi lần.

