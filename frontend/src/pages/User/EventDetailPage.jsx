import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "~/components/Loading";
import UserLayout from "~/components/UserLayout";
import { formatDate } from "../../utils/formatDate";
import { eventService } from "../../services/eventService";
import { getEventImage } from "../../utils/getEventImage";
import { deriveEventStatus } from "../../utils/getEventStatus";

function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await eventService.fetchEventById(eventId);
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
  }, [eventId]);

  const defaultImg = "/default-events.jpg";
  const imageUrl = getEventImage(event ?? {}, defaultImg);
  const title = event?.name || "Sự kiện";
  const dateText =
    formatDate(event?.eventStartDate) + " - " + formatDate(event?.eventEndDate);
  const address = event?.location || "";
  const statusText = deriveEventStatus(event).text;
  console.log(event);
  return (
    <UserLayout title="Chi tiết sự kiện" activePage="home" sidebarType="user">
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
