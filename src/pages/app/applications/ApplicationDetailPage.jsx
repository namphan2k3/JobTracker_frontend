import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  assignApplication,
  getApplicationStatusHistory,
  deleteApplication,
} from '../../../api/applications';
import {
  getApplicationComments,
  createComment,
  updateComment,
  deleteComment,
} from '../../../api/comments';
import {
  getApplicationInterviews,
  createInterview,
} from '../../../api/interviews';
import {
  getApplicationAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
} from '../../../api/attachments';
import { getEmailTemplates, getEmailTemplateById, updateEmailTemplate } from '../../../api/emailTemplates';
import { sendApplicationEmail, getApplicationEmailPreview } from '../../../api/applications';
import { getApplicationStatuses } from '../../../api/applicationStatuses';
import { getUsers } from '../../../api/adminUsers';
import { useAuthStore } from '../../../store/authStore';
import { usePermissions } from '../../../hooks/usePermissions';
import { Drawer } from '../../../components/Drawer';
import { ConfirmModal } from '../../../components/ConfirmModal';
import styles from '../../../styles/components/ApplicationDetailPage.module.css';

const STATUS_ORDER = {
  APPLIED: 1,
  SCREENING: 2,
  INTERVIEW: 3,
  OFFER: 4,
  HIRED: 5,
  REJECTED: 99,
};

const getStatusType = (status) =>
  (status?.statusType || status?.status_type || status?.name || '').toUpperCase();

const EMAIL_CODES_BY_STATUS_TYPE = {
  // Khi gửi Offer từ màn đổi trạng thái
  OFFER: ['MANUAL_OFFER'],
  OFFERED: ['MANUAL_OFFER'],
  // Khi đánh dấu trúng tuyển
  HIRED: ['CANDIDATE_HIRED'],
  // Khi từ chối ứng viên
  REJECTED: ['CANDIDATE_REJECTED'],
};

