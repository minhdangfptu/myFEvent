import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { eventApi } from "../../apis/eventApi";
import { useAuth } from "../../contexts/AuthContext";
import Loading from "../../components/Loading";
import { useEvents } from "../../contexts/EventContext";
import { toast } from "react-toastify";
import { formatDate } from "../../utils/formatDate";
import { AlertTriangle, AlignLeft, Calendar, CalendarClock, ClipboardList, Copy, FileText, Grid, Hash, Info, Link, Lock, LogOut, MapPin, Tag, User, Users, Zap } from "lucide-react";


export default function MemberEventDetail() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventRole, setEventRole] = useState('');
  const { fetchEventRole, refetchEvents } = useEvents();
  const [activeTab, setActiveTab] = useState("overview");

  // Thêm eventId vào URL query để sidebar đồng bộ
  useEffect(() => {
    if (!eventId) return;
    const params = new URLSearchParams(location.search);
    const currentEventId = params.get('eventId');
    if (!currentEventId || currentEventId !== eventId) {
      params.set('eventId', eventId);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  }, [eventId, location.search, location.pathname, navigate]);

  useEffect(() => {
    fetchEventDetail();
  }, [eventId]);

  useEffect(() => {
    const loadRole = async () => {
      if (!eventId) return;
      try {
        const role = await fetchEventRole(eventId);
        setEventRole(role || '');
      } catch {
        setEventRole('');
      }
    };
    loadRole();
  }, [eventId, fetchEventRole]);

  const fetchEventDetail = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [eventRes, summaryRes] = await Promise.all([
        eventApi.getById(eventId),
        eventApi.getEventSummary(eventId),
      ]);

      const eventData = eventRes.data;
      const memberList = summaryRes.data?.members || summaryRes.members || [];

      if (!eventData) {
        setError("Không tìm thấy thông tin sự kiện");
        return;
      }

      setEvent({
        ...eventData,
        memberCount: memberList.length || eventData.memberCount || 0,
      });
      setMembers(memberList);
    } catch (error) {
      console.error("Error fetching event detail:", error);
      if (error.response?.status === 403) {
        setError("Bạn không có quyền truy cập sự kiện này");
      } else if (error.response?.status === 404) {
        setError("Không tìm thấy sự kiện");
      } else {
        setError("Không thể tải thông tin sự kiện");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveEvent = async () => {
    if (!eventId) return;
    const confirmed = window.confirm('Bạn có chắc chắn muốn rời sự kiện này? Bạn sẽ mất quyền truy cập vào các chức năng của sự kiện.');
    if (!confirmed) return;

    try {
      setLoading(true);
      await eventApi.leaveEvent(eventId);
      await refetchEvents?.();
      toast.success('Bạn đã rời sự kiện thành công');
      navigate('/home-page');
    } catch (error) {
      console.error('Error leaving event:', error);
      const msg = error?.response?.data?.message || 'Không thể rời sự kiện';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <UserLayout title="Chi tiết sự kiện" sidebarType="member" eventId={eventId}>
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải thông tin sự kiện...</div>
        </div>
      </UserLayout>
    );
  }

  if (error || !event) {
    return (
      <UserLayout  title="Chi tiết sự kiện" sidebarType="member" eventId={eventId}>
        <div className="alert alert-danger" role="alert">
          {error || 'Không tìm thấy sự kiện'}
        </div>
      </UserLayout>
    );
  }

  const getImageSrc = (image) => {
    if (!image) return "/default-events.jpg";
    const source = Array.isArray(image) && image.length > 0 ? image[0] : image;
    if (typeof source !== "string") return "/default-events.jpg";
    if (source.startsWith("data:") || source.startsWith("http")) return source;
    return `data:image/jpeg;base64,${source}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép!");
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Đã sao chép!");
      } catch (e) {
        toast.error("Không thể sao chép");
      }
      document.body.removeChild(textArea);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      scheduled: { text: "Sắp diễn ra", color: "#3b82f6", bg: "#eff6ff", icon: "clock" },
      ongoing: { text: "Đang diễn ra", color: "#10b981", bg: "#f0fdf4", icon: "play-circle" },
      completed: { text: "Đã kết thúc", color: "#6b7280", bg: "#f9fafb", icon: "check-circle" },
      cancelled: { text: "Đã hủy", color: "#ef4444", bg: "#fef2f2", icon: "x-circle" },
    };
    return configs[status] || configs.scheduled;
  };

  const statusConfig = getStatusConfig(event.status);
  const memberCount = event.memberCount || members.length || 0;
  const sidebarType = "member";

  return (
    <UserLayout activePage="overview-detail" title="Chi tiết sự kiện" sidebarType={sidebarType} eventId={eventId}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .event-detail-wrapper {
          background: #f8fafc;
          min-height: 100vh;
          padding: 2rem;
        }
        .event-hero {
          position: relative;
          height: 320px;
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 2rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .event-hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .event-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
        }
        .event-hero-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 2.5rem;
          color: white;
        }
        .event-hero-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .event-hero-meta {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .hero-meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          padding: 0.5rem 1rem;
          border-radius: 50px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.25rem;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .nav-tabs-modern {
          background: white;
          border-radius: 16px;
          padding: 0.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          display: flex;
          gap: 0.5rem;
        }
        .tab-button {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border: none;
          background: transparent;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          color: #64748b;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .tab-button:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .tab-button.active {
          background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 2rem;
        }
        .card-modern {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          margin-bottom: 1.5rem;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f1f5f9;
        }
        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .card-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .info-grid {
          display: grid;
          gap: 1.25rem;
        }
        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .info-icon {
          width: 36px;
          height: 36px;
          background: #f1f5f9;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ef4444;
          flex-shrink: 0;
        }
        .info-content {
          flex: 1;
        }
        .info-label {
          font-size: 0.8125rem;
          color: #64748b;
          font-weight: 500;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-value {
          font-size: 1rem;
          color: #0f172a;
          font-weight: 600;
        }
        .member-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 1rem;
        }
        .member-card {
          text-align: center;
        }
        .member-avatar-wrapper {
          width: 56px;
          height: 56px;
          margin: 0 auto 0.5rem;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #f1f5f9;
        }
        .member-avatar-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .member-name {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }
        .join-code-card {
          background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
          color: white;
          border-radius: 20px;
          padding: 2rem;
        }
        .join-code-input-group {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }
        .join-code-input {
          flex: 1;
          padding: 0.875rem 1rem;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          color: white;
          font-weight: 600;
          backdrop-filter: blur(10px);
        }
        .copy-btn-modern {
          width: 44px;
          height: 44px;
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .btn-modern {
          padding: 0.875rem 1rem;
          border-radius: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .btn-outline {
          background: white;
          border: 2px solid #e2e8f0;
          color: #0f172a;
        }
        .btn-outline:hover {
          border-color: #ef4444;
          color: #ef4444;
        }
        .btn-danger-modern {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }
        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
          .event-detail-wrapper {
            padding: 1rem;
          }
          .hero-meta-item {
            width: calc(50% - 0.5rem);
          }
        }
        @media (max-width: 640px) {
          .event-hero {
            height: 240px;
          }
          .event-hero-title {
            font-size: 1.75rem;
          }
          .nav-tabs-modern {
            flex-direction: column;
          }
          .hero-meta-item {
            width: 100%;
          }
        }
      `}</style>

      <div className="event-detail-wrapper">
        <div className="event-hero">
          <img
            src={getImageSrc(event.image)}
            alt={event.name}
            className="event-hero-image"
            onError={(e) => {
              e.target.src = "/default-events.jpg";
            }}
          />
          <div className="event-hero-overlay"></div>
          <div className="event-hero-content">
            <h1 className="event-hero-title">{event.name}</h1>
            <div className="event-hero-meta">
              <div className="hero-meta-item">
                <Users size={18} />
                <span>{memberCount} Thành viên</span>
              </div>
              <div className="hero-meta-item">
                <Calendar size={18} />
                <span>
                  {event.eventStartDate && event.eventEndDate
                    ? `${formatDate(event.eventStartDate)} - ${formatDate(event.eventEndDate)}`
                    : "Chưa có thông tin"}
                </span>
              </div>
              <div className="hero-meta-item">
                <MapPin size={18} />
                <span>{event.location || "Chưa cập nhật"}</span>
              </div>
              <div className="status-badge" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                <i className={`bi bi-${statusConfig.icon}`}></i>
                {statusConfig.text}
              </div>
            </div>
          </div>
        </div>

        <div className="nav-tabs-modern">
          <button className={`tab-button ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
            <Grid size={18} />
            Tổng quan
          </button>
          <button className={`tab-button ${activeTab === "actions" ? "active" : ""}`} onClick={() => setActiveTab("actions")}>
            <Zap size={18} />
            Hành động
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {activeTab === "overview" && (
          <div className="content-grid">
            <div>
              <div className="card-modern">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-icon">
                      <Info size={18} />
                    </div>
                    Thông tin sự kiện
                  </div>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-icon">
                      <FileText size={18} />
                    </div>
                    <div className="info-content">
                      <div className="info-label">Tên sự kiện</div>
                      <div className="info-value">{event.name}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <User size={18} />
                    </div>
                    <div className="info-content">
                      <div className="info-label">Người tổ chức</div>
                      <div className="info-value">{event.organizerName?.fullName || event.organizerName || "Chưa cập nhật"}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <MapPin size={18} />
                    </div>
                    <div className="info-content">
                      <div className="info-label">Địa điểm</div>
                      <div className="info-value">{event.location || "Chưa cập nhật"}</div>
                    </div>
                  </div>
                  {event.description && (
                    <div className="info-item">
                      <div className="info-icon">
                        <AlignLeft size={18} />
                      </div>
                      <div className="info-content">
                        <div className="info-label">Mô tả</div>
                        <div className="info-value" style={{ fontWeight: 400, lineHeight: 1.6 }}>{event.description}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-modern">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-icon">
                      <Calendar size={18} />
                    </div>
                    Lịch & quyền truy cập
                  </div>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-icon">
                      <CalendarClock size={18} />
                    </div>
                    <div className="info-content">
                      <div className="info-label">Thời gian</div>
                      <div className="info-value">
                        {event.eventStartDate && event.eventEndDate
                          ? `${formatDate(event.eventStartDate)} - ${formatDate(event.eventEndDate)}`
                          : "Chưa có thông tin"}
                      </div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <Lock size={18} />
                    </div>
                    <div className="info-content">
                      <div className="info-label">Loại sự kiện</div>
                      <div className="info-value">{event.type === "public" ? "Công khai" : "Riêng tư"}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <Tag size={18} />
                    </div>
                    <div className="info-content">
                      <div className="info-label">Vai trò của bạn</div>
                      <div className="info-value">{eventRole === "Member" ? "Thành viên" : (eventRole || "Thành viên")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="card-modern">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-icon">
                      <Users size={18} />
                    </div>
                    Thành viên ({memberCount})
                  </div>
                </div>
                <div className="member-grid">
                  {members.slice(0, 12).map((member) => (
                    <div key={member._id || member.id} className="member-card">
                      <div className="member-avatar-wrapper">
                        <img
                          src={member.userId?.avatarUrl || "/website-icon-fix@3x.png"}
                          alt={member.userId?.fullName || "Member"}
                        />
                      </div>
                      <div className="member-name">{member.userId?.fullName || "Member"}</div>
                    </div>
                  ))}
                  {members.length > 12 && (
                    <div className="member-card">
                      <div
                        className="member-avatar-wrapper"
                        style={{ background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <span style={{ fontWeight: "700", color: "#ef4444" }}>+{members.length - 12}</span>
                      </div>
                      <div className="member-name">Khác</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="join-code-card">
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>
                  <Link size={20} />
                  Mã mời tham gia
                </h3>
                <div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.5rem" }}>Mã tham gia</div>
                  <div className="join-code-input-group">
                    <input type="text" className="join-code-input" value={event.joinCode} readOnly />
                    <button className="copy-btn-modern" style={{ width: 52, height: 52 }} onClick={() => copyToClipboard(event.joinCode)}>
                      <Copy size={22} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "actions" && (
          <div className="card-modern">
            <div className="card-header">
              <div className="card-title">
                <div className="card-icon">
                  <Zap size={18} />
                </div>
                Trung tâm hành động
              </div>
            </div>
            <div className="action-buttons">
              <button className="btn-modern btn-outline" onClick={() => navigate(`/events/${eventId}/member-tasks`)}>
                <ClipboardList size={18} />
                Xem công việc
              </button>
              <button className="btn-modern btn-outline" onClick={() => navigate(`/events/${eventId}/my-calendar`)}>
                <Calendar size={18} />
                Lịch cá nhân
              </button>
              <button className="btn-modern btn-outline" onClick={() => navigate(`/events/${eventId}/risks`)}>
                <AlertTriangle size={18} />
                Rủi ro sự kiện
              </button>
              {eventRole === "Member" && (
                <button className="btn-modern btn-danger-modern" onClick={handleLeaveEvent}>
                  <LogOut size={18} />
                  Rời sự kiện
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
