import { Link, Navigate } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '../store/authStore';
import styles from '../styles/components/LandingPage.module.css';

export function LandingPage() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className={styles.landingPage}>
      <header className={styles.landingPage__header}>
        <Link to="/" className={styles.landingPage__brand}>
          JobTracker ATS
        </Link>
        <nav className={styles.landingPage__nav}>
          <Link to="/auth/login" className={styles.landingPage__navLink}>
            Đăng nhập
          </Link>
          <Link to="/auth/register" className={styles.landingPage__navLinkPrimary}>
            Đăng ký
          </Link>
        </nav>
      </header>
      <main className={styles.landingPage__main}>
        <section className={styles.landingPage__hero}>
          <div className={styles.landingPage__heroInner}>
            <div className={styles.landingPage__heroContent}>
              <div className={styles.landingPage__heroEyebrow}>ATS cho Startup & SME</div>
              <h1 className={styles.landingPage__title}>
                Quản lý tuyển dụng gọn gàng cho Startup & SME
              </h1>
              <p className={styles.landingPage__subtitle}>
                JobTracker ATS giúp HR gom CV, chấm điểm ứng viên, kéo thả pipeline và gửi email cho
                ứng viên chỉ trong một hệ thống – không còn Excel rời rạc.
              </p>
              <div className={styles.landingPage__actions}>
                <Link to="/auth/register" className={styles.landingPage__primaryLink}>
                  Dùng thử miễn phí 30 ngày
                </Link>
                <Link to="/auth/login" className={styles.landingPage__secondaryLink}>
                  Đã có tài khoản? Đăng nhập
                </Link>
              </div>
              <p className={styles.landingPage__hint}>
                Không cần thẻ tín dụng · Dành cho team tuyển dụng nhỏ và vừa
              </p>
              <div className={styles.landingPage__heroStats}>
                <div className={styles.landingPage__heroStatItem}>
                  <span className={styles.landingPage__heroStatNumber}>5x</span>
                  <span className={styles.landingPage__heroStatLabel}>Nhanh hơn Excel</span>
                </div>
                <div className={styles.landingPage__heroStatItem}>
                  <span className={styles.landingPage__heroStatNumber}>100%</span>
                  <span className={styles.landingPage__heroStatLabel}>Không bỏ sót ứng viên</span>
                </div>
                <div className={styles.landingPage__heroStatItem}>
                  <span className={styles.landingPage__heroStatNumber}>30 ngày</span>
                  <span className={styles.landingPage__heroStatLabel}>Dùng thử miễn phí</span>
                </div>
              </div>
            </div>
            <div className={styles.landingPage__heroVisual}>
              <div className={styles.landingPage__heroBoard}>
                <div className={styles.landingPage__heroBoardHeader}>
                  <span className={styles.landingPage__heroBoardTitle}>Pipeline ứng tuyển thực tế</span>
                  <span className={styles.landingPage__heroBoardTag}>Đang hoạt động</span>
                </div>
                <div className={styles.landingPage__heroBoardColumns}>
                  <div className={styles.landingPage__heroBoardColumn}>
                    <div className={styles.landingPage__heroBoardColumnTitle}>APPLIED – Mới nộp</div>
                    <div className={styles.landingPage__heroBoardChip}>12 ứng viên mới</div>
                    <div className={styles.landingPage__heroBoardCard} />
                    <div className={styles.landingPage__heroBoardCard} />
                  </div>
                  <div className={styles.landingPage__heroBoardColumn}>
                    <div className={styles.landingPage__heroBoardColumnTitle}>SCREENING – Sàng lọc</div>
                    <div className={styles.landingPage__heroBoardChip}>6 đang sàng lọc</div>
                    <div className={styles.landingPage__heroBoardCard} />
                    <div className={styles.landingPage__heroBoardCard} />
                  </div>
                  <div className={styles.landingPage__heroBoardColumn}>
                    <div className={styles.landingPage__heroBoardColumnTitle}>INTERVIEW – Phỏng vấn</div>
                    <div className={styles.landingPage__heroBoardChip}>3 lịch tuần này</div>
                    <div className={styles.landingPage__heroBoardCard} />
                    <div className={styles.landingPage__heroBoardCard} />
                  </div>
                  <div className={styles.landingPage__heroBoardColumn}>
                    <div className={styles.landingPage__heroBoardColumnTitle}>OFFER – Đề nghị</div>
                    <div className={styles.landingPage__heroBoardChip}>2 offer đang gửi</div>
                    <div className={styles.landingPage__heroBoardCard} />
                    <div className={styles.landingPage__heroBoardCard} />
                  </div>
                  <div className={styles.landingPage__heroBoardColumn}>
                    <div className={styles.landingPage__heroBoardColumnTitle}>HIRED – Trúng tuyển</div>
                    <div className={styles.landingPage__heroBoardChip}>1 hired tháng này</div>
                    <div className={styles.landingPage__heroBoardCard} />
                    <div className={styles.landingPage__heroBoardCard} />
                  </div>
                </div>
                <div className={styles.landingPage__heroBoardFooter}>
                  <span className={styles.landingPage__heroBoardFooterLabel}>REJECTED – Từ chối</span>
                  <span className={styles.landingPage__heroBoardFooterValue}>4 ứng viên</span>
                </div>
              </div>
              <div className={styles.landingPage__heroFloatingCard}>
                <div className={styles.landingPage__heroFloatingLabel}>Ứng viên phù hợp nhất</div>
                <div className={styles.landingPage__heroFloatingRow}>
                  <span className={styles.landingPage__heroFloatingName}>Nguyễn Minh Anh</span>
                  <span className={styles.landingPage__heroFloatingScore}>92 điểm</span>
                </div>
                <p className={styles.landingPage__heroFloatingText}>
                  Đủ kỹ năng chính · Sẵn sàng phỏng vấn tuần này
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.landingPage__section}>
          <h2 className={styles.landingPage__sectionTitle}>Nhìn toàn bộ tuyển dụng trên một màn hình</h2>
          <p className={styles.landingPage__sectionSubtitle}>
            Pipeline, điểm phù hợp của ứng viên và trạng thái email đều nằm trong một dashboard đơn giản.
          </p>
          <div className={styles.landingPage__screenshot}>
            <div className={styles.landingPage__screenshotHeader}>
              <span className={styles.landingPage__screenshotDot} />
              <span className={styles.landingPage__screenshotDot} />
              <span className={styles.landingPage__screenshotDot} />
            </div>
            <div className={styles.landingPage__screenshotBody}>
              <img
                src="https://res.cloudinary.com/df0p3068i/image/upload/v1773411266/1622abba-afe0-4fa4-a042-e3e0998f1010.png"
                alt="Minh hoạ pipeline kéo thả, điểm phù hợp và trạng thái email trong JobTracker ATS"
                className={styles.landingPage__screenshotImage}
                loading="lazy"
              />
            </div>
            <p className={styles.landingPage__screenshotCaption}>
              Minh hoạ: Pipeline kéo thả, điểm phù hợp ứng viên và trạng thái email trong JobTracker ATS.
            </p>
          </div>
        </section>

        <section className={styles.landingPage__section}>
          <h2 className={styles.landingPage__sectionTitle}>Giảm thời gian tuyển dụng, không bỏ sót ứng viên tốt</h2>
          <p className={styles.landingPage__sectionSubtitle}>
            JobTracker tập trung vào 3 việc team tuyển dụng làm hằng ngày.
          </p>
          <div className={styles.landingPage__featureGrid}>
            <article className={styles.landingPage__featureCard}>
              <div className={styles.landingPage__featureBadge}>1. Chấm điểm CV tự động</div>
              <h3 className={styles.landingPage__featureTitle}>Biết ngay ai phù hợp mà không cần đọc hết CV</h3>
              <p className={styles.landingPage__featureText}>
                Mỗi ứng viên được gán một điểm phù hợp theo mô tả công việc. HR chỉ cần lọc những
                ứng viên có điểm cao thay vì phải mở từng file CV.
              </p>
              <ul className={styles.landingPage__featureList}>
                <li>Ưu tiên ứng viên có điểm cao trước</li>
                <li>Thấy ngay ứng viên thiếu kỹ năng nào</li>
                <li>Tự cập nhật khi HR upload CV mới</li>
              </ul>
            </article>

            <article className={styles.landingPage__featureCard}>
              <div className={styles.landingPage__featureBadge}>2. Pipeline kéo thả</div>
              <h3 className={styles.landingPage__featureTitle}>Nhìn rõ từng bước tuyển dụng</h3>
              <p className={styles.landingPage__featureText}>
                Ứng viên đi qua các bước: Nhận CV → Sàng lọc → Phỏng vấn → Offer → Trúng tuyển / Từ
                chối. HR chỉ cần kéo thả giữa các cột.
              </p>
              <ul className={styles.landingPage__featureList}>
                <li>Kéo thả giữa các bước trong pipeline</li>
                <li>Lịch sử di chuyển trạng thái ứng viên rõ ràng</li>
                <li>Quick actions: Đặt lịch phỏng vấn, Gửi offer, Từ chối</li>
              </ul>
            </article>

            <article className={styles.landingPage__featureCard}>
              <div className={styles.landingPage__featureBadge}>3. Email tự động</div>
              <h3 className={styles.landingPage__featureTitle}>Ứng viên luôn được thông báo đúng lúc</h3>
              <p className={styles.landingPage__featureText}>
                Khi nhận CV, mời phỏng vấn, gửi offer hay từ chối, hệ thống có thể tự gửi email theo
                mẫu có sẵn – HR không phải copy–paste mỗi lần.
              </p>
              <ul className={styles.landingPage__featureList}>
                <li>Mẫu email song ngữ có sẵn, chỉ cần dùng</li>
                <li>Tùy chọn: gửi tự động hoặc hỏi trước khi gửi</li>
                <li>Lịch sử email đã gửi để kiểm tra & resend</li>
              </ul>
            </article>
          </div>
        </section>

        <section className={styles.landingPage__section}>
          <h2 className={styles.landingPage__sectionTitle}>Quy trình tuyển dụng trong JobTracker</h2>
          <p className={styles.landingPage__sectionSubtitle}>
            Từ lúc ứng viên nộp CV đến khi gửi offer – tất cả nằm trong một luồng rõ ràng.
          </p>
          <ol className={styles.landingPage__workflow}>
            <li className={styles.landingPage__workflowItem}>
              <div className={styles.landingPage__workflowStepNumber}>1</div>
              <div>
                <div className={styles.landingPage__workflowContentTitle}>Nhận CV</div>
                <p className={styles.landingPage__workflowContentText}>
                  Ứng viên nộp CV qua form hoặc HR tạo thủ công.
                </p>
              </div>
            </li>
            <li className={styles.landingPage__workflowItem}>
              <div className={styles.landingPage__workflowStepNumber}>2</div>
              <div>
                <div className={styles.landingPage__workflowContentTitle}>Hệ thống chấm điểm</div>
                <p className={styles.landingPage__workflowContentText}>
                  Tự tính mức độ phù hợp dựa trên kỹ năng trong JD.
                </p>
              </div>
            </li>
            <li className={styles.landingPage__workflowItem}>
              <div className={styles.landingPage__workflowStepNumber}>3</div>
              <div>
                <div className={styles.landingPage__workflowContentTitle}>HR review nhanh</div>
                <p className={styles.landingPage__workflowContentText}>
                  Lọc những hồ sơ có điểm cao, xem missing skills.
                </p>
              </div>
            </li>
            <li className={styles.landingPage__workflowItem}>
              <div className={styles.landingPage__workflowStepNumber}>4</div>
              <div>
                <div className={styles.landingPage__workflowContentTitle}>Kéo thả pipeline</div>
                <p className={styles.landingPage__workflowContentText}>
                  Chuyển ứng viên qua Screening, Interview, Offer…
                </p>
              </div>
            </li>
            <li className={styles.landingPage__workflowItem}>
              <div className={styles.landingPage__workflowStepNumber}>5</div>
              <div>
                <div className={styles.landingPage__workflowContentTitle}>Gửi email</div>
                <p className={styles.landingPage__workflowContentText}>
                  Mời phỏng vấn, gửi offer hoặc thông báo kết quả.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.landingPage__section}>
          <h2 className={styles.landingPage__sectionTitle}>3 gói cho từng giai đoạn phát triển của team</h2>
          <p className={styles.landingPage__sectionSubtitle}>
            Bắt đầu từ gói Miễn phí, nâng cấp khi số lượng job và ứng viên tăng lên.
          </p>
          <div className={styles.landingPage__plans}>
            <div className={styles.landingPage__plan}>
              <h3 className={styles.landingPage__planName}>Miễn phí</h3>
              <p className={styles.landingPage__planPrice}>Miễn phí / 30 ngày</p>
              <p className={styles.landingPage__planDesc}>
                Dành cho team nhỏ muốn thử ATS trước khi triển khai rộng.
              </p>
              <ul className={styles.landingPage__featureList}>
                <li>Jobs: 3</li>
                <li>Users: 1</li>
                <li>Applications: 200</li>
              </ul>
            </div>
            <div className={styles.landingPage__plan}>
              <div className={styles.landingPage__planHighlight}>Phổ biến nhất</div>
              <h3 className={styles.landingPage__planName}>Pro</h3>
              <p className={styles.landingPage__planPrice}>299.000 đ / 30 ngày</p>
              <p className={styles.landingPage__planDesc}>
                Cho team tuyển dụng đang mở nhiều job cùng lúc.
              </p>
              <ul className={styles.landingPage__featureList}>
                <li>Jobs: 20</li>
                <li>Users: 10</li>
                <li>Applications: 5.000</li>
              </ul>
            </div>
            <div className={styles.landingPage__plan}>
              <h3 className={styles.landingPage__planName}>Enterprise</h3>
              <p className={styles.landingPage__planPrice}>599.000 đ / 30 ngày</p>
              <p className={styles.landingPage__planDesc}>
                Cho công ty có nhiều brand/địa điểm, cần không giới hạn.
              </p>
              <ul className={styles.landingPage__featureList}>
                <li>Jobs: Không giới hạn</li>
                <li>Users: Không giới hạn</li>
                <li>Applications: Không giới hạn</li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.landingPage__section}>
          <h2 className={styles.landingPage__sectionTitle}>Câu hỏi thường gặp</h2>
          <div className={styles.landingPage__faq}>
            <div className={styles.landingPage__faqItem}>
              <h3>JobTracker có cần cài đặt gì không?</h3>
              <p>Không. Đây là web app, chỉ cần tạo tài khoản là dùng được ngay trên trình duyệt.</p>
            </div>
            <div className={styles.landingPage__faqItem}>
              <h3>Có cần thẻ tín dụng để dùng thử không?</h3>
              <p>Không cần. Bạn có thể bắt đầu với gói Miễn phí, nâng cấp sau nếu thấy phù hợp.</p>
            </div>
            <div className={styles.landingPage__faqItem}>
              <h3>Hệ thống có tự nhắc lịch phỏng vấn không?</h3>
              <p>
                Có. Khi bạn tạo lịch phỏng vấn, hệ thống sẽ hiển thị trong dashboard và gửi thông báo giúp team không bỏ sót buổi phỏng vấn nào.
              </p>
            </div>
            <div className={styles.landingPage__faqItem}>
              <h3>JobTracker có gửi email trực tiếp cho ứng viên được không?</h3>
              <p>Có. Bạn có thể gửi email mời phỏng vấn, offer hoặc kết quả trực tiếp từ hệ thống.</p>
            </div>
          </div>
        </section>

        <section className={styles.landingPage__section}>
          <div className={styles.landingPage__finalCta}>
            <h2>Sẵn sàng bỏ Excel và quản lý tuyển dụng gọn gàng hơn?</h2>
            <p>
              Tạo tài khoản JobTracker ATS và dùng thử miễn phí 30 ngày. Bạn có thể dừng bất kỳ lúc nào.
            </p>
            <div className={styles.landingPage__finalActions}>
              <Link to="/auth/register" className={styles.landingPage__primaryLink}>
                Dùng thử miễn phí 30 ngày
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