export function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [app, setApp] = useState(null);
  const [history, setHistory] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [statusForm, setStatusForm] = useState({
    statusId: '',
    notes: '',
    sendOfferEmail: false,
    offer_salary: '',
    offer_start_date: '',
    offer_expire_date: '',
    offer_custom_message: '',
    sendHiredEmail: false,
    hired_custom_message: '',
    sendRejectEmail: false,
    reject_custom_message: '',
  });
  const [assignForm, setAssignForm] = useState({ assignedTo: '' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsPagination, setCommentsPagination] = useState(null);
  const [commentsPage, setCommentsPage] = useState(0);
  const commentsSize = 10;
  const [commentForm, setCommentForm] = useState({ commentText: '', isInternal: true });
  const [editingComment, setEditingComment] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    roundNumber: 1,
    interviewType: 'TECHNICAL',
    scheduledDate: '',
    durationMinutes: 60,
    interviewerIds: [],
    primaryInterviewerId: '',
    meetingLink: '',
    location: '',
    notes: '',
  });
  const [attachments, setAttachments] = useState([]);
  const [uploadForm, setUploadForm] = useState({ file: null, attachmentType: 'RESUME', description: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [offerEmailPreview, setOfferEmailPreview] = useState({ subject: '', body: '' });
  const [rejectEmailPreview, setRejectEmailPreview] = useState({ subject: '', body: '' });
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [emailTemplatesLoading, setEmailTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateDetail, setTemplateDetail] = useState(null);
  const [templateDetailLoading, setTemplateDetailLoading] = useState(false);
  const [interviewSendEmail, setInterviewSendEmail] = useState(false);
  const [interviewEmailMessage, setInterviewEmailMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, type: null, id: null });
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const { hasPermission } = usePermissions();

  const INTERVIEW_TYPES = [
    { value: 'PHONE', label: 'Điện thoại' },
    { value: 'VIDEO', label: 'Video' },
    { value: 'IN_PERSON', label: 'Trực tiếp' },
    { value: 'TECHNICAL', label: 'Kỹ thuật' },
    { value: 'HR', label: 'HR' },
    { value: 'FINAL', label: 'Vòng cuối' },
  ];

  const ATTACHMENT_TYPES = [
    { value: 'RESUME', label: 'CV / Resume' },
    { value: 'COVER_LETTER', label: 'Cover letter' },
    { value: 'CERTIFICATE', label: 'Chứng chỉ' },
    { value: 'PORTFOLIO', label: 'Portfolio' },
    { value: 'OTHER', label: 'Khác' },
  ];

  const currentStatusType = useMemo(() => getStatusType(app?.status), [app]);
  const isCurrentTerminal =
    currentStatusType === 'HIRED' || currentStatusType === 'REJECTED';

  const nextStatus = useMemo(() => {
    if (!app?.status || !statuses.length) return null;
    const currentType = currentStatusType;
    if (!currentType) return null;
    if (isCurrentTerminal) return null;
    const currentOrder = STATUS_ORDER[currentType] ?? 0;
    const candidates = statuses.filter((s) => {
      const type = getStatusType(s);
      const order = STATUS_ORDER[type] ?? 0;
      return (
        order > currentOrder &&
        order < STATUS_ORDER.REJECTED &&
        (s.isActive !== false) &&
        !s.deletedAt
      );
    });
    if (!candidates.length) return null;
    return candidates.sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    )[0];
  }, [app, statuses, currentStatusType, isCurrentTerminal]);

  const rejectStatus = useMemo(
    () =>
      statuses.find(
        (s) => getStatusType(s) === 'REJECTED' && (s.isActive !== false) && !s.deletedAt
      ) || null,
    [statuses]
  );

  const hiredStatus = useMemo(
    () =>
      statuses.find(
        (s) => getStatusType(s) === 'HIRED' && (s.isActive !== false) && !s.deletedAt
      ) || null,
    [statuses]
  );

  useEffect(() => {
    getApplicationById(id)
      .then(setApp)
      .catch((err) => setError(err.response?.data?.message || err.message || 'Tải thất bại'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (!action || !id) return;

    if (action === 'schedule-interview' && hasPermission('INTERVIEW_CREATE')) {
      setInterviewModalOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!hasPermission('APPLICATION_UPDATE') || !statuses.length) return;

    if (action === 'send-offer' || action === 'reject-candidate') {
      const targetType = action === 'send-offer' ? 'OFFER' : 'REJECTED';
      const targetStatus =
        statuses.find(
          (s) => getStatusType(s) === targetType && (s.isActive !== false) && !s.deletedAt
        ) || null;
      if (!targetStatus) return;

      setStatusForm((f) => ({
        ...f,
        statusId: targetStatus.id,
        sendOfferEmail:
          action === 'send-offer' ? Boolean(targetStatus.autoSendEmail) : f.sendOfferEmail,
        sendRejectEmail:
          action === 'reject-candidate'
            ? Boolean(targetStatus.autoSendEmail)
            : f.sendRejectEmail,
      }));

      const el = document.getElementById('application-status-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [id, searchParams, hasPermission, statuses]);

  useEffect(() => {
    if (app) {
      setForm({
        notes: app.notes || '',
        rating: app.rating ?? '',
        coverLetter: app.coverLetter || '',
        allowAdditionalUploads: app.allowAdditionalUploads ?? false,
      });
      setStatusForm((f) => ({ ...f, statusId: app.statusId || app.status?.id || '', notes: '' }));
      setAssignForm({ assignedTo: app.assignedTo || '' });
    }
  }, [app]);

  // Preview email cho OFFER / REJECT khi user bật checkbox gửi email và thay đổi variables
  useEffect(() => {
    const selectedStatus = statuses.find((s) => s.id === statusForm.statusId);
    const type = getStatusType(selectedStatus);
    const isOffer = type === 'OFFER' || type === 'OFFERED';
    const isReject = type === 'REJECTED';

    if ((!isOffer || !statusForm.sendOfferEmail) && (!isReject || !statusForm.sendRejectEmail)) {
      setOfferEmailPreview({ subject: '', body: '' });
      setRejectEmailPreview({ subject: '', body: '' });
      return;
    }

    let cancelled = false;
    setEmailPreviewLoading(true);

    const timer = setTimeout(() => {
      const run = async () => {
        try {
          if (isOffer && statusForm.sendOfferEmail) {
            const manualVariables = {
              offer_salary: statusForm.offer_salary || '',
              offer_start_date: statusForm.offer_start_date || '',
              offer_expire_date: statusForm.offer_expire_date || '',
              custom_message: statusForm.offer_custom_message || '',
            };
            const preview = await getApplicationEmailPreview(id, {
              emailType: 'OFFER_LETTER',
              manualVariables,
            });
            if (!cancelled) {
              setOfferEmailPreview({
                subject: preview.subject || '',
                body: preview.body || '',
              });
            }
          }
          if (isReject && statusForm.sendRejectEmail) {
            const manualVariables = {
              custom_message: statusForm.reject_custom_message || '',
            };
            const preview = await getApplicationEmailPreview(id, {
              emailType: 'REJECTION',
              manualVariables,
            });
            if (!cancelled) {
              setRejectEmailPreview({
                subject: preview.subject || '',
                body: preview.body || '',
              });
            }
          }
        } catch {
          if (!cancelled) {
            if (isOffer) setOfferEmailPreview({ subject: '', body: '' });
            if (isReject) setRejectEmailPreview({ subject: '', body: '' });
          }
        } finally {
          if (!cancelled) {
            setEmailPreviewLoading(false);
          }
        }
      };
      run();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    id,
    statuses,
    statusForm.statusId,
    statusForm.sendOfferEmail,
    statusForm.offer_salary,
    statusForm.offer_start_date,
    statusForm.offer_expire_date,
    statusForm.offer_custom_message,
    statusForm.sendRejectEmail,
    statusForm.reject_custom_message,
  ]);

  useEffect(() => {
    getApplicationStatuses().then(setStatuses).catch(() => {});
    getUsers({ size: 100 }).then(({ users: u }) => setUsers(u)).catch(() => {});
    setEmailTemplatesLoading(true);
    getEmailTemplates()
      .then(setEmailTemplates)
      .catch(() => {})
      .finally(() => setEmailTemplatesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplateDetail(null);
      return;
    }
    let cancelled = false;
    setTemplateDetailLoading(true);
    getEmailTemplateById(selectedTemplateId)
      .then((detail) => { if (!cancelled) setTemplateDetail(detail); })
      .catch(() => { if (!cancelled) setTemplateDetail(null); })
      .finally(() => { if (!cancelled) setTemplateDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTemplateId]);

  useEffect(() => {
    if (id) {
      getApplicationStatusHistory(id)
        .then(setHistory)
        .catch(() => {});
    }
  }, [id]);

  const fetchComments = (page = 0) => {
    if (!id) return Promise.resolve();
    return getApplicationComments(id, { sort: 'createdAt,desc', page, size: commentsSize })
      .then(({ comments: c, pagination: p }) => {
        setComments(c);
        setCommentsPagination(p);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (id) {
      setCommentsPage(0);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchComments(commentsPage);
    }
  }, [id, commentsPage]);

  useEffect(() => {
    if (id) {
      getApplicationInterviews(id)
        .then(setInterviews)
        .catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (id) {
      getApplicationAttachments(id)
        .then(setAttachments)
        .catch(() => {});
    }
  }, [id]);

  const handleUpdate = (e) => {
    e.preventDefault();
    setError('');
    updateApplication(id, {
      notes: form.notes || undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      coverLetter: form.coverLetter || undefined,
      allowAdditionalUploads: form.allowAdditionalUploads,
    })
      .then((updated) => {
        setApp((prev) => ({ ...prev, ...updated }));
        setEditModalOpen(false);
      })
      .catch((err) => setError(err.response?.data?.message || err.message || 'Cập nhật thất bại'));
  };

  const handleStatusChange = (e) => {
    e.preventDefault();
    if (!statusForm.statusId) return;
    setError('');
    const selectedStatus = statuses.find((s) => s.id === statusForm.statusId);
    const statusType = getStatusType(selectedStatus);

    // Nếu chọn chuyển sang INTERVIEW thì mở form tạo lịch phỏng vấn,
    // trạng thái sẽ tự đổi sang INTERVIEW sau khi tạo lịch.
    if (statusType === 'INTERVIEW') {
      setInterviewModalOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSendingEmail(true);
    const isOffer = statusType === 'OFFER' || statusType === 'OFFERED';
    const isReject = statusType === 'REJECTED';
    const isHired = statusType === 'HIRED';
    const hasAskBeforeSend = Boolean(selectedStatus?.askBeforeSend);
    const sendEmailExplicitChoice =
      (isOffer && statusForm.sendOfferEmail) ||
      (isReject && statusForm.sendRejectEmail) ||
      (isHired && statusForm.sendHiredEmail);
    const sendEmail = hasAskBeforeSend ? sendEmailExplicitChoice : undefined;
    const customMessage =
      isOffer
        ? (statusForm.offer_custom_message || undefined)
        : isReject
          ? (statusForm.reject_custom_message || undefined)
          : isHired
            ? (statusForm.hired_custom_message || undefined)
            : undefined;
    const toLocalDateTimeIso = (dateOnly) => {
      if (!dateOnly) return undefined;
      return dateOnly.includes('T') ? dateOnly : `${dateOnly}T00:00:00`;
    };
    const offerRequest = isOffer
      ? {
          offerSalary: statusForm.offer_salary || undefined,
          offerStartDate: toLocalDateTimeIso(statusForm.offer_start_date),
          offerExpireDate: toLocalDateTimeIso(statusForm.offer_expire_date),
          customMessage: statusForm.offer_custom_message || undefined,
        }
      : undefined;

    const run = async () => {
      try {
        // Nếu có gửi email và có mapping code → bật/tắt template theo lựa chọn
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
              // reload local templates state nhẹ nhàng
              const fresh = await getEmailTemplates();
              setEmailTemplates(fresh);
            }
          }
        }

        await updateApplicationStatus(id, {
          statusId: statusForm.statusId,
          notes: statusForm.notes || undefined,
          customMessage,
          offerRequest,
          sendEmail,
        });
        const updated = await getApplicationById(id);
        setApp(updated);
        const h = await getApplicationStatusHistory(id);
        setHistory(h);
        setStatusForm((f) => ({
          ...f,
          notes: '',
          sendOfferEmail: false,
          offer_salary: '',
          offer_start_date: '',
          offer_expire_date: '',
          offer_custom_message: '',
          sendHiredEmail: false,
          hired_custom_message: '',
          sendRejectEmail: false,
          reject_custom_message: '',
        }));
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Đổi trạng thái thất bại');
      } finally {
        setSendingEmail(false);
      }
    };

    run();
  };

  const handleQuickStatusChange = (targetStatus) => {
    if (!targetStatus || !id) return;
    if (isCurrentTerminal) return;
    setError('');
    setSendingEmail(true);
    updateApplicationStatus(id, {
      statusId: targetStatus.id,
      notes: undefined,
    })
      .then(() => getApplicationById(id))
      .then((updated) => {
        setApp(updated);
        setStatusForm((f) => ({
          ...f,
          statusId: updated.statusId || updated.status?.id || '',
          notes: '',
          sendOfferEmail: false,
          offer_salary: '',
          offer_start_date: '',
          offer_expire_date: '',
          offer_custom_message: '',
          sendRejectEmail: false,
          reject_custom_message: '',
        }));
      })
      .then(() => getApplicationStatusHistory(id))
      .then(setHistory)
      .catch((err) =>
        setError(
          err.response?.data?.message || err.message || 'Đổi trạng thái thất bại'
        )
      )
      .finally(() => setSendingEmail(false));
  };

  const handleAssign = (e) => {
    e.preventDefault();
    if (!assignForm.assignedTo) return;
    setError('');
    assignApplication(id, { assignedTo: assignForm.assignedTo })
      .then(() => getApplicationById(id))
      .then(setApp)
      .catch((err) => setError(err.response?.data?.message || err.message || 'Assign thất bại'));
  };

  const handleDelete = () => {
    setConfirmDelete({ open: true, type: 'application', id });
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentForm.commentText?.trim()) return;
    setError('');
    createComment(id, {
      commentText: commentForm.commentText.trim(),
      isInternal: commentForm.isInternal,
    })
      .then(() => {
        // Nếu đang ở trang 1 (page=0) thì force reload ngay để comment mới hiện tức thì
        if (commentsPage === 0) {
          return fetchComments(0);
        }
        setCommentsPage(0);
        return Promise.resolve();
      })
      .then(() => setCommentForm({ commentText: '', isInternal: true }))
      .catch((err) => setError(err.response?.data?.message || err.message || 'Thêm comment thất bại'));
  };

  const handleUpdateComment = (e) => {
    e.preventDefault();
    if (!editingComment || !commentForm.commentText?.trim()) return;
    setError('');
    updateComment(id, editingComment.id, {
      commentText: commentForm.commentText.trim(),
      isInternal: commentForm.isInternal,
    })
      .then(() => fetchComments(commentsPage))
      .then(() => {
        setEditingComment(null);
        setCommentForm({ commentText: '', isInternal: true });
      })
      .catch((err) => setError(err.response?.data?.message || err.message || 'Cập nhật comment thất bại'));
  };

  const handleDeleteComment = (commentId) => {
    setConfirmDelete({ open: true, type: 'comment', id: commentId });
  };

  const handleCreateInterview = (e) => {
    e.preventDefault();
    if (!interviewForm.scheduledDate || !interviewForm.interviewerIds?.length) {
      setError('Vui lòng chọn ngày giờ và ít nhất 1 người phỏng vấn');
      return;
    }
    setError('');
    setSendingEmail(true);
    const scheduledDate = interviewForm.scheduledDate.includes('Z')
      ? interviewForm.scheduledDate
      : new Date(interviewForm.scheduledDate).toISOString();
    const duration = Number(interviewForm.durationMinutes) || 60;
    createInterview(id, {
      roundNumber: Number(interviewForm.roundNumber) || 1,
      interviewType: interviewForm.interviewType,
      scheduledDate,
      durationMinutes: duration,
      interviewerIds: interviewForm.interviewerIds,
      primaryInterviewerId: interviewForm.primaryInterviewerId || interviewForm.interviewerIds[0] || undefined,
      meetingLink: interviewForm.meetingLink || undefined,
      location: interviewForm.location || undefined,
      notes: interviewForm.notes || undefined,
    })
      .then(async (created) => {
        setError('');
        setSuccess('Tạo lịch phỏng vấn thành công.');
        // Nếu chọn gửi email mời phỏng vấn, bật template tương ứng và gửi email
        if (interviewSendEmail) {
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
          await sendApplicationEmail(id, {
            emailType: 'INTERVIEW_SCHEDULED',
            interviewId: created.id,
            manualVariables: {
              custom_message: interviewEmailMessage || '',
            },
          });
        }
        return getApplicationInterviews(id);
      })
      .then(setInterviews)
      .then(() => {
        setInterviewModalOpen(false);
        setInterviewForm((f) => ({
          roundNumber: (f.roundNumber || 1) + 1,
          interviewType: 'TECHNICAL',
          scheduledDate: '',
          durationMinutes: 60,
          interviewerIds: [],
          primaryInterviewerId: '',
          meetingLink: '',
          location: '',
          notes: '',
        }));
        setInterviewSendEmail(false);
        setInterviewEmailMessage('');
      })
      .then(() => {
        const interviewStage =
          statuses.find(
            (s) => getStatusType(s) === 'INTERVIEW' && (s.isActive !== false) && !s.deletedAt
          ) || null;
        if (!interviewStage || currentStatusType === 'INTERVIEW') return null;
        return updateApplicationStatus(id, {
          statusId: interviewStage.id,
          notes: 'Tự động chuyển sang INTERVIEW khi tạo lịch phỏng vấn',
        })
          .then(() => getApplicationById(id))
          .then((updated) => {
            setApp(updated);
            setStatusForm((f) => ({
              ...f,
              statusId: updated.statusId || updated.status?.id || '',
              notes: '',
            }));
          })
          .then(() => getApplicationStatusHistory(id))
          .then(setHistory);
      })
      .catch((err) => setError(err.response?.data?.message || err.message || 'Tạo lịch phỏng vấn thất bại'))
      .finally(() => setSendingEmail(false));
  };

  const toggleInterviewer = (userId) => {
    setInterviewForm((f) => {
      const ids = f.interviewerIds.includes(userId)
        ? f.interviewerIds.filter((id) => id !== userId)
        : [...f.interviewerIds, userId];
      const primary = f.primaryInterviewerId && ids.includes(f.primaryInterviewerId)
        ? f.primaryInterviewerId
        : ids[0] || '';
      return { ...f, interviewerIds: ids, primaryInterviewerId: primary };
    });
  };

  const handleUploadAttachment = (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setError('Vui lòng chọn file');
      return;
    }
    setError('');
    const attachmentType = uploadForm.attachmentType;
    const fd = new FormData();
    fd.append('file', uploadForm.file);
    fd.append('attachmentType', attachmentType);
    if (uploadForm.description) fd.append('description', uploadForm.description);
    uploadAttachment(id, fd)
      .then(() => getApplicationAttachments(id))
      .then(setAttachments)
      .then(() => setUploadForm({ file: null, attachmentType: 'RESUME', description: '' }))
      .then(() => (attachmentType === 'RESUME' ? getApplicationById(id) : null))
      .then((updated) => {
        if (updated) setApp((prev) => ({ ...prev, ...updated }));
      })
      .catch((err) => setError(err.message || 'Upload thất bại'));
  };

  const handleDeleteAttachment = (attachmentId) => {
    setConfirmDelete({ open: true, type: 'attachment', id: attachmentId });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete.type) return;
    setConfirmDeleting(true);
    setError('');
    try {
      if (confirmDelete.type === 'application') {
        await deleteApplication(id);
        navigate('/app/applications');
        return;
      }

      if (confirmDelete.type === 'comment') {
        await deleteComment(id, confirmDelete.id);
        await fetchComments(commentsPage);
      }

      if (confirmDelete.type === 'attachment') {
        await deleteAttachment(confirmDelete.id);
        const files = await getApplicationAttachments(id);
        setAttachments(files);
      }

      setConfirmDelete({ open: false, type: null, id: null });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          (confirmDelete.type === 'comment' ? 'Xóa comment thất bại' : 'Xóa thất bại')
      );
    } finally {
      setConfirmDeleting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <p className={styles.applicationDetailPage__loading}>Đang tải...</p>;
  if (!app) return <p className={styles.applicationDetailPage__error}>Không tìm thấy ứng tuyển.</p>;

  return (
    <div className={styles.applicationDetailPage}>
      <header className={styles.applicationDetailPage__header}>
        <h1 className={styles.applicationDetailPage__title}>
          {app.candidateName} – {app.jobTitle || app.jobId}
        </h1>
        <div className={styles.applicationDetailPage__headerMeta}>
          <span
            className={styles.applicationDetailPage__statusBadge}
            style={{ '--status-color': app.status?.color || '#6b7280' }}
          >
            {app.status?.displayName || app.status?.name || '-'}
          </span>
          <span className={styles.applicationDetailPage__metaChip}>
            Phụ trách: {app.assignedToName || 'Chưa gán'}
          </span>
          <span className={styles.applicationDetailPage__metaChip}>
            Ứng tuyển: {app.appliedDate || '-'}
          </span>
        </div>
      </header>

      {error && (
        <div className={styles.applicationDetailPage__error} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.applicationDetailPage__success} role="status">
          {success}
        </div>
      )}

      <div className={styles.applicationDetailPage__grid}>
        <section
          id="application-status-section"
          className={`${styles.applicationDetailPage__section} ${styles.applicationDetailPage__sectionHalf}`}
        >
          <h2>Thông tin ứng viên</h2>
          <dl>
            <dt>Tên</dt>
            <dd>{app.candidateName}</dd>
            <dt>Email</dt>
            <dd>{app.candidateEmail}</dd>
            <dt>Số điện thoại</dt>
            <dd>{app.candidatePhone || '-'}</dd>
            <dt>Ngày ứng tuyển</dt>
            <dd>{app.appliedDate || '-'}</dd>
            <dt>Nguồn</dt>
            <dd>{app.source || '-'}</dd>
            {app.resumeFilePath && (
              <>
                <dt>CV</dt>
                <dd>
                  <a
                    href={app.resumeFilePath.startsWith('http') ? app.resumeFilePath : `${import.meta.env.VITE_API_BASE || '/api/v1'}${app.resumeFilePath.startsWith('/') ? '' : '/'}${app.resumeFilePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.applicationDetailPage__resumeLink}
                  >
                    Xem / Tải CV
                  </a>
                </dd>
              </>
            )}
          </dl>
        </section>

        <section className={`${styles.applicationDetailPage__section} ${styles.applicationDetailPage__sectionHalf}`}>
          <h2>Trạng thái & Gán</h2>
          {hasPermission('APPLICATION_UPDATE') && (
          <form
            onSubmit={handleStatusChange}
            className={`${styles.applicationDetailPage__form} ${styles.applicationDetailPage__statusForm}`}
          >
            <fieldset disabled={isCurrentTerminal || sendingEmail} className={styles.applicationDetailPage__fieldset}>
              <select
                value={statusForm.statusId}
                onChange={(e) => {
                  const newStatusId = e.target.value;
                  const selected = statuses.find((s) => s.id === newStatusId);
                  const type = getStatusType(selected);
                  setStatusForm((f) => ({
                    ...f,
                    statusId: newStatusId,
                    sendOfferEmail:
                      type === 'OFFER' || type === 'OFFERED'
                        ? Boolean(selected?.autoSendEmail)
                        : f.sendOfferEmail,
                    sendHiredEmail:
                      type === 'HIRED'
                        ? Boolean(selected?.autoSendEmail)
                        : f.sendHiredEmail,
                    sendRejectEmail:
                      type === 'REJECTED'
                        ? Boolean(selected?.autoSendEmail)
                        : f.sendRejectEmail,
                  }));
                  // Pre-select active template for this status type (nếu có)
                  const codes = EMAIL_CODES_BY_STATUS_TYPE[type] || [];
                  if (codes.length && emailTemplates.length) {
                    const templates = emailTemplates.filter((t) => codes.includes(t.code));
                    const active = templates.find((t) => t.isActive !== false) || templates[0];
                    if (active) {
                      setSelectedTemplateId(active.id);
                    }
                  }
                }}
                required
              >
                <option value="">Chọn trạng thái</option>
                {statuses.map((s) => {
                  const type = getStatusType(s);
                  const currentStatusEntity =
                    statuses.find(
                      (st) => st.id === (app?.statusId || app?.status?.id)
                    ) || null;
                  const currentType = getStatusType(currentStatusEntity || app?.status);
                  const currentOrder = STATUS_ORDER[currentType] ?? 0;
                  const newOrder = STATUS_ORDER[type] ?? 0;
                  const isTerminal = currentType && STATUS_ORDER[currentType] >= STATUS_ORDER.HIRED;
                  const invalidBackward =
                    !isTerminal &&
                    currentOrder > 0 &&
                    newOrder > 0 &&
                    newOrder < currentOrder &&
                    type !== 'REJECTED';

                  const disabled = isTerminal || invalidBackward;

                  return (
                    <option key={s.id} value={s.id} disabled={disabled}>
                      {s.displayName || s.name}
                    </option>
                  );
                })}
              </select>
              <input
                type="text"
                placeholder="Ghi chú (tùy chọn)"
                value={statusForm.notes}
                onChange={(e) => setStatusForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <button type="submit">
                {sendingEmail ? 'Đang xử lý...' : 'Đổi trạng thái'}
              </button>
              {(() => {
                const selected = statuses.find((s) => s.id === statusForm.statusId);
                const st = getStatusType(selected);
                const isOffer = st === 'OFFER' || st === 'OFFERED';
                const isHired = st === 'HIRED';
                const isReject = st === 'REJECTED';
                const autoSend = Boolean(selected?.autoSendEmail);
                const askBeforeSend = Boolean(selected?.askBeforeSend);
                const showOfferCheckbox = isOffer && askBeforeSend && !autoSend;
                const showHiredCheckbox = isHired && askBeforeSend && !autoSend;
                const showRejectCheckbox = isReject && askBeforeSend && !autoSend;
                return (
                  <div className={styles.applicationDetailPage__statusEmailSection}>
                    {isOffer && (
                      <div className={styles.applicationDetailPage__emailFormSection}>
                        {showOfferCheckbox && (
                          <label className={styles.applicationDetailPage__checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={statusForm.sendOfferEmail}
                              onChange={(e) => setStatusForm((f) => ({ ...f, sendOfferEmail: e.target.checked }))}
                            />
                            Gửi email Offer kèm theo
                          </label>
                        )}
                        {statusForm.sendOfferEmail && (
                          <>
                            {(() => {
                              const codes = EMAIL_CODES_BY_STATUS_TYPE[st] || [];
                              const templates = emailTemplates.filter((t) => codes.includes(t.code));
                              if (!templates.length) {
                                return (
                                  <p className={styles.applicationDetailPage__emailFormHint}>
                                    Chưa có template email Offer cho code {codes.join(', ')}. Hệ thống sẽ dùng mặc định.
                                  </p>
                                );
                              }
                              return (
                                <>
                                  <p className={styles.applicationDetailPage__emailFormHint}>
                                    Chọn template email sẽ dùng cho Offer:
                                  </p>
                                  <div className={styles.applicationDetailPage__templatePills}>
                                    {templates.map((t) => (
                                      <label
                                        key={t.id}
                                        className={
                                          t.id === selectedTemplateId
                                            ? styles.applicationDetailPage__templatePillActive
                                            : styles.applicationDetailPage__templatePill
                                        }
                                      >
                                        <input
                                          type="radio"
                                          name="offer-email-template"
                                          checked={t.id === selectedTemplateId}
                                          onChange={() => setSelectedTemplateId(t.id)}
                                          disabled={emailTemplatesLoading}
                                        />
                                        <span className={styles.applicationDetailPage__templatePillCode}>
                                          {t.code}
                                        </span>
                                        <span className={styles.applicationDetailPage__templatePillLabel}>
                                          {t.name}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                  {selectedTemplateId && (
                                    <div className={styles.applicationDetailPage__templatePreview}>
                                      {templateDetailLoading ? (
                                        <p className={styles.applicationDetailPage__templatePreviewLoading}>Đang tải nội dung template...</p>
                                      ) : templateDetail ? (
                                        <>
                                          <div className={styles.applicationDetailPage__templatePreviewSubject}><strong>Subject:</strong> {templateDetail.subject || '(không có)'}</div>
                                          <div className={styles.applicationDetailPage__templatePreviewBody} dangerouslySetInnerHTML={{ __html: templateDetail.htmlContent || '<em>Không có nội dung</em>' }} />
                                        </>
                                      ) : (
                                        <p className={styles.applicationDetailPage__templatePreviewLoading}>Không tải được nội dung template</p>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <div className={styles.applicationDetailPage__emailFormFields}>
                              <label className={styles.applicationDetailPage__label}>
                                Mức lương / thông tin (offer_salary)
                                <input
                                  type="text"
                                  placeholder="VD: 25–30 triệu"
                                  value={statusForm.offer_salary}
                                  onChange={(e) =>
                                    setStatusForm((f) => ({ ...f, offer_salary: e.target.value }))
                                  }
                                />
                              </label>
                              <label className={styles.applicationDetailPage__label}>
                                Ngày bắt đầu (offer_start_date)
                                <input
                                  type="date"
                                  value={statusForm.offer_start_date}
                                  onChange={(e) =>
                                    setStatusForm((f) => ({
                                      ...f,
                                      offer_start_date: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className={styles.applicationDetailPage__label}>
                                Hạn phản hồi (offer_expire_date)
                                <input
                                  type="date"
                                  value={statusForm.offer_expire_date}
                                  onChange={(e) =>
                                    setStatusForm((f) => ({
                                      ...f,
                                      offer_expire_date: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <label className={styles.applicationDetailPage__label}>
                                Tin nhắn thêm (custom_message)
                                <textarea
                                  rows={2}
                                  placeholder="Tùy chọn"
                                  value={statusForm.offer_custom_message}
                                  onChange={(e) =>
                                    setStatusForm((f) => ({
                                      ...f,
                                      offer_custom_message: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                            <div className={styles.applicationDetailPage__emailPreview}>
                              <h4 className={styles.applicationDetailPage__emailPreviewTitle}>
                                Preview email Offer
                              </h4>
                              {emailPreviewLoading &&
                              !offerEmailPreview.subject &&
                              !offerEmailPreview.body ? (
                                <p className={styles.applicationDetailPage__emailFormHint}>
                                  Đang tải preview...
                                </p>
                              ) : (
                                <>
                                  <p className={styles.applicationDetailPage__emailPreviewSubject}>
                                    <strong>Subject:</strong>{' '}
                                    {offerEmailPreview.subject || '(mặc định theo template)'}
                                  </p>
                                  <pre className={styles.applicationDetailPage__emailPreviewBody}>
                                    {offerEmailPreview.body ||
                                      'Nội dung sẽ dùng template mặc định của hệ thống.'}
                                  </pre>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {isHired && (
                      <div className={styles.applicationDetailPage__emailFormSection}>
                        {showHiredCheckbox && (
                          <label className={styles.applicationDetailPage__checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={statusForm.sendHiredEmail}
                              onChange={(e) =>
                                setStatusForm((f) => ({ ...f, sendHiredEmail: e.target.checked }))
                              }
                            />
                            Gửi email thông báo trúng tuyển kèm theo
                          </label>
                        )}
                        {statusForm.sendHiredEmail && (
                          <label className={styles.applicationDetailPage__label}>
                            Tin nhắn thêm (customMessage)
                            <textarea
                              rows={3}
                              placeholder="Tùy chọn"
                              value={statusForm.hired_custom_message}
                              onChange={(e) =>
                                setStatusForm((f) => ({
                                  ...f,
                                  hired_custom_message: e.target.value,
                                }))
                              }
                            />
                          </label>
                        )}
                      </div>
                    )}
                    {isReject && (
                      <div className={styles.applicationDetailPage__emailFormSection}>
                        {showRejectCheckbox && (
                          <label className={styles.applicationDetailPage__checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={statusForm.sendRejectEmail}
                              onChange={(e) => setStatusForm((f) => ({ ...f, sendRejectEmail: e.target.checked }))}
                            />
                            Gửi email từ chối kèm theo
                          </label>
                        )}
                        {statusForm.sendRejectEmail && (
                          <>
                            {(() => {
                              const codes = EMAIL_CODES_BY_STATUS_TYPE[st] || [];
                              const templates = emailTemplates.filter((t) => codes.includes(t.code));
                              if (!templates.length) {
                                return (
                                  <p className={styles.applicationDetailPage__emailFormHint}>
                                    Chưa có template email từ chối cho code {codes.join(', ')}. Hệ thống sẽ dùng mặc định.
                                  </p>
                                );
                              }
                              return (
                                <>
                                  <p className={styles.applicationDetailPage__emailFormHint}>
                                    Chọn template email sẽ dùng cho từ chối:
                                  </p>
                                  <div className={styles.applicationDetailPage__templatePills}>
                                    {templates.map((t) => (
                                      <label
                                        key={t.id}
                                        className={
                                          t.id === selectedTemplateId
                                            ? styles.applicationDetailPage__templatePillActive
                                            : styles.applicationDetailPage__templatePill
                                        }
                                      >
                                        <input
                                          type="radio"
                                          name="reject-email-template"
                                          checked={t.id === selectedTemplateId}
                                          onChange={() => setSelectedTemplateId(t.id)}
                                          disabled={emailTemplatesLoading}
                                        />
                                        <span className={styles.applicationDetailPage__templatePillCode}>
                                          {t.code}
                                        </span>
                                        <span className={styles.applicationDetailPage__templatePillLabel}>
                                          {t.name}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                  {selectedTemplateId && (
                                    <div className={styles.applicationDetailPage__templatePreview}>
                                      {templateDetailLoading ? (
                                        <p className={styles.applicationDetailPage__templatePreviewLoading}>Đang tải nội dung template...</p>
                                      ) : templateDetail ? (
                                        <>
                                          <div className={styles.applicationDetailPage__templatePreviewSubject}><strong>Subject:</strong> {templateDetail.subject || '(không có)'}</div>
                                          <div className={styles.applicationDetailPage__templatePreviewBody} dangerouslySetInnerHTML={{ __html: templateDetail.htmlContent || '<em>Không có nội dung</em>' }} />
                                        </>
                                      ) : (
                                        <p className={styles.applicationDetailPage__templatePreviewLoading}>Không tải được nội dung template</p>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <label className={styles.applicationDetailPage__label}>
                              Nội dung (custom_message)
                              <textarea
                                rows={3}
                                placeholder="Tùy chọn"
                                value={statusForm.reject_custom_message}
                                onChange={(e) =>
                                  setStatusForm((f) => ({
                                    ...f,
                                    reject_custom_message: e.target.value,
                                  }))
                                }
                              />
                            </label>
                            <div className={styles.applicationDetailPage__emailPreview}>
                              <h4 className={styles.applicationDetailPage__emailPreviewTitle}>
                                Preview email từ chối
                              </h4>
                              {emailPreviewLoading &&
                              !rejectEmailPreview.subject &&
                              !rejectEmailPreview.body ? (
                                <p className={styles.applicationDetailPage__emailFormHint}>
                                  Đang tải preview...
                                </p>
                              ) : (
                                <>
                                  <p className={styles.applicationDetailPage__emailPreviewSubject}>
                                    <strong>Subject:</strong>{' '}
                                    {rejectEmailPreview.subject || '(mặc định theo template)'}
                                  </p>
                                  <pre className={styles.applicationDetailPage__emailPreviewBody}>
                                    {rejectEmailPreview.body ||
                                      'Nội dung sẽ dùng template mặc định của hệ thống.'}
                                  </pre>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </fieldset>
            {isCurrentTerminal && (
              <p className={styles.applicationDetailPage__terminalHint}>
                Application đã kết thúc ({app.status?.displayName || app.status?.name}). Không thể đổi trạng thái tiếp.
              </p>
            )}
          </form>
          )}

          {hasPermission('APPLICATION_UPDATE') && (
          <form
            onSubmit={handleAssign}
            className={`${styles.applicationDetailPage__form} ${styles.applicationDetailPage__assignForm}`}
          >
            <select
              value={assignForm.assignedTo}
              onChange={(e) => setAssignForm((f) => ({ ...f, assignedTo: e.target.value }))}
            >
              <option value="">Chưa gán</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
            <button type="submit">Gán</button>
          </form>
          )}

          <p><strong>Trạng thái hiện tại:</strong> {app.status?.displayName || app.status?.name || '-'}</p>
          <p><strong>Người phụ trách:</strong> {app.assignedToName || 'Chưa gán'}</p>
        </section>

        <section className={`${styles.applicationDetailPage__section} ${styles.applicationDetailPage__sectionFull}`}>
          <h2>Match Score</h2>
          {app.matchScore != null ? (
            <div className={styles.applicationDetailPage__scoreCard}>
              <div className={styles.applicationDetailPage__scoreHeader}>
                <span className={styles.applicationDetailPage__scoreValue}>{app.matchScore}%</span>
                <div className={styles.applicationDetailPage__scoreBar}>
                  <div
                    className={styles.applicationDetailPage__scoreBarFill}
                    style={{
                      width: `${app.matchScore}%`,
                      '--bar-color': app.matchScore >= 70 ? '#22c55e' : app.matchScore >= 40 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>
              {app.matchScoreDetails && (
                <div className={styles.applicationDetailPage__scoreGroups}>
                  <div className={styles.applicationDetailPage__scoreGroup}>
                    <h4 className={styles.applicationDetailPage__scoreGroupTitle}>
                      Bắt buộc
                      <span className={styles.applicationDetailPage__scoreGroupCount}>
                        {app.matchScoreDetails.matchedRequiredCount}/{app.matchScoreDetails.totalRequiredCount}
                      </span>
                    </h4>
                    <div className={styles.applicationDetailPage__skillTags}>
                      {app.matchScoreDetails.matchedRequiredSkills?.map((s) => (
                        <span key={s} className={styles.applicationDetailPage__skillTagMatched}>{s}</span>
                      ))}
                      {app.matchScoreDetails.missingRequiredSkills?.map((s) => (
                        <span key={s} className={styles.applicationDetailPage__skillTagMissing}>{s}</span>
                      ))}
                    </div>
                  </div>
                  {app.matchScoreDetails.totalOptionalCount > 0 && (
                    <div className={styles.applicationDetailPage__scoreGroup}>
                      <h4 className={styles.applicationDetailPage__scoreGroupTitle}>
                        Ưu tiên
                        <span className={styles.applicationDetailPage__scoreGroupCount}>
                          {app.matchScoreDetails.matchedOptionalCount}/{app.matchScoreDetails.totalOptionalCount}
                        </span>
                      </h4>
                      <div className={styles.applicationDetailPage__skillTags}>
                        {app.matchScoreDetails.matchedOptionalSkills?.map((s) => (
                          <span key={s} className={styles.applicationDetailPage__skillTagMatched}>{s}</span>
                        ))}
                        {app.matchScoreDetails.missingOptionalSkills?.map((s) => (
                          <span key={s} className={styles.applicationDetailPage__skillTagMissing}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p>Chưa có điểm</p>
          )}
        </section>

        <section className={`${styles.applicationDetailPage__section} ${styles.applicationDetailPage__sectionHalf}`}>
          <h2>Chi tiết</h2>
          <p><strong>Cover letter:</strong> {app.coverLetter || '-'}</p>
          <p><strong>Ghi chú:</strong> {app.notes || '-'}</p>
          <p><strong>Rating:</strong> {app.rating ?? '-'}</p>
          <p><strong>Cho phép upload thêm:</strong> {app.allowAdditionalUploads ? 'Có' : 'Không'}</p>
          {hasPermission('APPLICATION_UPDATE') && (
            <button
              type="button"
              className={styles.applicationDetailPage__commentActionBtn}
              onClick={() => setEditModalOpen(true)}
            >
              Sửa
            </button>
          )}
        </section>

        <section className={`${styles.applicationDetailPage__section} ${styles.applicationDetailPage__sectionHalf}`}>
          <h2>Tài liệu đính kèm</h2>
          {hasPermission('ATTACHMENT_CREATE') && (
            <form onSubmit={handleUploadAttachment} className={styles.applicationDetailPage__attachmentForm}>
              <div className={styles.applicationDetailPage__attachmentFormRow}>
                <div className={styles.applicationDetailPage__fileInputWrapper}>
                  <label className={styles.applicationDetailPage__fileInputLabel}>
                    <span>Chọn tệp</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) =>
                        setUploadForm((f) => ({ ...f, file: e.target.files?.[0] || null }))
                      }
                    />
                  </label>
                  <span className={styles.applicationDetailPage__fileName}>
                    {uploadForm.file ? uploadForm.file.name : 'Chưa chọn tệp'}
                  </span>
                </div>
                <select
                  value={uploadForm.attachmentType}
                  onChange={(e) =>
                    setUploadForm((f) => ({ ...f, attachmentType: e.target.value }))
                  }
                >
                  {ATTACHMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Mô tả (tùy chọn)"
                  value={uploadForm.description}
                  onChange={(e) =>
                    setUploadForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className={styles.applicationDetailPage__addBtn}
                  disabled={!uploadForm.file}
                >
                  Upload
                </button>
              </div>
            </form>
          )}
          <ul className={styles.applicationDetailPage__attachmentList}>
            {attachments.map((a) => {
              const displayName = a.originalFilename || a.filename || a.id;
              const isResume = a.attachmentType === 'RESUME';
              return (
              <li key={a.id} className={styles.applicationDetailPage__attachmentItem}>
                <button
                  type="button"
                  className={isResume ? styles.applicationDetailPage__attachmentLinkCv : styles.applicationDetailPage__attachmentLink}
                  onClick={() => downloadAttachment(a.id, displayName)}
                  title={isResume ? 'Tải CV' : 'Tải file'}
                >
                  {displayName}
                </button>
                <span className={styles.applicationDetailPage__attachmentMeta}>
                  {ATTACHMENT_TYPES.find((t) => t.value === a.attachmentType)?.label || a.attachmentType}
                  {' · '}
                  {formatFileSize(a.fileSize)}
                </span>
                <div className={styles.applicationDetailPage__attachmentActions}>
                  <button
                    type="button"
                    className={styles.applicationDetailPage__commentActionBtn}
                    onClick={() => downloadAttachment(a.id, displayName)}
                  >
                    Tải
                  </button>
                  {hasPermission('ATTACHMENT_DELETE') && (
                  <button
                    type="button"
                    className={styles.applicationDetailPage__commentActionBtn}
                    onClick={() => handleDeleteAttachment(a.id)}
                  >
                    Xóa
                  </button>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
          {attachments.length === 0 && <p className={styles.applicationDetailPage__empty}>Chưa có tài liệu</p>}
        </section>

        <section className={`${styles.applicationDetailPage__section} ${styles.applicationDetailPage__sectionFull}`}>
          <h2>Bình luận</h2>
          {hasPermission('COMMENT_CREATE') && (
          <form onSubmit={handleAddComment} className={styles.applicationDetailPage__commentForm}>
            <textarea
              placeholder="Viết bình luận..."
              value={commentForm.commentText}
              onChange={(e) => setCommentForm((f) => ({ ...f, commentText: e.target.value }))}
              rows={2}
              className={styles.applicationDetailPage__commentInput}
            />
            <div className={styles.applicationDetailPage__commentFormRow}>
              <label className={styles.applicationDetailPage__checkboxLabel}>
                <input
                  type="checkbox"
                  checked={commentForm.isInternal}
                  onChange={(e) => setCommentForm((f) => ({ ...f, isInternal: e.target.checked }))}
                />
                Nội bộ (không gửi ứng viên)
              </label>
              <button type="submit" className={styles.applicationDetailPage__addBtn}>Gửi</button>
            </div>
          </form>
          )}
          <ul className={styles.applicationDetailPage__commentList}>
            {comments.map((c) => (
              <li key={c.id} className={styles.applicationDetailPage__commentItem}>
                <div className={styles.applicationDetailPage__commentHeader}>
                  <strong>{c.userName || 'Ẩn danh'}</strong>
                  {c.isInternal && (
                    <span className={styles.applicationDetailPage__internalBadge}>Nội bộ</span>
                  )}
                  <span className={styles.applicationDetailPage__commentDate}>{c.createdAt}</span>
                </div>
                <p className={styles.applicationDetailPage__commentText}>{c.commentText}</p>
                {(hasPermission('COMMENT_UPDATE') || hasPermission('COMMENT_DELETE')) && currentUser?.id === c.userId && (
                  <div className={styles.applicationDetailPage__commentActions}>
                    <button
                      type="button"
                      className={styles.applicationDetailPage__commentActionBtn}
                      onClick={() => {
                        setEditingComment(c);
                        setCommentForm({ commentText: c.commentText, isInternal: c.isInternal });
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className={styles.applicationDetailPage__commentActionBtn}
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {comments.length === 0 && <p className={styles.applicationDetailPage__empty}>Chưa có bình luận</p>}
          {commentsPagination && commentsPagination.totalPages > 1 && (
            <div className={styles.applicationDetailPage__commentsPagination}>
              <button
                type="button"
                disabled={commentsPage <= 0}
                onClick={() => setCommentsPage((p) => p - 1)}
              >
                Trang trước
              </button>
              <span>Trang {commentsPage + 1} / {commentsPagination.totalPages}</span>
              <button
                type="button"
                disabled={commentsPage >= commentsPagination.totalPages - 1}
                onClick={() => setCommentsPage((p) => p + 1)}
              >
                Trang sau
              </button>
            </div>
          )}
        </section>

        <section className={`${styles.applicationDetailPage__section} ${styles.applicationDetailPage__sectionHalf}`}>
          <h2>Phỏng vấn</h2>
          {hasPermission('INTERVIEW_CREATE') && (
          <button
            type="button"
            className={styles.applicationDetailPage__addBtn}
            onClick={() => setInterviewModalOpen(true)}
          >
            + Đặt lịch phỏng vấn
          </button>
          )}
          <ul className={styles.applicationDetailPage__interviewList}>
            {interviews.map((iv) => (
              <li key={iv.id} className={styles.applicationDetailPage__interviewItem}>
                <Link
                  to={`/app/interviews/${iv.id}`}
                  className={styles.applicationDetailPage__interviewLink}
                >
                  <span className={styles.applicationDetailPage__interviewType}>
                    {INTERVIEW_TYPES.find((t) => t.value === iv.interviewType)?.label || iv.interviewType}
                  </span>
                  <span className={styles.applicationDetailPage__interviewMeta}>
                    Vòng {iv.roundNumber} · {iv.scheduledDate ? new Date(iv.scheduledDate).toLocaleString('vi-VN') : '-'} · {iv.durationMinutes} phút
                  </span>
                  <span
                    className={styles.applicationDetailPage__statusBadge}
                    style={{ '--status-color': iv.status === 'CANCELLED' ? '#ef4444' : iv.status === 'COMPLETED' ? '#22c55e' : '#3b82f6' }}
                  >
                    {iv.status === 'SCHEDULED' && 'Đã lên lịch'}
                    {iv.status === 'RESCHEDULED' && 'Đổi lịch'}
                    {iv.status === 'COMPLETED' && 'Hoàn thành'}
                    {iv.status === 'CANCELLED' && 'Đã hủy'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {interviews.length === 0 && <p className={styles.applicationDetailPage__empty}>Chưa có lịch phỏng vấn</p>}
        </section>

        <Drawer open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Chỉnh sửa chi tiết">
          <form onSubmit={handleUpdate} className={styles.applicationDetailPage__editForm}>
            {error && (
              <div className={styles.applicationDetailPage__error} role="alert">{error}</div>
            )}
            <label>
              Cover letter
              <textarea
                value={form.coverLetter}
                onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))}
                rows={3}
              />
            </label>
            <label>
              Ghi chú
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </label>
            <label>
              Rating (1-5)
              <input
                type="number"
                min={1}
                max={5}
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.allowAdditionalUploads}
                onChange={(e) => setForm((f) => ({ ...f, allowAdditionalUploads: e.target.checked }))}
              />
              Cho phép ứng viên upload thêm tài liệu
            </label>
            <div className={styles.applicationDetailPage__formActions}>
              <button type="submit">Lưu</button>
              <button type="button" onClick={() => setEditModalOpen(false)}>Hủy</button>
            </div>
          </form>
        </Drawer>

        <Drawer
          open={interviewModalOpen}
          onClose={() => setInterviewModalOpen(false)}
          title="Đặt lịch phỏng vấn"
        >
          <form onSubmit={handleCreateInterview} className={styles.applicationDetailPage__editForm}>
            <label>
              Vòng
              <input
                type="number"
                min={1}
                value={interviewForm.roundNumber}
                onChange={(e) => setInterviewForm((f) => ({ ...f, roundNumber: e.target.value }))}
              />
            </label>
            <label>
              Loại phỏng vấn
              <select
                value={interviewForm.interviewType}
                onChange={(e) => setInterviewForm((f) => ({ ...f, interviewType: e.target.value }))}
              >
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label>
              Ngày giờ
              <input
                type="datetime-local"
                required
                value={interviewForm.scheduledDate}
                onChange={(e) => setInterviewForm((f) => ({ ...f, scheduledDate: e.target.value }))}
              />
            </label>
            <label>
              Thời lượng (phút)
              <input
                type="number"
                min={15}
                value={interviewForm.durationMinutes}
                onChange={(e) => setInterviewForm((f) => ({ ...f, durationMinutes: e.target.value }))}
              />
            </label>
            <label>
              Người phỏng vấn (chọn ít nhất 1)
              <div className={styles.applicationDetailPage__interviewerList}>
                {users.map((u) => (
                  <label key={u.id} className={styles.applicationDetailPage__checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={interviewForm.interviewerIds.includes(u.id)}
                      onChange={() => toggleInterviewer(u.id)}
                    />
                    {u.firstName} {u.lastName}
                  </label>
                ))}
              </div>
            </label>
            <label>
              Người phỏng vấn chính
              <select
                value={interviewForm.primaryInterviewerId}
                onChange={(e) => setInterviewForm((f) => ({ ...f, primaryInterviewerId: e.target.value }))}
              >
                <option value="">Tự động (người đầu tiên)</option>
                {users.filter((u) => interviewForm.interviewerIds.includes(u.id)).map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </label>
            <label>
              Meeting link
              <input
                type="url"
                placeholder="https://meet.google.com/..."
                value={interviewForm.meetingLink}
                onChange={(e) => setInterviewForm((f) => ({ ...f, meetingLink: e.target.value }))}
              />
            </label>
            <label>
              Địa điểm
              <input
                type="text"
                placeholder="Phòng họp, địa chỉ..."
                value={interviewForm.location}
                onChange={(e) => setInterviewForm((f) => ({ ...f, location: e.target.value }))}
              />
            </label>
            <label>
              Ghi chú
              <textarea
                rows={2}
                value={interviewForm.notes}
                onChange={(e) => setInterviewForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <label className={styles.applicationDetailPage__checkboxLabel}>
              <input
                type="checkbox"
                checked={interviewSendEmail}
                onChange={(e) => setInterviewSendEmail(e.target.checked)}
              />
              Gửi email mời phỏng vấn kèm theo
            </label>
            {interviewSendEmail && (
              <>
                <p className={styles.applicationDetailPage__emailFormHint}>
                  Chọn template email dùng cho lịch phỏng vấn:
                </p>
                <div className={styles.applicationDetailPage__templatePills}>
                  {emailTemplates
                    .filter((t) => t.code === 'INTERVIEW_SCHEDULED')
                    .map((t) => (
                      <label
                        key={t.id}
                        className={
                          t.id === selectedTemplateId
                            ? styles.applicationDetailPage__templatePillActive
                            : styles.applicationDetailPage__templatePill
                        }
                      >
                        <input
                          type="radio"
                          name="interview-email-template"
                          checked={t.id === selectedTemplateId}
                          onChange={() => setSelectedTemplateId(t.id)}
                          disabled={emailTemplatesLoading}
                        />
                        <span className={styles.applicationDetailPage__templatePillCode}>
                          {t.code}
                        </span>
                        <span className={styles.applicationDetailPage__templatePillLabel}>
                          {t.name}
                        </span>
                      </label>
                    ))}
                </div>
                {selectedTemplateId && (
                  <div className={styles.applicationDetailPage__templatePreview}>
                    {templateDetailLoading ? (
                      <p className={styles.applicationDetailPage__templatePreviewLoading}>Đang tải nội dung template...</p>
                    ) : templateDetail ? (
                      <>
                        <div className={styles.applicationDetailPage__templatePreviewSubject}><strong>Subject:</strong> {templateDetail.subject || '(không có)'}</div>
                        <div className={styles.applicationDetailPage__templatePreviewBody} dangerouslySetInnerHTML={{ __html: templateDetail.htmlContent || '<em>Không có nội dung</em>' }} />
                      </>
                    ) : (
                      <p className={styles.applicationDetailPage__templatePreviewLoading}>Không tải được nội dung template</p>
                    )}
                  </div>
                )}
                <label>
                  Tin nhắn thêm trong email (custom_message)
                  <textarea
                    rows={2}
                    value={interviewEmailMessage}
                    onChange={(e) => setInterviewEmailMessage(e.target.value)}
                  />
                </label>
              </>
            )}
            <div className={styles.applicationDetailPage__formActions}>
              <button type="submit" disabled={sendingEmail}>
                {sendingEmail ? 'Đang tạo...' : 'Tạo lịch'}
              </button>
              <button type="button" onClick={() => setInterviewModalOpen(false)}>Hủy</button>
            </div>
          </form>
        </Drawer>

        <Drawer
          open={!!editingComment}
          onClose={() => {
            setEditingComment(null);
            setCommentForm({ commentText: '', isInternal: true });
          }}
          title="Sửa bình luận"
        >
          <form onSubmit={handleUpdateComment} className={styles.applicationDetailPage__editForm}>
            <label>
              Nội dung
              <textarea
                value={commentForm.commentText}
                onChange={(e) => setCommentForm((f) => ({ ...f, commentText: e.target.value }))}
                rows={3}
                required
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={commentForm.isInternal}
                onChange={(e) => setCommentForm((f) => ({ ...f, isInternal: e.target.checked }))}
              />
              Nội bộ (không gửi ứng viên)
            </label>
            <div className={styles.applicationDetailPage__formActions}>
              <button type="submit">Lưu</button>
              <button
                type="button"
                onClick={() => {
                  setEditingComment(null);
                  setCommentForm({ commentText: '', isInternal: true });
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </Drawer>

        <section className={`${styles.applicationDetailPage__section} ${styles.applicationDetailPage__sectionHalf}`}>
          <h2>Lịch sử trạng thái</h2>
          <ul className={styles.applicationDetailPage__historyList}>
            {history.map((h, i) => (
              <li key={h.id || i}>
                {h.fromStatus?.displayName || h.fromStatus?.name || '—'} →{' '}
                {h.toStatus?.displayName || h.toStatus?.name || '—'}
                {h.notes && ` (${h.notes})`}
                <span className={styles.applicationDetailPage__historyDate}>
                  {h.createdAt}
                </span>
              </li>
            ))}
          </ul>
          {history.length === 0 && <p>Chưa có lịch sử</p>}
        </section>
      </div>

      {hasPermission('APPLICATION_DELETE') && (
      <footer className={styles.applicationDetailPage__footer}>
        <button
          type="button"
          className={styles.applicationDetailPage__deleteBtn}
          onClick={handleDelete}
        >
          Xóa ứng tuyển
        </button>
      </footer>
      )}

      <ConfirmModal
        open={confirmDelete.open}
        onClose={() => !confirmDeleting && setConfirmDelete({ open: false, type: null, id: null })}
        onConfirm={handleConfirmDelete}
        title={
          confirmDelete.type === 'application'
            ? 'Xác nhận xóa ứng tuyển'
            : confirmDelete.type === 'comment'
              ? 'Xác nhận xóa bình luận'
              : 'Xác nhận xóa tệp'
        }
        message={
          confirmDelete.type === 'application'
            ? 'Bạn có chắc chắn muốn xóa ứng tuyển này? Hành động này không thể hoàn tác.'
            : confirmDelete.type === 'comment'
              ? 'Bạn có chắc chắn muốn xóa bình luận này?'
              : 'Bạn có chắc chắn muốn xóa tệp đính kèm này?'
        }
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        loading={confirmDeleting}
      />
    </div>
  );
}
