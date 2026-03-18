# Apply to Job – Hai case sử dụng

> **Mục đích**: Công ty có thể dùng JobTracker theo 2 cách: (1) Tích hợp API vào trang riêng, hoặc (2) Dùng trang của JobTracker để đăng job và nhận apply.

---

## Case 1: Công ty có trang riêng → Public API

**Kịch bản**: Công ty có career page / job board riêng trên website của họ. Họ muốn tích hợp form apply vào trang đó, gửi dữ liệu về JobTracker ATS.

**Giải pháp**: Dùng **Public API** – không cần auth.

| API | Mô tả |
|-----|-------|
| `POST /public/jobs/{jobId}/apply` | Candidate apply (FormData: candidateName, candidateEmail, candidatePhone, coverLetter, resume) |
| `GET /public/applications/{applicationToken}/status` | Candidate track status (token từ email confirmation) |
| `POST /public/applications/{applicationToken}/attachments` | Candidate upload thêm tài liệu (khi HR yêu cầu) |

**Flow**:
1. Công ty đăng job trên JobTracker (HR/Admin)
2. Công ty lấy `jobId` từ JobTracker
3. Công ty nhúng form apply trên trang riêng → gọi `POST /public/jobs/{jobId}/apply`
4. Sau khi apply, candidate nhận email với `applicationToken` → có thể track status qua API hoặc redirect sang trang JobTracker

**Tài liệu API**: Xem [API.md](./API.md) – mục Applications Management APIs.

---

## Case 2: Dùng trang JobTracker → Apply trực tiếp

**Kịch bản**: Công ty không có trang riêng, hoặc muốn dùng luôn trang JobTracker để candidate xem job và apply.

**Giải pháp**: Dùng **trang public** của JobTracker.

| Trang | URL | Mô tả |
|-------|-----|-------|
| Apply | `/public/jobs/:jobId/apply` | Form apply (tên, email, phone, cover letter, CV) |
| Track status | `/public/applications/:token/status` | Xem trạng thái đơn ứng tuyển |
| Upload attachments | `/public/applications/:token/attachments` | Upload thêm tài liệu (khi HR cho phép) |

**Flow**:
1. HR đăng job trên JobTracker (`/app/jobs`)
2. HR chia sẻ link apply: `https://app.jobtracker.com/public/jobs/{jobId}/apply`
3. Candidate mở link → điền form → gửi
4. Candidate nhận email với link track status

**Cần thêm** (sau):
- Trang danh sách job public: `/public/jobs` hoặc `/public/companies/:slug/jobs` – candidate browse và chọn job để apply
- Landing page có link đến job listing

---

## Tóm tắt

| Case | Công ty | Candidate |
|------|---------|-----------|
| 1 – API | Trang riêng, form tự build | Apply trên trang công ty → API gửi JobTracker |
| 2 – Platform | Đăng job trên JobTracker | Apply trên trang JobTracker (`/public/jobs/:id/apply`) |

Cả hai case đều dùng chung backend API. Case 1: frontend do công ty tự làm. Case 2: frontend do JobTracker cung cấp.
