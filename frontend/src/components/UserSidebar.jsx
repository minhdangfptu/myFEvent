import { useEffect, useMemo, useState, useRef } from "react";
import { eventApi } from "../apis/eventApi";

export default function UserSidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage = "home",
}) {
  const [workOpen, setWorkOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false); // NEW: dropdown Tổng quan
  const [theme, setTheme] = useState("light");

  // Hover popup (khi sidebar đóng)
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 76 });
  const sidebarRef = useRef(null);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [events, setEvents] = useState([]);
  const [currentEventMembership, setCurrentEventMembership] = useState(null);
  const hasEvents = events && events.length > 0;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('UserSidebar: Fetching events...');
        const res = await eventApi.listMyEvents();
        console.log('UserSidebar: API response:', res);
        const list = Array.isArray(res?.data) ? res.data : [];
        console.log('UserSidebar: Events list:', list);
        const mapped = list.map(e => ({ 
          id: e._id || e.id, 
          name: e.name, 
          icon: "bi-calendar-event",
          membership: e.membership // Assume backend trả về membership
        }));
        console.log('UserSidebar: Mapped events:', mapped);
        if (mounted) {
          setEvents(mapped);
          if (mapped.length && !selectedEvent) {
            setSelectedEvent(mapped[0].name);
            setCurrentEventMembership(mapped[0].membership);
          }
        }
      } catch (error) {
        console.error('UserSidebar: Error fetching events:', error);
      }
    })();
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    if (!sidebarOpen) {
      setWorkOpen(false);
      setFinanceOpen(false);
      setRisksOpen(false);
      setOverviewOpen(false);
    }
  }, [sidebarOpen]);

  useEffect(() => () => { if (hoverTimeout) clearTimeout(hoverTimeout); }, [hoverTimeout]);

  const handleMouseEnter = (menuType, e) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    if (sidebarRef.current && e?.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const top = rect.top - sidebarRect.top;
      const left = rect.right - sidebarRect.left + 8;
      setHoverPos({ top, left });
    }
    setHoveredMenu(menuType);
  };
  const handleMouseLeave = () => {
    const timeout = setTimeout(() => { setHoveredMenu(null); setHoverTimeout(null); }, 200);
    setHoverTimeout(timeout);
  };
  const handlePopupMouseEnter = () => { if (hoverTimeout) { clearTimeout(hoverTimeout); setHoverTimeout(null); } };
  const handlePopupMouseLeave = () => { setHoveredMenu(null); };

  // Menu chính - LUÔN có "Trang chủ"
  const mainMenuItems = useMemo(() => {
    const items = [
      { id: "home", icon: "bi-house-door", label: "Trang chủ", path: "/user-landing-page" }
    ];
    
    // User thường chỉ có trang chủ, không có chức năng chính khác
    return items;
  }, []);

  // Submenu Tổng quan - phân biệt theo role
  const overviewSubItems = useMemo(() => {
    const currentEvent = events.find(e => e.name === selectedEvent);
    const isHoOC = currentEvent?.membership === 'HoOC';
    const isHoD = currentEvent?.membership === 'HoD';
    
    const items = [
      { id: "overview-dashboard", label: "Dashboard tổng", path: "/user-landing-page" }
    ];
    
    // Chỉ HoOC và HoD mới có quyền xem chi tiết sự kiện
    if (isHoOC || isHoD) {
      items.push({
        id: "overview-detail", 
        label: "Chi tiết sự kiện", 
        path: `/hooc-event-detail/${currentEvent?.id || ''}`
      });
    }
    
    return items;
  }, [events, selectedEvent]);

  // Submenu Công việc - phân biệt theo role
  const workSubItems = useMemo(() => {
    const currentEvent = events.find(e => e.name === selectedEvent);
    const isHoOC = currentEvent?.membership === 'HoOC';
    const isHoD = currentEvent?.membership === 'HoD';
    
    if (isHoOC || isHoD) {
      return [
        { id: "work-board", label: "Bảng công việc", path: "/work-board" },
        { id: "work-list", label: "List công việc", path: "/task" },
        { id: "work-timeline", label: "Timeline công việc", path: "/work-timeline" },
      ];
    } else {
      return [
        { id: "work-list", label: "Công việc của tôi", path: "/task" },
      ];
    }
  }, [events, selectedEvent]);

  // Submenu Tài chính - chỉ HoOC và HoD
  const financeSubItems = useMemo(() => {
    const currentEvent = events.find(e => e.name === selectedEvent);
    const isHoOC = currentEvent?.membership === 'HoOC';
    const isHoD = currentEvent?.membership === 'HoD';
    
    if (isHoOC || isHoD) {
      return [
        { id: "budget", label: "Ngân sách", path: "/budget" },
        { id: "expenses", label: "Chi tiêu", path: "/expenses" },
        { id: "income", label: "Thu nhập", path: "/income" },
      ];
    } else {
      return [];
    }
  }, [events, selectedEvent]);

  // Submenu Rủi ro - chỉ HoOC và HoD
  const risksSubItems = useMemo(() => {
    const currentEvent = events.find(e => e.name === selectedEvent);
    const isHoOC = currentEvent?.membership === 'HoOC';
    const isHoD = currentEvent?.membership === 'HoD';
    
    if (isHoOC || isHoD) {
      return [
        { id: "risk-list", label: "Danh sách rủi ro", path: "/risk" },
        { id: "risk-analysis", label: "Phân tích rủi ro", path: "/risk-analysis" },
        { id: "risk-mitigation", label: "Giảm thiểu rủi ro", path: "/risk-mitigation" },
      ];
    } else {
      return [];
    }
  }, [events, selectedEvent]);

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

        {/* Event Selection - Luôn hiển thị */}
        {sidebarOpen && (
          <div className="mb-3" style={{ paddingBottom: 0 }}>
            <div className="group-title">CHỌN SỰ KIỆN</div>
            <div className="dropdown">
              <button
                className="btn btn-outline-secondary dropdown-toggle w-100 d-flex align-items-center justify-content-between"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style={{ textAlign: "left", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "white", color: "#dc2626", fontWeight: "bold", height: 40 }}
              >
                <div className="d-flex align-items-center">
                  <span>{hasEvents ? selectedEvent : "Chọn sự kiện..."}</span>
                </div>
              </button>
              <ul className="dropdown-menu w-100" style={{ padding: 0 }}>
                {hasEvents ? (
                  <>
                    {events.map((event) => (
                      <li key={event.id}>
                        <button
                          className="dropdown-item d-flex align-items-center"
                          style={{ textAlign: "left", paddingLeft: 16 }}
                          onClick={() => {
                            setSelectedEvent(event.name);
                            setCurrentEventMembership(event.membership);
                            
                            // Redirect đến trang tương ứng với role
                            if (event.membership === 'HoOC') {
                              window.location.href = '/hooc-landing-page';
                            } else if (event.membership === 'Member' || event.membership === 'HoD') {
                              window.location.href = '/member-landing-page';
                            }
                          }}
                        >
                          <i className={`${event.icon} me-2`}></i>
                          {event.name}
                        </button>
                      </li>
                    ))}
                    <li><hr className="dropdown-divider" /></li>
                  </>
                ) : (
                  <li>
                    <button className="dropdown-item d-flex align-items-center" style={{ textAlign: "left", paddingLeft: 16, color: "#6b7280" }}>
                      <i className="bi bi-info-circle me-2"></i>Chưa có sự kiện nào
                    </button>
                  </li>
                )}
                <li>
                  <button className="dropdown-item d-flex align-items-center" style={{ textAlign: "left", paddingLeft: 16, color: "#6b7280" }}>
                    <i className="bi bi-eye me-2"></i>Xem sự kiện của bạn
                  </button>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item d-flex align-items-center" style={{ textAlign: "left", paddingLeft: 16, color: "#6b7280" }} onClick={() => window.location.href = '/events'}>
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
            {/* Mục chính - Trang chủ luôn hiển thị */}
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

            {/* Hiển thị menu theo role khi đã chọn sự kiện */}
            {hasEvents && currentEventMembership && (
              <>
                {/* Tổng quan */}
                <div className="position-relative">
                  <button
                    className={`btn-nav ${overviewOpen ? "active" : ""}`}
                    onClick={() => setOverviewOpen(!overviewOpen)}
                    onMouseEnter={(e) => handleMouseEnter('overview', e)}
                    onMouseLeave={handleMouseLeave}
                    title="Tổng quan"
                  >
                    <div className="d-flex align-items-center">
                      <i className="bi bi-grid-3x3-gap me-3" style={{ width: 20 }} />
                      {sidebarOpen && <span>Tổng quan</span>}
                    </div>
                    {sidebarOpen && <i className={`bi bi-chevron-${overviewOpen ? "up" : "down"}`} />}
                  </button>
                  
                  {/* Submenu Tổng quan */}
                  {overviewOpen && sidebarOpen && (
                    <div className="d-flex flex-column gap-1" style={{ marginLeft: 20 }}>
                      {overviewSubItems.map((item) => (
                        <button
                          key={item.id}
                          className={`btn-submenu ${activePage === item.id ? "active" : ""}`}
                          onClick={() => (window.location.href = item.path)}
                          title={item.label}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Hover submenu khi sidebar đóng */}
                  {hoveredMenu === 'overview' && !sidebarOpen && (
                    <div className="hover-submenu" style={{ top: hoverPos.top, left: hoverPos.left }}>
                      {overviewSubItems.map((item) => (
                        <button
                          key={item.id}
                          className="hover-submenu-item"
                          onClick={() => (window.location.href = item.path)}
                          onMouseEnter={handlePopupMouseEnter}
                          onMouseLeave={handlePopupMouseLeave}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Công việc */}
                {workSubItems.length > 0 && (
                  <div className="position-relative">
                    <button
                      className={`btn-nav ${workOpen ? "active" : ""}`}
                      onClick={() => setWorkOpen(!workOpen)}
                      onMouseEnter={(e) => handleMouseEnter('work', e)}
                      onMouseLeave={handleMouseLeave}
                      title="Công việc"
                    >
                      <div className="d-flex align-items-center">
                        <i className="bi bi-kanban me-3" style={{ width: 20 }} />
                        {sidebarOpen && <span>Công việc</span>}
                      </div>
                      {sidebarOpen && <i className={`bi bi-chevron-${workOpen ? "up" : "down"}`} />}
                    </button>
                    
                    {/* Submenu Công việc */}
                    {workOpen && sidebarOpen && (
                      <div className="d-flex flex-column gap-1" style={{ marginLeft: 20 }}>
                        {workSubItems.map((item) => (
                          <button
                            key={item.id}
                            className={`btn-submenu ${activePage === item.id ? "active" : ""}`}
                            onClick={() => (window.location.href = item.path)}
                            title={item.label}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Hover submenu khi sidebar đóng */}
                    {hoveredMenu === 'work' && !sidebarOpen && (
                      <div className="hover-submenu" style={{ top: hoverPos.top, left: hoverPos.left }}>
                        {workSubItems.map((item) => (
                          <button
                            key={item.id}
                            className="hover-submenu-item"
                            onClick={() => (window.location.href = item.path)}
                            onMouseEnter={handlePopupMouseEnter}
                            onMouseLeave={handlePopupMouseLeave}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tài chính - chỉ HoOC và HoD */}
                {financeSubItems.length > 0 && (
                  <div className="position-relative">
                    <button
                      className={`btn-nav ${financeOpen ? "active" : ""}`}
                      onClick={() => setFinanceOpen(!financeOpen)}
                      onMouseEnter={(e) => handleMouseEnter('finance', e)}
                      onMouseLeave={handleMouseLeave}
                      title="Tài chính"
                    >
                      <div className="d-flex align-items-center">
                        <i className="bi bi-cash-coin me-3" style={{ width: 20 }} />
                        {sidebarOpen && <span>Tài chính</span>}
                      </div>
                      {sidebarOpen && <i className={`bi bi-chevron-${financeOpen ? "up" : "down"}`} />}
                    </button>
                    
                    {/* Submenu Tài chính */}
                    {financeOpen && sidebarOpen && (
                      <div className="d-flex flex-column gap-1" style={{ marginLeft: 20 }}>
                        {financeSubItems.map((item) => (
                          <button
                            key={item.id}
                            className={`btn-submenu ${activePage === item.id ? "active" : ""}`}
                            onClick={() => (window.location.href = item.path)}
                            title={item.label}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Hover submenu khi sidebar đóng */}
                    {hoveredMenu === 'finance' && !sidebarOpen && (
                      <div className="hover-submenu" style={{ top: hoverPos.top, left: hoverPos.left }}>
                        {financeSubItems.map((item) => (
                          <button
                            key={item.id}
                            className="hover-submenu-item"
                            onClick={() => (window.location.href = item.path)}
                            onMouseEnter={handlePopupMouseEnter}
                            onMouseLeave={handlePopupMouseLeave}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Rủi ro - chỉ HoOC và HoD */}
                {risksSubItems.length > 0 && (
                  <div className="position-relative">
                    <button
                      className={`btn-nav ${risksOpen ? "active" : ""}`}
                      onClick={() => setRisksOpen(!risksOpen)}
                      onMouseEnter={(e) => handleMouseEnter('risks', e)}
                      onMouseLeave={handleMouseLeave}
                      title="Rủi ro"
                    >
                      <div className="d-flex align-items-center">
                        <i className="bi bi-exclamation-triangle me-3" style={{ width: 20 }} />
                        {sidebarOpen && <span>Rủi ro</span>}
                      </div>
                      {sidebarOpen && <i className={`bi bi-chevron-${risksOpen ? "up" : "down"}`} />}
                    </button>
                    
                    {/* Submenu Rủi ro */}
                    {risksOpen && sidebarOpen && (
                      <div className="d-flex flex-column gap-1" style={{ marginLeft: 20 }}>
                        {risksSubItems.map((item) => (
                          <button
                            key={item.id}
                            className={`btn-submenu ${activePage === item.id ? "active" : ""}`}
                            onClick={() => (window.location.href = item.path)}
                            title={item.label}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Hover submenu khi sidebar đóng */}
                    {hoveredMenu === 'risks' && !sidebarOpen && (
                      <div className="hover-submenu" style={{ top: hoverPos.top, left: hoverPos.left }}>
                        {risksSubItems.map((item) => (
                          <button
                            key={item.id}
                            className="hover-submenu-item"
                            onClick={() => (window.location.href = item.path)}
                            onMouseEnter={handlePopupMouseEnter}
                            onMouseLeave={handlePopupMouseLeave}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Cài đặt */}
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