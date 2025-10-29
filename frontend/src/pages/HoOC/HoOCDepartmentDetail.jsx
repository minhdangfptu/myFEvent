import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { eventService } from "../../services/eventService";
import { departmentService } from "../../services/departmentService";
import { toast } from "react-toastify";
import { formatDate } from "~/utils/formatDate";
import Loading from "~/components/Loading";
import { departmentApi } from "../../apis/departmentApi";

const HoOCDepartmentDetail = () => {
  const { eventId, id } = useParams();
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchMembersAndDepartment();
  }, [id]);

  async function fetchMembersAndDepartment() {
    try {
      const department = await departmentService.getDepartmentDetail(
        eventId,
        id
      );
      setDepartment(department || []);
      const members = await departmentService.getMembersByDepartment(
        eventId,
        id
      );
      setMembers(members || []);
      console.log(members);
    } catch (error) {
      console.error("Error fetching members of department:", error);
      toast.error("Lỗi khi tải danh sách thành viên của ban");
    }
  }
  

  const handleEdit = () => {
    if (department) {
      setEditForm({
        name: department.name || "",
        description: department.description || "",
      });
    }
    setEditing(true);
  };

  const handleSave = async () => {
    const payload = {
      name: (editForm.name || "").trim(),
      description: (editForm.description || "").trim(),
    };
    if (!payload.name) return toast.warning("Tên ban không được để trống");
    try {
      await departmentApi.updateDepartment(eventId, id, payload); 
      setDepartment((prev) => ({ ...(prev || {}), ...payload }));
      toast.success("Cập nhật ban thành công!");
      setEditing(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Cập nhật ban thất bại!");
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
      try {
        await departmentApi.deleteDepartment(eventId, id);
        toast.success("Xóa ban thành công!");
        navigate(`/events/${eventId}/hooc-manage-department`);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Xóa ban thất bại!");
      }
    } else {
      toast.error("Tên ban không khớp!");
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmName(department.name);
  };

  const handleMemberAction = (memberId, action) => {
    if (action === "remove") {
      const member = members.find((m) => m.id === memberId);
      setMemberToRemove(member);
      setShowRemoveMemberModal(true);
    } else if (action === "change_leader") {
      setShowChangeLeaderModal(true);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await departmentService.removeMemberFromDepartment(
        eventId,
        id,
        memberToRemove._id
      );
      toast.success("Đã xóa thành viên khỏi ban");
      setShowRemoveMemberModal(false);
      setMemberToRemove(null);
      // Reload members list
      await fetchMembersAndDepartment();
      // You might want to reload the department data here
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Không thể xóa thành viên khỏi ban");
    }
  };

  const handleCancelRemoveMember = () => {
    setShowRemoveMemberModal(false);
    setMemberToRemove(null);
  };

  const handleAddMember = async () => {
    const response = await eventService.getUnassignedMembersByEvent(eventId);
    setUnassignedMembers(response.data || []);
    setShowAddMemberModal(true);
    await loadUnassignedMembers();
  };

  const loadUnassignedMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await eventService.getUnassignedMembersByEvent(eventId);
      setUnassignedMembers(response.data || []);
    } catch (error) {
      console.error("Error loading unassigned members:", error);
      toast.error("Không thể tải danh sách thành viên");
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

    try {
      for (const memberId of selectedMembers) {
        await departmentService.addMemberToDepartment(eventId, id, memberId);
      }
      toast.success(`Đã thêm ${selectedMembers.length} thành viên vào ban`);
      setShowAddMemberModal(false);
      setSelectedMembers([]);
      setMemberSearchQuery("");
      // Reload members list
      await fetchMembersAndDepartment();
      // You might want to reload the department data here
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error("Không thể thêm thành viên vào ban");
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

    // Check if there are any available members to choose from
    const availableMembers = members.filter(member => 
      member.role !== 'HoOC' && member.role !== 'HoD'
    );
    
    if (availableMembers.length === 0) {
      toast.warning("Không có thành viên nào khác để chọn làm trưởng ban");
      return;
    }

    try {
      setChangingLeader(true);
      // Backend expects a userId, not membership id
      const newHoDUserId = selectedNewLeader.userId || selectedNewLeader.id;
      await departmentService.changeHoD(eventId, id, newHoDUserId);
      toast.success("Thay đổi trưởng ban thành công!");
      setShowChangeLeaderModal(false);
      setSelectedNewLeader(null);
      // Reload department and members data
      await fetchMembersAndDepartment();
    } catch (error) {
      console.error("Error changing leader:", error);
      toast.error("Không thể thay đổi trưởng ban");
    } finally {
      setChangingLeader(false);
    }
  };

  const handleCancelChangeLeader = () => {
    setShowChangeLeaderModal(false);
    setSelectedNewLeader(null);
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUnassignedMembers = unassignedMembers.filter(
    (member) =>
      member.userId?.fullName
        ?.toLowerCase()
        .includes(memberSearchQuery.toLowerCase()) ||
      member.userId?.email
        ?.toLowerCase()
        .includes(memberSearchQuery.toLowerCase())
  );

  if (!department) {
    return (
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
    );
  }

  return (
    <UserLayout
      title="Chi tiết phân ban"
      sidebarType="hooc"
      activePage="department-management"
    >
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

        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="bg-light rounded-3 p-3 text-center">
              <i className="bi bi-people-fill text-primary me-2"></i>
              <span style={{ fontWeight: "600" }}>
                {department.memberCount} thành viên
              </span>
            </div>
          </div>
          <div className="col-md-3">
            <div className="bg-light rounded-3 p-3 text-center">
              <i className="bi bi-person-plus text-success me-2"></i>
              <span style={{ fontWeight: "600" }}>
                {department.newMembersToday || 0} thành viên mới hôm nay
              </span>
            </div>
          </div>
          <div className="col-md-3">
            <div className="bg-light rounded-3 p-3 text-center">
              <i className="bi bi-clock text-info me-2"></i>
              <span style={{ fontWeight: "600" }}>
                Ngày tạo ban: {formatDate(department.createdAt)}
              </span>
            </div>
          </div>
          <div className="col-md-3">
            <div className="bg-light rounded-3 p-3 text-center">
              <i className="bi bi-clock text-warning me-2"></i>
              <span style={{ fontWeight: "600" }}>
                Thay đổi lần cuối: {formatDate(department.updatedAt)}
              </span>
            </div>
          </div>
        </div>

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
              <button
                className={`nav-link ${
                  activeTab === "settings" ? "active" : ""
                }`}
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
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "info" && (
          <div>
            {/* Member Management Bar */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm thành viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "300px", borderRadius: "8px" }}
              />
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
              >
                <i className="bi bi-plus-lg me-2"></i>
                Thêm thành viên
              </button>
            </div>

            {/* Members Table */}
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th
                      style={{
                        border: "none",
                        padding: "15px",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      <input type="checkbox" className="form-check-input" />
                    </th>
                    <th
                      style={{
                        border: "none",
                        padding: "15px",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Họ và tên
                    </th>
                    <th
                      style={{
                        border: "none",
                        padding: "15px",
                        fontWeight: "600",
                        color: "#374151",
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
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        border: "none",
                        padding: "15px",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td style={{ padding: "15px" }}>
                        <input type="checkbox" className="form-check-input" />
                      </td>
                      <td
                        style={{
                          padding: "15px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        {member.name}
                      </td>
                      <td style={{ padding: "15px", color: "#6b7280" }}>
                        {member.role}
                      </td>
                      <td style={{ padding: "15px", color: "#6b7280" }}>
                        {member.email}
                      </td>
                      <td style={{ padding: "15px" }}>
                        <div className="dropdown">
                          <button
                            className="btn btn-link text-decoration-none"
                            data-bs-toggle="dropdown"
                            style={{ color: "#6b7280" }}
                          >
                            <i className="bi bi-three-dots"></i>
                          </button>
                          <ul className="dropdown-menu">
                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() =>
                                  handleMemberAction(member.id, "remove")
                                }
                              >
                                Xoá thành viên khỏi ban
                              </button>
                            </li>
                            {member.role !== "HoD" && (
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() =>
                                    handleMemberAction(
                                      member.id,
                                      "change_leader"
                                    )
                                  }
                                >
                                  Thay đổi trưởng ban
                                </button>
                              </li>
                            )}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="row">
            {/* Cột trái - Chi tiết ban */}
            <div className="col-md-6">
              <div className="bg-light rounded-3 p-4 h-100">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h5
                    style={{
                      color: "#1f2937",
                      fontWeight: "600",
                      marginBottom: "20px",
                    }}
                  >
                    <i className="bi bi-info-circle me-2"></i>
                    Chi tiết ban
                  </h5>
                  {!editing ? (
                    <button
                      className="btn btn-outline-danger d-flex align-items-center"
                      onClick={handleEdit}
                      style={{ borderRadius: "8px", fontWeight: "500" }}
                    >
                      <i className="bi bi-pencil me-2"></i>
                      Chỉnh sửa
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-danger d-flex align-items-center"
                        onClick={handleSave}
                        style={{ borderRadius: "8px", fontWeight: "500" }}
                      >
                        <i className="bi bi-check-lg me-2"></i>
                        Lưu thay đổi
                      </button>
                      <button
                        className="btn btn-outline-secondary d-flex align-items-center"
                        onClick={handleCancel}
                        style={{ borderRadius: "8px", fontWeight: "500" }}
                      >
                        <i className="bi bi-x-lg me-2"></i>
                        Hủy
                      </button>
                    </>
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
                    }}
                  >
                    <i className="bi bi-person-badge me-2"></i>
                    Trưởng ban
                  </h5>
                  <p style={{ color: "#6b7280", marginBottom: "15px" }}>
                    Mỗi ban cần phải có một trưởng ban. Trưởng ban{" "}
                    {department.name} hiện tại:{" "}
                    <strong>{department.leader}</strong>
                  </p>
                  <button
                    className="btn btn-primary d-flex align-items-center"
                    style={{ borderRadius: "8px", fontWeight: "400" }}
                    onClick={() => setShowChangeLeaderModal(true)}
                  >
                    <i className="bi bi-arrow-repeat me-2"></i>
                    Đổi trưởng ban
                  </button>
                </div>

                {/* Delete Department */}
                <div className="bg-light rounded-3 p-4">
                  <h5
                    style={{
                      color: "#1f2937",
                      fontWeight: "600",
                      marginBottom: "20px",
                    }}
                  >
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Xoá ban
                  </h5>
                  <button
                    className="btn btn-danger d-flex align-items-center mb-2"
                    onClick={handleDeleteDepartment}
                    style={{
                      backgroundColor: "#dc2626",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "400",
                    }}
                  >
                    <i className="bi bi-trash me-2"></i>
                    Xoá ban vĩnh viễn
                  </button>
                  <p
                    style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}
                  >
                    Hành động này sẽ ảnh hưởng tới toàn bộ thành viên và không
                    thể hoàn tác.
                  </p>
                </div>
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
              <i
                className="bi bi-exclamation-triangle-fill text-danger me-2"
                style={{ fontSize: "1.2rem" }}
              ></i>
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
                className="btn btn-outline-secondary"
                onClick={handleCancelDelete}
                style={{ borderRadius: "8px" }}
              >
                Huỷ
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmName !== department.name}
                style={{ borderRadius: "8px" }}
              >
                Xoá
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
            className="bg-white rounded-3 p-4"
            style={{
              minWidth: "600px",
              maxWidth: "800px",
              maxHeight: "80vh",
              border: "1px solid #e5e7eb",
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
                <div className="text-center py-4">
                  <i
                    className="bi bi-people text-muted"
                    style={{ fontSize: "2rem" }}
                  ></i>
                  <p className="mt-2 text-muted">
                    {memberSearchQuery
                      ? "Không tìm thấy thành viên phù hợp"
                      : "Không có thành viên chưa có ban"}
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {filteredUnassignedMembers.map((member) => (
                    <div
                      key={member._id}
                      className={`d-flex align-items-center p-3 rounded-3 border cursor-pointer ${
                        selectedMembers.includes(member._id)
                          ? "bg-light border-primary"
                          : "border-light"
                      }`}
                      onClick={() => handleMemberSelect(member._id)}
                      style={{
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input me-3"
                        checked={selectedMembers.includes(member._id)}
                        onChange={() => handleMemberSelect(member._id)}
                      />
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center me-3"
                            style={{
                              width: "40px",
                              height: "40px",
                              backgroundColor: "#f3f4f6",
                              fontSize: "1.2rem",
                              fontWeight: "600",
                              color: "#6b7280",
                            }}
                          >
                            {member.userId?.fullName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <h6
                              className="mb-1"
                              style={{ color: "#1f2937", fontWeight: "500" }}
                            >
                              {member.userId?.fullName || "Unknown"}
                            </h6>
                            <p
                              className="mb-0"
                              style={{ color: "#6b7280", fontSize: "0.9rem" }}
                            >
                              {member.email || ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Count */}
            {selectedMembers.length > 0 && (
              <div className="mb-3">
                <p className="text-primary mb-0" style={{ fontWeight: "500" }}>
                  Đã chọn {selectedMembers.length} thành viên
                </p>
              </div>
            )}

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleCancelAddMember}
                style={{ borderRadius: "8px" }}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleAddSelectedMembers}
                disabled={selectedMembers.length === 0}
                style={{ borderRadius: "8px" }}
              >
                Thêm{" "}
                {selectedMembers.length > 0
                  ? `(${selectedMembers.length})`
                  : ""}{" "}
                thành viên
              </button>
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
              <i
                className="bi bi-exclamation-triangle-fill text-warning me-2"
                style={{ fontSize: "1.2rem" }}
              ></i>
              <h5
                className="mb-0"
                style={{ color: "#1f2937", fontWeight: "600" }}
              >
                Xoá thành viên khỏi ban
              </h5>
            </div>

            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              Bạn có chắc chắn muốn xoá <strong>{memberToRemove.name}</strong>{" "}
              khỏi ban {department.name}?
            </p>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-outline-secondary"
                onClick={handleCancelRemoveMember}
                style={{ borderRadius: "8px" }}
              >
                Huỷ
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmRemoveMember}
                style={{ borderRadius: "8px" }}
              >
                Xoá thành viên
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
              <i
                className="bi bi-arrow-repeat text-primary me-2"
                style={{ fontSize: "1.2rem" }}
              ></i>
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
                    member.role !== 'HoOC' && // Exclude HoOC
                    member.role !== 'HoD'    // Exclude current HoD
                  );
                  
                  if (availableMembers.length === 0) {
                    return (
                      <div className="p-4 text-center text-muted">
                        <i className="bi bi-people me-2"></i>
                        Không có thành viên nào khác để chọn làm trưởng ban
                      </div>
                    );
                  }
                  
                  return availableMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`p-3 border-bottom d-flex align-items-center ${
                        selectedNewLeader?.id === member.id ? 'bg-primary text-white' : ''
                      }`}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedNewLeader?.id === member.id ? '#0d6efd' : 'transparent'
                      }}
                      onClick={() => setSelectedNewLeader(member)}
                    >
                      <img
                        src={member.avatar || `https://i.pravatar.cc/100?u=${member.email}`}
                        className="rounded-circle me-3"
                        style={{ width: "40px", height: "40px" }}
                        alt={member.name}
                      />
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{member.name}</div>
                        <div className="small text-muted">{member.email}</div>
                        <div className="small">
                          <span className="badge bg-secondary">{member.role}</span>
                        </div>
                      </div>
                      {selectedNewLeader?.id === member.id && (
                        <i className="bi bi-check-circle-fill text-white"></i>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-outline-secondary"
                onClick={handleCancelChangeLeader}
                style={{ borderRadius: "8px" }}
                disabled={changingLeader}
              >
                Huỷ
              </button>
              <button
                className="btn btn-primary"
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
                  'Xác nhận thay đổi'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default HoOCDepartmentDetail;
