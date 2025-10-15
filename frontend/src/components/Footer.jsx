import { Link as RouterLink } from "react-router-dom"

export default function Footer() {
  return (
    <footer className="bg-white pt-4 pb-4 mt-5" style={{ borderTop: '1px solid #E5E7EB' }}>
      <div className="container-xl px-2">
        <div className="row align-items-start g-4">
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center mb-2">
              <img src="/logo-03.png" alt="myFEvent" style={{ height: 70 }} />
            </div>
            <div className="text-muted" style={{ fontSize: 13, maxWidth: 320 }}>
              Nền tảng quản lý sự kiện dành riêng cho sinh viên Đại học FPT.
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="fw-semibold mb-2" style={{ fontSize: 14 }}>Sản phẩm</div>
            <div className="d-flex flex-column gap-1">
              <RouterLink className="text-decoration-none text-muted" to="/events" style={{ fontSize: 14 }}>Sự kiện tại FPT</RouterLink>
              <RouterLink className="text-decoration-none text-muted" to="/login" style={{ fontSize: 14 }}>Đăng nhập</RouterLink>
              <RouterLink className="text-decoration-none text-muted" to="/signup" style={{ fontSize: 14 }}>Đăng ký</RouterLink>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="fw-semibold mb-2" style={{ fontSize: 14 }}>Hỗ trợ</div>
            <div className="d-flex flex-column gap-1">
              <RouterLink className="text-decoration-none text-muted" to="/contact" style={{ fontSize: 14 }}>Liên hệ</RouterLink>
              <RouterLink className="text-decoration-none text-muted" to="/about" style={{ fontSize: 14 }}>Về chúng tôi</RouterLink>
              <RouterLink className="text-decoration-none text-muted" to="/policy" style={{ fontSize: 14 }}>Chính sách</RouterLink>
            </div>
          </div>
          <div className="col-12 col-md-4 d-flex justify-content-center">
            <div className="text-center">
              <div className="fw-semibold mb-4" style={{ fontSize: 14 }}>Theo dõi chúng tôi</div>
              <div className="d-flex gap-4 justify-content-center">
                <a
                  className="btn btn-light border rounded-circle d-inline-flex align-items-center justify-content-center p-0"
                  style={{ width: 54, height: 54 }}
                  href="#"
                  aria-label="Facebook"
                  title="Facebook"
                >
                  <i className="bi bi-facebook" style={{ fontSize: 22, lineHeight: 1 }} />
                </a>

                <a
                  className="btn btn-light border rounded-circle d-inline-flex align-items-center justify-content-center p-0"
                  style={{ width: 54, height: 54 }}
                  href="#"
                  aria-label="Instagram"
                  title="Instagram"
                >
                  <i className="bi bi-instagram" style={{ fontSize: 22, lineHeight: 1 }} />
                </a>

                <a
                  className="btn btn-light border rounded-circle d-inline-flex align-items-center justify-content-center p-0"
                  style={{ width: 54, height: 54 }}
                  href="#"
                  aria-label="LinkedIn"
                  title="LinkedIn"
                >
                  <i className="bi bi-linkedin" style={{ fontSize: 22, lineHeight: 1 }} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <hr className="mt-4" />
        <div className="text-center text-muted" style={{ fontSize: 13 }}>
          © 2025 myFEvent. All rights reserved.
        </div>
      </div>
    </footer>
  )
}



