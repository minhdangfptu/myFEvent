import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Grid, Menu, Moon, Settings, Sun, Users } from "lucide-react";


export default function AdminSidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage = "events",
}) {
  const [theme, setTheme] = useState("light");
  const sidebarRef = useRef(null);
  const navigate = useNavigate();

  return (
    <div
      ref={sidebarRef}
      className={`shadow-sm ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      style={{
        width: sidebarOpen ? "230px" : "70px",
        height: "100vh",
        transition: "width 0.3s ease",
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
        .sidebar-logo { 
          font-family:'Brush Script MT',cursive;
          font-size:1.5rem;
          font-weight:bold;
          color:#dc2626; 
        }
        .group-title { 
          font-size:.75rem;
          font-weight:600;
          letter-spacing:.05em;
          color:#374151;
          margin:16px 0 8px;
          text-transform:uppercase; 
        }
        .btn-nav{ 
          border:0;
          background:transparent;
          color:#374151;
          border-radius:8px;
          padding:10px 12px;
          text-align:left;
          transition:all .2s ease;
          width:100%;
          display:flex;
          align-items:center;
          justify-content:space-between;
        }
        .btn-nav:hover{ 
          background:#e9ecef; 
        }
        .btn-nav.active{ 
          background:#e9ecef;
          color:#111827; 
        }
        .theme-toggle{ 
          display:flex;
          background:#f3f4f6;
          border-radius:8px;
          padding:4px;
          margin-top:16px;
        }
        .theme-option{ 
          flex:1;
          padding:8px 12px;
          border:none;
          background:transparent;
          border-radius:6px;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:6px;
          font-size:.85rem;
          color:#6b7280;
          transition:all .2s;
        }
        .theme-option.active{ 
          background:#fff;
          color:#374151;
          box-shadow:0 1px 3px rgba(0,0,0,.1); 
        }
        .hover-rotate {
          transition: transform 180ms ease;
          will-change: transform;
        }
        .hover-rotate:hover {
          transform: rotate(720deg);
        }
        .sidebar-content{ 
          flex:1;
          overflow-y:auto;
          overflow-x:hidden;
          padding:12px;
          scrollbar-width:thin;
          scrollbar-color:#c1c1c1 #f1f1f1;
          position:relative;
        }
        .sidebar-content::-webkit-scrollbar{ 
          width:6px; 
        }
        .sidebar-content::-webkit-scrollbar-track{ 
          background:#f1f1f1;
          border-radius:3px; 
        }
        .sidebar-content::-webkit-scrollbar-thumb{ 
          background:#c1c1c1;
          border-radius:3px; 
        }
        .sidebar-content::-webkit-scrollbar-thumb:hover{ 
          background:#a8a8a8; 
        }
      `}</style>

      {/* Header */}
      <div className="p-3" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div
            className="logo-container"
            onClick={() => !sidebarOpen && setSidebarOpen(true)}
            style={{ cursor: !sidebarOpen ? "pointer" : "default" }}
          >
            <div className="logo-content d-flex align-items-center">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginRight: "10px",
                }}
              >
                <img
                  className="hover-rotate"
                  src="/website-icon-fix@3x.png"
                  alt="myFEvent"
                  style={{ width: 40, height: 40 }}
                />
              </div>
              {sidebarOpen && (
                <img
                  src="/logo-03.png"
                  alt="myFEvent"
                  style={{ width: "auto", height: 40 }}
                />
              )}
            </div>
          </div>

          {sidebarOpen && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSidebarOpen(false)}
              style={{ padding: "4px 8px" }}
            >
              <ArrowLeft size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nội dung cuộn */}
      <div className="sidebar-content">
        {/* Nhóm Quản lý */}
        <div className="mb-4">
          {sidebarOpen && <div className="group-title">QUẢN LÝ HỆ THỐNG</div>}
          <div className="d-flex flex-column gap-1">
            {/* Nút Trang chủ */}
            <button
              className={`btn-nav ${activePage === "dashboard" ? "active" : ""}`}
              onClick={() => navigate("/admin/dashboard")}
              title="Tổng quan"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-grid me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Tổng quan</span>}
              </div>
            </button>
            {/* Nút Quản lý Sự kiện */}
            <button
              className={`btn-nav ${activePage === "events" ? "active" : ""}`}
              onClick={() => navigate("/admin/event-management")}
              title="Quản lý sự kiện"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-calendar-event me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Quản lý sự kiện</span>}
              </div>
            </button>

            {/* Nút Quản lý Người dùng */}
            <button
              className={`btn-nav ${activePage === "users" ? "active" : ""}`}
              onClick={() => navigate("/admin/user-management")}
              title="Quản lý người dùng"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-people me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Quản lý người dùng</span>}
              </div>
            </button>
          </div>
        </div>

        {/* Nhóm Cài đặt */}
        <div className="mb-4">
          {sidebarOpen && <div className="group-title">CÀI ĐẶT</div>}
          <div className="d-flex flex-column gap-1">
            <button
              className={`btn-nav ${
                activePage === "settings" ? "active" : ""
              }`}
              onClick={() => navigate("/admin/settings")}
              title="Cài đặt"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-gear me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Cài đặt</span>}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Theme toggle hoặc Expand button */}
      <div
        className="p-2"
        style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb" }}
      >
        {sidebarOpen ? (
          <div
            className="theme-toggle"
            style={{ paddingBottom: 10, margin: 0 }}
          >
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
        ) : (
          <button
            className="btn btn-ghost btn-sm w-100"
            onClick={() => setSidebarOpen(true)}
            style={{ padding: "5px", margin: "0 1.5px 0 2px" }}
            title="Mở rộng"
            aria-label="Mở/đóng thanh bên"
          >
            <Menu size={18} />
          </button>
        )}
      </div>
    </div>
  );
}