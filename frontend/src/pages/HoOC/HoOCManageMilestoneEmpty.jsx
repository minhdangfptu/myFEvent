import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HoOCSidebar from '../../components/HoOCSidebar';

const HoOCManageMilestoneEmpty = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleCreateMilestone = () => {
    // Chuyển đến trang tạo cột mốc mới
    navigate('/hooc-create-milestone');
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HoOCSidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        activePage="work-timeline"
      />
      
      <div 
        className="flex-grow-1" 
        style={{ 
          marginLeft: sidebarOpen ? '230px' : '70px',
          transition: 'margin-left 0.3s ease',
          padding: '20px'
        }}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1" style={{ color: '#1f2937', fontWeight: '600' }}>
              Manage Milestone Page - Empty
            </h2>
            <div className="d-flex align-items-center">
              <i className="bi bi-list me-2" style={{ color: '#6b7280' }}></i>
              <img 
                src="/website-icon-fix@3x.png" 
                alt="myFEvent" 
                style={{ width: 24, height: 24, marginRight: '8px' }}
              />
              <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1.2rem' }}>
                myFEvent
              </span>
            </div>
          </div>
          
          <div className="d-flex align-items-center">
            <i className="bi bi-bell me-3" style={{ fontSize: '1.2rem', color: '#6b7280' }}></i>
            <i className="bi bi-person-circle" style={{ fontSize: '1.5rem', color: '#6b7280' }}></i>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3 shadow-sm" style={{ padding: '30px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 style={{ color: '#dc2626', fontWeight: '600', margin: 0 }}>
              Cột mốc sự kiện
            </h3>
            <button 
              className="btn btn-danger d-flex align-items-center"
              onClick={handleCreateMilestone}
              style={{ 
                backgroundColor: '#dc2626', 
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontWeight: '500'
              }}
            >
              <i className="bi bi-plus-lg me-2"></i>
              TẠO CỘT MỐC MỚI
            </button>
          </div>

          {/* Empty State */}
          <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
            {/* Sad Face Icon */}
            <div 
              className="d-flex align-items-center justify-content-center mb-4"
              style={{
                width: '120px',
                height: '120px',
                backgroundColor: '#f3f4f6',
                borderRadius: '50%',
                border: '2px solid #e5e7eb'
              }}
            >
              <div style={{ fontSize: '3rem', color: '#9ca3af' }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {/* Eyes */}
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    left: '15px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#9ca3af',
                    borderRadius: '50%'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#9ca3af',
                    borderRadius: '50%'
                  }}></div>
                  
                  {/* Mouth */}
                  <div style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '20px',
                    height: '10px',
                    borderBottom: '2px solid #9ca3af',
                    borderRadius: '0 0 20px 20px'
                  }}></div>
                </div>
              </div>
            </div>

            {/* Empty Message */}
            <h4 style={{ color: '#6b7280', fontWeight: '500', marginBottom: '0' }}>
              Oops, chưa có cột mốc nào hết, hãy tạo cột mốc đầu tiên!
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoOCManageMilestoneEmpty;

