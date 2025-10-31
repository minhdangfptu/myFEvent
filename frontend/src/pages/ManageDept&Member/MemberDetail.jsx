import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { eventApi } from '../../apis/eventApi';
import Loading from '../../components/Loading';
import { useEvents } from '../../contexts/EventContext';
import { toast } from 'react-toastify';
import { eventService } from '~/services/eventService';

export default function MemberProfilePage() {
  const { eventId, memberId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventRole, setEventRole] = useState('');
  const [memberStats, setMemberStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    joinedDate: null,
  });
  const { fetchEventRole } = useEvents();

  // Get member data from navigation state if available
  const memberFromState = location.state?.member;

  useEffect(() => {
    fetchEventRole(eventId).then(role => {
      setEventRole(role);
    });
  }, [eventId]);

  const getSidebarType = () => {
    if (eventRole === 'HoOC') return 'HoOC';
    if (eventRole === 'HoD') return 'HoD';
    if (eventRole === 'Member') return 'Member';
    return 'user';
  };

  useEffect(() => {
    const fetchMemberProfile = async () => {
      try {
        setLoading(true);
        
        // If member data passed via state, use it
        if (memberFromState) {
          setMember(memberFromState);
          setLoading(false);
          return;
        }

        const response = await eventService.getMemberDetail(eventId, memberId);
        console.log('Member profile response:', response);
        
        if (response.data) {
          setMember(response.data.member || response.data);
          if (response.data.stats) {
            setMemberStats(response.data.stats);
          }
        } else {
          setError('Không tìm thấy thông tin thành viên');
        }
      } catch (err) {
        console.error('Error fetching member profile:', err);
        if (err.response?.status === 403) {
          setError('Bạn không có quyền xem thông tin này');
        } else if (err.response?.status === 404) {
          setError('Không tìm thấy thành viên');
        } else {
          setError('Không thể tải thông tin thành viên');
        }
      } finally {
        setLoading(false);
      }
    };

    if (eventId && (memberId || memberFromState)) {
      fetchMemberProfile();
    }
  }, [eventId, memberId, memberFromState]);

  // Handle role change
  const handleChangeRole = async (newRole) => {
    try {
      await eventApi.updateMemberRole(eventId, member._id || member.id, newRole);
      setMember(prev => ({ ...prev, role: newRole }));
      toast.success('Cập nhật vai trò thành công!');
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Không thể thay đổi vai trò');
    }
  };

  // Handle remove member
  const handleRemoveMember = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${member.name || member.fullName} khỏi sự kiện?`)) {
      return;
    }

    try {
      await eventApi.removeMemberFromEvent(eventId, member._id || member.id);
      toast.success('Đã xóa thành viên khỏi sự kiện');
      navigate(`/events/${eventId}/members`);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Không thể xóa thành viên');
    }
  };

  if (loading) {
    return (
      <UserLayout title="Thông tin thành viên" sidebarType={getSidebarType()} activePage="members">
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

  if (error || !member) {
    return (
      <UserLayout title="Thông tin thành viên" sidebarType={getSidebarType()} activePage="members">
        <div className="container-fluid" style={{ maxWidth: 1100 }}>
          <div className="alert alert-danger" role="alert">
            {error || 'Không tìm thấy thông tin thành viên'}
          </div>
          <button 
            className="btn btn-outline-primary"
            onClick={() => navigate(`/events/${eventId}/members`)}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Quay lại danh sách
          </button>
        </div>
      </UserLayout>
    );
  }

  const memberName = member.name || member.fullName || member.userId?.fullName || 'Không rõ tên';
  const memberEmail = member.email || member.userId?.email || '';
  const memberAvatar = member.avatar || member.avatarUrl || member.userId?.avatarUrl || `https://i.pravatar.cc/120?u=${memberEmail}`;
  const memberRole = member.role || 'Member';
  const memberDepartment = member.department || member.departmentName || member.dept || 'Chưa có ban';
  const memberPhone = member.phoneNumber || member.phone || member.userId?.phoneNumber || '';
  const memberStudentId = member.studentId || member.userId?.studentId || '';
  const memberBio = member.bio || member.userId?.bio || '';

  // Check if current user can manage this member
  const canManage = eventRole === 'HoOC' || eventRole === 'HoD';

  return (
    <UserLayout 
      title="Thông tin thành viên" 
      sidebarType={getSidebarType()} 
      activePage="members"
    >
      <style>{`
        .profile-header {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: white;
          padding: 2.5rem 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
        }
        .profile-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }
        .profile-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid white;
          object-fit: cover;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .profile-card {
          background: white;
          border-radius: 16px;
          padding: 1.75rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          margin-bottom: 1.5rem;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .profile-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .role-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .role-hooc {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }
        .role-hod {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }
        .role-member {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }
        .info-row {
          display: flex;
          padding: 1rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          width: 140px;
          color: #6b7280;
          font-weight: 500;
          flex-shrink: 0;
        }
        .info-value {
          color: #1f2937;
          font-weight: 400;
          flex: 1;
        }
        .stat-card {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          border: 1px solid #e5e7eb;
        }
        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #EF4444;
          margin-bottom: 0.5rem;
        }
        .stat-label {
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .action-btn {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .action-btn-primary {
          background: #EF4444;
          color: white;
        }
        .action-btn-primary:hover {
          background: #DC2626;
        }
        .action-btn-secondary {
          background: #f3f4f6;
          color: #6b7280;
        }
        .action-btn-secondary:hover {
          background: #e5e7eb;
        }
        .action-btn-danger {
          background: #fee2e2;
          color: #ef4444;
        }
        .action-btn-danger:hover {
          background: #fecaca;
        }
        .badge-status {
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .badge-active {
          background: #d1fae5;
          color: #065f46;
        }
        .badge-verified {
          background: #dbeafe;
          color: #1e40af;
        }
      `}</style>

      <div className="container-fluid" style={{ maxWidth: 1100 }}>
        {/* Back Button */}
        <button 
          className="btn btn-outline-secondary mb-3"
          onClick={() => navigate(`/events/${eventId}/members`)}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Quay lại danh sách thành viên
        </button>

        {/* Profile Header */}
        <div className="profile-header">
          <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
            <div className="col-auto">
              <img 
                src={memberAvatar}
                alt={memberName}
                className="profile-avatar"
              />
            </div>
            <div className="col">
              <h2 className="mb-2 fw-bold">{memberName}</h2>
              <p className="mb-3 opacity-75">{memberEmail}</p>
              <div className="d-flex gap-2 flex-wrap">
                <span className={`role-badge role-${memberRole.toLowerCase()}`}>
                  {memberRole === 'HoOC' ? 'Trưởng BTC' :
                   memberRole === 'HoD' ? 'Trưởng Ban' :
                   'Thành viên'}
                </span>
                <span className="badge-status badge-active">
                  <i className="bi bi-check-circle me-1"></i>
                  Hiệu cần
                </span>
                <span className="badge-status badge-verified">
                  <i className="bi bi-patch-check me-1"></i>
                  Vẫn hoá
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Left Column - Member Info */}
          <div className="col-lg-7">
            <div className="profile-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">
                  <i className="bi bi-person-circle me-2 text-danger"></i>
                  Thông tin cá nhân
                </h5>
              </div>
              
              <div className="info-row">
                <div className="info-label">Vai trò</div>
                <div className="info-value">
                  <span className={`role-badge role-${memberRole.toLowerCase()}`}>
                    {memberRole === 'HoOC' ? 'Trưởng BTC' :
                     memberRole === 'HoD' ? 'Trưởng Ban' :
                     'Thành viên'}
                  </span>
                </div>
              </div>

              <div className="info-row">
                <div className="info-label">Sinh viên</div>
                <div className="info-value">{memberStudentId || 'Chưa cập nhật'}</div>
              </div>

              <div className="info-row">
                <div className="info-label">Email</div>
                <div className="info-value">{memberEmail}</div>
              </div>

              <div className="info-row">
                <div className="info-label">Số điện thoại</div>
                <div className="info-value">{memberPhone || 'Chưa cập nhật'}</div>
              </div>
            </div>

            {memberBio && (
              <div className="profile-card">
                <h5 className="fw-bold mb-3">
                  <i className="bi bi-file-text me-2 text-danger"></i>
                  Bio
                </h5>
                <p className="text-muted mb-0">{memberBio}</p>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Stats */}
          <div className="col-lg-5">
            {/* Department Info */}
            <div className="profile-card">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-building me-2 text-danger"></i>
                Thông tin chuyên môn chính
              </h5>
              
              <div className="mb-3">
                <div className="small text-muted mb-1">Chuyên môn chính</div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-light text-dark px-3 py-2">
                    <i className="bi bi-star-fill text-warning me-1"></i>
                    {memberDepartment}
                  </span>
                </div>
              </div>

              {memberStats.totalTasks !== undefined && (
                <div className="mb-2">
                  <div className="small text-muted mb-1">Tổng số kiếm đố tham gio</div>
                  <div className="fw-bold text-dark">
                    <i className="bi bi-list-task me-2 text-primary"></i>
                    {memberStats.totalTasks} nhiệm vụ
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="profile-card">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-bar-chart me-2 text-danger"></i>
                Thống kê
              </h5>
              <div className="row g-3">
                <div className="col-6">
                  <div className="stat-card">
                    <div className="stat-number">{memberStats.totalTasks || 7}</div>
                    <div className="stat-label">xử kiện</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="stat-card">
                    <div className="stat-number">{memberStats.completedTasks || 0}</div>
                    <div className="stat-label">Năng kế</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin khác */}
            <div className="profile-card">
              <h5 className="fw-bold mb-3">
                <i className="bi bi-info-circle me-2 text-danger"></i>
                Thông tin khác
              </h5>
              
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Trạng thái tài khoản</span>
                <span className="badge bg-success">GLA VAL TAN</span>
              </div>
              
              <div className="d-flex justify-content-between">
                <span className="text-muted">Ngày tham gia</span>
                <span className="fw-semibold text-success">8/3/2025</span>
              </div>
            </div>

            {/* Actions (Only for HoOC/HoD) */}
            {canManage && (
              <div className="profile-card">
                <h5 className="fw-bold mb-3">
                  <i className="bi bi-gear me-2 text-danger"></i>
                  Hành động
                </h5>
                <div className="d-grid gap-2">
                  <button 
                    className="action-btn action-btn-secondary"
                    onClick={() => {/* Handle change department */}}
                  >
                    <i className="bi bi-arrow-left-right"></i>
                    Chuyển ban
                  </button>
                  
                  {eventRole === 'HoOC' && (
                    <button 
                      className="action-btn action-btn-secondary"
                      onClick={() => {/* Handle change role */}}
                    >
                      <i className="bi bi-shield"></i>
                      Thay đổi vai trò
                    </button>
                  )}
                  
                  <button 
                    className="action-btn action-btn-danger"
                    onClick={handleRemoveMember}
                  >
                    <i className="bi bi-trash"></i>
                    Xóa khỏi sự kiện
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}