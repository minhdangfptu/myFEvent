import { useState, useEffect } from 'react';
import UserSidebar from './UserSidebar';
import UserHeader from './UserHeader';
import UserFooter from './UserFooter';

export default function UserLayout({ 
  title, 
  children, 
  activePage = 'home',
  showSearch = false, 
  showEventAction = false,
  onSearch,
  onEventAction 
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
        <UserSidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          activePage={activePage}
        />

        {/* Main Content */}
        <div 
          className="flex-grow-1 d-flex flex-column"
          style={{ 
            marginLeft: sidebarOpen ? '250px' : '70px',
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
          <main className="flex-grow-1 p-4">
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <UserFooter />
    </div>
  );
}
