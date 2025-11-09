import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import UserLayout from "../../components/UserLayout";
import { eventApi } from "../../apis/eventApi";
import Loading from "~/components/Loading";
import { useEvents } from "../../contexts/EventContext";
import { formatDate } from "../../utils/formatDate";

export default function HoDEventDetail() {
  const { eventId } = useParams();
  const { fetchEventRole } = useEvents();
  const [activeTab, setActiveTab] = useState("info");
  const [event, setEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventRole, setEventRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  // Load role for this event to decide sidebar and permissions
  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      if (!eventId) {
        if (mounted) setEventRole("");
        return;
      }
      try {
        const role = await fetchEventRole(eventId);
        if (mounted) setEventRole(role);
      } catch (_) {
        if (mounted) setEventRole("");
      }
    };
    loadRole();
    return () => {
      mounted = false;
    };
  }, [eventId, fetchEventRole]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const [eventRes, membersRes] = await Promise.all([
        eventApi.getById(eventId),
        eventApi.getEventSummary(eventId),
      ]);

      setEvent(eventRes.data);
      setMembers(membersRes.data.members || []);
    } catch (error) {
      console.error("Error fetching event details:", error);
      setError("Không thể tải thông tin sự kiện");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã copy!", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Đã copy!", {
          position: "top-right",
          autoClose: 2000,
        });
      } catch (e) {
        toast.error("Không thể sao chép", {
          position: "top-right",
          autoClose: 2000,
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const getImageSrc = (image) => {
    if (!image) return "/default-events.jpg";

    //take first image
    if (Array.isArray(image) && image.length > 0) {
      const firstImage = image[0];
      if (typeof firstImage === "string" && firstImage.startsWith("data:")) {
        return firstImage;
      }
      return `data:image/jpeg;base64,${firstImage}`;
    }

    //image is string
    if (typeof image === "string") {
      if (image.startsWith("data:")) {
        return image;
      }
      if (image.startsWith("http")) {
        return image;
      }
      return `data:image/jpeg;base64,${image}`;
    }

    return "/default-events.jpg";
  };

  const sidebarType =
    eventRole === "Member" ? "member" : eventRole === "HoD" ? "hod" : "hooc";
  
  if (loading) {
    return (
      <UserLayout
        title="Chi tiết sự kiện"
        sidebarType={sidebarType}
        activePage="overview-detail"
        eventId={eventId}
      >
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "400px" }}
        >
          {loading && (
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
          )}
        </div>
      </UserLayout>
    );
  }

  if (!event) {
    return (
      <UserLayout
        title="Chi tiết sự kiện"
        sidebarType={sidebarType}
        activePage="overview-detail"
        eventId={eventId}
      >
        <div className="alert alert-danger">Không tìm thấy sự kiện</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title="Chi tiết sự kiện"
      sidebarType={sidebarType}
      activePage="overview-detail"
      eventId={eventId}
    >
      <style>{`
        .event-header { 
          background: linear-gradient(135deg, #dc2626, #ef4444); 
          color: white; 
          padding: 2rem; 
          border-radius: 16px; 
          margin-bottom: 2rem; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .event-title { 
          font-size: 2.5rem; 
          font-weight: bold; 
          margin-bottom: 1rem; 
        }
        .event-stats { 
          display: flex; 
          gap: 1rem; 
          flex-wrap: wrap; 
        }
        .stat-item { 
          background: rgba(255,255,255,0.2); 
          padding: 0.75rem 1rem; 
          border-radius: 8px; 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        }
        .stat-item:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }
        .tab-nav { 
          border-bottom: 2px solid #e5e7eb; 
          margin-bottom: 2rem; 
        }
        .tab-btn { 
          border: none; 
          background: none; 
          padding: 1rem 2rem; 
          font-weight: 600; 
          color: #6b7280; 
          border-bottom: 3px solid transparent; 
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .tab-btn:hover {
          color: #dc2626;
          background: #fef2f2;
        }
        .tab-btn.active { 
          color: #dc2626; 
          border-bottom-color: #dc2626; 
        }
        .info-card { 
          background: white; 
          border-radius: 12px; 
          padding: 1.5rem; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
          margin-bottom: 1.5rem; 
          transition: all 0.2s ease;
        }
        .info-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .info-card h5 { 
          color: #374151; 
          margin-bottom: 1rem; 
          font-weight: 600; 
        }
        .member-avatar { 
          width: 40px; 
          height: 40px; 
          border-radius: 50%; 
          background: #f3f4f6; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          overflow: hidden;
        }
        .copy-btn { 
          background: #f3f4f6; 
          border: 1px solid #d1d5db; 
          border-radius: 6px; 
          padding: 0.5rem; 
          cursor: pointer; 
          transition: all 0.2s ease;
        }
        .copy-btn:hover { 
          background: #e5e7eb; 
          border-color: #dc2626;
          color: #dc2626;
        }
        .event-image-card { 
          background: white; 
          border-radius: 12px; 
          padding: 1.5rem; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
          margin-bottom: 1.5rem; 
        }
        .event-image { 
          width: 100%; 
          height: 400px; 
          object-fit: cover; 
          border-radius: 8px; 
          margin-bottom: 1rem; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .event-chip {
          border-radius:999px; 
          font-size:12px; 
          padding:6px 10px;
          display:inline-flex; 
          align-items:center; 
          gap:6px;
        }
        .chip-date { 
          background:#eff6ff !important; 
          color:#2563eb !important; 
          border:1px solid #bae6fd; 
        }
        .read-only-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #fef3c7;
          color: #92400e;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 1rem;
        }
        .info-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }
        .info-value {
          color: #6b7280;
          margin-bottom: 1rem;
        }
      `}</style>

      {/* Event Header */}
      <div className="event-header">
        <div className="d-flex justify-content-between align-items-start">
          <h1 className="event-title">{event.name}</h1>
        </div>
        <div className="event-stats">
          <div className="stat-item">
            <i className="bi bi-people"></i>
            <span>{members.length} thành viên</span>
          </div>
          <div className="stat-item">
            <i className="bi bi-calendar"></i>
            <span>
              Ngày tạo: {new Date(event.createdAt).toLocaleDateString("vi-VN")}
            </span>
          </div>
          <div className="stat-item">
            <i className="bi bi-clock"></i>
            <span>
              D-Day:{" "}
              {formatDate(event?.eventStartDate) +
                " - " +
                formatDate(event?.eventEndDate) || "Chưa có thông tin"}
            </span>
          </div>
          <div className="stat-item">
            <i className="bi bi-info-circle"></i>
            <span>
              {event.status === "scheduled"
                ? "Sắp diễn ra"
                : event.status === "ongoing"
                ? "Đang diễn ra"
                : event.status === "completed"
                ? "Đã kết thúc"
                : "Đã hủy"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Thông tin
        </button>
        <button
          className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Cài đặt
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="row">
          {/* Event Image Card */}
          <div className="col-12">
            <div className="event-image-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Hình ảnh sự kiện</h5>
              </div>
              <div>
                {/* Hiển thị ảnh đầu tiên nếu có array */}
                {event.image &&
                Array.isArray(event.image) &&
                event.image.length > 0 ? (
                  <div className="position-relative">
                    <img
                      src={getImageSrc(event.image)}
                      alt={event.name}
                      className="event-image"
                      onError={(e) => {
                        console.error("Event image load error:", event.image);
                        e.target.src = "/default-events.jpg";
                      }}
                      onLoad={() => {
                        console.log("Event image loaded successfully:");
                      }}
                    />
                    {/* Image count indicator nếu có nhiều ảnh */}
                    {event.image.length > 1 && (
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className="badge bg-dark bg-opacity-75 text-white">
                          <i className="bi bi-images me-1"></i>
                          {event.image.length}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <img
                    src={getImageSrc(event.image)}
                    alt={event.name}
                    className="event-image"
                    onError={(e) => {
                      console.error("Event image load error:", event.image);
                      e.target.src = "/default-events.jpg";
                    }}
                    onLoad={() => {
                      console.log("Event image loaded successfully:");
                    }}
                  />
                )}

                <div className="d-flex gap-2 mt-3">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => copyToClipboard(getImageSrc(event.image))}
                  >
                    <i className="bi bi-copy me-1"></i>Sao chép ảnh
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = getImageSrc(event.image);
                      link.download = `${event.name}-image.jpg`;
                      link.click();
                    }}
                  >
                    <i className="bi bi-download me-1"></i>Tải xuống
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="info-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Thông tin sự kiện</h5>
                <span className="read-only-badge">
                  <i className="bi bi-eye"></i>
                  Chế độ xem
                </span>
              </div>
              <div className="mb-3">
                <div className="info-label">Tên sự kiện:</div>
                <div className="info-value">{event.name}</div>
              </div>
              <div className="mb-3">
                <div className="info-label">Người tổ chức:</div>
                <div className="info-value">{event.organizerName}</div>
              </div>
              <div className="mb-3">
                <div className="info-label">Ngày diễn ra:</div>
                {event.eventStartDate || event.eventEndDate ? (
                  <span className="event-chip chip-date ms-2">
                    <i className="bi bi-calendar-event me-1" />
                    {formatDate(event.eventStartDate)} -{" "}
                    {formatDate(event.eventEndDate)}
                  </span>
                ) : (
                  <span className="text-muted ms-2">Chưa có data</span>
                )}
              </div>
              <div className="mb-3">
                <div className="info-label">Địa điểm:</div>
                <div className="info-value">{event.location || "Chưa cập nhật"}</div>
              </div>
              <div className="mb-3">
                <div className="info-label">Trạng thái:</div>
                <span
                  className={`badge ms-2 ${
                    event.status === "scheduled"
                      ? "bg-warning"
                      : event.status === "ongoing"
                      ? "bg-success"
                      : event.status === "completed"
                      ? "bg-secondary"
                      : "bg-danger"
                  }`}
                >
                  {event.status === "scheduled"
                    ? "Sắp diễn ra"
                    : event.status === "ongoing"
                    ? "Đang diễn ra"
                    : event.status === "completed"
                    ? "Đã kết thúc"
                    : "Đã hủy"}
                </span>
              </div>
              <div>
                <div className="info-label">Mô tả:</div>
                <p className="mt-2 info-value">{event.description || "Chưa có mô tả"}</p>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="info-card">
              <h5>Thành viên ({members.length})</h5>
              <div className="d-flex flex-wrap gap-3">
                {members.slice(0, 10).map((member, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div
                      className="member-avatar"
                      title={member.userId?.fullName || "Thành viên"}
                    >
                      <img
                        src={
                          member.userId?.avatarUrl || "/website-icon-fix@3x.png"
                        }
                        className="rounded-circle"
                        style={{ width: 40, height: 40 }}
                        alt={member.userId?.fullName || "Thành viên"}
                      />
                    </div>
                    <p className="mt-2 mb-0 small text-center" style={{ maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {member.userId?.fullName || "Thành viên"}
                    </p>
                  </div>
                ))}
                {members.length > 10 && (
                  <div className="member-avatar d-flex align-items-center justify-content-center">
                    <span className="small fw-bold">+{members.length - 10}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab - Only Copy Invitation Code and Link */}
      {activeTab === "settings" && (
        <div className="row">
          <div className="col-lg-8">
            <div className="info-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-1">Mã mời tham gia</h5>
                  <p className="text-muted small mb-0">
                    Bạn có thể sao chép mã mời và đường liên kết để chia sẻ với người khác.
                  </p>
                </div>
                <span className="read-only-badge">
                  <i className="bi bi-lock"></i>
                  Chỉ xem
                </span>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Đường liên kết mời
                </label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={`https://myfevent.vn/e/${event.joinCode}`}
                    readOnly
                    style={{ cursor: "text" }}
                  />
                  <button
                    className="copy-btn"
                    onClick={() =>
                      copyToClipboard(`https://myfevent.vn/e/${event.joinCode}`)
                    }
                    title="Sao chép đường liên kết"
                  >
                    <i className="bi bi-copy"></i>
                  </button>
                </div>
                <small className="text-muted">
                  Chia sẻ đường liên kết này để mời người khác tham gia sự kiện
                </small>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-semibold">Mã tham gia</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={event.joinCode}
                    readOnly
                    style={{ cursor: "text" }}
                  />
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(event.joinCode)}
                    title="Sao chép mã tham gia"
                  >
                    <i className="bi bi-copy"></i>
                  </button>
                </div>
                <small className="text-muted">
                  Người khác có thể sử dụng mã này để tham gia sự kiện
                </small>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
            <div className="info-card">
              <h5>Thông tin sự kiện</h5>
              <div className="mb-3">
                <div className="info-label">Tên sự kiện</div>
                <div className="info-value">{event.name}</div>
              </div>
              <div className="mb-3">
                <div className="info-label">Trạng thái</div>
                <span
                  className={`badge ${
                    event.status === "scheduled"
                      ? "bg-warning"
                      : event.status === "ongoing"
                      ? "bg-success"
                      : event.status === "completed"
                      ? "bg-secondary"
                      : "bg-danger"
                  }`}
                >
                  {event.status === "scheduled"
                    ? "Sắp diễn ra"
                    : event.status === "ongoing"
                    ? "Đang diễn ra"
                    : event.status === "completed"
                    ? "Đã kết thúc"
                    : "Đã hủy"}
                </span>
              </div>
              <div className="mb-3">
                <div className="info-label">Loại sự kiện</div>
                <div className="info-value">
                  {event.type === "public" ? "Công khai" : "Riêng tư"}
                </div>
              </div>
              <div>
                <div className="info-label">Ngày tạo</div>
                <div className="info-value">
                  {new Date(event.createdAt).toLocaleDateString("vi-VN")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}

