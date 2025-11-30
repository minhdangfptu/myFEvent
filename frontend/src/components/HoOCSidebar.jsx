import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEvents } from "../contexts/EventContext";
import Loading from "./Loading";
import { APP_VERSION } from "~/config/index";
import { Calendar, Grid, ChevronUp, ChevronDown, Users, User, FileText, Coins, Bug, Bell, Settings, HelpCircle, Database, Menu, Home, MessageSquareText } from "lucide-react";
import { currentEventStorage } from "../utils/currentEventStorage";

export default function HoOCSidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage = "home",
  eventId, // Nhận eventId qua props
  
}) {
  const STORAGE_KEY = 'sidebar_state_hooc';
  const [isInitialized, setIsInitialized] = useState(false);

  // UI state cho menu
  const [workOpen, setWorkOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);
  const [exportsOpen, setExportsOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 76 });
  const sidebarRef = useRef(null);

  // Load state từ localStorage khi component mount (chỉ một lần)
  useEffect(() => {
    if (isInitialized) return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Restore state từ localStorage
        if (parsed.sidebarOpen !== undefined) {
          setSidebarOpen(parsed.sidebarOpen);
        }
        if (parsed.workOpen !== undefined) {
          setWorkOpen(parsed.workOpen);
        }
        if (parsed.financeOpen !== undefined) {
          setFinanceOpen(parsed.financeOpen);
        }
        if (parsed.overviewOpen !== undefined) {
          setOverviewOpen(parsed.overviewOpen);
        }
        if (parsed.risksOpen !== undefined) {
          setRisksOpen(parsed.risksOpen);
        }
        if (parsed.exportsOpen !== undefined) {
          setExportsOpen(parsed.exportsOpen);
        }
      }
    } catch (error) {
      console.error('Error loading sidebar state:', error);
    } finally {
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lưu state vào localStorage khi có thay đổi (sau khi đã initialize)
  useEffect(() => {
    if (!isInitialized) return;
    
    const stateToSave = {
      sidebarOpen,
      workOpen,
      financeOpen,
      overviewOpen,
      risksOpen,
      exportsOpen
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  }, [isInitialized, sidebarOpen, workOpen, financeOpen, overviewOpen, risksOpen, exportsOpen]);

  // Sử dụng eventId từ props - Tối ưu: không block UI khi đã có events cached
  const { events, loading } = useEvents();
  const event = useMemo(() => {
    // Tìm event từ context
    const foundEvent = events.find(e => (e._id || e.id) === eventId);

    // Nếu không tìm thấy, lấy từ cache
    if (!foundEvent && eventId) {
      const cachedEvent = currentEventStorage.get();
      if (cachedEvent && (cachedEvent._id === eventId || cachedEvent.id === eventId)) {
        return cachedEvent;
      }
    }

    return foundEvent;
  }, [events, eventId]);
  const hasEvent = !!event;
  const isEventCompleted = hasEvent && ['completed', 'ended', 'finished'].includes((event?.status || '').toLowerCase());

  // Track if we've already tried to refetch for this eventId
  const refetchAttemptedRef = useRef(null);
  
  // Fetch lại events nếu có eventId nhưng không tìm thấy event trong events array
  useEffect(() => {
    if (!effectiveEventId) {
      refetchAttemptedRef.current = null;
      return;
    }
    
    // Chỉ refetch một lần cho mỗi eventId
    if (refetchAttemptedRef.current === effectiveEventId) {
      return; // Đã thử refetch cho eventId này rồi
    }
    
    if (!loading && events.length > 0 && !event) {
      // Có eventId nhưng không tìm thấy event, có thể events chưa được fetch đầy đủ
      // Thử fetch lại một lần
      refetchAttemptedRef.current = effectiveEventId;
      refetchEvents();
    } else if (!loading && events.length === 0) {
      // Nếu có effectiveEventId nhưng events array rỗng và không đang loading, thử fetch lại
      refetchAttemptedRef.current = effectiveEventId;
      refetchEvents();
    }
  }, [effectiveEventId, events, event, loading, refetchEvents]);

  // Chỉ show loading khi chưa có events VÀ đang loading
  const showLoading = loading && events.length === 0;
  
  // Kiểm tra xem có đang chờ event data không (có effectiveEventId nhưng chưa có event)
  const isWaitingForEvent = effectiveEventId && !event && !loading;
  const navigate = useNavigate();

  // Submenu Tổng quan - HoOC có đầy đủ quyền
  const overviewSubItems = [
    { id: "overview-dashboard", label: "Dashboard tổng", path: `/hooc-dashboard?eventId=${eventId}` },
    { id: "overview-detail", label: "Chi tiết sự kiện", path: `/events/${eventId || ''}/hooc-event-detail` },
    { id: "overview-timeline", label: "Timeline sự kiện", path: `/events/${eventId || ''}/milestones` }
  ];

  const workSubItems = [
    { id: "work-board", label: "Danh sách công việc", path: `/events/${eventId || ''}/tasks` },
    { id: "work-gantt", label: "Biểu đồ Gantt", path: `/events/${eventId}/tasks/gantt` },
    { id: "work-statitics", label: "Thống kê tiến độ", path: `/events/${eventId}/tasks/hooc-statistic` },
  ];
  const financeSubItems = [
    { id: "finance-budget", label: "Ngân sách", path: `/events/${eventId || ''}/budgets` },
    { id: "finance-stats", label: "Thống kê thu chi", path: `/events/${eventId || ''}/budgets/statistics` },
  ];
  const risksSubItems = [
    { id: "risk-list", label: "Danh sách rủi ro", path: `/events/${eventId || ''}/risks` },
    { id: "risk-analysis", label: "Phân tích rủi ro", path: `/events/${eventId || ''}/risks/analysis` },
  ];
  const exportSubItems = [
    { id: "export-all", label: "Dữ liệu sự kiện", path: `/events/${eventId}/export/data` },
    { id: "export-example", label: "Mẫu tài liệu", path: `/events/${eventId}/export/templates` },
  ];

  // Đóng các submenu khi sidebar đóng
  useEffect(() => {
    if (!sidebarOpen) {
      setWorkOpen(false);
      setFinanceOpen(false);
      setOverviewOpen(false);
      setRisksOpen(false);
      setExportsOpen(false);
    }
  }, [sidebarOpen]);

  // Cleanup hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);

  // Hover handlers giữ nguyên
  const handleMouseEnter = (menuType, e) => {
    if (hoverTimeout) { clearTimeout(hoverTimeout); setHoverTimeout(null); }
    if (e?.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const top = rect.top;
      const left = rect.right + 8;
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

  return (
    <div ref={sidebarRef} className={`shadow-sm ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`} style={{ width: sidebarOpen ? "230px" : "70px", height: "100vh", transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)", position: "fixed", left: 0, top: 0, zIndex: 1000, display: "flex", flexDirection: "column", background: "white", borderRadius: "0" }}>
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
          position: fixed;
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
      <div className="p-3 pb-0" style={{ flexShrink: 0, paddingBottom: "0px" }}>
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
                  onClick={() => navigate("/home-page")}
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

        {/* Current Event - Chỉ hiển thị khi có sự kiện */}
        {sidebarOpen && (
          <div className="mb-3" style={{ paddingBottom: 0 }}>
            <div className="group-title">SỰ KIỆN HIỆN TẠI</div>
            <div className="d-flex align-items-center" style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "white", color: "#dc2626", fontWeight: "bold", minHeight: 40, overflow: "hidden" }}>
              <Calendar size={18} className="me-2" />
              <span
                style={{ overflow: "hidden", wordWrap: "break-word", whiteSpace: "normal", lineHeight: "1.2" }}
                title={event?.name || (effectiveEventId ? "Đang tải..." : "(Chưa có sự kiện)")}
              >
                {event?.name || (effectiveEventId ? "Đang tải..." : "(Chưa có sự kiện)")}
              </span>
            </div>
          </div>
        )}
        
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
            <div className="mb-4">
              {sidebarOpen && <div style={{marginTop: "0px"}} className="group-title">ĐIỀU HƯỚNG</div>}
              <div className="d-flex flex-column gap-1">
                <button className={`btn-nav ${activePage === "home" ? "active" : ""}`} onClick={() => navigate("/home-page")} title="Trang chủ">
                  <div className="d-flex align-items-center">
                    <Home className="me-3" size={18} style={{ width: 20 }} />
                    {sidebarOpen && <span>Trang chủ</span>}
                  </div>
                </button>
              </div>
            </div>
        <div className="mb-4">
          {sidebarOpen && <div className="group-title">CHỨC NĂNG CHÍNH</div>}

          <div className="d-flex flex-column gap-1">
            {hasEvent && (
              <div
                className="menu-item-hover"
                onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("overview", e)}
                onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
              >
                <button
                  className={`btn-nav${activePage.startsWith("overview") ? " active" : ""}`}
                  onClick={() => sidebarOpen && setOverviewOpen((prev) => !prev)}
                  style={{ cursor: "pointer", background: hoveredMenu === "overview" && !sidebarOpen ? "#e7ebef" : undefined }}
                  title="Tổng quan"
                >
                  <div className="d-flex align-items-center">
                    <Grid size={20} className="me-3" />
                    {sidebarOpen && <span>Tổng quan</span>}
                  </div>
                  {sidebarOpen && (
                    overviewOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </button>

                {!sidebarOpen && hoveredMenu === "overview" && (
                  <div
                    className="hover-submenu"
                    style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px` }}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                  >
                    {overviewSubItems.map((item) => (
                      <button
                        key={item.id}
                        className={`hover-submenu-item${activePage === item.id ? " active" : ""}`}
                        onClick={() => item.onClick ? item.onClick() : navigate(item.path)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}

                {overviewOpen && sidebarOpen && (
                  <div className="ms-2">
                    {overviewSubItems.map((item) => (
                      <button
                        key={item.id}
                        className={`btn-submenu${activePage === item.id ? " active" : ""}`}
                        onClick={() => item.onClick ? item.onClick() : navigate(item.path)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ban sự kiện */}
            <button
              className={`btn-nav ${
                activePage === "department-management" ? "active" : ""
              }`}
              onClick={() => navigate(`/events/${eventId || ''}/departments`)}
              title="Ban sự kiện"
            >
              <div className="d-flex align-items-center">
                <Users size={20} className="me-3" />
                {sidebarOpen && <span>Ban sự kiện</span>}
              </div>
            </button>

            {/* Thành viên */}
            <button
              className={`btn-nav ${
                activePage === "members" ? "active" : ""
              }`}
              onClick={() => navigate(`/events/${eventId || ''}/members`)}
              title="Thành viên"
            >
              <div className="d-flex align-items-center">
                <User size={20} className="me-3" />
                {sidebarOpen && <span>Thành viên</span>}
              </div>
            </button>

            {/* Lịch cá nhân */}
            <button
              className={`btn-nav ${
                activePage === "calendar" ? "active" : ""
              }`}
              onClick={() => navigate("/events/" + (eventId || '') + "/my-calendar")}
              title="Lịch sự kiện"
            >
              <div className="d-flex align-items-center">
                <Calendar size={20} className="me-3" />
                {sidebarOpen && <span>Lịch sự kiện</span>}
              </div>
            </button>

            {/* Các menu khác - Chỉ hiển thị khi có sự kiện */}
            {hasEvent && (
              <>
                {isEventCompleted && (
                  <button
                    className={`btn-nav ${activePage === "feedback" ? "active" : ""}`}
                    onClick={() => navigate(`/events/${eventId || ''}/feedback`)}
                    title="Phản hồi sự kiện"
                  >
                    <div className="d-flex align-items-center">
                      <MessageSquareText size={20} className="me-3" />
                      {sidebarOpen && <span>Phản hồi</span>}
                    </div>
                  </button>
                )}

                <div
                  className="menu-item-hover"
                  onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("work", e)}
                  onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
                >
                  <button
                    className={`btn-nav${activePage.startsWith("work") ? " active" : ""}`}
                    onClick={() => sidebarOpen && setWorkOpen((prev) => !prev)}
                    style={{ cursor: "pointer", background: hoveredMenu === "work" && !sidebarOpen ? "#e7ebef" : undefined }}
                    title="Công việc"
                  >
                    <div className="d-flex align-items-center">
                      <FileText size={20} className="me-3" />
                      {sidebarOpen && <span>Công việc</span>}
                    </div>
                    {sidebarOpen && (
                      workOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </button>

                  {!sidebarOpen && hoveredMenu === "work" && (
                    <div
                      className="hover-submenu"
                      style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px` }}
                      onMouseEnter={handlePopupMouseEnter}
                      onMouseLeave={handlePopupMouseLeave}
                    >
                      {workSubItems.map((item) => (
                        <button
                          key={item.id}
                          className={`hover-submenu-item${activePage === item.id ? " active" : ""}`}
                          onClick={() => navigate(item.path)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {workOpen && sidebarOpen && (
                    <div className="ms-2">
                      {workSubItems.map((item) => (
                        <button
                          key={item.id}
                          className={`btn-submenu${activePage === item.id ? " active" : ""}`}
                          onClick={() => navigate(item.path)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="menu-item-hover"
                  onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("finance", e)}
                  onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
                >
                  <button
                    className={`btn-nav${activePage.startsWith("finance") ? " active" : ""}`}
                    onClick={() => sidebarOpen && setFinanceOpen((prev) => !prev)}
                    style={{ cursor: "pointer", background: hoveredMenu === "finance" && !sidebarOpen ? "#e7ebef" : undefined }}
                    title="Tài chính"
                  >
                    <div className="d-flex align-items-center">
                      <Coins size={20} className="me-3" />
                      {sidebarOpen && <span>Tài chính</span>}
                    </div>
                    {sidebarOpen && (
                      financeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </button>

                  {!sidebarOpen && hoveredMenu === "finance" && (
                    <div
                      className="hover-submenu"
                      style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px` }}
                      onMouseEnter={handlePopupMouseEnter}
                      onMouseLeave={handlePopupMouseLeave}
                    >
                      {financeSubItems.map((item) => (
                        <button
                          key={item.id}
                          className={`hover-submenu-item${activePage === item.id ? " active" : ""}`}
                          onClick={() => navigate(item.path)}
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
                          className={`btn-submenu${activePage === item.id ? " active" : ""}`}
                          onClick={() => navigate(item.path)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rủi ro */}
                <div
                  className="menu-item-hover"
                  onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("risk", e)}
                  onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
                >
                  <button
                    className={`btn-nav${activePage.startsWith("risk") ? " active" : ""}`}
                    onClick={() => sidebarOpen && setRisksOpen((prev) => !prev)}
                    style={{ cursor: "pointer", background: hoveredMenu === "risk" && !sidebarOpen ? "#e7ebef" : undefined }}
                    title="Rủi ro"
                  >
                    <div className="d-flex align-items-center">
                      <Bug size={20} className="me-3" />
                      {sidebarOpen && <span>Rủi ro</span>}
                    </div>
                    {sidebarOpen && (
                      risksOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </button>

                  {!sidebarOpen && hoveredMenu === "risk" && (
                    <div
                      className="hover-submenu"
                      style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px` }}
                      onMouseEnter={handlePopupMouseEnter}
                      onMouseLeave={handlePopupMouseLeave}
                    >
                      {risksSubItems.map((item) => (
                        <button
                          key={item.id}
                          className={`hover-submenu-item${activePage === item.id ? " active" : ""}`}
                          onClick={() => navigate(item.path)}
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
                          className={`btn-submenu${activePage === item.id ? " active" : ""}`}
                          onClick={() => navigate(item.path)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Xuất */}
                <div
                  className="menu-item-hover"
                  onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("export", e)}
                  onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
                >
                  <button
                    className={`btn-nav${activePage.startsWith("export") ? " active" : ""}`}
                    onClick={() => sidebarOpen && setExportsOpen((prev) => !prev)}
                    style={{ cursor: "pointer", background: hoveredMenu === "export" && !sidebarOpen ? "#e7ebef" : undefined }}
                    title="Tải xuống"
                  >
                    <div className="d-flex align-items-center">
                      <Database size={20} className="me-3" />
                      {sidebarOpen && <span>Tải xuống</span>}
                    </div>
                    {sidebarOpen && (
                      exportsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </button>

                  {!sidebarOpen && hoveredMenu === "export" && (
                    <div
                      className="hover-submenu"
                      style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px` }}
                      onMouseEnter={handlePopupMouseEnter}
                      onMouseLeave={handlePopupMouseLeave}
                    >
                      {exportSubItems.map((item) => (
                        <button
                          key={item.id}
                          className={`hover-submenu-item${activePage === item.id ? " active" : ""}`}
                          onClick={() => navigate(item.path)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {exportsOpen && sidebarOpen && (
                    <div className="ms-2">
                      {exportSubItems.map((item) => (
                        <button
                          key={item.id}
                          className={`btn-submenu${activePage === item.id ? " active" : ""}`}
                          onClick={() => navigate(item.path)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
              </>
            )}
          </div>
        </div>

        {/* Cài đặt */}
        <div className="mb-4">
          {sidebarOpen && <div className="group-title">CÀI ĐẶT</div>}
          <div className="d-flex flex-column gap-1">
            <button className={`btn-nav ${activePage === "notifications" ? "active" : ""}`} onClick={() => navigate("/notifications")} title="Thông báo">
              <div className="d-flex align-items-center">
                <Bell size={20} className="me-3" />
                {sidebarOpen && <span>Thông báo</span>}
              </div>
            </button>
            <button className={`btn-nav ${activePage === "settings" ? "active" : ""}`} onClick={() => navigate("/setting")} title="Cài đặt">
              <div className="d-flex align-items-center">
                <Settings size={20} className="me-3" />
                {sidebarOpen && <span>Cài đặt</span>}
              </div>
            </button>
            <button className={`btn-nav ${activePage === "support" ? "active" : ""}`} onClick={() => navigate("/support")} title="Hỗ trợ">
              <div className="d-flex align-items-center">
                <HelpCircle size={20} className="me-3" />
                {sidebarOpen && <span>Hỗ trợ</span>}
              </div>
            </button>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Footer: Version & Logo Bộ Công Thương */}
      <div
        className="p-2"
        style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb" }}
      >
        {sidebarOpen ? (
          <div style={{  margin: 0 }}>
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