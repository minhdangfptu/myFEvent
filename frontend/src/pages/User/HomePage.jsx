import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import UserLayout from "../../components/UserLayout";
import { eventApi } from "../../apis/eventApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDate } from "../../utils/formatDate";
import { eventService } from "../../services/eventService";
import { userApi } from "../../apis/userApi";
import { useEvents } from "../../contexts/EventContext";
import Loading from "../../components/Loading";
import ConfirmModal from '../../components/ConfirmModal';
import NoDataImg from '~/assets/no-data.png';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // ===== Role config & derive once =====
  const CONFIG_BY_ROLE = {
    User: {
      title: "Trang chủ",
      sidebarType: "user",
      eventDetailPrefix: "/event-detail/",
      allowCreate: true,
    },
    Member: {
      title: "Trang chủ",
      sidebarType: "member",
      eventDetailPrefix: "/member-event-detail/",
      allowCreate: true,
    },
    HoOC: {
      title: "Trang chủ",
      sidebarType: "hooc",
      eventDetailPrefix: "/hooc-event-detail/",
      allowCreate: true,
    },
  };
  const { title, sidebarType, allowCreate } =
    CONFIG_BY_ROLE[user?.role] || CONFIG_BY_ROLE.User;

  // ===== UI states =====
  const [searchQuery, setSearchQuery] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    organizerName: "",
    images: [], // Thêm field images
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [imageInputType, setImageInputType] = useState("url"); // "url" hoặc "file"
  const [imageUrl, setImageUrl] = useState("");
  const [blogs, setBlogs] = useState([]);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCodeForModal, setJoinCodeForModal] = useState("");

  const { events, loading } = useEvents();

  // ===== Fetch blogs and stop loading =====
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await eventApi.getAllPublicEvents();
        setBlogs(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setBlogs([]);
      } finally {
        // setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  // ===== Image handling functions =====
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setCreateError("Vui lòng chọn file hình ảnh hợp lệ");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setCreateError("Kích thước file không được vượt quá 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setCreateForm((prev) => ({
        ...prev,
        images: [...prev.images, base64],
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUrlAdd = () => {
    if (!imageUrl.trim()) {
      setCreateError("Vui lòng nhập URL hình ảnh");
      return;
    }

    // Validate URL
    try {
      new URL(imageUrl);
    } catch {
      setCreateError("URL không hợp lệ");
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      images: [...prev.images, imageUrl.trim()],
    }));
    setImageUrl("");
    setCreateError("");
  };

  const removeImage = (index) => {
    setCreateForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  console.log(blogs)
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
      if (sortBy === SORT.NEWEST)
        return new Date(b.eventStartDate) - new Date(a.eventStartDate);
      if (sortBy === SORT.OLDEST)
        return new Date(a.eventStartDate) - new Date(b.eventStartDate);
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
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255,255,255,1)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Loading size={80} />
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

        .event-card { border-radius:16px; overflow:hidden; border:1px solid #E5E7EB; background:#fff; transition: box-shadow .2s; box-shadow:0 8px 24px rgba(0, 0, 0, 0.04) } 
        .event-img { height:180px; background:#f3f4f6; position:relative; }
        .event-img::after { content:''; position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0)); }
        .event-body { padding:16px; }
        .event-title { font-weight:700; font-size:18px; margin-bottom:6px; }
        .event-chip { border-radius:999px; font-size:12px; padding:6px 10px; display:inline-flex; align-items:center; gap:6px; }
        .chip-gray { background:#F3F4F6; color:#374151; border:1px solid #E5E7EB; }
        .event-desc {
          color:#6B7280;
          font-size:14px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .blog-card { border-radius:16px; overflow:hidden; border:1px solid #E5E7EB; background:#fff; transition:transform .2s, box-shadow .2s; box-shadow:0 8px 24px rgba(0, 0, 0, 0.04) }
        .blog-img { height:160px; background:#f3f4f6; position:relative; }
        .blog-img::after { content:''; position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0)); }
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
        .event-card-bottom {border-radius:0 0 16px 16px; min-height:62px}
        .soft-btn-top-right{box-shadow:0 2px 6px rgba(0,0,0,0.04);transition:.1s;border-radius:8px;padding:6px 15px;}
        .soft-btn-top-right:hover{background:#fee2e2 !important;color:#dc2626 !important;border:1px solid #dc2626;}
        .chip-status-scheduled { background:#dcfce7 !important; color:#22c55e !important; border:1px solid #bbf7d0; }
        .chip-status-ongoing   { background:#fff7ed !important; color:#f59e42 !important; border:1px solid #fed7aa; }
        .chip-status-completed { background:#f3f4f6 !important; color:#6b7280 !important; border:1px solid #e5e7eb; }
        .chip-status-cancelled { background:#fef2f2 !important; color:#dc2626 !important; border:1px solid #fecaca; }
        .chip-date             { background:#eff6ff !important; color:#2563eb !important; border:1px solid #bae6fd; }
        .chip-location         { background:#f3e8ff !important; color:#9333ea !important; border:1px solid #e9d5ff; }
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

        {filteredEvents.length === 0 ? (
          <div className="d-flex flex-column justify-content-center align-items-center py-5">
            <img src={NoDataImg} alt="Không có sự kiện" style={{ width: 200, maxWidth: '50vw', opacity: 0.8 }} />
            <div className="text-muted mt-3" style={{ fontSize: 18 }}>Chưa có sự kiện nào!</div>
          </div>
        ) : (
          <div className="row g-4">
            {filteredEvents.map((event, idx) => {
              return (
                <div
                  key={event.id || event._id || idx}
                  className="col-xxl-3 col-xl-3 col-lg-4 col-md-6"
                >
                  <div className="event-card h-100">
                    <div className="position-relative">
                      <img
                        src={
                          event.image && event.image.length > 0
                            ? event.image[0]
                            : "/default-events.jpg"
                        }
                        alt={event.name}
                        className="event-img"
                        style={{
                          width: "100%",
                          height: "180px",
                          objectFit: "cover",
                          background: "#f3f4f6",
                        }}
                      />
                      {/* Image count indicator */}
                      {event.image && event.image.length > 1 && (
                        <div className="position-absolute top-0 end-0 m-2">
                          <span className="badge bg-dark bg-opacity-75 text-white">
                            <i className="bi bi-images me-1"></i>
                            {event.image.length}
                          </span>
                        </div>
                      )}
                      {/* Button Xem chi tiết ở góc phải trên */}
                      <button
                        className="position-absolute btn btn-light border soft-btn-top-right"
                        style={{ top: 12, right: 12, zIndex: 2, fontSize: 14, fontWeight: 500 }}
                        onClick={() =>{
                          const eid = event.id || event._id || idx;
                          if (event.eventMember?.role === "Member") {
                            navigate(`/member-event-detail/${eid}?eventId=${eid}`);
                            return;
                          }
                          if (event.eventMember?.role === "HoOC") {
                            navigate(`/events/${eid}/hooc-event-detail`);
                            return;
                          }
                          if (event.eventMember?.role === "HoD") {
                            navigate(`/hod-landing-page?eventId=${eid}`);
                            return;
                          }
                        }
                      }
                      >
                        Xem chi tiết
                      </button>
                    </div>
                    <div className="event-body pb-0 d-flex flex-column" style={{ minHeight:190, height:190, justifyContent:'flex-start' }}>
                      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap" style={{minHeight:38}}>
                        {event.status ? (
                          <span className={`event-chip chip-status-${event.status}`}>
                            <i className="bi bi-lightning-charge-fill me-1" />{event.status === "scheduled" ? "Sắp diễn ra" : event.status === "ongoing" ? "Đang diễn ra" : event.status === "completed" ? "Đã kết thúc" : event.status === "cancelled" ? "Đã hủy" : '-'}
                          </span>
                        ) : <span style={{width:80, height:27, opacity:0, display:'inline-block'}}>-</span>}
                        {event.location ? (
                          <span className="event-chip chip-location">
                            <i className="bi bi-geo-alt me-1" />{event.location}
                          </span>
                        ) : <span style={{width:120, height:27, opacity:0, display:'inline-block'}}>-</span>}
                        {event.eventStartDate && event.eventEndDate ? (
                          <span className="event-chip chip-date">
                            <i className="bi bi-calendar-event me-1" /> {formatDate(event.eventStartDate)} -  {formatDate(event.eventEndDate)}
                          </span>
                        ) : <span style={{width:110, height:27, opacity:0, display:'inline-block'}}>-</span>}
                        
                      </div>
                      <div className="event-title" style={{fontWeight:700, fontSize:18, marginBottom:4, minHeight:24, maxHeight:48, overflow:'hidden', lineHeight:'24px'}}>{event.name}</div>
                      <div style={{flex:1}}></div>
                      <p className="event-desc mb-3" style={{minHeight:40, marginBottom:0, opacity:(event.description ? '1' : '0')}}>{event.description||'empty'}</p>
                    </div>
                    {/*--- Line phân cách mờ và Bottom action section ---*/}
                    <div className="event-card-bottom d-flex align-items-center justify-content-between gap-2 px-3 py-3" style={{ borderTop: "1px solid #E5E7EB", background: "#FAFAFA", minHeight:62 }}>
                      
                      <div className="d-flex align-items-center gap-2 text-dark" style={{ fontSize: 13, fontWeight: 500 }}>
                        <i className="bi bi-person-badge me-1" style={{ color: '#dc2626' }}/>
                        {event.eventMember?.role === "Member" ? "Thành viên" : event.eventMember?.role === "HoOC" ? "Trưởng ban Tổ chức" : event.eventMember?.role === "HoD" ? "Trưởng ban" : "Không rõ"}
                      </div>
                      <button
                        className="ghost-btn"
                        style={{ minWidth: 100 }}
                        onClick={() => {
                          const role = event.eventMember?.role;
                          const eid = event.id || event._id || idx;
                          if (role === "Member") {
                            navigate(`/member-event-detail/${eid}?eventId=${eid}`);
                            return;
                          }
                          if (role === "HoOC") {
                            navigate(`/hooc-dashboard?eventId=${eid}`);
                            return;
                          }
                          if (role === "HoD") {
                            navigate(`/hod-landing-page?eventId=${eid}`);
                            return;
                          }
                        }}
                      >
                        Truy cập
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              onClick={() => navigate(`/home-page/events/${blog._id || blog.id || idx}`)}
            >
              <div className="blog-card h-100">
                <div className="position-relative">
                  <img
                    src={
                      blog.image && blog.image.length > 0
                        ? blog.image[0]
                        : "/default-events.jpg"
                    }
                    alt={blog.name}
                    className="blog-img"
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                      background: "#f3f4f6",
                    }}
                    onError={(e) => {
                      console.error("Blog image load error:", blog.image?.[0]);
                      e.target.src = "/default-events.jpg";
                    }}
                    onLoad={() => {
                    }}
                  />
                  {/* Button Xem chi tiết ở góc phải trên */}
                  <button
                        className="position-absolute btn btn-light border soft-btn-top-right"
                        style={{ top: 12, right: 12, zIndex: 2, fontSize: 14, fontWeight: 500 }}
                        onClick={() => navigate(`/home-page/events/${blog._id || blog.id || idx}`)}
                      >
                        Xem chi tiết
                      </button>
                  {/* Image count indicator */}
                  {blog.image && blog.image.length > 1 && (
                    <div className="position-absolute top-0 end-0 m-2">
                      <span className="badge bg-dark bg-opacity-75 text-white">
                        <i className="bi bi-images me-1"></i>
                        {blog.image.length}
                      </span>
                    </div>
                  )}
                </div>
                <div className="blog-body">
                  <div className="blog-title">{blog.name}</div>
                  <div className="blog-meta">
                    {blog.status ? (
                      <span className={`badge-soft chip-status-${blog.status}`}>
                        <i className="bi bi-lightning-charge-fill me-1" />{blog.status === "scheduled" ? "Sắp diễn ra" : blog.status === "ongoing" ? "Đang diễn ra" : blog.status === "completed" ? "Đã kết thúc" : blog.status === "cancelled" ? "Đã hủy" : blog.status}
                      </span>
                    ) : null}
                     {blog.location && (
                      <span className="badge-soft chip-location">
                        <i className="bi bi-geo-alt me-1" />{blog.location}
                      </span>
                    )}  
                    {blog.eventStartDate  && (
                      <span className="badge-soft chip-date">
                        <i className="bi bi-calendar-event me-1" />{formatDate(blog.eventStartDate)} -  {formatDate(blog.eventEndDate)}
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
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      name: "",
                      description: "",
                      organizerName: "",
                      images: [],
                    });
                    setImageUrl("");
                    setCreateError("");
                  }}
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
                        images: createForm.images,
                      });
                      setShowCreateModal(false);
                      setCreateForm({
                        name: "",
                        description: "",
                        organizerName: "",
                        images: [],
                      });
                      setImageUrl("");
                      setJoinCodeForModal(res.data.joinCode);
                      setShowJoinCodeModal(true);
                      // Không alert
                      // alert(`Mã tham gia: ${res.data.joinCode}`);
                      // navigate(`/event/${res.data.id}/hooc-event-detail`); // chuyển hướng sau khi đóng modal
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
                  {/* Image Upload Section */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Hình ảnh sự kiện
                    </label>

                    {/* Image Input Type Toggle */}
                    <div className="d-flex gap-2 mb-3">
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          imageInputType === "url"
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }`}
                        onClick={() => setImageInputType("url")}
                        disabled={createSubmitting}
                      >
                        <i className="bi bi-link-45deg me-1"></i>
                        URL
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          imageInputType === "file"
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }`}
                        onClick={() => setImageInputType("file")}
                        disabled={createSubmitting}
                      >
                        <i className="bi bi-upload me-1"></i>
                        Upload File
                      </button>
                    </div>

                    {/* URL Input */}
                    {imageInputType === "url" && (
                      <div className="d-flex gap-2 mb-3">
                        <input
                          type="url"
                          className="form-control soft-input"
                          placeholder="Nhập URL hình ảnh..."
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          disabled={createSubmitting}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={handleUrlAdd}
                          disabled={createSubmitting || !imageUrl.trim()}
                        >
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                    )}

                    {/* File Upload */}
                    {imageInputType === "file" && (
                      <div className="mb-3">
                        <input
                          type="file"
                          className="form-control soft-input"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={createSubmitting}
                        />
                        <small className="text-muted">
                          Chấp nhận: JPG, PNG, GIF. Kích thước tối đa: 5MB
                        </small>
                      </div>
                    )}

                    {/* Image Preview */}
                    {createForm.images.length > 0 && (
                      <div className="mt-3">
                        <label className="form-label fw-semibold">
                          Hình ảnh đã chọn:
                        </label>
                        <div className="row g-2">
                          {createForm.images.map((img, index) => (
                            <div key={index} className="col-md-3">
                              <div className="position-relative">
                                <img
                                  src={img}
                                  alt={`Preview ${index + 1}`}
                                  className="img-fluid rounded"
                                  style={{
                                    width: "100%",
                                    height: "100px",
                                    objectFit: "cover",
                                  }}
                                  onError={(e) => {
                                    e.target.src = "/default-events.jpg";
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                                  onClick={() => removeImage(index)}
                                  disabled={createSubmitting}
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    padding: "0",
                                  }}
                                >
                                  <i
                                    className="bi bi-x"
                                    style={{ fontSize: "12px" }}
                                  ></i>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateForm({
                          name: "",
                          description: "",
                          organizerName: "",
                          images: [],
                        });
                        setImageUrl("");
                        setCreateError("");
                      }}
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
                        `/member-event-detail/${res.data.eventId || res.data.id}?eventId=${res.data.eventId || res.data.id}`
                      );
                      toast.success("Tham gia sự kiện thành công!");
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

      {showJoinCodeModal && (
        <ConfirmModal
          show={showJoinCodeModal}
          onClose={() => setShowJoinCodeModal(false)}
          onConfirm={() => {
            setShowJoinCodeModal(false);
            window.location.reload();
          }}
          message={
            <div>
              <div className="mb-2"><strong>Mã tham gia sự kiện của bạn:</strong></div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: '#ef4444', marginBottom: 12 }}>{joinCodeForModal}</div>
              <div className="mb-0">Vui lòng lưu lại mã này để chia sẻ cho thành viên tham gia sự kiện.</div>
            </div>
          }
        />
      )}
    </UserLayout>
  );
}
