import * as React from "react";
import { useNavigate } from "react-router-dom";
import error502 from "/logo-03.png";
export default function ErrorPage503() {
  const navigate = useNavigate();
  return (
    <div className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
      <div className="container text-center">
        <div className="d-flex justify-content-center mb-3">
          <img src={error502} alt="503 illustration" style={{ width: '80%', maxWidth: 420 }} />
        </div>
        <div className="display-1 fw-bold">503</div>
        <div className="h4 fw-bold">ERROR - Service Unavailable</div>
        <p className="text-secondary mx-auto" style={{ maxWidth: 600 }}>
          Xin Lỗi Vì Sự Bất Tiện Này. <br />
          Đội Ngũ Của Chúng Tôi Đang Nỗ Lực Giải Quyết Vấn Đề Nhanh Nhất Có Thể. <br />
          Xin Chân Thành Cảm Ơn Vì Đã Tin Tưởng MyFEvent.
        </p>
        <div className="mt-2">
          <small className="text-secondary d-block">URL: https://xx</small>
          <small className="text-secondary d-block">Error ID: 033001233211</small>
          <small className="text-secondary d-block">Date: 2024/12/21 21:30:04</small>
        </div>
        <button className="btn btn-link fw-bold mt-3" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-2" />Về Trang Trước
        </button>
        <div className="text-secondary mt-3">
          Gửi <a className="text-decoration-none" href="mailto:support@myfevent.com">email</a> hoặc kết nối qua Mạng Xã Hội với chúng tôi.
        </div>
        <div className="d-flex justify-content-center gap-3 mt-2">
          <a href="#" className="btn btn-outline-secondary btn-sm rounded-circle" aria-label="Email"><i className="bi bi-envelope" /></a>
          <a href="#" className="btn btn-outline-secondary btn-sm rounded-circle" aria-label="Facebook"><i className="bi bi-facebook" /></a>
          <a href="#" className="btn btn-outline-secondary btn-sm rounded-circle" aria-label="Instagram"><i className="bi bi-instagram" /></a>
          <a href="#" className="btn btn-outline-secondary btn-sm rounded-circle" aria-label="Twitter"><i className="bi bi-twitter-x" /></a>
          <a href="#" className="btn btn-outline-secondary btn-sm rounded-circle" aria-label="YouTube"><i className="bi bi-youtube" /></a>
        </div>
      </div>
    </div>
  );
}
