import { useEffect, useMemo, useState, useRef } from "react";
import { eventApi } from "../apis/eventApi";

export default function HoOCSidebar({ sidebarOpen, setSidebarOpen, activePage = "home" }) {
	const [workOpen, setWorkOpen] = useState(false);
	const [financeOpen, setFinanceOpen] = useState(false);
	const [risksOpen, setRisksOpen] = useState(false);
	const [theme, setTheme] = useState("light");
	const [hoveredMenu, setHoveredMenu] = useState(null);
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
				console.log('HoOC: Fetching events for sidebar...');
				const res = await eventApi.listMyEvents();
				console.log('HoOC: API response:', res);
				const list = Array.isArray(res?.data) ? res.data : [];
				console.log('HoOC: Events list:', list);
				const mapped = list.map(e => ({ id: e._id || e.id, name: e.name, icon: "bi-calendar-event" }));
				console.log('HoOC: Mapped events:', mapped);
				if (mounted) {
					setEvents(mapped);
					if (mapped.length && !selectedEvent) setSelectedEvent(mapped[0].name);
				}
			} catch (error) {
				console.error('HoOC: Error fetching events:', error);
			}
		})();
		return () => { mounted = false };
	}, []);

	useEffect(() => {
		if (!sidebarOpen) {
			setWorkOpen(false);
			setFinanceOpen(false);
			setRisksOpen(false);
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

	const mainMenuItems = useMemo(() => [
		{ id: "overview", icon: "bi-house-door", label: "Tổng quan", path: "/user-landing-page" },
		{ id: "event-board", icon: "bi-people", label: "Ban sự kiện", path: "/event-board" },
		{ id: "members", icon: "bi-person", label: "Thành viên", path: "/member" },
		{ id: "calendar", icon: "bi-calendar", label: "Lịch cá nhân", path: "/calendar" },
	], []);

	const workSubItems = [
		{ id: "work-board", label: "Bảng công việc", path: "/work-board" },
		{ id: "work-list", label: "List công việc", path: "/task" },
		{ id: "work-timeline", label: "Timeline công việc", path: "/work-timeline" },
		{ id: "work-stats", label: "Thống kê tiến độ", path: "/work-stats" },
	];
	const financeSubItems = [
		{ id: "budget", label: "Ngân sách", path: "/budget" },
		{ id: "expenses", label: "Chi tiêu", path: "/expenses" },
		{ id: "income", label: "Thu nhập", path: "/income" },
		{ id: "finance-stats", label: "Thống kê thu chi", path: "/finance-stats" },
	];
	const risksSubItems = [
		{ id: "risk-list", label: "Danh sách rủi ro", path: "/risk" },
		{ id: "risk-analysis", label: "Phân tích rủi ro", path: "/risk-analysis" },
		{ id: "risk-mitigation", label: "Giảm thiểu rủi ro", path: "/risk-mitigation" },
	];

	return (
		<div ref={sidebarRef} className={`shadow-sm ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`} style={{ width: sidebarOpen ? "230px" : "70px", height: "100vh", transition: "width 0.3s ease", position: "fixed", left: 0, top: 0, zIndex: 1000, display: "flex", flexDirection: "column", background: "white", borderRadius: "0" }}>
			<style>{`
			.sidebar-logo { font-family:'Brush Script MT',cursive;font-size:1.5rem;font-weight:bold;color:#dc2626; }
			.group-title { font-size:.75rem;font-weight:600;letter-spacing:.05em;color:#374151;margin:16px 0 8px;text-transform:uppercase; }
			.btn-nav{ border:0;background:transparent;color:#374151;border-radius:8px;padding:10px 12px;text-align:left;transition:all .2s ease;width:100%;display:flex;align-items:center;justify-content:space-between;}
			.btn-nav:hover{ background:#e9ecef; }
			.btn-nav.active{ background:#e9ecef;color:#111827; }
			.menu-item-hover:hover .btn-nav{ background:#e9ecef; }
			.btn-submenu{ border:0;background:transparent;color:#6b7280;border-radius:6px;padding:8px 12px 8px 24px;text-align:left;transition:all .2s ease;width:100%;font-size:.9rem;}
			.btn-submenu:hover{ background:#f9fafb;color:#374151;}
			.btn-submenu.active{ background:#f3f4f6;color:#111827;}
			.sidebar-content{ flex:1;overflow-y:auto;overflow-x:hidden;padding:12px;scrollbar-width:thin;scrollbar-color:#c1c1c1 #f1f1f1;}
			.sidebar-content::-webkit-scrollbar{ width:6px; }
			.sidebar-content::-webkit-scrollbar-track{ background:#f1f1f1;border-radius:3px; }
			.sidebar-content::-webkit-scrollbar-thumb{ background:#c1c1c1;border-radius:3px; }
			.sidebar-content::-webkit-scrollbar-thumb:hover{ background:#a8a8a8; }
			`}</style>

			<div className="p-3" style={{ flexShrink: 0 }}>
				<div className="d-flex align-items-center justify-content-between mb-2">
					<div className="logo-container" onClick={() => !sidebarOpen && setSidebarOpen(true)} style={{ cursor: !sidebarOpen ? "pointer" : "default" }}>
						<div className="logo-content d-flex align-items-center ">
							<div style={{ display: "flex", alignItems: "center", marginRight: "10px" }}>
								<img src="/website-icon-fix@3x.png" alt="myFEvent" style={{ width: 40, height: 40 }} />
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

				{sidebarOpen && (
					<div className="mb-3" style={{ paddingBottom: 0 }}>
						<div className="group-title">SỰ KIỆN HIỆN TẠI</div>
						<div className="dropdown">
							<button className="btn btn-outline-secondary dropdown-toggle w-100 d-flex align-items-center justify-content-between" type="button" data-bs-toggle="dropdown" aria-expanded="false" style={{ textAlign: "left", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "white", color: "#dc2626", fontWeight: "bold", height: 40 }}>
								<div className="d-flex align-items-center">
									<span>{selectedEvent || (hasEvents ? events[0]?.name : "Chưa tham gia sự kiện")}</span>
								</div>
							</button>
							<ul className="dropdown-menu w-100" style={{ padding: 0 }}>
								{events.map((event) => (
									<li key={event.id}>
										<button className="dropdown-item d-flex align-items-center" style={{ textAlign: "left", paddingLeft: 16 }} onClick={() => window.location.href = `/hooc-event-detail/${event.id}`}>
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

			<div className="sidebar-content">
				<div className="mb-4">
					{sidebarOpen && <div className="group-title">CHỨC NĂNG CHÍNH</div>}
					<div className="d-flex flex-column gap-1">
						{mainMenuItems.map((item) => {
							const isActive = activePage === item.id;
							return (
								<button key={item.id} className={`btn-nav ${isActive ? "active" : ""}`} onClick={() => (window.location.href = item.path)} title={item.label}>
									<div style={{display: "flex", alignItems: 'center', justifyContent:"center"}} className="d-flex align-items-center">
										<i className={`${item.icon} me-3`} style={{ width: 20 }} />
										{sidebarOpen && <span>{item.label}</span>}
									</div>
								</button>
							);
						})}

						<div className="menu-item-hover" onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("work", e)} onMouseLeave={() => !sidebarOpen && handleMouseLeave()}>
							<button className={`btn-nav${activePage.startsWith("work") ? " active" : ""}`} onClick={() => sidebarOpen && setWorkOpen((prev) => !prev)} title="Công việc">
								<div className="d-flex align-items-center">
									<i className="bi bi-file-text me-3" style={{ width: 20 }} />
									{sidebarOpen && <span>Công việc</span>}
								</div>
								{sidebarOpen && (
									<i className={`bi ${workOpen ? "bi-chevron-up" : "bi-chevron-down"}`} />
								)}
							</button>

							{workOpen && sidebarOpen && (
								<div className="ms-2">
									{workSubItems.map((item) => (
										<button key={item.id} className={`btn-submenu${activePage === item.id ? " active" : ""}`} onClick={() => (window.location.href = item.path)}>
											{item.label}
										</button>
									))}
								</div>
							)}
						</div>

						<div className="menu-item-hover" onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("finance", e)} onMouseLeave={() => !sidebarOpen && handleMouseLeave()}>
							<button className={`btn-nav${activePage.startsWith("finance") ? " active" : ""}`} onClick={() => sidebarOpen && setFinanceOpen((prev) => !prev)} title="Tài chính">
								<div className="d-flex align-items-center">
									<i className="bi bi-camera me-3" style={{ width: 20 }} />
									{sidebarOpen && <span>Tài chính</span>}
								</div>
								{sidebarOpen && (
									<i className={`bi ${financeOpen ? "bi-chevron-up" : "bi-chevron-down"}`} />
								)}
							</button>

							{financeOpen && sidebarOpen && (
								<div className="ms-2">
									{financeSubItems.map((item) => (
										<button key={item.id} className={`btn-submenu${activePage === item.id ? " active" : ""}`} onClick={() => (window.location.href = item.path)}>
											{item.label}
										</button>
									))}
								</div>
							)}
						</div>

						<div className="menu-item-hover" onMouseEnter={(e) => !sidebarOpen && handleMouseEnter("risk", e)} onMouseLeave={() => !sidebarOpen && handleMouseLeave()}>
							<button className={`btn-nav${activePage.startsWith("risk") ? " active" : ""}`} onClick={() => sidebarOpen && setRisksOpen((prev) => !prev)} title="Rủi ro">
								<div className="d-flex align-items-center">
									<i className="bi bi-bug me-3" style={{ width: 20 }} />
									{sidebarOpen && <span>Rủi ro</span>}
								</div>
								{sidebarOpen && (
									<i className={`bi ${risksOpen ? "bi-chevron-up" : "bi-chevron-down"}`} />
								)}
							</button>

							{risksOpen && sidebarOpen && (
								<div className="ms-2">
									{risksSubItems.map((item) => (
										<button key={item.id} className={`btn-submenu${activePage === item.id ? " active" : ""}`} onClick={() => (window.location.href = item.path)}>
											{item.label}
										</button>
									))}
								</div>
							)}
						</div>

						<button className={`btn-nav ${activePage === "feedback" ? "active" : ""}`} onClick={() => (window.location.href = "/feedback")} title="Phản hồi">
							<div className="d-flex align-items-center">
								<i className="bi bi-chat-dots me-3" style={{ width: 20 }} />
								{sidebarOpen && <span>Phản hồi</span>}
							</div>
						</button>
					</div>
				</div>
			</div>

			<div className="p-2" style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb" }}>
				{sidebarOpen ? (
					<div className="d-flex" style={{ paddingBottom: 10, margin: 0 }}>
						<button className={`btn-submenu ${theme === "light" ? "active" : ""}`} onClick={() => setTheme("light")}>
							<i className="bi bi-sun"></i>
							<span>Sáng</span>
						</button>
						<button className={`btn-submenu ${theme === "dark" ? "active" : ""}`} onClick={() => setTheme("dark")}>
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
