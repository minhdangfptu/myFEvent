import { useEffect, useMemo, useState } from "react";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useEvents } from "~/contexts/EventContext";
import { useNavigate, useParams } from "react-router-dom";
import NoDataImg from "~/assets/no-data.png";
import { taskApi } from "~/apis/taskApi";
import { departmentService } from "~/services/departmentService";
import { milestoneApi } from "~/apis/milestoneApi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import KanbanBoardTask from "~/components/KanbanBoardTask";

export default function EventTaskPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { eventId } = useParams();
  const [sortBy, setSortBy] = useState("Tên");
  const [filterPriority, setFilterPriority] = useState("Tất cả");
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    name: "",
    owner: "",
    due: "",
    status: "Đang làm",
    description: "",
  });
  const navigate = useNavigate();

  const [eventRole, setEventRole] = useState("");

  const { fetchEventRole } = useEvents();

  useEffect(() => {
    fetchEventRole(eventId).then((role) => {
      setEventRole(role);
    });
  }, [eventId]);

  const getSidebarType = () => {
    if (eventRole === "HoOC") return "hooc";
    if (eventRole === "HoD") return "HoD";
    if (eventRole === "Member") return "member";
    return "user";
  };

  const initialTasks = useMemo(() => [], []);
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    if (!eventId) return;
    departmentService
      .getDepartments(eventId)
      .then((depts) => setDepartments(depts || []))
      .catch(() => setDepartments([]));
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    taskApi
      .getTaskByEvent(eventId)
      .then((apiRes) => {
        const arr = apiRes?.data || [];
        const mapped = arr.map((task) => ({
          id: task?._id,
          name: task?.title || "",
          description: task?.description || "",
          department: task?.departmentId?.name || "Chưa phân công",
          assignee: task?.assigneeId?.userId?.fullName || "Chưa phân công",
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
        }));
        setTasks(mapped);
      })
      .catch((err) => setTasks([]));
  }, [eventId]);

  const priorityColor = (p) => {
    if (p === "Cao")
      return { bg: "#FEE2E2", color: "#DC2626", border: "#FCA5A5" };
    if (p === "Thấp")
      return { bg: "#DCFCE7", color: "#16A34A", border: "#86EFAC" };
    return { bg: "#FEF3C7", color: "#D97706", border: "#FCD34D" };
  };

  const statusColor = (s) => {
    if (s === "Hoàn thành") return { bg: "#DCFCE7", color: "#16A34A" };
    if (s === "Tạm hoãn") return { bg: "#FEE2E2", color: "#DC2626" };
    return { bg: "#FEF3C7", color: "#D97706" };
  };

  const [filterDepartment, setFilterDepartment] = useState("Tất cả");
  const [filterAssignee, setFilterAssignee] = useState("Tất cả");

  const filteredTasks = tasks
    .filter((task) => task.name.toLowerCase().includes(search.toLowerCase()))
    .filter(
      (task) =>
        filterDepartment === "Tất cả" || task.department === filterDepartment
    )
    .filter(
      (task) => filterAssignee === "Tất cả" || task.assignee === filterAssignee
    )
    .filter(
      (task) => filterPriority === "Tất cả" || task.priority === filterPriority
    )
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
    highPriority: tasks.filter((t) => t.priority === "Cao").length,
  };

  const handleAddTask = () => {
    if (!newTask.name || !newTask.owner || !newTask.due) return;
    const task = { id: Date.now(), ...newTask };
    setTasks([...tasks, task]);
    setNewTask({
      name: "",
      owner: "",
      due: "",
      status: "Đang làm",
      priority: "Trung bình",
      description: "",
    });
    setShowAddModal(false);
  };

  const handleUpdateTaskStatus = (taskId, newStatus) => {
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    setSelectedTask((st) =>
      st && st.id === taskId ? { ...st, status: newStatus } : st
    );
  };

  const handleDetail = (taskId) => {
    navigate(`/events/${eventId}/tasks/${taskId}`);
  };
  const STT = 0;

  const [addTaskForm, setAddTaskForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    assigneeId: "",
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
  const [depFilterDepartment, setDepFilterDepartment] = useState("Tất cả");
  const [depSearch, setDepSearch] = useState("");
  const filteredDeps = useMemo(() => {
    const text = (depSearch || "").toLowerCase();
    return (deps || []).filter((d) => {
      const depName = d?.departmentId?.name || "";
      const byDept = depFilterDepartment === "Tất cả" || depName === depFilterDepartment;
      const byText = (d?.title || "").toLowerCase().includes(text);
      return byDept && byText;
    });
  }, [deps, depFilterDepartment, depSearch]);

  const selectedDepartmentName = useMemo(() => (
    departments.find((d) => d._id === addTaskForm.departmentId)?.name || ""
  ), [departments, addTaskForm.departmentId]);

  const filteredParents = useMemo(() => {
    const list = Array.isArray(parents) ? parents : [];
    if (!addTaskForm.departmentId) return list;
    return list.filter((p) => (p?.departmentId?.name || "") === selectedDepartmentName);
  }, [parents, addTaskForm.departmentId, selectedDepartmentName]);

  useEffect(() => {
    if (!eventId || !showAddModal) return;
    milestoneApi
      .listMilestonesByEvent(eventId)
      .then((res) => setMilestones(res.data || []));
    taskApi.getTaskByEvent(eventId).then((apiRes) => {
      const arr = apiRes?.data || [];
      setParents(arr);
      setDeps(arr);
    });
  }, [showAddModal, eventId]);
  useEffect(() => {
    if (!addTaskForm.departmentId || !eventId) return setAssignees([]);
    departmentService
      .getMembersByDepartment(eventId, addTaskForm.departmentId)
      .then((members) => setAssignees(members || []));
  }, [addTaskForm.departmentId, eventId]);

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
      assigneeId: orUndef(addTaskForm.assigneeId),      // chỉ gửi khi có
      dueDate: toISO(addTaskForm.dueDate),
      estimate: toNum(addTaskForm.estimate),
      estimateUnit: addTaskForm.estimateUnit || "h",
      milestoneId: orUndef(addTaskForm.milestoneId),    // bỏ "" khỏi payload
      parentId: orUndef(addTaskForm.parentId),          // bỏ "" khỏi payload
      dependencies: arrClean(addTaskForm.dependencies), // [] hoặc undefined
      // status/progressPct để backend set default (vd: "todo", 0)
    };
  
    try {
      await taskApi.createTask(eventId, payload);
  
      setShowAddModal(false);
      setAddTaskForm({
        title: "",
        description: "",
        departmentId: "",
        assigneeId: "",
        dueDate: "",
        estimate: "",
        estimateUnit: "h",
        milestoneId: "",
        parentId: "",
        dependencies: [],
      });
  
      taskApi.getTaskByEvent(eventId).then((apiRes) => {
        const arr = apiRes?.data || [];
        const mapped = arr.map((task) => ({
          id: task._id,
          name: task.title || "",
          description: task.description || "",
          department: task?.departmentId?.name || "Chưa phân công",
          assignee: task?.assigneeId?.userId?.fullName || "Chưa phân công",
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
        }));
        setTasks(mapped);
      });
  
      toast.success("Tạo công việc thành công!");
    } catch (err) {
      setAddTaskError("Thêm công việc thất bại!");
      toast.error("Thêm công việc thất bại!");
    }
  };
  

  // --- Group tasks trước khi truyền sang board ---
  const statusGroup = tasks.reduce(
    (acc, t) => {
      if (t.status === "Đang làm") acc.inProgress.push(t);
      else if (t.status === "Hoàn thành") acc.done.push(t);
      else acc.notStarted.push(t);
      return acc;
    },
    { notStarted: [], inProgress: [], done: [] }
  );

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <UserLayout
        title={t("taskPage.title")}
        activePage={"work" && "work-board"}
        sidebarType={getSidebarType()}
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
        .priority-badge { padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 500; border: 1px solid; }
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

        /* ======= Đẹp webkit scrollbar cho board và bảng ======= */
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
                  Theo dõi các công việc của ban và sự kiện
                </p>
              </div>
              <div className="col-md-6">
                <div className="row g-2">
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
                        {t("taskPage.stats.completed")}
                      </div>
                    </div>
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
                        {taskStats.highPriority}
                      </div>
                      <div className="small">{t("taskPage.stats.high")}</div>
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
                  placeholder={t("taskPage.searchPlaceholder")}
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
                  <option value="Tất cả">
                    {t("taskPage.filters.allStatus")}
                  </option>
                  <option value="Đang làm">Đang làm</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Tạm hoãn">Tạm hoãn</option>
                </select>

                <div className="ms-auto d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm soft-input"
                    style={{ width: 140, height: 40 }}
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    aria-label="Lọc theo ban phụ trách"
                  >
                    <option value="Tất cả">Tất cả ban</option>
                    {departments.map((dept) => (
                      <option value={dept.name} key={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>

                  <button
                    className="add-btn btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    + {t("taskPage.add")}
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
                        <th className="py-3" style={{ width: "25%" }}>
                          Công việc
                        </th>
                        <th className="py-3" style={{ width: "18%" }}>
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
                                Oops, bạn chưa có công việc nào hết, hãy tạo
                                công việc đầu tiên thôi! Nếu chưa tạo cột mốc
                                nào, hãy tạo cột mốc trước để gán các công việc
                                theo nhé.
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

          {activeTab === "board" && (
            <div className="soft-card p-4 text-muted">
              <KanbanBoardTask eventId = {eventId} listTask={statusGroup} />
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
                  <h5 className="mb-0">{t("taskPage.detail.title")}</h5>
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
                      {t("taskPage.detail.name")}
                    </label>
                    <div className="fw-semibold fs-5">{selectedTask.name}</div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">
                      {t("taskPage.detail.description")}
                    </label>
                    <div className="text-muted">
                      {selectedTask.description || t("taskPage.detail.noDesc")}
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
                        <select
                          className="form-select"
                          value={addTaskForm.departmentId}
                          onChange={(e) =>
                            handleAddTaskInput("departmentId", e.target.value)
                          }
                        >
                          <option value="">Chọn ban</option>
                          {departments.map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Người phụ trách *</label>
                        <select
                          className="form-select"
                          value={addTaskForm.assigneeId}
                          onChange={(e) =>
                            handleAddTaskInput("assigneeId", e.target.value)
                          }
                          disabled={!addTaskForm.departmentId}
                        >
                          <option value="">Chọn người phụ trách</option>
                          {assignees.map((m) => (
                            <option key={m._id || m.id || m.userId} value={m._id || m.id || m.userId}>
                              {m.userId?.fullName || m.fullName || m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Deadline *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={addTaskForm.dueDate}
                          onChange={(e) =>
                            handleAddTaskInput("dueDate", e.target.value)
                          }
                        />
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
                          disabled={!addTaskForm.departmentId}
                        >
                          <option value="">Không có</option>
                          {filteredParents.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Task phụ thuộc</label>
                      <div className="d-flex gap-2 mb-2">
                        <select
                          className="form-select form-select-sm soft-input"
                          style={{ width: 200, height: 40 }}
                          value={depFilterDepartment}
                          onChange={(e) => setDepFilterDepartment(e.target.value)}
                        >
                          <option value="Tất cả">Tất cả ban</option>
                          {departments.map((dept) => (
                            <option key={dept._id} value={dept.name}>{dept.name}</option>
                          ))}
                        </select>
                        <input
                          className="form-control soft-input"
                          style={{ height: 40 }}
                          placeholder="Tìm theo tên task"
                          value={depSearch}
                          onChange={(e) => setDepSearch(e.target.value)}
                        />
                      </div>
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
                        Bạn có thể giữ Ctrl để chọn nhiều task phụ thuộc
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
