import { useEffect, useMemo, useState, useCallback } from "react";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import NoDataImg from "~/assets/no-data.png";
import Loading from "../../components/Loading";
import { taskApi } from "~/apis/taskApi";
import { eventApi } from "~/apis/eventApi";
import { userApi } from "~/apis/userApi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import KanbanBoardTask from "~/components/KanbanBoardTask";
import { useAuth } from "~/contexts/AuthContext";
import { ClipboardList, FileText, Users, User, Calendar, BarChart3 } from "lucide-react";

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Ho_Chi_Minh",
});

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return dateTimeFormatter.format(date);
  } catch (err) {
    console.error("formatDateTime error:", err);
    return "";
  }
};

const STATUS_OPTIONS = [
  { value: "chua_bat_dau", label: "Chưa bắt đầu" },
  { value: "da_bat_dau", label: "Đang làm" },
  { value: "hoan_thanh", label: "Hoàn thành" },
  { value: "huy", label: "Đã hủy" },
];

const STATUS_LABEL_MAP = STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const STATUS_STYLE_MAP = {
  chua_bat_dau: { bg: "#F3F4F6", color: "#374151" },
  da_bat_dau: { bg: "#FEF3C7", color: "#92400E" },
  hoan_thanh: { bg: "#DCFCE7", color: "#166534" },
  huy: { bg: "#FEE2E2", color: "#991B1B" },
};

const STATUS_TRANSITIONS = {
  chua_bat_dau: ["da_bat_dau", "huy"],
  da_bat_dau: ["hoan_thanh", "huy"],
  hoan_thanh: [],
  huy: [],
};

