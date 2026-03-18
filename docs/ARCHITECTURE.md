# JobTracker ATS Architecture Guide

## Tổng quan kiến trúc

JobTracker ATS (Applicant Tracking System) sử dụng kiến trúc **Monolithic Multi-Tenant** với thiết kế modular, đảm bảo tính đơn giản trong phát triển và triển khai ban đầu, đồng thời có thể dễ dàng tách thành microservices trong tương lai.

### Kiến trúc Multi-Tenant
- **Cô lập Tenant**: Mỗi company = 1 tenant, cô lập dữ liệu bằng `company_id`
- **Database dùng chung**: Single database với tách biệt dữ liệu multi-tenant
- **Bảo mật cấp hàng**: Tất cả truy vấn tự động lọc theo `company_id`
- **Khả năng mở rộng**: Dễ dàng mở rộng cho nhiều SME/Startup

## Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + JavaScript)            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Auth      │ │   Jobs      │ │ Applications│           │
│  │   Module    │ │   Module    │ │   Module    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Dashboard   │ │ Interviews  │ │ Comments   │           │
│  │   Module    │ │   Module    │ │   Module    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend (Spring Boot 3) - Multi-Tenant              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Security   │ │   Business  │ │   Data      │           │
│  │   Layer     │ │   Logic     │ │   Access    │           │
│  │(Multi-Tenant│ │   Layer     │ │   Layer     │           │
│  │  Filter)    │ │             │ │(Company_ID) │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ JPA/Hibernate
                              │ (Auto-filter by company_id)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Database (MySQL 8.0) - Multi-Tenant                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Companies   │ │   Jobs      │ │Applications │           │
