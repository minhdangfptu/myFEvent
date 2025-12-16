import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';

const HoOCManageMilestoneEmpty = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  

  const handleCreateMilestone = () => {
    // Chuyển đến trang tạo cột mốc mới
    navigate('/hooc-create-milestone');
  };

  return (
    <UserLayout title="Manage Milestone Page - Empty" sidebarType="hooc" activePage="work-timeline" eventId={eventId}>
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
    </UserLayout>
  );
};

export default HoOCManageMilestoneEmpty;

