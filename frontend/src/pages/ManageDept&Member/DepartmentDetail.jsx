import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { eventService } from "../../services/eventService";
import { departmentService } from "../../services/departmentService";
import { toast, ToastContainer } from "react-toastify";
import { formatDate } from "~/utils/formatDate";
import Loading from "~/components/Loading";
import { departmentApi } from "../../apis/departmentApi";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Inbox,
  Info,
  Pencil,
  RotateCw,
  Trash,
  Users,
  X,
  Plus
} from "lucide-react";

const DepartmentDetail = () => {
  const { eventId, id } = useParams();
  const navigate = useNavigate();
  const [eventRole, setEventRole] = useState('');
  const [userDepartmentId, setUserDepartmentId] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [department, setDepartment] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
  });
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [unassignedMembers, setUnassignedMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showChangeLeaderModal, setShowChangeLeaderModal] = useState(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState(null);
  const [changingLeader, setChangingLeader] = useState(false);
  const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
  const [selectedAssignLeader, setSelectedAssignLeader] = useState(null);
  const [assigningLeader, setAssigningLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const { fetchEventRole, getEventMember } = useEvents();
  const { user } = useAuth();

  const getMemberDisplayName = (member) => {
    // Check nested userId object first for consistency
    if (member?.userId && typeof member.userId === 'object') {
      return member.userId.fullName || member.userId.email || member?.name || "Unknown"
    }
    // Fallback to direct properties
    return member?.name || member?.email || "Unknown"
  }

  const getMemberEmail = (member) => {
    // Check nested userId object first
    if (member?.userId && typeof member.userId === 'object') {
      return member.userId.email || member?.email || ""
    }
    return member?.email || ""
  }

  const getMemberAvatar = (member) => {
    // Check nested userId object first (unassigned members)
    if (member?.userId && typeof member.userId === 'object' && member.userId.avatarUrl) {
      return member.userId.avatarUrl
    }
    // Check direct properties (members in department)
    if (member?.avatar) {
      return member.avatar
    }
    // Fallback
    const email = member?.email || member?.userId?.email || ""
    return `https://i.pravatar.cc/100?u=${encodeURIComponent(email || String(member?._id || member?.id || ""))}`
  }

  const getLeaderDisplayName = (leader) => {
    if (!leader) return 'Chưa có'
    if (typeof leader === 'string') return leader
    return leader.fullName || leader.name || 'Chưa có'
  }

  const getLeaderAvatar = (leader) => {
    if (!leader) return ''

    // Try to find the HoD in the members array to get their actual avatar
    const hodMember = members.find(m => m.role === 'HoD')

    // If found HoD in members, use getMemberAvatar for consistency
    if (hodMember) {
      return getMemberAvatar(hodMember)
    }

    // Otherwise, use leader's own avatar
    const avatarUrl = leader.avatar || leader.avatarUrl
    if (avatarUrl) return avatarUrl

    // Fallback to ui-avatars with name
    const displayName = leader.fullName || leader.name || leader.email || 'User'
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&size=60`
  }

  // Normalize sidebar type for UserLayout
  const getSidebarType = () => {
    if (eventRole === 'HoOC') return 'HoOC';
    if (eventRole === 'HoD') return 'HoD';
    if (eventRole === 'Member') return 'Member';
    return 'user';
  };

  // Check if user can manage this specific department
  // HoOC can manage all departments
  // HoD can only manage their own department
  const canManageThisDepartment = () => {
    if (eventRole === 'HoOC') return true;
    if (eventRole === 'HoD' && userDepartmentId) {
      // Check if this department is the one the HoD manages
      return userDepartmentId === id;
    }
    return false;
  };

  const fetchMembersAndDepartment = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!eventId || !id) {
        throw new Error('Missing eventId or departmentId');
      }

      const dep = await departmentService.getDepartmentDetail(eventId, id);
      if (!dep) {
        throw new Error('Department not found');
      }

      setDepartment(dep);

      const mems = await departmentService.getMembersByDepartment(eventId, id);
      setMembers(mems || []);

      if (!userDepartmentId && eventRole === 'HoD' && mems) {
        const hodMember = mems.find(m => m.role === 'HoD');
        if (hodMember) {
          const memberDeptId = hodMember.departmentId || hodMember.department?._id || hodMember.department?.id;
          if (memberDeptId === id) {
            setUserDepartmentId(id);
          }
        }
      }

    } catch (error) {
      setError(error?.response?.data?.message || error?.message || "Không thể tải thông tin ban");
      toast.error("Lỗi khi tải thông tin ban: " + (error?.response?.data?.message || error?.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && eventId) {
      fetchMembersAndDepartment();
    } else {
      setError('Missing required parameters');
    }
  }, [id, eventId]);

  // Fetch role and department info
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

  const handleEdit = async () => {
    setIsEditing(true);
    try {
      if (department) {
        setEditForm({
          name: department.name || "",
          description: department.description || "",
        });
      }
      setEditing(true);
    } finally {
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      name: (editForm.name || "").trim(),
      description: (editForm.description || "").trim(),
    };
    if (!payload.name) return toast.warning("Tên ban không được để trống");
    setIsSavingChanges(true);
    try {
      await departmentApi.updateDepartment(eventId, id, payload);
      setDepartment((prev) => ({ ...(prev || {}), ...payload }));
      toast.success("Cập nhật ban thành công!");
      setEditing(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Cập nhật ban thất bại!");
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditForm({
      name: department?.name || "",
      description: department?.description || "",
    });
  };

  const handleDeleteDepartment = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmName === department.name) {
      setIsDeleting(true);
      try {
        await departmentApi.deleteDepartment(eventId, id);
        setShowDeleteModal(false);
        setDeleteConfirmName("");

        navigate(`/events/${eventId}/departments`, {
          state: {
            showToast: true,
            toastMessage: "Xóa ban thành công!",
            toastType: "success",
          },
        });
      } catch (error) {
        toast.error(error?.response?.data?.message || "Xóa ban thất bại!");
      } finally {
        setIsDeleting(false);
      }
    } else {
      toast.error("Tên ban không khớp!");
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmName("");
  };

  const handleMemberAction = (memberId, action) => {
    if (action === "remove") {
      const member = members.find((m) => (m._id || m.id) === memberId);
      setMemberToRemove(member);
      setShowRemoveMemberModal(true);
    } else if (action === "change_leader") {
      setShowChangeLeaderModal(true);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemovingMember(true);
    try {
      await departmentService.removeMemberFromDepartment(
        eventId,
        id,
        memberToRemove._id
      );
      toast.success("Đã xóa thành viên khỏi ban");
      setShowRemoveMemberModal(false);
      setMemberToRemove(null);
      await fetchMembersAndDepartment();
    } catch (error) {
      toast.error("Không thể xóa thành viên khỏi ban");
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleCancelRemoveMember = () => {
    setShowRemoveMemberModal(false);
    setMemberToRemove(null);
  };

  const handleAddMember = async () => {
    await loadUnassignedMembers();
    setShowAddMemberModal(true);
  };

  const loadUnassignedMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await eventService.getUnassignedMembersByEvent(eventId);
      const members = Array.isArray(response) ? response : (response?.data || []);
      setUnassignedMembers(members);
    } catch (error) {
      toast.error("Không thể tải danh sách thành viên");
      setUnassignedMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleMemberSelect = (memberId) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleAddSelectedMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    setIsAddingMembers(true);
    try {
      for (const memberId of selectedMembers) {
        await departmentService.addMemberToDepartment(eventId, id, memberId);
      }
      toast.success(`Đã thêm ${selectedMembers.length} thành viên vào ban`);
      setShowAddMemberModal(false);
      setSelectedMembers([]);
      setMemberSearchQuery("");
      await fetchMembersAndDepartment();
    } catch (error) {
      toast.error("Không thể thêm thành viên vào ban");
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleCancelAddMember = () => {
    setShowAddMemberModal(false);
    setSelectedMembers([]);
    setMemberSearchQuery("");
  };

  const handleChangeLeader = async () => {
    if (!selectedNewLeader) {
      toast.warning("Vui lòng chọn trưởng ban mới");
      return;
    }

    const availableMembers = members.filter(member =>
      member.role !== 'HoOC' && member.role !== 'HoD'
    );

    if (availableMembers.length === 0) {
      toast.warning("Không có thành viên nào khác để chọn làm trưởng ban");
      return;
    }

    try {
      setChangingLeader(true);
      const newHoDUserId = selectedNewLeader.userId || selectedNewLeader._id || selectedNewLeader.id;
      await departmentService.changeHoD(eventId, id, newHoDUserId);
      toast.success("Thay đổi trưởng ban thành công!");
      setShowChangeLeaderModal(false);
      setSelectedNewLeader(null);
      await fetchMembersAndDepartment();
    } catch (error) {
      toast.error("Không thể thay đổi trưởng ban");
    } finally {
      setChangingLeader(false);
    }
  };

  const handleCancelChangeLeader = () => {
    setShowChangeLeaderModal(false);
    setSelectedNewLeader(null);
  };

  const openAssignLeaderModal = () => {
    setSelectedAssignLeader(null);
    setShowAssignLeaderModal(true);
  };

  const handleCancelAssignLeader = () => {
    setShowAssignLeaderModal(false);
    setSelectedAssignLeader(null);
  };

  const handleConfirmAssignLeader = async () => {
    if (!selectedAssignLeader) {
      toast.warning("Vui lòng chọn 1 thành viên để gán làm trưởng ban");
      return;
    }

    setAssigningLeader(true);
    try {
      const newHoDUserId =
        selectedAssignLeader.userId ||
        selectedAssignLeader._id ||
        selectedAssignLeader.id;
      await departmentService.changeHoD(eventId, id, newHoDUserId);
      toast.success("Đã gán trưởng ban thành công!");
      setShowAssignLeaderModal(false);
      setSelectedAssignLeader(null);
      await fetchMembersAndDepartment();
    } catch (error) {
      toast.error("Không thể gán trưởng ban");
    } finally {
      setAssigningLeader(false);
    }
  };

  const filteredMembers = members
    .filter((member) => {
      const name = String(getMemberDisplayName(member)).toLowerCase()
      const email = String(getMemberEmail(member)).toLowerCase()
      const q = searchQuery.toLowerCase()
      return name.includes(q) || email.includes(q)
    })
    .sort((a, b) => {
      // Trưởng ban (HoD) luôn hiển thị ở đầu
      if (a.role === 'HoD' && b.role !== 'HoD') return -1
      if (a.role !== 'HoD' && b.role === 'HoD') return 1
      return 0
    })

  const filteredUnassignedMembers = unassignedMembers.filter(
    (member) =>
      member.userId?.fullName
        ?.toLowerCase()
        .includes(memberSearchQuery.toLowerCase()) ||
      member.userId?.email
        ?.toLowerCase()
        .includes(memberSearchQuery.toLowerCase())
  );

  if (roleLoading || loading) {
    return (
      <UserLayout
        title="Chi tiết phân ban"
        sidebarType={getSidebarType()}
        activePage="department-management"
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '60vh', padding: '40px' }}>
          <Loading size={80} />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>
            {roleLoading ? 'Đang tải thông tin sự kiện...' : 'Đang tải thông tin ban...'}
          </div>
        </div>
      </UserLayout>
    );
  }

  if (error) {
    return (
      <UserLayout
        title="Chi tiết phân ban"
        sidebarType={getSidebarType()}
        activePage="department-management"
        eventId={eventId}
      >
        <div className="bg-white rounded-3 shadow-sm p-5 text-center">
          <AlertTriangle size={64} color="#dc2626" />
          <h3 className="mt-3 mb-2" style={{ color: "#dc2626" }}>Lỗi tải dữ liệu</h3>
          <p style={{ color: "#6b7280" }}>{error}</p>
          <button
            className="btn btn-danger mt-3 d-inline-flex align-items-center"
            onClick={() => {
              setError(null);
              fetchMembersAndDepartment();
            }}
          >
            <RotateCw size={18} className="me-2" />
            Thử lại
          </button>
        </div>
      </UserLayout>
    );
  }

  if (!department) {
    return (
      <UserLayout
        title="Chi tiết phân ban"
        sidebarType={getSidebarType()}
        activePage="department-management"
        eventId={eventId}
      >
        <div className="bg-white rounded-3 shadow-sm p-5 text-center">
          <Inbox size={64} className="text-muted" />
          <h3 className="mt-3 mb-2" style={{ color: "#6b7280" }}>Không tìm thấy ban</h3>
          <p style={{ color: "#9ca3af" }}>Ban này có thể đã bị xóa hoặc không tồn tại.</p>
          <button
            className="btn btn-outline-danger mt-3 d-inline-flex align-items-center"
            onClick={() => navigate(`/events/${eventId}/`)}
          >
            <ArrowLeft size={16} className="me-2" />
            Quay lại danh sách ban
          </button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title="Chi tiết phân ban"
      sidebarType={getSidebarType()}
      activePage="department-management"
      eventId={eventId}
    >
      <ToastContainer position="top-right" autoClose={2000} />
      {/* Main Content */}
      <div className="bg-white rounded-3 shadow-sm" style={{ padding: "30px" }}>
        {/* Department Header */}
        <div className="mb-4">
          <h3
            style={{ color: "#dc2626", fontWeight: "600", marginBottom: "8px" }}
          >
            {department.name}
          </h3>
          <p style={{ color: "#6b7280", margin: 0 }}>
            {department.description}
          </p>
        </div>

        {(eventRole === "HoD" || eventRole === "HoOC") && (
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="bg-light rounded-3 p-3 text-center d-flex align-items-center justify-content-center gap-2">
                <Users size={18} className="text-primary" />
                <span style={{ fontWeight: "600" }}>
                  {department.memberCount} thành viên
                </span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="bg-light rounded-3 p-3 text-center d-flex align-items-center justify-content-center gap-2">
                <Users size={18} className="text-success" />
                <span style={{ fontWeight: "600" }}>
                  {department.newMembersToday || 0} thành viên mới hôm nay
                </span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="bg-light rounded-3 p-3 text-center d-flex align-items-center justify-content-center gap-2">
                <Clock size={18} className="text-info" />
                <span style={{ fontWeight: "600" }}>
                  Ngày tạo ban: {formatDate(department.createdAt)}
                </span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="bg-light rounded-3 p-3 text-center d-flex align-items-center justify-content-center gap-2">
                <Clock size={18} className="text-warning" />
                <span style={{ fontWeight: "600" }}>
                  Thay đổi lần cuối: {formatDate(department.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-bottom mb-4">
          <nav>
            <div className="nav nav-tabs border-0">
              <button
                className={`nav-link ${activeTab === "info" ? "active" : ""}`}
                onClick={() => setActiveTab("info")}
                style={{
                  border: "none",
                  color: activeTab === "info" ? "#dc2626" : "#6b7280",
                  fontWeight: "500",
                  borderBottom:
                    activeTab === "info" ? "2px solid #dc2626" : "none",
                }}
              >
                Thông tin
              </button>
              {canManageThisDepartment() && (
                <button
                  className={`nav-link ${activeTab === "settings" ? "active" : ""}`}
                  onClick={() => setActiveTab("settings")}
                  style={{
                    border: "none",
                    color: activeTab === "settings" ? "#dc2626" : "#6b7280",
                    fontWeight: "500",
                    borderBottom:
                      activeTab === "settings" ? "2px solid #dc2626" : "none",
                  }}
                >
                  Cài đặt
                </button>
              )}
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "info" && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm thành viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "300px", borderRadius: "8px" }}
              />
              {canManageThisDepartment() && (
                <button
                  className="btn btn-danger d-flex align-items-center"
                  onClick={handleAddMember}
                  style={{
                    backgroundColor: "#dc2626",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontWeight: "500",
                  }}
                  disabled={loadingMembers}
                >
                  {loadingMembers ? (
                    <RotateCw size={16} className="me-2 spin-animation" />
                  ) : (
                    <Plus size={16} className="me-2" />
                  )}
                  {loadingMembers ? "Đang tải..." : "Thêm thành viên"}
                </button>
              )}
            </div>

            {/* Members Table */}
            <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th
                      style={{
                        border: "none",
                        padding: "15px",
                        fontWeight: "600",
                        color: "#374151",
                        width: "80px",
                        verticalAlign: "middle",
                      }}
                    >
                      STT
                    </th>
                    <th
                      style={{
                        border: "none",
                        padding: "15px",
                        fontWeight: "600",
                        color: "#374151",
                        width: "100px",
                        whiteSpace: "nowrap",
                        verticalAlign: "middle",
                      }}
                    >
                      Hình ảnh
                    </th>
                    <th
                      style={{
                        border: "none",
                        padding: "15px",
                        fontWeight: "600",
                        color: "#374151",
                        verticalAlign: "middle",
                      }}
                    >
                      Tên
                    </th>
                    <th
                      style={{
                        border: "none",
                        padding: "15px",
                        fontWeight: "600",
                        color: "#374151",
                        verticalAlign: "middle",
                      }}
                    >
                      Vai trò
                    </th>
                    <th
                      style={{
                        border: "none",
                        padding: "15px",
                        fontWeight: "600",
                        color: "#374151",
                        verticalAlign: "middle",
                      }}
                    >
                      Email
                    </th>
                    {canManageThisDepartment() && (
                      <th
                        style={{
                          border: "none",
                          padding: "15px",
                          fontWeight: "600",
                          color: "#374151",
                          verticalAlign: "middle",
                        }}
                      >
                        Hành động
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, index) => (
                    <tr key={member._id || member.id}>
                      <td
                        style={{
                          padding: "15px",
                          fontWeight: "500",
                          color: "#6b7280",
                          verticalAlign: "middle",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td style={{ padding: "15px", verticalAlign: "middle" }}>
                        <img
                          src={getMemberAvatar(member)}
                          alt={getMemberDisplayName(member)}
                          className="rounded-circle"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "15px",
                          fontWeight: "500",
                          color: "#374151",
                          verticalAlign: "middle",
                        }}
                      >
                        {getMemberDisplayName(member)}
                      </td>
                      <td style={{ padding: "15px", color: "#6b7280", verticalAlign: "middle" }}>
                        {member.role === 'HoD' ? 'Trưởng ban' : member.role === 'Member' ? 'Thành viên' : member.role}
                      </td>
                      <td style={{ padding: "15px", color: "#6b7280", verticalAlign: "middle" }}>
                        {getMemberEmail(member)}
                      </td>
                      {canManageThisDepartment() && (() => {
                        // Check if this member is the current user
                        const currentUserId = user?._id || user?.id;
                        const memberUserId = member?.userId?._id || member?.userId?.id || member?.userId;
                        const isSelf = currentUserId && memberUserId && String(currentUserId) === String(memberUserId);
                        
                        // Don't show remove button if it's the current user
                        if (isSelf) {
                          return null;
                        }
                        
                        return (
                          <td style={{ padding: "15px", verticalAlign: "middle" }}>
                            <div className="dropdown">
                              <button
                                className="btn btn-link text-decoration-none"
                                data-bs-toggle="dropdown"
                                style={{ color: "#6b7280" }}
                              >
                                ⋮
                              </button>
                              <ul className="dropdown-menu">
                                <li>
                                  <button
                                    className="dropdown-item"
                                    onClick={() =>
                                      handleMemberAction(member._id || member.id, "remove")
                                    }
                                  >
                                    Xoá thành viên khỏi ban
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </td>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "settings" && canManageThisDepartment() && (
          <div className="row">
            {/* Cột trái - Chi tiết ban */}
            <div className="col-md-6">
              <div className="bg-light rounded-3 p-4 h-100">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h5
                    style={{
                      color: "#1f2937",
                      fontWeight: "600",
                      marginBottom: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <Info size={18} />
                    Chi tiết ban
                  </h5>
                  {!editing ? (
                    <button
                      className="btn btn-outline-danger d-flex align-items-center"
                      onClick={handleEdit}
                      style={{ borderRadius: "8px", fontWeight: "500" }}
                      disabled={isEditing}
                    >
                      {isEditing ? (
                        <RotateCw size={16} className="me-2 spin-animation" />
                      ) : (
                        <Pencil size={16} className="me-2" />
                      )}
                      {isEditing ? "Đang chỉnh sửa..." : "Chỉnh sửa"}
                    </button>
                  ) : (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-danger d-flex align-items-center"
                        onClick={handleSave}
                        style={{ borderRadius: "8px", fontWeight: "500" }}
                        disabled={isSavingChanges}
                      >
                        {isSavingChanges ? (
                          <RotateCw size={16} className="me-2 spin-animation" />
                        ) : (
                          <Check size={16} className="me-2" />
                        )}
                        {isSavingChanges ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                      <button
                        className="btn btn-outline-secondary d-flex align-items-center"
                        onClick={handleCancel}
                        style={{ borderRadius: "8px", fontWeight: "500" }}
                        disabled={isSavingChanges}
                      >
                        <X size={14} className="me-2" />
                        Hủy
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Tên ban</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editing ? editForm.name : department.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    disabled={!editing}
                    style={{ borderRadius: "8px" }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Mô tả</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={
                      editing ? editForm.description : department.description
                    }
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    disabled={!editing}
                    style={{ borderRadius: "8px" }}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Cột phải - Trưởng ban + Actions */}
            <div className="col-md-6">
              <div className="d-flex flex-column gap-4 h-100">
                {/* Department Leader */}
                <div className="bg-light rounded-3 p-4">
                  <h5
                    style={{
                      color: "#1f2937",
                      fontWeight: "600",
                      marginBottom: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <Users size={18} />
                    Trưởng ban
                  </h5>
                  <div className="d-flex align-items-center mb-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{
                        width: "60px",
                        height: "60px",
                        backgroundColor: "#f3f4f6",
                        fontSize: "1.5rem",
                        fontWeight: "600",
                        color: "#6b7280",
                        overflow: "hidden",
                      }}
                    >
                      {department.leader ? (
                        <img
                          src={getLeaderAvatar(department.leader)}
                          alt={getLeaderDisplayName(department.leader)}
                          className="rounded-circle"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.target.onerror = null;
                            const displayName = department.leader.fullName || department.leader.name || department.leader.email || 'User';
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&size=60`;
                          }}
                        />
                      ) : (
                        "?"
                      )}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">
                        {getLeaderDisplayName(department.leader)}
                      </div>
                      <div className="small text-muted">
                        {department.leader?.email || ""}
                      </div>
                    </div>
                  </div>

                  {department.leader ? (
                    <button
                      className="btn btn-outline-danger d-flex align-items-center"
                      style={{ borderRadius: "8px", fontWeight: "400" }}
                      onClick={() => setShowChangeLeaderModal(true)}
                      disabled={changingLeader}
                    >
                      {changingLeader ? (
                        <RotateCw size={16} className="me-2 spin-animation" />
                      ) : (
                        <RotateCw size={16} className="me-2" />
                      )}
                      {changingLeader ? "Đang đổi..." : "Đổi trưởng ban"}
                    </button>
                  ) : (
                    <button
                      className="btn btn-success d-flex align-items-center"
                      style={{ borderRadius: "8px", fontWeight: "400" }}
                      onClick={openAssignLeaderModal}
                      disabled={assigningLeader}
                    >
                      {assigningLeader ? (
                        <RotateCw size={16} className="me-2 spin-animation" />
                      ) : (
                        <Users size={16} className="me-2" />
                      )}
                      {assigningLeader ? "Đang gán..." : "Gán trưởng ban"}
                    </button>
                  )}
                </div>

                {/* Delete Department - Only HoOC can see this */}
                {eventRole === 'HoOC' && (
                  <div className="bg-light rounded-3 p-4">
                    <h5
                      style={{
                        color: "#1f2937",
                        fontWeight: "600",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      <AlertTriangle size={18} className="text-danger" />
                      Xoá ban
                    </h5>
                    <button
                      className="btn btn-danger d-flex align-items-center mb-2"
                      onClick={handleDeleteDepartment}
                      style={{ backgroundColor: "#dc2626", border: "none", borderRadius: "8px", fontWeight: "400" }}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <RotateCw size={16} className="me-2 spin-animation" />
                      ) : (
                        <Trash size={16} className="me-2" />
                      )}
                      {isDeleting ? "Đang xoá..." : "Xoá ban vĩnh viễn"}
                    </button>
                    <p
                      style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}
                    >
                      Hành động này sẽ ảnh hưởng tới toàn bộ thành viên và không
                      thể hoàn tác.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1050,
          }}
        >
          <div
            className="bg-white rounded-3 p-4"
            style={{
              minWidth: "400px",
              maxWidth: "500px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div className="d-flex align-items-center mb-3">
              <AlertTriangle
                size={20}
                className="me-2"
                color="#dc2626"
              />
              <h5
                className="mb-0"
                style={{ color: "#1f2937", fontWeight: "600" }}
              >
                Xoá ban
              </h5>
            </div>

            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              Hành động này sẽ xoá vĩnh viễn ban này và không thể hoàn tác.
            </p>

            <div className="mb-3">
              <label
                className="form-label"
                style={{ color: "#374151", fontWeight: "500" }}
              >
                Tên ban
              </label>
              <input
                type="text"
                className="form-control"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Nhập tên ban để xác nhận"
                style={{ borderRadius: "8px" }}
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-outline-secondary d-inline-flex align-items-center"
                onClick={handleCancelDelete}
                style={{ borderRadius: "8px" }}
                disabled={isDeleting}
              >
                <X size={14} className="me-1" />
                Huỷ
              </button>
              <button
                className="btn btn-danger d-flex align-items-center"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmName !== department.name || isDeleting}
                style={{ borderRadius: "8px" }}
              >
                {isDeleting ? (
                  <>
                    <RotateCw size={16} className="me-2 spin-animation" />
                    Đang xoá...
                  </>
                ) : (
                  <>
                    <Trash size={16} className="me-2" />
                    Xoá
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1050,
          }}
        >
          <div
            className="bg-white rounded-3 p-4 d-flex flex-column"
            style={{
              minWidth: "600px",
              maxWidth: "800px",
              maxHeight: "80vh",
              border: "1px solid #e5e7eb",
              overflow: "auto",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4
                className="mb-0"
                style={{ color: "#1f2937", fontWeight: "600" }}
              >
                Thêm thành viên vào ban
              </h4>
              <button
                className="btn-close"
                onClick={handleCancelAddMember}
              ></button>
            </div>

            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              Chọn thành viên chưa có ban để thêm vào {department.name}
            </p>

            {/* Search */}
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm thành viên..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                style={{ borderRadius: "8px" }}
              />
            </div>

            {/* Members List */}
            <div
              className="border rounded-3 p-3 mb-3"
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                border: "1px solid #e5e7eb",
              }}
            >
              {loadingMembers ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <Loading />
                  </div>
                </div>
              ) : filteredUnassignedMembers.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <Users size={32} className="mb-2" />
                  <p className="mt-2 mb-0">
                    {memberSearchQuery
                      ? "Không tìm thấy thành viên phù hợp"
                      : "Không có thành viên chưa có ban"}
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {filteredUnassignedMembers.map((member) => {
                    const memberId = member._id || member.id;
                    const avatarUrl = member?.userId?.avatarUrl || member?.avatar;
                    const displayName = member?.userId?.fullName || member?.name || "Unknown";
                    const email = member?.userId?.email || member?.email || "";

                    return (
                      <div
                        key={memberId}
                        className={`d-flex align-items-center p-3 rounded-3 border cursor-pointer ${
                          selectedMembers.includes(memberId)
                            ? "bg-light border-primary"
                            : "border-light"
                        }`}
                        onClick={() => handleMemberSelect(memberId)}
                        style={{
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input me-3"
                          checked={selectedMembers.includes(memberId)}
                          onChange={() => handleMemberSelect(memberId)}
                        />
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="rounded-circle me-3"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&size=40`;
                                }}
                              />
                            ) : (
                              <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&size=40`}
                                alt={displayName}
                                className="rounded-circle me-3"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  objectFit: "cover",
                                }}
                              />
                            )}
                            <div>
                              <h6
                                className="mb-1"
                                style={{ color: "#1f2937", fontWeight: "500" }}
                              >
                                {displayName}
                              </h6>
                              <p
                                className="mb-0"
                                style={{ color: "#6b7280", fontSize: "0.9rem" }}
                              >
                                {email}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Count and Action Buttons */}
            <div className="d-flex justify-content-between align-items-center">
              {/* Selected Count on the left */}
              {selectedMembers.length > 0 ? (
                <p className="text-primary mb-0" style={{ fontWeight: "500" }}>
                  Đã chọn {selectedMembers.length} thành viên
                </p>
              ) : (
                <div></div>
              )}

              {/* Buttons on the right */}
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary d-inline-flex align-items-center"
                  onClick={handleCancelAddMember}
                  style={{ borderRadius: "8px" }}
                >
                  <X size={14} className="me-1" />
                  Huỷ
                </button>
                <button
                  type="button"
                  className="btn btn-danger d-inline-flex align-items-center"
                  onClick={handleAddSelectedMembers}
                  disabled={isAddingMembers || selectedMembers.length === 0}
                  style={{ borderRadius: "8px" }}
                >
                  {isAddingMembers ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Đang thêm...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="me-2" />
                      Thêm {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ""} thành viên
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveMemberModal && memberToRemove && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1050,
          }}
        >
          <div
            className="bg-white rounded-3 p-4"
            style={{
              minWidth: "400px",
              maxWidth: "500px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div className="d-flex align-items-center mb-3">
              <AlertTriangle size={20} className="me-2" color="#f59e0b" />
              <h5
                className="mb-0"
                style={{ color: "#1f2937", fontWeight: "600" }}
              >
                Xoá thành viên khỏi ban
              </h5>
            </div>

            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              Bạn có chắc chắn muốn xoá <strong>{getMemberDisplayName(memberToRemove)}</strong>{" "}
              khỏi ban {department.name}?
            </p>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-outline-secondary d-inline-flex align-items-center"
                onClick={handleCancelRemoveMember}
                style={{ borderRadius: "8px" }}
              >
                <X size={14} className="me-1" />
                Huỷ
              </button>
              <button
                className="btn btn-danger d-inline-flex align-items-center"
                onClick={handleConfirmRemoveMember}
                style={{ borderRadius: "8px" }}
                disabled={isRemovingMember}
              >
                {isRemovingMember ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Đang xoá...
                  </>
                ) : (
                  <>
                    <Trash size={16} className="me-2" />
                    Xoá thành viên
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Leader Modal */}
      {showChangeLeaderModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1050,
          }}
        >
          <div
            className="bg-white rounded-3 p-4"
            style={{
              minWidth: "500px",
              maxWidth: "600px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div className="d-flex align-items-center mb-3">
              <RotateCw size={20} className="me-2 text-primary" />
              <h5
                className="mb-0"
                style={{ color: "#1f2937", fontWeight: "600" }}
              >
                Thay đổi trưởng ban
              </h5>
            </div>

            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              Chọn thành viên mới làm trưởng ban cho <strong>{department.name}</strong>.
              Chỉ có thể chọn từ các thành viên hiện tại trong ban.
            </p>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                Chọn trưởng ban mới <span className="text-danger">*</span>
              </label>
              <div className="border rounded-3" style={{ maxHeight: "200px", overflowY: "auto" }}>
                {(() => {
                  const availableMembers = members.filter(member =>
                    member.role !== 'HoOC' &&
                    member.role !== 'HoD'
                  );

                  if (availableMembers.length === 0) {
                    return (
                      <div className="p-4 text-center text-muted">
                        <Users size={24} className="me-2" />
                        Không có thành viên nào khác để chọn làm trưởng ban
                      </div>
                    );
                  }

                  return availableMembers.map((member) => (
                    <div
                      key={member._id || member.id}
                      className={`p-3 border-bottom d-flex align-items-center ${selectedNewLeader?._id === member._id ? 'bg-primary text-white' : ''
                        }`}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedNewLeader?._id === member._id ? '#0d6efd' : 'transparent'
                      }}
                      onClick={() => setSelectedNewLeader(member)}
                    >
                      <img
                        src={getMemberAvatar(member)}
                        className="rounded-circle me-3"
                        style={{ width: "40px", height: "40px", objectFit: "cover" }}
                        alt={getMemberDisplayName(member)}
                      />
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{getMemberDisplayName(member)}</div>
                        <div className="small text-muted">{getMemberEmail(member)}</div>
                        <div className="small">
                          <span className="badge bg-secondary">{member.role}</span>
                        </div>
                      </div>
                      {selectedNewLeader?._id === member._id && (
                        <CheckCircle size={18} className="text-white" />
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-outline-secondary d-inline-flex align-items-center"
                onClick={handleCancelChangeLeader}
                style={{ borderRadius: "8px" }}
                disabled={changingLeader}
              >
                <X size={14} className="me-1" />
                Huỷ
              </button>
              <button
                className="btn btn-primary d-inline-flex align-items-center"
                onClick={handleChangeLeader}
                style={{ borderRadius: "8px" }}
                disabled={changingLeader || !selectedNewLeader || members.filter(member => member.role !== 'HoOC' && member.role !== 'HoD').length === 0}
              >
                {changingLeader ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Đang thay đổi...
                  </>
                ) : (
                  <>
                    <Check size={16} className="me-2" />
                    Xác nhận thay đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Leader Modal (khi ban chưa có trưởng ban) */}
      {showAssignLeaderModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div
            className="bg-white rounded-3 p-4"
            style={{ minWidth: "500px", maxWidth: "700px", border: "1px solid #e5e7eb" }}
          >
            <div className="d-flex align-items-center mb-3">
              <Users size={20} className="me-2 text-success" />
              <h5 className="mb-0" style={{ color: "#1f2937", fontWeight: "600" }}>
                Gán trưởng ban cho {department.name}
              </h5>
            </div>

            <p style={{ color: "#6b7280", marginBottom: "12px" }}>
              Chọn một thành viên hiện có trong ban để gán làm trưởng ban.
            </p>

            <div className="border rounded-3 mb-3" style={{ maxHeight: 320, overflowY: "auto" }}>
              {(() => {
                const candidates = members.filter(m => m.role !== 'HoOC' && m.role !== 'HoD');
                if (!candidates || candidates.length === 0) {
                  return (
                    <div className="p-4 text-center text-muted">
                      <Users size={24} className="me-2" />
                      Không có thành viên phù hợp để gán
                    </div>
                  );
                }
                return candidates.map(member => (
                  <div
                    key={member._id || member.id}
                    className={`p-3 d-flex align-items-center justify-content-between ${selectedAssignLeader?._id === member._id ? 'bg-primary text-white' : ''}`}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onClick={() => setSelectedAssignLeader(member)}
                  >
                    <div className="d-flex align-items-center">
                      <img
                        src={getMemberAvatar(member)}
                        alt={getMemberDisplayName(member)}
                        className="rounded-circle me-3"
                        style={{ width: 40, height: 40, objectFit: "cover" }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{getMemberDisplayName(member)}</div>
                        <div className="small text-muted">{getMemberEmail(member)}</div>
                      </div>
                    </div>
                    <div>
                      {selectedAssignLeader?._id === member._id && <CheckCircle size={18} />}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-outline-secondary d-inline-flex align-items-center"
                onClick={handleCancelAssignLeader}
                style={{ borderRadius: 8 }}
                disabled={assigningLeader}
              >
                <X size={14} className="me-1" />
                Huỷ
              </button>
              <button
                className="btn btn-success d-inline-flex align-items-center"
                onClick={handleConfirmAssignLeader}
                disabled={assigningLeader || !selectedAssignLeader}
                style={{ borderRadius: 8 }}
              >
                {assigningLeader ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Đang gán...
                  </>
                ) : (
                  <>
                    <Check size={16} className="me-2" />
                    Gán trưởng ban
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default DepartmentDetail;
