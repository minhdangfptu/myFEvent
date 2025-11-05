import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../contexts/NotificationsContext";
import { toast } from "react-toastify";

export default function UserHeader({
  title,
  showSearch = false,
  showEventAction = false,
  onSearch,
  onEventAction,
}) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const unread = notifications.filter((n) => n.unread).slice(0, 5);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/landingpage?toast=logout-success";
    } catch (error) {
      toast.error("Có lỗi xảy ra khi đăng xuất");
    }
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
      `}</style>

      {/* Header */}
      <header className="bg-white shadow-sm p-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <h5 className="mb-0 text-muted">{title}</h5>
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
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {unread.length === 0 && (
                  <div className="px-3 py-3 text-secondary">
                    Không có thông báo mới
                  </div>
                )}
                {unread.map((n) => (
                  <div
                    key={n.id}
                    className="px-3 py-3 border-bottom d-flex align-items-start gap-2"
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
                      <div className="text-secondary small">Vừa xong</div>
                    </div>
                    <span
                      className="bg-primary rounded-circle"
                      style={{ width: 8, height: 8 }}
                    />
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
