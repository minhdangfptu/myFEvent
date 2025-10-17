import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout, logoutAllDevices } = useAuth();
  const [open, setOpen] = useState(false);

  const handleMenu = () => {
    setOpen((v) => !v);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate('/login');
  };

  const handleLogoutAll = async () => {
    handleClose();
    try {
      await logoutAllDevices();
      navigate('/login');
    } catch (error) {
      console.error('Logout all devices failed:', error);
    }
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <a className="navbar-brand" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>myFEvent</a>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Dashboard</a>
            </li>
          </ul>
          {user && (
            <div className="dropdown">
              <button className="btn btn-outline-light dropdown-toggle d-flex align-items-center gap-2" type="button" id="userMenu" data-bs-toggle="dropdown" aria-expanded={open} onClick={handleMenu}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} className="rounded-circle" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                ) : (
                  <div className="rounded-circle bg-secondary d-inline-flex justify-content-center align-items-center" style={{ width: 32, height: 32 }}>
                    <span className="text-white fw-bold">{user.fullName?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span>{user.fullName}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu" style={{ display: open ? 'block' : undefined }}>
                <li className="dropdown-item-text">
                  <div className="small text-muted">{user.email}</div>
                  <div className="small">Role: {user.role}</div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item" onClick={handleProfile}>Profile</button></li>
                <li><button className="dropdown-item" onClick={handleLogout}>Logout</button></li>
                <li><button className="dropdown-item" onClick={handleLogoutAll}>Logout All Devices</button></li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}