import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HoOCSidebar from '../../components/HoOCSidebar';

const HoOCEditMilestone = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [milestone, setMilestone] = useState({
    name: '',
    date: '',
    status: '',
    description: ''
  });
  const [relatedTasks, setRelatedTasks] = useState([]);

  // Mock data cho milestone
  const mockMilestone = {
    id: 1,
    name: "Kickoff sự kiện",
    date: "2024-06-30",
    status: "Sắp tới",
    description: "Chào mừng tất cả mọi người, và đây là Halloween 2024! Để Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ibh, sit amet commodo nibh sapien sed nceptos himenaeos."
  };

  const mockRelatedTasks = [
    { id: 1, name: "Design new user dashboard", status: "Đã xong", color: "#10b981" },
    { id: 2, name: "Implement analytics tracking", status: "Đã xong", color: "#10b981" },
    { id: 3, name: "Mobile app optimization", status: "Đang làm", color: "#f59e0b" },
    { id: 4, name: "User testing and feedback", status: "Đang làm", color: "#f59e0b" },
    { id: 5, name: "Final deployment and launch", status: "Đang làm", color: "#f59e0b" }
  ];

  useEffect(() => {
    setMilestone(mockMilestone);
    setRelatedTasks(mockRelatedTasks);
  }, [id]);

  const handleInputChange = (field, value) => {
    setMilestone(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = () => {
    // Xử lý lưu thay đổi
    console.log('Saving milestone:', milestone);
    navigate(`/hooc-milestone-detail/${id}`);
  };

  const handleCancel = () => {
    navigate(`/hooc-milestone-detail/${id}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Đã xong": return "#10b981";
      case "Đang làm": return "#f59e0b";
      case "Chưa bắt đầu": return "#6b7280";
      default: return "#6b7280";
    }
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
              Edit Milestone Page
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
          {/* Header Actions */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 style={{ color: '#1f2937', fontWeight: '600', margin: 0 }}>
              Chi tiết cột mốc
            </h3>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-secondary"
                onClick={handleCancel}
                style={{ borderRadius: '8px' }}
              >
                Huỷ
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleSaveChanges}
                style={{ borderRadius: '8px' }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>

          <div className="row">
            {/* Left Panel - Milestone Details Form */}
            <div className="col-md-6">
              <div className="mb-4">
                <label className="form-label" style={{ color: '#374151', fontWeight: '500' }}>
                  Tên cột mốc <span className="text-danger">*</span>
                </label>
                <input 
                  type="text" 
                  className="form-control"
                  value={milestone.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={{ borderRadius: '8px' }}
                />
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ color: '#374151', fontWeight: '500' }}>
                  Ngày <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                  <input 
                    type="date" 
                    className="form-control"
                    value={milestone.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    style={{ borderRadius: '8px' }}
                  />
                  <i className="bi bi-calendar position-absolute" 
                     style={{ 
                       right: '12px', 
                       top: '50%', 
                       transform: 'translateY(-50%)',
                       color: '#6b7280'
                     }}
                  ></i>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ color: '#374151', fontWeight: '500' }}>
                  Trạng thái
                </label>
                <select 
                  className="form-select"
                  value={milestone.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  style={{ borderRadius: '8px' }}
                >
                  <option value="Sắp tới">Sắp tới</option>
                  <option value="Đang diễn ra">Đang diễn ra</option>
                  <option value="Đã hoàn thành">Đã hoàn thành</option>
                  <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label" style={{ color: '#374151', fontWeight: '500' }}>
                  Mô tả
                </label>
                <textarea 
                  className="form-control"
                  rows="6"
                  value={milestone.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  style={{ borderRadius: '8px' }}
                ></textarea>
              </div>
            </div>

            {/* Right Panel - Related Tasks */}
            <div className="col-md-6">
              <h4 style={{ color: '#1f2937', fontWeight: '600', marginBottom: '20px' }}>
                Các công việc liên quan ({relatedTasks.length})
              </h4>
              
              <div className="d-flex flex-column gap-3">
                {relatedTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="d-flex justify-content-between align-items-center p-3 border rounded-3"
                    style={{ border: '1px solid #e5e7eb' }}
                  >
                    <span style={{ color: '#374151', fontWeight: '500' }}>
                      {task.name}
                    </span>
                    <span 
                      className="badge px-3 py-2"
                      style={{ 
                        backgroundColor: task.color,
                        color: 'white',
                        fontSize: '0.9rem',
                        borderRadius: '20px'
                      }}
                    >
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoOCEditMilestone;
