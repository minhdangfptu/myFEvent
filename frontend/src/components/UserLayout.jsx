import { useState, useEffect } from 'react';
import UserSidebar from './UserSidebar';
import HoOCSidebar from './HoOCSidebar';
import MemberSidebar from './MemberSidebar';
import UserHeader from './UserHeader';
import UserFooter from './UserFooter';

export default function UserLayout({ 
  title, 
  children, 
  activePage = 'home',
  showSearch = false, 
  showEventAction = false,
  onSearch,
  onEventAction,
  sidebarType = 'user' 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleToggleSidebar = () => {
      setSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggleSidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggleSidebar', handleToggleSidebar);
  }, []);

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <div className="d-flex flex-grow-1">
        {/* Sidebar */}
        {sidebarType === 'hooc' ? (
          <HoOCSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activePage={activePage}
          />
        ) : sidebarType === 'member' ? (
          <MemberSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            activePage={activePage}
          />
        ) : (
          <UserSidebar 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen}
            activePage={activePage}
          />
        )}

        {/* Main Content */}
        <div 
          className="flex-grow-1 d-flex flex-column"
          style={{ 
            marginLeft: sidebarOpen ? '230px' : '70px',
            transition: 'margin-left 0.3s ease'
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
          <main className="flex-grow-1 px-4 pb-4 pt-4">
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <UserFooter sidebarOpen={sidebarOpen} />
    </div>
  );
}
