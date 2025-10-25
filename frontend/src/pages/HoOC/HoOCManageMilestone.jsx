import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HoOCSidebar from '../../components/HoOCSidebar';

const HoOCManageMilestone = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [milestones, setMilestones] = useState([]);
  const [hoveredMilestone, setHoveredMilestone] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data cho milestones
  const mockMilestones = [
    {
      id: 1,
      name: "Kickoff sự kiện",
      date: "5/9/2025",
      status: "Sắp tới",
      description: "Chào mừng tất cả mọi người, và đây là Halloween 2024! Để Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      relatedTasks: 7,
      position: 20
    },
    {
      id: 2,
      name: "Khởi công",
      date: "14/9",
      status: "Đã hoàn thành",
      description: "Bắt đầu các hoạt động chuẩn bị cho sự kiện",
      relatedTasks: 5,
      position: 40
    },
    {
      id: 3,
      name: "D-DAY",
      date: "1/11",
      status: "Đang diễn ra",
      description: "Ngày chính thức của sự kiện Halloween",
      relatedTasks: 12,
      position: 70
    },
    {
      id: 4,
      name: "Trả quyền lợi nhà tài trợ",
      date: "2/11",
      status: "Chưa bắt đầu",
      description: "Thực hiện các cam kết với nhà tài trợ",
      relatedTasks: 3,
      position: 80
    },
    {
      id: 5,
      name: "Tổng kết",
      date: "4/11",
      status: "Chưa bắt đầu",
      description: "Tổng kết và đánh giá sự kiện",
      relatedTasks: 4,
      position: 90
    }
  ];

  useEffect(() => {
    setMilestones(mockMilestones);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "Đã hoàn thành": return "#10b981";
      case "Đang diễn ra": return "#f59e0b";
      case "Sắp tới": return "#3b82f6";
      case "Chưa bắt đầu": return "#6b7280";
      default: return "#6b7280";
    }
  };

  const handleMilestoneHover = (milestone) => {
    setHoveredMilestone(milestone);
  };

  const handleMilestoneLeave = () => {
    setHoveredMilestone(null);
  };

  const handleEditMilestone = (milestoneId) => {
    navigate(`/hooc-edit-milestone/${milestoneId}`);
  };

  const handleViewDetails = (milestoneId) => {
    navigate(`/hooc-milestone-detail/${milestoneId}`);
  };

  const handleCreateMilestone = () => {
    setShowCreateModal(true);
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
              Manage Milestone Page
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

          {/* Event Timeline */}
          <div className="bg-white border rounded-3 p-4" style={{ border: '1px solid #e5e7eb' }}>
            <h4 className="text-danger mb-4" style={{ fontWeight: '600' }}>
              HALLOWEEN 2024
            </h4>
            
            {/* Timeline */}
            <div className="position-relative" style={{ height: '80px' }}>
              {/* Timeline line */}
              <div 
                className="position-absolute"
                style={{
                  top: '50%',
                  left: '0',
                  right: '0',
                  height: '3px',
                  backgroundColor: '#dc2626',
                  transform: 'translateY(-50%)'
                }}
              ></div>
              
              {/* Milestone markers */}
              {milestones.map((milestone) => (
                <div key={milestone.id}>
                  {/* Milestone marker */}
                  <div
                    className="position-absolute"
                    style={{
                      left: `${milestone.position}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#dc2626',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                    onMouseEnter={() => handleMilestoneHover(milestone)}
                    onMouseLeave={handleMilestoneLeave}
                  ></div>
                  
                  {/* Milestone label */}
                  <div
                    className="position-absolute text-center"
                    style={{
                      left: `${milestone.position}%`,
                      top: '70px',
                      transform: 'translateX(-50%)',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      color: '#374151',
                      minWidth: '80px'
                    }}
                  >
                    <div>{milestone.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                      {milestone.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hover Popup */}
          {hoveredMilestone && (
            <div
              className="position-absolute bg-white border rounded-3 shadow-lg p-3"
              style={{
                left: `${hoveredMilestone.position}%`,
                top: '200px',
                transform: 'translateX(-50%)',
                minWidth: '280px',
                zIndex: 1000,
                border: '1px solid #e5e7eb'
              }}
              onMouseEnter={() => handleMilestoneHover(hoveredMilestone)}
              onMouseLeave={handleMilestoneLeave}
            >
              <h5 className="mb-2" style={{ color: '#1f2937', fontWeight: '600' }}>
                {hoveredMilestone.name}
              </h5>
              
              <div className="mb-2">
                <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Ngày: </span>
                <span style={{ fontWeight: '500' }}>{hoveredMilestone.date}</span>
              </div>
              
              <div className="mb-2">
                <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Trạng thái: </span>
                <span 
                  className="badge"
                  style={{ 
                    backgroundColor: getStatusColor(hoveredMilestone.status),
                    color: 'white',
                    fontSize: '0.8rem'
                  }}
                >
                  {hoveredMilestone.status}
                </span>
              </div>
              
              <p className="mb-2" style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                {hoveredMilestone.description}
              </p>
              
              <div className="mb-3">
                <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Các công việc liên quan: {hoveredMilestone.relatedTasks} công việc
                </span>
              </div>
              
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handleEditMilestone(hoveredMilestone.id)}
                  style={{ fontSize: '0.8rem' }}
                >
                  Chỉnh sửa
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleViewDetails(hoveredMilestone.id)}
                  style={{ fontSize: '0.8rem' }}
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoOCManageMilestone;

