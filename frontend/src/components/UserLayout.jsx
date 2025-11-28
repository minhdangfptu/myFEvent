import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import HoOCSidebar from './HoOCSidebar';
import MemberSidebar from './MemberSidebar';
import UserHeader from './UserHeader';
import UserFooter from './UserFooter';
import HoDSideBar from './HoDSideBar';
import { getEventIdFromUrl } from '../utils/getEventIdFromUrl';
import AdminSidebar from './AdminSideBar';

export default function UserLayout({
  title,
  children,
  activePage = 'home',
  showSearch = false,
  showEventAction = false,
  onSearch,
  onEventAction,
  sidebarType = 'user',
  eventId
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // Lấy eventId từ URL nếu không được truyền từ props
  const currentEventId = eventId || getEventIdFromUrl(location.pathname, location.search);

  // Normalize sidebarType to lowercase for comparison
  const normalizedSidebarType = String(sidebarType || 'user').toLowerCase();

  useEffect(() => {
    const handleToggleSidebar = () => {
      setSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggleSidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggleSidebar', handleToggleSidebar);
  }, []);

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', overflowX: 'hidden' }}>
      <div className="d-flex flex-grow-1" style={{ overflowX: 'hidden' }}>
        {normalizedSidebarType === 'hooc' ? (
          <HoOCSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activePage={activePage}
            eventId={currentEventId}
          />
        ) : normalizedSidebarType === 'member' ? (
          <MemberSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activePage={activePage}
            eventId={currentEventId}
          />
        ) : normalizedSidebarType === 'hod' ? (
          <HoDSideBar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activePage={activePage}
            eventId={currentEventId}
          />
        ) : normalizedSidebarType === 'admin'? (
          <AdminSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activePage={activePage}
          />
        ) : (
          <UserSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activePage={activePage}
            eventId={currentEventId}
          />
        )}

        {/* Main Content */}
        <div
          className="flex-grow-1 d-flex flex-column"
          style={{
            marginLeft: sidebarOpen ? '230px' : '70px',
            transition: 'margin-left 0.3s ease',
            overflowX: 'hidden',
            maxWidth: '100%'
          }}
        >
          {/* Header */}
          <UserHeader
            title={title}
            showSearch={showSearch}
            showEventAction={showEventAction}
            onSearch={onSearch}
            onEventAction={onEventAction}
          />

          {/* Main Content Area */}
          <main style={{ minHeight: '85vh', overflowX: 'hidden' }} className="flex-grow-1 px-4 pb-4 pt-4">
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <UserFooter sidebarOpen={sidebarOpen} />
    </div>
  );
}