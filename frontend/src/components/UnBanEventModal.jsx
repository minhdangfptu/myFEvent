import { useState } from "react";

export default function UnbanEventModal({ isOpen, onClose, eventData }) {
  if (!isOpen) return null;

  const handleUnban = () => {
    // Xử lý logic bỏ cấm sự kiện
    console.log("Unban event:", eventData);
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
          borderRadius: "12px",
          padding: "24px",
          width: "90%",
          maxWidth: "480px",
          zIndex: 9999,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            Bỏ cấm sự kiện
          </h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "24px",
              color: "#9ca3af",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Description */}
        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: "14px",
            color: "#6b7280",
            lineHeight: "1.5",
          }}
        >
          Sự kiện sẽ được hiển thị trở lại với người dùng công khai.
        </p>

        {/* Event Info Box */}
        <div
          style={{
            background: "#f9fafb",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
              Tên sự kiện:
            </div>
            <div style={{ fontSize: "14px", color: "#1f2937", fontWeight: "500" }}>
              {eventData?.name || "Festival Âm nhạc Mùa hè"}
            </div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
              TBTC:
            </div>
            <div style={{ fontSize: "14px", color: "#1f2937", fontWeight: "500" }}>
              {eventData?.organizer || "Trần Văn Minh"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
              Ngày diễn ra:
            </div>
            <div style={{ fontSize: "14px", color: "#1f2937", fontWeight: "500" }}>
              {eventData?.date || "15/03/2025 - 22/03/2025"}
            </div>
          </div>
        </div>

        {/* Warning Box */}
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "24px",
            display: "flex",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "#92400e",
              lineHeight: "1.5",
            }}
          >
            <strong>Lưu ý:</strong> Sau khi bỏ cấm, sự kiện sẽ ngay lập tức hiển thị công khai và người dùng có thể tham gia.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              padding: "10px 20px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
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
              padding: "10px 20px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#3b82f6";
            }}
          >
            <span>✓</span>
            <span>Xác nhận bỏ cấm</span>
          </button>
        </div>
      </div>
    </>
  );
}