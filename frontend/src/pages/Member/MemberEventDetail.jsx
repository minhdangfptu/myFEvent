import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { eventApi } from '../../apis/eventApi';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../../components/Loading';

export default function MemberEventDetail() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Thêm eventId vào URL query để sidebar đồng bộ
  useEffect(() => {
    if (!eventId) return;
    const params = new URLSearchParams(location.search);
    const currentEventId = params.get('eventId');
    if (!currentEventId || currentEventId !== eventId) {
      params.set('eventId', eventId);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  }, [eventId, location.search, location.pathname, navigate]);

  useEffect(() => {
    fetchEventDetail();
  }, [eventId]);

  const fetchEventDetail = async () => {
    try {
      setLoading(true);
      const response = await eventApi.getAllEventDetail(eventId);
      console.log('Event detail response:', response);
      
      // API returns { event, members } but we just need event for now
      if (response.data && response.data.event) {
        setEvent(response.data.event);
      } else {
        setError('Không tìm thấy thông tin sự kiện');
      }
    } catch (error) {
      console.error('Error fetching event detail:', error);
      if (error.response?.status === 403) {
        setError('Bạn không có quyền truy cập sự kiện này');
      } else if (error.response?.status === 404) {
        setError('Không tìm thấy sự kiện');
      } else {
        setError('Không thể tải thông tin sự kiện');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <UserLayout title="Chi tiết sự kiện" sidebarType="member">
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255,255,255,1)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Loading size={80} />
        </div>
      </UserLayout>
    );
  }

  if (error || !event) {
    return (
      <UserLayout title="Chi tiết sự kiện" sidebarType="member">
        <div className="alert alert-danger" role="alert">
          {error || 'Không tìm thấy sự kiện'}
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Chi tiết sự kiện" sidebarType="member">
      <style>{`
        .hero-section { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 3rem 0; 
          border-radius: 16px; 
          margin-bottom: 2rem;
        }
        .info-card { 
          background: white; 
          border-radius: 12px; 
          padding: 1.5rem; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
          margin-bottom: 1rem;
        }
        .status-badge { 
          padding: 0.25rem 0.75rem; 
          border-radius: 20px; 
          font-size: 0.75rem; 
          font-weight: 500;
        }
        .status-scheduled { background: #fbbf24; color: #92400e; }
        .status-ongoing { background: #10b981; color: #064e3b; }
        .status-completed { background: #6b7280; color: white; }
        .status-cancelled { background: #ef4444; color: white; }
        .membership-badge { 
          background: #3b82f6; 
          color: white; 
          padding: 0.25rem 0.75rem; 
          border-radius: 20px; 
          font-size: 0.75rem; 
          font-weight: 500;
        }
      `}</style>

      {/* Hero Section */}
      <div className="hero-section text-center">
        <h1 className="display-4 fw-bold mb-3">{event.name}</h1>
        <p className="lead">{event.description}</p>
        <div className="d-flex justify-content-center gap-3 mt-3">
          <span className={`status-badge status-${event.status}`}>
            {event.status === 'scheduled' ? 'Sắp diễn ra' :
             event.status === 'ongoing' ? 'Đang diễn ra' :
             event.status === 'completed' ? 'Đã kết thúc' :
             'Đã hủy'}
          </span>
          <span className="membership-badge">
            Thành viên
          </span>
        </div>
      </div>

      {/* Event Information */}
      <div className="row">
        <div className="col-md-8">
          <div className="info-card">
            <h5 className="fw-bold mb-3">Thông tin sự kiện</h5>
            <div className="row">
              <div className="col-md-6">
                <p><strong>Ngày tổ chức:</strong> {new Date(event.eventDate).toLocaleDateString('vi-VN')}</p>
                <p><strong>Địa điểm:</strong> {event.location || 'Chưa cập nhật'}</p>
                <p><strong>Đơn vị tổ chức:</strong> {event.organizerName?.fullName || event.organizerName || 'Chưa cập nhật'}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Loại sự kiện:</strong> {event.type === 'public' ? 'Công khai' : 'Riêng tư'}</p>
                <p><strong>Mã tham gia:</strong> {event.joinCode}</p>
                <p><strong>Trạng thái:</strong> 
                  <span className={`status-badge status-${event.status} ms-2`}>
                    {event.status === 'scheduled' ? 'Sắp diễn ra' :
                     event.status === 'ongoing' ? 'Đang diễn ra' :
                     event.status === 'completed' ? 'Đã kết thúc' :
                     'Đã hủy'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h5 className="fw-bold mb-3">Mô tả chi tiết</h5>
            <p>{event.description}</p>
          </div>
        </div>

        <div className="col-md-4">
          <div className="info-card">
            <h5 className="fw-bold mb-3">Thông tin</h5>
            <div className="d-flex justify-content-between mb-2">
              <span>Số thành viên:</span>
              <span className="fw-bold">{event.memberCount || 0}</span>
            </div>
            {/* <div className="d-flex justify-content-between mb-2">
              <span>Ngân sách:</span>
              <span className="fw-bold">{event.budget ? `${event.budget.toLocaleString()} VNĐ` : 'Chưa cập nhật'}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Chi tiêu:</span>
              <span className="fw-bold">{event.expenses ? `${event.expenses.toLocaleString()} VNĐ` : '0 VNĐ'}</span>
            </div> */}
          </div>

          <div className="info-card">
            <h5 className="fw-bold mb-3">Hành động</h5>
            <div className="d-grid gap-2">
              <button className="btn btn-outline-primary" onClick={() => navigate('/member-task')}>
                <i className="bi bi-list-task me-2"></i>
                Xem công việc
              </button>
              <button className="btn btn-outline-info" onClick={() => navigate('/member-calendar')}>
                <i className="bi bi-calendar me-2"></i>
                Lịch cá nhân
              </button>
              <button className="btn btn-outline-warning" onClick={() => navigate('/member-risk')}>
                <i className="bi bi-exclamation-triangle me-2"></i>
                Rủi ro
              </button>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
