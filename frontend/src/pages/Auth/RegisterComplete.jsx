import { Link as RouterLink } from "react-router-dom"

export default function RegisterComplete() {
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-white px-2">
      <img src="/logo-03.png" alt="myFEvent" style={{ height: 96, width: 'auto' }} className="mb-4" />
      <div className="card shadow-sm border-0" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4 text-center">
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: 40, height: 40, backgroundColor: '#dcfce7', color: '#16a34a' }}>
            <i className="bi bi-check2-circle" />
          </div>
          <div className="fw-semibold mb-1" style={{ color: '#111827' }}>Kích hoạt tài khoản thành công</div>
          <div className="text-secondary mb-3" style={{ fontSize: 14 }}>Tài khoản của bạn đã được kích hoạt. Tiếp theo, hãy đăng nhập để bắt đầu sử dụng.</div>
          <RouterLink to="/login" className="btn btn-danger w-100">Tới trang đăng nhập</RouterLink>
        </div>
      </div>
    </div>
  )
}



