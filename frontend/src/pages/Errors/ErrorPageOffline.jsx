import * as React from "react";
import offlineImage from "~/assets/errors/lost_connect.png";

export default function ErrorPageOffline() {
  const handleReload = () => window.location.reload();
  return (
    <div className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '90vh' }}>
      <div className="container text-center">
        <div className="display-3 fw-bold">OOPSIE!</div>
        <div className="h4 fw-bold mt-2">ERROR - Bạn đang ngoại tuyến!</div>
        <div className="d-flex justify-content-center my-3">
          <img src={offlineImage} alt="Offline illustration" style={{ width: '100%', maxWidth: 420, marginBottom: 12 }} />
        </div>
        <hr className="mx-auto" style={{ width: 120 }} />
        <div className="mb-2">Vui Lòng Chờ Hoặc Làm Mới Lại Trang</div>
        <button className="btn btn-primary" onClick={handleReload}>Làm mới trang</button>
        <div className="text-secondary mt-3" style={{ fontSize: 15 }}>
          Nếu Sự Cố Vẫn Tiếp Diễn, Vui Lòng Liên Hệ <a href="#" className="fw-semibold">Trung Tâm Hỗ Trợ</a>
        </div>
      </div>
    </div>
  );
}
