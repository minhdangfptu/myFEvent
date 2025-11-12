import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { milestoneService } from "../../services/milestoneService";
import { formatDate } from "~/utils/formatDate";
import { toast } from "react-toastify";
import { useEvents } from "../../contexts/EventContext";

const MilestoneDetail = () => {
  const navigate = useNavigate();
  const { eventId, id } = useParams();
  const { fetchEventRole, getEventRole } = useEvents();

  const [milestone, setMilestone] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [eventRole, setEventRole] = useState("");

  useEffect(() => {
    async function fetchMilestoneDetail() {
      const response = await milestoneService.getMilestoneDetail(eventId, id);
      setMilestone(response);
    }
    fetchMilestoneDetail();
  }, [id]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Đã lên kế hoạch":
        return "#3b82f6";
      case "Đang thực hiện":
        return "#f59e0b";
      case "Đã hoàn thành":
        return "#10b981";
      case "Trễ hạn":
        return "#dc2626";
      case "Đã hủy":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };
  // Load event role to decide sidebar and actions visibility
  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      if (!eventId) {
        if (mounted) setEventRole("");
        return;
      }
      try {
        const role = await fetchEventRole(eventId);
        if (mounted) setEventRole(role);
      } catch (_) {
        if (mounted) setEventRole("");
      }
    };
    loadRole();
    return () => {
      mounted = false;
    };
  }, [eventId, fetchEventRole]);

  const getTaskStatusLabel = (status) => {
    switch (status) {
      case "todo":
        return "Chưa bắt đầu";
      case "in_progress":
        return "Đang làm";
      case "blocked":
        return "Bị chặn";
      case "done":
        return "Đã hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return "Chưa bắt đầu";
    }
  };
  const getTaskStatusColor = (status) => {
    switch (status) {
      case "todo":
        return "#6b7280";
      case "in_progress":
        return "#f59e0b";
      case "blocked":
        return "#dc2626";
      case "done":
        return "#10b981";
      case "cancelled":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };
  const getMilestoneStatusLabel = (status) => {
    switch (status) {
      case "planned":
        return "Sắp tới";
      case "in_progress":
        return "Đang làm";
      case "completed":
        return "Đã hoàn thành";
      case "delayed":
        return "Trễ hạn";
      case "cancelled":
        return "Đã hủy";
      default:
        return "Sắp tới";
    }
  };
  const getMilestoneStatusColor = (status) => {
    switch (status) {
      case "planned":
        return "#6b7280";
      case "in_progress":
        return "#f59e0b";
      case "completed":
        return "#10b981";
      case "delayed":
        return "#dc2626";
      case "cancelled":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };
  const handleEditMilestone = () => {
    navigate(`/events/${eventId}/hooc-edit-milestone/${id}`, {
      state: {
        milestone: milestone,
        relatedTasks: milestone.relatedTasks || [],
      },
    });
  };

  const handleDeleteMilestone = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmName === milestone.name) {
      // Xử lý xóa milestone
      try {
        const response = await milestoneService.deleteMilestone(eventId, id);
        toast.success("Xoá cột mốc thành công");
        navigate(`/events/${eventId}/hooc-manage-milestone`);
      } catch (error) {
        toast.error("Xoá cột mốc thất bại");
        console.error("Error deleting milestone:", error);
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmName(milestone.name);
  };

  if (!milestone) {
    return <div>Loading...</div>;
  }

  const sidebarType =
    eventRole === "Member" ? "member" : eventRole === "HoD" ? "hod" : "hooc";
  const isMember = eventRole === "Member";

  return (
    <UserLayout
      title="Thông tin cột mốc"
      sidebarType={sidebarType}
      activePage="overview-timeline"
      eventId={eventId}
    >
      {/* Main Content */}
      <div className="bg-white rounded-3 shadow-sm" style={{ padding: "30px" }}>
        {/* Milestone Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 style={{ color: "#1f2937", fontWeight: "600", margin: 0 }}>
            {milestone.name}
          </h3>
          {!isMember && (
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary d-flex align-items-center"
                onClick={handleEditMilestone}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-pencil me-2"></i>
                Sửa cột mốc
              </button>
              <button
                className="btn btn-outline-danger d-flex align-items-center"
                onClick={handleDeleteMilestone}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-trash me-2"></i>
                Xoá cột mốc
              </button>
            </div>
          )}
        </div>

        {/* Milestone Info Card */}
        <div
          className="bg-white border rounded-3 p-4 mb-4"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  Ngày:{" "}
                </span>
                <span style={{ fontWeight: "500", fontSize: "1rem" }}>
                  {formatDate(milestone.date)}
                </span>
              </div>

              <div className="mb-3">
                <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  Trạng thái:{" "}
                </span>
                <span
                  className="badge px-3 py-2"
                  style={{
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    fontSize: "0.9rem",
                    borderRadius: "20px",
                  }}
                >
                  {getMilestoneStatusLabel(milestone.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Mô tả:{" "}
            </span>
            <p className="mt-2" style={{ color: "#4b5563", lineHeight: "1.6" }}>
              {milestone.description}
            </p>
          </div>
        </div>

        {/* Related Tasks */}
        <div>
          <h4
            style={{
              color: "#1f2937",
              fontWeight: "600",
              marginBottom: "20px",
            }}
          >
            Công việc liên quan ({milestone.relatedTasks.length})
          </h4>

          <div className="d-flex flex-column gap-3">
            {milestone.relatedTasks.map((task) => (
              <div
                key={task.id}
                className="d-flex justify-content-between align-items-center p-3 border rounded-3"
                style={{ border: "1px solid #e5e7eb" }}
              >
                <span style={{ color: "#374151", fontWeight: "500" }}>
                  {task.name}
                </span>
                <span
                  className="badge px-3 py-2"
                  style={{
                    backgroundColor: getStatusColor(task.status),
                    color: "white",
                    fontSize: "0.9rem",
                    borderRadius: "20px",
                  }}
                >
                  {getTaskStatusLabel(task.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
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
                Xoá cột mốc
              </h5>
            </div>

            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              Hành động này sẽ xoá vĩnh viễn cột mốc này và không thể hoàn tác.
            </p>

            <div className="mb-3">
              <label
                className="form-label"
                style={{ color: "#374151", fontWeight: "500" }}
              >
                Tên cột mốc
              </label>
              <input
                type="text"
                className="form-control"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Nhập tên cột mốc để xác nhận"
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
                disabled={deleteConfirmName !== milestone.name}
                style={{ borderRadius: "8px" }}
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default MilestoneDetail;
