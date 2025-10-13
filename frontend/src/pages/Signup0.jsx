import { Link as RouterLink } from "react-router-dom"

export default function Signup0Page() {
  return (
    <div className="d-flex align-items-center justify-content-center px-2" style={{ minHeight: '100dvh', backgroundColor: '#f9fafb' }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="d-flex justify-content-center mb-4">
          <img src="/logo-03.png" alt="myFEvent Logo" style={{ height: 96 }} />
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-center d-flex flex-column align-items-center gap-3">
            <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, backgroundColor: '#fef2f2' }}>
              <i className="bi bi-gift" style={{ color: '#ef4444', fontSize: 28 }} />
            </div>

            <div className="fw-semibold" style={{ color: '#111827' }}>Cùng myFEvent tổ chức sự kiện một cách dễ dàng</div>

            <div className="text-secondary" style={{ fontSize: 14 }}>
              myFEvent giúp bạn quản lý thành viên, kết nối mọi người trong sự kiện và theo dõi hoạt động một cách dễ dàng.
            </div>

            <RouterLink to="/signup1" className="btn btn-outline-secondary w-100 py-2">
              <i className="bi bi-envelope me-2" />Đăng nhập với Email
            </RouterLink>

            <div className="text-secondary">Hoặc</div>

            <button className="btn btn-outline-secondary w-100 py-2">
              <svg width="20" height="20" viewBox="0 0 24 24" className="me-2">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Đăng nhập bằng Google
            </button>

            <div className="text-secondary" style={{ fontSize: 12 }}>
              Bằng cách tiếp tục, bạn đồng ý với <RouterLink to="#" className="text-decoration-none" style={{ color: '#ef4444' }}>Điều khoản sử dụng</RouterLink> của myFEvent.
            </div>
          </div>
        </div>

        <div className="text-center mt-3 text-secondary">
          Bạn có tài khoản? <RouterLink to="/login" className="text-dark fw-medium text-decoration-none">Đăng nhập</RouterLink>
        </div>
      </div>
    </div>
  )
}
