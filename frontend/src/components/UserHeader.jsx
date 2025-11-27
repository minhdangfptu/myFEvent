import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../contexts/NotificationsContext";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { timeAgo } from "../utils/timeAgo";

export default function UserHeader({
  title,
  showSearch = false,
  showEventAction = false,
  onSearch,
  onEventAction,
}) {
  const { user, logout, setUser } = useAuth();
  const { t } = useTranslation();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const navigate = useNavigate();

  // Sắp xếp thông báo mới nhất lên trước, hiển thị tất cả (có scroll),
  // nhưng giới hạn chiều cao để nhìn giống ~3 thông báo như hiện tại.
  const sortedNotifications = [...notifications].sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return db - da;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeFormat, setTimeFormat] = useState(() => {
    return localStorage.getItem('timeFormat') || '24h';
  });

  useEffect(() => {
    localStorage.setItem('timeFormat', timeFormat);
  }, [timeFormat]);
  
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/landingpage?toast=logout-success";
    } catch (error) {
      toast.error("Có lỗi xảy ra khi đăng xuất");
    }
  };
  
  // Cập nhật thời gian mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Toggle time format
  const toggleTimeFormat = () => {
    setTimeFormat(prev => prev === '24h' ? '12h' : '24h');
  };

  const getNotificationTargetUrl = (n) => {
    // Backend can optionally send a direct URL
    if (n.targetUrl) return n.targetUrl;

    // Calendar notifications
    if (n.eventId && n.category === 'LỊCH HỌP') {
      return `/events/${n.eventId}/my-calendar`;
    }

    // Ưu tiên điều hướng về đúng công việc được giao nếu có taskId + eventId
    if (n.eventId && n.relatedTaskId) {
      return `/events/${n.eventId}/tasks/${n.relatedTaskId}`;
    }

    // Các thông báo về thành viên tham gia / rời sự kiện
    if (n.eventId && n.category === "THÀNH VIÊN") {
      // Trang chi tiết sự kiện cho member
      return `/home-page/events/${n.eventId}`;
    }

    // Mặc định nếu có eventId thì đưa về trang chi tiết sự kiện
    if (n.eventId) {
      return `/home-page/events/${n.eventId}`;
    }

    // Fallback: về trang danh sách thông báo
    return "/notifications";
  };

  const handleNotificationClick = (n) => {
    // Đánh dấu đã đọc
    if (n.id) {
      markRead(n.id);
    }
    // Điều hướng tới trang phù hợp
    const url = getNotificationTargetUrl(n);
    navigate(url);
  };

  // Format time display
  const formatTime = () => {
    if (timeFormat === '24h') {
      return currentTime.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else {
      return currentTime.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  // Format date display - rút gọn
  const formatDate = () => {
    const day = currentTime.toLocaleDateString("vi-VN", { weekday: "long" });
    
    // Đảm bảo ngày và tháng luôn có 2 chữ số
    const dayNum = currentTime.getDate().toString().padStart(2, '0');
    const monthNum = (currentTime.getMonth() + 1).toString().padStart(2, '0');
    const year = currentTime.getFullYear();
    
    return `${day}, ${dayNum}/${monthNum}/${year}`;
  };

  return (
    <>
      <style>{`
        .brand-red      { color:#EF4444; }
        .btn-brand-red  { background:#EF4444; color:#fff; border:none; }
        .btn-brand-red:hover { background:#DC2626; color:#fff; }

        .soft-input { background:#F9FAFB; border:1px solid #E5E7EB; height:44px; border-radius:12px; transition:.2s; }
        .soft-input:focus { background:#fff; border-color:#EF4444; box-shadow:0 0 0 3px rgba(239,68,68,0.1); }

        .dropdown-menu-red {
          border:1px solid #F3F4F6;
          border-radius:12px;
          box-shadow:0 12px 24px rgba(0,0,0,.08);
          padding:6px;
        }
        .dropdown-menu-red .dropdown-item {
          border-radius:8px;
          padding:8px 12px;
        }
        .dropdown-menu-red .dropdown-item:hover,
        .dropdown-menu-red .dropdown-item:focus {
          background:#FEE2E2;
          color:#991B1B;
        }
        .dropdown-menu-red .dropdown-item.active {
          background:#FEE2E2;
          color:#991B1B;
        }
        .dropdown-menu-red .dropdown-divider {
          margin:.35rem .25rem;
        }

        .btn-ghost {
          background:#fff;
          border:1px solid #E5E7EB;
          color:#374151;
        }
        .btn-ghost:hover {
          background:#F9FAFB;
          color:#111827;
        }

        /* Styles cho phần thời gian */
        .time-display {
          background: none;
          border-radius: 10px;
          padding: 8px 16px;
          color: #212529BF;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .time-display:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .time-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .time-text {
          font-size: 18px;
          font-weight: 600;
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          letter-spacing: 0.5px;
        }

        .date-text {
          font-size: 13px;
          font-weight: 400;
          opacity: 0.9;
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .time-separator {
          width: 1px;
          height: 20px;
          background: rgba(0, 0, 0, 0.3);
        }

        /* Responsive cho mobile */
        @media (max-width: 768px) {
          .time-display {
            padding: 6px 12px;
          }
          
          .time-text {
            font-size: 16px;
          }
          
          .date-text {
            display: none; /* Ẩn ngày trên mobile */
          }
          
          .time-separator {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .time-wrapper {
            gap: 8px;
          }
        }

        /* Animation cho số giây */
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .time-seconds {
          animation: pulse 1s ease-in-out infinite;
        }

        /* Tooltip style */
        .time-tooltip {
          position: relative;
        }

        .time-tooltip::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }

        .time-tooltip:hover::after {
          opacity: 1;
        }
      `}</style>

      {/* Header */}
      <header className="bg-white shadow-sm p-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <h5 className="mb-0 text-muted">{title}</h5>
        </div>
        
        {/* Phần thời gian được cải thiện */}
        <div 
          className="time-display time-tooltip"
          onClick={toggleTimeFormat}
          data-tooltip={`Múi giờ: GMT+7 • Click để đổi format ${timeFormat === '24h' ? '12h' : '24h'}`}
        >
          <div className="time-wrapper">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-clock" style={{ fontSize: '16px' }}></i>
              <span className="time-text">
                {formatTime()}
                {timeFormat === '24h' && (
                  <>:<span className="time-seconds">
                    {currentTime.toLocaleTimeString("vi-VN", {
                      second: "2-digit",
                    }).slice(-2)}
                  </span></>
                )}
              </span>
            </div>
            <div className="time-separator"></div>
            <div className="date-text">
              {formatDate()}
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="dropdown">
            <button
              className="btn btn-ghost position-relative"
              aria-label={t("nav.notifications")}
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="bi bi-bell"></i>
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {unreadCount}
                </span>
              )}
            </button>
            <div
              className="dropdown-menu dropdown-menu-end p-0"
              style={{ width: 360 }}
            >
              <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                <div className="fw-semibold">Thông báo</div>
                <button
                  className="btn btn-link btn-sm text-decoration-none"
                  onClick={markAllRead}
                >
                  Đánh dấu tất cả đã đọc
                </button>
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {sortedNotifications.length === 0 && (
                  <div className="px-3 py-3 text-secondary">
                    Không có thông báo mới
                  </div>
                )}
                {sortedNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="px-3 py-3 border-bottom d-flex align-items-start gap-2"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="mt-1">
                      <i className={n.icon} style={{ color: "#ef4444" }} />
                    </div>
                    <div className="flex-grow-1">
                      <div>
                        <span
                          className="badge rounded-pill me-2"
                          style={{ background: n.color + "22", color: n.color }}
                        >
                          {n.category}
                        </span>
                        <span
                          className="fw-semibold"
                          style={{ color: "#111827" }}
                        >
                          {n.title}
                        </span>
                      </div>
                      <div className="text-secondary small">
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {n.unread && (
                      <span
                        className="bg-primary rounded-circle"
                        style={{ width: 8, height: 8 }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 text-center">
                <a href="/notifications" className="text-decoration-none">
                  Xem tất cả
                </a>
              </div>
            </div>
          </div>

          {/* Account dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-ghost dropdown-toggle d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Mở menu tài khoản"
            >
              <i className="bi bi-person"></i>
              <span
                className="text-muted"
                style={{
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={user?.fullName || user?.name || user?.email || "Account"}
              >
                {user?.fullName || user?.name || user?.email || "Account"}
              </span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-red">
              <li>
                <a className="dropdown-item" href="/user-profile">
                  {t("nav.profile")}
                </a>
              </li>
              <li>
                <a className="dropdown-item" href="/setting">
                  {t("nav.settings")}
                </a>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  {t("actions.logout")}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>
    </>
  );
}