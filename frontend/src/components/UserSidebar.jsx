import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { eventApi } from "../apis/eventApi";
import { useEvents } from "../contexts/EventContext";
import Loading from "./Loading";
import { APP_VERSION } from "../config";
import { ArrowLeft, Bell, HelpCircle, Menu, Moon, Settings, Sun, Home, User as UserIcon } from "lucide-react";


export default function UserSidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage = "home",
  eventId, // Nhận eventId qua props
}) {
  const [theme, setTheme] = useState("light");
  // UI state cho menu
  const [workOpen, setWorkOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const sidebarRef = useRef(null);
  // Hover popup (khi sidebar đóng)
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 76 });

  const { events, loading } = useEvents();
  const navigate = useNavigate();

  // Chỉ show loading khi chưa có events VÀ đang loading
  const showLoading = loading && events.length === 0;

  useEffect(() => {
    if (!sidebarOpen) {
      setWorkOpen(false);
      setFinanceOpen(false);
      setRisksOpen(false);
      setOverviewOpen(false);
    }
  }, [sidebarOpen]);

  useEffect(
    () => () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    },
    [hoverTimeout]
  );

  return (
    <div
      ref={sidebarRef}
      className={`shadow-sm ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      style={{
        width: sidebarOpen ? "230px" : "70px",
        height: "100vh",
        transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        background: "white",
        borderRadius: "0",
      }}
    >
      <style>{`
        .sidebar-logo { font-family:'Brush Script MT',cursive;font-size:1.5rem;font-weight:bold;color:#dc2626; }
        .group-title {
          font-size:.75rem;
          font-weight:600;
          letter-spacing:.05em;
          color:#374151;
          margin:16px 0 8px;
          text-transform:uppercase;
          opacity: 1;
          transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-closed .group-title {
          opacity: 0;
        }
        .btn-nav{ border:0;background:transparent;color:#374151;border-radius:8px;padding:10px 12px;text-align:left;
          transition:all .2s ease;width:100%;display:flex;align-items:center;justify-content:space-between;}
        .btn-nav:hover{ background:#e9ecef; }
        .btn-nav.active{ background:#e9ecef;color:#111827; }
        .btn-nav span {
          opacity: 1;
          transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-closed .btn-nav span {
          opacity: 0;
        }
        .menu-item-hover:hover .btn-nav{ background:#e9ecef; }
        .btn-submenu{ border:0;background:transparent;color:#6b7280;border-radius:6px;padding:8px 12px 8px 24px;
          text-align:left;transition:all .2s ease;width:100%;font-size:.9rem;}
        .btn-submenu:hover{ background:#f9fafb;color:#374151;}
        .btn-submenu.active{ background:#f3f4f6;color:#111827;}
        .theme-toggle{ display:flex;background:#f3f4f6;border-radius:8px;padding:4px;margin-top:16px;}
        .theme-option{ flex:1;padding:8px 12px;border:none;background:transparent;border-radius:6px;cursor:pointer;display:flex;
          align-items:center;justify-content:center;gap:6px;font-size:.85rem;color:#6b7280;transition:all .2s;}
        .theme-option.active{ background:#fff;color:#374151;box-shadow:0 1px 3px rgba(0,0,0,.1); }

        .menu-button {
          background: transparent;
          border: none;
          border-radius: 10px;
          padding: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #030303;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }
        .menu-button:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        .menu-button:active {
          background-color: rgba(0, 0, 0, 0.1);
          transform: scale(0.95);
        }
        .menu-button svg {
          transition: transform 0.2s ease;
        }

        .fade-content {
          opacity: 1;
          transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-closed .fade-content {
          opacity: 0;
          pointer-events: none;
        }

        .hover-submenu{
          position: absolute;
          left: 50px;
          top: 0;
          background:#fff;
          border-radius:12px;
          box-shadow:0 4px 24px rgba(0,0,0,0.12);
          padding:10px 0;
          min-width: 200px;
          z-index: 2147483647;
          border:1.5px solid #e5e7eb;
        }
        .hover-submenu-item{
          padding:10px;border-radius:8px;font-size:1rem;font-weight:500;color:#374151;background:#fff;border:none;
          width:95%;outline:none;text-align:left;transition:.18s all;margin:0 4px;cursor:pointer;display:block;
        }
        .hover-submenu-item:hover{ background:#f7f7fa;color:#111827; }
        .hover-rotate {
          transition: transform 180ms ease;
          will-change: transform;
        }
        .hover-rotate:hover {
          transform: rotate(720deg);
        }
        .hover-submenu-item.active{ background:#f0f3ff;color:#2563eb;font-weight:700; }
        .sidebar-content{ flex:1;overflow-y:auto;overflow-x:hidden;padding:12px;scrollbar-width:thin;scrollbar-color:#c1c1c1 #f1f1f1;position:relative;}
        .sidebar-content::-webkit-scrollbar{ width:6px; }
        .sidebar-content::-webkit-scrollbar-track{ background:#f1f1f1;border-radius:3px; }
        .sidebar-content::-webkit-scrollbar-thumb{ background:#c1c1c1;border-radius:3px; }
        .sidebar-content::-webkit-scrollbar-thumb:hover{ background:#a8a8a8; }
      `}</style>

      {/* Header */}
      <div className="p-3" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          {sidebarOpen ? (
            <>
              <div
                className="logo-container"
                style={{cursor: "pointer", display: "flex", alignItems: "center", gap: "10px"}}
              >
                <img
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hover-rotate"
                  src="/website-icon-fix@3x.png"
                  alt="myFEvent"
                  style={{ width: 40, height: 40 }}
                />
                <img
                  className="fade-content"
                  onClick={() => navigate("/")}
                  src="/logo-03.png"
                  alt="myFEvent"
                  style={{ width: "auto", height: 40 }}
                />
              </div>

              <button
                className="menu-button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Đóng sidebar"
              >
                <Menu size={20} />
              </button>
            </>
          ) : (
            <button
              className="menu-button"
              onClick={() => setSidebarOpen(true)}
              style={{ width: "100%" }}
              aria-label="Mở sidebar"
            >
              <Menu size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Nội dung cuộn */}
      <div className="sidebar-content">
        {showLoading ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,1)",
              zIndex: 2000,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              gap: 16,
            }}
          >
            <Loading size={60} />
            <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Đang tải...</span>
          </div>
        ) : (
          <>
            {/* Chỉ hiển thị nhóm CÀI ĐẶT */}
            <div className="mb-4">
              {sidebarOpen && <div className="group-title">ĐIỀU HƯỚNG</div>}
              <div className="d-flex flex-column gap-1">
                <button
                  className={`btn-nav ${activePage === "home" ? "active" : ""}`}
                  onClick={() => navigate("/home-page")}
                  title="Trang chủ"
                >
                  <div className="d-flex align-items-center">
                    <Home className="me-3" size={18} style={{ width: 20 }} />
                    {sidebarOpen && <span>Trang chủ</span>}
                  </div>
                </button>
              </div>
              <div className="d-flex flex-column gap-1">
                <button
                  className={`btn-nav ${activePage === "account" ? "active" : ""}`}
                  onClick={() => navigate("/user-profile")}
                  title="Hồ sơ"
                >
                  <div className="d-flex align-items-center">
                    <UserIcon className="me-3" size={18} style={{ width: 20 }} />
                    {sidebarOpen && <span>Hồ sơ</span>}
                  </div>
                </button>
              </div>
            </div>
            {/* Chỉ hiển thị nhóm CÀI ĐẶT */}
            <div className="mb-4">
              {sidebarOpen && <div className="group-title">CÀI ĐẶT</div>}
              <div className="d-flex flex-column gap-1">
                <button
                  className={`btn-nav ${
                    activePage === "notifications" ? "active" : ""
                  }`}
                  onClick={() => navigate("/notifications")}
                  title="Thông báo"
                >
                  <div className="d-flex align-items-center">
                    <Bell className="me-3" size={18} style={{ width: 20 }} />
                    {sidebarOpen && <span>Thông báo</span>}
                  </div>
                </button>
                <button
                  className={`btn-nav ${
                    activePage === "settings" ? "active" : ""
                  }`}
                  onClick={() => navigate("/setting")}
                  title="Cài đặt"
                >
                  <div className="d-flex align-items-center">
                    <Settings className="me-3" size={18} style={{ width: 20 }} />
                    {sidebarOpen && <span>Cài đặt</span>}
                  </div>
                </button>
                <button
                  className={`btn-nav ${
                    activePage === "support" ? "active" : ""
                  }`}
                  onClick={() => navigate("/support")}
                  title="Hỗ trợ"
                >
                  <div className="d-flex align-items-center">
                    <HelpCircle className="me-3" size={18} style={{ width: 20 }} />
                    {sidebarOpen && <span>Hỗ trợ</span>}
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Theme toggle hoặc Logo ở dưới */}
      <div
        className="p-2"
        style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb" }}
      >
        {sidebarOpen ? (
          <div style={{ paddingBottom: 10, margin: 0 }}>
            {/* Theme toggle - Commented out
            <div className="theme-toggle">
              <button
                className={`theme-option ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                <Sun size={18} />
                <span>Sáng</span>
              </button>
              <button
                className={`theme-option ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                <Moon size={18} />
                <span>Tối</span>
              </button>
            </div>
            */}

            {/* App Version + Dev info + Logo Bộ Công Thương */}
            <div
              className="fade-content"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  Phiên bản {APP_VERSION}
                </div>
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: "11px",
                  }}
                >
                  Phát triển bởi <span style={{ fontWeight: 600 }}>myFEteam</span>
                </div>
              </div>

              <img
                src="/gov.png"
                alt="FPTU - FEVENT TEAM"
                style={{ height: "30px", width: "auto", objectFit: "contain" }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", padding: "5px" }}>
            <img
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover-rotate"
              src="/website-icon-fix@3x.png"
              alt="myFEvent"
              style={{ width: 40, height: 40, cursor: "pointer" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
