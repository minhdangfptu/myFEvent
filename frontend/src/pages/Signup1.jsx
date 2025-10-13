import { Link as RouterLink } from "react-router-dom"

export default function Signup1Page() {
  return (
    <div className="d-flex align-items-center justify-content-center px-2" style={{ minHeight: '100dvh', backgroundColor: '#f9fafb' }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="d-flex justify-content-center mb-4">
          <img src="/logo-03.png" alt="myFEvent Logo" style={{ height: 96 }} />
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <form className="d-grid gap-3">
              <div>
                <div className="form-label mb-1 fw-medium" style={{ color: '#111827' }}>Email</div>
                <input type="email" className="form-control" placeholder="Nhập địa chỉ email của bạn" />
              </div>
              <div>
                <div className="form-label mb-1 fw-medium" style={{ color: '#111827' }}>Tên người dùng</div>
                <input type="text" className="form-control" placeholder="Nhập tên người dùng của bạn" />
              </div>
              <div>
                <div className="form-label mb-1 fw-medium" style={{ color: '#111827' }}>Tên đầy đủ</div>
                <input type="text" className="form-control" placeholder="Nhập tên đầy đủ của bạn" />
              </div>
              <div>
                <div className="form-label mb-1 fw-medium" style={{ color: '#111827' }}>Mật khẩu</div>
                <input type="password" className="form-control" placeholder="Nhập mật khẩu của bạn" />
              </div>

              <RouterLink to="/email-confirmation" className="btn btn-danger w-100 py-2">Đăng ký</RouterLink>

              <div className="text-secondary text-center">Hoặc</div>

              <button type="button" className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2">
                <img src="/google-logo.png" alt="Google" width="20" height="20" />
                <span className="text-dark">Sign in with Google</span>
                <i className="bi bi-caret-down-fill text-secondary" />
              </button>
            </form>
          </div>
        </div>

        <div className="text-center mt-3 text-secondary">
          Bạn có tài khoản? <RouterLink to="/login" className="text-dark fw-medium text-decoration-none">Đăng nhập</RouterLink>
        </div>
      </div>
    </div>
  )
}
