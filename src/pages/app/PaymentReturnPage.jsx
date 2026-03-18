import { Link, useSearchParams } from 'react-router-dom';
import styles from '../../styles/components/PaymentReturnPage.module.css';

/**
 * Trang xử lý redirect từ VNPAY sau khi thanh toán.
 * Backend xử lý callback VNPAY rồi redirect về đây với ?status=success|failed
 */
export function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || '';

  const isSuccess = status.toLowerCase() === 'success';

  return (
    <div className={styles.paymentReturnPage}>
      <div className={styles.paymentReturnPage__card}>
        {isSuccess ? (
          <>
            <h1 className={styles.paymentReturnPage__titleSuccess}>
              Thanh toán thành công
            </h1>
            <p className={styles.paymentReturnPage__message}>
              Giao dịch của bạn đã được xử lý. Gói subscription sẽ được kích hoạt trong thời gian sớm nhất.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.paymentReturnPage__titleFailed}>
              Thanh toán thất bại
            </h1>
            <p className={styles.paymentReturnPage__message}>
              Giao dịch không thành công. Bạn có thể thử thanh toán lại hoặc liên hệ hỗ trợ.
            </p>
          </>
        )}
        <div className={styles.paymentReturnPage__actions}>
          <Link to="/app/admin/subscription" className={styles.paymentReturnPage__link}>
            Xem gói đăng ký
          </Link>
          <Link to="/app/admin/plans" className={styles.paymentReturnPage__linkSecondary}>
            Chọn gói khác
          </Link>
        </div>
      </div>
    </div>
  );
}
