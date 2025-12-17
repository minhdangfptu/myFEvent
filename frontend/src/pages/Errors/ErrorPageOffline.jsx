import * as React from "react";
import { WifiOff } from "lucide-react";

export default function ErrorPageOffline() {
  const handleReload = () => window.location.reload();
  return (
    <div className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '90vh' }}>
      <div className="container text-center">
        <div className="display-3 fw-bold">OOPSIE!</div>
        <div className="h4 fw-bold mt-2">ERROR - Bạn đang ngoại tuyến!</div>
        <div className="d-flex justify-content-center my-3">
          <WifiOff
            size={280}
            strokeWidth={1}
            style={{ color: '#dc3545', marginBottom: 12, opacity: 0.8 }}
          />
        </div>
        <hr className="mx-auto" style={{ width: 120 }} />
        <div className="mb-2">Vui Lòng Chờ Hoặc Làm Mới Lại Trang</div>
        <button className="btn btn-primary" onClick={handleReload}>Làm mới trang</button>
        <div className="text-secondary mt-3" style={{ fontSize: 15 }}>
          Nếu Sự Cố Vẫn Tiếp Diễn, Vui Lòng Liên Hệ <a href="mailto:minhddhe180032@fpt.edu.vn" className="fw-semibold">minhddhe180032@fpt.edu.vn</a>
        </div>
      </div>
    </div>
  );
}
