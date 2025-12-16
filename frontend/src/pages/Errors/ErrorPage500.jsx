import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import errorImage from "/logo-03.png"; // Thay ảnh khác nếu bạn muốn minh họa 'Server hỏng'

// Hàm tạo ID lỗi ngẫu nhiên với tiền tố 500
const generateErrorId = () => {
  return 'ERR-500-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

export default function ErrorPage500() {
  const navigate = useNavigate();
  const location = useLocation();

  // Lưu thông tin lỗi tĩnh
  const errorInfo = React.useMemo(() => ({
    id: generateErrorId(),
    date: new Date().toLocaleString('vi-VN'),
    url: window.location.href
  }), []);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/'); // Điều hướng về trang chủ
  };

  return (
    <div className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div className="container text-center">
        {/* Image Section */}
        <div className="d-flex justify-content-center mb-3">
          <img 
            src={errorImage} 
            alt="500 illustration" 
            style={{ width: '80%', maxWidth: 280, objectFit: 'contain' }} 
          />
        </div>

        {/* Error Title - Màu đỏ đậm thể hiện lỗi nghiêm trọng */}
        <div className="display-1 fw-bold text-danger">500</div>
        <div className="h4 fw-bold mb-3">ERROR - Internal Server Error</div>

        {/* Friendly Message */}
        <p className="text-secondary mx-auto mb-4" style={{ maxWidth: 600, lineHeight: '1.6' }}>
          Đừng lo lắng, đây không phải lỗi của bạn.<br />
          Máy chủ của chúng tôi đang gặp sự cố nội bộ bất ngờ.<br />
          Đội ngũ kỹ thuật đã được thông báo và đang khắc phục ngay lập tức.
        </p>

        {/* Technical Details Box */}
        <div className="bg-white p-3 rounded border mx-auto mb-4" style={{ maxWidth: 500, fontSize: '0.9rem' }}>
          <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
            <span className="text-muted">Error ID:</span>
            <span className="font-monospace fw-bold text-danger">{errorInfo.id}</span>
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
          Nếu lỗi vẫn lặp lại, vui lòng báo cáo lỗi này qua <a className="text-decoration-none fw-bold" href={`mailto:support@myfevent.com?subject=Báo cáo lỗi hệ thống 500 - ${errorInfo.id}`}>email</a>.
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