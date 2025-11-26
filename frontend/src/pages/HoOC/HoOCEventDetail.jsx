import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import UserLayout from "../../components/UserLayout";
import { eventApi } from "../../apis/eventApi";
import { userApi } from "../../apis/userApi";
import Loading from "~/components/Loading";
import ConfirmModal from "../../components/ConfirmModal";
import { useEvents } from "../../contexts/EventContext";
import { formatDate, formatDateForInput } from "../../utils/formatDate";

function toDMY(value) {
  const d = new Date(value);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("vi-VN").replace(/\//g, "-");
}

function formatDateTimeForInput(value) {
  if (!value) return "";
  let d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // Format: yyyy-MM-ddTHH:mm for datetime-local input
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function HoOCEventDetail() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();

  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [event, setEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [eventRole, setEventRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    organizerName: "",
    eventStartDate: "",
    eventEndDate: "",
    location: "",
    status: "",
  });

  // Image upload state
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageInputType, setImageInputType] = useState("file");
  const [imageUrl, setImageUrl] = useState("");

  // Modal state
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    action: null,
    message: "",
  });
  const [secondConfirm, setSecondConfirm] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [otpModal, setOtpModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpMsg, setOtpMsg] = useState("");
  const [validationModal, setValidationModal] = useState({
    show: false,
    missingFields: [],
  });

  const isGoogleUser = user?.authProvider === "google";
  const isMember = eventRole === "Member";
  const canEditImages = event?.status !== "completed" && event?.status !== "cancelled";

  // ========== EFFECTS ==========
  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

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

  // ========== API FUNCTIONS ==========
  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const [eventRes, membersRes] = await Promise.all([
        eventApi.getById(eventId),
        eventApi.getEventSummary(eventId),
      ]);

      setEvent(eventRes.data);
      setMembers(membersRes.data.members || []);
      setEditForm({
        name: eventRes.data.name || "",
        description: eventRes.data.description || "",
        organizerName: eventRes.data.organizerName || "",
        location: eventRes.data.location || "",
        status: eventRes.data.status || "",
        eventStartDate: eventRes.data.eventStartDate || "",
        eventEndDate: eventRes.data.eventEndDate || "",
      });
    } catch (error) {
      console.error("Error fetching event details:", error);
      setError("Không thể tải thông tin sự kiện");
    } finally {
      setLoading(false);
    }
  };

  // ========== MODAL HANDLERS ==========
  const handleOpenConfirm = (action, message) => {
    setConfirmModal({ show: true, action, message });
  };

  const handleCloseConfirm = () =>
    setConfirmModal({ show: false, action: null, message: "" });

  const handleConfirm = async () => {
    if (confirmModal.action) await confirmModal.action();
    setConfirmModal({ show: false, action: null, message: "" });
  };

  // ========== EVENT HANDLERS ==========
  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError("");

      if (!editForm.name.trim()) {
        setError("Tên sự kiện không được để trống");
        return;
      }
      if (!editForm.organizerName.trim()) {
        setError("Tên người tổ chức không được để trống");
        return;
      }

      await eventApi.updateEvent(eventId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        organizerName: editForm.organizerName.trim(),
        eventEndDate: editForm.eventEndDate,
        eventStartDate: editForm.eventStartDate,
        location: editForm.location.trim(),
        status: editForm.status,
      });

      setEditing(false);
      await fetchEventDetails();
      toast.success("Cập nhật thông tin sự kiện thành công!");
    } catch (error) {
      console.error("Update event error:", error);
      setError(error.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEvent = async () => {
    handleOpenConfirm(
      async () => {
        try {
          await eventApi.updateEvent(eventId, { status: "cancelled" });
          await fetchEventDetails();
          toast.success("Đã hủy sự kiện thành công!");
        } catch (error) {
          console.error("Update event error:", error);
          setError(error.response?.data?.message || "Hủy sự kiện thất bại");
        }
      },
      "Bạn có chắc chắn muốn hủy sự kiện này? Hành động này sẽ chuyển trạng thái sự kiện về 'Đã hủy'."
    );
  };

  const validateEventDataForPublic = (eventData) => {
    const missingFields = [];
    if (!eventData.name || !eventData.name.trim()) missingFields.push("Tên sự kiện");
    if (!eventData.description || !eventData.description.trim()) missingFields.push("Mô tả");
    if (!eventData.organizerName || !eventData.organizerName.trim()) missingFields.push("Người tổ chức");
    if (!eventData.eventStartDate) missingFields.push("Ngày bắt đầu");
    if (!eventData.eventEndDate) missingFields.push("Ngày kết thúc");
    if (!eventData.location || !eventData.location.trim()) missingFields.push("Địa điểm");
    if (!eventData.image || !Array.isArray(eventData.image) || eventData.image.length === 0) {
      missingFields.push("Hình ảnh sự kiện");
    }
    return { isValid: missingFields.length === 0, missingFields };
  };

  const handleChangeType = async () => {
    if (!event) return;
    const validation = validateEventDataForPublic(event);
    if (!validation.isValid) {
      setValidationModal({ show: true, missingFields: validation.missingFields });
      return;
    }

    handleOpenConfirm(
      async () => {
        try {
          await eventApi.updateEvent(eventId, { type: "public" });
          toast.success("Công khai sự kiện thành công!");
          await fetchEventDetails();
        } catch (error) {
          console.error("Change type error:", error);
          if (error.response?.data?.missingFields) {
            setValidationModal({ show: true, missingFields: error.response.data.missingFields });
          } else {
            toast.error(error.response?.data?.message || "Thay đổi trạng thái thất bại");
          }
        }
      },
      "Bạn có chắc chắn muốn công khai sự kiện này? Thông tin sự kiện sẽ được hiển thị công khai cho mọi người."
    );
  };

  const handleDelete = async () => {
    handleOpenConfirm(
      async () => {
        setSecondConfirm(true);
      },
      "Bạn có chắc chắn muốn xóa sự kiện này? Mọi dữ liệu về Ban tổ chức và thành viên sẽ bị xóa vĩnh viễn và không thể khôi phục."
    );
  };

  const doDeleteEvent = async () => {
    try {
      await eventApi.deleteEvent(eventId);
      toast.success("Xoá sự kiện thành công!");
      window.location.replace("/home-page");
    } catch (error) {
      setError("Xóa sự kiện thất bại");
    } finally {
      setSecondConfirm(false);
    }
  };

  const onSecondDeleteConfirm = () => {
    setSecondConfirm(false);
    setPassword("");
    setPasswordError("");
    if (isGoogleUser) {
      setOtpModal(true);
      setOtpMsg("");
      setOtp(["", "", "", "", "", ""]);
      setOtpError("");
      setOtpSent(false);
    } else {
      setPasswordModal(true);
    }
  };

  const handleCheckPasswordAndDelete = async () => {
    setPasswordError("");
    if (!password.trim()) {
      setPasswordError("Vui lòng nhập mật khẩu!");
      return;
    }
    try {
      await userApi.checkPassword(password);
      setPasswordModal(false);
      await doDeleteEvent();
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Mật khẩu không đúng!");
    }
  };

  // ========== IMAGE HANDLERS ==========
  const getImageSrc = (image) => {
    if (!image) return "/default-events.jpg";
    if (Array.isArray(image) && image.length > 0) {
      const firstImage = image[0];
      if (typeof firstImage === "string" && firstImage.startsWith("data:")) return firstImage;
      return `data:image/jpeg;base64,${firstImage}`;
    }
    if (typeof image === "string") {
      if (image.startsWith("data:") || image.startsWith("http")) return image;
      return `data:image/jpeg;base64,${image}`;
    }
    return "/default-events.jpg";
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file hình ảnh hợp lệ");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Kích thước file không được vượt quá 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageFiles((prev) => [...prev, file]);
      setImagePreviews((prev) => [...prev, e.target.result]);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlAdd = () => {
    if (!imageUrl.trim()) {
      setError("Vui lòng nhập URL hình ảnh");
      return;
    }
    try {
      new URL(imageUrl);
    } catch {
      setError("URL không hợp lệ");
      return;
    }
    setImagePreviews((prev) => [...prev, imageUrl.trim()]);
    setImageUrl("");
    setError("");
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (index) => {
    handleOpenConfirm(
      async () => {
        try {
          setSubmitting(true);
          const updatedImages = event.image.filter((_, i) => i !== index);
          await eventApi.replaceEventImages(eventId, updatedImages);
          await fetchEventDetails();
          toast.success("Xóa ảnh thành công!");
        } catch (error) {
          setError("Xóa ảnh thất bại");
        } finally {
          setSubmitting(false);
        }
      },
      "Bạn có chắc chắn muốn xóa ảnh này?"
    );
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async () => {
    if (imagePreviews.length === 0) return;
    try {
      setSubmitting(true);
      setError("");
      const base64Images = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const base64 = await convertToBase64(imageFiles[i]);
        base64Images.push(base64);
      }
      const urlImages = imagePreviews.filter((_, i) => i >= imageFiles.length);
      const allImages = [...base64Images, ...urlImages];
      await eventApi.replaceEventImages(eventId, allImages);
      setImageFiles([]);
      setImagePreviews([]);
      setImageUrl("");
      await fetchEventDetails();
      toast.success("Cập nhật hình ảnh thành công!");
    } catch (error) {
      toast.error("Cập nhật hình ảnh thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  // ========== OTP HANDLERS ==========
  const sendOtp = async () => {
    setOtpLoading(true);
    setOtpError("");
    setOtpMsg("");
    try {
      await userApi.sendDeleteOtp(user.email);
      setOtpSent(true);
      setOtpMsg("Đã gửi mã xác nhận, vui lòng kiểm tra email.");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Không thể gửi mã xác nhận!");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtpAndDelete = async () => {
    setOtpError("");
    setOtpMsg("");
    const code = otp.join("");
    if (code.length !== 6) {
      setOtpError("Vui lòng nhập đủ 6 số.");
      return;
    }
    setOtpLoading(true);
    try {
      await userApi.verifyDeleteOtp(user.email, code);
      setOtpModal(false);
      await doDeleteEvent();
    } catch (err) {
      setOtpError(err.response?.data?.message || "Sai mã xác nhận!");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  // ========== UTILITY FUNCTIONS ==========
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

  // ========== RENDER ==========
  const sidebarType = eventRole === "Member" ? "member" : eventRole === "HoD" ? "hod" : "hooc";

  if (loading) {
    return (
      <UserLayout title="Chi tiết sự kiện" sidebarType={sidebarType} activePage="overview-detail" eventId={eventId}>
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải thông tin sự kiện...</div>
        </div>
      </UserLayout>
    );
  }

  if (!event) {
    return (
      <UserLayout title="Chi tiết sự kiện" sidebarType={sidebarType} activePage="overview-detail" eventId={eventId}>
        <div className="alert alert-danger">Không tìm thấy sự kiện</div>
      </UserLayout>
    );
  }

  const statusConfig = getStatusConfig(event.status);

  return (
    <UserLayout title="Chi tiết sự kiện" sidebarType={sidebarType} activePage="overview-detail" eventId={eventId}>
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
          gap: 2rem;
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

        .hero-meta-item i {
          font-size: 1.1rem;
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
          grid-template-columns: 1fr 380px;
          gap: 2rem;
        }

        .card-modern {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
        }

        .card-modern:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-2px);
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

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label-modern {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.5rem;
        }

        .form-control-modern {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.9375rem;
          transition: all 0.3s ease;
          background: white;
        }

        .form-control-modern:focus {
          outline: none;
          border-color: #ef4444;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .form-control-modern:disabled {
          background: #f8fafc;
          color: #64748b;
          cursor: not-allowed;
        }

        textarea.form-control-modern {
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
        }

        .btn-modern {
          padding: 0.875rem 1.75rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9375rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }

        .btn-primary-modern {
          background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .btn-primary-modern:hover {
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
          transform: translateY(-2px);
        }

        .btn-secondary-modern {
          background: #f1f5f9;
          color: #475569;
        }

        .btn-secondary-modern:hover {
          background: #e2e8f0;
        }

        .btn-success-modern {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .btn-warning-modern {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .btn-danger-modern {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .btn-modern:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
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
          transition: all 0.3s ease;
        }

        .member-card:hover .member-avatar-wrapper {
          border-color: #ef4444;
          transform: scale(1.1);
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

        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-top: 1.5rem;
        }

        .action-buttons .btn-modern {
          flex: 1;
          min-width: 160px;
        }

        .alert-modern {
          padding: 1rem 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9375rem;
        }

        .alert-danger {
          background: #fef2f2;
          border: 2px solid #fecaca;
          color: #991b1b;
        }

        .alert-warning {
          background: #fffbeb;
          border: 2px solid #fde68a;
          color: #92400e;
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

        .join-code-input::placeholder {
          color: rgba(255,255,255,0.7);
        }

        .copy-btn-modern {
          width: 44px;
          height: 44px;
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .copy-btn-modern:hover {
          background: rgba(255,255,255,0.3);
          transform: scale(1.1);
        }

        .image-upload-area {
          border: 2px dashed #cbd5e1;
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          background: #f8fafc;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .image-upload-area:hover {
          border-color: #ef4444;
          background: #f1f5f9;
        }

        .image-preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .image-preview-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
        }

        .image-preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-preview-remove {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 28px;
          height: 28px;
          background: #ef4444;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .modal-card {
          background: white;
          border-radius: 24px;
          padding: 2.5rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 25px 50px rgba(0,0,0,0.3);
          animation: modalSlide 0.3s ease;
        }

        @keyframes modalSlide {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .modal-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .modal-icon.danger {
          background: #fef2f2;
          color: #dc2626;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }

        .modal-body {
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
        }

        .modal-actions .btn-modern {
          flex: 1;
        }

        .otp-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.75rem;
          margin: 1.5rem 0;
        }

        .otp-input {
          aspect-ratio: 1;
          text-align: center;
          font-size: 1.5rem;
          font-weight: 700;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .otp-input:focus {
          outline: none;
          border-color: #ef4444;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .event-hero-title {
            font-size: 2rem;
          }

          .event-detail-wrapper {
            padding: 1rem;
          }
        }

        @media (max-width: 640px) {
          .event-hero {
            height: 240px;
          }

          .event-hero-title {
            font-size: 1.5rem;
          }

          .event-hero-meta {
            gap: 0.75rem;
          }

          .nav-tabs-modern {
            flex-direction: column;
          }

          .action-buttons .btn-modern {
            width: 100%;
          }
        }
      `}</style>

      <div className="event-detail-wrapper">
        {/* Hero Section */}
        <div className="event-hero">
          <img src={getImageSrc(event.image)} alt={event.name} className="event-hero-image" onError={(e) => e.target.src = "/default-events.jpg"} />
          <div className="event-hero-overlay"></div>
          <div className="event-hero-content">
            <h1 className="event-hero-title">{event.name}</h1>
            <div className="event-hero-meta">
              <div className="hero-meta-item">
                <i className="bi bi-people-fill"></i>
                <span>{members.length} Thành viên</span>
              </div>
              <div className="hero-meta-item">
                <i className="bi bi-calendar-event"></i>
                <span>
                  {(() => {
                    if (!event?.eventStartDate || !event?.eventEndDate) return "Chưa có thông tin";
                    const startDate = new Date(event.eventStartDate);
                    const endDate = new Date(event.eventEndDate);
                    const isSameDay = startDate.toDateString() === endDate.toDateString();
                    return isSameDay
                      ? formatDate(event.eventStartDate)
                      : `${formatDate(event.eventStartDate)} - ${formatDate(event.eventEndDate)}`;
                  })()}
                </span>
              </div>
              <div className="hero-meta-item">
                <i className="bi bi-geo-alt-fill"></i>
                <span>{event.location || "Chưa cập nhật"}</span>
              </div>
              <div className="status-badge" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                <i className={`bi bi-${statusConfig.icon}`}></i>
                {statusConfig.text}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs-modern">
          <button className={`tab-button ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
            <i className="bi bi-grid"></i>
            Tổng quan
          </button>
          {!isMember && (
            <button className={`tab-button ${activeTab === "edit" ? "active" : ""}`} onClick={() => setActiveTab("edit")}>
              <i className="bi bi-pencil-square"></i>
              Chỉnh sửa
            </button>
          )}
          {!isMember && (
            <button className={`tab-button ${activeTab === "manage" ? "active" : ""}`} onClick={() => setActiveTab("manage")}>
              <i className="bi bi-sliders"></i>
              Quản lý
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert-modern alert-danger">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        {activeTab === "overview" && (
          <div className="content-grid">
            {/* Main Content */}
            <div>
              {/* Event Details */}
              <div className="card-modern">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-icon">
                      <i className="bi bi-info-circle"></i>
                    </div>
                    Thông tin sự kiện
                  </div>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-icon">
                      <i className="bi bi-card-heading"></i>
                    </div>
                    <div className="info-content">
                      <div className="info-label">Tên sự kiện</div>
                      <div className="info-value">{event.name}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <i className="bi bi-person"></i>
                    </div>
                    <div className="info-content">
                      <div className="info-label">Người tổ chức</div>
                      <div className="info-value">{event.organizerName}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <i className="bi bi-calendar-check"></i>
                    </div>
                    <div className="info-content">
                      <div className="info-label">Thời gian diễn ra</div>
                      <div className="info-value">
                        {event.eventStartDate && event.eventEndDate 
                          ? `${formatDate(event.eventStartDate)} - ${formatDate(event.eventEndDate)}`
                          : "Chưa có thông tin"}
                      </div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <i className="bi bi-geo-alt"></i>
                    </div>
                    <div className="info-content">
                      <div className="info-label">Địa điểm</div>
                      <div className="info-value">{event.location || "Chưa cập nhật"}</div>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">
                      <i className={`bi bi-${statusConfig.icon}`}></i>
                    </div>
                    <div className="info-content">
                      <div className="info-label">Trạng thái</div>
                      <div className="info-value">
                        <span className="status-badge" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                          <i className={`bi bi-${statusConfig.icon}`}></i>
                          {statusConfig.text}
                        </span>
                      </div>
                    </div>
                  </div>
                  {event.description && (
                    <div className="info-item">
                      <div className="info-icon">
                        <i className="bi bi-text-paragraph"></i>
                      </div>
                      <div className="info-content">
                        <div className="info-label">Mô tả</div>
                        <div className="info-value" style={{ fontWeight: 400, lineHeight: 1.6 }}>{event.description}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              {/* Members */}
              <div className="card-modern">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-icon">
                      <i className="bi bi-people"></i>
                    </div>
                    Thành viên ({members.length})
                  </div>
                </div>
                <div className="member-grid">
                  {members.slice(0, 12).map((member, index) => (
                    <div key={index} className="member-card">
                      <div className="member-avatar-wrapper">
                        <img src={member.userId?.avatarUrl || "/website-icon-fix@3x.png"} alt={member.userId?.fullName || "Member"} />
                      </div>
                      <div className="member-name">{member.userId?.fullName || "Member"}</div>
                    </div>
                  ))}
                  {members.length > 12 && (
                    <div className="member-card">
                      <div className="member-avatar-wrapper" style={{ background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontWeight: "700", color: "#ef4444" }}>+{members.length - 12}</span>
                      </div>
                      <div className="member-name">Khác</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Join Code */}
              <div className="join-code-card">
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>
                  <i className="bi bi-link-45deg" style={{ marginRight: "0.5rem" }}></i>
                  Mã mời tham gia
                </h3>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.5rem" }}>Đường dẫn mời</div>
                  <div className="join-code-input-group">
                    <input type="text" className="join-code-input" value={`https://myfevent.vn/e/${event.joinCode}`} readOnly />
                    <button className="copy-btn-modern" onClick={() => copyToClipboard(`https://myfevent.vn/e/${event.joinCode}`)}>
                      <i className="bi bi-copy"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.5rem" }}>Mã tham gia</div>
                  <div className="join-code-input-group">
                    <input type="text" className="join-code-input" value={event.joinCode} readOnly />
                    <button className="copy-btn-modern" onClick={() => copyToClipboard(event.joinCode)}>
                      <i className="bi bi-copy"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Tab */}
        {activeTab === "edit" && !isMember && (
          <div className="content-grid">
            <div>
              <div className="card-modern">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-icon">
                      <i className="bi bi-pencil-square"></i>
                    </div>
                    Chỉnh sửa thông tin
                  </div>
                  {!editing && event?.status !== "completed" && (
                    <button className="btn-modern btn-primary-modern" onClick={() => setEditing(true)}>
                      <i className="bi bi-pencil"></i>
                      Chỉnh sửa
                    </button>
                  )}
                </div>

                {event?.status === "completed" && (
                  <div className="alert-modern alert-warning">
                    <i className="bi bi-info-circle-fill"></i>
                    <span>Sự kiện đã kết thúc, không thể chỉnh sửa.</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label-modern">Tên sự kiện</label>
                  <input type="text" className="form-control-modern" value={editing ? editForm.name : event.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} disabled={!editing} />
                </div>

                <div className="form-group">
                  <label className="form-label-modern">Mô tả</label>
                  <textarea className="form-control-modern" value={editing ? editForm.description : event.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} disabled={!editing} />
                </div>

                <div className="form-group">
                  <label className="form-label-modern">Người tổ chức</label>
                  <input type="text" className="form-control-modern" value={editing ? editForm.organizerName : event.organizerName} onChange={(e) => setEditForm({ ...editForm, organizerName: e.target.value })} disabled={!editing} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label-modern">Ngày bắt đầu</label>
                    <input 
                      type="datetime-local" 
                      className="form-control-modern" 
                      value={editing ? formatDateTimeForInput(editForm.eventStartDate) : formatDateTimeForInput(event.eventStartDate)} 
                      onChange={(e) => {
                        // Convert datetime-local value to ISO string
                        const dateValue = e.target.value ? new Date(e.target.value).toISOString() : "";
                        setEditForm({ ...editForm, eventStartDate: dateValue });
                      }} 
                      disabled={!editing} 
                    />
                    <small style={{ color: "#64748b", fontSize: "0.8125rem", marginTop: "0.25rem", display: "block" }}>
                      Hiển thị: {editing ? (editForm.eventStartDate ? new Date(editForm.eventStartDate).toLocaleString("vi-VN") : "Chưa có") : (event.eventStartDate ? new Date(event.eventStartDate).toLocaleString("vi-VN") : "Chưa có")}
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label-modern">Ngày kết thúc</label>
                    <input 
                      type="datetime-local" 
                      className="form-control-modern" 
                      value={editing ? formatDateTimeForInput(editForm.eventEndDate) : formatDateTimeForInput(event.eventEndDate)} 
                      onChange={(e) => {
                        // Convert datetime-local value to ISO string
                        const dateValue = e.target.value ? new Date(e.target.value).toISOString() : "";
                        setEditForm({ ...editForm, eventEndDate: dateValue });
                      }} 
                      disabled={!editing} 
                    />
                    <small style={{ color: "#64748b", fontSize: "0.8125rem", marginTop: "0.25rem", display: "block" }}>
                      Hiển thị: {editing ? (editForm.eventEndDate ? new Date(editForm.eventEndDate).toLocaleString("vi-VN") : "Chưa có") : (event.eventEndDate ? new Date(event.eventEndDate).toLocaleString("vi-VN") : "Chưa có")}
                    </small>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label-modern">Địa điểm</label>
                  <input type="text" className="form-control-modern" value={editing ? editForm.location : event.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} disabled={!editing} placeholder="Nhập địa điểm tổ chức" />
                </div>

                {editing && (
                  <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                    <button className="btn-modern btn-secondary-modern" onClick={() => {
                      setEditing(false);
                      setError("");
                      setEditForm({
                        name: event.name,
                        description: event.description,
                        organizerName: event.organizerName,
                        eventStartDate: event.eventStartDate,
                        eventEndDate: event.eventEndDate,
                        location: event.location,
                        status: event.status,
                      });
                    }} disabled={submitting} style={{ flex: 1 }}>
                      <i className="bi bi-x"></i>
                      Hủy
                    </button>
                    <button className="btn-modern btn-primary-modern" onClick={handleSave} disabled={submitting} style={{ flex: 1 }}>
                      <i className="bi bi-check"></i>
                      {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Image Upload Sidebar */}
            <div>
              <div className="card-modern">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-icon">
                      <i className="bi bi-image"></i>
                    </div>
                    Hình ảnh
                  </div>
                </div>

                <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", marginBottom: "1rem" }}>
                  <img src={getImageSrc(event.image)} alt={event.name} style={{ width: "100%", height: "200px", objectFit: "cover" }} onError={(e) => e.target.src = "/default-events.jpg"} />
                  {event.image && Array.isArray(event.image) && event.image.length > 1 && (
                    <div style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(0,0,0,0.7)", color: "white", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600" }}>
                      <i className="bi bi-images" style={{ marginRight: "0.5rem" }}></i>
                      {event.image.length} ảnh
                    </div>
                  )}
                  {canEditImages && (
                    <button
                      onClick={() => removeExistingImage(0)}
                      disabled={submitting}
                      style={{
                        position: "absolute",
                        top: "1rem",
                        left: "1rem",
                        width: "40px",
                        height: "40px",
                        background: "#ef4444",
                        border: "none",
                        borderRadius: "10px",
                        color: "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingLeft: "2px",
                      }}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  )}
                </div>

                {canEditImages && (
                  <>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                      <button className={`btn-modern ${imageInputType === "file" ? "btn-primary-modern" : "btn-secondary-modern"}`} onClick={() => setImageInputType("file")} style={{ flex: 1, fontSize: "0.875rem" }}>
                        <i className="bi bi-upload"></i>
                        File
                      </button>
                      <button className={`btn-modern ${imageInputType === "url" ? "btn-primary-modern" : "btn-secondary-modern"}`} onClick={() => setImageInputType("url")} style={{ flex: 1, fontSize: "0.875rem" }}>
                        <i className="bi bi-link-45deg"></i>
                        URL
                      </button>
                    </div>

                    {imageInputType === "file" && (
                      <div className="form-group">
                        <input type="file" className="form-control-modern" accept="image/*" onChange={handleFileUpload} disabled={submitting} />
                        <small style={{ color: "#64748b", fontSize: "0.8125rem", marginTop: "0.5rem", display: "block" }}>
                          JPG, PNG, GIF. Tối đa 5MB
                        </small>
                      </div>
                    )}

                    {imageInputType === "url" && (
                      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                        <input type="url" className="form-control-modern" placeholder="Nhập URL hình ảnh" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={submitting} />
                        <button className="btn-modern btn-primary-modern" onClick={handleUrlAdd} disabled={submitting || !imageUrl.trim()} style={{ minWidth: "50px", padding: "0" }}>
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                    )}

                    {imagePreviews.length > 0 && (
                      <>
                        <div className="image-preview-grid">
                          {imagePreviews.map((img, index) => (
                            <div key={index} className="image-preview-item">
                              <img src={img} alt={`Preview ${index + 1}`} onError={(e) => e.target.src = "/default-events.jpg"} />
                              <button className="image-preview-remove" onClick={() => removeImage(index)} disabled={submitting}>
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                          <button className="btn-modern btn-primary-modern" onClick={handleImageUpload} disabled={submitting} style={{ flex: 1 }}>
                            {submitting ? "Đang tải..." : "Tải lên"}
                          </button>
                          <button className="btn-modern btn-secondary-modern" onClick={() => {
                            setImageFiles([]);
                            setImagePreviews([]);
                            setImageUrl("");
                            setError("");
                          }} disabled={submitting} style={{ flex: 1 }}>
                            Hủy
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === "manage" && !isMember && (
          <div className="content-grid">
            <div>
              <div className="card-modern">
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-icon">
                      <i className="bi bi-sliders"></i>
                    </div>
                    Quản lý sự kiện
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="btn-modern btn-success-modern" onClick={handleChangeType} disabled={(event.type === "public" && event.status === "cancelled") || event.status === "completed"}>
                    <i className="bi bi-eye"></i>
                    Công khai sự kiện
                  </button>
                  <button className="btn-modern btn-warning-modern" onClick={handleCancelEvent} disabled={event.status === "completed" || event.status === "cancelled"}>
                    <i className="bi bi-x-octagon"></i>
                    Hủy sự kiện
                  </button>
                  <button className="btn-modern btn-danger-modern" onClick={handleDelete}>
                    <i className="bi bi-trash"></i>
                    Xóa sự kiện
                  </button>
                </div>

                <div className="alert-modern alert-warning" style={{ marginTop: "1.5rem" }}>
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>Các hành động này sẽ ảnh hưởng tới toàn bộ sự kiện và không thể hoàn tác.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal show={confirmModal.show} onClose={handleCloseConfirm} onConfirm={handleConfirm} message={confirmModal.message} />
      <ConfirmModal show={secondConfirm} onClose={() => setSecondConfirm(false)} onConfirm={onSecondDeleteConfirm} message={<span style={{ color: "red" }}><b>XÁC NHẬN QUAN TRỌNG:</b><br/>Thao tác này sẽ xóa vĩnh viễn toàn bộ dữ liệu, KHÔNG THỂ KHÔI PHỤC.<br/>Bạn chắc chắn muốn thực hiện?</span>} />

      {/* Password Modal */}
      {passwordModal && !isGoogleUser && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-icon danger">
                <i className="bi bi-shield-lock-fill"></i>
              </div>
              <div>
                <div className="modal-title">Xác nhận xóa</div>
              </div>
            </div>
            <div className="modal-body">
              Nhập mật khẩu tài khoản để xác nhận xoá.<br/>
              <span style={{ color: "#dc2626", fontWeight: "600" }}>Lưu ý: Hành động xóa KHÔNG THỂ KHÔI PHỤC</span>
            </div>
            <input type="password" className="form-control-modern" value={password} placeholder="Nhập mật khẩu" onChange={(e) => setPassword(e.target.value)} autoFocus style={{ marginBottom: "1rem" }} />
            {passwordError && <div className="alert-modern alert-danger">{passwordError}</div>}
            <div className="modal-actions">
              <button className="btn-modern btn-secondary-modern" onClick={() => setPasswordModal(false)}>Hủy</button>
              <button className="btn-modern btn-danger-modern" onClick={handleCheckPasswordAndDelete}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {otpModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-icon danger">
                <i className="bi bi-shield-check-fill"></i>
              </div>
              <div>
                <div className="modal-title">Xác nhận OTP</div>
              </div>
            </div>
            <div className="modal-body">
              {otpSent ? (
                <>Chúng tôi đã gửi mã xác nhận tới email <strong>{user.email}</strong>. Nhập mã gồm 6 số:</>
              ) : (
                <>Nhấn "Gửi mã" để nhận mã xác nhận qua email <strong>{user.email}</strong>.</>
              )}
            </div>

            {otpMsg && <div className="alert-modern" style={{ background: "#f0fdf4", border: "2px solid #bbf7d0", color: "#166534" }}>{otpMsg}</div>}
            {otpError && <div className="alert-modern alert-danger">{otpError}</div>}

            {otpSent ? (
              <>
                <div className="otp-grid">
                  {otp.map((digit, idx) => (
                    <input key={idx} id={`otp-${idx}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(idx, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(idx, e)} className="otp-input" disabled={otpLoading} />
                  ))}
                </div>
                <div className="modal-actions">
                  <button className="btn-modern btn-secondary-modern" disabled={otpLoading} onClick={() => setOtpModal(false)}>Hủy</button>
                  <button className="btn-modern btn-danger-modern" disabled={otpLoading} onClick={verifyOtpAndDelete}>{otpLoading ? "Đang xác nhận..." : "Xác nhận"}</button>
                </div>
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <small style={{ color: "#64748b" }}>Không nhận được mã? <button onClick={sendOtp} disabled={otpLoading} style={{ background: "none", border: "none", color: "#ef4444", textDecoration: "underline", cursor: "pointer" }}>Gửi lại</button></small>
                </div>
              </>
            ) : (
              <div className="modal-actions">
                <button className="btn-modern btn-secondary-modern" onClick={() => setOtpModal(false)} disabled={otpLoading}>Hủy</button>
                <button className="btn-modern btn-danger-modern" onClick={sendOtp} disabled={otpLoading}>{otpLoading ? "Đang gửi..." : "Gửi mã"}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {validationModal.show && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-icon danger">
                <i className="bi bi-exclamation-triangle-fill"></i>
              </div>
              <div>
                <div className="modal-title">Không thể công khai</div>
              </div>
            </div>
            <div className="modal-body">
              Để công khai sự kiện, vui lòng cập nhật đầy đủ các thông tin sau:
              <ul style={{ paddingLeft: "1.5rem", marginTop: "1rem", marginBottom: 0 }}>
                {validationModal.missingFields.map((field, index) => (
                  <li key={index} style={{ color: "#dc2626", marginBottom: "0.5rem" }}>
                    <span style={{ color: "#0f172a" }}>{field}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-actions">
              <button className="btn-modern btn-secondary-modern" onClick={() => setValidationModal({ show: false, missingFields: [] })}>Đóng</button>
              <button className="btn-modern btn-primary-modern" onClick={() => {
                setValidationModal({ show: false, missingFields: [] });
                setActiveTab("edit");
                setEditing(true);
              }}>
                <i className="bi bi-pencil"></i>
                Cập nhật ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}