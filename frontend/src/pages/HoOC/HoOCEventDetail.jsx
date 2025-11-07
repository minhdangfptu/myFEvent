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

export default function HoOCEventDetail() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchEventRole, getEventRole } = useEvents();
  const [activeTab, setActiveTab] = useState("info");
  const [event, setEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [eventRole, setEventRole] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    organizerName: "",
    eventStartDate: "",
    eventEndDate: "",
    location: "",
    status: "",
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageInputType, setImageInputType] = useState("file"); // "url" hoặc "file"
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
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
  const isGoogleUser = user?.authProvider === "google";
  const [showGoogleDeleteWarning, setShowGoogleDeleteWarning] = useState(false);
  const [validationModal, setValidationModal] = useState({
    show: false,
    missingFields: [],
  });

  // Bộ xử lý xác nhận (chung)
  const handleOpenConfirm = (action, message) => {
    setConfirmModal({ show: true, action, message });
  };
  const handleCloseConfirm = () =>
    setConfirmModal({ show: false, action: null, message: "" });
  const handleConfirm = async () => {
    if (confirmModal.action) await confirmModal.action();
    setConfirmModal({ show: false, action: null, message: "" });
  };

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

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError("");

      // Validate required fields
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
    handleOpenConfirm(async () => {
      try {
        await eventApi.updateEvent(eventId, {
          status: "cancelled",
        });
        await fetchEventDetails();
        toast.success("Đã hủy thành công!");
      } catch (error) {
        console.error("Update event error:", error);
        setError(error.response?.data?.message || "Hủy sự kiện thất bại");
      } finally {
        setSubmitting(false);
      }
    }, "Bạn có chắc chắn muốn hủy sự kiện này? Hành động này sẽ chuyển trạng thái sự kiện về 'Đã hủy'.");
  };

  // Validate event data trước khi public
  const validateEventDataForPublic = (eventData) => {
    const missingFields = [];

    if (!eventData.name || !eventData.name.trim()) {
      missingFields.push("Tên sự kiện");
    }
    if (!eventData.description || !eventData.description.trim()) {
      missingFields.push("Mô tả");
    }
    if (!eventData.organizerName || !eventData.organizerName.trim()) {
      missingFields.push("Người tổ chức");
    }
    if (!eventData.eventStartDate) {
      missingFields.push("Ngày bắt đầu");
    }
    if (!eventData.eventEndDate) {
      missingFields.push("Ngày kết thúc");
    }
    if (!eventData.location || !eventData.location.trim()) {
      missingFields.push("Địa điểm");
    }
    if (
      !eventData.image ||
      !Array.isArray(eventData.image) ||
      eventData.image.length === 0
    ) {
      missingFields.push("Hình ảnh sự kiện");
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  };

  //Change event type
  const handleChangeType = async () => {
    // Kiểm tra dữ liệu trước khi public
    if (!event) return;

    const validation = validateEventDataForPublic(event);
    if (!validation.isValid) {
      setValidationModal({
        show: true,
        missingFields: validation.missingFields,
      });
      return;
    }

    handleOpenConfirm(async () => {
      try {
        await eventApi.updateEvent(eventId, { type: "public" });
        toast.success("Thay đổi trạng thái thành công!");
        await fetchEventDetails();
      } catch (error) {
        console.error("Change type error:", error);
        // Nếu backend cũng trả về missingFields, hiển thị modal
        if (error.response?.data?.missingFields) {
          setValidationModal({
            show: true,
            missingFields: error.response.data.missingFields,
          });
        } else {
          toast.error(
            error.response?.data?.message || "Thay đổi trạng thái thất bại"
          );
        }
      }
    }, `Bạn có chắc chắn muốn thay đổi trạng thái công khai sự kiện này? \n Khi bạn thay đổi trạng thái sự kiện, thông tin sự kiện sẽ được công khai cho tất cả mọi người. \nHành động này không thể hoàn tác.`);
  };

  // Delete event (xoá 2 bước)
  const handleDelete = async () => {
    handleOpenConfirm(async () => {
      setSecondConfirm(true); // Sau xác nhận đầu, mở modal xác nhận thứ 2
    }, "Bạn có chắc chắn muốn xóa sự kiện này? Khi bạn xóa sự kiện, mọi dữ liệu về Ban tổ chức và thành viên sẽ bị xóa vĩnh viễn và không thể khôi phục. Hành động này không thể hoàn tác.");
  };

  // Hàm gọi api xóa thật sự
  const doDeleteEvent = async () => {
    try {
      await eventApi.deleteEvent(eventId);
      toast.success("Xoá sự kiện thành công!");
      window.location.replace(
        "/home-page",
        {
          replace: true,
          state: {
            toast: { type: "success", message: "Xoá sự kiện thành công!" },
          },
        },
        window.location.reload()
      );
    } catch (error) {
      setError("Xóa sự kiện thất bại");
    } finally {
      setSecondConfirm(false);
    }
  };

  // sau khi xác nhận lần hai, mở modal nhập mật khẩu
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

  // xác thực mật khẩu rồi gọi api xoá nếu ok
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
      setPasswordError(
        err.response?.data?.message || "Mật khẩu không đúng, vui lòng thử lại!"
      );
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.info("Đã sao chép!");
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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file hình ảnh hợp lệ");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Kích thước file không được vượt quá 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setImageFiles((prev) => [...prev, file]);
      setImagePreviews((prev) => [...prev, base64]);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlAdd = () => {
    if (!imageUrl.trim()) {
      setError("Vui lòng nhập URL hình ảnh");
      return;
    }

    // Validate URL
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

  //delete image
  const removeExistingImage = async (index) => {
    handleOpenConfirm(async () => {
      try {
        setSubmitting(true);
        setError("");
        const updatedImages = event.image.filter((_, i) => i !== index);
        await eventApi.replaceEventImages(eventId, updatedImages);
        await fetchEventDetails();
        toast.success("Xóa ảnh thành công!");
      } catch (error) {
        console.error("Remove image error:", error);
        setError("Xóa ảnh thất bại");
      } finally {
        setSubmitting(false);
      }
    }, "Bạn có chắc chắn muốn xóa ảnh này?");
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

      // Convert files to base64
      const base64Images = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const base64 = await convertToBase64(imageFiles[i]);
        base64Images.push(base64);
      }

      // Add URL images
      const urlImages = imagePreviews.filter((_, i) => i >= imageFiles.length);
      const allImages = [...base64Images, ...urlImages];

      // replace all images
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

  const sendOtp = async () => {
    setOtpLoading(true);
    setOtpError("");
    setOtpMsg("");
    try {
      await userApi.sendDeleteOtp(user.email);
      setOtpSent(true);
      setOtpMsg("Đã gửi mã xác nhận, vui lòng kiểm tra email và nhập mã OTP.");
    } catch (err) {
      setOtpError(
        err.response?.data?.message || "Không thể gửi mã xác nhận. Hãy thử lại!"
      );
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
      setOtpError(
        err.response?.data?.message || "Sai mã xác nhận, vui lòng thử lại!"
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      // Auto-focus
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const sidebarType =
    eventRole === "Member" ? "member" : eventRole === "HoD" ? "hod" : "hooc";
  const isMember = eventRole === "Member";
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

  const canEditImages = event.status !== "completed" && event.status !== "cancelled";

  return (
    <UserLayout
      title="Chi tiết sự kiện"
      sidebarType={sidebarType}
      activePage="overview-detail"
      eventId={eventId}
    >
      <style>{`
        .event-header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; }
        .event-title { font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; }
        .event-stats { display: flex; gap: 1rem; flex-wrap: wrap; }
        .stat-item { background: rgba(255,255,255,0.2); padding: 0.75rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; }
        .tab-nav { border-bottom: 2px solid #e5e7eb; margin-bottom: 2rem; }
        .tab-btn { border: none; background: none; padding: 1rem 2rem; font-weight: 600; color: #6b7280; border-bottom: 3px solid transparent; }
        .tab-btn.active { color: #dc2626; border-bottom-color: #dc2626; }
        .info-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
        .info-card h5 { color: #374151; margin-bottom: 1rem; font-weight: 600; }
        .form-control { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.75rem; }
        .form-control:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
        .btn-danger { background: #dc2626; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; }
        .btn-danger:hover { background: #b91c1c; }
        .btn-outline-danger { border: 1px solid #dc2626; color: #dc2626; padding: 0.75rem 1.5rem; border-radius: 8px; }
        .btn-outline-danger:hover { background: #dc2626; color: white; }
        .member-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
        .copy-btn { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem; cursor: pointer; }
        .copy-btn:hover { background: #e5e7eb; }
        .event-image-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
        .event-image { width: 100%; height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem; }
        .event-image-placeholder { width: 100%; height: 200px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6b7280; margin-bottom: 1rem; }
        .image-actions { display: flex; gap: 0.5rem; }
        .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.875rem; }
        .event-chip {
          border-radius:999px; font-size:12px; padding:6px 10px;
          display:inline-flex; align-items:center; gap:6px;
        }
        .chip-date { background:#eff6ff !important; color:#2563eb !important; border:1px solid #bae6fd; }
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
            <i className="bi bi-person-plus"></i>
            <span>1 thành viên mới hôm nay</span>
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
        {!isMember && (
          <button
            className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Cài đặt
          </button>
        )}
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
                    {/* Nút xóa ảnh */}

                    <div className="position-absolute top-0 start-0 m-2">
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (
                            window.confirm("Bạn có chắc chắn muốn xóa ảnh này?")
                          ) {
                            removeExistingImage(0);
                          }
                        }}
                        disabled={submitting}
                        title="Xóa ảnh"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
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

                <div className="image-actions">
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
              </div>
              <div className="mb-3">
                <strong>Tên sự kiện:</strong> {event.name}
              </div>
              <div className="mb-3">
                <strong>Người tổ chức:</strong> {event.organizerName}
              </div>
              <div className="mb-3">
                <strong>Ngày diễn ra:</strong>
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
                <strong>Địa điểm:</strong> {event.location || "Chưa cập nhật"}
              </div>
              <div className="mb-3">
                <strong>Trạng thái:</strong>
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
                <strong>Mô tả:</strong>
                <p className="mt-2">{event.description || "Chưa có mô tả"}</p>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="info-card">
              <h5>Thành viên ({members.length})</h5>
              <div className="d-flex flex-wrap gap-2">
                {members.slice(0, 10).map((member, index) => (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div
                      key={index}
                      className="member-avatar"
                      title={member.userId?.fullName || "Thành viên"}
                    >
                      <img
                        src={
                          member.userId?.avatarUrl || "/website-icon-fix@3x.png"
                        }
                        className="rounded-circle"
                        style={{ width: 40, height: 40 }}
                      />
                    </div>
                    <p>{member.userId?.fullName || "Thành viên"}</p>
                  </div>
                ))}
                {members.length > 10 && (
                  <div className="member-avatar">
                    <span className="small">+{members.length - 10}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="row">
          <div className="col-lg-8">
            {/* Event Details */}
            <div className="info-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-1">Chi tiết sự kiện</h5>
                  {event?.status === "completed" && (
                    <p className="text-danger small mb-0">
                      Sự kiện đã kết thúc, không thể chỉnh sửa thông tin.
                    </p>
                  )}
                </div>
                {!editing && !isMember && (
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setEditing(true)}
                    disabled={event?.status === "completed"}
                    title={
                      event?.status === "completed"
                        ? "Sự kiện đã kết thúc - không thể chỉnh sửa"
                        : undefined
                    }
                  >
                    <i className="bi bi-pencil me-1"></i>Chỉnh sửa
                  </button>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Tên sự kiện</label>
                <input
                  type="text"
                  className="form-control"
                  value={editing ? editForm.name : event.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  disabled={!editing}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Mô tả</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={editing ? editForm.description : event.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  disabled={!editing}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Người tổ chức</label>
                <input
                  type="text"
                  className="form-control"
                  value={editing ? editForm.organizerName : event.organizerName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, organizerName: e.target.value })
                  }
                  disabled={!editing}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Ngày bắt đầu</label>
                <input
                  type="date"
                  className="form-control"
                  value={
                    editing
                      ? formatDateForInput(editForm.eventStartDate)
                      : formatDateForInput(event.eventStartDate)
                  }
                  onChange={(e) =>
                    setEditForm({ ...editForm, eventStartDate: e.target.value })
                  }
                  disabled={!editing}
                />
                <div className="form-text mt-1">
                  Hiển thị dạng dd-mm-yyyy:{" "}
                  {toDMY(
                    editing ? editForm.eventStartDate : event.eventStartDate
                  ) || "Chưa có thông tin"}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Ngày kết thúc</label>
                <input
                  type="date"
                  className="form-control"
                  value={
                    editing
                      ? formatDateForInput(editForm.eventEndDate)
                      : formatDateForInput(event.eventEndDate)
                  }
                  onChange={(e) =>
                    setEditForm({ ...editForm, eventEndDate: e.target.value })
                  }
                  disabled={!editing}
                />
                <div className="form-text mt-1">
                  Hiển thị dạng dd-mm-yyyy:{" "}
                  {toDMY(
                    editing ? editForm.eventEndDate : event.eventEndDate
                  ) || "Chưa có thông tin"}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Địa điểm</label>
                <input
                  type="text"
                  className="form-control"
                  value={editing ? editForm.location : event.location}
                  onChange={(e) =>
                    setEditForm({ ...editForm, location: e.target.value })
                  }
                  disabled={!editing}
                  placeholder="Nhập địa điểm tổ chức sự kiện"
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Trạng thái:{" "}
                  {event.status === "scheduled"
                    ? "Sắp diễn ra"
                    : event.status === "ongoing"
                    ? "Đang diễn ra"
                    : event.status === "completed"
                    ? "Đã kết thúc"
                    : "Đã hủy"}
                </label>
              </div>
              {editing && (
                <div>
                  <div className="alert alert-warning mb-3">
                    <i className="bi bi-info-circle me-2"></i>
                    Bạn đang ở chế độ chỉnh sửa. Sử dụng nút "Lưu thay đổi" hoặc
                    "Hủy" ở dưới form để hoàn tất.
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => {
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
                      }}
                      disabled={submitting}
                    >
                      <i className="bi bi-x me-1"></i>Hủy
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={submitting}
                    >
                      <i className="bi bi-check me-1"></i>
                      {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Event Actions */}
            {!isMember && (
              <div className="info-card">
                <h5>Hành động sự kiện</h5>
                <div className="d-flex gap-2 flex-wrap">
                  {(event.type === "public" && event.status === "cancelled") ||
                  event.status === "completed" ? (
                    <button
                      disabled
                      className="btn btn-outline-success"
                      onClick={handleChangeType}
                    >
                      <i className="bi bi-eye me-2"></i>Công khai sự kiện
                    </button>
                  ) : (
                    <button
                      className="btn btn-outline-success"
                      onClick={handleChangeType}
                    >
                      <i className="bi bi-eye me-2"></i>Công khai sự kiện
                    </button>
                  )}
                  {event.status === "completed"  || event.status === "cancelled" ? (
                    <button
                      disabled
                      className="btn btn-outline-warning"
                      onClick={handleCancelEvent}
                    >
                      <i className="bi bi-x-octagon me-2"></i>Hủy sự kiện
                    </button>
                  ) : (
                    <button
                      className="btn btn-outline-warning"
                      onClick={handleCancelEvent}
                    >
                      <i className="bi bi-x-octagon me-2"></i>Hủy sự kiện
                    </button>
                  )}

                  <button
                    className="btn btn-outline-danger"
                    onClick={handleDelete}
                  >
                    <i className="bi bi-trash me-2"></i>Xóa sự kiện
                  </button>
                </div>
                <p className="text-muted small mt-3 mb-0">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  LƯU Ý: Các hành động này sẽ ảnh hưởng tới sự kiện cũng như
                  toàn bộ thành viên và không thể hoàn tác.
                </p>
              </div>
            )}
          </div>
          <div className="col-lg-4">
            {/* Join Code */}
            <div className="info-card">
              <h5>Mã mời tham gia</h5>
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
                  />
                  <button
                    className="copy-btn"
                    onClick={() =>
                      copyToClipboard(`https://myfevent.vn/e/${event.joinCode}`)
                    }
                  >
                    <i className="bi bi-copy"></i>
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Mã tham gia</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={event.joinCode}
                    readOnly
                  />
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(event.joinCode)}
                  >
                    <i className="bi bi-copy"></i>
                  </button>
                </div>
              </div>
            </div>
            {/* Event Image Upload */}
            <div className="info-card">
              <h5>Hình ảnh sự kiện</h5>
              <div>
                {/* Hiển thị ảnh đầu tiên nếu có array */}
                {event.image &&
                Array.isArray(event.image) &&
                event.image.length > 0 ? (
                  <div className="position-relative">
                    <img
                      style={{ height: "180px", width: "100%" }}
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
                    {/* Nút xóa ảnh: chỉ hiển thị khi có quyền chỉnh sửa ảnh */}
                    {canEditImages && (
                      <div className="position-absolute top-0 start-0 m-2">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            if (
                              window.confirm("Bạn có chắc chắn muốn xóa ảnh này?")
                            ) {
                              removeExistingImage(0);
                            }
                          }}
                          disabled={submitting}
                          title="Xóa ảnh"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
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
                {/* Toàn bộ control dưới chỉ hiển thị nếu event chưa complete/hủy */}
                {canEditImages && (
                  <>
                    <div className="mb-2">
                      <label className="form-label fw-semibold">Tải lên hình ảnh mới</label>
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
                          disabled={submitting}
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
                          disabled={submitting}
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
                            className="form-control"
                            placeholder="Nhập URL hình ảnh..."
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            disabled={submitting}
                          />
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={handleUrlAdd}
                            disabled={submitting || !imageUrl.trim()}
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
                            className="form-control"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={submitting}
                          />
                          <small className="text-muted">
                            Chấp nhận: JPG, PNG, GIF. Kích thước tối đa: 5MB
                          </small>
                        </div>
                      )}
                      {/* Image Preview */}
                      {imagePreviews.length > 0 && (
                        <div className="mt-3">
                          <label className="form-label fw-semibold">
                            Hình ảnh đã chọn:
                          </label>
                          <div className="row g-2">
                            {imagePreviews.map((img, index) => (
                              <div key={index} className="col-md-3">
                                <div className="position-relative">
                                  <img
                                    src={img}
                                    alt={`Preview ${index + 1}`}
                                    className="img-fluid rounded"
                                    style={{
                                      width: "100%",
                                      height: "105px",
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
                                    disabled={submitting}
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
                      {imagePreviews.length > 0 && (
                        <div className="d-flex gap-2 mt-3">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={handleImageUpload}
                            disabled={submitting}
                          >
                            {submitting ? "Đang tải lên..." : "Tải lên ảnh"}
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                              setImageFiles([]);
                              setImagePreviews([]);
                              setImageUrl("");
                              setError("");
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* thể hiện modal xác nhận chung */}
      <ConfirmModal
        show={confirmModal.show}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirm}
        message={confirmModal.message}
      />
      {/* Modal xác nhận bước 2 */}
      <ConfirmModal
        show={secondConfirm}
        onClose={() => setSecondConfirm(false)}
        onConfirm={onSecondDeleteConfirm}
        message={
          <span style={{ color: "red" }}>
            <b>XÁC NHẬN QUAN TRỌNG:</b>
            <br /> Thao tác này sẽ xóa vĩnh viễn toàn bộ dữ liệu, KHÔNG THỂ KHÔI
            PHỤC.
            <br />
            Bạn chắc chắn muốn thực hiện?
          </span>
        }
      />
      {/* Modal cảnh báo user google không xoá được, chuyển tới cài đặt */}
      {showGoogleDeleteWarning && (
        <div
          style={{
            position: "fixed",
            zIndex: 3200,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 10,
              width: 420,
              padding: 24,
            }}
          >
            <div className="mb-3 text-danger">
              <b>Bạn đang đăng nhập bằng Google.</b>
              <br /> Để xoá sự kiện vui lòng thiết lập mật khẩu cho tài khoản
              trong phần <b>Cài đặt</b>.<br />
              <span className="text-muted">
                (Vào "Hồ sơ" hoặc "Cài đặt tài khoản", đổi hoặc đặt mật khẩu
                mới. Sau khi đặt mật khẩu xong, hãy thực hiện lại thao tác xoá
                sự kiện này.)
              </span>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-2">
              <button
                className="btn btn-secondary"
                onClick={() => setShowGoogleDeleteWarning(false)}
              >
                Đóng
              </button>
              <a href="/setting" className="btn btn-primary">
                Đi tới cài đặt
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Modal nhập mật khẩu xác nhận xoá như cũ */}
      {passwordModal && !isGoogleUser && (
        <div
          style={{
            position: "fixed",
            zIndex: 3100,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 10,
              width: 420,
              padding: 24,
            }}
          >
            <div className="mb-3">
              Nhập mật khẩu tài khoản để xác nhận xoá.<br></br>
              <span style={{ color: "red" }}>
                <b>Lưu ý, hành động xóa KHÔNG THỂ KHÔI PHỤC</b>
              </span>
              :
            </div>
            <input
              type="password"
              className="form-control mb-2"
              value={password}
              placeholder="Mật khẩu"
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              disabled={false}
            />
            {passwordError && (
              <div className="text-danger small mb-2">{passwordError}</div>
            )}
            <div className="d-flex justify-content-end gap-2 mt-2">
              <button
                className="btn btn-secondary"
                onClick={() => setPasswordModal(false)}
              >
                Huỷ
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCheckPasswordAndDelete}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal OTP xác nhận xóa cho user Google */}
      {otpModal && (
        <div
          style={{
            position: "fixed",
            zIndex: 3200,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 10,
              width: 420,
              padding: 24,
            }}
          >
            <div className="mb-3 text-danger">
              <b>Xác nhận xoá sự kiện bằng mã OTP</b>
            </div>
            <div className="mb-2">
              {otpSent ? (
                <>
                  Chúng tôi đã gửi mã xác nhận tới email Google{" "}
                  <b>{user.email}</b>. Nhập mã gồm 6 số:
                </>
              ) : (
                <>
                  Nhấn "Gửi mã" để nhận mã xác nhận qua email Google{" "}
                  <b>{user.email}</b> trước khi xoá sự kiện này.
                </>
              )}
            </div>
            {otpMsg && (
              <div className="alert alert-success p-2 mb-2">{otpMsg}</div>
            )}
            {otpError && (
              <div className="alert alert-danger p-2 mb-2">{otpError}</div>
            )}
            {otpSent ? (
              <>
                <div className="d-flex gap-2 justify-content-between mb-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="form-control text-center fw-semibold"
                      style={{ width: 48, height: 48, fontSize: "1.2rem" }}
                      disabled={otpLoading}
                    />
                  ))}
                </div>
                <div className="d-flex gap-2 justify-content-between mb-2">
                  <button
                    className="btn btn-light flex-fill"
                    disabled={otpLoading}
                    onClick={() => {
                      setOtpModal(false);
                      setOtpError("");
                    }}
                  >
                    Huỷ
                  </button>
                  <button
                    className="btn btn-danger flex-fill"
                    disabled={otpLoading}
                    onClick={verifyOtpAndDelete}
                  >
                    {otpLoading ? "Đang xác nhận..." : "Xác nhận xoá"}
                  </button>
                </div>
                <div className="text-secondary small mt-2">
                  Không nhận được mã? &nbsp;
                  <button
                    className="btn btn-link p-0 align-baseline"
                    style={{ color: "#ef4444" }}
                    disabled={otpLoading}
                    onClick={sendOtp}
                  >
                    Gửi lại mã xác nhận
                  </button>
                </div>
              </>
            ) : (
              <div className="d-flex gap-2 justify-content-end mt-3">
                <button
                  className="btn btn-light"
                  onClick={() => setOtpModal(false)}
                  disabled={otpLoading}
                >
                  Huỷ
                </button>
                <button
                  className="btn btn-danger"
                  onClick={sendOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? "Đang gửi mã..." : "Gửi mã"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal yêu cầu cập nhật đầy đủ dữ liệu */}
      {validationModal.show && (
        <div
          style={{
            position: "fixed",
            zIndex: 3200,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 10,
              width: 500,
              padding: 24,
              maxWidth: "90vw",
            }}
          >
            <div className="mb-3">
              <h5 className="text-danger fw-bold mb-2">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Không thể công khai sự kiện
              </h5>
              <p className="mb-3">
                Để công khai sự kiện, vui lòng cập nhật đầy đủ các thông tin
                sau:
              </p>
              <ul className="list-group">
                {validationModal.missingFields.map((field, index) => (
                  <li
                    key={index}
                    className="list-group-item d-flex align-items-center"
                  >
                    <i className="bi bi-x-circle text-danger me-2"></i>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                className="btn btn-secondary"
                onClick={() =>
                  setValidationModal({ show: false, missingFields: [] })
                }
              >
                Đóng
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setValidationModal({ show: false, missingFields: [] });
                  setActiveTab("settings");
                  setEditing(true);
                }}
              >
                <i className="bi bi-pencil me-1"></i>
                Cập nhật ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}

