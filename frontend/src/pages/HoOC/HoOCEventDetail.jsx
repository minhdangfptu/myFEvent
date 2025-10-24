import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import UserLayout from '../../components/UserLayout';
import { eventApi } from '../../apis/eventApi';

export default function HoOCEventDetail() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [event, setEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', organizerName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const [eventRes, membersRes] = await Promise.all([
        eventApi.getById(eventId),
        eventApi.getEventSummary(eventId)
      ]);
      
      setEvent(eventRes.data);
      setMembers(membersRes.data.members || []);
      setEditForm({
        name: eventRes.data.name || '',
        description: eventRes.data.description || '',
        organizerName: eventRes.data.organizerName || ''
      });
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Không thể tải thông tin sự kiện');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      await eventApi.updateEvent(eventId, {
        name: editForm.name,
        description: editForm.description,
        organizerName: editForm.organizerName
      });
      
      setEditing(false);
      await fetchEventDetails();
    } catch (error) {
      setError('Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác.')) {
      return;
    }
    
    try {
      await eventApi.deleteEvent(eventId);
      navigate('/hooc-landing');
    } catch (error) {
      setError('Xóa sự kiện thất bại');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Đã sao chép!');
  };

  if (loading) {
    return (
      <UserLayout title="Chi tiết sự kiện" sidebarType="hooc">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!event) {
    return (
      <UserLayout title="Chi tiết sự kiện" sidebarType="hooc">
        <div className="alert alert-danger">Không tìm thấy sự kiện</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Chi tiết sự kiện" sidebarType="hooc">
      <style>{`
        .event-header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; }
        .event-title { font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; }
        .event-stats { display: flex; gap: 1rem; flex-wrap: wrap; }
        .stat-item { background: rgba(255,255,255,0.2); padding: 0.75rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; }
        .tab-nav { border-bottom: 2px solid #e5e7eb; margin-bottom: 2rem; }
        .tab-btn { border: none; background: none; padding: 1rem 2rem; font-weight: 600; color: #6b7280; border-bottom: 3px solid transparent; }
        .tab-btn.active { color: #dc2626; border-bottom-color: #dc2626; }
        .info-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
        .info-card h5 { color: #374151; margin-bottom: 1rem; font-weight: 600; }
        .form-control { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.75rem; }
        .form-control:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
        .btn-danger { background: #dc2626; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; }
        .btn-danger:hover { background: #b91c1c; }
        .btn-outline-danger { border: 1px solid #dc2626; color: #dc2626; padding: 0.75rem 1.5rem; border-radius: 8px; }
        .btn-outline-danger:hover { background: #dc2626; color: white; }
        .member-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
        .copy-btn { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem; cursor: pointer; }
        .copy-btn:hover { background: #e5e7eb; }
      `}</style>

      {/* Event Header */}
      <div className="event-header">
        <h1 className="event-title">{event.name}</h1>
        <div className="event-stats">
          <div className="stat-item">
            <i className="bi bi-people"></i>
            <span>{members.length} thành viên</span>
          </div>
          <div className="stat-item">
            <i className="bi bi-person-plus"></i>
            <span>1 thành viên mới hôm nay</span>
          </div>
          <div className="stat-item">
            <i className="bi bi-calendar"></i>
            <span>Ngày tạo: {new Date(event.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="stat-item">
            <i className="bi bi-clock"></i>
            <span>D-Day: {new Date(event.eventDate).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Thông tin
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Cài đặt
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="row">
          <div className="col-lg-8">
            <div className="info-card">
              <h5>Thông tin sự kiện</h5>
              <div className="mb-3">
                <strong>Tên sự kiện:</strong> {event.name}
              </div>
              <div className="mb-3">
                <strong>Người tổ chức:</strong> {event.organizerName}
              </div>
              <div className="mb-3">
                <strong>Ngày diễn ra:</strong> {new Date(event.eventDate).toLocaleDateString('vi-VN')}
              </div>
              <div className="mb-3">
                <strong>Địa điểm:</strong> {event.location || 'Chưa cập nhật'}
              </div>
              <div className="mb-3">
                <strong>Trạng thái:</strong> 
                <span className={`badge ms-2 ${
                  event.status === 'scheduled' ? 'bg-warning' :
                  event.status === 'ongoing' ? 'bg-success' :
                  event.status === 'completed' ? 'bg-secondary' :
                  'bg-danger'
                }`}>
                  {event.status === 'scheduled' ? 'Sắp diễn ra' :
                   event.status === 'ongoing' ? 'Đang diễn ra' :
                   event.status === 'completed' ? 'Đã kết thúc' :
                   'Đã hủy'}
                </span>
              </div>
              <div>
                <strong>Mô tả:</strong>
                <p className="mt-2">{event.description || 'Chưa có mô tả'}</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
            <div className="info-card">
              <h5>Thành viên ({members.length})</h5>
              <div className="d-flex flex-wrap gap-2">
                {members.slice(0, 10).map((member, index) => (
                  <div key={index} className="member-avatar" title={member.userId?.fullName || 'Thành viên'}>
                    <i className="bi bi-person"></i>
                  </div>
                ))}
                {members.length > 10 && (
                  <div className="member-avatar">
                    <span className="small">+{members.length - 10}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="row">
          <div className="col-lg-8">
            {/* Event Details */}
            <div className="info-card">
              <h5>Chi tiết sự kiện</h5>
              <div className="mb-3">
                <label className="form-label fw-semibold">Tên sự kiện</label>
                <input
                  type="text"
                  className="form-control"
                  value={editing ? editForm.name : event.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  disabled={!editing}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Mô tả</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={editing ? editForm.description : event.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  disabled={!editing}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Người tổ chức</label>
                <input
                  type="text"
                  className="form-control"
                  value={editing ? editForm.organizerName : event.organizerName}
                  onChange={(e) => setEditForm({...editForm, organizerName: e.target.value})}
                  disabled={!editing}
                />
              </div>
              <div className="d-flex gap-2">
                {!editing ? (
                  <button className="btn btn-outline-danger" onClick={() => setEditing(true)}>
                    <i className="bi bi-pencil me-2"></i>Chỉnh sửa
                  </button>
                ) : (
                  <>
                    <button className="btn btn-danger" onClick={handleSave} disabled={submitting}>
                      {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => {
                      setEditing(false);
                      setEditForm({
                        name: event.name,
                        description: event.description,
                        organizerName: event.organizerName
                      });
                    }}>
                      Hủy
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Join Code */}
            <div className="info-card">
              <h5>Mã mời tham gia</h5>
              <div className="mb-3">
                <label className="form-label fw-semibold">Đường liên kết mời</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={`https://myfevent.vn/e/${event.joinCode}`}
                    readOnly
                  />
                  <button className="copy-btn" onClick={() => copyToClipboard(`https://myfevent.vn/e/${event.joinCode}`)}>
                    <i className="bi bi-copy"></i>
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Mã tham gia</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={event.joinCode}
                    readOnly
                  />
                  <button className="copy-btn" onClick={() => copyToClipboard(event.joinCode)}>
                    <i className="bi bi-copy"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Delete Event */}
            <div className="info-card">
              <h5>Xóa sự kiện</h5>
              <p className="text-muted small mb-3">
                Hành động này sẽ ảnh hưởng tới toàn bộ thành viên và không thể hoàn tác.
              </p>
              <button className="btn btn-danger" onClick={handleDelete}>
                <i className="bi bi-trash me-2"></i>Xóa sự kiện vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
