# JobTracker ATS Technical Specifications

## Tổng quan kỹ thuật

JobTracker ATS (Applicant Tracking System) được thiết kế với kiến trúc **monolith multi-tenant** hiện đại, sử dụng các công nghệ tiên tiến để đảm bảo hiệu suất, bảo mật và khả năng mở rộng cho nhiều SME/Startup.

## Kiến trúc hệ thống chi tiết

### 1. Backend Architecture (Spring Boot 3)

#### Core Dependencies
```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-client</artifactId>
    </dependency>
    <!-- Brevo Email API (thay thế Spring Mail) -->
    <dependency>
        <groupId>com.brevo</groupId>
        <artifactId>sib-api-v3-sdk</artifactId>
        <version>5.0.0</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    
    <!-- Database -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
    </dependency>
    <dependency>
        <groupId>org.liquibase</groupId>
        <artifactId>liquibase-core</artifactId>
    </dependency>
    
    <!-- OAuth2 Resource Server -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-oauth2-jose</artifactId>
    </dependency>
    
    <!-- Mapping -->
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>1.5.5.Final</version>
    </dependency>
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct-processor</artifactId>
        <version>1.5.5.Final</version>
    </dependency>
    
    <!-- External APIs -->
    <!-- Cloudinary SDK cho file storage -->
    <dependency>
        <groupId>com.cloudinary</groupId>
        <artifactId>cloudinary-http44</artifactId>
        <version>1.38.0</version>
    </dependency>
    <dependency>
        <groupId>com.cloudinary</groupId>
        <artifactId>cloudinary-taglib</artifactId>
        <version>1.38.0</version>
    </dependency>
    
    <!-- Documentation -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.2.0</version>
    </dependency>
    
    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

#### Package Structure
```
com.jobtracker
├── config/                     # Configuration classes
│   ├── SecurityConfig.java     # Spring Security configuration (multi-tenant)
│   ├── WebConfig.java          # Web MVC configuration
│   ├── DatabaseConfig.java     # Database configuration (multi-tenant filters)
│   ├── WebSocketConfig.java    # WebSocket configuration
│   ├── BrevoConfig.java        # Brevo email configuration
│   ├── CloudinaryConfig.java   # Cloudinary file storage configuration
│   └── SwaggerConfig.java      # OpenAPI configuration
├── controller/                 # REST Controllers
│   ├── AuthController.java     # Authentication endpoints
│   ├── UserController.java     # User management (HR/Recruiter)
│   ├── CompanyController.java  # Company management (Multi-tenant)
│   ├── JobController.java      # Job Postings management (ATS)
│   ├── ApplicationController.java # Applications management (CORE ATS)
│   ├── CommentController.java # Comments management
│   ├── InterviewController.java # Interview management
│   ├── SkillController.java    # Skills management
│   ├── NotificationController.java # Notifications
│   ├── DashboardController.java # Dashboard analytics
│   └── FileController.java     # File operations (Attachments)
├── dto/                        # Data Transfer Objects
│   ├── request/               # Request DTOs
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   ├── JobCreateRequest.java
│   │   ├── JobUpdateRequest.java
│   │   └── InterviewRequest.java
│   └── response/              # Response DTOs
│       ├── AuthResponse.java
│       ├── UserResponse.java
│       ├── JobResponse.java
│       ├── DashboardResponse.java
│       └── ApiResponse.java
├── entity/                     # JPA Entities
│   ├── User.java              # User entity (HR/Recruiter, multi-tenant)
│   ├── Company.java           # Company entity (Tenant)
│   ├── Job.java               # Job entity (Job Postings - ATS)
│   ├── Application.java     # Application entity (CORE ATS)
│   ├── ApplicationStatus.java # Application status lookup table entity
│   ├── ApplicationStatusHistory.java # Application status history
│   ├── Comment.java         # Comment entity
│   ├── Interview.java         # Interview entity (link to applications)
│   ├── Skill.java             # Skill entity
│   ├── JobSkill.java          # Job-Skill relationship
│   ├── Attachment.java        # File attachment entity (link to applications)
│   ├── Notification.java      # Notification entity (multi-tenant)
│   ├── UserSession.java       # User session entity
│   ├── UserInvitation.java    # Invite token entity
│   ├── EmailVerificationToken.java # Email verification token
│   ├── PasswordResetToken.java # Password reset token
│   ├── InvalidatedToken.java  # JWT invalidation entity
│   ├── AuditLog.java          # Audit log entity (multi-tenant)
│   ├── Role.java              # RBAC Role entity
│   └── Permission.java        # RBAC Permission entity
├── repository/                 # Data Access Layer
│   ├── UserRepository.java    # User data access (multi-tenant)
│   ├── EmailVerificationTokenRepository.java # Email verification token
│   ├── PasswordResetTokenRepository.java # Password reset token
│   ├── CompanyRepository.java # Company data access
│   ├── JobRepository.java     # Job data access (multi-tenant)
│   ├── ApplicationRepository.java # Application data access (multi-tenant)
│   ├── ApplicationStatusRepository.java # Application status data access
│   ├── ApplicationStatusHistoryRepository.java
│   ├── CommentRepository.java
│   ├── InterviewRepository.java # Interview data access (multi-tenant)
│   ├── SkillRepository.java   # Skill data access
│   ├── AttachmentRepository.java # Attachment data access
│   └── NotificationRepository.java # Notification data access (multi-tenant)
├── service/                    # Business Logic Layer
│   ├── AuthService.java       # Authentication logic
│   ├── UserService.java       # User management logic (HR/Recruiter)
│   ├── CompanyService.java    # Company management logic (Multi-tenant)
│   ├── JobService.java        # Job Postings management logic (ATS)
│   ├── ApplicationService.java # Application management logic (CORE ATS)
│   ├── CommentService.java  # Comment management logic
│   ├── InterviewService.java  # Interview management logic
│   ├── SkillService.java      # Skill management logic
│   ├── AttachmentService.java # Attachment management logic
│   ├── NotificationService.java # Notification logic
│   ├── BrevoService.java    # Brevo email sending logic
│   ├── CloudinaryService.java # Cloudinary file operations logic
│   ├── DashboardService.java  # Analytics logic
│   └── TenantService.java   # Multi-tenant context management
├── security/                   # Security Components
│   ├── JwtTokenProvider.java  # JWT token handling (với company_id)
│   ├── JwtAuthenticationFilter.java # JWT filter
│   ├── CustomUserDetailsService.java # User details service
│   ├── PasswordEncoderConfig.java # Password encoding
│   ├── OAuth2UserService.java # OAuth2 user service
│   ├── TenantFilter.java   # Multi-tenant data filtering
│   └── CompanySecurityContext.java # Company context holder
├── event/                      # Event Handling
│   ├── ApplicationReceivedEvent.java # Application received event
│   ├── ApplicationStatusChangedEvent.java # Application status change event
│   ├── InterviewScheduledEvent.java # Interview scheduled event
│   ├── JobDeadlineEvent.java  # Job deadline event
│   └── EventListener.java     # Event listeners
├── scheduler/                  # Scheduled Tasks
│   ├── ReminderScheduler.java # Reminder scheduling
│   └── CleanupScheduler.java  # Data cleanup tasks
├── exception/                  # Exception Handling
│   ├── GlobalExceptionHandler.java # Global exception handler
│   ├── BusinessException.java # Business exceptions
│   ├── ValidationException.java # Validation exceptions
│   └── ResourceNotFoundException.java # Resource not found
├── util/                       # Utility Classes
│   ├── DateUtils.java         # Date utilities
│   ├── ValidationUtils.java   # Validation utilities
│   ├── FileUtils.java         # File utilities
│   ├── EmailUtils.java        # Email utilities
│   └── TenantUtils.java    # Multi-tenant utilities
├── mapper/                     # MapStruct Mappers
│   ├── UserMapper.java        # User entity-DTO mapping
│   ├── JobMapper.java         # Job entity-DTO mapping
│   ├── CompanyMapper.java     # Company entity-DTO mapping
│   └── InterviewMapper.java   # Interview entity-DTO mapping
└── JobTrackerApplication.java # Main application class
```

## Performance Optimizations

### 1. Database Optimizations

#### Indexing Strategy (Multi-Tenant Optimized)
```sql
-- Multi-tenant composite indexes (CRITICAL)
CREATE INDEX idx_jobs_company_status_date ON jobs(company_id, job_status, created_at);
CREATE INDEX idx_jobs_company_published ON jobs(company_id, job_status, published_at) WHERE job_status = 'PUBLISHED';
CREATE INDEX idx_applications_company_status_date ON applications(company_id, status_id, applied_date);
CREATE INDEX idx_applications_company_job_status ON applications(company_id, job_id, status_id);
CREATE INDEX idx_interviews_company_scheduled ON interviews(company_id, scheduled_date, status);
CREATE INDEX idx_notifications_company_user_unread ON notifications(company_id, user_id, is_read);
CREATE INDEX idx_users_company_role_active ON users(company_id, role_id, is_active);
CREATE INDEX idx_audit_logs_company_entity ON audit_logs(company_id, entity_type, entity_id);

