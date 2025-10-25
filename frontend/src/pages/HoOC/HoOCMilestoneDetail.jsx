import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import HoOCSidebar from '../../components/HoOCSidebar';

const HoOCMilestoneDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [milestone, setMilestone] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // Mock data cho milestone
  const mockMilestone = {
    id: 1,
    name: "Kickoff sự kiện",
    date: "5/9/2025",
    status: "Sắp tới",
    description: "Chào mừng tất cả mọi người, và đây là Halloween 2024! Để Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ibh, sit amet commodo nibh sapien sed nceptos himenaeos.",
    relatedTasks: [
      { id: 1, name: "Finalize product feature specifications", status: "Đã xong", color: "#10b981" },
      { id: 2, name: "Complete user interface design mockups", status: "Đã xong", color: "#10b981" },
      { id: 3, name: "Develop core application functionality", status: "Đang làm", color: "#f59e0b" },
      { id: 4, name: "Conduct comprehensive quality assurance testing", status: "Chưa bắt đầu", color: "#6b7280" },
      { id: 5, name: "Prepare marketing and launch materials", status: "Đang làm", color: "#f59e0b" },
      { id: 6, name: "Set up production deployment infrastructure", status: "Chưa bắt đầu", color: "#6b7280" },
      { id: 7, name: "Execute go-to-market strategy", status: "Chưa bắt đầu", color: "#6b7280" }
    ]
  };

  useEffect(() => {
    setMilestone(mockMilestone);
    setDeleteConfirmName(mockMilestone.name);
  }, [id]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Đã xong": return "#10b981";
      case "Đang làm": return "#f59e0b";
      case "Chưa bắt đầu": return "#6b7280";
      default: return "#6b7280";
    }
  };

  const handleEditMilestone = () => {
    navigate(`/hooc-edit-milestone/${id}`);
  };

  const handleDeleteMilestone = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmName === milestone.name) {
      // Xử lý xóa milestone
      console.log('Deleting milestone:', milestone.id);
      navigate('/hooc-manage-milestone');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmName(milestone.name);
  };

  if (!milestone) {
    return <div>Loading...</div>;
  }

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
              Milestone Detail Page
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
          {/* Milestone Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 style={{ color: '#1f2937', fontWeight: '600', margin: 0 }}>
              {milestone.name}
            </h3>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary d-flex align-items-center"
                onClick={handleEditMilestone}
                style={{ borderRadius: '8px' }}
              >
                <i className="bi bi-pencil me-2"></i>
                Sửa cột mốc
              </button>
              <button 
                className="btn btn-outline-danger d-flex align-items-center"
                onClick={handleDeleteMilestone}
                style={{ borderRadius: '8px' }}
              >
                <i className="bi bi-trash me-2"></i>
                Xoá cột mốc
              </button>
            </div>
          </div>

          {/* Milestone Info Card */}
          <div className="bg-white border rounded-3 p-4 mb-4" style={{ border: '1px solid #e5e7eb' }}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Ngày: </span>
                  <span style={{ fontWeight: '500', fontSize: '1rem' }}>{milestone.date}</span>
                </div>
                
                <div className="mb-3">
                  <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Trạng thái: </span>
                  <span 
                    className="badge px-3 py-2"
                    style={{ 
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      fontSize: '0.9rem',
                      borderRadius: '20px'
                    }}
                  >
                    <span 
                      className="rounded-circle me-2"
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        backgroundColor: '#f59e0b',
                        display: 'inline-block'
                      }}
                    ></span>
                    {milestone.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-3">
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Mô tả: </span>
              <p className="mt-2" style={{ color: '#4b5563', lineHeight: '1.6' }}>
                {milestone.description}
              </p>
            </div>
          </div>

          {/* Related Tasks */}
          <div>
            <h4 style={{ color: '#1f2937', fontWeight: '600', marginBottom: '20px' }}>
              Công việc liên quan ({milestone.relatedTasks.length})
            </h4>
            
            <div className="d-flex flex-column gap-3">
              {milestone.relatedTasks.map((task) => (
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            zIndex: 1050 
          }}
        >
          <div 
            className="bg-white rounded-3 p-4"
            style={{ 
              minWidth: '400px',
              maxWidth: '500px',
              border: '1px solid #e5e7eb'
            }}
          >
            <div className="d-flex align-items-center mb-3">
              <i className="bi bi-exclamation-triangle-fill text-danger me-2" style={{ fontSize: '1.2rem' }}></i>
              <h5 className="mb-0" style={{ color: '#1f2937', fontWeight: '600' }}>
                Xoá cột mốc
              </h5>
            </div>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Hành động này sẽ xoá vĩnh viễn cột mốc này và không thể hoàn tác.
            </p>
            
            <div className="mb-3">
              <label className="form-label" style={{ color: '#374151', fontWeight: '500' }}>
                Tên cột mốc
              </label>
              <input 
                type="text" 
                className="form-control"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Nhập tên cột mốc để xác nhận"
                style={{ borderRadius: '8px' }}
              />
            </div>
            
            <div className="d-flex justify-content-end gap-2">
              <button 
                className="btn btn-outline-secondary"
                onClick={handleCancelDelete}
                style={{ borderRadius: '8px' }}
              >
                Huỷ
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmName !== milestone.name}
                style={{ borderRadius: '8px' }}
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HoOCMilestoneDetail;
