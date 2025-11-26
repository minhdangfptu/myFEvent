import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import errorImage from "/logo-03.png"; // Đổi tên biến cho thống nhất

// Hàm tạo ID lỗi ngẫu nhiên
const generateErrorId = () => {
  return 'ERR-502-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

export default function ErrorPage502() {
  const navigate = useNavigate();
  const location = useLocation();

  // Sử dụng useMemo để giữ nguyên thông tin lỗi khi re-render
  const errorInfo = React.useMemo(() => ({
    id: generateErrorId(),
    date: new Date().toLocaleString('vi-VN'),
    url: window.location.href
  }), []);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/'); 
  };

  return (
    <div className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div className="container text-center">
        {/* Image Section */}
        <div className="d-flex justify-content-center mb-3">
          <img 
            src={errorImage} 
            alt="502 illustration" 
            style={{ width: '80%', maxWidth: 280, objectFit: 'contain' }} 
          />
        </div>

        {/* Error Title - Dùng màu đỏ cho lỗi 502 */}
        <div className="display-1 fw-bold text-danger">502</div>
        <div className="h4 fw-bold mb-3">ERROR - Bad Gateway</div>

        {/* Friendly Message */}
        <p className="text-secondary mx-auto mb-4" style={{ maxWidth: 600, lineHeight: '1.6' }}>
          Máy chủ nhận được phản hồi không hợp lệ.<br />
          Đội Ngũ Của Chúng Tôi Đang Nỗ Lực Giải Quyết Vấn Đề Nhanh Nhất Có Thể.<br />
          Xin Chân Thành Cảm Ơn Vì Đã Tin Tưởng <strong>MyFEvent</strong>.
        </p>

        {/* Technical Details Box */}
        <div className="bg-white p-3 rounded border mx-auto mb-4" style={{ maxWidth: 500, fontSize: '0.9rem' }}>
          <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
            <span className="text-muted">Error ID:</span>
            <span className="font-monospace fw-bold">{errorInfo.id}</span>
          </div>
          <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
            <span className="text-muted">Date:</span>
            <span>{errorInfo.date}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted">Path:</span>
            <span className="text-truncate ms-2" style={{ maxWidth: 250 }} title={errorInfo.url}>
              {location.pathname}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-center gap-3 mb-4">
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-2" />Quay lại
          </button>
          
          <button className="btn btn-primary" onClick={handleReload}>
            <i className="bi bi-arrow-clockwise me-2" />Thử lại
          </button>

          <button className="btn btn-outline-primary" onClick={handleGoHome}>
            <i className="bi bi-house me-2" />Trang chủ
          </button>
        </div>

        {/* Contact & Social */}
        <div className="text-secondary mt-4 small">
          Gửi <a className="text-decoration-none fw-bold" href={`mailto:support@myfevent.com?subject=Report 502 Error ${errorInfo.id}`}>email</a> hoặc kết nối qua Mạng Xã Hội với chúng tôi.
        </div>
        
        <div className="d-flex justify-content-center gap-3 mt-3">
          <SocialLink href="mailto:support@myfevent.com" icon="bi-envelope" label="Email" />
          <SocialLink href="https://facebook.com/myfevent" icon="bi-facebook" label="Facebook" />
          <SocialLink href="https://instagram.com/myfevent" icon="bi-instagram" label="Instagram" />
          <SocialLink href="https://twitter.com/myfevent" icon="bi-twitter-x" label="Twitter" />
          <SocialLink href="https://youtube.com/myfevent" icon="bi-youtube" label="YouTube" />
        </div>
      </div>
    </div>
  );
}

// Component phụ render icon MXH
function SocialLink({ href, icon, label }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center" 
      style={{ width: 36, height: 36 }}
      aria-label={label}
    >
      <i className={`bi ${icon}`} />
    </a>
  );
}