import React from "react";

export default function ConfirmModal({ show, onClose, onConfirm, message = "Bạn có chắc chắn?", isLoading = false }) {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 3000,
      background: 'rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 10,
        width: 600,
        padding: 24,
        boxShadow: '0 2px 16px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: 16 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>Huỷ</button>
          <button className="btn btn-danger d-flex align-items-center" onClick={onConfirm} disabled={isLoading}>
            {isLoading && <i className="bi bi-arrow-clockwise spin-animation me-2"></i>}
            {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}
