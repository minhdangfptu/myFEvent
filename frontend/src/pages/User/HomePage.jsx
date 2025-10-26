import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import UserLayout from "../../components/UserLayout";
import { eventApi } from "../../apis/eventApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDate } from "../../utils/formatDate";
import { eventService } from "../../services/eventService";
import { userApi } from '../../apis/userApi';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // ===== Role config & derive once =====
  const CONFIG_BY_ROLE = {
    User: {
      title: "Trang chủ User",
      sidebarType: "user",
      eventDetailPrefix: "/event-detail/",
      allowCreate: true,
    },
    Member: {
      title: "Trang chủ Member",
      sidebarType: "member",
      eventDetailPrefix: "/member-event-detail/",
      allowCreate: true,
    },
    HoOC: {
      title: "Trang chủ HoOC",
      sidebarType: "hooc",
      eventDetailPrefix: "/hooc-event-detail/",
      allowCreate: true,
    },
  };
  const { title, sidebarType, eventDetailPrefix, allowCreate } =
    CONFIG_BY_ROLE[user?.role] || CONFIG_BY_ROLE.User;

  // ===== UI states =====
  const [searchQuery, setSearchQuery] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    organizerName: "",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(true);

  const [blogs, setBlogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventRoles, setEventRoles] = useState({});

  // ===== Fetch blogs and stop loading =====
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await eventApi.getAllPublicEvents();
        setBlogs(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  // Fetch my events
  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        const res = await eventService.listMyEvents();
        setEvents(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMyEvents();
  }, []);

  // Fetch role cho từng event đã join
  useEffect(() => {
    if (!events.length) return;
    let isActive = true;
    const fetchRoles = async () => {
      const roleMap = {};
      await Promise.all(events.map(async (event) => {
        try {
          const res = await userApi.getUserRoleByEvent(event.id || event._id);
          if (res && res.role && res.user?.fullName) {
            roleMap[event.id || event._id] = {
              role: res.role,
              name: res.user.fullName
            };
          }
        } catch {}
      }));
      if (isActive) setEventRoles(roleMap);
    };
    fetchRoles();
    return () => {
      isActive = false;
    };
  }, [events]);

  // ===== Filter/Sort with stable tokens (không lệch i18n) =====
  const STATUS = {
    ALL: "all",
    UPCOMING: "upcoming",
    ONGOING: "ongoing",
    PAST: "past",
  };
  const SORT = {
    NEWEST: "newest",
    OLDEST: "oldest",
    AZ: "az",
  };

  const STATUS_OPTIONS = [
    { key: STATUS.ALL, label: t("home.statuses.all") },
    { key: STATUS.UPCOMING, label: t("home.statuses.upcoming") },
    { key: STATUS.ONGOING, label: t("home.statuses.ongoing") },
    { key: STATUS.PAST, label: t("home.statuses.past") },
  ];
  const SORT_OPTIONS = [
    { key: SORT.NEWEST, label: t("home.sorts.newest") },
    { key: SORT.OLDEST, label: t("home.sorts.oldest") },
    { key: SORT.AZ, label: t("home.sorts.az") },
  ];

  const [statusFilter, setStatusFilter] = useState(STATUS.ALL);
  const [sortBy, setSortBy] = useState(SORT.NEWEST);

  // Menus
  const [openMenu, setOpenMenu] = useState(null);
  const statusMenuRef = useRef(null);
  const sortMenuRef = useRef(null);

  // Click outside: đóng nếu click không nằm TRONG CẢ HAI menu (dùng || thay vì &&)
  useEffect(() => {
    const onClickOutside = (e) => {
      const inStatus = statusMenuRef.current?.contains(e.target);
      const inSort = sortMenuRef.current?.contains(e.target);
      if (!inStatus && !inSort) setOpenMenu(null);
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  // ===== Filter + sort =====
  const norm = (s) => (s || "").toLowerCase();
  const filteredEvents = events
    .filter(
      (ev) =>
        norm(ev.name).includes(norm(searchQuery)) ||
        norm(ev.description).includes(norm(searchQuery))
    )
    .filter((ev) => {
      if (statusFilter === STATUS.ALL) return true;
      if (statusFilter === STATUS.UPCOMING) return ev.status === "Sắp diễn ra";
      if (statusFilter === STATUS.ONGOING) return ev.status === "Đang diễn ra";
      if (statusFilter === STATUS.PAST) return ev.status === "Đã kết thúc";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === SORT.AZ) return a.name.localeCompare(b.name);
      if (sortBy === SORT.NEWEST) return new Date(b.eventDate) - new Date(a.eventDate);
      if (sortBy === SORT.OLDEST) return new Date(a.eventDate) - new Date(b.eventDate);
      return 0;
    });

  // ===== Toast router state =====
  const toastShown = useRef(false);
  useEffect(() => {
    const toastData = location.state?.toast;
    if (toastData && !toastShown.current) {
      toast.dismiss();
      const fn = toast[toastData.type] || toast.success;
      fn(toastData.message);
      toastShown.current = true;
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  if (loading) {
    return (
      <UserLayout title={title} sidebarType={sidebarType}>
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: 400 }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title={title} activePage="home" sidebarType={sidebarType}>
      {/* Search + actions */}
      <div className="bg-light border-bottom py-3 px-0 pt-0">
        <div className="d-flex gap-3 align-items-center">
          <div className="flex-grow-1">
            <div className="position-relative">
              <i
                className="bi bi-search position-absolute"
                style={{ left: 12, top: 12, color: "#9CA3AF" }}
                aria-hidden="true"
              />
              <input
                type="text"
                className="form-control soft-input ps-5"
                placeholder={t("searchPlaceholder")}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t("searchPlaceholder")}
              />
            </div>
          </div>

          {/* Create/Join (Bootstrap dropdown chạy bằng data-bs) */}
          <div className="dropdown">
            <button
              className="btn btn-brand-red d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Mở menu tạo/tham gia sự kiện"
            >
              <i className="bi bi-plus" />
              {t("createEvent")}/{t("joinEvent")}
              <i className="bi bi-chevron-down" />
            </button>
            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-red">
              <li>
                <button
                  className="dropdown-item d-flex align-items-center"
                  onClick={() => setShowCreateModal(true)}
                  style={{ textAlign: "left", paddingLeft: 16 }}
                >
                  <i className="bi bi-calendar-plus me-2" />
                  {t("createEvent")}
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center"
                  onClick={() => setShowJoinModal(true)}
                  style={{ textAlign: "left", paddingLeft: 16 }}
                >
                  <i className="bi bi-box-arrow-in-right me-2" />
                  {t("joinEvent")}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Local styles (sửa lỗi cú pháp .event-card) */}
      <style>{`
        .brand-red { color: #EF4444; }
        .bg-brand-red { background:#EF4444; }
        .soft-card { background:#fff; border:1px solid #E5E7EB; border-radius:16px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
        .badge-soft { border-radius:999px; padding:6px 10px; font-size:12px; border:1px solid #E5E7EB; background:#F9FAFB; color:#374151; }
        .active-red { background:#FEE2E2 !important; color:#991B1B !important; }
        .dropdown-trigger { border:1px solid #E5E7EB; border-radius:10px; padding:8px 12px; background:#fff; min-width:160px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .dropdown-panel { position:absolute; top:110%; left:0; z-index:50; background:#fff; border:1px solid #E5E7EB; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.08); min-width:220px; overflow:hidden; }
        .dropdown-item { padding:10px 12px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:space-between; }
        .dropdown-item:hover { background:#F3F4F6; }
        .dropdown-header { padding:10px 12px; font-size:12px; color:#6B7280; background:#F9FAFB; border-bottom:1px solid #E5E7EB; }

        .event-card { border-radius:16px; overflow:hidden; border:1px solid #E5E7EB; background:#fff; transition: box-shadow .2s; } /* <-- fix dấu phẩy sai */
        .event-card:hover { box-shadow:0 8px 24px rgba(255, 0, 0, 0.08); }
        .event-img { height:180px; background:#f3f4f6; position:relative; }
        .event-img::after { content:''; position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0)); }
        .event-body { padding:16px; }
        .event-title { font-weight:700; font-size:18px; margin-bottom:6px; }
        .event-chip { border-radius:999px; font-size:12px; padding:6px 10px; display:inline-flex; align-items:center; gap:6px; }
        .chip-gray { background:#F3F4F6; color:#374151; border:1px solid #E5E7EB; }
        .event-desc { color:#6B7280; font-size:14px; }
        .blog-card { border-radius:16px; overflow:hidden; border:1px solid #E5E7EB; background:#fff; transition:transform .2s, box-shadow .2s; }
        .blog-card:hover { box-shadow:0 8px 24px rgba(255, 0, 0, 0.08) }
        .blog-img { height:160px; background:#f3f4f6; }
        .blog-body { padding:16px; }
        .blog-title { font-weight:700; font-size:16px; margin-bottom:8px; }
        .blog-meta { display:flex; flex-wrap:wrap; gap:6px; color:#6B7280; font-size:12px; }
        .section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:16px; margin-bottom:16px; flex-wrap:wrap; }
        .section-title { color:red; margin:0; font-size:18px; font-weight:700; }
        .filters { display:flex; gap:10px; flex-wrap:wrap; }
        .soft-input { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:12px; height:44px; transition:.2s; }
        .soft-input:focus { background:#fff; border-color:#EF4444; box-shadow:0 0 0 3px rgba(239,68,68,0.1); }
        .ghost-btn { border:1px solid #E5E7EB; border-radius:10px; padding:8px 12px; background:#fff; font-size:14px; }
        .ghost-btn:hover { background:#F9FAFB; }
      `}</style>

      {/* ====== SECTION: Events ====== */}
      <div className="mb-5">
        <div className="section-head">
          <h4 className="section-title">Sự kiện của bạn</h4>

          {/* Filters */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="filters position-relative">
              {/* Status */}
              <div className="position-relative me-2" ref={statusMenuRef}>
                <button
                  type="button"
                  className={`dropdown-trigger ${
                    openMenu === "status" ? "active-red" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(openMenu === "status" ? null : "status");
                  }}
                >
                  <span>
                    {t("home.status")}:{" "}
                    <strong>
                      {
                        STATUS_OPTIONS.find((o) => o.key === statusFilter)
                          ?.label
                      }
                    </strong>
                  </span>
                  <i
                    className={`bi ${
                      openMenu === "status"
                        ? "bi-chevron-up"
                        : "bi-chevron-down"
                    }`}
                  />
                </button>
                {openMenu === "status" && (
                  <div className="dropdown-panel">
                    <div className="dropdown-header">{t("home.status")}</div>
                    {STATUS_OPTIONS.map((opt) => (
                      <div
                        key={opt.key}
                        className={`dropdown-item ${
                          statusFilter === opt.key ? "active-red" : ""
                        }`}
                        onClick={() => {
                          setStatusFilter(opt.key);
                          setOpenMenu(null);
                        }}
                      >
                        <span>{opt.label}</span>
                        {statusFilter === opt.key && (
                          <i className="bi bi-check-lg" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort */}
              <div className="position-relative" ref={sortMenuRef}>
                <button
                  type="button"
                  className={`dropdown-trigger ${
                    openMenu === "sort" ? "active-red" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(openMenu === "sort" ? null : "sort");
                  }}
                >
                  <span>
                    {t("home.sort")}:{" "}
                    <strong>
                      {SORT_OPTIONS.find((o) => o.key === sortBy)?.label}
                    </strong>
                  </span>
                  <i
                    className={`bi ${
                      openMenu === "sort" ? "bi-chevron-up" : "bi-chevron-down"
                    }`}
                  />
                </button>
                {openMenu === "sort" && (
                  <div className="dropdown-panel">
                    <div className="dropdown-header">{t("home.sort")}</div>
                    {SORT_OPTIONS.map((opt) => (
                      <div
                        key={opt.key}
                        className={`dropdown-item ${
                          sortBy === opt.key ? "active-red" : ""
                        }`}
                        onClick={() => {
                          setSortBy(opt.key);
                          setOpenMenu(null);
                        }}
                      >
                        <span>{opt.label}</span>
                        {sortBy === opt.key && <i className="bi bi-check-lg" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ====== Event ====== */}
        <div className="row g-4">
          {filteredEvents.map((event, idx) => (
            <div
              key={event.id || event._id || idx}
              className="col-xxl-3 col-xl-3 col-lg-4 col-md-6"
            >
              <div className="event-card h-100">
                <div
                  className="event-img"
                  style={{
                    backgroundImage: `url(${event.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="event-body">
                  <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    {event.status && (
                      <span className="event-chip chip-gray">
                        <i className="bi bi-lightning-charge-fill me-1" />
                        {event.status}
                      </span>
                    )}
                    {event.eventDate && (
                      <span className="event-chip chip-gray">
                        <i className="bi bi-calendar-event me-1" />
                        {formatDate(event.eventDate)}
                      </span>
                    )}
                    {event.location && (
                      <span className="event-chip chip-gray">
                        <i className="bi bi-geo-alt me-1" />
                        {event.location}
                      </span>
                    )}
                    {/* Position - role của user trong event */}
                    <span style= {{color: "white", backgroundColor: "red"}}className="event-chip chip-gray">
                      <i className="bi bi-person-badge me-1" />
                      
                      {eventRoles[event.id || event._id]?.name ? ` ${eventRoles[event.id || event._id].name} - ` : ''}
                      {eventRoles[event.id || event._id]?.role || 'Không rõ'}
                    </span>
                  </div>
                  <div className="event-title">{event.name}</div>
                  <p className="event-desc mb-3">{event.description}</p>
                  <div className="d-flex justify-content-between">
                    <button
                      className="ghost-btn"
                      onClick={() =>
                        navigate(`/member-event-detail/${event.id || event._id || idx}`)
                      }
                    >
                      Xem chi tiết
                    </button>
                    <button
                      className="ghost-btn"
                      style={{ backgroundColor: "red", color: "white" }}
                      onClick={() => {
                        const role = eventRoles[event.id || event._id]?.role;
                        if (role === 'Member') {
                          navigate('/member-landing-page');
                          return;
                        }
                        if (role === 'HoOC') {
                          navigate('/hooc-landing-page');
                          return;
                        }
                        if (role === 'HoD') {
                          navigate('/hod-landing-page');
                          return;
                        }
                        // fallback mặc định
                        navigate(`${eventDetailPrefix}${event.id || event._id || idx}`);
                      }}
                    >
                      Truy cập
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="col-12">
              <div className="soft-card p-4 text-center text-muted">
                {t("home.noEvents")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== Blog ====== */}
      <div>
        <div className="section-head">
          <h4 className="section-title">
            Sự kiện tại trường Đại học FPT Hà Nội
          </h4>
        </div>
        <div className="row g-4">
          {blogs.map((blog, idx) => (
            <div
              key={blog._id || blog.id || idx}
              className="col-xxl-3 col-xl-3 col-lg-4 col-md-6"
              style={{ cursor: "pointer" }}
            >
              <div className="blog-card h-100">
                <div
                  className="blog-img"
                  style={{
                    backgroundImage: `url(${
                      blog.image || "/api/placeholder/600/360"
                    })`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="blog-body">
                  <div className="blog-title">{blog.name}</div>
                  <div className="blog-meta">
                    {blog.status && (
                      <span className="badge-soft">{blog.status}</span>
                    )}
                    {blog.type && (
                      <span className="badge-soft">{blog.type}</span>
                    )}
                    {blog.location && (
                      <span className="badge-soft">{blog.location}</span>
                    )}
                    {blog.eventDate && (
                      <span className="badge-soft">
                        {formatDate(blog.eventDate)}
                      </span>
                    )}
                  </div>
                  {blog.description && (
                    <div className="event-desc mt-2">{blog.description}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {blogs.length === 0 && (
            <div className="col-12">
              <div className="soft-card p-4 text-center text-muted">
                Chưa có sự kiện nào
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== CREATE EVENT MODAL ====== */}
      {showCreateModal && allowCreate && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <div className="d-flex align-items-center">
                  <i className="bi bi-flag brand-red me-2"></i>
                  <h5 className="modal-title fw-bold">Tạo sự kiện</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="text-muted mb-3" style={{ fontSize: 14 }}>
                  Hãy tạo sự kiện mới của riêng mình thôi!
                </div>
                {createError && (
                  <div className="alert alert-danger py-2" role="alert">
                    {createError}
                  </div>
                )}

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setCreateError("");
                    if (!createForm.name.trim())
                      return setCreateError("Vui lòng nhập tên sự kiện");
                    if (!createForm.organizerName.trim())
                      return setCreateError(
                        "Vui lòng nhập tên CLB/Đội nhóm/Người đại diện tổ chức"
                      );

                    try {
                      setCreateSubmitting(true);
                      const res = await eventApi.create({
                        name: createForm.name,
                        description: createForm.description,
                        organizerName: createForm.organizerName,
                        type: "private",
                      });
                      setShowCreateModal(false);
                      setCreateForm({
                        name: "",
                        description: "",
                        organizerName: "",
                      });
                      alert(`Mã tham gia: ${res.data.joinCode}`);
                      navigate(`${eventDetailPrefix}${res.data.id}`);
                    } finally {
                      setCreateSubmitting(false);
                    }
                  }}
                >
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Tên sự kiện*
                    </label>
                    <input
                      type="text"
                      className="form-control soft-input"
                      placeholder="Tên sự kiện"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                      disabled={createSubmitting}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Tên CLB/Đội nhóm/Người đại diện *
                    </label>
                    <input
                      type="text"
                      className="form-control soft-input"
                      placeholder="Tên CLB/Đội nhóm/Người đại diện"
                      value={createForm.organizerName}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          organizerName: e.target.value,
                        }))
                      }
                      required
                      disabled={createSubmitting}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Mô tả*</label>
                    <textarea
                      className="form-control soft-input"
                      rows={4}
                      placeholder="Hãy mô tả sự kiện của bạn"
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      required
                      disabled={createSubmitting}
                    />
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn btn-danger"
                      disabled={createSubmitting}
                    >
                      {createSubmitting ? "Đang tạo..." : "Xác nhận"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== JOIN MODAL ====== */}
      {showJoinModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <div className="d-flex align-items-center">
                  <i className="bi bi-clipboard-data brand-red me-2" />
                  <h5 className="modal-title fw-bold">{t("joinEvent")}</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowJoinModal(false)}
                />
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  Vui lòng nhập mã sự kiện đã được cấp để tham gia
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setJoinError("");
                    try {
                      const res = await eventApi.joinByCode(joinCode.trim());
                      setShowJoinModal(false);
                      setJoinCode("");
                      navigate(
                        `${eventDetailPrefix}${res.data.eventId || res.data.id}`
                      );
                    } catch (err) {
                      setJoinError(
                        err.response?.data?.message || "Tham gia thất bại"
                      );
                    }
                  }}
                >
                  <div className="mb-3">
                    <label htmlFor="eventCode" className="form-label fw-bold">
                      Nhập mã sự kiện
                    </label>
                    <input
                      id="eventCode"
                      type="text"
                      className="form-control soft-input"
                      placeholder="Mã sự kiện"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      required
                    />
                  </div>

                  {joinError && (
                    <div className="alert alert-danger py-2">{joinError}</div>
                  )}

                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowJoinModal(false)}
                    >
                      {t("actions.cancel")}
                    </button>
                    <button type="submit" className="btn btn-danger">
                      OK
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
