import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { milestoneService } from "../../services/milestoneService";
import { formatDate } from "~/utils/formatDate";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEvents } from "../../contexts/EventContext";
import Loading from "../../components/Loading";

const MilestoneDetail = () => {
  const navigate = useNavigate();
  const { eventId, id } = useParams();
  const { fetchEventRole, getEventRole, getEventMember } = useEvents();

  const [milestone, setMilestone] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [eventRole, setEventRole] = useState("");
  const [userDepartmentId, setUserDepartmentId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMilestoneDetail() {
      try {
        setLoading(true);
        setError("");
        const response = await milestoneService.getMilestoneDetail(eventId, id);
        // Handle response structure: could be { data: {...} } or direct object
        const milestoneData = response?.data || response;
        if (milestoneData) {
          setMilestone({
            ...milestoneData,
            relatedTasks: milestoneData.relatedTasks || []
          });
        } else {
          setError("Không tìm thấy cột mốc");
        }
      } catch (err) {
        console.error("Error fetching milestone:", err);
        if (err.response?.status === 403) {
          setError("Bạn không có quyền truy cập cột mốc này");
        } else if (err.response?.status === 404) {
          setError("Không tìm thấy cột mốc");
        } else {
          setError("Không thể tải thông tin cột mốc");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchMilestoneDetail();
  }, [id, eventId]);

  // Load event role and department info
  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      if (!eventId) {
        if (mounted) {
          setEventRole("");
          setUserDepartmentId(null);
        }
        return;
      }
      try {
        const role = await fetchEventRole(eventId);
        const memberInfo = getEventMember(eventId);
        const deptId = memberInfo?.departmentId || null;

        if (mounted) {
          setEventRole(role);
          setUserDepartmentId(deptId);
        }
      } catch (_) {
        if (mounted) {
          setEventRole("");
          setUserDepartmentId(null);
        }
      }
    };
    loadRole();
    return () => {
      mounted = false;
    };
  }, [eventId, fetchEventRole, getEventMember]);

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
  const handleEditMilestone = async () => {
    setIsEditing(true);
    try {
      navigate(`/events/${eventId}/hooc-edit-milestone/${id}`, {
        state: {
          milestone: milestone,
          relatedTasks: milestone.relatedTasks || [],
        },
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteMilestone = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmName === milestone.name) {
      setIsDeleting(true);
      try {
        const response = await milestoneService.deleteMilestone(eventId, id);
        toast.success("Xoá cột mốc thành công");
        setTimeout(() => {
          navigate(`/events/${eventId}/milestones`);
        }, 1000);
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || "Xoá cột mốc thất bại";
        toast.error(errorMessage);
        console.error("Error deleting milestone:", error);
        setShowDeleteModal(false);
        setDeleteConfirmName("");
        setIsDeleting(false);
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmName("");
  };

  const sidebarType =
    eventRole === "Member" ? "member" : eventRole === "HoD" ? "hod" : "hooc";

  if (loading) {
    return (
      <UserLayout
        title="Thông tin cột mốc"
        sidebarType={sidebarType}
        activePage="overview-timeline"
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
          <Loading />
          <p className="text-muted mt-3">Đang tải thông tin cột mốc...</p>
        </div>
      </UserLayout>
    );
  }

  if (error || !milestone) {
    return (
      <UserLayout
        title="Thông tin cột mốc"
        sidebarType={sidebarType}
        activePage="overview-timeline"
        eventId={eventId}
      >
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error || "Không tìm thấy cột mốc"}
        </div>
      </UserLayout>
    );
  }

  const isHoOC = eventRole === "HoOC";

  return (
    <UserLayout
      title="Thông tin cột mốc"
      sidebarType={sidebarType}
      activePage="overview-timeline"
      eventId={eventId}
    >
      <ToastContainer position="top-right" autoClose={3000} />
      {/* Main Content */}
      <div className="bg-white rounded-3 shadow-sm" style={{ padding: "30px" }}>
        {/* Milestone Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 style={{ color: "#1f2937", fontWeight: "600", margin: 0 }}>
            {milestone.name}
          </h3>
          {isHoOC && (
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary d-flex align-items-center"
                onClick={handleEditMilestone}
                style={{ borderRadius: "8px" }}
                disabled={isEditing}
              >
                {isEditing ? (
                  <i className="bi bi-arrow-clockwise spin-animation me-2"></i>
                ) : (
                  <i className="bi bi-pencil me-2"></i>
                )}
                {isEditing ? "Đang sửa..." : "Sửa cột mốc"}
              </button>
              <button
                className="btn btn-outline-danger d-flex align-items-center"
                onClick={handleDeleteMilestone}
                style={{ borderRadius: "8px" }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <i className="bi bi-arrow-clockwise spin-animation me-2"></i>
                ) : (
                  <i className="bi bi-trash me-2"></i>
                )}
                {isDeleting ? "Đang xoá..." : "Xoá cột mốc"}
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

        {/* Related Tasks - Only show for HoOC and HoD */}
        {eventRole !== "Member" && (
          <div>
            <h4
              style={{
                color: "#1f2937",
                fontWeight: "600",
                marginBottom: "20px",
              }}
            >
              Công việc liên quan ({(() => {
                // Filter tasks based on role
                if (eventRole === "HoOC") {
                  return milestone?.relatedTasks?.length || 0;
                } else if (eventRole === "HoD" && userDepartmentId) {
                  // Only count tasks from HoD's department
                  return milestone?.relatedTasks?.filter(task => {
                    const taskDeptId = task.departmentId;
                    return taskDeptId && String(taskDeptId) === String(userDepartmentId);
                  }).length || 0;
                }
                return 0;
              })()})
            </h4>

            <div className="d-flex flex-column gap-3">
              {(() => {
                // Filter tasks based on role
                let filteredTasks = [];

                if (eventRole === "HoOC") {
                  // HoOC sees all tasks
                  filteredTasks = milestone?.relatedTasks || [];
                } else if (eventRole === "HoD" && userDepartmentId) {
                  // HoD only sees tasks from their department
                  filteredTasks = (milestone?.relatedTasks || []).filter(task => {
                    // departmentId should now be a string from backend
                    const taskDeptId = task.departmentId;
                    return taskDeptId && String(taskDeptId) === String(userDepartmentId);
                  });
                }

                if (filteredTasks.length > 0) {
                  return filteredTasks.map((task, index) => {
                    const taskId = task.id || task._id || `task-${index}`;
                    const taskName = task.name || task.title || "Không có tên";
                    const taskStatus = task.status || "todo";
                    return (
                      <div
                        key={taskId}
                        className="d-flex justify-content-between align-items-center p-3 border rounded-3"
                        style={{ border: "1px solid #e5e7eb" }}
                      >
                        <span style={{ color: "#374151", fontWeight: "500" }}>
                          {taskName}
                        </span>
                        <span
                          className="badge px-3 py-2"
                          style={{
                            backgroundColor: getTaskStatusColor(taskStatus),
                            color: "white",
                            fontSize: "0.9rem",
                            borderRadius: "20px",
                          }}
                        >
                          {getTaskStatusLabel(taskStatus)}
                        </span>
                      </div>
                    );
                  });
                } else {
                  return (
                    <div className="text-muted text-center py-4">
                      <i className="bi bi-inbox me-2"></i>
                      {eventRole === "HoD"
                        ? "Chưa có công việc nào của ban bạn được gán cho cột mốc này"
                        : "Chưa có công việc nào được gán cho cột mốc này"}
                    </div>
                  );
                }
              })()}
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
                disabled={isDeleting}
              >
                Huỷ
              </button>
              <button
                className="btn btn-danger d-flex align-items-center"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmName !== milestone.name || isDeleting}
                style={{ borderRadius: "8px" }}
              >
                {isDeleting ? (
                  <i className="bi bi-arrow-clockwise spin-animation me-2"></i>
                ) : (
                  <i className="bi bi-trash me-2"></i>
                )}
                {isDeleting ? "Đang xoá..." : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default MilestoneDetail;
