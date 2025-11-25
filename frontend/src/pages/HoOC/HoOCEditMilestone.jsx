import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { milestoneService } from '../../services/milestoneService';
import { formatDateForInput } from '~/utils/formatDate';
import { toast } from 'react-toastify';
import Loading from '../../components/Loading';

const HoOCEditMilestone = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId, id } = useParams();
  const [milestone, setMilestone] = useState({
    name: '',
    date: '',
    description: ''
  });
  const [relatedTasks, setRelatedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // mounted ref to avoid state updates after unmount (navigate)
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; }
  }, []);

  useEffect(() => {
    // Kiểm tra xem có data từ navigation state không
    const stateData = location.state;
    
    if (stateData && stateData.milestone) {
      // Sử dụng data từ milestone detail
      setMilestone({
        name: stateData.milestone.name || '',
        date: stateData.milestone.date || '',
        description: stateData.milestone.description || ''
      });
      setRelatedTasks(stateData.relatedTasks || []);
      setLoading(false);
    } else {
      // Fallback: gọi API nếu không có data từ state
      async function fetchMilestoneDetail() {
        try {
          setLoading(true);
          const response = await milestoneService.getMilestoneDetail(eventId, id);
          setMilestone({
            name: response.name || '',
            date: response.date || '',
            description: response.description || ''
          });
          setRelatedTasks(response.relatedTasks || []);
        } catch (error) {
          console.error('Error fetching milestone detail:', error);
        } finally {
          setLoading(false);
        }
      }
      fetchMilestoneDetail();
    }
  }, [eventId, id, location.state]);

  const handleInputChange = (field, value) => {
    setMilestone(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    setActionLoading(true);
    try {
      await milestoneService.updateMilestone(eventId, id, milestone);
      toast.success('Cập nhật cột mốc thành công');
      navigate(`/events/${eventId}/hooc-milestone-detail/${id}`);
      // no immediate setActionLoading(false) here because navigate will unmount
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast.error('Cập nhật cột mốc thất bại');
    } finally {
      if (mountedRef.current) setActionLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/events/${eventId}/hooc-milestone-detail/${id}`);
  };

  const getTaskStatusLabel = (status) => {
    switch (status) {
      case "todo": return "Chưa bắt đầu";
      case "in_progress": return "Đang làm";
      case "blocked": return "Bị chặn";
      case "done": return "Đã hoàn thành";
      case "cancelled": return "Đã hủy";
      default: return "Chưa bắt đầu";
    }
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case "todo": return "#6b7280";
      case "in_progress": return "#f59e0b";
      case "blocked": return "#dc2626";
      case "done": return "#10b981";
      case "cancelled": return "#6b7280";
      default: return "#6b7280";
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <UserLayout title="Edit Milestone" sidebarType="hooc" activePage="work-timeline">
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,255,255,0.75)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Loading />
        </div>
      )}

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
              disabled={actionLoading}
            >
              {actionLoading ? <Loading size={14} /> : 'Huỷ'}
            </button>
            <button 
              className="btn btn-danger"
              onClick={handleSaveChanges}
              style={{ borderRadius: '8px' }}
              disabled={actionLoading}
            >
              {actionLoading ? <Loading size={14} /> : 'Lưu thay đổi'}
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
                  value={formatDateForInput(milestone.date)}
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
                      backgroundColor: getTaskStatusColor(task.status),
                      color: 'white',
                      fontSize: '0.9rem',
                      borderRadius: '20px'
                    }}
                  >
                    {getTaskStatusLabel(task.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default HoOCEditMilestone;

