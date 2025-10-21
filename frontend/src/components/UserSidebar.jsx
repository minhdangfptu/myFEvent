import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { eventApi } from '../apis/eventApi';

export default function UserSidebar({ sidebarOpen, setSidebarOpen, activePage = 'home' }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const menuItems = useMemo(() => ([
    { id: 'home',     icon: 'bi-house-door',            label: t('nav.home'),     path: user?.role === 'HoOC' ? '/hooc-landing-page' : '/user-landing-page' },
    { id: 'members',  icon: 'bi-people',                label: t('nav.members'),  path: '/member' },
    { id: 'stats',    icon: 'bi-bar-chart',             label: t('nav.stats'),    path: '/dashboard' },
    { id: 'calendar', icon: 'bi-calendar',              label: t('nav.calendar'), path: '/calendar' },
    { id: 'task',     icon: 'bi-clipboard-check',       label: t('nav.task'),     path: '/task' },
    { id: 'risk',     icon: 'bi-exclamation-triangle',  label: t('nav.risk'),     path: '/risk' },
    { id: 'documents',icon: 'bi-file-text',             label: t('nav.documents'),path: '/documents' },
  ]), [t]);

  // === Sự kiện: đóng mặc định + nhớ trạng thái ===
  const [eventsOpen, setEventsOpen] = useState(() => {
    const saved = localStorage.getItem('eventsOpen');
    return saved === null ? false : saved === 'true';
  });
  useEffect(() => {
    localStorage.setItem('eventsOpen', String(eventsOpen));
  }, [eventsOpen]);

  // Tự đóng khi thu gọn sidebar
  useEffect(() => {
    if (!sidebarOpen) setEventsOpen(false);
  }, [sidebarOpen]);

  const [activeEventId, setActiveEventId] = useState(null);
  const [myEvents, setMyEvents] = useState([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await eventApi.listMyEvents();
        if (!ignore) setMyEvents(res.data || []);
      } catch {}
    })();
    return () => { ignore = true };
  }, []);

  const settingItems = [
    { id: 'notifications', icon: 'bi-bell', label: t('nav.notifications'), path: '/notifications' },
    { id: 'settings',      icon: 'bi-gear', label: t('nav.settings'),       path: '/setting' }
  ];

  // Tách menu để render nhóm "Sự kiện" ngay sau Calendar
  const calendarIndex = menuItems.findIndex(mi => mi.id === 'calendar');
  const beforeCalendar = menuItems.slice(0, calendarIndex + 1);
  const afterCalendar  = menuItems.slice(calendarIndex + 1);

  return (
    <div
      className={`bg-white shadow-sm ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
      style={{
        width: sidebarOpen ? '250px' : '70px',
        minHeight: '100vh',
        transition: 'width 0.3s ease',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1000
      }}
    >
      <style>{`
        /* Nền đỏ nhạt cho trạng thái active */
        .active-red {
          background: #fee2e2 !important;  /* red-100 */
          color: #991b1b !important;       /* red-900 */
        }
        .btn-nav {
          border: 0;
          background: transparent;
          color: #111827;                  /* gray-900 */
          border-radius: 12px;
          padding: 8px 10px;
          text-align: left;
          transition: background .15s ease, color .15s ease;
        }
        .btn-nav:hover { background: #f3f4f6; } /* gray-100 */

        /* Nhánh sự kiện */
        .events-branch { position: relative; margin-left: 20px; }
        .events-branch::before {
          content: '';
          position: absolute;
          left: -14px; top: 6px; bottom: 6px;
          width: 2px; background: #e5e7eb; /* gray-200 */
          border-radius: 1px;
        }
        .btn-event {
          border: 0;
          background: transparent;
          color: #374151;                  /* gray-700 */
          border-radius: 12px;
          padding: 6px 10px;
          text-align: left;
          transition: background .15s ease, color .15s ease;
        }
        .btn-event:hover { background: #f3f4f6; } /* gray-100 */

        .group-title {
          font-size: 0.78rem;
          letter-spacing: .04em;
          color: #6b7280;                  /* gray-500 */
          margin: 14px 0 10px;
        }
      `}</style>

      <div className="p-3">
        {/* Logo */}
        <div className="d-flex align-items-center mb-4">
          <img src="/website-icon-fix@3x.png" alt="myFEvent" style={{ width: 40, height: 40 }} />
          {sidebarOpen && <span className="ms-2 fw-bold text-dark">MYFEVENT</span>}
        </div>

        {/* NAV: CHÍNH */}
        <div className="mb-4">
          <h6 className="group-title">{t('sections.main')}</h6>

          {/* Tới hết Calendar */}
          <div className="d-flex flex-column gap-2">
            {beforeCalendar.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  className={`btn btn-nav d-flex align-items-center ${isActive ? 'active-red' : ''}`}
                  onClick={() => (window.location.href = item.path)}
                  title={item.label}
                >
                  <i className={`${item.icon} me-2`} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* === Sự kiện: ngay sau Calendar (chỉ hiện nếu có sự kiện đã/đang tham gia) === */}
          {myEvents.length > 0 && (
          <div className="mt-2">
            <button
              className="btn btn-nav d-flex align-items-center justify-content-between w-100"
              onClick={() => setEventsOpen(prev => !prev)}
              title={t('nav.events')}
            >
              <span className="d-flex align-items-center">
                <i className="bi bi-graph-up me-2" />
                {sidebarOpen && <span className="fw-semibold">{t('nav.events')}</span>}
                {!sidebarOpen && <span />}
              </span>
              {sidebarOpen && (
                <i className={`bi ${eventsOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
              )}
            </button>

            {eventsOpen && (
              <div className={`mt-2 ${sidebarOpen ? 'events-branch' : ''}`}>
                <div className="d-flex flex-column gap-2">
                  {myEvents.map(ev => {
                    const isActiveEvent = activeEventId === String(ev._id);
                    return (
                      <button
                        key={ev._id}
                        className={`btn btn-event text-start ${isActiveEvent ? 'active-red' : ''}`}
                        onClick={() => {
                          setActiveEventId(String(ev._id));
                          window.location.href = `/event-detail?id=${ev._id}`;
                        }}
                        title={ev.name}
                      >
                        {ev.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Sau Calendar (Task, Risk, Documents) */}
          <div className="mt-3 d-flex flex-column gap-2">
            {afterCalendar.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  className={`btn btn-nav d-flex align-items-center ${isActive ? 'active-red' : ''}`}
                  onClick={() => (window.location.href = item.path)}
                  title={item.label}
                >
                  <i className={`${item.icon} me-2`} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* CÀI ĐẶT */}
        <div className="mb-4">
          <h6 className="group-title">{t('sections.settings')}</h6>
          <div className="d-flex flex-column gap-2">
            {settingItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  className={`btn btn-nav d-flex align-items-center ${isActive ? 'active-red' : ''}`}
                  onClick={() => (window.location.href = item.path)}
                  title={item.label}
                >
                  <i className={`${item.icon} me-2`} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
