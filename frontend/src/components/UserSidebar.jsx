import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UserSidebar({ sidebarOpen, setSidebarOpen, activePage = 'home' }) {
  const { logout } = useAuth();

  const menuItems = [
    { id: 'home', icon: 'bi-house-door', label: 'Trang chủ', path: '/user-landing-page' },
    { id: 'profile', icon: 'bi-person', label: 'Hồ sơ', path: '/user-profile' },
    { id: 'members', icon: 'bi-people', label: 'Thành viên', path: '/member' },
    { id: 'documents', icon: 'bi-file-text', label: 'Tài liệu', path: '/documents' },
    { id: 'calendar', icon: 'bi-calendar', label: 'Lịch', path: '/calendar' },
    { id: 'task', icon: 'bi-clipboard-check', label: 'Công việc', path: '/task' },
    { id: 'risk', icon: 'bi-exclamation-triangle', label: 'Rủi ro', path: '/risk' },
    { id: 'stats', icon: 'bi-bar-chart', label: 'Số liệu', path: '/dashboard' }
  ];

  const settingItems = [
    { id: 'notifications', icon: 'bi-bell', label: 'Thông báo', path: '/notifications' },
    { id: 'settings', icon: 'bi-gear', label: 'Cài đặt', path: '/setting' }
  ];

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
      <div className="p-3">
        {/* Logo */}
        <div className="d-flex align-items-center mb-4">
          <img src="/logo-03.png" alt="myFEvent" style={{ width: '40px', height: '40px' }} />
          {sidebarOpen && (
            <span className="ms-2 fw-bold text-dark">myFEvent</span>
          )}
        </div>

        {/* Navigation */}
        <div className="mb-4">
          <h6 className="text-muted small mb-3">CHÍNH</h6>
          <div className="d-flex flex-column gap-2">
            {menuItems.map((item) => (
              <button 
                key={item.id}
                className={`btn btn-outline-light text-dark d-flex align-items-center p-2 border-0 ${
                  activePage === item.id ? 'bg-light' : ''
                }`}
                onClick={() => window.location.href = item.path}
              >
                <i className={`${item.icon} me-2`}></i>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h6 className="text-muted small mb-3">CÀI ĐẶT</h6>
          <div className="d-flex flex-column gap-2">
            {settingItems.map((item) => (
              <button 
                key={item.id}
                className={`btn btn-outline-light text-dark d-flex align-items-center p-2 border-0 ${
                  activePage === item.id ? 'bg-primary' : ''
                }`}
                onClick={() => window.location.href = item.path}
              >
                <i className={`${item.icon} me-2`}></i>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
