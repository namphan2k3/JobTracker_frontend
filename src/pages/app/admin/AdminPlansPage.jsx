import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { getSubscriptionPlans } from '../../../api/subscriptionPlans';
import { getCompanySubscription } from '../../../api/subscriptions';
import { createCompanySubscription } from '../../../api/companySubscriptions';
import { initPayment } from '../../../api/payments';
import styles from '../../../styles/components/AdminPlansPage.module.css';

function formatPrice(price) {
  if (price == null || price === 0) return 'Miễn phí';
  return `${Number(price).toLocaleString('vi-VN')} đ`;
}

function formatLimit(value) {
  if (value == null) return 'Không giới hạn';
  return value.toLocaleString('vi-VN');
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function AdminPlansPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId;
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingPlanId, setSubmittingPlanId] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getSubscriptionPlans(),
      companyId ? getCompanySubscription(companyId).catch((err) => {
        if (err.response?.status === 404) {
          return null;
        }
        throw err;
      }) : Promise.resolve(null),
    ])
      .then(([planList, subscription]) => {
        setPlans(planList);
        setCurrentSubscription(subscription);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Tải danh sách gói thất bại');
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSelectPlan = async (plan) => {
    if (!companyId) {
      setError('Không tìm thấy thông tin công ty.');
      return;
    }

    setSubmittingPlanId(plan.id);
    setError('');

    try {
      const now = new Date();
      const startDate = now.toISOString();
      const endDate =
        plan.durationDays > 0
          ? addDays(now, plan.durationDays).toISOString()
          : null;

      const subscription = await createCompanySubscription({
        companyId,
        planId: plan.id,
        startDate,
        endDate: endDate || undefined,
        status: 'PENDING',
      });

      const amount = Number(plan.price) || 0;

      if (amount > 0) {
        const { paymentUrl } = await initPayment({
          companyId,
          companySubscriptionId: subscription.id,
          amount,
          currency: 'VND',
          gateway: 'VNPAY',
        });

        if (paymentUrl) {
          window.location.href = paymentUrl;
          return;
        }
        setError('Không nhận được URL thanh toán. Vui lòng thử lại.');
      } else {
        navigate('/app/admin/subscription', {
          state: { message: 'Đăng ký gói miễn phí thành công.' },
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Đăng ký gói thất bại'
      );
    } finally {
      setSubmittingPlanId(null);
    }
  };

  return (
    <div className={styles.adminPlansPage}>
      <header className={styles.adminPlansPage__header}>
        <h1 className={styles.adminPlansPage__title}>Các gói đăng ký</h1>
        <p className={styles.adminPlansPage__subtitle}>
          Chọn gói phù hợp để nâng cấp và mở rộng quyền sử dụng
        </p>
      </header>

      {error && (
        <div className={styles.adminPlansPage__error} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.adminPlansPage__loading}>Đang tải...</p>
      ) : (
        <div className={styles.adminPlansPage__grid}>
          {(() => {
            const activePlans = plans
              .filter((p) => p.isActive !== false)
              .sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
            const currentPlanPrice = currentSubscription
              ? Number(
                  activePlans.find(
                    (p) =>
                      p.id === currentSubscription.planId ||
                      p.code === currentSubscription.planCode
                  )?.price ?? 0
                )
              : 0;

            return activePlans.map((plan) => {
              const isCurrent =
                currentSubscription &&
                (currentSubscription.planId === plan.id ||
                  currentSubscription.planCode === plan.code);
              const planPrice = Number(plan.price) || 0;
              const isLowerTier =
                !isCurrent && currentSubscription && planPrice < currentPlanPrice;
              const isDisabled =
                isCurrent || isLowerTier || submittingPlanId != null;

              let buttonLabel = 'Chọn gói';
              if (isCurrent) buttonLabel = 'Đang sử dụng';
              else if (submittingPlanId === plan.id) buttonLabel = 'Đang xử lý...';
              else if (isLowerTier) buttonLabel = 'Không thể hạ gói';

              return (
                <article
                  key={plan.id}
                  className={`${styles.adminPlansPage__card}${isCurrent ? ` ${styles.adminPlansPage__card_current}` : ''}${isLowerTier ? ` ${styles.adminPlansPage__card_disabled}` : ''}`}
                >
                  <h2 className={styles.adminPlansPage__planName}>
                    {plan.name || plan.code}
                    {isCurrent && (
                      <span className={styles.adminPlansPage__currentBadge}>
                        Gói hiện tại
                      </span>
                    )}
                  </h2>
                  <div className={styles.adminPlansPage__price}>
                    {formatPrice(plan.price)}
                    {plan.durationDays > 0 && (
                      <span className={styles.adminPlansPage__period}>
                        /{plan.durationDays} ngày
                      </span>
                    )}
                  </div>
                  <ul className={styles.adminPlansPage__features}>
                    <li>
                      <strong>Jobs:</strong> {formatLimit(plan.maxJobs)}
                    </li>
                    <li>
                      <strong>Users:</strong> {formatLimit(plan.maxUsers)}
                    </li>
                    <li>
                      <strong>Applications:</strong> {formatLimit(plan.maxApplications)}
                    </li>
                  </ul>
                  <button
                    type="button"
                    className={styles.adminPlansPage__selectButton}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isDisabled}
                  >
                    {buttonLabel}
                  </button>
                </article>
              );
            });
          })()}
        </div>
      )}

      {!loading && plans.length === 0 && !error && (
        <p className={styles.adminPlansPage__empty}>Chưa có gói nào.</p>
      )}
    </div>
  );
}
