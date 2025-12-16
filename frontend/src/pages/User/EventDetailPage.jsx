import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "~/components/Loading";
import UserLayout from "~/components/UserLayout";
import { formatDate } from "../../utils/formatDate";
import { eventService } from "../../services/eventService";
import { getEventImage } from "../../utils/getEventImage";
import { deriveEventStatus } from "../../utils/getEventStatus";
import { 
  CalendarDays, 
  MapPin, 
  User as UserIcon, 
  Zap, 
  ExternalLink, 
  FileText,
  Info 
} from "lucide-react";
import { toast } from "react-toastify";

function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const statusInfo = deriveEventStatus(event);
  const statusText = statusInfo.text;

  const copyJoinCode = async () => {
    if (!event?.joinCode) return;
    try {
      await navigator.clipboard.writeText(event.joinCode);
      toast.success("Đã sao chép mã tham gia!");
    } catch (err) {
      toast.error("Không thể copy mã, vui lòng thử lại.");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép đường dẫn sự kiện!");
    } catch (err) {
      toast.error("Không thể copy link, vui lòng thử lại.");
    }
  };

  if (loading) {
    return (
      <UserLayout title="Chi tiết sự kiện" activePage="home" sidebarType="user" eventId={eventId}>
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
          <Loading />
          <div className="text-muted mt-3 fw-medium">Đang tải thông tin...</div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Chi tiết sự kiện" activePage="home" sidebarType="user" eventId={eventId}>
      <div className="container-fluid px-0">
        
        {/* --- 1. HERO BANNER (Giống ảnh mẫu) --- */}
        <div 
          className="position-relative rounded-4 overflow-hidden mb-4 shadow-sm" 
          style={{ height: "300px", marginTop: "10px" }}
        >
            {/* Ảnh nền */}
            <div 
                className="position-absolute w-100 h-100"
                style={{ 
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />
            {/* Lớp phủ Gradient (Để chữ trắng nổi bật trên nền ảnh) */}
            <div 
                className="position-absolute w-100 h-100"
                style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 100%)"
                }}
            />
            
            {/* Nội dung trên Banner */}
            <div className="position-absolute bottom-0 start-0 p-4 text-white w-100">
                 <div className="d-flex gap-2 mb-3">
                    {/* Chip: Sắp diễn ra */}
                    <span 
                        className="badge rounded-pill d-flex align-items-center gap-1 px-3 py-2 border border-light border-opacity-25"
                        style={{ 
                            background: "rgba(255, 235, 238, 0.9)", // Màu hồng nhạt
                            color: "#d32f2f", // Chữ đỏ đậm
                            fontSize: "0.85rem",
                            fontWeight: "600"
                        }}
                    >
                        <Zap size={14} fill="#d32f2f" /> {statusInfo.text}
                    </span>
                    {/* Chip: Địa điểm */}
                    {address && (
                        <span 
                            className="badge rounded-pill d-flex align-items-center gap-1 px-3 py-2 border border-light border-opacity-25"
                            style={{ 
                                background: "rgba(255,255,255,0.2)", 
                                backdropFilter: "blur(4px)",
                                fontSize: "0.85rem",
                                fontWeight: "500"
                            }}
                        >
                            <MapPin size={14} /> {address}
                        </span>
                    )}
                 </div>
                 <h1 className="fw-bold mb-2 display-6">{title}</h1>
                 <div className="d-flex align-items-center opacity-90 small">
                    <CalendarDays size={18} className="me-2" />
                    {dateText}
                 </div>
            </div>
        </div>

        {/* --- 2. MAIN CONTENT --- */}
        <div className="row g-4">
            
            {/* Cột trái: Thông tin chi tiết */}
            <div className="col-12 col-lg-8">
                <div className="bg-white rounded-4 border p-4 h-100 shadow-sm">
                    <div className="d-flex flex-column gap-1">
                        <InfoRow 
                            icon={FileText} 
                            label="TÊN SỰ KIỆN" 
                            value={<span className="fw-bold text-dark fs-6">{event?.name}</span>} 
                        />
                        <div className="border-bottom my-3 opacity-50"></div>
                        
                        <InfoRow 
                            icon={UserIcon} 
                            label="ĐƠN VỊ TỔ CHỨC" 
                            value={<span className="fw-semibold text-dark">{event?.organizerName || "FPTU BoardGame Club"}</span>} 
                        />
                        <div className="border-bottom my-3 opacity-50"></div>

                        <InfoRow 
                            icon={CalendarDays} 
                            label="THỜI GIAN" 
                            value={<span className="fw-semibold text-dark">{dateText}</span>} 
                        />
                        <div className="border-bottom my-3 opacity-50"></div>

                        <InfoRow 
                            icon={MapPin} 
                            label="ĐỊA ĐIỂM" 
                            value={<span className="fw-semibold text-dark">{address}</span>} 
                        />
                         <div className="border-bottom my-3 opacity-50"></div>
                        
                         <InfoRow 
                            icon={Info} 
                            label="MÔ TẢ" 
                            value={<span className="text-secondary" style={{ lineHeight: 1.6 }}>{event?.description || "Sự kiện chưa có mô tả chi tiết."}</span>}
                            alignStart
                        />
                    </div>
                </div>
            </div>

            {/* Cột phải: BOX CHIA SẺ (Làm giống hệt ảnh mẫu) */}
            <div className="col-12 col-lg-4">
                <div className="bg-white rounded-4 border p-4 shadow-sm h-100">
                    {/* Header Box */}
                    <div className="d-flex align-items-center gap-3 mb-4">
                         <div 
                             className="d-flex align-items-center justify-content-center rounded-3" 
                             style={{ width: 52, height: 52, background: "#fee2e2", color: "#ef4444" }}
                         >
                            <ExternalLink size={24} />
                        </div>
                        <div>
                            <div className="text-secondary mb-0" style={{ fontSize: "0.85rem" }}>Chia sẻ sự kiện</div>
                            <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "1.1rem" }}>Lan tỏa đến bạn bè</h6>
                        </div>
                    </div>

                    {/* Input Link */}
                    <div className="mb-3">
                        <label className="text-muted small mb-2 d-block">Đường dẫn sự kiện</label>
                        <div className="input-group">
                            <input 
                                type="text" 
                                className="form-control bg-white text-secondary" 
                                value={window.location.href} 
                                readOnly 
                                style={{ fontSize: '0.9rem', borderColor: '#e5e7eb', padding: '10px 12px' }}
                            />
                            <button 
                                className="btn btn-outline-secondary" 
                                onClick={handleCopyLink}
                                type="button"
                                style={{ borderColor: '#e5e7eb', color: '#4b5563', padding: '0 16px' }}
                            >
                                Sao chép
                            </button>
                        </div>
                    </div>
                    
                    {/* Footer Text */}
                    <p className="text-muted small mt-3 mb-0" style={{ lineHeight: '1.5', fontSize: '0.85rem' }}>
                        Hoặc lưu lại sự kiện để khám phá nhiều chương trình thú vị khác trên myFEvent.
                    </p>
                </div>
            </div>
        </div>

        {/* Nút quay lại */}
        <div className="d-flex justify-content-center mt-5 pb-4">
            <button
            className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-medium border shadow-sm bg-white"
            onClick={() => navigate(-1)}
            >
            <i className="bi bi-arrow-left me-2"></i>
            Quay lại danh sách
            </button>
        </div>
      </div>
    </UserLayout>
  );
}

export default EventDetailPage;

// Component hiển thị từng dòng thông tin (đã style lại icon)
const InfoRow = ({ icon: Icon, label, value, alignStart }) => (
  <div className={`d-flex ${alignStart ? 'align-items-start' : 'align-items-center'} gap-3`}>
    <div 
        className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" 
        style={{ width: 40, height: 40, background: "#fef2f2", color: "#ef4444" }}
    >
      <Icon size={18} />
    </div>
    <div className="flex-grow-1">
      <div className="text-muted small text-uppercase fw-bold mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>{label}</div>
      <div>{value}</div>
    </div>
  </div>
);