import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function UserHeader({ title, showSearch = false, showEventAction = false, onSearch, onEventAction }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        .brand-red      { color:#EF4444; }
        .btn-brand-red  { background:#EF4444; color:#fff; border:none; }
        .btn-brand-red:hover { background:#DC2626; color:#fff; }

        /* Search input mềm mại */
        .soft-input { background:#F9FAFB; border:1px solid #E5E7EB; height:44px; border-radius:12px; transition:.2s; }
        .soft-input:focus { background:#fff; border-color:#EF4444; box-shadow:0 0 0 3px rgba(239,68,68,0.1); }

        /* ====== DROPDOWN THEME (ĐỎ) ====== */
        .dropdown-menu-red {
          border:1px solid #F3F4F6;
          border-radius:12px;
          box-shadow:0 12px 24px rgba(0,0,0,.08);
          padding:6px;
        }
        .dropdown-menu-red .dropdown-item {
          border-radius:8px;
          padding:8px 12px;
        }
        .dropdown-menu-red .dropdown-item:hover,
        .dropdown-menu-red .dropdown-item:focus {
          background:#FEE2E2;      /* đỏ nhạt */
          color:#991B1B;           /* chữ đỏ đậm */
        }
        .dropdown-menu-red .dropdown-item.active {
          background:#FEE2E2;
          color:#991B1B;
        }
        .dropdown-menu-red .dropdown-divider {
          margin:.35rem .25rem;
        }

        /* Nút icon xám nhạt cho thông báo & menu phụ */
        .btn-ghost {
          background:#fff;
          border:1px solid #E5E7EB;
          color:#374151;
        }
        .btn-ghost:hover {
          background:#F9FAFB;
          color:#111827;
        }
      `}</style>

      {/* Header */}
      <header className="bg-white shadow-sm p-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-ghost me-3"
            onClick={() => {
              const event = new CustomEvent('toggleSidebar');
              window.dispatchEvent(event);
            }}
            aria-label="Mở/đóng thanh bên"
          >
            <i className="bi bi-list"></i>
          </button>
          <h5 className="mb-0 text-muted">{title}</h5>
        </div>
        
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-ghost" aria-label={t('nav.notifications')}>
            <i className="bi bi-bell"></i>
          </button>

          {/* Account dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-ghost dropdown-toggle d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="Mở menu tài khoản"
            >
              <i className="bi bi-person"></i>
              <span
                className="text-muted"
                style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={user?.fullName || user?.name || user?.email || 'Account'}
              >
                {user?.fullName || user?.name || user?.email || 'Account'}
              </span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-red">
              <li><a className="dropdown-item" href="/user-profile">{t('nav.profile')}</a></li>
              <li><a className="dropdown-item" href="/setting">{t('nav.settings')}</a></li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item" onClick={logout}>{t('actions.logout')}</button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Search and Action Bar */}
      {(showSearch || showEventAction) && (
        <div className="bg-light border-bottom p-3">
          <div className="d-flex gap-3 align-items-center">
            {showSearch && (
              <div className="flex-grow-1">
                <div className="position-relative">
                  <i
                    className="bi bi-search position-absolute"
                    style={{ left: 12, top: 12, color: '#9CA3AF' }}
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    className="form-control soft-input ps-5"
                    placeholder={t('searchPlaceholder')}
                    onChange={(e) => onSearch && onSearch(e.target.value)}
                    aria-label={t('searchPlaceholder')}
                  />
                </div>
              </div>
            )}

            {showEventAction && (
              <div className="dropdown">
                <button
                  className="btn btn-brand-red d-flex align-items-center gap-2"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Mở menu tạo/tham gia sự kiện"
                >
                  <i className="bi bi-plus"></i>
                  {t('createEvent')}/{t('joinEvent')}
                  <i className="bi bi-chevron-down"></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-end dropdown-menu-red">
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => onEventAction && onEventAction('create')}
                    >
                      <i className="bi bi-calendar-plus me-2"></i>
                      {t('createEvent')}
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => onEventAction && onEventAction('join')}
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      {t('joinEvent')}
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
