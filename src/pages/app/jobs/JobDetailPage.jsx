import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
  getJobSkills,
  addJobSkill,
  deleteJobSkill,
} from '../../../api/jobs';
import { getSkills } from '../../../api/skills';
import { usePermissions } from '../../../hooks/usePermissions';
import { Drawer } from '../../../components/Drawer';
import { JDTemplate } from '../../../components/JDTemplate';
import styles from '../../../styles/components/JobDetailPage.module.css';

const JOB_TYPE_LABELS = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
  CONTRACT: 'Hợp đồng',
  INTERNSHIP: 'Thực tập',
  FREELANCE: 'Freelance',
};

const JOB_STATUS_LABELS = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đang tuyển',
  PAUSED: 'Tạm dừng',
  CLOSED: 'Đã đóng',
  FILLED: 'Đã tuyển',
};

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [job, setJob] = useState(null);
  const [jobSkills, setJobSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addSkillModalOpen, setAddSkillModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [addSkillForm, setAddSkillForm] = useState({
    skillId: '',
    isRequired: true,
    proficiencyLevel: 'INTERMEDIATE',
  });
  const [skillSearch, setSkillSearch] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    getJobById(id)
      .then(setJob)
      .catch((err) => setError(err.response?.data?.message || err.message || 'Tải thất bại'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (job) {
      setForm({
        title: job.title || '',
        position: job.position || '',
        jobType: job.jobType || '',
        location: job.location || '',
        salaryMin: job.salaryMin ?? '',
        salaryMax: job.salaryMax ?? '',
        currency: job.currency || 'VND',
        deadlineDate: job.deadlineDate || '',
        jobDescription: job.jobDescription || '',
        requirements: job.requirements || '',
        benefits: job.benefits || '',
        jobUrl: job.jobUrl || '',
        isRemote: job.isRemote ?? false,
      });
    }
  }, [job]);

  useEffect(() => {
    if (id) {
      getJobSkills(id).then(setJobSkills).catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    getSkills({ size: 200 }).then(({ skills }) => setAllSkills(skills)).catch(() => {});
  }, []);

  const handleUpdate = (e) => {
    e.preventDefault();
    setError('');
    updateJob(id, {
      title: form.title || undefined,
      position: form.position || undefined,
      jobType: form.jobType || undefined,
      location: form.location || undefined,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      currency: form.currency || undefined,
      deadlineDate: form.deadlineDate || undefined,
      jobDescription: form.jobDescription || undefined,
      requirements: form.requirements || undefined,
      benefits: form.benefits || undefined,
      jobUrl: form.jobUrl || undefined,
      isRemote: form.isRemote,
    })
      .then((updated) => {
        setJob((prev) => ({ ...prev, ...updated }));
        setEditModalOpen(false);
      })
      .catch((err) => setError(err.response?.data?.message || err.message || 'Cập nhật thất bại'));
  };

  const handlePublish = () => {
    setError('');
    setJob((prev) => ({ ...prev, jobStatus: 'PUBLISHED' }));
    updateJobStatus(id, { jobStatus: 'PUBLISHED' })
      .then(() => getJobById(id))
      .then(setJob)
      .catch((err) => setError(err.response?.data?.message || err.message || 'Publish thất bại'));
  };

  const handleUnpublish = () => {
    setError('');
    setJob((prev) => ({ ...prev, jobStatus: 'DRAFT' }));
    updateJobStatus(id, { jobStatus: 'DRAFT' })
      .then(() => getJobById(id))
      .then(setJob)
      .catch((err) => setError(err.response?.data?.message || err.message || 'Unpublish thất bại'));
  };

  const handleDelete = () => {
    if (!window.confirm('Bạn có chắc muốn xóa tin tuyển dụng này?')) return;
    deleteJob(id)
      .then(() => navigate('/app/jobs'))
      .catch((err) => setError(err.response?.data?.message || err.message || 'Xóa thất bại'));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!addSkillForm.skillId) return;
    setError('');
    addJobSkill(id, {
      skillId: addSkillForm.skillId,
      isRequired: addSkillForm.isRequired,
      proficiencyLevel: addSkillForm.proficiencyLevel || 'INTERMEDIATE',
    })
      .then((added) => {
        setJobSkills((prev) => [...prev, added]);
        setAddSkillModalOpen(false);
        setAddSkillForm({
          skillId: '',
          isRequired: true,
          proficiencyLevel: 'INTERMEDIATE',
        });
        setSkillSearch('');
      })
      .catch((err) => setError(err.response?.data?.message || err.message || 'Thêm skill thất bại'));
  };

  const handleRemoveSkill = (skillId) => {
    if (!window.confirm('Xóa skill này?')) return;
    deleteJobSkill(id, skillId)
      .then(() => setJobSkills((prev) => prev.filter((s) => s.skillId !== skillId && s.id !== skillId)))
      .catch((err) => setError(err.response?.data?.message || err.message || 'Xóa skill thất bại'));
  };

  const normalizedSkillSearch = skillSearch.trim().toLowerCase();
  const usedSkillIds = new Set(jobSkills.map((s) => s.skillId || s.id));
  const availableSkills = allSkills.filter((s) => s.id && !usedSkillIds.has(s.id));
  const suggestionSkills =
    normalizedSkillSearch.length === 0
      ? availableSkills.slice(0, 10)
      : availableSkills
          .filter((s) => (s.name || '').toLowerCase().includes(normalizedSkillSearch))
          .slice(0, 10);

  if (loading) return <p className={styles.jobDetailPage__loading}>Đang tải...</p>;
  if (!job) return <p className={styles.jobDetailPage__error}>Không tìm thấy tin tuyển dụng.</p>;

  const canPublish = job.jobStatus === 'DRAFT' || job.jobStatus === 'PAUSED';
  const canUnpublish = job.jobStatus === 'PUBLISHED';
  const appliedJobsLink = `/app/applications?jobId=${job.id}`;

  return (
    <div className={styles.jobDetailPage}>
      <header className={styles.jobDetailPage__header}>
        <h1 className={styles.jobDetailPage__title}>{job.title}</h1>
      </header>

      {error && (
        <div className={styles.jobDetailPage__error} role="alert">
          {error}
        </div>
      )}

      <div className={styles.jobDetailPage__grid}>
        <section className={styles.jobDetailPage__section}>
          <h2>Thông tin cơ bản</h2>
          <dl>
            <dt>Vị trí</dt>
            <dd>{job.position || '-'}</dd>
            <dt>Loại</dt>
            <dd>{JOB_TYPE_LABELS[job.jobType] || job.jobType || '-'}</dd>
            <dt>Địa điểm</dt>
            <dd>{job.location || '-'}</dd>
            <dt>Lương</dt>
            <dd>
              {job.salaryMin != null || job.salaryMax != null
                ? `${job.salaryMin ?? '?'} - ${job.salaryMax ?? '?'} ${job.currency || ''}`
                : '-'}
            </dd>
            <dt>Remote</dt>
            <dd>{job.isRemote ? 'Có' : 'Không'}</dd>
            <dt>Hạn nộp</dt>
            <dd>{job.deadlineDate || '-'}</dd>
            <dt>Trạng thái</dt>
            <dd>
              <span className={styles.jobDetailPage__statusBadge} data-status={job.jobStatus}>
                {JOB_STATUS_LABELS[job.jobStatus] || job.jobStatus}
              </span>
            </dd>
            <dt>Ứng tuyển</dt>
            <dd>
              <Link to={appliedJobsLink}>{job.applicationsCount ?? 0} đơn</Link>
            </dd>
          </dl>
          <div className={styles.jobDetailPage__actions}>
            <button type="button" onClick={() => setPreviewOpen(true)}>
              Preview JD
            </button>
            {hasPermission('JOB_UPDATE') && (
              <button type="button" onClick={() => setEditModalOpen(true)}>
                Chỉnh sửa
              </button>
            )}
            {hasPermission('JOB_UPDATE') && canPublish && (
              <button type="button" onClick={handlePublish}>
                Publish
              </button>
            )}
            {hasPermission('JOB_UPDATE') && canUnpublish && (
              <button type="button" onClick={handleUnpublish}>
                Unpublish
              </button>
            )}
          </div>
        </section>

        <section className={styles.jobDetailPage__section}>
          <h2>Mô tả</h2>
          <div className={styles.jobDetailPage__content}>
            {job.jobDescription || '-'}
          </div>
        </section>

        <section className={styles.jobDetailPage__section}>
          <h2>Yêu cầu</h2>
          <div className={styles.jobDetailPage__content}>
            {job.requirements || '-'}
          </div>
        </section>

        <section className={styles.jobDetailPage__section}>
          <h2>Phúc lợi</h2>
          <div className={styles.jobDetailPage__content}>
            {job.benefits || '-'}
          </div>
        </section>

        <section className={styles.jobDetailPage__section}>
          <h2>Skills</h2>
          <ul className={styles.jobDetailPage__skillList}>
            {jobSkills.map((js) => (
              <li key={js.id || js.skillId}>
                {js.name} {js.isRequired && '(bắt buộc)'}
                {hasPermission('JOB_UPDATE') && (
                  <button
                    type="button"
                    className={styles.jobDetailPage__removeSkill}
                    onClick={() => handleRemoveSkill(js.skillId || js.id)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {hasPermission('JOB_UPDATE') && (
            <button
              type="button"
              className={styles.jobDetailPage__addSkillButton}
              onClick={() => setAddSkillModalOpen(true)}
            >
              Thêm skill
            </button>
          )}
        </section>
      </div>

      <footer className={styles.jobDetailPage__footer}>
        <a
          href={`${window.location.origin || ''}/public/jobs/${job.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.jobDetailPage__applyLink}
        >
          Link JD (khi publish)
        </a>
        <a
          href={`${window.location.origin || ''}/public/jobs/${job.id}/apply`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.jobDetailPage__applyLink}
        >
          Link apply (mở tab mới)
        </a>
        {hasPermission('JOB_DELETE') && (
          <button type="button" className={styles.jobDetailPage__deleteBtn} onClick={handleDelete}>
            Xóa tin tuyển dụng
          </button>
        )}
      </footer>

      <Drawer open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Chỉnh sửa tin tuyển dụng">
        <form onSubmit={handleUpdate} className={styles.jobDetailPage__editForm}>
          {error && <div className={styles.jobDetailPage__error} role="alert">{error}</div>}
          <label>
            Tiêu đề <span className={styles.jobDetailPage__required}>*</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label>
            Vị trí <span className={styles.jobDetailPage__required}>*</span>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              required
            />
          </label>
          <label>
            Loại <span className={styles.jobDetailPage__required}>*</span>
            <select
              value={form.jobType}
              onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))}
              required
            >
              <option value="">-- Chọn --</option>
              {Object.entries(JOB_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Địa điểm
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </label>
          <label>
            Lương min
            <input
              type="number"
              value={form.salaryMin}
              onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
            />
          </label>
          <label>
            Lương max
            <input
              type="number"
              value={form.salaryMax}
              onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
            />
          </label>
          <label>
            Hạn nộp
            <input
              type="date"
              value={form.deadlineDate}
              onChange={(e) => setForm((f) => ({ ...f, deadlineDate: e.target.value }))}
            />
          </label>
          <label>
            Mô tả
            <textarea
              value={form.jobDescription}
              onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))}
              rows={4}
            />
          </label>
          <label>
            Yêu cầu
            <textarea
              value={form.requirements}
              onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
              rows={3}
            />
          </label>
          <label>
            Phúc lợi
            <textarea
              value={form.benefits}
              onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
              rows={2}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.isRemote}
              onChange={(e) => setForm((f) => ({ ...f, isRemote: e.target.checked }))}
            />
            Remote
          </label>
          <div className={styles.jobDetailPage__formActions}>
            <button type="submit">Lưu</button>
            <button type="button" onClick={() => setEditModalOpen(false)}>Hủy</button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Preview JD"
      >
        <JDTemplate
          job={{ ...job, skills: jobSkills }}
          jobId={job.id}
          showApplyButton={false}
          isPreview
        />
      </Drawer>

      <Drawer open={addSkillModalOpen} onClose={() => setAddSkillModalOpen(false)} title="Thêm skill">
        <form onSubmit={handleAddSkill} className={styles.jobDetailPage__editForm}>
          <label>
            Skill
            <input
              type="text"
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              placeholder="Tìm skill theo tên..."
            />
          </label>
          <div className={styles.jobDetailPage__skillSuggestionBox}>
            {suggestionSkills.length === 0 ? (
              <div className={styles.jobDetailPage__skillSearchEmpty}>
                {allSkills.length === 0 ? 'Chưa có skill nào trong hệ thống' : 'Không tìm thấy skill phù hợp'}
              </div>
            ) : (
              <div className={styles.jobDetailPage__skillSuggestionList}>
                {suggestionSkills.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={styles.jobDetailPage__skillSuggestionItem}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAddSkillForm((f) => ({ ...f, skillId: s.id }));
                      setSkillSearch(s.name);
                    }}
                  >
                    {s.name} {s.category ? `(${s.category})` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <label>
            <input
              type="checkbox"
              checked={addSkillForm.isRequired}
              onChange={(e) => setAddSkillForm((f) => ({ ...f, isRequired: e.target.checked }))}
            />
            Bắt buộc
          </label>
          <label>
            Level
            <select
              value={addSkillForm.proficiencyLevel}
              onChange={(e) =>
                setAddSkillForm((f) => ({ ...f, proficiencyLevel: e.target.value }))
              }
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </label>
          <div className={styles.jobDetailPage__formActions}>
            <button type="submit">Thêm</button>
            <button type="button" onClick={() => setAddSkillModalOpen(false)}>Hủy</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
