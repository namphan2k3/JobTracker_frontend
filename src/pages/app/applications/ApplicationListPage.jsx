import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApplications, updateApplicationStatus } from '../../../api/applications';
import { createInterview } from '../../../api/interviews';
import { usePermissions } from '../../../hooks/usePermissions';
import { getApplicationStatuses } from '../../../api/applicationStatuses';
import { getJobs } from '../../../api/jobs';
import { getUsers } from '../../../api/adminUsers';
import { Modal } from '../../../components/Modal';
import { getEmailTemplates, updateEmailTemplate } from '../../../api/emailTemplates';
import styles from '../../../styles/components/ApplicationListPage.module.css';

const STATUS_ORDER = {
  APPLIED: 1,
  SCREENING: 2,
  INTERVIEW: 3,
  OFFER: 4,
  HIRED: 5,
  REJECTED: 99,
};

const PIPELINE_SEQUENCE = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];
const PIPELINE_COLUMNS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

const ALLOWED_TRANSITIONS = {
  APPLIED: ['SCREENING'],
  SCREENING: ['INTERVIEW'],
  INTERVIEW: ['OFFER'],
  OFFER: ['HIRED'],
};

const EMAIL_CODES_BY_STATUS_TYPE = {
  OFFER: ['MANUAL_OFFER'],
  OFFERED: ['MANUAL_OFFER'],
  HIRED: ['CANDIDATE_HIRED'],
  REJECTED: ['CANDIDATE_REJECTED'],
};

const getStatusType = (status) =>
  (status?.statusType || status?.status_type || status?.name || '').toUpperCase();

const getStatusEntityForApp = (app, allStatuses) => {
  if (!app || !allStatuses?.length) return null;
  const statusId = app.statusId || app.status?.id;
  if (!statusId) return null;
  return allStatuses.find((s) => s.id === statusId) || null;
};

const getStatusTypeForApp = (app, allStatuses) => {
  const fromStatuses = getStatusType(getStatusEntityForApp(app, allStatuses));
  if (fromStatuses) return fromStatuses;
  // Fallback: dùng trực tiếp status gắn trên application (trường hợp không load được pipeline)
  return getStatusType(app.status);
};

const findNextStatusForApp = (app, allStatuses) => {
  const currentStatus = getStatusEntityForApp(app, allStatuses);
  const currentType = getStatusType(currentStatus);
  if (!currentType) return null;
  if (currentType === 'HIRED' || currentType === 'REJECTED') return null;

  const idx = PIPELINE_SEQUENCE.indexOf(currentType);
  if (idx === -1 || idx === PIPELINE_SEQUENCE.length - 1) return null;

  const nextType = PIPELINE_SEQUENCE[idx + 1];
  const candidates = allStatuses.filter(
    (s) => getStatusType(s) === nextType && (s.isActive !== false) && !s.deletedAt
  );
  if (candidates.length === 0) return null;
  return candidates.sort(
    (a, b) => (a.sortOrder ?? STATUS_ORDER[nextType] ?? 0) - (b.sortOrder ?? STATUS_ORDER[nextType] ?? 0)
  )[0];
};