-- Single-column indexes
CREATE INDEX idx_jobs_deadline_status ON jobs(deadline_date, job_status);
CREATE INDEX idx_applications_assigned_status ON applications(assigned_to, status_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- Full-text search indexes
CREATE FULLTEXT INDEX idx_jobs_search ON jobs(title, position, job_description);
CREATE FULLTEXT INDEX idx_companies_search ON companies(name, description);
CREATE FULLTEXT INDEX idx_applications_search ON applications(candidate_name, candidate_email, notes);
```

#### Query Optimization
```java
// Using @EntityGraph for eager loading (multi-tenant)
@EntityGraph(attributePaths = {"company", "skills", "applications"})
@Query("SELECT j FROM Job j WHERE j.company.id = :companyId AND j.deletedAt IS NULL")
Page<Job> findByCompanyIdWithDetails(@Param("companyId") String companyId, Pageable pageable);

// Application queries với multi-tenant
@EntityGraph(attributePaths = {"job", "assignedTo", "statusHistory"})
@Query("SELECT a FROM Application a WHERE a.company.id = :companyId AND a.deletedAt IS NULL")
Page<Application> findByCompanyIdWithDetails(@Param("companyId") String companyId, Pageable pageable);

// Using @BatchSize for batch loading
@BatchSize(size = 20)
@OneToMany(mappedBy = "job", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
private Set<Interview> interviews = new HashSet<>();
```

### 2. Caching Strategy

#### Redis Configuration
```java
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        LettuceConnectionFactory factory = new LettuceConnectionFactory();
        factory.setHostName("localhost");
        factory.setPort(6379);
        return factory;
    }
    
    @Bean
    public RedisTemplate<String, Object> redisTemplate() {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());
        template.setDefaultSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
    
    @Bean
    public CacheManager cacheManager() {
        RedisCacheManager.Builder builder = RedisCacheManager
            .RedisCacheManagerBuilder
            .fromConnectionFactory(redisConnectionFactory())
            .cacheDefaults(cacheConfiguration(Duration.ofMinutes(10)));
        
        return builder.build();
    }
    
    private RedisCacheConfiguration cacheConfiguration(Duration ttl) {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(ttl)
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}
```

#### Service Layer Caching
```java
@Service
public class JobService {
    
    @Cacheable(value = "jobs", key = "#companyId + '_' + #page + '_' + #size")
    public Page<JobResponse> getJobsByCompanyId(String companyId, int page, int size) {
        // Implementation với multi-tenant filtering
    }
    
    @CacheEvict(value = "jobs", allEntries = true)
    public JobResponse createJob(JobCreateRequest request, String userId, String companyId) {
        // Implementation với company validation
    }
    
    @Cacheable(value = "dashboard", key = "#companyId")
    public DashboardStatistics getDashboardStatistics(String companyId) {
        // Implementation với multi-tenant metrics
    }
}

@Service
public class ApplicationService {
    
    @Cacheable(value = "applications", key = "#companyId + '_' + #statusId + '_' + #page")
    public Page<ApplicationResponse> getApplicationsByCompanyId(String companyId, String statusId, int page, int size) {
        // Implementation với multi-tenant filtering
    }
    
    @CacheEvict(value = "applications", allEntries = true)
    public ApplicationResponse createApplication(ApplicationCreateRequest request, String companyId) {
        // Implementation với company validation
    }
}
```

## Monitoring & Observability

### 1. Application Metrics

#### Custom Metrics
```java
@Component
public class JobMetrics {
    
    private final MeterRegistry meterRegistry;
    private final Counter jobCreatedCounter;
    private final Counter jobStatusChangedCounter;
    private final Timer jobProcessingTimer;
    
    public JobMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.jobCreatedCounter = Counter.builder("jobs.created")
            .description("Number of jobs created")
            .register(meterRegistry);
        this.jobStatusChangedCounter = Counter.builder("jobs.status.changed")
            .description("Number of job status changes")
            .register(meterRegistry);
        this.jobProcessingTimer = Timer.builder("jobs.processing.time")
            .description("Job processing time")
            .register(meterRegistry);
    }
    
    public void incrementJobCreated() {
        jobCreatedCounter.increment();
    }
    
    public void incrementJobStatusChanged(JobStatus from, JobStatus to) {
        jobStatusChangedCounter.increment(
            Tags.of("from", from.name(), "to", to.name()) // DRAFT → PUBLISHED, etc.
        );
    }
    
    public void incrementApplicationStatusChanged(String fromStatusId, String toStatusId) {
        Counter applicationStatusCounter = Counter.builder("applications.status.changed")
            .description("Number of application status changes")
            .register(meterRegistry);
        applicationStatusCounter.increment(
            Tags.of("from", fromStatusId, "to", toStatusId) // Status IDs from application_statuses table
        );
    }
    
    public void recordJobProcessingTime(Duration duration) {
        jobProcessingTimer.record(duration);
    }
}
```

### 2. Health Checks

#### Custom Health Indicators
```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    
    private final DataSource dataSource;
    
    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }
    
    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(1)) {
                return Health.up()
                    .withDetail("database", "MySQL")
                    .withDetail("validationQuery", "isValid")
                    .build();
            }
        } catch (SQLException e) {
            return Health.down()
                .withDetail("database", "MySQL")
                .withDetail("error", e.getMessage())
                .build();
        }
        
        return Health.down()
            .withDetail("database", "MySQL")
            .withDetail("error", "Connection validation failed")
            .build();
    }
}
```

## Security Best Practices

### 1. Input Validation

#### Custom Validators
```java
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidJobStatusValidator.class)
public @interface ValidJobStatus {
    String message() default "Invalid job status";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class ValidJobStatusValidator implements ConstraintValidator<ValidJobStatus, String> {
    
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return true;
        
        try {
            JobStatus.valueOf(value.toUpperCase()); // DRAFT, PUBLISHED, PAUSED, CLOSED, FILLED
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}

// ENUM Definitions
public enum JobStatus {
    DRAFT, PUBLISHED, PAUSED, CLOSED, FILLED
}

public enum JobType {
    FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE
}

// ApplicationStatus is now a lookup table entity, not an enum
// See ApplicationStatus.java entity definition below

public enum InterviewType {
    PHONE, VIDEO, IN_PERSON, TECHNICAL, HR, FINAL
}

public enum InterviewStatus {
    SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED
}

public enum InterviewResult {
    PASSED, FAILED, PENDING
}
```

### 2. Rate Limiting

#### Rate Limiting Configuration
```java
@Configuration
public class RateLimitingConfig {
    
    @Bean
    public RedisTemplate<String, String> rateLimitRedisTemplate() {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        return template;
    }
    
    @Bean
    public RateLimiter rateLimiter() {
        return RateLimiter.create(10.0); // 10 requests per second
    }
}
```

## Scalability Considerations

### 1. Horizontal Scaling

#### Load Balancer Configuration
```nginx
upstream backend {
    least_conn;
    server backend1:8080 max_fails=3 fail_timeout=30s;
    server backend2:8080 max_fails=3 fail_timeout=30s;
    server backend3:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

### 2. Database Scaling

#### Read Replica Configuration
```yaml
# application-production.yml
spring:
  datasource:
    primary:
      url: jdbc:mysql://mysql-primary:3306/jobtracker
      username: jobtracker
      password: ${MYSQL_PASSWORD}
    replica:
      url: jdbc:mysql://mysql-replica:3306/jobtracker
      username: jobtracker
      password: ${MYSQL_PASSWORD}
```

##  Base Entity Classes

### Audit Patterns Analysis

Dựa trên database schema, có **3 patterns chính** cho audit fields:

#### **Pattern 1: FULL AUDIT** (14 bảng)
```java
// Có: created_by, updated_by, created_at, updated_at
- Lookup Tables (4 bảng): roles, permissions (RBAC), application_statuses, email_templates
- Core Business Entities (8 bảng): users, companies, jobs, skills, interviews, applications, comments, attachments
- Auth/Invite Tables (2 bảng): user_invitations (invite tokens), invalidated_token (JWT invalidation)
// Note: Các lookup tables khác (job_statuses, job_types, etc.) đã chuyển sang ENUM
```

#### **Pattern 2: PARTIAL AUDIT** (3 bảng)  
```java
// Có: created_by, created_at, updated_at (không có updated_by)
- Junction Tables: job_skills, role_permissions, interview_interviewers
// Note: user_skills và job_resumes đã bỏ
```

#### **Pattern 3: SYSTEM / CONFIG TABLES** (7 bảng)
```java
// Có: created_at, updated_at (không có user tracking, không soft delete)
- System Tables: notifications, user_sessions, audit_logs
- Config/Billing Tables: subscription_plans, company_subscriptions, payments, email_outbox
```

#### **Pattern 4: TOKEN TABLES** (2 bảng)
```java
// Có: created_at, updated_at, deleted_at (không có created_by, updated_by)
// Lưu token (random string hoặc UUID)
- email_verification_tokens: Verify email (register, resend verification)
- password_reset_tokens: Forgot/Reset password
```

### 📋 Base Class Mapping Table

| **Base Class** | **Tables** | **Audit Fields** | **Soft Delete** | **Count** |
|---|---|---|---|---|
| **BaseFullAuditEntity** | **Lookup Tables (3 bảng)** | | | |
| | `roles` | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 1 |
| | `permissions` | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 2 |
| | `application_statuses` ➕ | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 3 |
| | `email_templates` ➕ | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 4 |
| | **Core Business Entities (8 bảng)** | | | |
| | `users` | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 5 |
| | `companies` | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 6 |
| | `jobs` | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 7 |
| | `skills` | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 8 |
| | `interviews` | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 9 |
| | `applications` ➕ | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 10 |
| | `comments` ➕ | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 11 |
| | `attachments` | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 12 |
| | **Auth/Invite Tables (2 bảng)** | | | |
| | `user_invitations` ➕ | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 13 |
| | `invalidated_token` ➕ | ✅ created_by, updated_by, created_at, updated_at | ✅ deleted_at | 14 |
| **BaseEntity** | **Token Tables (2 bảng)** | | | |
| | `email_verification_tokens` ➕ | ✅ created_at, updated_at | ✅ deleted_at | 15 |
| | `password_reset_tokens` ➕ | ✅ created_at, updated_at | ✅ deleted_at | 16 |
| **BasePartialAuditEntity** | **Junction Tables (3 bảng)** | | | |
| | `job_skills` | ✅ created_by, created_at, updated_at | ✅ is_deleted | 17 |
| | `role_permissions` ➕ | ✅ created_by, created_at, updated_at | ✅ is_deleted | 18 |
| | `interview_interviewers` ➕ | ✅ created_by, created_at, updated_at | ✅ is_deleted | 19 |
| **BaseSystemEntity** | **System / Config Tables (7 bảng)** | | | |
| | `notifications` | ✅ created_at, updated_at | ❌ No soft delete | 20 |
| | `user_sessions` | ✅ created_at, updated_at | ❌ No soft delete | 21 |
| | `audit_logs` | ✅ created_at | ❌ No soft delete | 22 |
| | `subscription_plans` ➕ | ✅ created_at, updated_at | ❌ No soft delete | 23 |
| | `company_subscriptions` ➕ | ✅ created_at, updated_at | ❌ No soft delete | 24 |
| | `payments` ➕ | ✅ created_at, updated_at | ❌ No soft delete | 25 |
| | `email_outbox` ➕ | ✅ created_at, updated_at | ❌ No soft delete | 26 |
| **Không có Base Class** | **History Tables (1 bảng)** | | | |
| | `application_status_history` ➕ | ❌ No audit fields | ❌ No soft delete | 27 |

### Implementation Summary

#### **BaseFullAuditEntity** (14 bảng)
```java
// Extends: BaseSoftDeleteEntity
// Fields: created_by, updated_by, created_at, updated_at, deleted_at
// Usage: Lookup tables (roles, permissions, application_statuses, email_templates) + core business entities + auth/invite tables
// Auth/Invite Tables: user_invitations (invite tokens), invalidated_token (JWT invalidation)
```

#### **BaseEntity** (Token Tables - 2 bảng)
```java
// Extends: BaseEntity (created_at, updated_at)
// Fields: created_at, updated_at, deleted_at (no created_by, updated_by)
// Usage: email_verification_tokens, password_reset_tokens
// Lưu token (random string hoặc UUID)
```

#### **BasePartialAuditEntity** (3 bảng)
```java
// Extends: BaseBooleanDeleteEntity  
// Fields: created_by, created_at, updated_at, is_deleted
// Usage: Junction tables (job_skills, role_permissions, interview_interviewers)
// Note: user_skills và job_resumes đã bỏ
```

#### **BaseSystemEntity** (System / Config Tables)
```java
// No inheritance
// Fields: created_at, updated_at (audit_logs only has created_at)
// Usage: System-generated tables và config tables (subscription_plans, company_subscriptions)
```

### Base Class Implementation

#### 1. BaseFullAuditEntity (Full Audit + Soft Delete)
```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseFullAuditEntity extends BaseSoftDeleteEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;
    
    // Getters, setters
}
```

#### 2. BasePartialAuditEntity (Partial Audit + Boolean Delete)
```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BasePartialAuditEntity extends BaseBooleanDeleteEntity {
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    // Getters, setters
}
```

#### 3. BaseSystemEntity (System Tables + No Soft Delete)
```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseSystemEntity {
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Getters, setters
}
```

#### 4. BaseEntity (created_at, updated_at)
```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Getters, setters
}
```

#### 5. BaseSoftDeleteEntity (deleted_at)
```java
@MappedSuperclass
public abstract class BaseSoftDeleteEntity {
    
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @Transient
    public boolean isDeleted() {
        return deletedAt != null;
    }
    
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
    
    public void restore() {
        this.deletedAt = null;
    }
    
    // Getters, setters
}
```

#### 6. BaseBooleanDeleteEntity (is_deleted)
```java
@MappedSuperclass
public abstract class BaseBooleanDeleteEntity {
    
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;
    
    public boolean isDeleted() {
        return isDeleted;
    }
    
    public void softDelete() {
        this.isDeleted = true;
    }
    
    public void restore() {
        this.isDeleted = false;
    }
    
    // Getters, setters
}
```

### Entity Implementation Examples

#### Lookup Tables (3 bảng)
```java
@Entity
@Table(name = "roles")
public class Role extends BaseFullAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @Column(nullable = false, unique = true)
    private String name; // SYSTEM_ADMIN, ADMIN_COMPANY, RECRUITER (Global RBAC)
    
    private String description;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    // Business fields only, audit fields inherited
}

@Entity
@Table(name = "permissions")
public class Permission extends BaseFullAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @Column(nullable = false, unique = true)
    private String name; // JOB_CREATE, APPLICATION_VIEW, etc.
    
    private String resource; // JOB, APPLICATION, INTERVIEW, etc.
    private String action; // CREATE, READ, UPDATE, DELETE
    
    // Business fields only, audit fields inherited
}

@Entity
@Table(name = "application_statuses")
public class ApplicationStatus extends BaseFullAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @Column(nullable = false, unique = true, length = 50)
    private String name; // NEW, SCREENING, INTERVIEWING, OFFERED, HIRED, REJECTED
    
    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;
    
    @Column(length = 255)
    private String description;
    
    @Column(length = 7)
    private String color = "#6B7280";
    
    @Column(name = "sort_order")
    private Integer sortOrder = 0;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    // Business fields only, audit fields inherited
}
```

#### Core Business Entities (8 bảng)
```java
@Entity
@Table(name = "jobs")
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = "string"))
@Filter(name = "tenantFilter", condition = "company_id = :tenantId")
public class Job extends BaseFullAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // HR/Recruiter
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company; // Multi-tenant key
    
    // Business fields only, audit fields inherited
}

@Entity
@Table(name = "applications")
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = "string"))
@Filter(name = "tenantFilter", condition = "company_id = :tenantId")
public class Application extends BaseFullAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company; // Multi-tenant key
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private ApplicationStatus status; // Lookup table: application_statuses
    
    // Business fields only, audit fields inherited
}
```

#### Auth/Token Tables (2 bảng)
```java
@Entity
@Table(name = "user_invitations")
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = "string"))
@Filter(name = "tenantFilter", condition = "company_id = :tenantId")
public class UserInvitation extends BaseFullAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // User được mời
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company; // Multi-tenant key
    
    @Column(name = "token", nullable = false, unique = true, length = 255)
    private String token; // Invite token
    
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt; // Thời gian hết hạn (7 ngày)
    
    @Column(name = "used_at")
    private LocalDateTime usedAt; // Thời gian user đã accept (null nếu chưa dùng)
    
    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt; // Thời gian gửi email
    
    // Audit fields inherited from BaseFullAuditEntity
}

@Entity
@Table(name = "invalidated_token")
public class InvalidatedToken extends BaseFullAuditEntity {
    @Id
    @Column(name = "id", length = 255)
    private String id; // JWT ID (jti) - không dùng UUID generation
    
    @Column(name = "expiry_time", nullable = false)
    private Date expiryTime; // Thời gian hết hạn của token (từ JWT claims)
    
    // Audit fields inherited from BaseFullAuditEntity
}

@Entity
@Table(name = "email_verification_tokens")
public class EmailVerificationToken extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company; // Multi-tenant key
    
    @Column(nullable = false, unique = true, length = 255)
    private String token;
    
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt; // 24-48 giờ
    
    @Column(name = "used_at")
    private LocalDateTime usedAt;
    
    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;
    
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    // created_at, updated_at inherited from BaseEntity
}

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company; // Multi-tenant key
    
    @Column(nullable = false, unique = true, length = 255)
    private String token;
    
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt; // Thường 1 giờ
    
    @Column(name = "used_at")
    private LocalDateTime usedAt;
    
    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;
    
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    // created_at, updated_at inherited from BaseEntity
}
```

#### Junction Tables (3 bảng)
```java
@Entity
@Table(name = "job_skills")
public class JobSkill extends BasePartialAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;
    
    // Business fields only, audit fields inherited
}

@Entity
@Table(name = "role_permissions", 
       uniqueConstraints = @UniqueConstraint(name = "uk_role_permission", columnNames = {"role_id", "permission_id"}))
public class RolePermission extends BasePartialAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;
    
    // Business fields only, audit fields inherited
}

@Entity
@Table(name = "interview_interviewers",
       uniqueConstraints = @UniqueConstraint(name = "uk_interview_interviewer", columnNames = {"interview_id", "interviewer_id"}))
public class InterviewInterviewer extends BasePartialAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_id", nullable = false)
    private Interview interview;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interviewer_id", nullable = false)
    private User interviewer; // User with role = RECRUITER (hoặc có quyền interview)
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company; // Multi-tenant key
    
    @Column(name = "is_primary")
    private Boolean isPrimary = false; // Primary interviewer flag
    
    // Business fields only, audit fields inherited
}
```

#### System Tables (3 bảng)
```java
@Entity
@Table(name = "notifications")
public class Notification extends BaseSystemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    // Business fields only, audit fields inherited
}
```

### Benefits of Base Classes

#### Code Reusability
- Giảm code duplication
- Consistent audit implementation
- Easy maintenance

#### Type Safety
- Compile-time checking
- IDE support
- Refactoring safety

#### Performance
- JPA inheritance optimization
- Single table inheritance
- Efficient queries

#### Maintainability
- Centralized audit logic
- Easy to add new audit fields
- Consistent behavior

## Future Enhancements

### 1. Microservices Migration

#### Service Boundaries
- **User Service**: Authentication, profile management
- **Job Service**: Job management, applications
- **Company Service**: Company information, reviews
- **Notification Service**: Email, SMS, push notifications
- **File Service**: File storage, processing
- **Analytics Service**: Reporting, dashboards

### 2. Advanced Features

#### AI Integration
- **CV Parsing**: AI-powered CV parsing và extraction
- **Application Matching**: ML-based matching applications với job requirements
- **Interview Preparation**: AI-generated interview questions
- **Salary Prediction**: ML-based salary estimates
- **Candidate Ranking**: AI-powered candidate ranking

#### Real-time Features
- **Live Chat**: Real-time communication giữa HR/Recruiter
- **Collaborative Comments**: Real-time comments trên applications
- **Live Notifications**: WebSocket-based real-time updates
- **Video Interviews**: Integrated video calling

### 3. Mobile Application

#### React Native Implementation
- **Cross-platform**: iOS and Android support
- **Offline Support**: Local data synchronization
- **Push Notifications**: Native push notifications
- **Biometric Authentication**: Fingerprint/Face ID login
