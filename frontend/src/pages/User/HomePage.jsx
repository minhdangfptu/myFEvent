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
import ConfirmModal from "../../components/ConfirmModal";
import NoDataImg from "~/assets/no-data.png";

const unwrapApiData = (payload) => {
  let current = payload;
  const visited = new Set();
  while (
    current &&
    typeof current === "object" &&
    !Array.isArray(current) &&
    !visited.has(current) &&
    (current.data !== undefined || current.result !== undefined || current.payload !== undefined)
  ) {
    visited.add(current);
    current = current.data ?? current.result ?? current.payload;
  }
  return current;
};

const toArray = (payload) => {
  const data = unwrapApiData(payload);
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  if (typeof data === "object") {
    const arrays = [];
    Object.values(data).forEach((value) => {
      if (Array.isArray(value)) arrays.push(...value);
    });
    if (arrays.length > 0) return arrays;
  }
  return [];
};

const dedupeById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const identifier =
      item?.id ||
      item?._id ||
      item?.eventId ||
      item?.slug ||
      item?.code ||
      item?.joinCode ||
      item?.eventMemberId;

    if (!identifier) return true;
    if (seen.has(identifier)) return false;
    seen.add(identifier);
    return true;
  });
};

const normalizeEventList = (payload) => dedupeById(toArray(payload));

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
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
    eventStartDate: "",
    eventEndDate: "",
    location: "",
    images: [],
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [imageInputType, setImageInputType] = useState("url");
  const [imageUrl, setImageUrl] = useState("");
  const [blogs, setBlogs] = useState([]);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCodeForModal, setJoinCodeForModal] = useState("");

  const { events, loading: eventsLoading } = useEvents();
  const myEvents = useMemo(() => dedupeById(events || []), [events]);

  // ===== Fetch blogs and stop loading =====
  useEffect(() => {
    let cancelled = false;
    const fetchBlogs = async () => {
      try {
        const res = await eventService.fetchAllPublicEvents();
        if (!cancelled) {
          setBlogs(normalizeEventList(res));
        }
      } catch (err) {
        console.error("fetch public events failed", err);
        if (!cancelled) setBlogs([]);
      }
    };
    fetchBlogs();
    return () => {
      cancelled = true;
    };
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

  // console.log(blogs);
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
  const filteredEvents = myEvents
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

  // Check cả authLoading và eventsLoading
  if (authLoading || eventsLoading) {
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
        .event-desc-3lines {
          display: -webkit-box;
          -webkit-line-clamp: 3;
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
        .soft-input { background:#F9FAFB; border:1px solid #4d363638; border-radius:12px; height:44px; transition:.2s; }
        .soft-input:focus { background:#fff; border-color:#EF4444; box-shadow:0 0 0 3px rgba(239,68,68,0.1); }
        .ghost-btn { border:1px solid #ffffffff; border-radius:10px; padding:8px 12px; background:#fff; font-size:14px; }
        .ghost-btn:hover {border:1px solid #EF4444; background:#F9FAFB; }
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
                  style={{ color: "black" }}
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
                  style={{ color: "black" }}
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
            <img
              src={NoDataImg}
              alt="Không có sự kiện"
              style={{ width: 200, maxWidth: "50vw", opacity: 0.8 }}
            />
            <div className="text-muted mt-3" style={{ fontSize: 18 }}>
              Chưa có sự kiện nào!
            </div>
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
                    </div>
                    <div
                      className="event-body pb-0 d-flex flex-column"
                      style={{
                        minHeight: 200,
                        height: 200,
                        justifyContent: "flex-start",
                      }}
                    >
                      <div
                        className="d-flex align-items-center gap-2 mb-2 flex-wrap"
                        style={{ minHeight: 38 }}
                      >
                        {event.status ? (
                          <span
                            className={`event-chip chip-status-${event.status}`}
                          >
                            <i className="bi bi-lightning-charge-fill me-1" />
                            {event.status === "scheduled"
                              ? "Sắp diễn ra"
                              : event.status === "ongoing"
                              ? "Đang diễn ra"
                              : event.status === "completed"
                              ? "Đã kết thúc"
                              : event.status === "cancelled"
                              ? "Đã hủy"
                              : "-"}
                          </span>
                        ) : (
                          <span
                            style={{
                              width: 80,
                              height: 27,
                              opacity: 0,
                              display: "inline-block",
                            }}
                          >
                            -
                          </span>
                        )}
                      </div>

                      <div
                        className="fw-bold mb-2"
                        style={{
                          fontSize: 18,
                          minHeight: 24,
                          maxHeight: 48,
                          overflow: "hidden",
                          lineHeight: "24px",
                        }}
                      >
                        {event.name}
                      </div>

                      <div className="flex-fill"></div>

                      <p
                        className="text-muted small mb-2 event-desc-3lines"
                        style={{
                          minHeight: 20, // Giảm từ 40 xuống 20
                          opacity: event.description ? "1" : "0",
                          lineHeight: "1.3", // Giảm line height để tiết kiệm không gian
                          fontSize: "13px", // Giảm font size nhẹ
                          color: "#6B7280",
                          display: "-webkit-box",
                          WebkitLineClamp: 3, // Giới hạn 3 dòng
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {event.description || "Chưa có mô tả"}
                      </p>

                      {/* Thông tin event: location, date - Bootstrap version */}
                      <div className=" pb-2 mt-auto">
                        {event.location && (
                          <div
                            style={{ fontSize: "14px" }}
                            className="d-flex align-items-center"
                          >
                            <i
                              className="bi bi-geo-alt me-2 text-danger"
                              style={{ fontSize: "12px", width: "12px" }}
                            />
                            <small className="text-muted fw-medium text-truncate">
                              {event.location}
                            </small>
                          </div>
                        )}

                        {event.eventStartDate && event.eventEndDate && (
                          <div
                            style={{ fontSize: "14px" }}
                            className="d-flex align-items-center"
                          >
                            <i
                              className="bi bi-calendar-event me-2 text-danger"
                              style={{ fontSize: "12px", width: "12px" }}
                            />
                            {event.eventStartDate && event.eventEndDate ? (
                              <small className="text-muted fw-medium text-truncate">
                                {formatDate(event.eventStartDate)} -{" "}
                                {formatDate(event.eventEndDate)}
                              </small>
                            ) : (
                              <p>Đang cập nhật</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/*--- Line phân cách mờ và Bottom action section ---*/}
                    <div
                      className="event-card-bottom d-flex align-items-center justify-content-between gap-2 px-3 py-3"
                      style={{
                        borderTop: "1px solid #E5E7EB",
                        background: "#FAFAFA",
                        minHeight: 62,
                      }}
                    >
                      <div
                        className="d-flex align-items-center gap-2 text-dark"
                        style={{ fontSize: 13, fontWeight: 500 }}
                      >
                        <i
                          className="bi bi-person-badge me-1"
                          style={{ color: "#dc2626" }}
                        />
                        {event.eventMember?.role === "Member"
                          ? "Thành viên"
                          : event.eventMember?.role === "HoOC"
                          ? "Trưởng ban Tổ chức"
                          : event.eventMember?.role === "HoD"
                          ? "Trưởng ban"
                          : "Không rõ"}
                      </div>
                      <button
                        className="ghost-btn"
                        style={{
                          minWidth: 100,
                          color: "#ffffffff",
                          backgroundColor: "#EF4444",
                          fontWeight: 500,
                        }}
                        onClick={() => {
                          const role = event.eventMember?.role;
                          const eid = event.id || event._id || idx;
                          if (role === "Member") {
                            navigate(
                              `/member-event-detail/${eid}?eventId=${eid}`
                            );
                            return;
                          }
                          if (role === "HoOC") {
                            navigate(`/hooc-dashboard?eventId=${eid}`);
                            return;
                          }
                          if (role === "HoD") {
                            navigate(`/hod-dashboard?eventId=${eid}`);
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
              onClick={() =>
                navigate(`/home-page/events/${blog._id || blog.id || idx}`)
              }
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
                    onLoad={() => {}}
                  />
                  {/* Button Xem chi tiết ở góc phải trên */}
                  <button
                    className="position-absolute btn btn-light border soft-btn-top-right"
                    style={{
                      top: 12,
                      right: 12,
                      zIndex: 2,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                    onClick={() =>
                      navigate(
                        `/home-page/events/${blog._id || blog.id || idx}`
                      )
                    }
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
                        <i className="bi bi-lightning-charge-fill me-1" />
                        {blog.status === "scheduled"
                          ? "Sắp diễn ra"
                          : blog.status === "ongoing"
                          ? "Đang diễn ra"
                          : blog.status === "completed"
                          ? "Đã kết thúc"
                          : blog.status === "cancelled"
                          ? "Đã hủy"
                          : blog.status}
                      </span>
                    ) : null}
                  </div>
                  {blog.description && (
                    <div className="event-desc mt-2">{blog.description}</div>
                  )}
                  {/* Thông tin event: location, date - Bootstrap version */}
                  <div className=" pt-2 pb-2 mt-auto">
                    {blog.location && (
                      <div
                        style={{ fontSize: "14px" }}
                        className="d-flex align-items-center"
                      >
                        <i
                          className="bi bi-geo-alt me-2 text-danger"
                          style={{ fontSize: "12px", width: "12px" }}
                        />
                        <small className="text-muted fw-medium text-truncate">
                          {blog.location}
                        </small>
                      </div>
                    )}

                    {blog.eventStartDate && blog.eventEndDate && (
                      <div
                        style={{ fontSize: "14px" }}
                        className="d-flex align-items-center"
                      >
                        <i
                          className="bi bi-calendar-event me-2 text-danger"
                          style={{ fontSize: "12px", width: "12px" }}
                        />
                        {blog.eventStartDate && blog.eventEndDate ? (
                          <small className="text-muted fw-medium text-truncate">
                            {formatDate(blog.eventStartDate)} -{" "}
                            {formatDate(blog.eventEndDate)}
                          </small>
                        ) : (
                          <p>Đang cập nhật</p>
                        )}
                      </div>
                    )}
                  </div>
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
                      eventStartDate: "",
                      eventEndDate: "",
                      location: "",
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

                    // Validation
                    if (!createForm.name.trim())
                      return setCreateError("Vui lòng nhập tên sự kiện");
                    if (!createForm.organizerName.trim())
                      return setCreateError(
                        "Vui lòng nhập tên CLB/Đội nhóm/Người đại diện tổ chức"
                      );
                    if (!createForm.eventStartDate)
                      return setCreateError("Vui lòng chọn ngày bắt đầu");
                    if (!createForm.eventEndDate)
                      return setCreateError("Vui lòng chọn ngày kết thúc");
                    if (!createForm.location.trim())
                      return setCreateError("Vui lòng nhập địa điểm");
                    if (!createForm.description.trim())
                      return setCreateError("Vui lòng nhập mô tả sự kiện");

                    // Kiểm tra ngày bắt đầu và ngày kết thúc phải là ngày hôm nay hoặc trong tương lai
                    const now = new Date();
                    const startDate = new Date(createForm.eventStartDate);
                    const endDate = new Date(createForm.eventEndDate);
                    
                    // So sánh chỉ ngày (không tính giờ/phút) để tránh lỗi timezone
                    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                    
                    // Cho phép ngày hôm nay hoặc ngày trong tương lai
                    if (startDateOnly < nowDateOnly) {
                      return setCreateError(
                        "Ngày bắt đầu phải là ngày hôm nay hoặc trong tương lai"
                      );
                    }
                    
                    if (endDateOnly < nowDateOnly) {
                      return setCreateError(
                        "Ngày kết thúc phải là ngày hôm nay hoặc trong tương lai"
                      );
                    }
                    
                    // Kiểm tra ngày kết thúc phải sau ngày bắt đầu
                    if (endDateOnly <= startDateOnly) {
                      return setCreateError(
                        "Ngày kết thúc phải sau ngày bắt đầu"
                      );
                    }

                    try {
                      setCreateSubmitting(true);
                      const res = await eventApi.create({
                        ...createForm,
                        type: "private",
                      });
                      toast.success("Tạo sự kiện thành công!");

                      setShowCreateModal(false);
                      setCreateForm({
                        name: "",
                        description: "",
                        organizerName: "",
                        eventStartDate: "",
                        eventEndDate: "",
                        location: "",
                        images: [],
                      });
                      setImageUrl("");
                      setJoinCodeForModal(res.data.joinCode);
                      setShowJoinCodeModal(true);
                    } catch (err) {
                      const msg =
                        err?.response?.data?.message ||
                        err?.message ||
                        "Tạo sự kiện thất bại";
                      toast.error(msg);
                      setCreateError(msg);
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
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Ngày bắt đầu *
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control soft-input"
                        value={createForm.eventStartDate}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            eventStartDate: e.target.value,
                          }))
                        }
                        required
                        disabled={createSubmitting}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Ngày kết thúc *
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control soft-input"
                        value={createForm.eventEndDate}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            eventEndDate: e.target.value,
                          }))
                        }
                        required
                        disabled={createSubmitting}
                        min={createForm.eventStartDate} // Không cho chọn ngày kết thúc trước ngày bắt đầu
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Địa điểm *</label>
                    <input
                      type="text"
                      className="form-control soft-input"
                      placeholder="Địa điểm tổ chức sự kiện"
                      value={createForm.location}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          location: e.target.value,
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
                          eventStartDate: "",
                          eventEndDate: "",
                          location: "",
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
                        `/member-event-detail/${
                          res.data.eventId || res.data.id
                        }?eventId=${res.data.eventId || res.data.id}`
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 3000,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowJoinCodeModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '90%',
              maxWidth: '500px',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button (X) */}
            <button
              onClick={() => setShowJoinCodeModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                color: '#6b7280',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f3f4f6';
                e.target.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#6b7280';
              }}
            >
              ×
            </button>

            {/* Icon */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
              }}
            >
              <i
                className="bi bi-ticket-perforated"
                style={{ fontSize: '32px', color: '#dc2626' }}
              ></i>
            </div>

            {/* Title */}
            <h4
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#111827',
                textAlign: 'center',
                marginBottom: '8px',
              }}
            >
              Mã tham gia sự kiện của bạn
            </h4>

            {/* Description */}
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              Vui lòng lưu lại mã này để chia sẻ cho thành viên tham gia sự kiện
            </p>

            {/* Code Display */}
            <div
              style={{
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                border: '2px dashed #fca5a5',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  letterSpacing: '6px',
                  color: '#dc2626',
                  fontFamily: 'monospace',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                {joinCodeForModal}
              </div>
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(joinCodeForModal);
                    } else {
                      // Fallback for older browsers
                      const textArea = document.createElement('textarea');
                      textArea.value = joinCodeForModal;
                      textArea.style.position = 'fixed';
                      textArea.style.left = '-999999px';
                      textArea.style.top = '0';
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                    }
                    
                    // Show toast notification
                    toast.success('Đã copy mã tham gia!', {
                      position: 'top-right',
                      autoClose: 2000,
                      hideProgressBar: false,
                    });
                  } catch (err) {
                    console.error('Copy failed:', err);
                    toast.error('Không thể copy mã. Vui lòng thử lại.', {
                      position: 'top-right',
                      autoClose: 2000,
                    });
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                }}
              >
                <i className="bi bi-copy"></i>
                Copy
              </button>
              <button
                onClick={() => {
                  setShowJoinCodeModal(false);
                  window.location.reload();
                }}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e5e7eb';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <i className="bi bi-x-lg"></i>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
