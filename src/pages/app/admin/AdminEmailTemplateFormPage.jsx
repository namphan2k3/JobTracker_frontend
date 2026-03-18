import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  previewEmailTemplate,
  sendTestEmail,
} from '../../../api/emailTemplates';
import styles from '../../../styles/components/AdminEmailTemplateFormPage.module.css';

const DEFAULT_SAMPLE = {
  candidate_name: 'Nguyễn Văn A',
  job_title: 'Backend Developer',
  company_name: 'Acme Corp',
  hr_name: 'Trần Thị HR',
  application_status: 'INTERVIEWING',
  application_link: 'https://app.example.com/status?token=xxx',
  interview_time: '2024-01-20 14:00',
  interview_location: 'Phòng họp 3, Tầng 5',
  meeting_link: 'https://meet.google.com/xxx',
  offer_salary: '30,000,000 VND',
  offer_start_date: '2024-02-01',
  offer_expire_date: '2024-02-10',
  plan_name: 'Pro',
  plan_price: '1,200,000 VND',
  plan_expire_at: '2024-12-31',
  custom_message: 'Cảm ơn bạn đã quan tâm tới cơ hội này.',
};

/** Toàn bộ biến hệ thống mà backend cho phép (BUSINESS_FLOWS.md 6.5.1) */
const ALL_TEMPLATE_VARIABLES = [
  'company_name',
  'hr_name',
  'candidate_name',
  'job_title',
  'application_status',
  'application_link',
  'interview_time',
  'interview_location',
  'meeting_link',
  'offer_salary',
  'offer_start_date',
  'offer_expire_date',
  'plan_name',
  'plan_price',
  'plan_expire_at',
  'custom_message',
];

/**
 * Cấu hình allowed_system_vars / allowed_manual_vars theo từng email template code
 * (BUSINESS_FLOWS.md 6.5.2 – bảng Application / Interview / Offer Emails).
 */
const TEMPLATE_VARIABLE_CONFIG = {
  // Application emails
  APPLICATION_CONFIRMATION: {
    system: ['candidate_name', 'job_title', 'company_name', 'application_link'],
    manual: [],
  },
  APPLICATION_STATUS_UPDATED: {
    system: ['candidate_name', 'job_title', 'company_name', 'application_status', 'application_link'],
    manual: ['custom_message'],
  },
  CANDIDATE_REJECTED: {
    system: ['candidate_name', 'job_title', 'company_name', 'hr_name'],
    manual: ['custom_message'],
  },
  CANDIDATE_HIRED: {
    system: ['candidate_name', 'job_title', 'company_name', 'hr_name'],
    manual: ['custom_message'],
  },
  // Interview emails
  INTERVIEW_SCHEDULED: {
    system: [
      'candidate_name',
      'job_title',
      'company_name',
      'interview_time',
      'interview_location',
      'meeting_link',
      'hr_name',
    ],
    manual: ['custom_message'],
  },
  INTERVIEW_RESCHEDULED: {
    system: [
      'candidate_name',
      'job_title',
      'company_name',
      'interview_time',
      'interview_location',
      'meeting_link',
      'hr_name',
    ],
    manual: ['custom_message'],
  },
  INTERVIEW_CANCELLED: {
    system: ['candidate_name', 'job_title', 'company_name', 'hr_name'],
    manual: ['custom_message'],
  },
  // Offer emails
  MANUAL_OFFER: {
    system: ['candidate_name', 'job_title', 'company_name', 'hr_name'],
    manual: ['offer_salary', 'offer_start_date', 'offer_expire_date', 'custom_message'],
  },
};

const TEMPLATE_CODE_LABELS = {
  APPLICATION_CONFIRMATION: 'Xác nhận đã nhận hồ sơ ứng tuyển',
  INTERVIEW_SCHEDULED: 'Thông báo lịch phỏng vấn',
  INTERVIEW_RESCHEDULED: 'Thông báo dời lịch phỏng vấn',
  OFFER_CREATED: 'Thông báo gửi Offer (theo hệ thống)',
  CANDIDATE_HIRED: 'Thông báo trúng tuyển',
  CANDIDATE_REJECTED: 'Thông báo từ chối ứng viên',
  MANUAL_OFFER: 'Email Offer nhập tay (tùy chỉnh)',
};

const ALLOWED_TEMPLATE_CODES = [
  'APPLICATION_CONFIRMATION',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_RESCHEDULED',
  'OFFER_CREATED',
  'CANDIDATE_HIRED',
  'CANDIDATE_REJECTED',
  'MANUAL_OFFER',
];

