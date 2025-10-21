import { Link as RouterLink } from "react-router-dom";

export default function Footer({ sidebarOpen = true }) {
  return (
    <footer
      className="bg-dark text-white pt-5 pb-4 mt-5"
      style={{
        marginLeft: sidebarOpen ? "250px" : "70px",
        transition: "margin-left 0.3s ease",
      }}
    >
      <div className="container-xl px-2">
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center gap-2">
            {/* <div className="d-grid place-items-center fw-bold" style={{ width: 32, height: 32, backgroundColor: '#ef4444', color: '#fff', borderRadius: 6 }}>F</div>
            <div className="fw-semibold">FPT Event</div> */}
            <img
              src="/logo-03.png"
              alt="myFEvent"
              style={{ width: "auto", height: 70 }}
            />
          </div>
          <div
            className="text-secondary"
            style={{ marginTop: 0 , fontSize: 14 }}
          >
            Nền tảng quản lý sự kiện dành cho sinh viên Trường Đại học FPT
          </div>
        </div>

        <div className="row justify-content-center g-4">
          <div className="col-12 col-md-3 text-center">
            <div className="fw-semibold mb-2">Sản phẩm</div>
            <div className="d-flex flex-column gap-1 align-items-center">
              <RouterLink
                className="text-decoration-none text-secondary"
                to="/events"
                style={{ fontSize: 14 }}
              >
                Sự kiện tại FPTU
              </RouterLink>
              <a
                className="text-decoration-none text-secondary"
                href="#"
                style={{ fontSize: 14 }}
              >
                Câu lạc bộ
              </a>
              <a
                className="text-decoration-none text-secondary"
                href="#"
                style={{ fontSize: 14 }}
              >
                Chính sách
              </a>
            </div>
          </div>
          <div className="col-12 col-md-3 text-center">
            <div className="fw-semibold mb-2">Hỗ trợ</div>
            <div className="d-flex flex-column gap-1 align-items-center">
              <RouterLink
                className="text-decoration-none text-secondary"
                to="/about"
                style={{ fontSize: 14 }}
              >
                Về chúng tôi
              </RouterLink>
              <RouterLink
                className="text-decoration-none text-secondary"
                to="/contact"
                style={{ fontSize: 14 }}
              >
                Liên hệ
              </RouterLink>
              <a
                className="text-decoration-none text-secondary"
                href="#"
                style={{ fontSize: 14 }}
              >
                Hỗ trợ
              </a>
            </div>
          </div>
          <div className="col-12 col-md-3 text-center">
            <div className="fw-semibold mb-2">Theo dõi chúng tôi</div>
            <div className="d-flex gap-2 justify-content-center">
              <a
                className="btn btn-outline-light btn-sm rounded-circle"
                href="#"
                aria-label="Facebook"
              >
                <i className="bi bi-facebook" />
              </a>
              <a
                className="btn btn-outline-light btn-sm rounded-circle"
                href="#"
                aria-label="Instagram"
              >
                <i className="bi bi-instagram" />
              </a>
              <a
                className="btn btn-outline-light btn-sm rounded-circle"
                href="#"
                aria-label="YouTube"
              >
                <i className="bi bi-youtube" />
              </a>
            </div>
          </div>
        </div>

        <div
          className="border-top mt-4 pt-3 text-center text-secondary"
          style={{ fontSize: 14 }}
        >
          © 2025 myFEvent. Tất cả đã được bảo hộ.
        </div>
      </div>
    </footer>
  );
}
