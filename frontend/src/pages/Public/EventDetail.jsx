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

            {error && <div className="text-danger mb-3">{error}</div>}

            {event && (
              <>
                <div className="row g-4 mb-4">
                  <div className="col-12 col-md-6">
                    <div
                      className="mb-2"
                      style={{ fontSize: 15, color: "#333" }}
                    >
                      <strong>Thời gian:</strong> {dateText}
                    </div>
                    <div style={{ fontSize: 15, color: "#333" }}>
                      <strong>Địa điểm:</strong> {address}
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div
                      className="mb-2"
                      style={{ fontSize: 15, color: "#333" }}
                    >
                      <strong>Trạng thái sự kiện:</strong> {statusText}
                    </div>
                    <div
                      className="d-flex align-items-center gap-2"
                      style={{ fontSize: 15, color: "#333" }}
                    >
                      <strong>Đơn vị tổ chức:</strong>
                      <span
                        className="badge"
                        style={{ backgroundColor: "#ffe0e0", color: "#ff5757" }}
                      >
                        {event?.organizer || "FPT"}
                      </span>
                    </div>
                  </div>
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
    </>
  );
}
