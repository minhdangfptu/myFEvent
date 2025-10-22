import { NavLink, Link as RouterLink, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"

export default function Header() {
  const { user, isAuthenticated, logout, logoutAllDevices } = useAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    if (logoutLoading) return // Tránh double-click
    
    setLogoutLoading(true)
    try {
      await logout()
      handleMenuClose()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Vẫn đóng menu và redirect dù có lỗi
      handleMenuClose()
      navigate('/login')
    } finally {
      setLogoutLoading(false)
    }
  }
  const handleLogoutAllDevices = async () => {
    if (logoutLoading) return 
    
    setLogoutLoading(true)
    try {
      await logoutAllDevices()
      handleMenuClose()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Vẫn đóng menu và redirect dù có lỗi
      handleMenuClose()
      navigate('/login')
    } finally {
      setLogoutLoading(false)
    }
  }

  const handleProfile = () => {
    handleMenuClose()
    // Navigate to profile page or show profile modal
    console.log('Navigate to profile')
  }

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top" style={{ padding: '4px' }}>
      <div className="container-xl px-2">
        <RouterLink to="/landingpage" className="navbar-brand d-flex align-items-center gap-2 text-dark">
          <img src="/logo-03.png" alt="myFEvent" style={{ height: 50, width: 'auto' }} />
        </RouterLink>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-5 gap-lg-4">
            {["/landingpage","/events","/clubs","/about","/policy","/contact"].map((path, i) => (
              <li className="nav-item" key={path}>
                <NavLink
                  to={path}
                  className={({ isActive }) => `nav-link ${isActive ? 'fw-semibold text-dark active' : 'text-secondary'}`}
                  style={{ fontSize: 14, transition: 'color .2s ease' }}
                >
                  {["Trang chủ","Sự kiện tới","Câu lạc bộ","Về chúng tôi","Chính sách","Liên hệ"][i]}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="d-none d-sm-flex gap-2">
            <RouterLink style={{fontSize: 15}} to="/login" className="btn btn-link text-secondary">Đăng nhập</RouterLink>
            <RouterLink style={{fontSize: 15}} to="/signup" className="btn btn-danger">Đăng ký</RouterLink>
          </div>
        </div>
      </div>
    </nav>
  )
}


