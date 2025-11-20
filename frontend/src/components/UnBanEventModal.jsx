import { useEffect, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import adminService from "~/services/adminService";
import { toast } from "react-toastify";

export default function UnbanEventModal({ isOpen, onClose, eventData, onUnbanSuccess }) {

  useEffect(() => { }, [isOpen]);
  if (!isOpen) return null;

  const handleUnban = async () => {
    try {
      await adminService.unbanEvent(eventData.eventId);
      if (onUnbanSuccess) {
        onUnbanSuccess();
      }
      onClose();
    } catch (error) {
      console.error("Error unbanning event:", error);
      toast.error("Có lỗi xảy ra khi gỡ cấm sự kiện");
    }
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
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          borderRadius: "8px",
          padding: "20px",
          width: "90%",
          maxWidth: "400px",
          zIndex: 9999,
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              fontFamily: "inherit",
            }}
          >
            Gỡ cấm sự kiện
          </h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "20px",
              color: "#9ca3af",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "inherit",
            }}
          >
            ×
          </button>
        </div>

        {/* Description */}
        <p
          style={{
            margin: "0 0 16px 0",
            fontSize: "13px",
            color: "#6b7280",
            lineHeight: "1.5",
            fontFamily: "inherit",
          }}
        >
          Sự kiện sẽ được hiển thị trở lại với người dùng công khai.
        </p>

        {/* Event Info Box */}
        <div
          style={{
            background: "#eff6ff",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px", fontFamily: "inherit" }}>
              Tên sự kiện:
            </div>
            <div style={{ fontSize: "13px", color: "#111827", fontWeight: "400", fontFamily: "inherit" }}>
              {eventData?.name || "Festival Âm nhạc Mùa hè"}
            </div>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px", fontFamily: "inherit" }}>
              TBTC:
            </div>
            <div style={{ fontSize: "13px", color: "#111827", fontWeight: "400", fontFamily: "inherit" }}>
              {eventData?.hooc || "Trần Văn Minh"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px", fontFamily: "inherit" }}>
              Ngày diễn ra:
            </div>
            <div style={{ fontSize: "13px", color: "#111827", fontWeight: "400", fontFamily: "inherit" }}>
              {eventData?.date || "15/03/2025 - 22/03/2025"}
            </div>
          </div>
        </div>

        {/* Warning Box */}
        <div
          style={{
            background: "#fefce8",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "20px",
            display: "flex",
            gap: "8px",
          }}
        >
          <AlertTriangle size={18} color="#f4a010ff" fill="#f2da9eff" style={{ flexShrink: 0, marginTop: "1px" }} />
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "#92400e",
              lineHeight: "1.5",
              fontFamily: "inherit",
            }}
          >
            <strong>Lưu ý:</strong> Sau khi gỡ cấm, sự kiện sẽ ngay lập tức hiển thị công khai và người dùng có thể tham gia.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f9fafb";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
            }}
          >
            Huỷ
          </button>
          <button
            onClick={handleUnban}
            style={{
              border: "none",
              background: "#3b82f6",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#3b82f6";
            }}
          >
            <Check size={16} />
            <span>Xác nhận gỡ cấm</span>
          </button>
        </div>
      </div>
    </>
  );
}