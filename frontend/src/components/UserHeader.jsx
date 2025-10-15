import { useAuth } from '../contexts/AuthContext';

export default function UserHeader({ title, showSearch = false, showEventAction = false, onSearch, onEventAction }) {
  const { logout } = useAuth();

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm p-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-outline-secondary me-3"
            onClick={() => {
              // This will be handled by parent component
              const event = new CustomEvent('toggleSidebar');
              window.dispatchEvent(event);
            }}
          >
            <i className="bi bi-list"></i>
          </button>
          <h5 className="mb-0 text-muted">{title}</h5>
        </div>
        
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-secondary">
            <i className="bi bi-bell"></i>
          </button>
          <div className="dropdown">
            <button className="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
              <i className="bi bi-person"></i>
            </button>
            <ul className="dropdown-menu">
              <li><a className="dropdown-item" href="/user-profile">Hồ sơ</a></li>
              <li><a className="dropdown-item" href="/setting">Cài đặt</a></li>
              <li><hr className="dropdown-divider" /></li>
              <li><button className="dropdown-item" onClick={logout}>Đăng xuất</button></li>
            </ul>
          </div>
        </div>
      </header>

      {/* Search and Action Bar */}
      {(showSearch || showEventAction) && (
        <div className="bg-light border-bottom p-3">
          <div className="d-flex gap-3">
            {showSearch && (
              <div className="flex-grow-1">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search sự kiện..."
                    onChange={(e) => onSearch && onSearch(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {showEventAction && (
              <div className="dropdown">
                <button 
                  className="btn btn-danger d-flex align-items-center gap-2"
                  type="button" 
                  data-bs-toggle="dropdown"
                >
                  <i className="bi bi-plus"></i>
                  TẠO/THAM GIA SỰ KIỆN
                  <i className="bi bi-chevron-down"></i>
                </button>
                <ul className="dropdown-menu">
                  <li><button className="dropdown-item" onClick={() => onEventAction && onEventAction('create')}>Tạo sự kiện</button></li>
                  <li><button className="dropdown-item" onClick={() => onEventAction && onEventAction('join')}>Tham gia sự kiện</button></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
