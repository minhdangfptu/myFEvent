import { useEffect, useMemo, useState, useRef } from "react";
import { eventApi } from "../apis/eventApi";

export default function UserSidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage = "home",
}) {
  // Submenus (khi sidebar mở) - Thay đổi giá trị mặc định thành false
  const [workOpen, setWorkOpen] = useState(false);    // Thay đổi từ true thành false
  const [financeOpen, setFinanceOpen] = useState(false);  // Thay đổi từ true thành false 
  const [risksOpen, setRisksOpen] = useState(false);
  const [theme, setTheme] = useState("light");

  // Hover popup (khi sidebar đóng)
  const [hoveredMenu, setHoveredMenu] = useState(null); // 'work' | 'finance' | 'risk' | null
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 76 });
  const sidebarRef = useRef(null);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [events, setEvents] = useState([]);
  const hasEvents = events && events.length > 0;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('Fetching events for sidebar...');
        const res = await eventApi.listMyEvents();
        console.log('API response:', res);
        const list = Array.isArray(res?.data) ? res.data : [];
        console.log('Events list:', list);
        const mapped = list.map(e => ({ id: e._id || e.id, name: e.name, icon: "bi-calendar-event" }));
        console.log('Mapped events:', mapped);
        if (mounted) {
          setEvents(mapped);
          if (mapped.length && !selectedEvent) setSelectedEvent(mapped[0].name);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    })();
    return () => { mounted = false };
  }, []);

  const getSelectedEventId = () => {
    if (!hasEvents || events.length === 0) return null;
    const selectedEventObj = events.find(e => e.name === selectedEvent);
    return selectedEventObj ? selectedEventObj.id : events[0].id;
  };

  const mainMenuItems = useMemo(
    () => [
      {
        id: "overview",
        icon: "bi-house-door",
        label: "Tổng quan",
        path: "/user-landing-page",
      },
      {
        id: "event-board",
        icon: "bi-people",
        label: "Ban sự kiện",
        path: "/event-board",
      },
      {
        id: "members",
        icon: "bi-person",
        label: "Thành viên",
        path: getSelectedEventId() ? `/event/${getSelectedEventId()}/member` : "/member",
      },
      {
        id: "calendar",
        icon: "bi-calendar",
        label: "Lịch cá nhân",
        path: "/calendar",
      },
    ],
    [hasEvents, events, selectedEvent]
  );

  const workSubItems = [
    { id: "work-board", label: "Bảng công việc", path: "/work-board" },
    { id: "work-list", label: "List công việc", path: "/task" },
    { id: "work-timeline", label: "Timeline công việc", path: "/work-timeline" },
  ];
  const financeSubItems = [
    { id: "budget", label: "Ngân sách", path: "/budget" },
    { id: "expenses", label: "Chi tiêu", path: "/expenses" },
    { id: "income", label: "Thu nhập", path: "/income" },
  ];
  const risksSubItems = [
    { id: "risk-list", label: "Danh sách rủi ro", path: "/risk" },
    { id: "risk-analysis", label: "Phân tích rủi ro", path: "/risk-analysis" },
    {
      id: "risk-mitigation",
      label: "Giảm thiểu rủi ro",
      path: "/risk-mitigation",
    },
  ];

  // Tự đóng submenus khi đóng sidebar
  useEffect(() => {
    if (!sidebarOpen) {
      setWorkOpen(false);
      setFinanceOpen(false);
      setRisksOpen(false);
    }
  }, [sidebarOpen]);

  // Cleanup hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);

  // Tính vị trí popup khi hover vào icon menu (sidebar đóng)
  const handleMouseEnter = (menuType, e) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    if (sidebarRef.current && e?.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const top = rect.top - sidebarRect.top;
      const left = rect.right - sidebarRect.left + 8; // cách 8px
      setHoverPos({ top, left });
    }
    setHoveredMenu(menuType);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredMenu(null);
      setHoverTimeout(null);
    }, 200);
    setHoverTimeout(timeout);
  };

  const handlePopupMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };
  const handlePopupMouseLeave = () => {
    setHoveredMenu(null);
  };

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
        background: sidebarOpen ? "white" : "white",
        borderRadius: sidebarOpen ? "0" : "0",
      }}
    >
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

        /* Popup hover khi sidebar đóng */
        .hover-submenu{
          position: absolute;        /* KHÔNG !important để inline left/top hoạt động */
          left: 50px;
          top: 0;
          background:#fff;
          border-radius:12px;
          box-shadow:0 4px 24px rgba(0,0,0,0.12);
          padding:10px 0;
          min-width: 200px;
          z-index: 2147483647;       /* cao để không bị đè */
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
          {/* Logo container trở thành nút expand khi sidebar đóng */}
          <div
            className="logo-container"
            onClick={() => !sidebarOpen && setSidebarOpen(true)}
            style={{ cursor: !sidebarOpen ? "pointer" : "default" }}
          >
            <div className="logo-content d-flex align-items-center ">
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
              {sidebarOpen && <span className="sidebar-logo">myFEvent</span>}
            </div>
          </div>


          {/* Nút collapse khi sidebar mở */}
          {sidebarOpen && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSidebarOpen(false)}
              style={{ padding: "4px 8px" }}
            >
              <i className="bi bi-arrow-left"></i>
            </button>
          )}
        </div>

        {/* Xóa nút expand riêng biệt khi sidebar đóng */}

        {/* Current Event */}
        {sidebarOpen && (
          <div className="mb-3" style={{ paddingBottom: 0 }}>
            <div className="group-title">SỰ KIỆN HIỆN TẠI</div>
            <div className="dropdown">
              <button
                className="btn btn-outline-secondary dropdown-toggle w-100 d-flex align-items-center justify-content-between"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  background: "white",
                  color: "#dc2626",
                  fontWeight: "bold",
                  height: 40,
                }}
              >
                <div className="d-flex align-items-center">
                  <span>{selectedEvent || (hasEvents ? events[0]?.name : "Chưa tham gia sự kiện")}</span>
                </div>
              </button>
              <ul className="dropdown-menu w-100" style={{ padding: 0 }}>
                {events.map((event) => (
                  <li key={event.id}>
                    <button
                      className="dropdown-item d-flex align-items-center"
                      style={{ textAlign: "left", paddingLeft: 16 }}
                      onClick={() => setSelectedEvent(event.name)}
                    >
                      <i className={`${event.icon} me-2`}></i>
                      {event.name}
                    </button>
                  </li>
                ))}
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button
                    className="dropdown-item d-flex align-items-center"
                    style={{
                      textAlign: "left",
                      paddingLeft: 16,
                      color: "#6b7280",
                    }}
                  >
                    <i className="bi bi-eye me-2"></i>Xem sự kiện của bạn
                  </button>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button
                    className="dropdown-item d-flex align-items-center"
                    style={{
                      textAlign: "left",
                      paddingLeft: 16,
                      color: "#6b7280",
                    }}
                  >
                    <i className="bi bi-eye me-2"></i>Xem sự kiện tại DH FPT
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Nội dung cuộn */}
      <div className="sidebar-content">
        <div className="mb-4">
          {sidebarOpen && <div className="group-title">CHỨC NĂNG CHÍNH</div>}

          <div className="d-flex flex-column gap-1">
            {/* Mục chính */}
            {mainMenuItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  
                  className={`btn-nav ${isActive ? "active" : ""}`}
                  onClick={() => (window.location.href = item.path)}
                  title={item.label}
                >
                  <div style={{display: "flex", alignItems: 'center', justifyContent:"center"}} className="d-flex align-items-center">
                    <i className={`${item.icon} me-3`} style={{ width: 20 }} />
                    {sidebarOpen && <span>{item.label}</span>}
                  </div>
                </button>
              );
            })}

            {hasEvents && (
            <div
              className="menu-item-hover"
              onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("work", e)}
              onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
            >
              <button
                className={`btn-nav${
                  activePage.startsWith("work") ? " active" : ""
                }`}
                onClick={() => sidebarOpen && setWorkOpen((prev) => !prev)}
                style={{
                  cursor: "pointer",
                  background:
                    hoveredMenu === "work" && !sidebarOpen
                      ? "#e7ebef"
                      : undefined,
                }}
                title="Công việc"
              >
                <div className="d-flex align-items-center">
                  <i className="bi bi-file-text me-3" style={{ width: 20 }} />
                  {sidebarOpen && <span>Công việc</span>}
                </div>
                {sidebarOpen && (
                  <i
                    className={`bi ${
                      workOpen ? "bi-chevron-up" : "bi-chevron-down"
                    }`}
                  />
                )}
              </button>

              {/* Popup khi sidebar đóng */}
              {!sidebarOpen && hoveredMenu === "work" && (
                <div
                  className="hover-submenu"
                  style={{
                    left: `${hoverPos.left}px`,
                    top: `${hoverPos.top}px`,
                    position: "absolute",
                  }}
                  onMouseEnter={handlePopupMouseEnter}
                  onMouseLeave={handlePopupMouseLeave}
                >
                  {workSubItems.map((item) => (
                    <button
                      key={item.id}
                      className={`hover-submenu-item${
                        activePage === item.id ? " active" : ""
                      }`}
                      onClick={() => (window.location.href = item.path)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Expand khi mở */}
              {workOpen && sidebarOpen && (
                <div className="ms-2">
                  {workSubItems.map((item) => (
                    <button
                      key={item.id}
                      className={`btn-submenu${
                        activePage === item.id ? " active" : ""
                      }`}
                      onClick={() => (window.location.href = item.path)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {hasEvents && (
            <div
              className="menu-item-hover"
              onMouseEnter={(e) =>
                !sidebarOpen && handleMouseEnter("finance", e)
              }
              onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
            >
              <button
                className={`btn-nav${
                  activePage.startsWith("finance") ? " active" : ""
                }`}
                onClick={() => sidebarOpen && setFinanceOpen((prev) => !prev)}
                style={{
                  cursor: "pointer",
                  background:
                    hoveredMenu === "finance" && !sidebarOpen
                      ? "#e7ebef"
                      : undefined,
                }}
                title="Tài chính"
              >
                <div className="d-flex align-items-center">
                  <i className="bi bi-camera me-3" style={{ width: 20 }} />
                  {sidebarOpen && <span>Tài chính</span>}
                </div>
                {sidebarOpen && (
                  <i
                    className={`bi ${
                      financeOpen ? "bi-chevron-up" : "bi-chevron-down"
                    }`}
                  />
                )}
              </button>

              {!sidebarOpen && hoveredMenu === "finance" && (
                <div
                  className="hover-submenu"
                  style={{
                    left: `${hoverPos.left}px`,
                    top: `${hoverPos.top}px`,
                    position: "absolute",
                  }}
                  onMouseEnter={handlePopupMouseEnter}
                  onMouseLeave={handlePopupMouseLeave}
                >
                  {financeSubItems.map((item) => (
                    <button
                      key={item.id}
                      className={`hover-submenu-item${
                        activePage === item.id ? " active" : ""
                      }`}
                      onClick={() => (window.location.href = item.path)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {financeOpen && sidebarOpen && (
                <div className="ms-2">
                  {financeSubItems.map((item) => (
                    <button
                      key={item.id}
                      className={`btn-submenu${
                        activePage === item.id ? " active" : ""
                      }`}
                      onClick={() => (window.location.href = item.path)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {hasEvents && (
            <div
              className="menu-item-hover"
              onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("risk", e)}
              onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
            >
              <button
                className={`btn-nav${
                  activePage.startsWith("risk") ? " active" : ""
                }`}
                onClick={() => sidebarOpen && setRisksOpen((prev) => !prev)}
                style={{
                  cursor: "pointer",
                  background:
                    hoveredMenu === "risk" && !sidebarOpen
                      ? "#e7ebef"
                      : undefined,
                }}
                title="Rủi ro"
              >
                <div className="d-flex align-items-center">
                  <i className="bi bi-bug me-3" style={{ width: 20 }} />
                  {sidebarOpen && <span>Rủi ro</span>}
                </div>
                {sidebarOpen && (
                  <i
                    className={`bi ${
                      risksOpen ? "bi-chevron-up" : "bi-chevron-down"
                    }`}
                  />
                )}
              </button>

              {!sidebarOpen && hoveredMenu === "risk" && (
                <div
                  className="hover-submenu"
                  style={{
                    left: `${hoverPos.left}px`,
                    top: `${hoverPos.top}px`,
                    position: "absolute",
                  }}
                  onMouseEnter={handlePopupMouseEnter}
                  onMouseLeave={handlePopupMouseLeave}
                >
                  {risksSubItems.map((item) => (
                    <button
                      key={item.id}
                      className={`hover-submenu-item${
                        activePage === item.id ? " active" : ""
                      }`}
                      onClick={() => (window.location.href = item.path)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {risksOpen && sidebarOpen && (
                <div className="ms-2">
                  {risksSubItems.map((item) => (
                    <button
                      key={item.id}
                      className={`btn-submenu${
                        activePage === item.id ? " active" : ""
                      }`}
                      onClick={() => (window.location.href = item.path)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Feedback */}
            <button
              className={`btn-nav ${activePage === "feedback" ? "active" : ""}`}
              onClick={() => (window.location.href = "/feedback")}
              title="Phản hồi"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-chat-dots me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Phản hồi</span>}
              </div>
            </button>
          </div>
        </div>

        {/* Cài đặt */}
        <div className="mb-4">
          {sidebarOpen && <div className="group-title">CÀI ĐẶT</div>}
          <div className="d-flex flex-column gap-1">
            <button
              className={`btn-nav ${
                activePage === "notifications" ? "active" : ""
              }`}
              onClick={() => (window.location.href = "/notifications")}
              title="Thông báo"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-bell me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Thông báo</span>}
              </div>
            </button>
          </div>
          <div className="d-flex flex-column gap-1">
            <button
              className={`btn-nav ${
                activePage === "notifications" ? "active" : ""
              }`}
              onClick={() => (window.location.href = "/notifications")}
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
              <i className="bi bi-sun"></i>
              <span>Sáng</span>
            </button>
            <button
              className={`theme-option ${theme === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              <i className="bi bi-moon"></i>
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
            <i className="bi bi-list"></i>
          </button>
        )}
      </div>
    </div>
  );
}
