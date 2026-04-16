import { useEffect } from 'react';
import styles from '../styles/components/ConfirmModal.module.css';

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  message = 'Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.',
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  variant = 'danger',
  loading = false,
}) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  return (
    <div
      className={styles.confirmOverlay}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.confirmBox}>
        <div className={`${styles.confirmIcon} ${variant === 'danger' ? styles.confirmIcon_danger : styles.confirmIcon_warn}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className={styles.confirmTitle}>{title}</h3>
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmActions}>
          <button
            type="button"
            className={styles.confirmCancel}
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`${styles.confirmBtn} ${variant === 'danger' ? styles.confirmBtn_danger : styles.confirmBtn_primary}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