export function AdminEmailTemplateFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formHtmlContent, setFormHtmlContent] = useState('');
  const [formFromName, setFormFromName] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [didInitContent, setDidInitContent] = useState(false);
  const subjectInputRef = useRef(null);
  const htmlEditorRef = useRef(null);

  const normalizedCode = formCode.trim().toUpperCase();
  const variableConfig = TEMPLATE_VARIABLE_CONFIG[normalizedCode] || null;
  const systemVariables = variableConfig?.system || ALL_TEMPLATE_VARIABLES.filter(
    (v) => v !== 'custom_message' && !v.startsWith('offer_')
  );
  const manualVariables = variableConfig?.manual || ['custom_message'];

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [id]);

  useEffect(() => {
    if (isNew) return;
    getEmailTemplateById(id)
      .then((t) => {
        setFormCode(t.code || '');
        setFormName(t.name || '');
        setFormSubject(t.subject || '');
        const initialContent = t.htmlContent || '';
        setFormHtmlContent(initialContent);
        if (htmlEditorRef.current) {
          htmlEditorRef.current.innerHTML = initialContent || '<p>Xin chào {{candidate_name}}, ...</p>';
        }
        setDidInitContent(true);
        setFormFromName(t.fromName || '');
        setFormIsActive(t.isActive !== false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải template thất bại');
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    if (isNew && !didInitContent && htmlEditorRef.current) {
      const initial = '<p>Xin chào {{candidate_name}}, ...</p>';
      htmlEditorRef.current.innerHTML = initial;
      setFormHtmlContent(initial);
      setDidInitContent(true);
    }
  }, [isNew, didInitContent]);

  const handleEditorCommand = (command) => {
    const editor = htmlEditorRef.current;
    if (!editor) return;
    editor.focus();
    if (command === 'createLink') {
      const url = window.prompt('Nhập URL cần chèn');
      if (!url) return;
      document.execCommand('createLink', false, url);
    } else if (command === 'removeFormat') {
      document.execCommand('removeFormat', false, null);
    } else {
      document.execCommand(command, false, null);
    }
    setFormHtmlContent(editor.innerHTML);
  };

  const handleInsertVariable = (variable) => {
    const editor = htmlEditorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    const variableText = `{{${variable}}}`;
    if (!selection || selection.rangeCount === 0) {
      editor.appendChild(document.createTextNode(variableText));
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(variableText));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    setFormHtmlContent(editor.innerHTML);
  };

  const handleInsertVariableToSubject = (variable) => {
    const input = subjectInputRef.current;
    const variableText = `{{${variable}}}`;
    if (!input) {
      setFormSubject((prev) => `${prev}${variableText}`);
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const newValue = `${input.value.slice(0, start)}${variableText}${input.value.slice(end)}`;
    setFormSubject(newValue);
    // Đưa caret về sau biến được chèn
    window.requestAnimationFrame(() => {
      input.focus();
      const caret = start + variableText.length;
      input.setSelectionRange(caret, caret);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const htmlTrim = formHtmlContent?.trim();
    if (!htmlTrim) {
      setError('Nội dung email là bắt buộc.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (isNew) {
        await createEmailTemplate({
          code: formCode.trim(),
          name: formName.trim(),
          subject: formSubject.trim(),
          htmlContent: htmlTrim,
          fromName: formFromName.trim() || undefined,
          isActive: formIsActive,
        });
        setSuccess('Tạo template thành công.');
        navigate('/app/admin/email-templates');
      } else {
        await updateEmailTemplate(id, {
          subject: formSubject.trim(),
          htmlContent: htmlTrim,
          fromName: formFromName.trim() || undefined,
          isActive: formIsActive,
        });
        setSuccess('Cập nhật thành công.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (isNew) return;
    setError('');
    try {
      const data = await previewEmailTemplate(id, { sampleData: DEFAULT_SAMPLE });
      setPreviewData(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Preview thất bại');
    }
  };

  const handleSendTest = async () => {
    if (isNew) return;
    setSendingTest(true);
    setError('');
    try {
      await sendTestEmail(id, { toEmail: testEmail || undefined });
      setSuccess('Email test đã được đưa vào hàng đợi.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gửi test thất bại');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return <p className={styles.adminEmailTemplateFormPage__loading}>Đang tải...</p>;
  }

  return (
    <div className={styles.adminEmailTemplateFormPage}>
      <header className={styles.adminEmailTemplateFormPage__header}>
        <h1 className={styles.adminEmailTemplateFormPage__title}>
          {isNew ? 'Thêm template' : `Sửa: ${formName || formCode}`}
        </h1>
      </header>

      {success && <div className={styles.adminEmailTemplateFormPage__success}>{success}</div>}
      {error && <div className={styles.adminEmailTemplateFormPage__error} role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className={styles.adminEmailTemplateFormPage__form}>
        <label>Code <span className={styles.adminEmailTemplateFormPage__required}>*</span></label>
        {isNew ? (
          <>
            <input
              type="text"
              value={formCode}
              readOnly
              required
              placeholder="Chọn một code bên dưới"
            />
            <div className={styles.adminEmailTemplateFormPage__codePills}>
              {ALLOWED_TEMPLATE_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={
                    code === formCode
                      ? styles.adminEmailTemplateFormPage__codePillActive
                      : styles.adminEmailTemplateFormPage__codePill
                  }
                  onClick={() => setFormCode(code)}
                >
                  <span className={styles.adminEmailTemplateFormPage__codePillCode}>{code}</span>
                  <span className={styles.adminEmailTemplateFormPage__codePillLabel}>
                    {TEMPLATE_CODE_LABELS[code]}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <input
            type="text"
            value={formCode}
            disabled
          />
        )}
        <label>Tên <span className={styles.adminEmailTemplateFormPage__required}>*</span></label>
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="VD: Mời phỏng vấn"
          required
          disabled={!isNew}
        />
        <label>Subject <span className={styles.adminEmailTemplateFormPage__required}>*</span></label>
        <input
          type="text"
          ref={subjectInputRef}
          value={formSubject}
          onChange={(e) => setFormSubject(e.target.value)}
          placeholder="VD: Mời phỏng vấn - {{job_title}}"
          required
        />
        <div className={styles.adminEmailTemplateFormPage__variableRow}>
          <span className={styles.adminEmailTemplateFormPage__variableLabel}>Chèn biến vào subject (auto-fill):</span>
          <div className={styles.adminEmailTemplateFormPage__variableList}>
            {systemVariables.map((v) => (
              <button
                key={v}
                type="button"
                className={styles.adminEmailTemplateFormPage__variableTag}
                onClick={() => handleInsertVariableToSubject(v)}
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>
        {manualVariables.length > 0 && (
          <div className={styles.adminEmailTemplateFormPage__variableRow}>
            <span className={styles.adminEmailTemplateFormPage__variableLabel}>
              Biến HR nhập tay khi gửi:
            </span>
            <div className={styles.adminEmailTemplateFormPage__variableList}>
              {manualVariables.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={styles.adminEmailTemplateFormPage__variableTag}
                  onClick={() => handleInsertVariableToSubject(v)}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
        )}
        <label>Nội dung email <span className={styles.adminEmailTemplateFormPage__required}>*</span></label>
        <div className={styles.adminEmailTemplateFormPage__htmlField}>
          <div className={styles.adminEmailTemplateFormPage__htmlToolbar}>
            <span className={styles.adminEmailTemplateFormPage__htmlToolbarLabel}>Định dạng:</span>
            <button type="button" onClick={() => handleEditorCommand('bold')}>B</button>
            <button type="button" onClick={() => handleEditorCommand('italic')}>I</button>
            <button type="button" onClick={() => handleEditorCommand('underline')}>U</button>
            <button type="button" onClick={() => handleEditorCommand('insertUnorderedList')}>• Danh sách</button>
            <button type="button" onClick={() => handleEditorCommand('createLink')}>Link</button>
            <button type="button" onClick={() => handleEditorCommand('removeFormat')}>Xoá định dạng</button>
          </div>
          <div className={styles.adminEmailTemplateFormPage__variableRow}>
            <span className={styles.adminEmailTemplateFormPage__variableLabel}>Chèn biến (auto-fill):</span>
            <div className={styles.adminEmailTemplateFormPage__variableList}>
              {systemVariables.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={styles.adminEmailTemplateFormPage__variableTag}
                  onClick={() => handleInsertVariable(v)}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
          {manualVariables.length > 0 && (
            <div className={styles.adminEmailTemplateFormPage__variableRow}>
              <span className={styles.adminEmailTemplateFormPage__variableLabel}>
                Biến HR nhập tay khi gửi:
              </span>
              <div className={styles.adminEmailTemplateFormPage__variableList}>
                {manualVariables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={styles.adminEmailTemplateFormPage__variableTag}
                    onClick={() => handleInsertVariable(v)}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div
            ref={htmlEditorRef}
            className={styles.adminEmailTemplateFormPage__htmlEditor}
            contentEditable
            onInput={(e) => setFormHtmlContent(e.currentTarget.innerHTML)}
          />
        </div>
        <label>From Name (tùy chọn)</label>
        <input
          type="text"
          value={formFromName}
          onChange={(e) => setFormFromName(e.target.value)}
          placeholder="VD: HR Team"
        />
        <label className={styles.adminEmailTemplateFormPage__checkboxLabel}>
          <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
          Đang hoạt động
        </label>

        <div className={styles.adminEmailTemplateFormPage__formActions}>
          <button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
          {!isNew && (
            <>
              <button type="button" onClick={handlePreview}>Xem trước</button>
              <div className={styles.adminEmailTemplateFormPage__testSection}>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Email nhận test (để trống = email của bạn)"
                />
                <button type="button" onClick={handleSendTest} disabled={sendingTest}>
                  {sendingTest ? 'Đang gửi...' : 'Gửi test'}
                </button>
              </div>
            </>
          )}
        </div>
      </form>

      {previewData && (
        <div className={styles.adminEmailTemplateFormPage__preview}>
          <h3>Preview</h3>
          <p><strong>Subject:</strong> {previewData.subject}</p>
          <div
            className={styles.adminEmailTemplateFormPage__previewBody}
            dangerouslySetInnerHTML={{ __html: previewData.htmlContent || '' }}
          />
          <button type="button" onClick={() => setPreviewData(null)}>Đóng</button>
        </div>
      )}
    </div>
  );
}
