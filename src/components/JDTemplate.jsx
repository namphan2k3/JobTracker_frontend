import { Link } from 'react-router-dom';
import styles from '../styles/components/JDTemplate.module.css';

const JOB_TYPE_LABELS = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
  CONTRACT: 'Hợp đồng',
  INTERNSHIP: 'Thực tập',
  FREELANCE: 'Freelance',
};

/**
 * Template JD cố định - nhận job object từ backend
 * Dùng cho: PublicJobPage (public) và Preview Drawer (HR)
 */
export function JDTemplate({ job, jobId, showApplyButton = true, isPreview = false }) {
  if (!job) return null;

  const salaryStr =
    job.salaryMin != null || job.salaryMax != null
      ? `${job.salaryMin ?? '?'} – ${job.salaryMax ?? '?'} ${job.currency || 'VND'}`
      : null;

  return (
    <article className={styles.jdTemplate}>
      {isPreview && (
        <div className={styles.jdTemplate__previewBadge}>Xem trước</div>
      )}
      <header className={styles.jdTemplate__header}>
        <h1 className={styles.jdTemplate__title}>{job.title || 'Tin tuyển dụng'}</h1>
        {job.companyName && (
          <p className={styles.jdTemplate__company}>{job.companyName}</p>
        )}
        <div className={styles.jdTemplate__meta}>
          {job.position && <span>{job.position}</span>}
          {job.jobType && (
            <span>{JOB_TYPE_LABELS[job.jobType] || job.jobType}</span>
          )}
          {job.location && <span>{job.location}</span>}
          {job.isRemote && <span>Remote</span>}
          {salaryStr && <span>{salaryStr}</span>}
          {job.deadlineDate && (
            <span>Hạn nộp: {new Date(job.deadlineDate).toLocaleDateString('vi-VN')}</span>
          )}
        </div>
      </header>

      <div className={styles.jdTemplate__body}>
        {job.jobDescription && (
          <section className={styles.jdTemplate__section}>
            <h2>Mô tả công việc</h2>
            <div className={styles.jdTemplate__content}>{job.jobDescription}</div>
          </section>
        )}
        {job.requirements && (
          <section className={styles.jdTemplate__section}>
            <h2>Yêu cầu</h2>
            <div className={styles.jdTemplate__content}>{job.requirements}</div>
          </section>
        )}
        {job.benefits && (
          <section className={styles.jdTemplate__section}>
            <h2>Phúc lợi</h2>
            <div className={styles.jdTemplate__content}>{job.benefits}</div>
          </section>
        )}
        {job.skills?.length > 0 && (
          <section className={styles.jdTemplate__section}>
            <h2>Kỹ năng</h2>
            <ul className={styles.jdTemplate__skillList}>
              {job.skills.map((s) => (
                <li key={s.id || s.skillId || s.name}>
                  {s.name || s}
                  {s.isRequired && ' (bắt buộc)'}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {showApplyButton && jobId && (
        <footer className={styles.jdTemplate__footer}>
          <Link
            to={`/public/jobs/${jobId}/apply`}
            className={styles.jdTemplate__applyBtn}
          >
            Ứng tuyển ngay
          </Link>
        </footer>
      )}
    </article>
  );
}