│  │  (Tenants)  │ │ (Postings)  │ │  (CORE ATS) │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Users     │ │ Interviews  │ │  Comments  │           │
│  │(HR/Recruiter│ │             │ │             │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Công nghệ chi tiết

### Backend Stack

#### Core Framework
- **Spring Boot 3.2+**: Framework chính, hỗ trợ Java 21
- **Java 21**: LTS version với Virtual Threads, Pattern Matching
- **Spring Framework 6**: Dependency injection, AOP, MVC

#### Data Layer
- **Spring Data JPA**: Lớp trừu tượng ORM
- **Hibernate 6**: Triển khai JPA với cải thiện hiệu suất
- **MySQL 8.0**: Database chính với hỗ trợ JSON
- **HikariCP**: Pool kết nối (mặc định trong Spring Boot 3)

#### Security
- **Spring Security 6**: Xác thực và Phân quyền
- **JWT**: Token-based authentication (không dùng OAuth2 Resource Server)
- **BCrypt**: Băm mật khẩu
- **Email Verification**: Bắt buộc verify email trước khi login
- **Invite-based User Creation**: Admin tạo user → Gửi invite email → User set password
- **CORS**: Chia sẻ tài nguyên đa nguồn gốc
- **Bảo mật Multi-Tenant**: Cô lập dữ liệu theo công ty với `@Filter` và lọc `company_id`
- **RBAC**: Kiểm soát truy cập dựa trên vai trò (SYSTEM_ADMIN, ADMIN_COMPANY, RECRUITER) – Global RBAC

#### Validation & Processing
- **Jakarta Validation**: Xác thực Bean (JSR-380)
- **Hibernate Validator**: Triển khai xác thực
- **MapStruct**: Ánh xạ Entity ↔ DTO
- **Jackson**: Tuần tự hóa/Giải tuần tự hóa JSON

#### Communication
- **Spring Web**: REST API (`/api/v1`)
- **Brevo API**: Gửi email transactional qua `EmailOutboxService` + `EmailScheduler` (queue)
- **Email templates**: Lưu trong DB (`email_templates`), render qua `TemplateRenderer` với variable resolvers

#### External Integrations
- **Cloudinary API**: Lưu trữ file (CV, attachments) — upload trực tiếp từ backend
- **Brevo API**: Gửi email transactional (invite, verification, notifications)
- **VNPay**: Thanh toán subscription (Payment flow)
- **Redis**: Refresh token storage, permission cache (`PermissionCacheService`)

#### Scheduling
- **Spring @Scheduled**: `@EnableScheduling` trong main application
- **EmailScheduler**: `fixedDelay = 5000` — xử lý email queue (`email_outbox`), gửi qua Brevo API
- **PlanLimitScheduler**: `cron` (mặc định mỗi giờ) — chuyển subscription `ACTIVE` có `end_date < NOW()` sang `EXPIRED`

#### Documentation & Monitoring
- **SpringDoc OpenAPI 3**: Tài liệu API
- **Spring Boot Actuator**: Kiểm tra sức khỏe, số liệu
- **SLF4J + Logback**: Framework ghi log
- **Micrometer**: Số liệu ứng dụng

### Database Design

#### Primary Database: MySQL 8.0
- **ACID Compliance**: Tính toàn vẹn giao dịch
- **JSON Support**: Lưu trữ dữ liệu linh hoạt
- **Full-text Search**: Khả năng tìm kiếm nâng cao
- **Indexing**: Tối ưu hiệu suất (đặc biệt composite indexes multi-tenant)
- **Replication**: Tính khả dụng cao
- **Kiến trúc Multi-Tenant**: Cô lập dữ liệu bằng `company_id` trong tất cả bảng nghiệp vụ
- **UUID Primary Keys**: VARCHAR(36) cho tất cả primary keys (bảo mật & hệ thống phân tán)

#### Connection Management
- **HikariCP**: Pool kết nối hiệu suất cao
- **Kích thước Pool**: 10-20 kết nối
- **Cấu hình Timeout**: Timeout kết nối 30s
- **Health Checks**: Xác thực kết nối

### External Services

#### File Storage: Cloudinary
- **REST API**: Tải lên/Tải xuống file và hình ảnh
- **Image Transformation**: Tự động resize, crop, optimize hình ảnh
- **Video Support**: Quản lý video files
- **CDN Delivery**: Phân phối nội dung qua CDN
- **API Key Authentication**: Xác thực bằng API key và secret
- **Public/Private URLs**: Hỗ trợ cả public và private file access

#### Email Service: Brevo (formerly Sendinblue)
- **Brevo API**: REST API để gửi transactional emails
- **Template Management**: Quản lý email templates trên Brevo dashboard
- **Email Tracking**: Theo dõi email delivery, opens, clicks
- **Async Processing**: Gửi email không chặn
- **Retry Logic**: Xử lý email thất bại với retry mechanism
- **SMTP Alternative**: Có thể dùng SMTP relay nếu cần

#### Authentication: Email + Password (B2B SaaS)
- **Email + Password**: Core authentication method
- **Email Verification**: Bắt buộc verify email trước khi login
- **Invite-based Onboarding**: Admin tạo user → Gửi invite email → User set password
- **JWT Token Management**: Access/refresh tokens
- **Không có Google OAuth**: Chỉ dùng cho enterprise SSO (story khác)

## Kiến trúc Backend (Monolithic)

### Package Structure
```
com.jobtracker.jobtracker_app
├── configurations/        # Configuration
│   ├── SecurityConfig.java
│   ├── RedisConfig.java
│   ├── CloudinaryConfig.java
│   ├── VnPayConfig.java
│   ├── CustomJwtDecoder.java
│   ├── JwtAuthenticationEntryPoint.java
│   ├── AuditorAwareImpl.java
│   └── DataInitializer.java
├── controllers/           # REST Controllers
│   ├── AuthController.java
│   ├── JobController.java
│   ├── ApplicationController.java    # CORE ATS + public apply
│   ├── ApplicationStatusController.java
│   ├── CommentController.java
│   ├── InterviewController.java
│   ├── AttachmentController.java
│   ├── AdminUserController.java      # User management (invite, add employee)
│   ├── UserProfileController.java
│   ├── UserSessionController.java
│   ├── CompanyController.java
│   ├── CompanySubscriptionController.java
│   ├── SubscriptionPlanController.java
│   ├── PaymentController.java
│   ├── NotificationController.java
│   ├── SkillController.java
│   ├── RoleController.java
│   ├── PermissionController.java
│   ├── EmailTemplateController.java
│   ├── EmailHistoryController.java
│   └── AuditLogController.java
├── dto/                   # Request/Response DTOs
├── entities/              # JPA Entities
│   ├── User.java, Company.java, Job.java, Application.java
│   ├── ApplicationStatus.java, ApplicationStatusHistory.java
│   ├── Comment.java, Interview.java, Attachment.java
│   ├── Skill.java, JobSkill.java, Role.java, Permission.java, RolePermission.java
│   ├── SubscriptionPlan.java, CompanySubscription.java, Payment.java
│   ├── Notification.java, EmailTemplate.java, EmailOutbox.java
│   ├── UserInvitation.java, EmailVerificationToken.java, PasswordResetToken.java
│   ├── InvalidatedToken.java, UserSession.java, AuditLog.java
│   └── InterviewInterviewer.java
├── repositories/          # Spring Data JPA
│   ├── UserRepository, CompanyRepository, JobRepository, ApplicationRepository
│   ├── ApplicationStatusRepository, ApplicationStatusHistoryRepository
│   ├── CommentRepository, InterviewRepository, AttachmentRepository
│   ├── JobSkillRepository, SkillRepository, RoleRepository, PermissionRepository
│   ├── CompanySubscriptionRepository, SubscriptionPlanRepository, PaymentRepository
│   ├── NotificationRepository, EmailTemplateRepository, EmailOutboxRepository
│   ├── UserInvitationRepository, EmailVerificationTokenRepository, PasswordResetTokenRepository
│   ├── InvalidatedRepository, UserSessionRepository, AuditLogRepository
│   └── InterviewInterviewerRepository
├── services/              # Business Logic
│   ├── AuthService, UserService, AdminUserService
│   ├── CompanyService, JobService, ApplicationService
│   ├── ApplicationStatusService, CommentService, InterviewService
│   ├── AttachmentService, SkillService, NotificationService
│   ├── EmailService, EmailOutboxService, EmailTemplateService
│   ├── CompanySubscriptionService, SubscriptionPlanService, PaymentService
│   ├── PlanLimitService           # Enforce maxJobs, maxUsers, maxApplications
│   ├── CVScoringService           # CV match score (0-100)
│   ├── PdfExtractionService       # PDF text extraction
│   ├── RoleService, PermissionService, AuditLogService, UserSessionService
│   └── TemplateRenderer
├── services/impl/         # Service implementations
├── services/email/        # Email resolvers (variable resolution)
├── scheduler/             # @Scheduled jobs
│   ├── EmailScheduler.java       # Process email outbox queue
│   └── PlanLimitScheduler.java   # Expire subscriptions (end_date < now)
├── mappers/               # MapStruct Entity ↔ DTO
├── exceptions/           # GlobalExceptionHandler, AppException, ErrorCode
├── validator/             # File validators (PdfFileValidator, ImageFileValidator)
├── utils/                 # SecurityUtils, LocalizationUtils, MessageKeys
└── JobtrackerAppApplication.java
```

### Layer Responsibilities

#### 1. Controller Layer
- **Điểm cuối REST API**
- **Ánh xạ Request/Response**
- **Xác thực đầu vào**
- **Xử lý lỗi**
- **Kiểm tra xác thực**

#### 2. Service Layer
- **Triển khai logic nghiệp vụ**
- **Quản lý giao dịch**
- **Tích hợp dịch vụ bên ngoài**
- **Xuất bản sự kiện**
- **Chuyển đổi dữ liệu**

#### 3. Repository Layer
- **Trừu tượng truy cập dữ liệu**
- **Truy vấn tùy chỉnh**
- **Hỗ trợ phân trang**
- **Specification pattern**

#### 4. Entity Layer
- **Ánh xạ database**
- **Định nghĩa quan hệ**
- **Ràng buộc xác thực**
- **Trường audit**
- **Trường multi-tenant**: `company_id` trong tất cả business entities
- **Hibernate Filters**: Tự động lọc theo `company_id`

## ATS Workflow Architecture

### Modern ATS = Candidate Self-Service Portal

**Core Principle**: Modern ATS là **Candidate Self-Service Portal**, không phải Document Management System.

- **Primary Workflow**: Candidates tự apply online qua trang công ty mà **không cần login**
- **Secondary Workflow**: HR có thể manually upload CVs từ email (backup workflow)
- **Automated Workflow**: Sau khi application được tạo, workflow tự động (status updates, notifications, interviews)

### Application Lifecycle (CORE ATS)
```
1. Job Posting Created (DRAFT)
   ↓
2. Job Published (PUBLISHED) → Candidates can apply
   ↓
3. Application Received (NEW)
   ↓
4. Screening Phase (SCREENING) → HR reviews CV
   ↓
5. Interview Phase (INTERVIEWING) → Multiple interview rounds
   ↓
6. Offer Phase (OFFERED) → Job offer extended
   ↓
7. Final Status (HIRED or REJECTED)
```

### Các thành phần ATS chính
- **Applications**: Entity cốt lõi - ứng viên ứng tuyển vào job postings
  - **Primary Workflow**: Candidate Self-Service Portal (public API, không cần login)
  - **Secondary Workflow**: HR Manual Upload (protected API, khi nhận CV qua email)
- **Application Status History**: Dấu vết audit cho thay đổi trạng thái
- **Comments**: Cộng tác nhóm về ứng viên (HR/Recruiter only)
- **Interviews**: Nhiều vòng phỏng vấn cho mỗi application
- **Attachments**: CV, chứng chỉ, portfolio
  - **Public Upload**: Candidates tự upload qua public API (user_id = NULL)
  - **HR Upload**: HR upload thủ công khi nhận CV qua email (user_id = HR user_id)
- **Notifications**: Cập nhật thời gian thực về trạng thái application

### Luồng dữ liệu Multi-Tenant
```
User Login → Trích xuất company_id từ JWT → Đặt Tenant Context
                ↓
API Request → Tenant Filter → Tự động lọc theo company_id
                ↓
Database Query → WHERE company_id = :tenantId → Trả về dữ liệu cô lập
```

## Data Flow

### 1. Authentication Flow (B2B SaaS Multi-Tenant)
```
User Login (Email + Password) → JWT Token Generation (with company_id, role, permissions)
                ↓
Extract company_id from JWT → Set Tenant Context → User Info
                ↓
JWT Validation → UserService ← Token Claims (company_id, role, permissions)
```

#### Company Creation Flow (Model 1 - Self Signup)
```
Company Admin Self-Signup → POST /auth/register
                ↓
System tạo Company + Admin user (email_verified = false)
                ↓
System gửi email verification token
                ↓
Admin click link → Verify email → email_verified = true
                ↓
Admin login → JWT Token → Access system
```

#### User Creation Flow (Invite-based)
```
Admin tạo user → POST /admin/users/invite
                ↓
System tạo user (email_verified = false, password = NULL, is_active = false)
                ↓
System gửi invite email với token
                ↓
User click link → POST /auth/accept-invite (set password)
                ↓
email_verified = true, is_active = true
                ↓
User login → JWT Token → Access system
```

### 2. Job Posting Flow (ATS)
```
Create Job Posting → JobController → JobService → JobRepository → Database
                ↓
Publish Job → Event Publishing → NotificationService → Email/WebSocket
```

### 3. Application Workflow (CORE ATS) ➕

#### Primary Workflow: Candidate Self-Service Portal (Public API)
```
Candidate Applies Online (Public API - No Auth)
    ↓
POST /public/jobs/{jobId}/apply
    ↓
Upload CV + Attachments (Public API)
    ↓
Application Created (status = NEW, created_by = NULL)
    ↓
Email Confirmation → Candidate receives application_token
    ↓
Candidate Tracks Status (Public API with token)
    ↓
HR Reviews → Status Updates → Automated Workflow
```

#### Secondary Workflow: HR Manual Upload (Protected API)
```
HR Receives CV via Email
    ↓
POST /applications (Protected - HR Auth Required)
    ↓
Upload Attachments (Protected - HR Auth Required)
    ↓
Application Created (status = NEW, created_by = HR user_id)
    ↓
HR Manages → Status Updates → Automated Workflow
```

#### Common Workflow (After Application Created)
```
Status Update (NEW → SCREENING → INTERVIEWING → OFFERED → HIRED/REJECTED)
                ↓
ApplicationStatusHistory → Comments → Interviews → Attachments
                ↓
Event Publishing → NotificationService → Email/WebSocket
```

### 4. CV Scoring & Matching Flow (Automatic Skill Matching) ➕

> **CORE FEATURE**: Tự động tính điểm khớp giữa CV và Job Description dựa trên skills matching.

#### Overview
Khi candidate upload CV (PDF), system tự động:
1. Extract text từ PDF
2. Load job skills từ database
3. Match skills trong CV với job requirements
4. Tính match score (0-100)
5. Lưu kết quả vào `applications` table

---

## Upload Application Flow

### Step 1 – HR nhập application thủ công hoặc candidate tự ứng tuyển qua trang công ty

**Workflow 1: Candidate Self-Service (Public API)**
```
POST /public/jobs/{jobId}/apply
    ↓
Candidate upload CV (PDF) + thông tin cá nhân
    ↓
Application created (status = NEW, created_by = NULL)
    ↓
resume_file_path saved → Trigger CV Scoring (Async)
```

**Workflow 2: HR Manual Upload (Protected API)**
```
POST /applications
    ↓
HR upload CV (PDF) + nhập thông tin candidate
    ↓
Application created (status = NEW, created_by = HR user_id)
    ↓
resume_file_path saved → Trigger CV Scoring (Async)
```

### Step 2 – File Storage

```
CV File (PDF) → CloudinaryService
    ↓
Upload to Cloudinary → Get public URL
    ↓
Save resume_file_path to applications table
    ↓
File stored in Cloudinary CDN
```

### Step 3 – PDF Parsing

**Using Apache PDFBox:**
- Extract raw text from PDF
- No formatting retained
- No layout analysis
- Pure text extraction only

**Output:**
- `String cvText` (raw text từ PDF)

**Save to:**
- `applications.extracted_text` (TEXT column)

### Step 4 – Load Job Skills

**Query database:**
```sql
SELECT 
    js.id,
    js.job_id,
    js.skill_id,
    js.is_required,
    js.proficiency_level,
    s.name as skill_name
FROM job_skills js
INNER JOIN skills s ON js.skill_id = s.id
WHERE js.job_id = ?
  AND js.is_deleted = false
ORDER BY js.is_required DESC, s.name ASC
```

**Each job skill contains:**
- `skillName` (from `skills.name`)
- `isRequired` (boolean from `job_skills.is_required`)
- `proficiencyLevel` (optional, from `job_skills.proficiency_level`)

**Group by:**
- **Required skills**: `isRequired = true`
- **Optional skills**: `isRequired = false`

### Step 5 – CV Scoring Process

#### 5.1 Normalize Text

**Purpose:**
- Handle CV viết tiếng Việt có dấu
- Tránh mismatch do casing

**Process:**
1. Convert to lowercase
   ```
   cvText = cvText.toLowerCase()
   ```

2. Remove Vietnamese diacritics
   ```
   á → a
   ệ → e
   ư → u
   đ → d
   ```
   (Sử dụng library như `java.text.Normalizer` hoặc custom function)

3. Keep raw word boundaries
   - Không thay đổi cấu trúc từ
   - Chỉ normalize để matching dễ hơn

**Output:** Normalized `cvText` string

#### 5.2 Tokenization

**Process:**
1. Split text using non-word regex: `\W+`
   ```
   tokens = cvText.split("\\W+")
   ```

2. Store into `Set<String> tokens`
   ```
   Set<String> tokens = new HashSet<>(Arrays.asList(words))
   ```

**Purpose:**
- Used for fast single-word matching (O(1) lookup)
- Efficient for checking if skill name exists in CV

#### 5.3 Skill Matching Logic

**For each skill:**

1. **Normalize skill name**
   - Convert to lowercase
   - Remove Vietnamese diacritics
   - Example: "Spring Boot" → "spring boot", "Java" → "java"

2. **Check match:**
   
   **Case A: Single word skill** (e.g., "Java", "Docker")
   ```
   if (tokens.contains(normalizedSkillName)) {
       matched = true
   }
   ```
   - O(1) lookup trong token set
   
   **Case B: Multi-word skill** (e.g., "Spring Boot", "React Native")
   ```
   Pattern pattern = Pattern.compile("\\b" + normalizedSkillName + "\\b", Pattern.CASE_INSENSITIVE)
   if (pattern.matcher(cvText).find()) {
       matched = true
   }
   ```
   - Use word-boundary regex (`\b`) để match exact phrase
   - Case-insensitive matching
   
   **Case C: Not matched → Check aliases** (optional, future enhancement)
   - Có thể thêm bảng `skill_aliases` để map "JS" → "JavaScript"
   - Hiện tại chưa implement

3. **Rules:**
   - Each skill only counted once (first match wins)
   - No keyword frequency boosting (không tính số lần xuất hiện)
   - Case-insensitive matching

**Output:**
- `List<String> matchedRequiredSkills`
- `List<String> matchedOptionalSkills`
- `List<String> missingRequiredSkills`
- `List<String> missingOptionalSkills`

#### 5.4 Required vs Optional

**Skills are divided into:**
- **Required skills** (`isRequired = true`)
- **Optional skills** (`isRequired = false`)

**Matching done separately for both groups:**
```
matchedRequiredCount = matchedRequiredSkills.size()
totalRequiredCount = requiredSkills.size()

matchedOptionalCount = matchedOptionalSkills.size()
totalOptionalCount = optionalSkills.size()
```

#### 5.5 Score Calculation Rules

**Case 1 – Only Required Skills Exist**
```
if (totalOptionalCount == 0) {
    score = (matchedRequiredCount / totalRequiredCount) * 100
}
```
- Chỉ tính dựa trên required skills
- 100% weight cho required

**Case 2 – Only Optional Skills Exist**
```
else if (totalRequiredCount == 0) {
    score = (matchedOptionalCount / totalOptionalCount) * 100
}
```
- Chỉ tính dựa trên optional skills
- 100% weight cho optional

**Case 3 – Both Exist**
```
else {
    requiredScore = (matchedRequiredCount / totalRequiredCount) * 100
    optionalScore = (matchedOptionalCount / totalOptionalCount) * 100
    score = (requiredScore × 0.7) + (optionalScore × 0.3)
}
```
- Required skills: 70% weight
- Optional skills: 30% weight
- Weighted average

**Final score:**
```
matchScore = Math.round(score)  // Integer 0-100
```

---

## Output Structure

**Each application returns:**

```json
{
  "matchScore": 82,
  "matchedRequiredCount": 3,
  "totalRequiredCount": 4,
  "matchedOptionalCount": 2,
  "totalOptionalCount": 5,
  "matchedRequiredSkills": ["Java", "Spring Boot", "MySQL"],
  "missingRequiredSkills": ["Docker"],
  "matchedOptionalSkills": ["Git", "JUnit"],
  "missingOptionalSkills": ["AWS", "Redis", "Kubernetes"]
}
```

**Purpose:**
- **Explainable scoring**: HR biết thiếu skill gì
- **Không black box**: Transparent scoring logic
- **Actionable**: HR có thể filter/sort applications theo match score

---

## API Integration Points

### APIs that Trigger CV Scoring

**1. POST `/public/jobs/{jobId}/apply`** (Public - Candidate Self-Service)
- **When**: Sau khi candidate upload CV và application được tạo thành công
- **Process**: Background processing (2-3 giây, không block response)
- **Response**: Simple success message (không expose match score cho candidate)

**2. POST `/applications`** (Protected - HR Manual Upload)
- **When**: Sau khi HR upload CV và application được tạo thành công
- **Process**: Background processing (2-3 giây)
- **Response**: Application created (match score được tính trong background)

**3. PUT `/applications/{id}/resume`** (Protected - HR Update CV)
- **When**: HR upload CV mới cho application đã tồn tại
- **Process**: Re-trigger CV scoring với CV mới (background)
- **Response**: Application updated (match score được update trong background)

### APIs that Return Match Score

**1. GET `/applications/{id}`**
- **Response includes**: Full match score breakdown
- **Fields**: `matchScore`, `matchedRequiredSkills`, `missingRequiredSkills`, etc.

**2. GET `/applications`** (List Applications)
- **Query params**: 
  - `sortBy=matchScore` (sort by match score)
  - `minMatchScore=50` (filter by minimum score)
- **Response**: List applications với match score

**3. GET `/jobs/{jobId}/applications`**
- **Response**: Applications cho job với match scores
- **Default sort**: `matchScore DESC` (highest first)

---

## Database Schema

**Fields in `applications` table:**

```sql
-- CV Scoring & Matching
match_score INT COMMENT 'Điểm khớp giữa CV và JD (0-100), tính tự động khi upload CV (background processing, 2-3 giây). NULL nếu parsing failed hoặc chưa có CV',
extracted_text TEXT COMMENT 'Text đã extract từ CV (PDF parsing)',
matched_skills JSON COMMENT 'Breakdown skills matched: {
  matchedRequired: ["Java", "Spring Boot"],
  missingRequired: ["Docker"],
  matchedOptional: ["MySQL"],
  missingOptional: ["AWS", "Redis"]
}',
```

**Indexes:**
```sql
INDEX idx_applications_match_score (match_score) COMMENT 'Index cho filter/sort by match score',
INDEX idx_applications_job_match_score (job_id, match_score) COMMENT 'Index cho query applications by job với sort by match score',
```

---

## Background Processing

**Implementation:**
- CV scoring chạy trong **background** (không block API response)
- Processing time: 2-3 giây (PDF parsing: 1-2s, skill matching: 500ms)
- Sử dụng Spring `@Async` hoặc background thread
- Không cần status field vì `matchScore = null` đã đủ rõ (failed hoặc chưa có)

**Flow:**
```
API Response (201 Created) → Simple success message
    ↓
Background Job Triggered (non-blocking)
    ↓
PDF Parsing → Text Extraction (~1-2 giây)
    ↓
Load Job Skills → Skill Matching (~500ms)
    ↓
Calculate Score → Save Results (~100ms)
    ↓
Update Application: matchScore = 82 (hoặc null nếu failed)
```

**Error Handling:**
- Nếu PDF parsing fails → `matchScore = NULL` (đủ rõ, không cần status)
- Nếu không có job skills → `matchScore = NULL`
- Retry mechanism (optional): Retry 3 times với exponential backoff

### 5. File Upload Flow (Attachments to Applications)

#### Public Upload Flow (Candidate Self-Service)
```
Candidate Uploads CV/Attachments (Public API - No Auth)
    ↓
POST /public/jobs/{jobId}/apply (multipart/form-data)
    ↓
AttachmentController (Public) → AttachmentService → CloudinaryService → Cloudinary API
                ↓
File Validation (size, type, virus scan) → Upload to Cloudinary
    ↓
CDN URL Generation → Link to Application (user_id = NULL)
    ↓
Database Update → File Metadata (public_id, format, size, user_id = NULL)
```

#### Protected Upload Flow (HR Manual Upload)
```
HR Uploads CV/Attachments (Protected API - Auth Required)
    ↓
POST /applications/{applicationId}/attachments (multipart/form-data)
    ↓
AttachmentController (Protected) → AttachmentService → CloudinaryService → Cloudinary API
                ↓
File Validation → Upload to Cloudinary
    ↓
CDN URL Generation → Link to Application (user_id = HR user_id)
    ↓
Database Update → File Metadata (public_id, format, size, user_id = HR user_id)
```

## Performance Considerations

### Tối ưu Database
- **Chiến lược Indexing**: Primary keys, foreign keys, các trường tìm kiếm
- **Indexes Multi-Tenant**: Composite indexes trên `(company_id, ...)` cho tất cả truy vấn
- **Tối ưu truy vấn**: Ngăn chặn vấn đề N+1, tự động lọc `company_id`
- **Connection Pooling**: Cấu hình HikariCP
- **Caching**: Spring Cache với Redis (tương lai) - caching theo tenant

### Hiệu suất ứng dụng
- **Lazy Loading**: Quan hệ JPA
- **Pagination**: Xử lý dataset lớn
- **Xử lý bất đồng bộ**: Email, tải file lên
- **Connection Pooling**: Kết nối database

### Hiệu suất Frontend
- **Code Splitting**: Tách dựa trên route
- **Lazy Loading**: Tải component lười
- **Memoization**: React.memo, useMemo
- **Tối ưu Bundle**: Tối ưu build CRA

## Multi-Tenant Architecture

### Mô hình Tenant
- **Company là Tenant**: Mỗi company = 1 tenant trong hệ thống
- **Cô lập dữ liệu**: Tất cả dữ liệu nghiệp vụ được cô lập bằng `company_id`
- **Database dùng chung**: Single database với bảo mật cấp hàng
- **Tenant Context**: JWT token chứa `company_id`, tự động inject vào mọi request

### Chiến lược cô lập dữ liệu
- **Hibernate Filter**: `@FilterDef` và `@Filter` để tự động lọc theo `company_id`
- **Repository Level**: Tất cả truy vấn tự động thêm `WHERE company_id = :tenantId`
- **Service Level**: Xác thực user thuộc company trước khi truy cập dữ liệu
- **Controller Level**: Trích xuất `company_id` từ JWT token hoặc user context

### Multi-Tenant Implementation
```java
// Entity level - Auto filter
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = "string"))
@Filter(name = "tenantFilter", condition = "company_id = :tenantId")
@Entity
public class Application {
    @Column(name = "company_id", nullable = false)
    private String companyId;
}

// Service level - Set tenant context
@Service
public class ApplicationService {
    @Autowired
    private TenantContext tenantContext;
    
    public List<Application> getAllApplications() {
        String companyId = tenantContext.getCurrentCompanyId();
        return applicationRepository.findByCompanyId(companyId);
    }
}
```

### Bảo mật Tenant
- **JWT Claims**: `company_id` trong JWT token
- **Xác thực Context**: Xác minh `company_id` của user khớp với request context
- **Ngăn chặn Cross-Tenant**: Không cho phép truy cập dữ liệu của tenant khác
- **Audit Trail**: Ghi log tất cả các nỗ lực truy cập cross-tenant

## Security Architecture

### Xác thực
- **JWT Tokens**: Xác thực không trạng thái
- **Refresh Tokens**: Gia hạn token
- **OAuth2**: Tích hợp đăng nhập xã hội
- **Password Hashing**: BCrypt

### Phân quyền
- **Truy cập dựa trên vai trò**: Các vai trò SYSTEM_ADMIN, ADMIN_COMPANY, RECRUITER (Global RBAC)
- **Truy cập dựa trên quyền**: Quyền chi tiết (JOB_CREATE, APPLICATION_VIEW, etc.)
- **Bảo mật cấp phương thức**: @PreAuthorize với company context
- **Bảo mật cấp tài nguyên**: Cô lập dữ liệu multi-tenant (tự động lọc `company_id`)
- **Cô lập Tenant**: Hibernate Filter để tự động lọc theo `company_id`

### Bảo vệ dữ liệu
- **Xác thực đầu vào**: Jakarta Validation
- **Ngăn chặn SQL Injection**: JPA/Hibernate
- **Bảo vệ XSS**: Làm sạch đầu vào
- **Cấu hình CORS**: Bảo mật đa nguồn gốc
- **Cô lập dữ liệu Multi-Tenant**: Tự động lọc `company_id` ở tất cả truy vấn
- **Xác thực Tenant Context**: Xác minh user thuộc company trước khi truy cập dữ liệu

## Monitoring & Observability

### Số liệu ứng dụng
- **Spring Boot Actuator**: Health checks, số liệu
- **Micrometer**: Số liệu ứng dụng
- **Custom Metrics**: Số liệu nghiệp vụ

### Chiến lược ghi log
- **Structured Logging**: Định dạng JSON
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation IDs**: Theo dõi request
- **Audit Logging**: Hành động của user

### Xử lý lỗi
- **Global Exception Handler**: Xử lý lỗi tập trung
- **Custom Exceptions**: Lỗi cụ thể nghiệp vụ
- **Error Response Format**: Định dạng lỗi nhất quán
- **Error Monitoring**: Theo dõi exception

## Scalability Considerations

### Mở rộng ngang
- **Thiết kế không trạng thái**: Xác thực dựa trên JWT
- **Sẵn sàng Multi-Tenant**: Không trạng thái với company context trong JWT
- **Pool kết nối Database**: HikariCP
- **Sẵn sàng Load Balancer**: Nhiều instance ứng dụng (shared database)
- **Cô lập Tenant**: Mỗi request tự động lọc theo `company_id`

### Mở rộng dọc
- **Tối ưu bộ nhớ**: Điều chỉnh JVM
- **Tối ưu Database**: Tối ưu truy vấn
- **Chiến lược Caching**: Caching cấp ứng dụng

### Di chuyển Microservices trong tương lai
- **Thiết kế Modular**: Ranh giới service rõ ràng (Jobs, Applications, Interviews, etc.)
- **Kiến trúc hướng sự kiện**: Ghép nối lỏng với ApplicationEvents
- **Sẵn sàng API Gateway**: RESTful APIs với hỗ trợ multi-tenant
- **Database Per Service**: Cô lập service (có thể tách Applications service riêng)
- **Chiến lược Multi-Tenant**: Shared database → Database per tenant (mở rộng tương lai)

## Monitoring & Alerting

### Sức khỏe ứng dụng
- **Health Endpoints**: /actuator/health
- **Metrics Endpoints**: /actuator/metrics
- **Custom Health Checks**: Database, dịch vụ bên ngoài

### Số liệu nghiệp vụ
- **Tỷ lệ đăng ký User**: Số user hoạt động hàng ngày mỗi company
- **Tỷ lệ tạo Job Posting**: Số job postings mỗi ngày mỗi company
- **Tỷ lệ Application**: Số applications nhận được mỗi job posting
- **Số liệu Hiring Funnel**: Tỷ lệ chuyển đổi NEW → SCREENING → INTERVIEWING → OFFERED → HIRED
- **Time-to-Hire**: Thời gian trung bình từ application đến hire
- **Tỷ lệ gửi Email**: Thành công thông báo
- **Thời gian phản hồi API**: Số liệu hiệu suất mỗi tenant

### Theo dõi lỗi
- **Giám sát Exception**: Tỷ lệ lỗi
- **Xác thực thất bại**: Giám sát bảo mật
- **Lỗi Database**: Tính toàn vẹn dữ liệu
- **Lỗi dịch vụ bên ngoài**: Giám sát tích hợp
