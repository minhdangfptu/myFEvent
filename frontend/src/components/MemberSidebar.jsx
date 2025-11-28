import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents } from "../contexts/EventContext";
import Loading from "./Loading";
import { APP_VERSION } from "~/config";

export default function MemberSidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage = "home",
  eventId, // Nhận eventId qua props
}) {
  const STORAGE_KEY = 'sidebar_state_member';
  const [isInitialized, setIsInitialized] = useState(false);

  const [workOpen, setWorkOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);
  const [theme, setTheme] = useState("light");

  // Hover popup (khi sidebar đóng)
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
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  }, [isInitialized, sidebarOpen, workOpen, financeOpen, overviewOpen, risksOpen]);

  // Sử dụng eventId từ props thay vì lấy từ URL
  const { events, loading } = useEvents();
  const event = useMemo(() => events.find(e => (e._id || e.id) === eventId), [events, eventId]);
  const hasEvents = !!event;
  const isEventCompleted = hasEvents && ['completed', 'ended', 'finished'].includes((event?.status || '').toLowerCase());
  const navigate = useNavigate();

  // Chỉ show loading khi chưa có events VÀ đang loading
  const showLoading = loading && events.length === 0;

  // Nếu cần chọn event ưu tiên theo eventId url: giữ lại block ưu tiên hoặc tính toán selectedEvent dựa vào events context vừa lấy được. Không fetch độc lập nữa.

  useEffect(() => {
    if (!sidebarOpen) {
      setWorkOpen(false);
      setFinanceOpen(false);
      setOverviewOpen(false);
    }
  }, [sidebarOpen]);

  useEffect(
    () => () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    },
    [hoverTimeout]
  );

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


  // Submenu Tổng quan - Member có đầy đủ quyền trừ thống kê
  const overviewSubItems = [
    {
      id: "overview-dashboard",
      label: "Dashboard tổng",
      path: `/member-dashboard${eventId ? `?eventId=${eventId}` : ''}`,
    },
    {
      id: "overview-detail",
      label: "Chi tiết sự kiện",
      path: `/member-event-detail/${eventId || ""}`,
    },
    { id: "overview-timeline", label: "Timeline sự kiện", path: `/events/${eventId || ''}/milestones` },
  ];

  // Submenu Công việc - Member có đầy đủ quyền trừ thống kê tiến độ
  const workSubItems = [
    { id: "work-board", label: "Danh sách công việc", path: `/events/${eventId || ''}/member-tasks` },
    { id: "work-gantt", label: "Biểu đồ Gantt", path: `/events/${eventId}/tasks/gantt` },
    // Không có work-stats (thống kê tiến độ)
  ];

  // Submenu Tài chính - Member có đầy đủ quyền trừ thống kê thu chi
  const financeSubItems = [
    // Ngân sách: trang budget riêng cho member
    { id: "budget", label: "Ngân sách", path: `/events/${eventId || ''}/budgets/member` },
    { id: "expenses", label: "Chi tiêu", path: `/events/${eventId || ''}/expenses` },
    // Không có finance-stats (thống kê thu chi)
  ];
  const risksSubItems = [
    { id: "risk-list", label: "Danh sách rủi ro", path: `/events/${eventId || ''}/risks` },
  ];

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
      <div className="p-3 pb-0" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div
            className="logo-container"
            style={{cursor: "pointer"}}
          >
            <div className="logo-content d-flex align-items-center ">
              <div style={{ display: "flex", alignItems: "center", marginRight: "10px" }}>
                <img  onClick={() => setSidebarOpen(!sidebarOpen)} className="hover-rotate" src="/website-icon-fix@3x.png" alt="myFEvent" style={{ width: 40, height: 40 }} />
              </div>
              {sidebarOpen &&  <img
              onClick={() => navigate("/home-page")}
              src="/logo-03.png"
              alt="myFEvent"
              style={{ width: "auto", height: 40 }}
            />}
            </div>
          </div>

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

        {/* Current Event - Chỉ hiển thị khi có sự kiện */}
        {sidebarOpen && hasEvents && (
          <div className="mb-3" style={{ paddingBottom: 0 }}>
            <div className="group-title">SỰ KIỆN HIỆN TẠI</div>
            <div 
              className="d-flex align-items-center"
              style={{
                padding: "8px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                background: "white",
                color: "#dc2626",
                fontWeight: "bold",
                minHeight: 40,
                overflow: "hidden"
              }}
            >
              
              <i className="bi bi-calendar-event me-2"></i>
              <span 
                style={{ 
                  overflow: "hidden", 
                  wordWrap: "break-word", 
                  whiteSpace: "normal",
                  lineHeight: "1.2"
                }}
                title={event?.name || "(Chưa chọn sự kiện)"}
              >
                {event?.name || "(Chưa chọn sự kiện)"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nội dung cuộn */}
      <div className="sidebar-content pt-0">
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
          {sidebarOpen && <div className="group-title">ĐIỀU HƯỚNG</div>}
          <div className="d-flex flex-column gap-1">
            <button
              className={`btn-nav ${
                activePage === "notifications" ? "active" : ""
              }`}
              onClick={() => navigate("/home-page")}
              title="Trang chủ"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-list me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Trang chủ</span>}
              </div>
            </button>
          </div>
        </div>
        <div className="mb-4">
          {sidebarOpen && <div className="group-title">CHỨC NĂNG CHÍNH</div>}

          <div className="d-flex flex-column gap-1">
            {hasEvents && (
              <div
                className="menu-item-hover"
                onMouseEnter={(e) =>
                  !sidebarOpen && handleMouseEnter("overview", e)
                }
                onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
              >
                <button
                  className={`btn-nav${
                    activePage.startsWith("overview") ? " active" : ""
                  }`}
                  onClick={() =>
                    sidebarOpen && setOverviewOpen((prev) => !prev)
                  }
                  style={{
                    cursor: "pointer",
                    background:
                      hoveredMenu === "overview" && !sidebarOpen
                        ? "#e7ebef"
                        : undefined,
                  }}
                  title="Tổng quan"
                >
                  <div className="d-flex align-items-center">
                    <i className="bi bi-grid me-3" style={{ width: 20 }} />
                    {sidebarOpen && <span>Tổng quan</span>}
                  </div>
                  {sidebarOpen && (
                    <i
                      className={`bi ${
                        overviewOpen ? "bi-chevron-up" : "bi-chevron-down"
                      }`}
                    />
                  )}
                </button>

                {!sidebarOpen && hoveredMenu === "overview" && (
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
                    {overviewSubItems.map((item) => (
                      <button
                        key={item.id}
                        className={`hover-submenu-item${
                          activePage === item.id ? " active" : ""
                        }`}
                        onClick={() => navigate(item.path)}
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
                        className={`btn-submenu${
                          activePage === item.id ? " active" : ""
                        }`}
                        onClick={() => navigate(item.path)}
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
                activePage === "event-board" ? "active" : ""
              }`}
              onClick={() => navigate(`/events/${eventId || ''}/departments`)}
              title="Ban của bạn"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-people me-3" style={{ width: 20 }} />
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
                <i className="bi bi-person me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Thành viên</span>}
              </div>
            </button>

            {/* Lịch cá nhân */}
            <button
              className={`btn-nav ${
                activePage === "calendar" ? "active" : ""
              }`}
              onClick={() => navigate(`/events/${eventId || ''}/my-calendar`)}
              title="Lịch sự kiện"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-calendar me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Lịch sự kiện</span>}
              </div>
            </button>

            {hasEvents && (
              <button
                className={`btn-nav ${activePage === "feedback" ? "active" : ""}`}
                onClick={() => navigate(`/events/${eventId || ''}/feedback/member`)}
                title="Phản hồi sự kiện"
              >
                <div className="d-flex align-items-center">
                  <i className="bi bi-chat-dots me-3" style={{ width: 20 }} />
                  {sidebarOpen && <span>Feedback</span>}
                </div>
              </button>
            )}

            {/* Các menu khác - Chỉ hiển thị khi có sự kiện */}
            {hasEvents && (
              <>
                <div
                  className="menu-item-hover"
                  onMouseEnter={(e) =>
                    !sidebarOpen && handleMouseEnter("work", e)
                  }
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
                      <i
                        className="bi bi-file-text me-3"
                        style={{ width: 20 }}
                      />
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
                          className={`btn-submenu${
                            activePage === item.id ? " active" : ""
                          }`}
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
                  onMouseEnter={(e) =>
                    !sidebarOpen && handleMouseEnter("finance", e)
                  }
                  onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
                >
                  <button
                    className={`btn-nav${
                      activePage.startsWith("finance") ? " active" : ""
                    }`}
                    onClick={() =>
                      sidebarOpen && setFinanceOpen((prev) => !prev)
                    }
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
                      <i className="bi bi-cash-coin me-3" style={{ width: 20 }} />
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
                          className={`btn-submenu${
                            activePage === item.id ? " active" : ""
                          }`}
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
                      <i className="bi bi-bug me-3" style={{ width: 20 }} />
                      {sidebarOpen && <span>Rủi ro</span>}
                    </div>
                    {sidebarOpen && (
                      <i className={`bi ${risksOpen ? "bi-chevron-up" : "bi-chevron-down"}`} />
                    )}
                  </button>

                  {!sidebarOpen && hoveredMenu === "risk" && (
                    <div
                      className="hover-submenu"
                      style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px`, position: "absolute" }}
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
              </>
            )}
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
              onClick={() => navigate("/notifications")}
              title="Thông báo"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-bell me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Thông báo</span>}
              </div>
            </button>
            <button
              className={`btn-nav ${activePage === "settings" ? "active" : ""}`}
              onClick={() => navigate("/setting")}
              title="Cài đặt"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-gear me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Cài đặt</span>}
              </div>
            </button>
            <button
              className={`btn-nav ${activePage === "support" ? "active" : ""}`}
              onClick={() => navigate("/support")}
              title="Hỗ trợ"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-question-circle me-3" style={{ width: 20 }} />
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
          <div style={{ paddingBottom: 10, margin: 0 }}>
            {/* Theme toggle - Commented out
            <div className="theme-toggle">
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
            */}

            {/* App Version + Dev info + Logo Bộ Công Thương */}
            <div
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
