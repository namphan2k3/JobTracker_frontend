import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { createJob, addJobSkill } from '../../../api/jobs';
import { usePermissions } from '../../../hooks/usePermissions';
import { getSkills } from '../../../api/skills';
import { Drawer } from '../../../components/Drawer';
import styles from '../../../styles/components/JobCreatePage.module.css';

const JOB_TYPE_OPTIONS = [
  { value: 'FULL_TIME', label: 'Toàn thời gian' },
  { value: 'PART_TIME', label: 'Bán thời gian' },
  { value: 'CONTRACT', label: 'Hợp đồng' },
  { value: 'INTERNSHIP', label: 'Thực tập' },
  { value: 'FREELANCE', label: 'Freelance' },
];

const JOB_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PUBLISHED', label: 'Đang tuyển' },
];

const PROFICIENCY_OPTIONS = [
  { value: 'BEGINNER', label: 'Cơ bản' },
  { value: 'INTERMEDIATE', label: 'Trung bình' },
  { value: 'ADVANCED', label: 'Nâng cao' },
  { value: 'EXPERT', label: 'Chuyên gia' },
];

export function JobCreatePage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  if (!hasPermission('JOB_CREATE')) return <Navigate to="/app/jobs" replace />;
  const [skills, setSkills] = useState([]);
  const [skillSearch, setSkillSearch] = useState('');
  /** Mỗi phần tử: { skillId, name, isRequired, proficiencyLevel } */
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    position: '',
    jobType: 'FULL_TIME',
    jobStatus: 'DRAFT',
    location: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'VND',
    deadlineDate: '',
    jobDescription: '',
    requirements: '',
    benefits: '',
    jobUrl: '',
    isRemote: false,
  });

  const getSkillId = (skill) => {
    if (!skill) return null;
    return skill.id ?? skill.skillId ?? skill.skill_id ?? skill.value ?? null;
  };

  const getSkillName = (skill, fallbackId) => {
    if (!skill) return String(fallbackId || '');
    return skill.name ?? skill.label ?? skill.title ?? String(fallbackId || '');
  };

  useEffect(() => {
    getSkills({ size: 200 }).then(({ skills: s }) => setSkills(s)).catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.title) {
      setError('Vui lòng nhập tiêu đề.');
      return;
    }
    setLoading(true);
    const payload = {
      title: form.title,
      position: form.position || undefined,
      jobType: form.jobType || undefined,
      jobStatus: form.jobStatus || undefined,
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
    };
    createJob(payload)
      .then(async (created) => {
        if (selectedSkills.length > 0) {
          await Promise.all(
            selectedSkills.map((s) =>
              addJobSkill(created.id, {
                skillId: s.skillId,
                isRequired: s.isRequired,
                proficiencyLevel: s.proficiencyLevel || 'INTERMEDIATE',
              })
            )
          );
        }
        navigate(`/app/jobs/${created.id}`);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tạo tin tuyển dụng thất bại');
      })
      .finally(() => setLoading(false));
  };

  const addSkill = (skill) => {
    const skillId = getSkillId(skill);
    if (!skillId) return;
    if (selectedSkills.some((s) => s.skillId === skillId)) return;
    setSelectedSkills((prev) => [
      ...prev,
      {
        skillId,
        name: getSkillName(skill, skillId),
        isRequired: true,
        proficiencyLevel: 'INTERMEDIATE',
      },
    ]);
  };

  const removeSkill = (skillId) => {
    setSelectedSkills((prev) => prev.filter((s) => s.skillId !== skillId));
  };

  const updateSkillOption = (skillId, field, value) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.skillId === skillId ? { ...s, [field]: value } : s))
    );
  };

  const normalizedSkillSearch = skillSearch.trim().toLowerCase();
  const selectedSkillIds = selectedSkills.map((s) => s.skillId);
  const availableSkills = skills.filter((s) => {
    const id = getSkillId(s);
    return id && !selectedSkillIds.includes(id);
  });
  const suggestionSkills =
    normalizedSkillSearch.length === 0
      ? availableSkills.slice(0, 10)
      : availableSkills
          .filter((s) => s.name.toLowerCase().includes(normalizedSkillSearch))
          .slice(0, 10);

  return (
    <Drawer open onClose={() => navigate('/app/jobs')} title="Tạo tin tuyển dụng">
      {error && (
        <div className={styles.jobCreatePage__error} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.jobCreatePage__form}>
        <label>
          Tiêu đề <span className={styles.jobCreatePage__required}>*</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </label>
        <label>
          Vị trí <span className={styles.jobCreatePage__required}>*</span>
          <input
            type="text"
            value={form.position}
            onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            required
          />
        </label>
        <label>
          Loại <span className={styles.jobCreatePage__required}>*</span>
          <select
            value={form.jobType}
            onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))}
            required
          >
            <option value="">Chọn loại</option>
            {JOB_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trạng thái
          <select
            value={form.jobStatus}
            onChange={(e) => setForm((f) => ({ ...f, jobStatus: e.target.value }))}
          >
            {JOB_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
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
        <label className={styles.jobCreatePage__checkboxLabel}>
          <input
            type="checkbox"
            checked={form.isRemote}
            onChange={(e) => setForm((f) => ({ ...f, isRemote: e.target.checked }))}
          />
          Remote
        </label>
        <div>
          <div>Skills (chọn nhiều)</div>
          <div className={styles.jobCreatePage__selectedSkills}>
            {selectedSkills.length === 0 ? (
              <span className={styles.jobCreatePage__selectedSkillsEmpty}>Chưa chọn skill nào</span>
            ) : (
              selectedSkills.map((s) => (
                <div key={s.skillId} className={styles.jobCreatePage__selectedSkillRow}>
                  <span className={styles.jobCreatePage__selectedSkillName}>{s.name}</span>
                  <label className={styles.jobCreatePage__selectedSkillOption}>
                    <input
                      type="checkbox"
                      checked={s.isRequired}
                      onChange={(e) => updateSkillOption(s.skillId, 'isRequired', e.target.checked)}
                    />
                    Bắt buộc
                  </label>
                  <select
                    className={styles.jobCreatePage__selectedSkillLevel}
                    value={s.proficiencyLevel || 'INTERMEDIATE'}
                    onChange={(e) => updateSkillOption(s.skillId, 'proficiencyLevel', e.target.value)}
                  >
                    {PROFICIENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.jobCreatePage__selectedSkillTagRemove}
                    onClick={() => removeSkill(s.skillId)}
                    title="Bỏ skill này"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          <div className={styles.jobCreatePage__skillSearchSection}>
            <div className={styles.jobCreatePage__skillSearchRow}>
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Tìm và thêm skill theo tên..."
                className={styles.jobCreatePage__skillSearchInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (suggestionSkills.length > 0) {
                      addSkill(suggestionSkills[0]);
                      setSkillSearch('');
                    }
                  }
                }}
              />
            </div>
            <div className={styles.jobCreatePage__skillSuggestionBox}>
              {suggestionSkills.length === 0 ? (
                <div className={styles.jobCreatePage__skillSearchEmpty}>
                  {skills.length === 0 ? 'Chưa có skill nào trong hệ thống' : 'Không tìm thấy skill phù hợp'}
                </div>
              ) : (
                <div className={styles.jobCreatePage__skillCheckboxes}>
                  {suggestionSkills.map((s) => (
                    <button
                      key={getSkillId(s)}
                      type="button"
                      className={styles.jobCreatePage__skillSuggestionItem}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addSkill(s);
                        setSkillSearch('');
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={styles.jobCreatePage__actions}>
          <button type="submit" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo tin tuyển dụng'}
          </button>
          <button type="button" onClick={() => navigate('/app/jobs')}>
            Hủy
          </button>
        </div>
      </form>
    </Drawer>
  );
}
