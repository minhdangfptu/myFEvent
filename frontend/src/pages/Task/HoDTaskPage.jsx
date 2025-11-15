import { useEffect, useMemo, useState, useCallback } from "react";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import NoDataImg from "~/assets/no-data.png";
import { taskApi } from "~/apis/taskApi";
import { departmentService } from "~/services/departmentService";
import { milestoneApi } from "~/apis/milestoneApi";
import { eventApi } from "~/apis/eventApi";
import { userApi } from "~/apis/userApi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import KanbanBoardTask from "~/components/KanbanBoardTask";
import TaskAssignmentBoard from "~/components/TaskAssignmentBoard";
import { useAuth } from "~/contexts/AuthContext";

export default function HoDTaskPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { eventId } = useParams();
  const [sortBy, setSortBy] = useState("Tên");
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  const [eventRole, setEventRole] = useState("");
  const [departmentId, setDepartmentId] = useState(null);
  const [department, setDepartment] = useState(null);
  const { user } = useAuth();

  // Load event role and departmentId
  useEffect(() => {
    if (!eventId) return;
    userApi
      .getUserRoleByEvent(eventId)
      .then((roleResponse) => {
        const role = roleResponse?.role || "";
        setEventRole(role);
        
        // Get departmentId from response if HoD
        if (role === "HoD" && roleResponse?.departmentId) {
          const deptId = roleResponse.departmentId?._id || roleResponse.departmentId;
          if (deptId) {
            setDepartmentId(deptId);
          }
        }
      })
      .catch(() => {
        setEventRole("");
        setDepartmentId(null);
      });
  }, [eventId]);

  const initialTasks = useMemo(() => [], []);
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState("list");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [eventInfo, setEventInfo] = useState(null);

  // Load department info
  useEffect(() => {
    if (!eventId || !departmentId) return;
    departmentService
      .getDepartmentDetail(eventId, departmentId)
      .then((dept) => setDepartment(dept || null))
      .catch(() => setDepartment(null));
  }, [eventId, departmentId]);

  useEffect(() => {
    if (!eventId) return;
    
    // Lấy thông tin sự kiện để validate deadline
    eventApi.getById(eventId)
      .then((res) => {
        const event = res?.data?.event || res?.data;
        if (event) {
          setEventInfo({
            eventStartDate: event.eventStartDate,
            eventEndDate: event.eventEndDate,
          });
        }
      })
      .catch(() => {
        setEventInfo(null);
      });
  }, [eventId]);

  const fetchTasks = useCallback(() => {
    if (!eventId || !departmentId) return;
    taskApi
      .getTaskByEvent(eventId)
      .then((apiRes) => {
        const arr = apiRes?.data || [];
        
        // Filter tasks by departmentId - chỉ hiển thị tasks của ban mình
        const deptTasks = arr.filter(task => {
          const taskDeptId = task.departmentId?._id || task.departmentId || task.department?._id || task.department;
          return String(taskDeptId) === String(departmentId);
        });
        
        const mapped = deptTasks.map((task) => {
          return {
            id: task?._id,
            name: task?.title || "",
            description: task?.description || "",
            department: task?.departmentId?.name || "Chưa phân công",
            assignee: task?.assigneeId?.userId?.fullName || "Chưa phân công",
            assigneeId: task?.assigneeId?._id || task?.assigneeId || null, // Keep assigneeId for assignment board
            milestone: task?.milestoneId || "Chưa có",
            parent: task?.parentId || "Chưa có",
            due: task?.dueDate ? new Date(task.dueDate).toLocaleDateString("vi-VN") : "",
            status:
              task?.status === "done"
                ? "Hoàn thành"
                : task?.status === "blocked"
                ? "Tạm hoãn"
                : task?.status === "todo"
                ? "Chưa bắt đầu"
                : task?.status === "cancelled"
                ? "Đã huỷ"
                : "Đang làm",
            estimate: task?.estimate != null && task?.estimateUnit ? `${task.estimate}${task.estimateUnit}` : "Ước tính",
            createdAt: task?.createdAt ? new Date(task.createdAt).toLocaleDateString("vi-VN") : "Thời gian",
            updatedAt: task?.updatedAt ? new Date(task.updatedAt).toLocaleDateString("vi-VN") : "Thời gian",
            progressPct: typeof task?.progressPct === "number" ? task.progressPct : "Tiến độ",
          };
        });
        setTasks(mapped);
      })
      .catch((err) => setTasks([]));
  }, [eventId, departmentId]);

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

  const statusColor = (s) => {
    if (s === "Hoàn thành") return { bg: "#DCFCE7", color: "#16A34A" };
    if (s === "Tạm hoãn") return { bg: "#FEE2E2", color: "#DC2626" };
    return { bg: "#FEF3C7", color: "#D97706" };
  };

  const filteredTasks = tasks
    .filter((task) => task.name.toLowerCase().includes(search.toLowerCase()))
    .filter((task) => filterStatus === "Tất cả" || task.status === filterStatus)
    .sort((a, b) => {
      const parse = (d) => {
        const [day, month, year] = d.split("/");
        return new Date(`${year}-${month}-${day}`);
      };
      if (sortBy === "DeadlineAsc") return parse(a.due) - parse(b.due);
      if (sortBy === "DeadlineDesc") return parse(b.due) - parse(a.due);
      return 0;
    });
    
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "Hoàn thành").length,
    inProgress: tasks.filter((t) => t.status === "Đang làm").length,
    paused: tasks.filter((t) => t.status === "Tạm hoãn").length,
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    const statusMapToBackend = (s) => {
      if (s === "Hoàn thành") return "done";
      if (s === "Đang làm") return "in_progress";
      if (s === "Tạm hoãn") return "blocked";
      if (s === "Đã huỷ") return "cancelled";
      return "todo";
    };

    const backendStatus = statusMapToBackend(newStatus);
    
    const previousTasks = [...tasks];
    const previousSelectedTask = selectedTask;
    
    const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    setTasks(updatedTasks);
    setSelectedTask((st) =>
      st && st.id === taskId ? { ...st, status: newStatus } : st
    );

    try {
      await taskApi.updateTaskProgress(eventId, taskId, backendStatus);
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

  const [addTaskForm, setAddTaskForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    assigneeId: "",
    startDate: "",
    dueDate: "",
    estimate: "",
    estimateUnit: "h",
    milestoneId: "",
    parentId: "",
    dependencies: [],
  });
  const [assignees, setAssignees] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [parents, setParents] = useState([]);
  const [deps, setDeps] = useState([]);
  const [addTaskError, setAddTaskError] = useState("");
  const [depSearch, setDepSearch] = useState("");

  // Filter dependencies - chỉ hiển thị tasks của ban mình
  const filteredDeps = useMemo(() => {
    const text = (depSearch || "").toLowerCase();
    return (deps || []).filter((d) => {
      const taskDeptId = d.departmentId?._id || d.departmentId || d.department?._id || d.department;
      const byDept = String(taskDeptId) === String(departmentId);
      const byText = (d?.title || "").toLowerCase().includes(text);
      return byDept && byText;
    });
  }, [deps, departmentId, depSearch]);

  // Filter parents - chỉ hiển thị tasks của ban mình
  const filteredParents = useMemo(() => {
    const list = Array.isArray(parents) ? parents : [];
    return list.filter((p) => {
      const taskDeptId = p.departmentId?._id || p.departmentId || p.department?._id || p.department;
      return String(taskDeptId) === String(departmentId);
    });
  }, [parents, departmentId]);

  useEffect(() => {
    if (!eventId || !showAddModal || !departmentId) return;
    
    // Set departmentId tự động khi mở modal
    setAddTaskForm((prev) => ({ ...prev, departmentId: departmentId }));
    
    milestoneApi
      .listMilestonesByEvent(eventId)
      .then((res) => setMilestones(res.data || []));
    
    taskApi.getTaskByEvent(eventId).then((apiRes) => {
      const arr = apiRes?.data || [];
      // Filter tasks by departmentId
      const deptTasks = arr.filter(task => {
        const taskDeptId = task.departmentId?._id || task.departmentId || task.department?._id || task.department;
        return String(taskDeptId) === String(departmentId);
      });
      setParents(deptTasks);
      setDeps(deptTasks);
    });
  }, [showAddModal, eventId, departmentId]);

  // Load members của ban mình
  useEffect(() => {
    if (!departmentId || !eventId) return setAssignees([]);
    departmentService
      .getMembersByDepartment(eventId, departmentId)
      .then((members) => setAssignees(members || []))
      .catch(() => setAssignees([]));
  }, [departmentId, eventId]);

  const handleAddTaskInput = (field, value) => {
    setAddTaskForm((f) => ({ ...f, [field]: value }));

    if (field === "departmentId") {
      setAssignees([]);
      setAddTaskForm((f) => ({ ...f, assigneeId: "" }));
    }
  };

  const handleCreateTask = async () => {
    setAddTaskError("");
  
    if (!addTaskForm.title || !addTaskForm.departmentId || !addTaskForm.dueDate || !addTaskForm.estimate) {
      setAddTaskError("Vui lòng nhập đầy đủ các trường * bắt buộc!");
      return;
    }
  
    const toISO = (d) => new Date(d).toISOString();
    const toNum = (v) => (v === "" || v === null || v === undefined ? undefined : Number(v));
    const orUndef = (v) => (v ? v : undefined);
    const arrClean = (arr) => (Array.isArray(arr) ? arr.map(String).filter(Boolean) : undefined);
  
    const payload = {
      title: addTaskForm.title,
      description: orUndef(addTaskForm.description),
      departmentId: addTaskForm.departmentId,
      assigneeId: orUndef(addTaskForm.assigneeId),
      startDate: addTaskForm.startDate ? toISO(addTaskForm.startDate) : undefined,
      dueDate: toISO(addTaskForm.dueDate),
      estimate: toNum(addTaskForm.estimate),
      estimateUnit: addTaskForm.estimateUnit || "h",
      milestoneId: orUndef(addTaskForm.milestoneId),
      parentId: orUndef(addTaskForm.parentId),
      dependencies: arrClean(addTaskForm.dependencies),
    };
  
    try {
      await taskApi.createTask(eventId, payload);

      setShowAddModal(false);
      setAddTaskForm({
        title: "",
        description: "",
        departmentId: departmentId, // Giữ departmentId của ban mình
        assigneeId: "",
        startDate: "",
        dueDate: "",
        estimate: "",
        estimateUnit: "h",
        milestoneId: "",
        parentId: "",
        dependencies: [],
      });

      // Refresh tasks
      fetchTasks();
      toast.success("Tạo công việc thành công!");
    } catch (err) {
      const errorMessage = err?.response?.data?.message || "Thêm công việc thất bại!";
      const errors = err?.response?.data?.errors || [];
      const fullError = errors.length > 0 
        ? `${errorMessage}: ${errors.join(", ")}`
        : errorMessage;
      setAddTaskError(fullError);
      toast.error(fullError);
    }
  };

  // Group tasks trước khi truyền sang board
  const statusGroup = tasks.reduce(
    (acc, t) => {
      if (t.status === "Đang làm") acc.inProgress.push(t);
      else if (t.status === "Hoàn thành") acc.done.push(t);
      else acc.notStarted.push(t);
      return acc;
    },
    { notStarted: [], inProgress: [], done: [] }
  );

  if (!departmentId) {
    return (
      <UserLayout
        title="Danh sách công việc"
        activePage="work-board"
        sidebarType="HoD"
      >
        <div className="alert alert-warning" style={{ margin: "20px" }}>
          <h5>Không tìm thấy ban</h5>
          <p>Bạn chưa được phân công vào ban nào. Vui lòng liên hệ HoOC để được phân công.</p>
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
        sidebarType="HoD"
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
                <h3 className="mb-2">Danh sách công việc</h3>
                <p className="mb-0 opacity-75">
                  {department ? `Công việc của ban ${department.name}` : "Công việc của ban"}
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
                className={`tab-btn ${activeTab === "assignment" ? "active" : ""}`}
                onClick={() => setActiveTab("assignment")}
              >
                Phân chia công việc
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
                  <option value="Tất cả">Tất cả</option>
                  <option value="Đang làm">Đang làm</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Tạm hoãn">Tạm hoãn</option>
                </select>

                <div className="ms-auto d-flex align-items-center gap-2">
                  <button
                    className="add-btn btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    + Thêm công việc
                  </button>
                </div>
              </div>

              <div className="soft-card rounded-table">
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr className="text-muted">
                        <th className="py-3" style={{ width: "5%" }}>
                          #
                        </th>
                        <th className="py-3 col-name" style={{ width: "15%" }}>
                          Ban phụ trách
                        </th>
                        <th className="py-3" style={{ width: "30%" }}>
                          Công việc
                        </th>
                        <th className="py-3" style={{ width: "20%" }}>
                          Người phụ trách
                        </th>
                        <th className="py-3" style={{ width: "18%" }}>
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
                          <td colSpan="6" className="text-center py-5">
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
                                Chưa có công việc nào trong ban. Hãy tạo công việc đầu tiên!
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredTasks.map((task, idx) => (
                          <tr
                            key={task.id}
                            className="task-row"
                            onClick={() => setSelectedTask(task)}
                          >
                            <td className="py-3 text-muted small">{idx + 1}</td>
                            <td className="py-3 col-name">
                              <div className="fw-medium">{task.department}</div>
                            </td>
                            <td className="py-3 text-muted small">
                              {task.name}
                            </td>
                            <td className="py-3">
                              <span className="small text-muted">
                                {task.assignee}
                              </span>
                            </td>
                            <td className="py-3">
                              <span
                                className="status-badge"
                                style={{
                                  background: statusColor(task.status).bg,
                                  color: statusColor(task.status).color,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const statuses = [
                                    "Đang làm",
                                    "Hoàn thành",
                                    "Tạm hoãn",
                                  ];
                                  const currentIndex = statuses.indexOf(
                                    task.status
                                  );
                                  const nextStatus =
                                    statuses[
                                      (currentIndex + 1) % statuses.length
                                    ];
                                  handleUpdateTaskStatus(task.id, nextStatus);
                                }}
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "assignment" && (
            <div className="soft-card p-4">
              <div className="mb-3 text-muted small">
                Kéo công việc chưa phân công vào cột thành viên để giao việc
              </div>
              <TaskAssignmentBoard
                tasks={tasks}
                members={assignees}
                eventId={eventId}
                departmentId={departmentId}
                onTaskAssigned={fetchTasks}
                currentUserId={user?._id}
              />
            </div>
          )}

          {activeTab === "board" && (
            <div className="soft-card p-4 text-muted">
              <KanbanBoardTask 
                eventId={eventId}
                listTask={statusGroup}
                onTaskMove={fetchTasks}
                currentUserId={user?._id}
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
                    <div className="fw-semibold fs-5">{selectedTask.name}</div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      Mô tả
                    </label>
                    <div className="text-muted">
                      {selectedTask.description || "Chưa có mô tả"}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      Ban phụ trách
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 20 }}>👤</span>
                      <span>{selectedTask.department}</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      Người phụ trách
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 20 }}>👤</span>
                      <span>{selectedTask.assignee}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">Deadline</label>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 20 }}>📅</span>
                      <span>{selectedTask.due}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">Trạng thái</label>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 20 }}>📈 </span>
                      <span>{selectedTask.status}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      Ước tính thời gian thực hiện
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 20 }}>⌛ </span>
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

        {showAddModal && (
          <>
            <div
              className="modal-backdrop"
              style={{ position: "fixed", inset: 0, zIndex: 1050 }}
              onClick={() => setShowAddModal(false)}
            />
            <div
              className="modal d-block"
              tabIndex={-1}
              style={{ zIndex: 1060 }}
            >
              <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 900, width: '90%' }}>
                <div className="modal-content" style={{ borderRadius: 16 }}>
                  <div className="modal-header">
                    <h5 className="modal-title">➕ Thêm công việc mới</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowAddModal(false)}
                    />
                  </div>
                  <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {addTaskError && (
                      <div className="alert alert-danger mb-2">
                        {addTaskError}
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="form-label">Tên công việc *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addTaskForm.title}
                        onChange={(e) =>
                          handleAddTaskInput("title", e.target.value)
                        }
                        placeholder="Nhập tên công việc..."
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Mô tả</label>
                      <textarea
                        className="form-control"
                        value={addTaskForm.description}
                        onChange={(e) =>
                          handleAddTaskInput("description", e.target.value)
                        }
                        placeholder="Mô tả ngắn..."
                        rows={3}
                      />
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Ban phụ trách *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={department?.name || ""}
                          disabled
                          style={{ backgroundColor: "#F3F4F6", cursor: "not-allowed" }}
                        />
                        <div className="form-text small text-muted">
                          Bạn chỉ có thể tạo công việc cho ban của mình
                        </div>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Người phụ trách *</label>
                        <select
                          className="form-select"
                          value={addTaskForm.assigneeId}
                          onChange={(e) =>
                            handleAddTaskInput("assigneeId", e.target.value)
                          }
                        >
                          <option value="">Chọn người phụ trách</option>
                          {assignees.map((m) => (
                            <option key={m._id || m.id || m.userId} value={m._id || m.id || m.userId}>
                              {m.userId?.fullName || m.fullName || m.name}
                            </option>
                          ))}
                        </select>
                        <div className="form-text small text-muted">
                          Chỉ hiển thị thành viên trong ban của bạn
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Thời gian bắt đầu</label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={addTaskForm.startDate}
                          onChange={(e) =>
                            handleAddTaskInput("startDate", e.target.value)
                          }
                          min={(() => {
                            const now = new Date();
                            now.setMinutes(now.getMinutes() + 1);
                            const minDateTime = now.toISOString().slice(0, 16);
                            if (eventInfo?.eventStartDate) {
                              const eventStart = new Date(eventInfo.eventStartDate);
                              const eventStartStr = eventStart.toISOString().slice(0, 16);
                              return eventStartStr > minDateTime ? eventStartStr : minDateTime;
                            }
                            return minDateTime;
                          })()}
                          max={eventInfo?.eventEndDate ? new Date(eventInfo.eventEndDate).toISOString().slice(0, 16) : undefined}
                        />
                        {eventInfo && (
                          <div className="form-text small text-muted">
                            Thời gian bắt đầu phải sau thời điểm hiện tại
                            {eventInfo.eventStartDate && ` và sau ${new Date(eventInfo.eventStartDate).toLocaleString('vi-VN')}`}
                            {eventInfo.eventEndDate && `, trước ${new Date(eventInfo.eventEndDate).toLocaleString('vi-VN')}`}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Deadline *</label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={addTaskForm.dueDate}
                          onChange={(e) =>
                            handleAddTaskInput("dueDate", e.target.value)
                          }
                          min={(() => {
                            if (addTaskForm.startDate) {
                              const startDate = new Date(addTaskForm.startDate);
                              startDate.setMinutes(startDate.getMinutes() + 1);
                              return startDate.toISOString().slice(0, 16);
                            }
                            const now = new Date();
                            now.setMinutes(now.getMinutes() + 1);
                            const minDateTime = now.toISOString().slice(0, 16);
                            if (eventInfo?.eventStartDate) {
                              const eventStart = new Date(eventInfo.eventStartDate);
                              const eventStartStr = eventStart.toISOString().slice(0, 16);
                              return eventStartStr > minDateTime ? eventStartStr : minDateTime;
                            }
                            return minDateTime;
                          })()}
                          max={eventInfo?.eventEndDate ? new Date(eventInfo.eventEndDate).toISOString().slice(0, 16) : undefined}
                        />
                        {eventInfo && (
                          <div className="form-text small text-muted">
                            Deadline phải sau thời điểm hiện tại
                            {addTaskForm.startDate && " và sau thời gian bắt đầu"}
                            {eventInfo.eventStartDate && `, sau ${new Date(eventInfo.eventStartDate).toLocaleString('vi-VN')}`}
                            {eventInfo.eventEndDate && `, trước ${new Date(eventInfo.eventEndDate).toLocaleString('vi-VN')}`}
                          </div>
                        )}
                      </div>
                      <div className="col-md-3 mb-3">
                        <label className="form-label">Ước tính *</label>
                        <input
                          type="number"
                          min="1"
                          className="form-control"
                          value={addTaskForm.estimate}
                          onChange={(e) =>
                            handleAddTaskInput("estimate", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-3 mb-3">
                        <label className="form-label">Đơn vị</label>
                        <select
                          className="form-select"
                          value={addTaskForm.estimateUnit}
                          onChange={(e) =>
                            handleAddTaskInput("estimateUnit", e.target.value)
                          }
                        >
                          <option value="h">giờ</option>
                          <option value="d">ngày</option>
                          <option value="w">tuần</option>
                        </select>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Cột mốc</label>
                        <select
                          className="form-select"
                          value={addTaskForm.milestoneId}
                          onChange={(e) =>
                            handleAddTaskInput("milestoneId", e.target.value)
                          }
                        >
                          <option value="">Không liên kết</option>
                          {milestones.map((m) => (
                            <option value={m._id} key={m._id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Task cha</label>
                        <select
                          className="form-select"
                          value={addTaskForm.parentId}
                          onChange={(e) => handleAddTaskInput("parentId", e.target.value)}
                        >
                          <option value="">Không có</option>
                          {filteredParents.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                        <div className="form-text small text-muted">
                          Chỉ hiển thị tasks của ban bạn
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Task phụ thuộc</label>
                      <input
                        className="form-control soft-input mb-2"
                        style={{ height: 40 }}
                        placeholder="Tìm theo tên task"
                        value={depSearch}
                        onChange={(e) => setDepSearch(e.target.value)}
                      />
                      <select
                        multiple
                        className="form-select"
                        size={6}
                        style={{ minHeight: 160 }}
                        value={addTaskForm.dependencies}
                        onChange={(e) =>
                          handleAddTaskInput(
                            "dependencies",
                            Array.from(e.target.selectedOptions, (opt) => opt.value)
                          )
                        }
                      >
                        {filteredDeps.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                      <div className="form-text small">
                        Chỉ hiển thị tasks của ban bạn. Bạn có thể giữ Ctrl để chọn nhiều task phụ thuộc
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowAddModal(false)}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCreateTask}
                    >
                      Thêm công việc
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </UserLayout>
    </>
  );
}

