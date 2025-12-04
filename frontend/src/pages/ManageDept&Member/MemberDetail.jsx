import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { eventApi } from '../../apis/eventApi';
import Loading from '../../components/Loading';
import { useEvents } from '../../contexts/EventContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { eventService } from '~/services/eventService';
import { departmentService } from '~/services/departmentService';
import { formatDate } from '~/utils/formatDate';
import ConfirmModal from '../../components/ConfirmModal';
import { ArrowLeft, ArrowLeftRight, Check, ClipboardList, FileText, Info, RotateCw, Settings, Shield, Star, Tag, Trash, User, Building2 } from "lucide-react";


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
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [departmentModalLoading, setDepartmentModalLoading] = useState(false);
  const [departmentModalSaving, setDepartmentModalSaving] = useState(false);
  const [departmentModalError, setDepartmentModalError] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Member');
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [userDepartmentId, setUserDepartmentId] = useState(null);
  const { fetchEventRole, getEventMember } = useEvents();
  const { user } = useAuth();

  // Get member data from navigation state if available
  const memberFromState = location.state?.member;

  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      if (!eventId) {
        if (mounted) {
          setEventRole('');
          setUserDepartmentId(null);
          setRoleLoading(false);
        }
        return;
      }
      try {
        setRoleLoading(true);
        const r = await fetchEventRole(eventId);

        // Get member info including departmentId
        const memberInfo = getEventMember(eventId);

        let normalized = '';
        let deptId = memberInfo?.departmentId || null;

        if (!r) {
          normalized = '';
        } else if (typeof r === 'string') {
          normalized = r;
        } else if (typeof r === 'object') {
          normalized = String(r.role || '');
          deptId = r.departmentId || memberInfo?.departmentId || null;
        } else {
          normalized = String(r);
        }

        if (mounted) {
          setEventRole(normalized);
          setUserDepartmentId(deptId);
          setRoleLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setEventRole('');
          setUserDepartmentId(null);
          setRoleLoading(false);
        }
      }
    };
    loadRole();
    return () => { mounted = false; };
  }, [eventId, fetchEventRole, getEventMember]);

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
        
        // eventService đã unwrap response, nên response có thể là member trực tiếp hoặc có data wrapper
        if (response) {
          // Nếu response có data wrapper
          if (response.data) {
            setMember(response.data.member || response.data);
            if (response.data.stats) {
              setMemberStats(response.data.stats);
            }
          } 
          // Nếu response là member trực tiếp (sau khi unwrap)
          else if (response._id || response.id) {
            setMember(response);
            if (response.stats) {
              setMemberStats(response.stats);
            }
          } else {
            setError('Không tìm thấy thông tin thành viên');
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

  const resolveMemberDepartmentId = (targetMember) => {
    const source = targetMember || member;
    if (!source) return '';
    const dept = source.departmentId || source.department;
    if (!dept) return '';
    if (typeof dept === 'string') return dept;
    if (dept?._id) return dept._id;
    if (dept?.id) return dept.id;
    return '';
  };

  const loadDepartmentOptions = async () => {
    try {
      setDepartmentModalLoading(true);
      const departments = await departmentService.getDepartments(eventId);
      setDepartmentOptions(Array.isArray(departments) ? departments : []);
      setDepartmentModalError('');
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartmentOptions([]);
      setDepartmentModalError(error.response?.data?.message || 'Không thể tải danh sách ban');
    } finally {
      setDepartmentModalLoading(false);
    }
  };

  const handleOpenDepartmentModal = async () => {
    if (!member || member.role === 'HoOC') return;
    setSelectedDepartmentId(resolveMemberDepartmentId(member));
    setDepartmentModalError('');
    setShowDepartmentModal(true);
    await loadDepartmentOptions();
  };

  const handleConfirmChangeDepartment = async () => {
    if (!member) return;
    const memberObjectId = member._id || member.id;
    if (!memberObjectId) return;

    const nextDepartmentId = selectedDepartmentId || null;
    const currentDepartmentId = resolveMemberDepartmentId(member) || null;
    if ((currentDepartmentId || null) === (nextDepartmentId || null)) {
      toast.info('Thành viên đã thuộc ban này');
      return;
    }

    try {
      setDepartmentModalSaving(true);
      const response = await eventApi.changeMemberDepartment(eventId, memberObjectId, nextDepartmentId);
      const updatedMember = response?.data || response;
      if (updatedMember) {
        setMember(prev => ({ ...prev, ...updatedMember }));
      }
      toast.success(response?.message || 'Cập nhật ban thành công!');
      setShowDepartmentModal(false);
    } catch (error) {
      console.error('Error changing department:', error);
      toast.error(error.response?.data?.message || 'Không thể chuyển ban');
    } finally {
      setDepartmentModalSaving(false);
    }
  };

  const handleOpenRoleModal = () => {
    if (!member) return;
    const currentRole = member.role;
    const fallbackRole = roleOptions.some((opt) => opt.value === currentRole)
      ? currentRole
      : 'Member';
    setSelectedRole(fallbackRole);
    setShowRoleModal(true);
  };

  const handleConfirmChangeRole = async () => {
    if (!member) return;
    const memberObjectId = member._id || member.id;
    if (!memberObjectId) return;
    if (!selectedRole || selectedRole === member.role) {
      toast.info('Vai trò không thay đổi');
      return;
    }

    try {
      setRoleSaving(true);
      const response = await eventApi.updateMemberRole(eventId, memberObjectId, selectedRole);
      const updatedMember = response?.data || response;
      if (updatedMember) {
        setMember(prev => ({ ...prev, ...updatedMember }));
      }
      toast.success(response?.message || 'Cập nhật vai trò thành công!');
      setShowRoleModal(false);
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error(error.response?.data?.message || 'Không thể thay đổi vai trò');
    } finally {
      setRoleSaving(false);
    }
  };

  // Handle remove member
  const [confirmModal, setConfirmModal] = useState({ show: false, message: "", onConfirm: null });
  const handleRemoveMember = async () => {
    setConfirmModal({
      show: true,
      message: `Bạn có chắc chắn muốn xóa ${member?.name || member?.fullName || 'thành viên'} khỏi sự kiện?`,
      onConfirm: async () => {
        setConfirmModal({ show: false, message: "", onConfirm: null });
        try {
          await eventApi.removeMemberFromEvent(eventId, member._id || member.id);
          toast.success('Đã xóa thành viên khỏi sự kiện');
          navigate(`/events/${eventId}/members`);
        } catch (error) {
          console.error('Error removing member:', error);
          toast.error('Không thể xóa thành viên');
        }
      }
    });
  };

  // Show loading while fetching role to prevent showing wrong sidebar
  if (roleLoading || loading) {
    return (
      <UserLayout title="Thông tin thành viên" sidebarType={getSidebarType()} activePage="members" eventId={eventId}>
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh', padding: '40px' }}>
          <Loading size={80} />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>
            {roleLoading ? 'Đang tải thông tin sự kiện...' : 'Đang tải thông tin thành viên...'}
          </div>
        </div>
      </UserLayout>
    );
  }

  if (error || !member) {
    return (
      <UserLayout title="Thông tin thành viên" sidebarType={getSidebarType()} activePage="members" eventId={eventId}>
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
  const memberDepartment = member.department || member.departmentName || member.dept || member.departmentId?.name || 'Chưa có ban';
  const memberPhone = member.userId?.phone || '';
  const memberStudentId = member.studentId || member.userId?.studentId || '';
  const memberBio = member.bio || member.userId?.bio || '';
  const memberHighlight = member.highlight || member.userId?.highlight || '';
  const memberTags = member.tags || member.userId?.tags || [];
  const memberVerified = member.userId?.verified || false;
  const memberJoinedAt = member.createdAt || '';

  // Get member's department ID
  const memberDepartmentId = resolveMemberDepartmentId(member);

  // Get current user ID and member user ID for comparison
  const currentUserId = user?._id || user?.id || null;
  const memberUserId = member?.userId?._id || member?.userId?.id || member?.userId || null;
  const isViewingSelf = currentUserId && memberUserId && String(currentUserId) === String(memberUserId);

  // Check if current user can manage this member
  // HoOC can manage others, but NOT themselves
  // HoD can manage if:
  //   - Member's department matches the HoD's department (HoD can only manage members in their own department)
  const canManage = (() => {
    // Prevent self-management for HoOC (cannot change own role or delete self)
    if (eventRole === 'HoOC' && isViewingSelf && memberRole === 'HoOC') {
      return false;
    }
    // Prevent self-management for HoD (cannot change own department or delete self)
    if (eventRole === 'HoD' && isViewingSelf && memberRole === 'HoD') {
      return false;
    }
    if (eventRole === 'HoOC') return true;
    if (eventRole === 'HoD') {
      // HoD can only manage members in their own department
      if (!userDepartmentId) return false;
      // Normalize IDs for comparison
      const normalizedUserDeptId = String(userDepartmentId);
      const normalizedMemberDeptId = memberDepartmentId ? String(memberDepartmentId) : null;
      // Only allow if member is in HoD's department
      return normalizedMemberDeptId === normalizedUserDeptId;
    }
    return false;
  })();

  // HoD can only change department for members in their own department
  // HoOC cannot change department for themselves
  // HoD cannot change department for themselves
  const canChangeDepartment = canManage && memberRole !== 'HoOC' && !(isViewingSelf && eventRole === 'HoD');
  
  // HoOC can change role for others, but NOT for themselves
  const canChangeRole = canManage && eventRole === 'HoOC' && !(isViewingSelf && memberRole === 'HoOC');
  
  // HoOC can remove others, but NOT themselves
  // HoD can remove others in their department, but NOT themselves
  const canRemoveMember = canManage && !(isViewingSelf && (memberRole === 'HoOC' || memberRole === 'HoD'));
  const shouldShowDepartmentInfo = memberRole !== 'HoOC';
  const roleOptions = [
    { value: 'HoD', label: 'Trưởng ban', description: 'Điều phối kế hoạch và nhiệm vụ trong ban' },
    { value: 'Member', label: 'Thành viên', description: 'Tham gia thực hiện nhiệm vụ được giao' },
  ];

  return (
    <UserLayout
      title="Thông tin thành viên"
      sidebarType={getSidebarType()}
      activePage="members"
      eventId={eventId}
    >
      <ConfirmModal
        show={confirmModal.show}
        message={confirmModal.message}
        onClose={() => setConfirmModal({ show: false, message: "", onConfirm: null })}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
        }}
      />
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
        .custom-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 2200;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
        }
        .custom-modal-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 18px;
          padding: 1.75rem;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25);
          animation: modalPop 0.25s ease forwards;
        }
        .custom-modal-card h5 {
          font-weight: 700;
        }
        .custom-modal-card .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        .role-option {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          display: flex;
          gap: 0.75rem;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .role-option.active {
          border-color: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
        }
        .role-option input {
          margin-top: 0.35rem;
        }
        @keyframes modalPop {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      <div className="container-fluid" style={{ maxWidth: 1100 }}>
        {/* Back Button */}
        <button 
          className="btn btn-outline-secondary mb-3 d-inline-flex align-items-center"
          onClick={() => navigate(`/events/${eventId}/members`)}
        >
          <ArrowLeft size={16} className="me-2" />
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
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Left Column - Member Info */}
          <div className="col-lg-7">
            <div className="profile-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  <User className="me-2 text-danger" size={20} />
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
                <div className="info-label">Email</div>
                <div className="info-value">{memberEmail}</div>
              </div>

              <div className="info-row">
                <div className="info-label">Số điện thoại</div>
                <div className="info-value">{memberPhone || 'Chưa cập nhật'}</div>
              </div>
            </div>

            <div className="profile-card">
              <h5 className="fw-bold mb-3 d-flex align-items-center">
                <FileText className="me-2 text-danger" size={20} />
                Bio
              </h5>
              <p className="text-muted mb-0">{memberBio || 'Chưa có thông tin'}</p>
            </div>
          </div>

          {/* Right Column - Actions & Stats */}
          <div className="col-lg-5">
            {/* Department Info */}
            {shouldShowDepartmentInfo && (
              <div className="profile-card">
                <h5 className="fw-bold mb-3 d-flex align-items-center">
                  <Building2 className="me-2 text-danger" size={20} />
                  Thông tin chuyên môn chính
                </h5>
                
                <div className="mb-3">
                  <div className="small text-muted mb-1">Chuyên môn chính</div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-light text-dark px-3 py-2">
                      <Star className="text-warning me-1" size={14} />
                      {memberDepartment}
                    </span>
                  </div>
                </div>

                {memberStats.totalTasks !== undefined && (
                  <div className="mb-2">
                    <div className="fw-bold text-dark">
                      <ClipboardList className="me-2 text-primary" size={18} />
                      {memberStats.totalTasks} nhiệm vụ
                    </div>
                  </div>
                )}
              </div>
            )}

            

            {/* Thông tin chi tiết */}
            {memberHighlight && (
              <div className="profile-card">
                <h5 className="fw-bold mb-3 d-flex align-items-center">
                  <Star className="me-2 text-danger" size={20} />
                  Thông tin chi tiết
                </h5>
                <p className="text-muted small mb-0">{memberHighlight}</p>
              </div>
            )}

            {/* Ban đã tham gia - Show current department in this event */}
            {shouldShowDepartmentInfo && memberDepartment && memberDepartment !== 'Chưa có ban' && (
              <div className="profile-card">
                <h5 className="fw-bold mb-3 d-flex align-items-center">
                  <Tag className="me-2 text-danger" size={20} />
                  Ban đã tham gia
                </h5>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-light text-dark px-3 py-2">
                    {memberDepartment}
                  </span>
                </div>
              </div>
            )}

            {/* Thông tin khác */}
            <div className="profile-card">
              <h5 className="fw-bold mb-3 d-flex align-items-center">
                <Info className="me-2 text-danger" size={20} />
                Thông tin khác
              </h5>
              
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Xác thực tài khoản</span>
                <span className={`badge ${memberVerified ? 'bg-success' : 'bg-secondary'}`}>
                  {memberVerified ? '✓ Đã xác thực' : '⏳ Chưa xác thực'}
                </span>
              </div>
              
              <div className="d-flex justify-content-between">
                <span className="text-muted">Ngày tham gia</span>
                <span className="fw-semibold text-success">{formatDate(memberJoinedAt)}</span>
              </div>
            </div>

            {/* Actions (Only for HoOC/HoD) */}
            {canManage && (
              <div className="profile-card">
                <h5 className="fw-bold mb-3 d-flex align-items-center">
                  <Settings className="me-2 text-danger" size={20} />
                  Hành động
                </h5>
                <div className="d-grid gap-2">
                  {canChangeDepartment && (
                    <button 
                      className="action-btn action-btn-secondary"
                      onClick={handleOpenDepartmentModal}
                    >
                      <ArrowLeftRight size={16} />
                      Chuyển ban
                    </button>
                  )}
                  
                  {canChangeRole && (
                    <button 
                      className="action-btn action-btn-secondary"
                      onClick={handleOpenRoleModal}
                    >
                      <Shield size={16} />
                      Thay đổi vai trò
                    </button>
                  )}
                  
                  {canRemoveMember && (
                    <button 
                      className="action-btn action-btn-danger"
                      onClick={handleRemoveMember}
                    >
                      <Trash size={18} />
                      Xóa khỏi sự kiện
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
