import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDate } from "../../utils/formatDate";
import { eventService } from "../../services/eventService";
import { getEventImage } from "../../utils/getEventImage";
import { deriveEventStatus } from "../../utils/getEventStatus";
import Loading from "~/components/Loading";
import { CalendarDays, MapPin, User, FileText, AlignLeft, Zap, ExternalLink, Info } from "lucide-react";

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await eventService.fetchEventById(id);
        const payload = res?.data ?? res;
        setEvent(payload);
      } catch (err) {
        console.error("fetch event detail error", err);
        setError("Không thể tải chi tiết sự kiện");
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id]);

  const defaultImg = "/default-events.jpg";
  const imageUrl = getEventImage(event ?? {}, defaultImg);
  const title = event?.name || "Sự kiện";
  const dateText = event?.eventStartDate && event?.eventEndDate
    ? `${formatDate(event.eventStartDate)} - ${formatDate(event.eventEndDate)}`
    : formatDate(event?.eventDate);
  const address = event?.location || "Chưa cập nhật";
  const status = deriveEventStatus(event);
  const statusConfig = {
    text: status.text,
    color: status.badgeColor || "#ef4444",
    bg: status.badgeBg || "#fee2e2",
  };

  return (
    <>
      <Header />
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
      <div className="public-event-wrapper container-xl py-4">
        <div className="public-event-hero shadow-sm">
          <div
            className="public-event-image"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div className="public-event-overlay" />
          <div className="public-event-content">
            <div className="d-flex flex-wrap gap-2 mb-3">
              <span className="public-chip" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                <Zap size={16} />
                {statusConfig.text}
              </span>
              {address && (
                <span className="public-chip" style={{ background: "#f3e8ff", color: "#7c3aed" }}>
                  <MapPin size={16} />
                  {address}
                </span>
              )}
            </div>
            <h1 className="public-title">{title}</h1>
            <p className="public-date">
              <CalendarDays size={18} className="me-2" />
              {dateText || "Đang cập nhật"}
            </p>
          </div>
        </div>

        <div className="row g-4 mt-4">
          <div className="col-12 col-lg-8">
            <div className="info-card shadow-sm">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="info-card-icon">
                  <Info size={20} />
                </div>
                <div>
                  <p className="text-muted mb-1">Thông tin sự kiện</p>
                  <h4 className="mb-0">Khoảnh khắc bạn không nên bỏ lỡ</h4>
                </div>
              </div>
              <InfoRow icon={FileText} label="Tên sự kiện" value={title} />
              <InfoRow icon={User} label="Đơn vị tổ chức" value={event?.organizerName || event?.organizer || "FPT University"} />
              <InfoRow icon={CalendarDays} label="Thời gian" value={dateText || "Chưa cập nhật"} />
              <InfoRow icon={MapPin} label="Địa điểm" value={address} />
              <InfoRow icon={AlignLeft} label="Mô tả" value={event?.description || "Chưa có mô tả chi tiết."} multiline />
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="info-card shadow-sm" style={{ background: "#f8fafc" }}>
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="info-card-icon" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                  <ExternalLink size={18} />
                </div>
                <div>
                  <p className="text-muted mb-1">Chia sẻ sự kiện</p>
                  <h5 className="mb-0">Lan tỏa đến bạn bè</h5>
                </div>
              </div>
              <p className="text-muted small mb-2">Đường dẫn sự kiện</p>
              <div className="input-group">
                <input className="form-control" value={window.location.href} readOnly />
                <button className="btn btn-outline-secondary" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                  Sao chép
                </button>
              </div>
              <p className="text-muted small mt-3 mb-0">
                Hoặc lưu lại sự kiện để khám phá nhiều chương trình thú vị khác trên myFEvent.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <style>{`
        .public-event-wrapper {
          min-height: calc(100vh - 160px);
        }
        .public-event-hero {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          min-height: 340px;
          background: #111;
        }
        .public-event-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: brightness(0.75);
        }
        .public-event-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(15,23,42,0.8), rgba(220,38,38,0.65));
        }
        .public-event-content {
          position: relative;
          padding: 2.5rem;
          color: #fff;
        }
        .public-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
          background: rgba(255,255,255,0.1);
        }
        .public-title {
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 800;
          margin-bottom: 0.75rem;
        }
        .public-date {
          font-size: 1rem;
          opacity: 0.9;
          display: flex;
          align-items: center;
        }
        .info-card {
          background: #fff;
          border-radius: 20px;
          padding: 2rem;
        }
        .info-card-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #fee2e2;
          color: #b91c1c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
      `}</style>
    </>
  );
}

const InfoRow = ({ icon: Icon = FileText, label, value, multiline }) => (
  <div className="d-flex align-items-start gap-3 mb-3">
    <div className="rounded-3" style={{ width: 44, height: 44, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={18} style={{ color: "#ef4444" }} />
    </div>
    <div>
      <div className="text-muted small text-uppercase fw-semibold">{label}</div>
      {multiline ? (
        <p className="text-muted mb-0" style={{ lineHeight: 1.6 }}>{value}</p>
      ) : (
        <div className="fw-semibold fs-6">{value}</div>
      )}
    </div>
  </div>
);
