import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../contexts/NotificationsContext";
import { useEvents } from "../contexts/EventContext";
import { eventService } from "../services/eventService";
import { toast } from "react-toastify";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { timeAgo } from "../utils/timeAgo";
import { Clock, Bell, User, Info } from "lucide-react";
import loadingGif from "../assets/loading.gif";

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
  const { fetchEventRole, forceCheckEventAccess } = useEvents();
  const navigate = useNavigate();

  
  const sortedNotifications = [...notifications].sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return db - da;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [accessDeniedEventName, setAccessDeniedEventName] = useState('');
  const [timeFormat, setTimeFormat] = useState(() => {
    return localStorage.getItem('timeFormat') || '24h';
  });
  const isNavigatingRef = useRef(false);
  const lastClickedNotificationRef = useRef({ key: null, timestamp: 0 });
  

  useEffect(() => {
    localStorage.setItem('timeFormat', timeFormat);
  }, [timeFormat]);

  const handleLogout = async () => {
    // Create loading overlay directly in body to persist during route changes
    const overlay = document.createElement('div');
    overlay.id = 'logout-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(255, 255, 255, 1);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 1rem;
    `;

    overlay.innerHTML = `
      <img
        src="${loadingGif}"
        alt="Loading..."
        style="width: 120px; height: auto;"
      />
      <div style="font-size: 1.1rem; font-weight: 500; color: #6b7280;">
        Đang đăng xuất...
      </div>
    `;

    document.body.appendChild(overlay);

    try {
      // Wait for logout to complete (clears storage and calls API)
      await logout();
      // Redirect to landingpage after logout completes
      window.location.href = "/landingpage?toast=logout-success";
    } catch (error) {
      // Remove overlay on error
      const overlayEl = document.getElementById('logout-overlay');
      if (overlayEl) overlayEl.remove();
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

  // Listen for user profile updates
  useEffect(() => {
    const handleUserUpdate = (event) => {
      if (event.detail && setUser) {
        setUser(event.detail);
      }
    };

    window.addEventListener('user-updated', handleUserUpdate);
    return () => window.removeEventListener('user-updated', handleUserUpdate);
  }, [setUser]);

  const getNotificationTargetUrl = (n) => {
    if (n.targetUrl) {
      let url = n.targetUrl.startsWith('/') ? n.targetUrl : `/${n.targetUrl}`;
      
      
      url = url.replace(
        /\/events\/([^/]+)\/departments\/([^/]+)\/budget\/([^/]+)\/review$/,
        '/events/$1/departments/$2/budget/review'
      );
      
      return url;
    }

    // TÀI CHÍNH notifications
    if (n.eventId && n.category === 'TÀI CHÍNH') {
      if (n.relatedBudgetId) {
        
        return `/home-page/events/${n.eventId}`;
      }
      if (n.relatedExpenseId) {
      
        return `/home-page/events/${n.eventId}`;
      }
    }

    if (n.eventId && n.category === 'PHẢN HỒI') {
      if (n.relatedFeedbackId) {
        return `/events/${n.eventId}/feedback/member`;
      }
    }

    if (n.eventId && n.category === 'RỦI RO') {
      if (n.relatedRiskId) {
        return `/events/${n.eventId}/risks/detail/${n.relatedRiskId}`;
      }
      return `/events/${n.eventId}/risks`;
    }

    if (n.eventId && n.category === 'LỊCH HỌP') {
      if (n.relatedCalendarId) {
        return `/events/${n.eventId}/my-calendar`;
      }
      if (n.relatedAgendaId && n.relatedMilestoneId) {
        return `/events/${n.eventId}/milestones/${n.relatedMilestoneId}/agenda/${n.relatedAgendaId}`;
      }
      return `/events/${n.eventId}/my-calendar`;
    }

    if (n.eventId && n.category === "CÔNG VIỆC") {
      if (n.relatedTaskId) {
        return `/events/${n.eventId}/tasks/${n.relatedTaskId}`;
      }
      return `/events/${n.eventId}/tasks`;
    }

    if (n.eventId && n.category === "THÀNH VIÊN") {
      return `/events/${n.eventId}/members`;
    }

    if (n.eventId) {
      return `/home-page/events/${n.eventId}`;
    }

    return "/notifications";
  };

  // Helper function to extract eventId from URL
  const extractEventIdFromUrl = (url) => {
    if (!url) return null
    // Match pattern: /events/{eventId}/... or /home-page/events/{eventId}
    // Try multiple patterns to catch all cases
    const patterns = [
      /\/events\/([^/?]+)/,           // /events/{eventId}/...
      /\/home-page\/events\/([^/?]+)/, // /home-page/events/{eventId}
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    return null
  }

  const handleNotificationClick = async (n) => {
    // Prevent multiple clicks on the same notification
    const notificationKey = `${n.id}-${n.eventId}-${n.category}`;
    const now = Date.now();
    
    // If same notification clicked within 1 second, ignore
    if (lastClickedNotificationRef.current === notificationKey && 
        (now - (lastClickedNotificationRef.current.timestamp || 0)) < 1000) {
      return;
    }
    
    // If already navigating, ignore
    if (isNavigatingRef.current) {
      return;
    }
    
    // Mark as clicked
    lastClickedNotificationRef.current = {
      key: notificationKey,
      timestamp: now
    };
    
    if (n.id) {
      markRead(n.id);
    }
    
    // CRITICAL: Check access BEFORE navigating to avoid 403/404 errors
    // Step 1: Get the target URL first (to extract eventId from it if needed)
    const url = getNotificationTargetUrl(n)
    
    // Step 2: Extract eventId from multiple sources
    let eventIdToCheck = n.eventId
    
    // If no eventId in notification, try to extract from targetUrl
    if (!eventIdToCheck && n.targetUrl) {
      eventIdToCheck = extractEventIdFromUrl(n.targetUrl)
    }
    
    // If still no eventId, extract from the generated URL
    if (!eventIdToCheck && url) {
      eventIdToCheck = extractEventIdFromUrl(url)
    }
    
    // Step 3: If we found an eventId, ALWAYS check access before navigating
    if (eventIdToCheck) {
      try {
        // CRITICAL: Use forceCheckEventAccess to bypass cache and get fresh role
        // This ensures we check the current access status, not cached old data
        const role = await forceCheckEventAccess(eventIdToCheck)
        
        // Check if role is valid (not empty, not null, not undefined, and is a non-empty string)
        // Any non-empty string role means user has access to the event
        const hasAccess = role && typeof role === 'string' && role.trim() !== ''
        
        if (!hasAccess) {
          // Set event name first (try to fetch, but don't wait if it fails)
          setAccessDeniedEventName('sự kiện này') // Set default first
          
          // Use setTimeout to ensure state update happens before return
          // This ensures React has time to render the modal
          setTimeout(() => {
            setShowAccessDeniedModal(true) // Show modal immediately
          }, 0)
          
          // Try to fetch event name in background (non-blocking)
          // CRITICAL: Add skipGlobal404 to prevent interceptor redirect
          eventService.fetchEventById(eventIdToCheck, { skipGlobal404: true, skipGlobal403: true })
            .then(event => {
              const eventName = event?.name || event?.title || 'sự kiện này'
              setAccessDeniedEventName(eventName)
            })
            .catch(() => {
              // Keep default name
            })
          
          // CRITICAL: Return early to prevent navigation - this is the key fix
          return
        }
        // User has access, continue to navigate below
      } catch (error) {
        // If role check fails, assume no access and show modal
        setAccessDeniedEventName('sự kiện này')
        setShowAccessDeniedModal(true)
        
        // Try to fetch event name in background (non-blocking)
        // CRITICAL: Add skipGlobal404 to prevent interceptor redirect
        eventService.fetchEventById(eventIdToCheck, { skipGlobal404: true, skipGlobal403: true })
          .then(event => {
            const eventName = event?.name || event?.title || 'sự kiện này'
            setAccessDeniedEventName(eventName)
          })
          .catch(() => {
            // Keep default name
          })
        
        // CRITICAL: Return early to prevent navigation
        return
      }
    }
    
    // Only navigate if:
    // 1. User has access (checked above), OR
    // 2. Notification has no eventId in URL (safe to navigate)
    
    // Mark as navigating to prevent duplicate clicks
    isNavigatingRef.current = true;
    
    // Navigate
    navigate(url);
    
    // Reset navigating flag after a short delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  };

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

  const formatDate = () => {
    const day = currentTime.toLocaleDateString("vi-VN", { weekday: "long" });
    
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
              <Clock size={16} />
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
              <Bell size={20} />
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
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      await handleNotificationClick(n)
                    }}
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
              <User size={20} />
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
              {!location.pathname.startsWith('/admin') && (
                <>
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
                </>
              )}
              <li>
                <button className="dropdown-item" onClick={handleLogout}>
                  {t("actions.logout")}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Access Denied Modal */}
      {showAccessDeniedModal && (
        <div
          className="modal show d-block"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            zIndex: 99999, 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }}
          onClick={() => {
            setShowAccessDeniedModal(false)
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <h5 className="modal-title fw-bold" style={{ color: '#111827' }}>
                  Không có quyền truy cập
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAccessDeniedModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div className="d-flex align-items-start gap-3">
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Info size={24} style={{ color: '#EF4444' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="mb-0" style={{ fontSize: '16px', color: '#374151', lineHeight: '1.6' }}>
                      Xin lỗi nhưng bạn hiện đang không ở trong sự kiện <strong>{accessDeniedEventName}</strong> nữa, vui lòng liên hệ đến trưởng ban tổ chức sự kiện để được tham gia.
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowAccessDeniedModal(false)
                    navigate('/home-page')
                  }}
                  style={{ borderRadius: '8px' }}
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}