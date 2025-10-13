import { Link as RouterLink } from "react-router-dom"

export default function Header() {
  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
      <div className="container-xl px-2">
        <RouterLink to="/landingpage" className="navbar-brand d-flex align-items-center gap-2 text-dark">
          <img src="/logo-03.png" alt="myFEvent" style={{ height: 32, width: 'auto' }} />
          <span style={{ fontWeight: 600, color: '#111827', fontSize: 20 }}>FPT Event</span>
        </RouterLink>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-5 gap-lg-4">
            {["/landingpage","/events","/clubs","/about","/policy","/contact"].map((path, i) => (
              <li className="nav-item" key={path}>
                <RouterLink to={path} className="nav-link" style={{ color: '#4b5563', fontSize: 14 }}>
                  {["Trang chủ","Sự kiện tới","Câu lạc bộ","Về chúng tôi","Chính sách","Liên hệ"][i]}
                </RouterLink>
              </li>
            ))}
          </ul>
          <div className="d-none d-sm-flex gap-2">
            <RouterLink to="/login" className="btn btn-link text-secondary">Đăng nhập</RouterLink>
            <RouterLink to="/signup" className="btn btn-danger">Đăng ký</RouterLink>
          </div>
        </div>
      </div>
    </nav>
  )
}


