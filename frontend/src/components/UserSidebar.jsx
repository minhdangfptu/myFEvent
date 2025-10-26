import { useEffect, useMemo, useState, useRef } from "react";
import { eventApi } from "../apis/eventApi";

export default function UserSidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage = "home",
}) {
  const [theme, setTheme] = useState("light");

  // Hover popup (khi sidebar đóng)
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 76 });
  const sidebarRef = useRef(null);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [events, setEvents] = useState([]);



  useEffect(() => {
    if (!sidebarOpen) {
      setWorkOpen(false);
      setFinanceOpen(false);
      setRisksOpen(false);
      setOverviewOpen(false);
    }
  }, [sidebarOpen]);

  useEffect(() => () => { if (hoverTimeout) clearTimeout(hoverTimeout); }, [hoverTimeout]);


  return (
    <div ref={sidebarRef} className={`shadow-sm ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`} style={{ width: sidebarOpen ? "230px" : "70px", height: "100vh", transition: "width 0.3s ease", position: "fixed", left: 0, top: 0, zIndex: 1000, display: "flex", flexDirection: "column", background: "white", borderRadius: "0" }}>
      <style>{`
        .sidebar-logo { font-family:'Brush Script MT',cursive;font-size:1.5rem;font-weight:bold;color:#dc2626; }
        .group-title { font-size:.75rem;font-weight:600;letter-spacing:.05em;color:#374151;margin:16px 0 8px;text-transform:uppercase; }
        .btn-nav{ border:0;background:transparent;color:#374151;border-radius:8px;padding:10px 12px;text-align:left;
          transition:all .2s ease;width:100%;display:flex;align-items:center;justify-content:space-between;}
        .btn-nav:hover{ background:#e9ecef; }
        .btn-nav.active{ background:#e9ecef;color:#111827; }
        .menu-item-hover:hover .btn-nav{ background:#e9ecef; }
        .btn-submenu{ border:0;background:transparent;color:#6b7280;border-radius:6px;padding:8px 12px 8px 24px;
          text-align:left;transition:all .2s ease;width:100%;font-size:.9rem;}
        .btn-submenu:hover{ background:#f9fafb;color:#374151;}
        .btn-submenu.active{ background:#f3f4f6;color:#111827;}
        .theme-toggle{ display:flex;background:#f3f4f6;border-radius:8px;padding:4px;margin-top:16px;}
        .theme-option{ flex:1;padding:8px 12px;border:none;background:transparent;border-radius:6px;cursor:pointer;display:flex;
          align-items:center;justify-content:center;gap:6px;font-size:.85rem;color:#6b7280;transition:all .2s;}
        .theme-option.active{ background:#fff;color:#374151;box-shadow:0 1px 3px rgba(0,0,0,.1); }

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
        .sidebar-content{ flex:1;overflow-y:auto;overflow-x:hidden;padding:12px;scrollbar-width:thin;scrollbar-color:#c1c1c1 #f1f1f1;}
        .sidebar-content::-webkit-scrollbar{ width:6px; }
        .sidebar-content::-webkit-scrollbar-track{ background:#f1f1f1;border-radius:3px; }
        .sidebar-content::-webkit-scrollbar-thumb{ background:#c1c1c1;border-radius:3px; }
        .sidebar-content::-webkit-scrollbar-thumb:hover{ background:#a8a8a8; }
      `}</style>

      {/* Header */}
      <div className="p-3" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div
            className="logo-container"
            onClick={() => !sidebarOpen && setSidebarOpen(true)}
            style={{ cursor: !sidebarOpen ? "pointer" : "default" }}
          >
            <div className="logo-content d-flex align-items-center ">
              <div style={{ display: "flex", alignItems: "center", marginRight: "10px" }}>
                <img className="hover-rotate" src="/website-icon-fix@3x.png" alt="myFEvent" style={{ width: 40, height: 40 }} />
              </div>
              {sidebarOpen && <span className="sidebar-logo">myFEvent</span>}
            </div>
          </div>

          {sidebarOpen && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setSidebarOpen(false)} style={{ padding: "4px 8px" }}>
              <i className="bi bi-arrow-left"></i>
            </button>
          )}
        </div>
      </div>

      {/* Nội dung cuộn */}
      <div className="sidebar-content">
        {/* Chỉ hiển thị nhóm CÀI ĐẶT */}
        <div className="mb-4">
          {sidebarOpen && <div className="group-title">ĐIỀU HƯỚNG</div>}
          <div className="d-flex flex-column gap-1">
            <button className={`btn-nav ${activePage === "notifications" ? "active" : ""}`} onClick={() => (window.location.href = "/home-page")} title="Trang chủ">
              <div className="d-flex align-items-center">
                <i className="bi bi-list me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Trang chủ</span>}
              </div>
            </button>
          </div>
        </div>
        {/* Chỉ hiển thị nhóm CÀI ĐẶT */}
        <div className="mb-4">
          {sidebarOpen && <div className="group-title">CÀI ĐẶT</div>}
          <div className="d-flex flex-column gap-1">
            <button className={`btn-nav ${activePage === "notifications" ? "active" : ""}`} onClick={() => (window.location.href = "/notifications")} title="Thông báo">
              <div className="d-flex align-items-center">
                <i className="bi bi-bell me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Thông báo</span>}
              </div>
            </button>
            <button className={`btn-nav ${activePage === "settings" ? "active" : ""}`} onClick={() => (window.location.href = "/setting")} title="Cài đặt">
              <div className="d-flex align-items-center">
                <i className="bi bi-gear me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Cài đặt</span>}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Theme toggle hoặc Expand button */}
      <div className="p-2" style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb" }}>
        {sidebarOpen ? (
          <div className="theme-toggle" style={{ paddingBottom: 10, margin: 0 }}>
            <button className={`theme-option ${theme === "light" ? "active" : ""}`} onClick={() => setTheme("light")}>
              <i className="bi bi-sun"></i>
              <span>Sáng</span>
            </button>
            <button className={`theme-option ${theme === "dark" ? "active" : ""}`} onClick={() => setTheme("dark")}>
              <i className="bi bi-moon"></i>
              <span>Tối</span>
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm w-100" onClick={() => setSidebarOpen(true)} style={{ padding: "5px", margin: "0 1.5px 0 2px" }} title="Mở rộng" aria-label="Mở/đóng thanh bên">
            <i className="bi bi-list"></i>
          </button>
        )}
      </div>
    </div>
  );
}