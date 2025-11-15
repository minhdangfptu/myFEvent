import { useState } from "react";

export default function BanEventModal({ isOpen, onClose, eventData }) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleBan = () => {
    if (!reason.trim()) {
      alert("Vui lòng nhập lý do cấm!");
      return;
    }
    // Xử lý logic cấm sự kiện
    console.log("Ban event:", eventData, "Reason:", reason);
    onClose();
    setReason("");
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
          maxWidth: "480px",
          zIndex: 9999,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Header with Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
            </svg>
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "600",
              color: "#1f2937",
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
            color: "#6b7280",
            lineHeight: "1.5",
          }}
        >
          Sau khi bị cấm, sự kiện này sẽ không còn hiển thị với người dùng công khai.
        </p>

        {/* Event Info Section */}
        <div style={{ marginBottom: "20px" }}>
          <h3
            style={{
              margin: "0 0 12px 0",
              fontSize: "14px",
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            Thông tin sự kiện
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                Tên sự kiện
              </div>
              <div style={{ fontSize: "14px", color: "#1f2937", fontWeight: "500" }}>
                {eventData?.name || "FPT Coding Week 2025"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                Trường Ban tổ chức
              </div>
              <div style={{ fontSize: "14px", color: "#1f2937", fontWeight: "500" }}>
                {eventData?.organizer || "Nguyễn Văn An"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                Ngày diễn ra
              </div>
              <div style={{ fontSize: "14px", color: "#1f2937", fontWeight: "500" }}>
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
              color: "#1f2937",
              marginBottom: "8px",
            }}
          >
            Lý do cấm <span style={{ color: "#dc2626" }}>(bắt buộc)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Sự kiện vi phạm quy định đăng ký nội dung không phù hợp."
            style={{
              width: "100%",
              minHeight: "100px",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              color: "#1f2937",
              resize: "vertical",
              fontFamily: "inherit",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3b82f6";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#d1d5db";
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={handleClose}
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
            onClick={handleBan}
            style={{
              border: "none",
              background: "#dc2626",
              color: "white",
              padding: "10px 24px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#b91c1c";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#dc2626";
            }}
          >
            Xác nhận cấm
          </button>
        </div>
      </div>
    </>
  );
}