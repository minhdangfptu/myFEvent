import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDate } from "../../utils/formatDate";
import { eventService } from "../../services/eventService";
import { getEventImage } from "../../utils/getEventImage";
import { deriveEventStatus } from "../../utils/getEventStatus";
import Loading from "~/components/Loading";

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
  const dateText = formatDate(event?.eventDate);
  const address = event?.location || "";
  const statusText = deriveEventStatus(event).text;

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
      <div className="container-xl py-4">
        <div className="bg-white rounded-3 shadow-sm overflow-hidden">
          {/* Banner ảnh */}
          <div
            style={{
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
                  <i className="bi bi-lightning-charge-fill me-1" />
                  {event.status === "scheduled" ? "Sắp diễn ra" : event.status === "ongoing" ? "Đang diễn ra" : event.status === "completed" ? "Đã kết thúc" : event.status === "cancelled" ? "Đã hủy" : event.status}
                </span>
              )}
              {event?.eventStartDate && event?.eventEndDate ? (
                <span className="event-chip chip-date">
                  <i className="bi bi-calendar-event me-1" /> {formatDate(event.eventStartDate)} - {formatDate(event.eventEndDate)}
                </span>
              ) : event?.eventDate ? (
                <span className="event-chip chip-date">
                  <i className="bi bi-calendar-event me-1" /> {formatDate(event.eventDate)}
                </span>
              ) : null}
              {event?.location && (
                <span className="event-chip chip-location">
                  <i className="bi bi-geo-alt me-1" />{event.location}
                </span>
              )}
            </div>
            {error && <div className="text-danger mb-3">{error}</div>}
            {event && (
              <>
                <div className="mb-3">
                  <span className="fw-bold" style={{ fontSize: '15px', color:'#222'}}>Đơn vị tổ chức: </span>
                  <span className="badge" style={{ backgroundColor: "#ffe0e0", color: "#ff5757" }}>{event?.organizerName || event?.organizer || "FPT"}</span>
                </div>
                <div className="mt-4 pt-4 border-top">
                  <h5 className="fw-bold mb-3" style={{ fontSize: 18 }}>
                    Chi tiết sự kiện
                  </h5>
                  <p
                    className="text-secondary"
                    style={{ fontSize: 15, lineHeight: 1.8 }}
                  >
                    {event?.description || "Không có mô tả chi tiết."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <style>{`
  .event-chip { border-radius:999px; font-size:12px; padding:6px 10px; display:inline-flex; align-items:center; gap:6px; }
  .chip-status-scheduled { background:#dcfce7 !important; color:#22c55e !important; border:1px solid #bbf7d0; }
  .chip-status-ongoing   { background:#fff7ed !important; color:#f59e42 !important; border:1px solid #fed7aa; }
  .chip-status-completed { background:#f3f4f6 !important; color:#6b7280 !important; border:1px solid #e5e7eb; }
  .chip-status-cancelled { background:#fef2f2 !important; color:#dc2626 !important; border:1px solid #fecaca; }
  .chip-date             { background:#eff6ff !important; color:#2563eb !important; border:1px solid #bae6fd; }
  .chip-location         { background:#f3e8ff !important; color:#9333ea !important; border:1px solid #e9d5ff; }
`}</style>
    </>
  );
}
