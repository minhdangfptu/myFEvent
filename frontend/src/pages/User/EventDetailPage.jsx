import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "~/components/Loading";
import UserLayout from "~/components/UserLayout";
import { formatDate } from "../../utils/formatDate";
import { eventService } from "../../services/eventService";
import { getEventImage } from "../../utils/getEventImage";
import { deriveEventStatus } from "../../utils/getEventStatus";
import { CalendarDays, Copy, FileText, MapPin, User as UserIcon, Zap } from "lucide-react";
import { toast } from "react-toastify";

function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true); // Start with true to show loading immediately
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const loadDetail = async () => {
      if (!eventId) {
        if (mountedRef.current) {
          setLoading(false);
        }
        return;
      }
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await eventService.fetchEventById(eventId);
        // Chỉ cập nhật state nếu component vẫn còn mounted
        if (mountedRef.current) {
          const payload = res?.data ?? res;
          setEvent(payload);
          setLoading(false);
        }
      } catch (err) {
        // Chỉ cập nhật state nếu component vẫn còn mounted
        if (mountedRef.current) {
          setError("Không thể tải chi tiết sự kiện");
          setLoading(false);
        }
      }
    };
    loadDetail();

    // Cleanup function: đánh dấu component đã unmount
    return () => {
      mountedRef.current = false;
    };
  }, [eventId]);

  const defaultImg = "/default-events.jpg";
  const imageUrl = getEventImage(event ?? {}, defaultImg);
  const title = event?.name || "Sự kiện";
  const dateText =
    formatDate(event?.eventStartDate) + " - " + formatDate(event?.eventEndDate);
  const address = event?.location || "";
  const statusText = deriveEventStatus(event).text;
  const copyJoinCode = async () => {
    if (!event?.joinCode) return;
    try {
      await navigator.clipboard.writeText(event.joinCode);
      toast.success("Đã sao chép mã tham gia!");
    } catch (err) {
      toast.error("Không thể copy mã, vui lòng thử lại.");
    }
  };

  if (loading) {
    return (
      <UserLayout title="Chi tiết sự kiện" activePage="home" sidebarType="user" eventId={eventId}>
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải thông tin sự kiện...</div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Chi tiết sự kiện" activePage="home" sidebarType="user" eventId={eventId}>
      <div
        className="container-xl py-4"
        style={{
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.04)",
          paddingTop: "12px",
        }}
      >
        <div className="bg-white rounded-3 shadow-sm overflow-hidden"></div>
        {/* Banner ảnh */}
        <div
          style={{
            borderRadius: "14px",
            width: "100%",
            height: 320,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#a0a0a0",
          }}
        />

        <div className="p-4 p-md-5">
          <h2 className="fw-bold text-danger mb-4" style={{ fontSize: 28 }}>
            {title}
          </h2>
          <div className="d-flex gap-2 flex-wrap mb-4">
            {event?.status && (
              <span className={`event-chip chip-status-${event.status}`}>
                <Zap className="me-1" size={14} />
                {event.status === "scheduled" ? "Sắp diễn ra" : event.status === "ongoing" ? "Đang diễn ra" : event.status === "completed" ? "Đã kết thúc" : event.status === "cancelled" ? "Đã hủy" : event.status}
              </span>
            )}
            {event?.eventStartDate && event?.eventEndDate ? (
              <span className="event-chip chip-date">
                <CalendarDays className="me-1" size={14} /> {formatDate(event.eventStartDate)} - {formatDate(event.eventEndDate)}
              </span>
            ) : event?.eventDate ? (
              <span className="event-chip chip-date">
                <CalendarDays className="me-1" size={14} /> {formatDate(event.eventDate)}
              </span>
            ) : null}
            {event?.location && (
              <span className="event-chip chip-location">
                <MapPin className="me-1" size={14} />{event.location}
              </span>
            )}
          </div>
          {error && <div className="text-danger mb-3">{error}</div>}
          {event && (
            <>
              <div className="row g-4">
                <div className="col-12 col-lg-8">
                  <div className="event-info-card">
                    <div className="d-flex align-items-center gap-2 mb-4">
                      <div className="chip-status chip-status-scheduled d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, borderRadius: 12 }}>
                        <InfoIcon />
                      </div>
                      <h5 className="fw-bold mb-0" style={{ fontSize: 18 }}>Thông tin sự kiện</h5>
                    </div>
                    <InfoItem icon={FileText} label="Tên sự kiện" value={event.name} />
                    <InfoItem icon={UserIcon} label="Người tổ chức" value={event.organizerName || "Chưa cập nhật"} />
                    <InfoItem icon={CalendarDays} label="Thời gian diễn ra" value={dateText} />
                    <InfoItem icon={MapPin} label="Địa điểm" value={address || "Chưa xác định"} />
                    <InfoItem icon={InfoIcon } label="Trạng thái" value={statusText} badge />
                    <InfoItem icon={FileText} label="Mô tả" value={event.description || "Chưa có mô tả"} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div
        className="mb-3"
        style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}
      >
        <button
          className="btn btn-outline-secondary rounded-pill px-4 py-2 d-inline-flex align-items-center"
          onClick={() => navigate(-1)}
          style={{ fontWeight: 500, fontSize: 15 }}
        >
          <i className="bi bi-arrow-left me-2" />
          Quay lại
        </button>
      </div>
    </UserLayout>
  );
}

export default EventDetailPage;

const InfoItem = ({ icon: Icon = FileText, label, value, badge }) => (
  <div className="d-flex align-items-start gap-3 mb-3">
    <div className="rounded-3" style={{ width: 44, height: 44, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={18} style={{ color: "#ef4444" }} />
    </div>
    <div>
      <div className="text-muted small">{label}</div>
      {badge ? (
        <span className="badge bg-success-subtle text-success px-3 py-2">{value}</span>
      ) : (
        <div className="fw-semibold">{value}</div>
      )}
    </div>
  </div>
);

const LinkIcon = () => <Copy size={18} />;
const InfoIcon = () => <FileText size={18} style={{ color: "#ef4444" }} />;