export function ApplicationListPage() {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [scheduleInterviewApp, setScheduleInterviewApp] = useState(null);
  const [scheduleInterviewLoading, setScheduleInterviewLoading] = useState(false);
  const [scheduleInterviewForm, setScheduleInterviewForm] = useState({
    scheduledDate: '',
    durationMinutes: 60,
    interviewerIds: [],
    primaryInterviewerId: '',
    location: '',
    meetingLink: '',
    notes: '',
    sendEmail: false,
    customMessage: '',
  });
  const [statusModalApp, setStatusModalApp] = useState(null);
  const [statusModalStatus, setStatusModalStatus] = useState(null);
  const [statusModalLoading, setStatusModalLoading] = useState(false);
  const [statusModalForm, setStatusModalForm] = useState({
    notes: '',
    sendEmail: false,
    offer_salary: '',
    offer_start_date: '',
    offer_expire_date: '',
    offer_custom_message: '',
    hired_custom_message: '',
    reject_custom_message: '',
  });
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'pipeline'
  const [rejectingApp, setRejectingApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bulkRejectSendEmail, setBulkRejectSendEmail] = useState(false);
  const [bulkRejectCustomMessage, setBulkRejectCustomMessage] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    jobId: '',
    assignedTo: '',
    page: 0,
    size: 20,
  });
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [emailTemplatesLoading, setEmailTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    setEmailTemplatesLoading(true);
    Promise.all([
      getApplicationStatuses(),
      getJobs({ size: 100 }),
      getUsers({ size: 100 }),
      getEmailTemplates(),
    ])
      .then(([statusList, { jobs: jobList }, { users: userList }, templates]) => {
        setStatuses(statusList);
        setJobs(jobList);
        setUsers(userList);
        setEmailTemplates(templates);
      })
      .catch(() => {})
      .finally(() => setEmailTemplatesLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {
      page: filters.page,
      size: filters.size,
      search: filters.search || undefined,
      status: filters.status || undefined,
      jobId: filters.jobId || undefined,
      assignedTo: filters.assignedTo || undefined,
    };
    getApplications(params)
      .then(({ applications: list, pagination: p }) => {
        setApplications(list);
        setPagination(p);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách thất bại');
      })
      .finally(() => setLoading(false));
  }, [filters.page, filters.search, filters.status, filters.jobId, filters.assignedTo]);

  const canQuickUpdate = hasPermission('APPLICATION_UPDATE');

  const reloadApplications = async () => {
      const params = {
        page: filters.page,
        size: filters.size,
        search: filters.search || undefined,
        status: filters.status || undefined,
        jobId: filters.jobId || undefined,
        assignedTo: filters.assignedTo || undefined,
      };
      const { applications: list, pagination: p } = await getApplications(params);
      setApplications(list);
      setPagination(p);
  };

  const handleQuickStatusChange = async (applicationId, nextStatusId, notes) => {
    if (!canQuickUpdate || !nextStatusId) return;
    setError('');
    setUpdatingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, { statusId: nextStatusId, notes });
      await reloadApplications();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Đổi trạng thái thất bại');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 0 }));
  };

  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const interviewStatus =
    statuses.find(
      (s) => getStatusType(s) === 'INTERVIEW' && (s.isActive !== false) && !s.deletedAt
    ) || null;

  const offerStatus =
    statuses.find(
      (s) => getStatusType(s) === 'OFFER' && (s.isActive !== false) && !s.deletedAt
    ) || null;

  const hiredStatus =
    statuses.find(
      (s) => getStatusType(s) === 'HIRED' && (s.isActive !== false) && !s.deletedAt
    ) || null;

  const rejectStatus =
    statuses.find(
      (s) =>
        getStatusType(s) === 'REJECTED' && (s.isActive !== false) && !s.deletedAt
    ) || null;

  const handleOpenReject = (app) => {
    if (!rejectStatus || !canQuickUpdate) return;
    setRejectingApp(app);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingApp || !rejectStatus) return;
    await handleQuickStatusChange(
      rejectingApp.id,
      rejectStatus.id,
      rejectReason || undefined
    );
    setRejectingApp(null);
    setRejectReason('');
  };

  const handleCancelReject = () => {
    setRejectingApp(null);
    setRejectReason('');
  };

  const selectedApplications = applications.filter((app) => selectedIds.includes(app.id));

  const handleToggleSelectAll = () => {
    if (selectedApplications.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkReject = async () => {
    if (!rejectStatus || selectedApplications.length === 0) return;
    setError('');
    setBulkUpdating(true);
    try {
      const hasAskBeforeSend = Boolean(rejectStatus.askBeforeSend);
      const sendEmail = hasAskBeforeSend ? Boolean(bulkRejectSendEmail) : undefined;
      const customMessage = bulkRejectCustomMessage || undefined;
      for (const app of selectedApplications) {
        // eslint-disable-next-line no-await-in-loop
        await updateApplicationStatus(app.id, {
          statusId: rejectStatus.id,
          notes: rejectReason || undefined,
          customMessage,
          sendEmail,
        });
      }
      await reloadApplications();
      setSelectedIds([]);
      setRejectReason('');
      setBulkRejectSendEmail(false);
      setBulkRejectCustomMessage('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Từ chối hàng loạt thất bại');
    } finally {
      setBulkUpdating(false);
    }
  };

  const openStatusModal = (app, statusEntity) => {
    if (!statusEntity || !app) return;
    const type = getStatusType(statusEntity);
    const askBeforeSend = Boolean(statusEntity.askBeforeSend);
    const autoSendEmail = Boolean(statusEntity.autoSendEmail);
    setStatusModalApp(app);
    setStatusModalStatus(statusEntity);
    setStatusModalForm({
      notes: '',
      sendEmail: askBeforeSend && !autoSendEmail ? false : false,
      offer_salary: '',
      offer_start_date: '',
      offer_expire_date: '',
      offer_custom_message: '',
      hired_custom_message: '',
      reject_custom_message: '',
    });
    // Pre-select template cho Offer/Hired/Reject nếu có
    const codes = EMAIL_CODES_BY_STATUS_TYPE[type] || [];
    if (codes.length && emailTemplates.length) {
      const templates = emailTemplates.filter((t) => codes.includes(t.code));
      const active = templates.find((t) => t.isActive !== false) || templates[0];
      if (active) {
        setSelectedTemplateId(active.id);
      }
    }
  };

  const handleSubmitStatusModal = async (e) => {
    e.preventDefault();
    if (!statusModalApp || !statusModalStatus) return;
    setError('');
    setStatusModalLoading(true);
    try {
      const statusType = getStatusType(statusModalStatus);
      const isOffer = statusType === 'OFFER' || statusType === 'OFFERED';
      const isHired = statusType === 'HIRED';
      const isReject = statusType === 'REJECTED';
      const hasAskBeforeSend = Boolean(statusModalStatus.askBeforeSend);
      const sendEmailExplicitChoice = hasAskBeforeSend ? Boolean(statusModalForm.sendEmail) : false;
      const sendEmail = hasAskBeforeSend ? sendEmailExplicitChoice : undefined;
      const toLocalDateTimeIso = (dateOnly) => {
        if (!dateOnly) return undefined;
        return dateOnly.includes('T') ? dateOnly : `${dateOnly}T00:00:00`;
      };
      const offerRequest = isOffer
        ? {
            offerSalary: statusModalForm.offer_salary || undefined,
            offerStartDate: toLocalDateTimeIso(statusModalForm.offer_start_date),
            offerExpireDate: toLocalDateTimeIso(statusModalForm.offer_expire_date),
            customMessage: statusModalForm.offer_custom_message || undefined,
          }
        : undefined;
      const customMessage = isOffer
        ? statusModalForm.offer_custom_message || undefined
        : isReject
          ? statusModalForm.reject_custom_message || undefined
          : isHired
            ? statusModalForm.hired_custom_message || undefined
            : undefined;

      // Nếu gửi email và có mapping code → bật/tắt template theo lựa chọn
      const codes = EMAIL_CODES_BY_STATUS_TYPE[statusType] || [];
      if (sendEmail && codes.length && emailTemplates.length) {
        const relatedTemplates = emailTemplates.filter((t) => codes.includes(t.code));
        if (relatedTemplates.length) {
          const updates = relatedTemplates
            .map((t) => {
              const shouldBeActive = t.id === selectedTemplateId;
              const isActiveNow = t.isActive !== false;
              if (shouldBeActive === isActiveNow) return null;
              return updateEmailTemplate(t.id, { isActive: shouldBeActive });
            })
            .filter(Boolean);
          if (updates.length) {
            await Promise.all(updates);
            const fresh = await getEmailTemplates();
            setEmailTemplates(fresh);
          }
        }
      }

      await updateApplicationStatus(statusModalApp.id, {
        statusId: statusModalStatus.id,
        notes: statusModalForm.notes || undefined,
        customMessage,
        offerRequest,
        sendEmail,
      });
      await reloadApplications();
      setStatusModalApp(null);
      setStatusModalStatus(null);
      setStatusModalForm({
        notes: '',
        sendEmail: false,
        offer_salary: '',
        offer_start_date: '',
        offer_expire_date: '',
        offer_custom_message: '',
        hired_custom_message: '',
        reject_custom_message: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setStatusModalLoading(false);
    }
  };

  const toggleScheduleInterviewer = (userId) => {
    setScheduleInterviewForm((f) => {
      const exists = f.interviewerIds.includes(userId);
      const interviewerIds = exists
        ? f.interviewerIds.filter((idVal) => idVal !== userId)
        : [...f.interviewerIds, userId];
      let primaryInterviewerId = f.primaryInterviewerId;
      if (!interviewerIds.includes(primaryInterviewerId)) {
        primaryInterviewerId = interviewerIds[0] || '';
      }
      return {
        ...f,
        interviewerIds,
        primaryInterviewerId,
      };
    });
  };

  const handleSubmitScheduleInterview = async (e) => {
    e.preventDefault();
    if (!scheduleInterviewApp) return;
    if (!scheduleInterviewForm.scheduledDate || !scheduleInterviewForm.interviewerIds.length) {
      setError('Vui lòng chọn ngày giờ và ít nhất 1 người phỏng vấn');
      return;
    }
    setError('');
    setScheduleInterviewLoading(true);
    try {
      const scheduledDate = scheduleInterviewForm.scheduledDate.includes('Z')
        ? scheduleInterviewForm.scheduledDate
        : new Date(scheduleInterviewForm.scheduledDate).toISOString();
      const durationMinutes = Number(scheduleInterviewForm.durationMinutes) || 60;
      const hasAskBeforeSend = Boolean(interviewStatus?.askBeforeSend);
      const sendEmail = hasAskBeforeSend ? Boolean(scheduleInterviewForm.sendEmail) : undefined;

      // Nếu gửi email mời phỏng vấn, kích hoạt template INTERVIEW_SCHEDULED theo lựa chọn
      if (sendEmail && emailTemplates.length) {
        const codes = ['INTERVIEW_SCHEDULED'];
        const relatedTemplates = emailTemplates.filter((t) => codes.includes(t.code));
        if (relatedTemplates.length) {
          const updates = relatedTemplates
            .map((t) => {
              const shouldBeActive = t.id === selectedTemplateId;
              const isActiveNow = t.isActive !== false;
              if (shouldBeActive === isActiveNow) return null;
              return updateEmailTemplate(t.id, { isActive: shouldBeActive });
            })
            .filter(Boolean);
          if (updates.length) {
            await Promise.all(updates);
            const fresh = await getEmailTemplates();
            setEmailTemplates(fresh);
          }
        }
      }

      await createInterview(scheduleInterviewApp.id, {
        roundNumber: 1,
        interviewType: 'TECHNICAL',
        scheduledDate,
        durationMinutes,
        interviewerIds: scheduleInterviewForm.interviewerIds,
        primaryInterviewerId:
          scheduleInterviewForm.primaryInterviewerId ||
          scheduleInterviewForm.interviewerIds[0] ||
          undefined,
        meetingLink: scheduleInterviewForm.meetingLink || undefined,
        location: scheduleInterviewForm.location || undefined,
        notes: scheduleInterviewForm.notes || undefined,
        customMessage: scheduleInterviewForm.customMessage || undefined,
        sendEmail,
      });
      await reloadApplications();
      setScheduleInterviewApp(null);
      setScheduleInterviewForm({
        scheduledDate: '',
        durationMinutes: 60,
        interviewerIds: [],
        primaryInterviewerId: '',
        location: '',
        meetingLink: '',
        notes: '',
        sendEmail: false,
        customMessage: '',
      });
    } catch (err) {
      setError(err.message || 'Tạo lịch phỏng vấn thất bại');
    } finally {
      setScheduleInterviewLoading(false);
    }
  };

  return (
    <div className={styles.applicationListPage}>
      <header className={styles.applicationListPage__header}>
        <h1 className={styles.applicationListPage__title}>Ứng tuyển</h1>
        <div className={styles.applicationListPage__headerActions}>
          <div className={styles.applicationListPage__viewToggle}>
            <button
              type="button"
              className={
                viewMode === 'table'
                  ? styles.applicationListPage__viewToggleBtnActive
                  : styles.applicationListPage__viewToggleBtn
              }
              onClick={() => setViewMode('table')}
            >
              Bảng
            </button>
            <button
              type="button"
              className={
                viewMode === 'pipeline'
                  ? styles.applicationListPage__viewToggleBtnActive
                  : styles.applicationListPage__viewToggleBtn
              }
              onClick={() => setViewMode('pipeline')}
            >
              Pipeline
            </button>
          </div>
          {hasPermission('APPLICATION_CREATE') && (
            <Link
              to="/app/applications/create"
              className={styles.applicationListPage__createLink}
            >
              Tạo ứng tuyển (HR)
            </Link>
          )}
        </div>
      </header>

      <form onSubmit={handleSearch} className={styles.applicationListPage__filterBar}>
        <input
          type="search"
          className={styles.applicationListPage__searchInput}
          placeholder="Tìm theo tên, email..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <select
          className={styles.applicationListPage__filterSelect}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 0 }))}
        >
          <option value="">Tất cả trạng thái</option>
          {statuses.map((s) => (
            <option key={s.id} value={getStatusType(s)}>
              {s.displayName || s.name}
            </option>
          ))}
        </select>
        <select
          className={styles.applicationListPage__filterSelect}
          value={filters.jobId}
          onChange={(e) => setFilters((f) => ({ ...f, jobId: e.target.value, page: 0 }))}
        >
          <option value="">Tất cả job</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <select
          className={styles.applicationListPage__filterSelect}
          value={filters.assignedTo}
          onChange={(e) => setFilters((f) => ({ ...f, assignedTo: e.target.value, page: 0 }))}
        >
          <option value="">Tất cả người phụ trách</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.applicationListPage__searchButton}>
          Tìm
        </button>
      </form>

      {error && (
        <div className={styles.applicationListPage__error} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.applicationListPage__loading}>Đang tải...</p>
      ) : (
        <>
          {viewMode === 'table' && (
            <>
              {selectedApplications.length > 0 && rejectStatus && canQuickUpdate && (
                <div className={styles.applicationListPage__bulkBar}>
                  <span>Đã chọn {selectedApplications.length} ứng viên</span>
                  <div className={styles.applicationListPage__bulkActions}>
                    <button
                      type="button"
                      className={styles.applicationListPage__quickStatusButtonDanger}
                      onClick={() => {
                        setRejectReason('');
                        setBulkRejectSendEmail(false);
                        setBulkRejectCustomMessage('');
                        setBulkRejectOpen(true);
                      }}
                    >
                      Từ chối các ứng viên đã chọn
                    </button>
                  </div>
                </div>
              )}
              <div className={styles.applicationListPage__tableWrap}>
                <table className={styles.applicationListPage__table}>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={
                            applications.length > 0 &&
                            selectedApplications.length === applications.length
                          }
                          onChange={handleToggleSelectAll}
                        />
                      </th>
                      <th>Ứng viên</th>
                      <th>Job</th>
                      <th>Trạng thái</th>
                      <th>Match</th>
                      <th>CV</th>
                      <th>Ngày ứng tuyển</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => {
                      const nextStatus = findNextStatusForApp(app, statuses);
                      const nextType = nextStatus ? getStatusType(nextStatus) : '';
                      let nextLabel = 'Sang trạng thái tiếp theo';
                      if (nextType === 'SCREENING') nextLabel = 'Đưa sang Screening';
                      else if (nextType === 'INTERVIEW') nextLabel = 'Đặt lịch phỏng vấn';
                      else if (nextType === 'OFFER') nextLabel = 'Sang Offer';
                      else if (nextType === 'HIRED') nextLabel = 'Đánh dấu Hired';
                      const isSelected = selectedIds.includes(app.id);
                      return (
                        <tr key={app.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(app.id)}
                            />
                          </td>
                          <td>
                            <div>{app.candidateName}</div>
                            <div className={styles.applicationListPage__email}>
                              {app.candidateEmail}
                            </div>
                          </td>
                          <td>
                            <Link
                              to={`/app/jobs/${app.jobId}`}
                              className={styles.applicationListPage__jobLink}
                            >
                              {app.jobTitle || jobMap[app.jobId]?.title || app.jobId}
                            </Link>
                          </td>
                          <td>
                            <span
                              className={styles.applicationListPage__statusBadge}
                              style={{
                                '--status-color': app.status?.color || '#6b7280',
                              }}
                            >
                              {app.status?.displayName || app.status?.name || '-'}
                            </span>
                          </td>
                          <td>{app.matchScore != null ? `${app.matchScore}%` : '-'}</td>
                          <td>
                            {app.resumeFilePath ? (
                              <a
                                href={
                                  app.resumeFilePath.startsWith('http')
                                    ? app.resumeFilePath
                                    : `${import.meta.env.VITE_API_BASE || '/api/v1'}${
                                        app.resumeFilePath.startsWith('/') ? '' : '/'
                                      }${app.resumeFilePath}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.applicationListPage__cvLink}
                              >
                                Xem CV
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{app.appliedDate || '-'}</td>
                          <td>
                            <Link
                              to={`/app/applications/${app.id}`}
                              className={styles.applicationListPage__detailLink}
                            >
                              Chi tiết
                            </Link>
                            {canQuickUpdate && nextStatus && nextType && nextType !== 'INTERVIEW' && nextType !== 'OFFER' && nextType !== 'HIRED' && (
                              <button
                                type="button"
                                className={styles.applicationListPage__quickStatusButton}
                                onClick={() => handleQuickStatusChange(app.id, nextStatus.id)}
                                disabled={updatingId === app.id}
                              >
                                {updatingId === app.id ? '...' : nextLabel}
                              </button>
                            )}
                          {canQuickUpdate && nextStatus && nextType === 'INTERVIEW' && (
                            <button
                              type="button"
                              className={styles.applicationListPage__quickStatusButton}
                              onClick={() => {
                                setScheduleInterviewForm((f) => ({
                                  ...f,
                                  sendEmail: Boolean(interviewStatus?.autoSendEmail),
                                }));
                                setScheduleInterviewApp(app);
                              }}
                              disabled={scheduleInterviewLoading}
                            >
                              Đặt lịch phỏng vấn
                            </button>
                          )}
                            {canQuickUpdate && nextStatus && nextType === 'OFFER' && (
                              <button
                                type="button"
                                className={styles.applicationListPage__quickStatusButton}
                                onClick={() => openStatusModal(app, nextStatus)}
                                disabled={updatingId === app.id}
                              >
                                Gửi Offer
                              </button>
                            )}
                            {canQuickUpdate && nextStatus && nextType === 'HIRED' && (
                              <button
                                type="button"
                                className={styles.applicationListPage__quickStatusButton}
                                onClick={() => openStatusModal(app, nextStatus)}
                                disabled={updatingId === app.id}
                              >
                                Đánh dấu Hired
                              </button>
                            )}
                            {canQuickUpdate && rejectStatus && (
                              <button
                                type="button"
                                className={styles.applicationListPage__quickStatusButtonDanger}
                                onClick={() => {
                                  if (rejectStatus.askBeforeSend) {
                                    openStatusModal(app, rejectStatus);
                                  } else {
                                    handleOpenReject(app);
                                  }
                                }}
                                disabled={updatingId === app.id}
                              >
                                Từ chối
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {viewMode === 'pipeline' && (
            <div className={styles.applicationListPage__pipelineWrap}>
              {PIPELINE_COLUMNS.map((type) => {
                const columnStatus =
                  statuses.find((s) => getStatusType(s) === type) || null;
                const columnApps = applications.filter(
                  (app) => getStatusTypeForApp(app, statuses) === type
                );
                const columnTitle =
                  columnStatus?.displayName || columnStatus?.name || type;
                const handleDropOnColumn = (event) => {
                  if (!columnStatus) return;
                  event.preventDefault();
                  const data = event.dataTransfer.getData('text/plain');
                  if (!data) return;
                  try {
                    const parsed = JSON.parse(data);
                    const appId = parsed.id;
                    if (!appId) return;
                    const app = applications.find((a) => a.id === appId);
                    const appStatusEntity = getStatusEntityForApp(app, statuses);
                    if (!app || !appStatusEntity || appStatusEntity.id === columnStatus.id) return;
                    const columnType = getStatusType(columnStatus);
                    const currentType = getStatusType(appStatusEntity);
                    const isTerminal = currentType === 'HIRED' || currentType === 'REJECTED';
                    if (isTerminal) return;

                    // REJECTED: nếu askBeforeSend → mở modal có email, còn lại dùng modal đơn giản
                    if (columnType === 'REJECTED') {
                      const rejectedStatus =
                        statuses.find(
                          (s) => getStatusType(s) === 'REJECTED' && (s.isActive !== false) && !s.deletedAt
                        ) || null;
                      if (rejectedStatus?.askBeforeSend) {
                        openStatusModal(app, rejectedStatus);
                      } else {
                        handleOpenReject(app);
                      }
                      return;
                    }

                    // INTERVIEW: mở form đặt lịch phỏng vấn ngay trên list
                    if (columnType === 'INTERVIEW') {
                      setScheduleInterviewApp(app);
                      return;
                    }

                    // OFFER: luôn mở modal để chọn template/email
                    if (columnType === 'OFFER') {
                      openStatusModal(app, offerStatus || columnStatus);
                      return;
                    }

                    // HIRED: luôn mở modal để chọn template/email
                    if (columnType === 'HIRED') {
                      openStatusModal(app, hiredStatus || columnStatus);
                      return;
                    }

                    // Các stage khác (APPLIED, SCREENING, HIRED...): chỉ cho phép nếu là bước kế tiếp theo ALLOWED_TRANSITIONS
                    const allowedNext = ALLOWED_TRANSITIONS[currentType] || [];
                    if (!allowedNext.includes(columnType)) {
                      return;
                    }

                    handleQuickStatusChange(appId, columnStatus.id);
                  } catch {
                    // ignore invalid data
                  }
                };

                return (
                  <div
                    key={type}
                    className={styles.applicationListPage__pipelineColumn}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropOnColumn}
                  >
                    <div className={styles.applicationListPage__pipelineColumnHeader}>
                      <span className={styles.applicationListPage__pipelineColumnTitle}>
                        {columnTitle}
                      </span>
                      <span className={styles.applicationListPage__pipelineColumnCount}>
                        {columnApps.length}
                      </span>
                    </div>
                    <div className={styles.applicationListPage__pipelineColumnBody}>
                      {columnApps.map((app) => {
                        const nextStatus = findNextStatusForApp(app, statuses);
                        const nextType = nextStatus
                          ? getStatusType(nextStatus)
                          : '';
                        let nextLabel = 'Next';
                        if (nextType === 'SCREENING') nextLabel = 'Screening';
                        else if (nextType === 'INTERVIEW') nextLabel = 'Đặt lịch phỏng vấn';
                        else if (nextType === 'OFFER') nextLabel = 'Offer';
                        else if (nextType === 'HIRED') nextLabel = 'Hired';

                        const handleDragStart = (event) => {
                          event.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({ id: app.id })
                          );
                          event.dataTransfer.effectAllowed = 'move';
                        };

                        return (
                          <div
                            key={app.id}
                            className={styles.applicationListPage__pipelineCard}
                            draggable={canQuickUpdate}
                            onDragStart={handleDragStart}
                          >
                            <div className={styles.applicationListPage__pipelineCardMain}>
                              <div className={styles.applicationListPage__pipelineCandidate}>
                                {app.candidateName}
                              </div>
                              <div className={styles.applicationListPage__pipelineJob}>
                                {app.jobTitle || jobMap[app.jobId]?.title || app.jobId}
                              </div>
                              <div className={styles.applicationListPage__pipelineMeta}>
                                <span>{app.matchScore != null ? `${app.matchScore}%` : '-'}</span>
                                <span>{app.assignedToName || '-'}</span>
                                <span>{app.appliedDate || '-'}</span>
                              </div>
                            </div>
                            <div className={styles.applicationListPage__pipelineActions}>
                              <Link
                                to={`/app/applications/${app.id}`}
                                className={styles.applicationListPage__detailLink}
                              >
                                Chi tiết
                              </Link>
                              {canQuickUpdate && nextStatus && nextType && nextType !== 'INTERVIEW' && nextType !== 'OFFER' && (
                                <button
                                  type="button"
                                  className={styles.applicationListPage__quickStatusButton}
                                  onClick={() =>
                                    handleQuickStatusChange(app.id, nextStatus.id)
                                  }
                                  disabled={updatingId === app.id}
                                >
                                  {updatingId === app.id ? '...' : nextLabel}
                                </button>
                              )}
                              {canQuickUpdate && nextStatus && nextType === 'INTERVIEW' && (
                                <button
                                  type="button"
                                  className={styles.applicationListPage__quickStatusButton}
                                  onClick={() => navigate(`/app/applications/${app.id}?action=schedule-interview`)}
                                  disabled={updatingId === app.id}
                                >
                                  Đặt lịch phỏng vấn
                                </button>
                              )}
                              {canQuickUpdate && nextStatus && nextType === 'OFFER' && (
                                <button
                                  type="button"
                                  className={styles.applicationListPage__quickStatusButton}
                                  onClick={() =>
                                    navigate(`/app/applications/${app.id}?action=send-offer`)
                                  }
                                  disabled={updatingId === app.id}
                                >
                                  Gửi Offer
                                </button>
                              )}
                              {canQuickUpdate && rejectStatus && (
                                <button
                                  type="button"
                                  className={styles.applicationListPage__quickStatusButtonDanger}
                                  onClick={() => {
                                    if (rejectStatus.askBeforeSend || rejectStatus.autoSendEmail) {
                                      navigate(
                                        `/app/applications/${app.id}?action=reject-candidate`
                                      );
                                    } else {
                                      handleOpenReject(app);
                                    }
                                  }}
                                  disabled={updatingId === app.id}
                                >
                                  Từ chối
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {columnApps.length === 0 && (
                        <div className={styles.applicationListPage__pipelineEmpty}>
                          Không có ứng viên
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.applicationListPage__pagination}>
              <button
                type="button"
                disabled={filters.page <= 0}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Trang trước
              </button>
              <span>
                Trang {filters.page + 1} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={filters.page >= pagination.totalPages - 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Trang sau
              </button>
            </div>
          )}

          {rejectingApp && rejectStatus && (
            <div className={styles.applicationListPage__modalBackdrop}>
              <div className={styles.applicationListPage__modal}>
                <h2 className={styles.applicationListPage__modalTitle}>
                  Từ chối ứng viên
                </h2>
                <p className={styles.applicationListPage__modalSubtitle}>
                  {rejectingApp.candidateName} –{' '}
                  {jobMap[rejectingApp.jobId]?.title || rejectingApp.jobId}
                </p>
                <label className={styles.applicationListPage__modalLabel}>
                  Lý do (ghi vào ghi chú status)
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className={styles.applicationListPage__modalTextarea}
                  />
                </label>
                <div className={styles.applicationListPage__modalActions}>
                  <button
                    type="button"
                    className={styles.applicationListPage__quickStatusButtonDanger}
                    onClick={handleConfirmReject}
                    disabled={updatingId === rejectingApp.id}
                  >
                    {updatingId === rejectingApp.id ? 'Đang cập nhật...' : 'Xác nhận từ chối'}
                  </button>
                  <button
                    type="button"
                    className={styles.applicationListPage__quickStatusButton}
                    onClick={handleCancelReject}
                    disabled={updatingId === rejectingApp.id}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {scheduleInterviewApp && (
            <Modal
              open={!!scheduleInterviewApp}
              onClose={() => {
                if (scheduleInterviewLoading) return;
                setScheduleInterviewApp(null);
                setScheduleInterviewForm({
                  scheduledDate: '',
                  durationMinutes: 60,
                  interviewerIds: [],
                  primaryInterviewerId: '',
                  location: '',
                  meetingLink: '',
                  notes: '',
                  sendEmail: false,
                  customMessage: '',
                });
              }}
              title="Đặt lịch phỏng vấn"
            >
              <form onSubmit={handleSubmitScheduleInterview} className={styles.applicationListPage__modalForm}>
                <p className={styles.applicationListPage__modalSubtitle}>
                  {scheduleInterviewApp.candidateName} –{' '}
                  {jobMap[scheduleInterviewApp.jobId]?.title || scheduleInterviewApp.jobId}
                </p>
                <label className={styles.applicationListPage__modalLabel}>
                  Ngày giờ
                  <input
                    type="datetime-local"
                    required
                    value={scheduleInterviewForm.scheduledDate}
                    onChange={(e) =>
                      setScheduleInterviewForm((f) => ({ ...f, scheduledDate: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.applicationListPage__modalLabel}>
                  Thời lượng (phút)
                  <input
                    type="number"
                    min={15}
                    value={scheduleInterviewForm.durationMinutes}
                    onChange={(e) =>
                      setScheduleInterviewForm((f) => ({ ...f, durationMinutes: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.applicationListPage__modalLabel}>
                  Người phỏng vấn (chọn ít nhất 1)
                  <div className={styles.applicationListPage__modalInterviewerList}>
                    {users.map((u) => (
                      <label key={u.id} className={styles.applicationListPage__checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={scheduleInterviewForm.interviewerIds.includes(u.id)}
                          onChange={() => toggleScheduleInterviewer(u.id)}
                        />
                        {u.firstName} {u.lastName}
                      </label>
                    ))}
                  </div>
                </label>
                <label className={styles.applicationListPage__modalLabel}>
                  Người phỏng vấn chính
                  <select
                    value={scheduleInterviewForm.primaryInterviewerId}
                    onChange={(e) =>
                      setScheduleInterviewForm((f) => ({
                        ...f,
                        primaryInterviewerId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Tự động (người đầu tiên)</option>
                    {users
                      .filter((u) => scheduleInterviewForm.interviewerIds.includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                  </select>
                </label>
                <label className={styles.applicationListPage__modalLabel}>
                  Meeting link
                  <input
                    type="url"
                    value={scheduleInterviewForm.meetingLink}
                    onChange={(e) =>
                      setScheduleInterviewForm((f) => ({ ...f, meetingLink: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.applicationListPage__modalLabel}>
                  Địa điểm
                  <input
                    type="text"
                    value={scheduleInterviewForm.location}
                    onChange={(e) =>
                      setScheduleInterviewForm((f) => ({ ...f, location: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.applicationListPage__modalLabel}>
                  Ghi chú
                  <textarea
                    rows={3}
                    value={scheduleInterviewForm.notes}
                    onChange={(e) =>
                      setScheduleInterviewForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    className={styles.applicationListPage__modalTextarea}
                  />
                </label>
                {interviewStatus &&
                  (interviewStatus.askBeforeSend && !interviewStatus.autoSendEmail ? (
                    <label className={styles.applicationListPage__checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={scheduleInterviewForm.sendEmail}
                        onChange={(e) =>
                          setScheduleInterviewForm((f) => ({
                            ...f,
                            sendEmail: e.target.checked,
                          }))
                        }
                      />
                      Gửi email mời phỏng vấn cho ứng viên
                    </label>
                  ) : interviewStatus.autoSendEmail ? (
                    <p className={styles.applicationListPage__modalHint}>
                      Email mời phỏng vấn sẽ được gửi tự động theo cấu hình status INTERVIEW.
                    </p>
                  ) : null)}
                {interviewStatus?.askBeforeSend && scheduleInterviewForm.sendEmail && (
                  <>
                    <p className={styles.applicationListPage__modalHint}>
                      Chọn template email dùng cho lịch phỏng vấn:
                    </p>
                    <div className={styles.applicationListPage__templatePills}>
                      {emailTemplates
                        .filter((t) => t.code === 'INTERVIEW_SCHEDULED')
                        .map((t) => (
                          <label
                            key={t.id}
                            className={
                              t.id === selectedTemplateId
                                ? styles.applicationListPage__templatePillActive
                                : styles.applicationListPage__templatePill
                            }
                          >
                            <input
                              type="radio"
                              name="interview-email-template-list"
                              checked={t.id === selectedTemplateId}
                              onChange={() => setSelectedTemplateId(t.id)}
                              disabled={emailTemplatesLoading}
                            />
                            <span className={styles.applicationListPage__templatePillCode}>
                              {t.code}
                            </span>
                            <span className={styles.applicationListPage__templatePillLabel}>
                              {t.name}
                            </span>
                          </label>
                        ))}
                    </div>
                    <label className={styles.applicationListPage__modalLabel}>
                      Tin nhắn thêm (sẽ chèn vào email với biến custom_message)
                      <textarea
                        rows={3}
                        value={scheduleInterviewForm.customMessage}
                        onChange={(e) =>
                          setScheduleInterviewForm((f) => ({
                            ...f,
                            customMessage: e.target.value,
                          }))
                        }
                        className={styles.applicationListPage__modalTextarea}
                      />
                    </label>
                  </>
                )}
                <div className={styles.applicationListPage__modalActions}>
                  <button
                    type="submit"
                    className={styles.applicationListPage__quickStatusButton}
                    disabled={scheduleInterviewLoading}
                  >
                    {scheduleInterviewLoading ? 'Đang tạo lịch...' : 'Đặt lịch phỏng vấn'}
                  </button>
                  <button
                    type="button"
                    className={styles.applicationListPage__quickStatusButton}
                    onClick={() => {
                      if (scheduleInterviewLoading) return;
                      setScheduleInterviewApp(null);
                      setScheduleInterviewForm({
                        scheduledDate: '',
                        durationMinutes: 60,
                        interviewerIds: [],
                        primaryInterviewerId: '',
                        location: '',
                        meetingLink: '',
                        notes: '',
                      });
                    }}
                    disabled={scheduleInterviewLoading}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {statusModalApp && statusModalStatus && (
            <Modal
              open={!!statusModalApp}
              onClose={() => {
                if (statusModalLoading) return;
                setStatusModalApp(null);
                setStatusModalStatus(null);
                setStatusModalForm({
                  notes: '',
                  sendEmail: false,
                  offer_salary: '',
                  offer_start_date: '',
                  offer_expire_date: '',
                  offer_custom_message: '',
                  hired_custom_message: '',
                  reject_custom_message: '',
                });
              }}
              title={
                getStatusType(statusModalStatus) === 'OFFER'
                  ? 'Gửi Offer cho ứng viên'
                  : getStatusType(statusModalStatus) === 'HIRED'
                    ? 'Đánh dấu trúng tuyển'
                    : 'Từ chối ứng viên'
              }
            >
              <form
                onSubmit={handleSubmitStatusModal}
                className={styles.applicationListPage__modalForm}
              >
                <p className={styles.applicationListPage__modalSubtitle}>
                  {statusModalApp.candidateName} –{' '}
                  {jobMap[statusModalApp.jobId]?.title || statusModalApp.jobId}
                </p>
                <label className={styles.applicationListPage__modalLabel}>
                  Ghi chú (ghi vào ghi chú status)
                  <input
                    type="text"
                    value={statusModalForm.notes}
                    onChange={(e) =>
                      setStatusModalForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </label>
                {(() => {
                  const type = getStatusType(statusModalStatus);
                  const askBeforeSend = Boolean(statusModalStatus.askBeforeSend);
                  const autoSend = Boolean(statusModalStatus.autoSendEmail);
                  const isOffer = type === 'OFFER' || type === 'OFFERED';
                  const isHired = type === 'HIRED';
                  const isReject = type === 'REJECTED';

                  return (
                    <>
                      {isOffer && (
                        <>
                          {askBeforeSend && !autoSend && (
                            <label className={styles.applicationListPage__checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={statusModalForm.sendEmail}
                                onChange={(e) =>
                                  setStatusModalForm((f) => ({
                                    ...f,
                                    sendEmail: e.target.checked,
                                  }))
                                }
                              />
                              Gửi email Offer kèm theo
                            </label>
                          )}
                          {(!askBeforeSend && autoSend) && (
                            <p className={styles.applicationListPage__modalHint}>
                              Email Offer sẽ được gửi tự động theo cấu hình status.
                            </p>
                          )}
                          {(!askBeforeSend && autoSend) || statusModalForm.sendEmail ? (
                            <>
                              <p className={styles.applicationListPage__modalHint}>
                                Chọn template email sẽ dùng cho Offer:
                              </p>
                              <div className={styles.applicationListPage__templatePills}>
                                {emailTemplates
                                  .filter((t) => (EMAIL_CODES_BY_STATUS_TYPE[type] || []).includes(t.code))
                                  .map((t) => (
                                    <label
                                      key={t.id}
                                      className={
                                        t.id === selectedTemplateId
                                          ? styles.applicationListPage__templatePillActive
                                          : styles.applicationListPage__templatePill
                                      }
                                    >
                                      <input
                                        type="radio"
                                        name="offer-email-template-list"
                                        checked={t.id === selectedTemplateId}
                                        onChange={() => setSelectedTemplateId(t.id)}
                                        disabled={emailTemplatesLoading}
                                      />
                                      <span className={styles.applicationListPage__templatePillCode}>
                                        {t.code}
                                      </span>
                                      <span className={styles.applicationListPage__templatePillLabel}>
                                        {t.name}
                                      </span>
                                    </label>
                                  ))}
                              </div>
                              <div className={styles.applicationListPage__modalForm}>
                                <label className={styles.applicationListPage__modalLabel}>
                                  Mức lương / thông tin (offer_salary)
                                  <input
                                    type="text"
                                    placeholder="VD: 25–30 triệu"
                                    value={statusModalForm.offer_salary}
                                    onChange={(e) =>
                                      setStatusModalForm((f) => ({
                                        ...f,
                                        offer_salary: e.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <label className={styles.applicationListPage__modalLabel}>
                                  Ngày bắt đầu (offer_start_date)
                                  <input
                                    type="date"
                                    value={statusModalForm.offer_start_date}
                                    onChange={(e) =>
                                      setStatusModalForm((f) => ({
                                        ...f,
                                        offer_start_date: e.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <label className={styles.applicationListPage__modalLabel}>
                                  Hạn phản hồi (offer_expire_date)
                                  <input
                                    type="date"
                                    value={statusModalForm.offer_expire_date}
                                    onChange={(e) =>
                                      setStatusModalForm((f) => ({
                                        ...f,
                                        offer_expire_date: e.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <label className={styles.applicationListPage__modalLabel}>
                                  Tin nhắn thêm (custom_message)
                                  <textarea
                                    rows={2}
                                    placeholder="Tùy chọn"
                                    value={statusModalForm.offer_custom_message}
                                    onChange={(e) =>
                                      setStatusModalForm((f) => ({
                                        ...f,
                                        offer_custom_message: e.target.value,
                                      }))
                                    }
                                    className={styles.applicationListPage__modalTextarea}
                                  />
                                </label>
                              </div>
                            </>
                          ) : null}
                        </>
                      )}
                      {isHired && (
                        <>
                          {askBeforeSend && !autoSend && (
                            <label className={styles.applicationListPage__checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={statusModalForm.sendEmail}
                                onChange={(e) =>
                                  setStatusModalForm((f) => ({
                                    ...f,
                                    sendEmail: e.target.checked,
                                  }))
                                }
                              />
                              Gửi email thông báo trúng tuyển kèm theo
                            </label>
                          )}
                          {(!askBeforeSend && autoSend) && (
                            <p className={styles.applicationListPage__modalHint}>
                              Email trúng tuyển sẽ được gửi tự động theo cấu hình status.
                            </p>
                          )}
                          {statusModalForm.sendEmail && (
                            <>
                              <p className={styles.applicationListPage__modalHint}>
                                Chọn template email sẽ dùng cho trúng tuyển:
                              </p>
                              <div className={styles.applicationListPage__templatePills}>
                                {emailTemplates
                                  .filter((t) => (EMAIL_CODES_BY_STATUS_TYPE[type] || []).includes(t.code))
                                  .map((t) => (
                                    <label
                                      key={t.id}
                                      className={
                                        t.id === selectedTemplateId
                                          ? styles.applicationListPage__templatePillActive
                                          : styles.applicationListPage__templatePill
                                      }
                                    >
                                      <input
                                        type="radio"
                                        name="hired-email-template-list"
                                        checked={t.id === selectedTemplateId}
                                        onChange={() => setSelectedTemplateId(t.id)}
                                        disabled={emailTemplatesLoading}
                                      />
                                      <span className={styles.applicationListPage__templatePillCode}>
                                        {t.code}
                                      </span>
                                      <span className={styles.applicationListPage__templatePillLabel}>
                                        {t.name}
                                      </span>
                                    </label>
                                  ))}
                              </div>
                              <label className={styles.applicationListPage__modalLabel}>
                                Tin nhắn thêm (customMessage)
                                <textarea
                                  rows={3}
                                  placeholder="Tùy chọn"
                                  value={statusModalForm.hired_custom_message}
                                  onChange={(e) =>
                                    setStatusModalForm((f) => ({
                                      ...f,
                                      hired_custom_message: e.target.value,
                                    }))
                                  }
                                  className={styles.applicationListPage__modalTextarea}
                                />
                              </label>
                            </>
                          )}
                        </>
                      )}
                      {isReject && (
                        <>
                          {askBeforeSend && !autoSend && (
                            <label className={styles.applicationListPage__checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={statusModalForm.sendEmail}
                                onChange={(e) =>
                                  setStatusModalForm((f) => ({
                                    ...f,
                                    sendEmail: e.target.checked,
                                  }))
                                }
                              />
                              Gửi email từ chối kèm theo
                            </label>
                          )}
                          {(!askBeforeSend && autoSend) && (
                            <p className={styles.applicationListPage__modalHint}>
                              Email từ chối sẽ được gửi tự động theo cấu hình status.
                            </p>
                          )}
                          {statusModalForm.sendEmail && (
                            <>
                              <p className={styles.applicationListPage__modalHint}>
                                Chọn template email sẽ dùng cho từ chối:
                              </p>
                              <div className={styles.applicationListPage__templatePills}>
                                {emailTemplates
                                  .filter((t) => (EMAIL_CODES_BY_STATUS_TYPE[type] || []).includes(t.code))
                                  .map((t) => (
                                    <label
                                      key={t.id}
                                      className={
                                        t.id === selectedTemplateId
                                          ? styles.applicationListPage__templatePillActive
                                          : styles.applicationListPage__templatePill
                                      }
                                    >
                                      <input
                                        type="radio"
                                        name="reject-email-template-list"
                                        checked={t.id === selectedTemplateId}
                                        onChange={() => setSelectedTemplateId(t.id)}
                                        disabled={emailTemplatesLoading}
                                      />
                                      <span className={styles.applicationListPage__templatePillCode}>
                                        {t.code}
                                      </span>
                                      <span className={styles.applicationListPage__templatePillLabel}>
                                        {t.name}
                                      </span>
                                    </label>
                                  ))}
                              </div>
                              <label className={styles.applicationListPage__modalLabel}>
                                Nội dung (custom_message)
                                <textarea
                                  rows={3}
                                  placeholder="Tùy chọn"
                                  value={statusModalForm.reject_custom_message}
                                  onChange={(e) =>
                                    setStatusModalForm((f) => ({
                                      ...f,
                                      reject_custom_message: e.target.value,
                                    }))
                                  }
                                  className={styles.applicationListPage__modalTextarea}
                                />
                              </label>
                            </>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
                <div className={styles.applicationListPage__modalActions}>
                  <button
                    type="submit"
                    className={styles.applicationListPage__quickStatusButton}
                    disabled={statusModalLoading}
                  >
                    {statusModalLoading ? 'Đang cập nhật...' : 'Xác nhận'}
                  </button>
                  <button
                    type="button"
                    className={styles.applicationListPage__quickStatusButton}
                    onClick={() => {
                      if (statusModalLoading) return;
                      setStatusModalApp(null);
                      setStatusModalStatus(null);
                      setStatusModalForm({
                        notes: '',
                        sendEmail: false,
                        offer_salary: '',
                        offer_start_date: '',
                        offer_expire_date: '',
                        offer_custom_message: '',
                        hired_custom_message: '',
                        reject_custom_message: '',
                      });
                    }}
                    disabled={statusModalLoading}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </Modal>
          )}
          {bulkRejectOpen && rejectStatus && selectedApplications.length > 0 && (
            <div className={styles.applicationListPage__modalBackdrop}>
              <div className={styles.applicationListPage__modal}>
                <h2 className={styles.applicationListPage__modalTitle}>
                  Từ chối {selectedApplications.length} ứng viên
                </h2>
                <p className={styles.applicationListPage__modalSubtitle}>
                  Các ứng viên sau sẽ được chuyển sang trạng thái{' '}
                  {rejectStatus.displayName || rejectStatus.name}.
                </p>
                <div className={styles.applicationListPage__modalList}>
                  {selectedApplications.map((app) => (
                    <div key={app.id} className={styles.applicationListPage__modalListItem}>
                      <span>{app.candidateName}</span>
                      <span className={styles.applicationListPage__modalListJob}>
                        {jobMap[app.jobId]?.title || app.jobId}
                      </span>
                    </div>
                  ))}
                </div>
                <label className={styles.applicationListPage__modalLabel}>
                  Lý do chung (ghi vào ghi chú status)
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className={styles.applicationListPage__modalTextarea}
                    placeholder="Ví dụ: Không phù hợp yêu cầu kỹ năng hoặc kinh nghiệm cho vị trí này."
                  />
                </label>
                {rejectStatus.askBeforeSend && !rejectStatus.autoSendEmail && (
                  <label className={styles.applicationListPage__checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={bulkRejectSendEmail}
                      onChange={(e) => setBulkRejectSendEmail(e.target.checked)}
                    />
                    Gửi email từ chối kèm theo cho tất cả ứng viên
                  </label>
                )}
                {!rejectStatus.askBeforeSend && rejectStatus.autoSendEmail && (
                  <p className={styles.applicationListPage__modalHint}>
                    Email từ chối sẽ được gửi tự động theo cấu hình status REJECTED.
                  </p>
                )}
                {rejectStatus.askBeforeSend && bulkRejectSendEmail && (
                  <label className={styles.applicationListPage__modalLabel}>
                    Nội dung chung (custom_message)
                    <textarea
                      rows={3}
                      placeholder="Tùy chọn"
                      value={bulkRejectCustomMessage}
                      onChange={(e) => setBulkRejectCustomMessage(e.target.value)}
                      className={styles.applicationListPage__modalTextarea}
                    />
                  </label>
                )}
                <div className={styles.applicationListPage__modalActions}>
                  <button
                    type="button"
                    className={styles.applicationListPage__quickStatusButtonDanger}
                    onClick={async () => {
                      await handleConfirmBulkReject();
                      setBulkRejectOpen(false);
                    }}
                    disabled={bulkUpdating}
                  >
                    {bulkUpdating
                      ? 'Đang từ chối...'
                      : `Xác nhận từ chối ${selectedApplications.length} ứng viên`}
                  </button>
                  <button
                    type="button"
                    className={styles.applicationListPage__quickStatusButton}
                    onClick={() => setBulkRejectOpen(false)}
                    disabled={bulkUpdating}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
