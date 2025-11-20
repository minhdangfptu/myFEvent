import { useEffect, useState } from "react";
import { Ban } from 'lucide-react';
import adminService from "~/services/adminService";
import { toast } from "react-toastify";

export default function BanEventModal({ isOpen, onClose, eventData, onBanSuccess }) {
  const [reason, setReason] = useState("");
  
  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleBan = async () => {
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do cấm!");
      return;
    }
    try {
      const response = await adminService.banEvent(eventData.eventId, reason);
      if (onBanSuccess) {
        onBanSuccess();
      }
      onClose(); // THÊM DÒNG NÀY
    } catch (error) {
      console.error("Error banning event:", error);
      toast.error("Có lỗi xảy ra khi cấm sự kiện");
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          borderRadius: "12px",
          padding: "24px",
          width: "90%",
          maxWidth: "460px",
          zIndex: 9999,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(e) => e.stopPropagation()} // THÊM DÒNG NÀY
      >
        {/* Header with Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#FEE2E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Ban style={{ width: "20px", height: "20px", color: "#DC2626" }} />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "600",
              color: "#212121",
            }}
          >
            Cấm sự kiện
          </h2>
        </div>

        {/* Description */}
        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: "14px",
            color: "#757575",
            lineHeight: "1.5",
          }}
        >
          Sau khi bị cấm, sự kiện này sẽ không còn hiển thị với người dùng công khai.
        </p>

        {/* Event Info Section */}
        <div
          style={{
            marginBottom: "20px",
            background: "#F9FAFB",
            padding: "16px",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{
              margin: "0 0 12px 0",
              fontSize: "14px",
              fontWeight: "600",
              color: "#212121",
            }}
          >
            Thông tin sự kiện
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "13px", color: "#757575", marginBottom: "4px" }}>
                Tên sự kiện
              </div>
              <div style={{ fontSize: "14px", color: "#212121", fontWeight: "500" }}>
                {eventData?.name || "FPT Coding Week 2025"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "13px", color: "#757575", marginBottom: "4px" }}>
                Trưởng Ban tổ chức
              </div>
              <div style={{ fontSize: "14px", color: "#212121", fontWeight: "500" }}>
                {eventData?.hooc || "Nguyễn Văn An"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "13px", color: "#757575", marginBottom: "4px" }}>
                Ngày diễn ra
              </div>
              <div style={{ fontSize: "14px", color: "#212121", fontWeight: "500" }}>
                {eventData?.date || "15/03/2025 - 22/03/2025"}
              </div>
            </div>
          </div>
        </div>

        {/* Reason Input */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#212121",
              marginBottom: "8px",
            }}
          >
            Lý do cấm <span style={{ color: "#9CA3AF" }}>(bắt buộc)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Sự kiện vi phạm quy định đăng nội dung không phù hợp."
            style={{
              width: "100%",
              minHeight: "100px",
              padding: "12px",
              border: "1px solid #E0E0E0",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#212121",
              resize: "vertical",
              fontFamily: "inherit",
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#2196F3";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#E0E0E0";
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              border: "1px solid #E0E0E0",
              background: "white",
              color: "#424242",
              padding: "12px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#F5F5F5";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
            }}
          >
            Huỷ
          </button>
          <button
            onClick={handleBan}
            style={{
              flex: 1,
              border: "none",
              background: "#DC2626",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#B91C1C";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#DC2626";
            }}
          >
            Xác nhận cấm
          </button>
        </div>
      </div>
    </>
  );
}