export default function MemberTaskPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { eventId } = useParams();
  const [sortBy, setSortBy] = useState("DeadlineDesc");
  const [filterStatus, setFilterStatus] = useState("all");
  const navigate = useNavigate();

  const [eventRole, setEventRole] = useState("");
  const [memberId, setMemberId] = useState(null);
  const [memberInfoLoading, setMemberInfoLoading] = useState(true);
  const { user } = useAuth();

  // Load event role and memberId
  useEffect(() => {
    if (!eventId || !user) {
      setMemberInfoLoading(false);
      return;
    }

    const fetchRoleAndMember = async () => {
      try {
        const roleResponse = await userApi.getUserRoleByEvent(eventId);
        const role = roleResponse?.role || "";
        setEventRole(role);

        let memId =
          roleResponse?.eventMemberId ||
          roleResponse?.memberId ||
          roleResponse?._id;

        if (!memId) {
          const summary = await eventApi.getEventSummary(eventId);
          const members =
            summary?.data?.members ||
            summary?.members ||
            [];
          const foundMember = members.find((member) => {
            const memberUserId =
              member?.userId?._id ||
              member?.userId?.id ||
              member?.userId;
            return (
              (memberUserId && String(memberUserId) === String(user._id)) ||
              (member?.userId?.email &&
                member.userId.email.toLowerCase() ===
                  user.email?.toLowerCase())
            );
          });
          if (foundMember?._id) {
            memId = foundMember._id;
          }
        }

        if (memId) {
          setMemberId(String(memId));
        } else {
          console.warn("Không tìm thấy memberId cho người dùng hiện tại.");
          setMemberId(null);
        }
      } catch (err) {
        console.error("Error getting user role/memberId:", err);
        setEventRole("");
        setMemberId(null);
      } finally {
        setMemberInfoLoading(false);
      }
    };

    fetchRoleAndMember();
  }, [eventId, user]);

  const initialTasks = useMemo(() => [], []);
  const [tasks, setTasks] = useState(initialTasks);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState("list");
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchTasks = useCallback(() => {
    if (!eventId || !memberId) {
      console.log("Cannot fetch tasks - eventId:", eventId, "memberId:", memberId);
      setLoadingTasks(false);
      return;
    }
    setLoadingTasks(true);
    taskApi
      .getTaskByEvent(eventId)
      .then((apiRes) => {
        const arr = apiRes?.data || [];
        console.log("Total tasks fetched:", arr.length);
        console.log("Looking for memberId:", memberId);

        // Filter tasks by assigneeId - chỉ hiển thị tasks được giao cho member
        const myTasks = arr.filter(task => {
          const taskAssigneeId = task.assigneeId?._id || task.assigneeId;
          const matches = String(taskAssigneeId) === String(memberId);
          if (taskAssigneeId) {
            console.log("Task assigneeId:", taskAssigneeId, "matches:", matches);
          }
          return matches;
        });

        console.log("Filtered tasks for member:", myTasks.length);

        const mapped = myTasks.map((task) => {
          const statusCode = task?.status || "chua_bat_dau";
          const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
          const assignedAtDate = task?.createdAt ? new Date(task.createdAt) : null;
          const updatedAtDate = task?.updatedAt ? new Date(task.updatedAt) : null;
          return {
            id: task?._id,
            name: task?.title || "",
            description: task?.description || "",
            department: task?.departmentId?.name || "Chưa phân công",
            assignee: task?.assigneeId?.userId?.fullName || "Chưa phân công",
            assigneeId: task?.assigneeId?._id || task?.assigneeId || null,
            milestone: task?.milestoneId || "Chưa có",
            due: dueDate ? formatDateTime(dueDate) : "",
            dueDateValue: dueDate ? dueDate.getTime() : 0,
            statusCode,
            status: STATUS_LABEL_MAP[statusCode] || "Không xác định",
            estimate: task?.estimate != null && task?.estimateUnit ? `${task.estimate}${task.estimateUnit}` : "Ước tính",
            createdBy: task?.createdBy?.fullName || task?.createdBy?.name || "----",
            createdById: task?.createdBy?._id || task?.createdBy || null,
            assignedAt: assignedAtDate ? formatDateTime(assignedAtDate) : "",
            assignedAtValue: assignedAtDate ? assignedAtDate.getTime() : 0,
            createdAt: assignedAtDate ? formatDateTime(assignedAtDate) : "",
            updatedAt: updatedAtDate ? formatDateTime(updatedAtDate) : "",
            progressPct: typeof task?.progressPct === "number" ? task.progressPct : "Tiến độ",
          };
        });
        setTasks(mapped);
      })
      .catch((err) => setTasks([]))
      .finally(() => setLoadingTasks(false));
  }, [eventId, memberId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Cập nhật thời gian mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const statusColor = (code) => {
    return STATUS_STYLE_MAP[code] || { bg: "#E2E8F0", color: "#1E293B" };
  };

  const filteredTasks = tasks
    .filter((task) => task.name.toLowerCase().includes(search.toLowerCase()))
    .filter((task) => {
      if (filterStatus === "all") return true;
      return task.statusCode === filterStatus;
    })
    .sort((a, b) => {
      const aValue = typeof a.dueDateValue === "number" ? a.dueDateValue : 0;
      const bValue = typeof b.dueDateValue === "number" ? b.dueDateValue : 0;
      if (sortBy === "DeadlineAsc") return aValue - bValue;
      if (sortBy === "DeadlineDesc") return bValue - aValue;
      return 0;
    });
    
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.statusCode === "hoan_thanh").length,
    inProgress: tasks.filter((t) => t.statusCode === "da_bat_dau").length,
    notStarted: tasks.filter((t) => t.statusCode === "chua_bat_dau").length,
    cancelled: tasks.filter((t) => t.statusCode === "huy").length,
  };

  const handleUpdateTaskStatus = async (taskId, newStatusCode) => {
    const previousTasks = [...tasks];
    const previousSelectedTask = selectedTask;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (String(task.assigneeId) !== String(memberId)) {
      toast.error("Bạn chỉ có thể cập nhật công việc được giao cho mình.");
      return;
    }
    const allowedTransitions = STATUS_TRANSITIONS[task?.statusCode] || [];
    
    if (!allowedTransitions.includes(newStatusCode)) {
      toast.error(`Không thể chuyển từ "${task?.status}" sang "${STATUS_LABEL_MAP[newStatusCode]}"`);
      return;
    }
    
    const updatedTasks = tasks.map((t) => (
      t.id === taskId
        ? { ...t, statusCode: newStatusCode, status: STATUS_LABEL_MAP[newStatusCode] || t.status }
        : t
    ));
    setTasks(updatedTasks);
    setSelectedTask((st) =>
      st && st.id === taskId ? { ...st, statusCode: newStatusCode, status: STATUS_LABEL_MAP[newStatusCode] || st.status } : st
    );

    try {
      await taskApi.updateTaskProgress(eventId, taskId, newStatusCode);
      toast.success("Cập nhật trạng thái thành công!");
    } catch (error) {
      setTasks(previousTasks);
      setSelectedTask(previousSelectedTask);
      const errorMessage = error?.response?.data?.message || "Cập nhật trạng thái thất bại";
      toast.error(errorMessage);
      console.error("Error updating task status:", error);
    }
  };

  const handleDetail = (taskId) => {
    navigate(`/events/${eventId}/tasks/${taskId}`);
  };

  // Group tasks trước khi truyền sang board
  const statusGroup = tasks.reduce(
    (acc, t) => {
      if (t.statusCode === "da_bat_dau") acc.inProgress.push(t);
      else if (t.statusCode === "hoan_thanh") acc.done.push(t);
      else acc.notStarted.push(t);
      return acc;
    },
    { notStarted: [], inProgress: [], done: [] }
  );

  if (memberInfoLoading) {
    return (
      <UserLayout
        title="Danh sách công việc"
        activePage="work-board"
        sidebarType="member"
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
          <Loading />
          <p className="text-muted mt-3">Đang tải thông tin thành viên...</p>
        </div>
      </UserLayout>
    );
  }

  if (!memberId) {
    return (
      <UserLayout
        title="Danh sách công việc"
        activePage="work-board"
        sidebarType="member"
        eventId={eventId}
      >
        <div className="alert alert-warning" style={{ margin: "20px" }}>
          <h5>Không tìm thấy thông tin thành viên</h5>
          <p>Bạn chưa được phân công vào sự kiện này. Vui lòng liên hệ Trường ban tổ chức để được phân công.</p>
        </div>
      </UserLayout>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <UserLayout
        title={t("taskPage.title")}
        activePage="work-board"
        sidebarType="member"
        eventId={eventId}
      >
        <style>{`
        .task-header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px; }
        .stat-card { background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .soft-input { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; height: 44px; transition: all 0.2s; }
        .soft-input:focus { background: white; border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .soft-card { background: white; border: 1px solid #E5E7EB; border-radius: 16px; box-shadow: 0 1px 3px rgba(16,24,40,.06); }

        .task-row { cursor: pointer; transition: background 0.2s; }
        .task-row:hover { background: #F9FAFB; }
        .status-badge { padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .status-badge:hover { opacity: 0.8; }

        .rounded-table { border-radius: 16px; overflow: hidden; }
        .rounded-table table { margin-bottom: 0; }
        .rounded-table thead { background: #F9FAFB; }
        .rounded-table thead th { border-bottom: 2px solid #E5E7EB !important; }

        .rounded-table tbody tr:not(:last-child) td { border-bottom: 1px solid #EEF2F7; }

        .col-name { padding-left: 20px !important; }

        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 999; }
        .task-detail-panel {
          position: fixed; right: 0; top: 0; bottom: 0;
          width: 420px; max-width: 92vw; background: #fff;
          box-shadow: -4px 0 16px rgba(0,0,0,0.12);
          z-index: 1000;
          transform: translateX(100%);
          transition: transform .3s ease;
        }
        .task-detail-panel.open { transform: translateX(0); }

        .tabs-bar { display: flex; gap: 20px; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px; }
        .tab-btn { padding: 10px 0; font-weight: 600; color: #6B7280; border: none; background: transparent; position: relative; }
        .tab-btn.active { color: #111827; }
        .tab-btn.active::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; border-radius: 9999px; background: #3B82F6; }
        .sort-inline { margin-left: auto; display: flex; align-items: center; gap: 8px; }

        .rounded-table .table-responsive,
        .kanban-board-scroll,
        .soft-card {
          scrollbar-width: thin;
          scrollbar-color: #b6beca #f1f3f6;
        }
        .rounded-table .table-responsive::-webkit-scrollbar,
        .kanban-board-scroll::-webkit-scrollbar,
        .soft-card::-webkit-scrollbar {
          width: 7px;
          background: #f1f3f6;
          border-radius: 8px;
          height: 10px;
        }
        .rounded-table .table-responsive::-webkit-scrollbar-thumb,
        .kanban-board-scroll::-webkit-scrollbar-thumb,
        .soft-card::-webkit-scrollbar-thumb {
          background: #b6beca;
          border-radius: 8px;
          min-height: 48px;
          transition: background 0.2s;
        }
        .rounded-table .table-responsive::-webkit-scrollbar-thumb:hover,
        .kanban-board-scroll::-webkit-scrollbar-thumb:hover,
        .soft-card::-webkit-scrollbar-thumb:hover {
          background: #8894aa;
        }
        .rounded-table .table-responsive::-webkit-scrollbar-track,
        .kanban-board-scroll::-webkit-scrollbar-track,
        .soft-card::-webkit-scrollbar-track {
          background: #f1f3f6;
          border-radius: 8px;
        }
        .rounded-table .table-responsive { overflow-x: auto; }
        .rounded-table .table-responsive::-webkit-scrollbar:horizontal {
          height: 0;
          background: transparent;
        }
      `}</style>

        <div className="container-fluid" style={{ maxWidth: 1200 }}>
          <div className="task-header">
            <div className="row align-items-center">
              <div className="col-md-6">
                <h3 className="mb-2">Danh sách công việc của tôi</h3>
                <p className="mb-0 opacity-75">
                  Các công việc được giao cho bạn
                </p>
              </div>
              <div className="col-md-6">
                <div className="row g-2">
                  <div className="col-6">
                    
                  </div>
                  <div className="col-6">
                    <div
                      className="stat-card text-center"
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "none",
                        color: "white",
                      }}
                    >
                      <div className="fs-4 fw-bold">
                        {taskStats.completed}/{taskStats.total}
                      </div>
                      <div className="small">
                        Công việc đã hoàn thành
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center mb-2">
            <div className="tabs-bar flex-grow-1">
              <button
                className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                Danh sách công việc
              </button>
              <button
                className={`tab-btn ${activeTab === "board" ? "active" : ""}`}
                onClick={() => setActiveTab("board")}
              >
                Bảng công việc
              </button>
            </div>
            <div className="sort-inline">
              <span className="text-muted small">Sắp xếp theo</span>
              <select
                className="form-select form-select-sm soft-input"
                style={{ width: 140, height: 40 }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sắp xếp theo deadline"
              >
                <option value="DeadlineDesc">Mới nhất</option>
                <option value="DeadlineAsc">Cũ nhất</option>
              </select>
            </div>
          </div>

          {activeTab === "list" && (
            <>
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm công việc..."
                  className="form-control soft-input"
                  style={{ width: 320, paddingLeft: 16 }}
                />

                <select
                  className="form-select form-select-sm soft-input"
                  style={{ width: 160, height: 40 }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Lọc theo trạng thái"
                >
                  <option value="all">Tất cả trạng thái</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {loadingTasks ? (
                <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
                  <Loading />
                  <p className="text-muted mt-3">Đang tải danh sách công việc...</p>
                </div>
              ) : (
                <div className="soft-card rounded-table">
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr className="text-muted">
                        <th className="py-3" style={{ width: "5%" }}>
                          STT
                        </th>
                        <th className="py-3 col-name" style={{ width: "15%" }}>
                          Ban phụ trách
                        </th>
                        <th className="py-3" style={{ width: "25%" }}>
                          Công việc
                        </th>
                        <th className="py-3" style={{ width: "15%" }}>
                          Người tạo
                        </th>
                        <th className="py-3" style={{ width: "15%" }}>
                          Thời gian giao
                        </th>
                        <th className="py-3" style={{ width: "15%" }}>
                          Trạng thái
                        </th>
                        <th className="py-3" style={{ width: "15%" }}>
                          Deadline
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-5">
                            <div className="d-flex flex-column justify-content-center align-items-center py-4">
                              <img
                                src={NoDataImg}
                                alt="Không có dữ liệu"
                                style={{
                                  width: 100,
                                  maxWidth: "40vw",
                                  opacity: 0.8,
                                }}
                              />
                              <div
                                className="text-muted mt-3"
                                style={{ fontSize: 16 }}
                              >
                                Bạn chưa có công việc nào được giao.
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredTasks.map((task, idx) => {
                          const taskStatusStyle = statusColor(task.statusCode);
                          const allowedTransitions = STATUS_TRANSITIONS[task.statusCode] || [];
                          const nextStatus = allowedTransitions.length > 0 
                            ? allowedTransitions[0] 
                            : null;
                          
                          return (
                            <tr
                              key={task.id}
                              className="task-row"
                              onClick={() => setSelectedTask(task)}
                            >
                              <td className="py-3 text-muted small">{idx + 1}</td>
                              <td className="py-3 col-name">
                                <div className="fw-medium">{task.department}</div>
                              </td>
                              <td className="py-3">
                                <div className="fw-semibold">{task.name}</div>
                                {task.description && (
                                  <div className="text-muted small text-truncate" style={{ maxWidth: 400 }}>
                                    {task.description}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 text-muted">
                                {task.createdBy || "----"}
                              </td>
                              <td className="py-3 text-muted small">
                                {task.assignedAt || "----"}
                              </td>
                              <td className="py-3">
                                <span
                                  className="status-badge"
                                  style={{
                                    backgroundColor: taskStatusStyle.bg,
                                    color: taskStatusStyle.color,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (nextStatus) {
                                      handleUpdateTaskStatus(task.id, nextStatus);
                                    } else {
                                      toast.info("Không thể thay đổi trạng thái từ trạng thái hiện tại");
                                    }
                                  }}
                                  title={nextStatus ? `Click để chuyển sang: ${STATUS_LABEL_MAP[nextStatus]}` : "Không thể thay đổi trạng thái"}
                                >
                                  {task.status}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className="text-muted small">
                                  {task.due}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </>
          )}

          {activeTab === "board" && (
            <div className="soft-card p-4 text-muted">
              <div
                className="alert alert-info d-flex align-items-start gap-2"
                style={{ fontSize: 13, borderRadius: 12 }}
              >
                <span style={{ fontSize: 18 }}>💡</span>
                <div>
                  Bạn có thể đổi trạng thái công việc bằng cách bấm trực tiếp vào
                  badge trạng thái trong bảng danh sách hoặc kéo thả trong bảng Kanban
                  (chỉ áp dụng cho các task bạn được giao).
                </div>
              </div>
              <KanbanBoardTask
                eventId={eventId}
                listTask={statusGroup}
                onTaskMove={fetchTasks}
                currentEventMemberId={memberId}
              />
            </div>
          )}
        </div>

        {selectedTask && (
          <>
            <div className="overlay" onClick={() => setSelectedTask(null)} />
            <div className={`task-detail-panel ${selectedTask ? "open" : ""}`}>
              <div
                className="p-4"
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <h5 className="mb-0">Chi tiết công việc</h5>
                  <button
                    className="btn btn-sm btn-light rounded-circle"
                    style={{ width: 32, height: 32 }}
                    onClick={() => setSelectedTask(null)}
                  >
                    ×
                  </button>
                </div>

                <div className="flex-grow-1 overflow-auto">
                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      Tên công việc
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <ClipboardList size={20} />
                      <span className="fw-semibold fs-5">{selectedTask.name}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      Mô tả
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <FileText size={20} />
                      <span className="text-muted">
                        {selectedTask.description || "Chưa có mô tả"}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      Ban phụ trách
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <Users size={20} />
                      <span>{selectedTask.department}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">Deadline</label>
                    <div className="d-flex align-items-center gap-2">
                      <Calendar size={20} />
                      <span>{selectedTask.due}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      Thời gian giao
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <Calendar size={20} />
                      <span>{selectedTask.assignedAt || "Chưa xác định"}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">Trạng thái</label>
                    <div className="d-flex align-items-center gap-2">
                      <BarChart3 size={20} />
                      <span>{selectedTask.status}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      Ước tính thời gian thực hiện
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <Calendar size={20} />
                      <span>{selectedTask.estimate}</span>
                    </div>
                  </div>
                </div>

                <div className="border-top pt-3">
                  <button
                    className="btn btn-danger w-100"
                    onClick={() => handleDetail(selectedTask.id)}
                  >
                    Xem thông tin chi tiết
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </UserLayout>
    </>
  );
}

