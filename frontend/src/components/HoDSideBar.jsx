import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEvents } from "~/contexts/EventContext";
import { useAuth } from "~/contexts/AuthContext";
import { toast } from "react-toastify";
import Loading from "./Loading";
import { APP_VERSION } from "~/config";
import { ArrowLeft, Bell, Bug, Calendar, Coins, Grid, HelpCircle, Menu, Moon, Settings, Sun, User, Users } from "lucide-react";


export default function HoDSideBar({
  sidebarOpen,
  setSidebarOpen,
  activePage = "home",
  eventId, 
}) {
  const STORAGE_KEY = 'sidebar_state_hod';
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state với giá trị mặc định
  const [workOpen, setWorkOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
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
        if (parsed.exportOpen !== undefined) {
          setExportOpen(parsed.exportOpen);
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
      exportOpen,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  }, [isInitialized, sidebarOpen, workOpen, financeOpen, overviewOpen, risksOpen, exportOpen]);

  const risksSubItems = [
    { id: "risk-list", label: "Danh sách rủi ro", path: `/events/${eventId || ''}/risks` },
    { id: "risk-analysis", label: "Phân tích rủi ro", path: `/events/${eventId || ''}/risks/analysis` },
  ];
  // get context events (if needed) and loading flag
  const { events: ctxEvents, loading: ctxLoading } = useEvents();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Process events from context
  const myEvents = useMemo(() => {
    if (!ctxEvents || ctxEvents.length === 0) return [];
    
    // If there's an eventId in props/URL, prefer that event first
    let sortedList = [...ctxEvents];
    if (eventId) {
      const idx = sortedList.findIndex((e) => (e._id || e.id) === eventId);
      if (idx !== -1) {
        const [currentEvent] = sortedList.splice(idx, 1);
        sortedList = [currentEvent, ...sortedList];
      }
    }

    return sortedList.map(e => ({
      id: e._id || e.id,
      name: e.name,
      status: e.status,
      icon: "bi-calendar-event",
      membership: e.membership,
    }));
  }, [ctxEvents, eventId]);

  const selectedEvent = eventId || (myEvents.length > 0 ? myEvents[0].id : "");
  const currentEventMembership = myEvents.find(e => e.id === selectedEvent)?.membership || null;
  const hasEvents = myEvents && myEvents.length > 0;

  useEffect(() => {
    if (!sidebarOpen) {
      setWorkOpen(false);
      setFinanceOpen(false);
      setOverviewOpen(false);
      setExportOpen(false);
    }
  }, [sidebarOpen]);

  useEffect(() => {
    return () => { if (hoverTimeout) clearTimeout(hoverTimeout); };
  }, [hoverTimeout]);

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

  // Submenu Tổng quan - HoD có quyền xem
  const overviewSubItems = [
    { id: "overview-dashboard", label: "Dashboard tổng", path: `/hod-dashboard?eventId=${eventId}` },
    { id: "overview-detail", label: "Chi tiết sự kiện", path: `/events/${selectedEvent || ''}/hod-event-detail` },
    { id: "overview-timeline", label: "Timeline sự kiện", path: `/events/${selectedEvent || ''}/milestones` }
  ];

  const workSubItems = [
    { id: "work-board", label: "Danh sách công việc", path: `/events/${eventId || ''}/hod-tasks` },
    { id: "work-list", label: "Biểu đồ Gantt", path: `/events/${eventId}/tasks/gantt` },
    // { id: "work-timeline", label: "Timeline công việc", path: `/events/${selectedEvent || ''}/hooc-manage-milestone` },
    // { id: "work-stats", label: "Thống kê tiến độ", path: `/events/${eventId}/tasks/hod-statistic` },
  ];
  // Helper function để lấy userId từ user object hoặc localStorage
  const getUserId = () => {
    // Thử từ context trước
    const userId = user?._id || user?.id || user?.userId?._id || user?.userId?.id;
    if (userId) return userId;
    
    // Nếu không có trong context, thử từ localStorage
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        return parsedUser?._id || parsedUser?.id;
      }
    } catch (e) {
      console.error("Error reading user from localStorage:", e);
    }
    
    return null;
  };

  // Helper function để tìm department của user
  const findUserDepartment = async (currentEventId, userId) => {
    try {
      const { departmentService } = await import("~/services/departmentService");
      const departments = await departmentService.getDepartments(currentEventId);
      
      // Đảm bảo departments là array (service đã unwrap response)
      const departmentsArray = Array.isArray(departments) ? departments : [];
      
      if (departmentsArray.length === 0) {
        console.warn("No departments found for event:", currentEventId);
        return null;
      }
      
      // Tìm department mà user là HoD (leader)
      let userDepartment = departmentsArray.find(dept => {
        const leaderId = dept.leaderId?._id || dept.leaderId || dept.leader?._id || dept.leader;
        return leaderId === userId || leaderId?.toString() === userId?.toString();
      });
      
      // Nếu không tìm thấy theo leader, tìm theo member
      if (!userDepartment) {
        for (const dept of departmentsArray) {
          try {
            const members = await departmentService.getMembersByDepartment(currentEventId, dept._id || dept.id);
            // Service đã unwrap, nên members là array
            const membersArray = Array.isArray(members) ? members : [];
            const isMember = membersArray.some(member => {
              const memberUserId = member.userId?._id || member.userId || member._id;
              return memberUserId === userId || memberUserId?.toString() === userId?.toString();
            });
            if (isMember) {
              userDepartment = dept;
              break;
            }
          } catch (err) {
            // Skip nếu không lấy được members
            continue;
          }
        }
      }
      
      return userDepartment;
    } catch (error) {
      console.error("Error in findUserDepartment:", error);
      return null;
    }
  };

  // Helper function để navigate đến budget của department hiện tại
  const handleBudgetClick = async () => {
    const currentEventId = eventId || selectedEvent;
    if (!currentEventId) {
      toast.error("Vui lòng chọn sự kiện trước");
      return;
    }
    
    // Đợi auth loading xong
    if (authLoading) {
      toast.info("Đang kiểm tra đăng nhập...");
      return;
    }
    
    // Lấy userId
    const userId = getUserId();
    if (!userId) {
      console.warn("User not found or not logged in. User object:", user);
      toast.error("Vui lòng đăng nhập để xem budget");
      return;
    }
    
    try {
      // Tìm department của user
      const userDepartment = await findUserDepartment(currentEventId, userId);
      
      if (userDepartment?._id || userDepartment?.id) {
        navigate(`/events/${currentEventId}/budgets/departments`);
      } else {
        // Nếu không tìm thấy, điều hướng đến trang departments
        navigate(`/events/${currentEventId}/departments`);
        toast.info("Vui lòng chọn ban để xem budget");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      // Fallback: điều hướng đến trang departments
      navigate(`/events/${currentEventId}/departments`);
      toast.error("Không thể tải thông tin ban. Vui lòng chọn ban từ danh sách.");
    }
  };

  const financeSubItems = [
    { id: "budget", label: "Ngân sách", path: null, onClick: handleBudgetClick },
    { id: "finance-stats", label: "Thống kê thu chi", path: `/events/${eventId || selectedEvent || ''}/budgets/statistics` },
  ];

  const exportSubItems = [
    { id: "export-all", label: "Dữ liệu sự kiện", path: `/events/${eventId || selectedEvent || ''}/export/data` },
    { id: "export-example", label: "Mẫu tài liệu", path: `/events/${eventId || selectedEvent || ''}/export/templates` },
  ];

  // find the event object (from myEvents)
  const currentEvent = myEvents.find(e => e.id === (eventId || selectedEvent));
  const hasEvent = !!currentEvent;
  const isEventCompleted = hasEvent && ['completed', 'ended', 'finished'].includes((currentEvent?.status || '').toLowerCase());

  // Chỉ show loading khi chưa có events VÀ đang loading
  const showLoading = ctxLoading && ctxEvents.length === 0;

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
      <div className="p-3 pb-0" style={{ flexShrink: 0, paddingBottom: "0px" }}>
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
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setSidebarOpen(false)} style={{ padding: "4px 8px" }}>
              <ArrowLeft size={18} />
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
                title={myEvents.find(e => e.id === selectedEvent)?.name || "(Chưa chọn sự kiện)"}
              >
                {myEvents.find(e => e.id === selectedEvent)?.name || "(Chưa chọn sự kiện)"}
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
              {sidebarOpen && <div style={{ marginTop: "0px" }} className="group-title">ĐIỀU HƯỚNG</div>}
              <div className="d-flex flex-column gap-1">
                <button className={`btn-nav ${activePage === "notifications" ? "active" : ""}`} onClick={() => navigate("/home-page")} title="Trang chủ">
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
            {/* Dropdown Tổng quan - Chỉ hiển thị khi có sự kiện */}
            {hasEvents && (
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
                    <i className="bi bi-grid me-3" style={{ width: 20 }} />
                    {sidebarOpen && <span>Tổng quan</span>}
                  </div>
                  {sidebarOpen && (
                    <i className={`bi ${overviewOpen ? "bi-chevron-up" : "bi-chevron-down"}`} />
                  )}
                </button>

                {!sidebarOpen && hoveredMenu === "overview" && (
                  <div
                    className="hover-submenu"
                    style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px`, position: "absolute" }}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                  >
                    {overviewSubItems.map((item) => (
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

                {overviewOpen && sidebarOpen && (
                  <div className="ms-2">
                    {overviewSubItems.map((item) => (
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
            )}

            {/* Ban sự kiện */}
            <button
              className={`btn-nav ${activePage === "event-board" ? "active" : ""
                }`}
              onClick={() => navigate(`/events/${eventId || ''}/departments`)}
              title="Ban sự kiện"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-people me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Ban sự kiện</span>}
              </div>
            </button>

            {/* Thành viên */}
            <button
              className={`btn-nav ${activePage === "members" ? "active" : ""
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
              className={`btn-nav ${activePage === "calendar" ? "active" : ""
                }`}
              onClick={() => navigate(`/events/${eventId || ''}/my-calendar`)}
              title="Lịch sự kiện"
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-calendar me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Lịch sự kiện</span>}
              </div>
            </button>

            {/* Các menu khác - Chỉ hiển thị khi có sự kiện */}
            {hasEvents && (
              <>
                <button
                  className={`btn-nav ${activePage === "feedback" ? "active" : ""}`}
                  onClick={() => navigate(`/events/${eventId || selectedEvent || ''}/feedback/member`)}
                  title="Phản hồi sự kiện"
                >
                  <div className="d-flex align-items-center">
                    <i className="bi bi-chat-dots me-3" style={{ width: 20 }} />
                    {sidebarOpen && <span>Feedback</span>}
                  </div>
                </button>

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
                      <i className="bi bi-file-text me-3" style={{ width: 20 }} />
                      {sidebarOpen && <span>Công việc</span>}
                    </div>
                    {sidebarOpen && (
                      <i className={`bi ${workOpen ? "bi-chevron-up" : "bi-chevron-down"}`} />
                    )}
                  </button>

                  {!sidebarOpen && hoveredMenu === "work" && (
                    <div
                      className="hover-submenu"
                      style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px`, position: "absolute" }}
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
                      <i className="bi bi-cash-coin me-3" style={{ width: 20 }} />
                      {sidebarOpen && <span>Tài chính</span>}
                    </div>
                    {sidebarOpen && (
                      <i className={`bi ${financeOpen ? "bi-chevron-up" : "bi-chevron-down"}`} />
                    )}
                  </button>

                  {!sidebarOpen && hoveredMenu === "finance" && (
                    <div
                      className="hover-submenu"
                      style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px`, position: "absolute" }}
                      onMouseEnter={handlePopupMouseEnter}
                      onMouseLeave={handlePopupMouseLeave}
                    >
                      {financeSubItems.map((item) => (
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

                  {financeOpen && sidebarOpen && (
                    <div className="ms-2">
                      {financeSubItems.map((item) => (
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
                {/* Xuất dữ liệu */}
                <div
                  className="menu-item-hover"
                  onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("export", e)}
                  onMouseLeave={() => !sidebarOpen && handleMouseLeave()}
                >
                  <button
                    className={`btn-nav${activePage.startsWith("export") ? " active" : ""}`}
                    onClick={() => sidebarOpen && setExportOpen((prev) => !prev)}
                    style={{ cursor: "pointer", background: hoveredMenu === "export" && !sidebarOpen ? "#e7ebef" : undefined }}
                    title="Tải xuống"
                  >
                    <div className="d-flex align-items-center">
                      <i className="bi bi-download me-3" style={{ width: 20 }} />
                      {sidebarOpen && <span>Tải xuống</span>}
                    </div>
                    {sidebarOpen && (
                      <i className={`bi ${exportOpen ? "bi-chevron-up" : "bi-chevron-down"}`} />
                    )}
                  </button>

                  {!sidebarOpen && hoveredMenu === "export" && (
                    <div
                      className="hover-submenu"
                      style={{ left: `${hoverPos.left}px`, top: `${hoverPos.top}px`, position: "absolute" }}
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

                  {exportOpen && sidebarOpen && (
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
                <i className="bi bi-bell me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Thông báo</span>}
              </div>
            </button>
            <button className={`btn-nav ${activePage === "settings" ? "active" : ""}`} onClick={() => navigate("/setting")} title="Cài đặt">
              <div className="d-flex align-items-center">
                <i className="bi bi-gear me-3" style={{ width: 20 }} />
                {sidebarOpen && <span>Cài đặt</span>}
              </div>
            </button>
            <button className={`btn-nav ${activePage === "support" ? "active" : ""}`} onClick={() => navigate("/support")} title="Hỗ trợ">
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
            <Menu size={18} />
          </button>
        )}
      </div>

    </div>
  );
}