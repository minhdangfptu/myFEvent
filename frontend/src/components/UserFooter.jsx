import { Link as RouterLink } from "react-router-dom";

export default function Footer({ sidebarOpen = true }) {
  return (
    <footer
      style={{
        marginLeft: sidebarOpen ? "230px" : "70px",
        transition: "margin-left 0.3s ease",
        backgroundColor: "#2c3e50",
      }}
    >
      <div className="container-xl px-4 py-5">
        {/* Main Footer Content */}
        <div className="row g-4 mb-5">
          {/* Column 1: Sản phẩm */}
          <div className="col-12 col-md-3">
            <div
              className="fw-bold mb-3"
              style={{ color: "#ffffff", fontSize: 16 }}
            >
              Sản phẩm
            </div>
            <div className="d-flex flex-column gap-2">
              <RouterLink
                className="text-decoration-none"
                to="/events"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Sự kiện tại FPTU
              </RouterLink>
              <a
                className="text-decoration-none"
                href="#"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Câu lạc bộ
              </a>
              <a
                className="text-decoration-none"
                href="#"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Chính sách
              </a>
              <a
                className="text-decoration-none"
                href="#"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Điều khoản sử dụng
              </a>
            </div>
          </div>

          {/* Column 2: Hỗ trợ */}
          <div className="col-12 col-md-3">
            <div
              className="fw-bold mb-3"
              style={{ color: "#ffffff", fontSize: 16 }}
            >
              Hỗ trợ
            </div>
            <div className="d-flex flex-column gap-2">
              <RouterLink
                className="text-decoration-none"
                to="/about"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Về chúng tôi
              </RouterLink>
              <RouterLink
                className="text-decoration-none"
                to="/contact"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Liên hệ
              </RouterLink>
              <a
                className="text-decoration-none"
                href="#"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Câu hỏi thường gặp
              </a>
              <a
                className="text-decoration-none"
                href="#"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Trung tâm trợ giúp
              </a>
            </div>
          </div>

          {/* Column 3: Tài nguyên */}
          <div className="col-12 col-md-3">
            <div
              className="fw-bold mb-3"
              style={{ color: "#ffffff", fontSize: 16 }}
            >
              Tài nguyên
            </div>
            <div className="d-flex flex-column gap-2">
              <a
                className="text-decoration-none"
                href="#"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Blog
              </a>
              <a
                className="text-decoration-none"
                href="#"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Cộng đồng
              </a>
              <a
                className="text-decoration-none"
                href="#"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Mạng xã hội
              </a>
              <a
                className="text-decoration-none"
                href="#"
                style={{ fontSize: 14, color: "#bdc3c7" }}
              >
                Bản tin
              </a>
            </div>
          </div>

          {/* Column 4: Subscribe */}
          <div className="col-12 col-md-3">
            <div
              className="fw-bold mb-3"
              style={{ color: "#ffffff", fontSize: 16 }}
            >
              Đăng ký nhận tin
            </div>
            <div
              className="mb-3"
              style={{ fontSize: 14, color: "#95a5a6" }}
            >
              Tham gia cộng đồng để nhận cập nhật mới nhất
            </div>
            <button
              className="btn w-100 mb-2"
              style={{
                backgroundColor: "#ff4c4cff",
                color: "#ffffff",
                fontSize: 14,
                border: "none",
                padding: "10px 20px"
              }}
            >
              Đăng ký
            </button>
            <div style={{ fontSize: 12, color: "#7f8c8d" }}>
              Bằng việc đăng ký, bạn đồng ý với{" "}
              <a href="#" style={{ color: "#95a5a6", textDecoration: "underline" }}>
                Chính sách bảo mật
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-top mb-4" style={{ borderColor: "#34495e" }} />

        {/* Bottom Section */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          {/* Logo and Links */}
          <div className="d-flex flex-column flex-md-row align-items-center gap-3">
            <img
              src="/logo-03.png"
              alt="myFEvent"
              style={{
                width: "auto",
                height: 50,
                filter: "brightness(0) invert(1)"
              }}
            />
            <div className="d-flex gap-3" style={{ fontSize: 14, color: "#95a5a6" }}>
              <a href="#" className="text-decoration-none" style={{ color: "#95a5a6" }}>
                Chính sách bảo mật
              </a>
              <a href="#" className="text-decoration-none" style={{ color: "#95a5a6" }}>
                Điều khoản dịch vụ
              </a>
              <a href="#" className="text-decoration-none" style={{ color: "#95a5a6" }}>
                Chính sách Cookie
              </a>
            </div>
          </div>

          {/* Social Icons */}
          <div className="d-flex gap-3 align-items-center">
            <a
              className="d-flex align-items-center justify-content-center rounded-circle"
              href="#"
              aria-label="Facebook"
              style={{
                width: 36,
                height: 36,
                backgroundColor: "#34495e",
                color: "#ecf0f1",
                fontSize: 16,
                border: "1px solid #4a5f7f"
              }}
            >
              <i className="bi bi-facebook" />
            </a>
            <a
              className="d-flex align-items-center justify-content-center rounded-circle"
              href="#"
              aria-label="Instagram"
              style={{
                width: 36,
                height: 36,
                backgroundColor: "#34495e",
                color: "#ecf0f1",
                fontSize: 16,
                border: "1px solid #4a5f7f"
              }}
            >
              <i className="bi bi-instagram" />
            </a>
            <a
              className="d-flex align-items-center justify-content-center rounded-circle"
              href="#"
              aria-label="LinkedIn"
              style={{
                width: 36,
                height: 36,
                backgroundColor: "#34495e",
                color: "#ecf0f1",
                fontSize: 16,
                border: "1px solid #4a5f7f"
              }}
            >
              <i className="bi bi-linkedin" />
            </a>
            <a
              className="d-flex align-items-center justify-content-center rounded-circle"
              href="#"
              aria-label="YouTube"
              style={{
                width: 36,
                height: 36,
                backgroundColor: "#34495e",
                color: "#ecf0f1",
                fontSize: 16,
                border: "1px solid #4a5f7f"
              }}
            >
              <i className="bi bi-youtube" />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-md-end mt-4" style={{ fontSize: 14, color: "#7f8c8d" }}>
          © 2025 myFEvent. Tất cả các quyền đã được bảo hộ.
        </div>
      </div>
    </footer>
  );
}
