import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicJob } from '../../api/publicJobs';
import { getJobById } from '../../api/jobs';
import { getJobSkills } from '../../api/jobs';
import { useAuthStore } from '../../store/authStore';
import { JDTemplate } from '../../components/JDTemplate';
import styles from '../../styles/components/PublicJobPage.module.css';

/**
 * Trang JD public - template cố định, dữ liệu từ backend
 * Link: /public/jobs/:id (khi job published)
 * Fallback: nếu user đã đăng nhập (HR) dùng API nội bộ khi public API 401
 */
export function PublicJobPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const data = await getPublicJob(id);
        setJob(data);
      } catch (err) {
        if (accessToken && (err.response?.status === 401 || err.response?.status === 403)) {
          try {
            const [jobData, skills] = await Promise.all([
              getJobById(id),
              getJobSkills(id),
            ]);
            setJob({ ...jobData, skills });
          } catch (e) {
            setError(e.response?.data?.message || e.message || 'Không tìm thấy tin tuyển dụng');
          }
        } else {
          setError(err.response?.data?.message || err.message || 'Không tìm thấy tin tuyển dụng');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, accessToken]);

  if (loading) {
    return (
      <div className={styles.publicJobPage}>
        <p className={styles.publicJobPage__loading}>Đang tải...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={styles.publicJobPage}>
        <div className={styles.publicJobPage__error}>
          <h1>Không tìm thấy tin tuyển dụng</h1>
          <p>{error || 'Tin tuyển dụng có thể chưa được xuất bản hoặc đã bị xóa.'}</p>
          <Link to="/" className={styles.publicJobPage__homeLink}>
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.publicJobPage}>
      <JDTemplate job={job} jobId={id} showApplyButton />
    </div>
  );
}
