import { useEffect, useMemo, useState, useCallback } from "react";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useEvents } from "~/contexts/EventContext";
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
import { useNotifications } from "~/contexts/NotificationsContext";
import AIChatAssistant from "~/components/AIChatAssistant";
import WBSPreviewModal from "~/components/WBSPreviewModal";
import SuggestedTasksColumn from "~/components/SuggestedTasksColumn";
import { aiApi } from "~/apis/aiApi";
import ConfirmModal from "../../components/ConfirmModal";

const TASK_TYPE_LABELS = {
  epic: "Epic task",
  normal: "Công việc thường",
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

export default function EventTaskPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { eventId } = useParams();
  const [sortBy, setSortBy] = useState("Tên");
  const [filterPriority, setFilterPriority] = useState("Tất cả");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("Tất cả");
  const [filterAssignee, setFilterAssignee] = useState("Tất cả");
  const [filterType, setFilterType] = useState("all");
  const [showAIChat, setShowAIChat] = useState(false);
  const [wbsData, setWbsData] = useState(null);
  const [showWBSModal, setShowWBSModal] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  const [eventRole, setEventRole] = useState("");
  const [hoDDepartmentId, setHoDDepartmentId] = useState(null);

  const { fetchEventRole } = useEvents();
  const { user } = useAuth();

  useEffect(() => {
    fetchEventRole(eventId).then((role) => {
      setEventRole(role);
    });
    
    if (eventId) {
      userApi
        .getUserRoleByEvent(eventId)
        .then((roleResponse) => {
          const role = roleResponse?.role || "";
          setEventRole(role);
          
          // Redirect Member to their own task page
          if (role === "Member") {
            navigate(`/events/${eventId}/member-tasks`, { replace: true });
            return;
          }
          
          // Redirect HoD to their own task page
          if (role === "HoD") {
            navigate(`/events/${eventId}/hod-tasks`, { replace: true });
            return;
          }
          
          if (role === "HoD" && roleResponse?.departmentId) {
            const deptId = roleResponse.departmentId?._id || roleResponse.departmentId;
            setHoDDepartmentId(deptId);
          }
        })
        .catch(() => {});
    }
  }, [eventId, navigate]);

  const getSidebarType = () => {
    if (eventRole === "HoOC") return "hooc";
    if (eventRole === "HoD") return "HoD";
    if (eventRole === "Member") return "member";
    return "user";
  };

  const initialTasks = useMemo(() => [], []);
  const [tasks, setTasks] = useState(initialTasks);
  const [expandedEpicIds, setExpandedEpicIds] = useState(() => new Set());
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectedEpicIds, setSelectedEpicIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [eventInfo, setEventInfo] = useState(null);
  const [membersForAssignment, setMembersForAssignment] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ show: false, message: "", onConfirm: null });

  useEffect(() => {
    if (!eventId) return;
    departmentService
      .getDepartments(eventId)
      .then((depts) => setDepartments(depts || []))
      .catch(() => setDepartments([]));
    
    eventApi.getById(eventId)
      .then((res) => {
        const event = res?.data?.event || res?.data;
        if (event) {
          setEventInfo({
            createdAt: event.createdAt,
          });
        }
      })
      .catch(() => {
        setEventInfo(null);
      });
  }, [eventId]);

  useEffect(() => {
    if (!eventId || eventRole !== "HoD" || !hoDDepartmentId) {
      setMembersForAssignment([]);
      return;
    }
    
    departmentService
      .getMembersByDepartment(eventId, hoDDepartmentId)
      .then((members) => setMembersForAssignment(members || []))
      .catch(() => setMembersForAssignment([]));
  }, [eventId, eventRole, hoDDepartmentId]);

  const fetchTasks = useCallback(() => {
    if (!eventId) return;
    taskApi
      .getTaskByEvent(eventId)
      .then((apiRes) => {
        const arr = apiRes?.data || [];
        const titleMap = new Map(arr.map((t) => [String(t?._id), t?.title || ""]));
        const mapped = arr.map((task) => {
          const statusCode = task?.status || "chua_bat_dau";
          return {
            id: task?._id,
            name: task?.title || "",
            description: task?.description || "",
            department: task?.departmentId?.name || "----",
            departmentId: task?.departmentId?._id || task?.departmentId || null,
            assignee: task?.assigneeId?.userId?.fullName || "----",
            assigneeId: task?.assigneeId?._id || task?.assigneeId || null,
            milestone: task?.milestoneId || "Chưa có",
            parentId: task?.parentId ? String(task.parentId) : null,
            parentName: task?.parentId ? titleMap.get(String(task.parentId)) || "Epic task" : null,
            due: task?.dueDate ? new Date(task.dueDate).toLocaleDateString("vi-VN") : "",
            statusCode,
            status: STATUS_LABEL_MAP[statusCode] || "Không xác định",
            taskType: task?.taskType || "normal",
            createdBy: task?.createdBy?.fullName || task?.createdBy?.name || "----",
            createdById: task?.createdBy?._id || task?.createdBy || null,
            estimate: task?.estimate != null && task?.estimateUnit ? `${task.estimate}${task.estimateUnit}` : "Ước tính",
            createdAt: task?.createdAt ? new Date(task.createdAt).toLocaleDateString("vi-VN") : "Thời gian",
            updatedAt: task?.updatedAt ? new Date(task.updatedAt).toLocaleDateString("vi-VN") : "Thời gian",
            progressPct: typeof task?.progressPct === "number" ? task.progressPct : "Tiến độ",
            startDate: task?.startDate,
            dueDateRaw: task?.dueDate,
          };
        });
        setTasks(mapped);
      })
      .catch((err) => setTasks([]));
  }, [eventId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);


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
    .filter((task) => {
      if (filterStatus === "all") return true;
      return task.statusCode === filterStatus;
    })
    .filter((task) => {
      if (filterType === "all") return true;
      if (filterType === "epic") return task.taskType === "epic";
      if (filterType === "normal") return task.taskType === "normal";
      return true;
    })
    .sort((a, b) => {
      const parse = (d) => {
        if (!d) return new Date(0);
        const [day, month, year] = d.split("/");
        return new Date(`${year}-${month}-${day}`);
      };
      if (sortBy === "DeadlineAsc") return parse(a.due) - parse(b.due);
      if (sortBy === "DeadlineDesc") return parse(b.due) - parse(a.due);
      return 0;
    });

  const filteredNormalTasks = filteredTasks.filter((task) => task.taskType === "normal");
  const filteredNormalTaskIds = filteredNormalTasks.map((task) => task.id);
  const filteredEpicIdSet = new Set(
    filteredNormalTasks
      .map((task) => task.parentId)
      .filter(Boolean)
  );
  const filteredEpicTasks = tasks
    .filter((task) => task.taskType === "epic")
    .filter(
      (epic) =>
        filteredTasks.some((t) => t.id === epic.id) ||
        filteredEpicIdSet.has(epic.id)
    );

  const orphanTasks = filteredNormalTasks.filter((task) => !task.parentId);
  const groupedEpics = [
    ...filteredEpicTasks.map((epic) => ({
      epic,
      tasks: filteredNormalTasks.filter(
        (child) => child.parentId === epic.id
      ),
    })),
  ];

  if (orphanTasks.length) {
    groupedEpics.push({
      epic: {
        id: "orphan",
        name: "Task chưa thuộc Epic",
        department: "Chưa xác định",
        status: "Chưa xác định",
        statusCode: "chua_bat_dau",
        due: "",
        taskType: "epic",
      },
      tasks: orphanTasks,
    });
  }

  const totalPages = Math.max(1, Math.ceil(groupedEpics.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGroups = groupedEpics.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterDepartment, filterAssignee, filterPriority, filterType, sortBy]);
    
  useEffect(() => {
    const filteredIds = filteredNormalTasks.map((t) => t.id);
    setSelectedTaskIds((prev) => {
      const newSelected = prev.filter((id) => filteredIds.includes(id));
      if (prev.length === newSelected.length && prev.every((v, i) => v === newSelected[i])) {
        return prev;
      }
      return newSelected;
    });
  }, [filteredNormalTasks]);


  const toggleEpicExpand = (epicId) => {
    setExpandedEpicIds((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const statusColor = (code) => {
    return STATUS_STYLE_MAP[code] || { bg: "#E2E8F0", color: "#1E293B" };
  };

  const taskStats = {
    total: tasks.filter((t) => t.taskType === "normal").length,
    completed: tasks.filter((t) => t.statusCode === "hoan_thanh").length,
    inProgress: tasks.filter((t) => t.statusCode === "da_bat_dau").length,
    notStarted: tasks.filter((t) => t.statusCode === "chua_bat_dau").length,
    cancelled: tasks.filter((t) => t.statusCode === "huy").length,
  };

  const handleUpdateTaskStatus = async (taskId, newStatusCode) => {
    const previousTasks = [...tasks];
    const previousSelectedTask = selectedTask;
    
    const task = tasks.find(t => t.id === taskId);
    
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

  const handleSelectTask = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAll = (groupTasks = null, epicId = null) => {
    // Nếu có groupTasks, chỉ chọn tasks trong epic đó
    if (groupTasks && epicId) {
      // Đảm bảo chỉ lấy tasks thuộc epic này
      const epicTasks = groupTasks.filter((task) => {
        if (epicId === "orphan") {
          return !task.parentId;
        } else {
          return String(task.parentId) === String(epicId);
        }
      });
      
      const taskIds = epicTasks.map((task) => task.id);
      if (taskIds.length === 0) return;
      
      console.log("Select all for epic:", epicId, "Tasks:", taskIds);
      
      const allSelected = taskIds.every((id) =>
        selectedTaskIds.includes(id)
      );
      
      if (allSelected) {
        // Bỏ chọn các task trong epic này
        setSelectedTaskIds((prev) => prev.filter((id) => !taskIds.includes(id)));
      } else {
        // Chọn tất cả task trong epic này (chỉ thêm các task chưa được chọn)
        setSelectedTaskIds((prev) => {
          const newIds = taskIds.filter((id) => !prev.includes(id));
          return [...prev, ...newIds];
        });
      }
    } else {
      // Từ action bar: chọn tất cả filtered tasks
      const allTaskIds = filteredNormalTasks.map((task) => task.id);
      if (allTaskIds.length === 0) return;
      const allSelected = allTaskIds.every((id) =>
        selectedTaskIds.includes(id)
      );
      if (allSelected) {
        setSelectedTaskIds([]);
      } else {
        setSelectedTaskIds([...allTaskIds]);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTaskIds.length === 0 && selectedEpicIds.length === 0) return;
    
    // Lấy tất cả task IDs trong các epic được chọn để xóa
    const epicTaskIdsToDelete = [];
    selectedEpicIds.forEach((epicId) => {
      const epicGroup = groupedEpics.find((g) => g.epic?.id === epicId);
      if (epicGroup) {
        epicTaskIdsToDelete.push(...epicGroup.tasks.map((task) => task.id));
      }
    });
    
    // Tổng số sẽ xóa: epic tasks + normal tasks (bao gồm cả task trong epic)
    const totalToDelete = selectedEpicIds.length + selectedTaskIds.length;
    const message = selectedEpicIds.length > 0 && selectedTaskIds.length > 0
      ? `Bạn có chắc chắn muốn xóa ${selectedEpicIds.length} epic task và ${selectedTaskIds.length} task? (Xóa epic task sẽ xóa luôn tất cả task trong epic đó)`
      : selectedEpicIds.length > 0
      ? `Bạn có chắc chắn muốn xóa ${selectedEpicIds.length} epic task? (Sẽ xóa luôn tất cả task trong epic đó)`
      : `Bạn có chắc chắn muốn xóa ${selectedTaskIds.length} công việc đã chọn?`;
    
    setConfirmModal({
      show: true,
      message,
      onConfirm: async () => {
        setConfirmModal({ show: false, message: "", onConfirm: null });
        try {
          // Xóa epic tasks trước (sẽ tự động xóa task trong epic)
          const deleteEpicPromises = selectedEpicIds.map((epicId) => 
            taskApi.deleteTask(eventId, epicId)
          );
          
          // Xóa normal tasks (loại bỏ các task đã nằm trong epic được xóa)
          const normalTaskIdsToDelete = selectedTaskIds.filter(
            (taskId) => !epicTaskIdsToDelete.includes(taskId)
          );
          const deleteTaskPromises = normalTaskIdsToDelete.map((taskId) => 
            taskApi.deleteTask(eventId, taskId)
          );
          
          await Promise.all([...deleteEpicPromises, ...deleteTaskPromises]);
          
          setSelectedTaskIds([]);
          setSelectedEpicIds([]);
          fetchTasks();
          toast.success(`Đã xóa thành công!`);
        } catch (error) {
          const errorMessage = error?.response?.data?.message || "Xóa công việc thất bại";
          toast.error(errorMessage);
          console.error("Error deleting tasks:", error);
        }
      }
    });
  };

  const [addTaskForm, setAddTaskForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    assigneeId: "",
    startDate: "",
    dueDate: "",
    milestoneId: "",
    parentId: "",
    taskType: "epic",
  });
  const [assignees, setAssignees] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [parents, setParents] = useState([]);
  const [addTaskError, setAddTaskError] = useState("");

  const selectedDepartmentName = useMemo(() => (
    departments.find((d) => d._id === addTaskForm.departmentId)?.name || ""
  ), [departments, addTaskForm.departmentId]);

  const filteredParents = useMemo(() => {
    const list = Array.isArray(parents) ? parents : [];
    if (!addTaskForm.departmentId) return list.filter((p) => p.taskType === "epic");
    return list.filter((p) => {
      const isSameDept = (p?.departmentId?.name || "") === selectedDepartmentName;
      const isEpicTask = p.taskType === "epic";
      return isSameDept && isEpicTask;
    });
  }, [parents, addTaskForm.departmentId, selectedDepartmentName]);

  useEffect(() => {
    if (!eventId || !showAddModal) return;
    milestoneApi
      .listMilestonesByEvent(eventId)
      .then((res) => setMilestones(res.data || []));
    taskApi.getTaskByEvent(eventId).then((apiRes) => {
      const arr = apiRes?.data || [];
      setParents(arr);
    });
  }, [showAddModal, eventId]);
  
  useEffect(() => {
    if (!addTaskForm.departmentId || !eventId) return setAssignees([]);
    departmentService
      .getMembersByDepartment(eventId, addTaskForm.departmentId)
      .then((members) => setAssignees(members || []));
  }, [addTaskForm.departmentId, eventId]);

  const handleAddTaskInput = (field, value) => {
    setAddTaskForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "departmentId") {
        setAssignees([]);
        next.assigneeId = "";
        next.parentId = "";
      }
      if (field === "taskType" && value === "epic") {
        next.assigneeId = "";
        next.parentId = "";
      }
      return next;
    });
  };

  const handleCreateTask = async () => {
    setAddTaskError("");
  
    if (!addTaskForm.title || !addTaskForm.departmentId || !addTaskForm.dueDate) {
      setAddTaskError("Vui lòng nhập đầy đủ các trường * bắt buộc!");
      return;
    }
    if (addTaskForm.taskType === "normal" && !addTaskForm.parentId) {
      setAddTaskError("Task thường phải thuộc một Epic task.");
      return;
    }
  
    const toISO = (d) => new Date(d).toISOString();
    const orUndef = (v) => (v ? v : undefined);
  
    const payload = {
      title: addTaskForm.title,
      description: orUndef(addTaskForm.description),
      departmentId: addTaskForm.departmentId,
      startDate: addTaskForm.startDate ? toISO(addTaskForm.startDate) : undefined,
      dueDate: toISO(addTaskForm.dueDate),
      milestoneId: orUndef(addTaskForm.milestoneId),
      parentId: orUndef(addTaskForm.parentId),
      taskType: addTaskForm.taskType || "epic",
    };
  
    try {
      const response = await taskApi.createTask(eventId, payload);
      const createdTask = response?.data || response;

      toast.success("Tạo công việc thành công!");

      setShowAddModal(false);
      setAddTaskForm({
        title: "",
        description: "",
        departmentId: "",
        assigneeId: "",
        startDate: "",
        dueDate: "",
        milestoneId: "",
        parentId: "",
        taskType: "epic",
      });

      fetchTasks();
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

  const statusGroup = tasks
    .filter((t) => t.taskType === "normal")
    .reduce(
    (acc, t) => {
        if (t.statusCode === "da_bat_dau") acc.inProgress.push(t);
        else if (t.statusCode === "hoan_thanh") acc.done.push(t);
      else acc.notStarted.push(t);
      return acc;
    },
    { notStarted: [], inProgress: [], done: [] }
  );

  return (
    <>
      <ConfirmModal
        show={confirmModal.show}
        message={confirmModal.message}
        onClose={() => setConfirmModal({ show: false, message: "", onConfirm: null })}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
        }}
      />
      <ToastContainer position="top-right" autoClose={3000} />
      <UserLayout
        title={t("taskPage.title")}
        activePage={"work" && "work-board"}
        sidebarType={getSidebarType()}
      >
        <style>{`
          .task-header { 
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); 
            border-radius: 16px; 
            padding: 24px; 
            color: white; 
            margin-bottom: 24px; 
          }
          .stat-card { 
            background: white; 
            border: 1px solid #E5E7EB; 
            border-radius: 12px; 
            padding: 16px; 
            transition: all 0.2s; 
          }
          .stat-card:hover { 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            transform: translateY(-2px); 
          }
          .soft-input { 
            background: #F9FAFB; 
            border: 1px solid #E5E7EB; 
            border-radius: 12px; 
            height: 44px; 
            transition: all 0.2s; 
          }
          .soft-input:focus { 
            background: white; 
            border-color: #3B82F6; 
            box-shadow: 0 0 0 3px rgba(59,130,246,0.1); 
          }
          .soft-card { 
            background: white; 
            border: 1px solid #E5E7EB; 
            border-radius: 16px; 
            box-shadow: 0 1px 3px rgba(16,24,40,.06); 
          }

          .task-row { 
            cursor: pointer; 
            transition: background 0.2s; 
          }
          .task-row:hover { 
            background: #F9FAFB; 
          }
          .status-badge { 
            padding: 8px 16px; 
            border-radius: 6px; 
            font-size: 13px; 
            font-weight: 500; 
            display: inline-block;
            min-width: 100px;
            text-align: center;
          }

          .rounded-table { 
            border-radius: 16px; 
            overflow: hidden; 
          }
          .rounded-table table { 
            margin-bottom: 0; 
          }
          .rounded-table thead { 
            background: #F9FAFB; 
          }
          .rounded-table thead th { 
            border-bottom: 2px solid #E5E7EB !important; 
          }

          .rounded-table tbody tr:not(:last-child) td { 
            border-bottom: 1px solid #EEF2F7; 
          }

          .col-name { 
            padding-left: 20px !important; 
          }

          .overlay { 
            position: fixed; 
            inset: 0; 
            background: rgba(0,0,0,0.3); 
            z-index: 999; 
          }
          .task-detail-panel {
            position: fixed; 
            right: 0; 
            top: 0; 
            bottom: 0;
            width: 420px; 
            max-width: 92vw; 
            background: #fff;
            box-shadow: -4px 0 16px rgba(0,0,0,0.12);
            z-index: 1000;
            transform: translateX(100%);
            transition: transform .3s ease;
          }
          .task-detail-panel.open { 
            transform: translateX(0); 
          }

          .tabs-bar { 
            display: flex; 
            gap: 20px; 
            border-bottom: 1px solid #E5E7EB; 
            margin-bottom: 16px; 
          }
          .tab-btn { 
            padding: 10px 0; 
            font-weight: 600; 
            color: #6B7280; 
            border: none; 
            background: transparent; 
            position: relative; 
          }
          .tab-btn.active { 
            color: #111827; 
          }
          .tab-btn.active::after { 
            content: ""; 
            position: absolute; 
            left: 0; 
            right: 0; 
            bottom: -1px; 
            height: 3px; 
            border-radius: 9999px; 
            background: #3B82F6; 
          }
          .sort-inline { 
            margin-left: auto; 
            display: flex; 
            align-items: center; 
            gap: 8px; 
          }

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
          .rounded-table .table-responsive { 
            overflow-x: auto; 
          }
          .rounded-table .table-responsive::-webkit-scrollbar:horizontal {
            height: 0;
            background: transparent;
          }

          .epic-card {
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
          }
          .epic-header-row {
            background: #F9FAFB;
            padding: 16px 20px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .epic-header-row:hover {
            background: #F3F4F6;
          }
          .badge-custom {
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 500;
          }
        `}</style>

        <div className="container-fluid" style={{ maxWidth: 1200 }}>
          {/* Header */}
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
                  <div className="col-6"></div>
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
                      <div className="small">Công việc đã hoàn thành</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="d-flex align-items-center mb-2">
            <div className="tabs-bar flex-grow-1">
              <button
                className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                Danh sách công việc
              </button>
              {eventRole === "HoD" && (
                <button
                  className={`tab-btn ${activeTab === "assignment" ? "active" : ""}`}
                  onClick={() => setActiveTab("assignment")}
                >
                  Phân chia công việc
                </button>
              )}
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
              >
                <option value="DeadlineDesc">Mới nhất</option>
                <option value="DeadlineAsc">Cũ nhất</option>
              </select>
            </div>
          </div>

          {/* List View */}
          {activeTab === "list" && (
            <>
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm công việc..."
                  className="form-control soft-input"
                  style={{ width: 250, paddingLeft: 16 }}
                />

                <select
                  className="form-select form-select-sm soft-input"
                  style={{ width: 140, height: 40 }}
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">Tất cả loại</option>
                  <option value="epic">Epic task</option>
                  <option value="normal">Công việc thường</option>
                </select>

                <select
                  className="form-select form-select-sm soft-input"
                  style={{ width: 160, height: 40 }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <div className="ms-auto d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm soft-input"
                    style={{ width: 140, height: 40 }}
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                  >
                    <option value="Tất cả">Tất cả ban</option>
                    {departments.map((dept) => (
                      <option value={dept.name} key={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>


                  {eventRole === "HoOC" && (
                    <button
                      className="btn btn-success me-2"
                      onClick={() => setShowAIChat(true)}
                      style={{ fontSize: 14 }}
                    >
                      🤖 AI Assistant
                    </button>
                  )}
                  <button
                    className="add-btn btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    + Thêm công việc
                  </button>
                </div>
              </div>

              {/* Epic Groups */}
              <div className="soft-card p-3">
                {paginatedGroups.length === 0 ? (
                  <div className="text-center py-5">
                    <img src={NoDataImg} alt="No data" width={180} className="mb-3" />
                    <p className="text-muted mb-0">Không có công việc nào</p>
                  </div>
                ) : (
                  paginatedGroups.map((group, idx) => {
                    const epic = group.epic;
                    const epicId = epic?.id || `orphan-${idx}`;
                    const isExpanded = expandedEpicIds.has(epicId);
                    const epicStatusStyle = statusColor(epic?.statusCode || "chua_bat_dau");
                    
                    return (
                      <div className="epic-card" key={epicId}>
                        <div
                          className="epic-header-row"
                          onClick={() => toggleEpicExpand(epicId)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-3">
                              {epicId !== "orphan" && (
                                <input
                                  type="checkbox"
                                  checked={selectedEpicIds.includes(epicId)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const isChecked = e.target.checked;
                                    
                                    if (isChecked) {
                                      // Chỉ chọn epic, không chọn task
                                      setSelectedEpicIds((prev) => 
                                        prev.includes(epicId) ? prev : [...prev, epicId]
                                      );
                                    } else {
                                      // Bỏ chọn epic, không ảnh hưởng đến task
                                      setSelectedEpicIds((prev) => prev.filter((id) => id !== epicId));
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ width: 18, height: 18, cursor: "pointer" }}
                                />
                              )}
                              <div>
                                <div className="fw-semibold">{epic?.name || "Task chưa thuộc Epic"}</div>
                                <div className="text-muted small">
                                  Ban: {epic?.department || "----"} • Deadline: {epic?.due || "Chưa thiết lập"}
                                </div>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge-custom text-bg-secondary">
                                Số lượng công việc: {group.tasks.length}
                              </span>
                              <span
                                className="badge-custom"
                                style={{
                                  backgroundColor: epicStatusStyle.bg,
                                  color: epicStatusStyle.color,
                                }}
                              >
                                {STATUS_LABEL_MAP[epic?.statusCode] || epic?.status || "Chưa bắt đầu"}
                              </span>
                              <i className={`bi ${isExpanded ? "bi-chevron-up" : "bi-chevron-down"} text-muted`} />
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3 bg-white">
                            {group.tasks.length === 0 ? (
                              <div className="text-muted small text-center py-3">
                                Chưa có công việc thường cho epic này.
                              </div>
                            ) : (
                              <div className="table-responsive">
                                <table className="table align-middle mb-0">
                                  <thead>
                                    <tr>
                                      <th style={{ width: 40 }} onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleSelectAll(group.tasks, epic?.id || epicId);
                                          }}
                                          checked={
                                            group.tasks.length > 0 &&
                                            group.tasks.every((task) => selectedTaskIds.includes(task.id))
                                          }
                                        />
                                      </th>
                                      <th style={{ width: 180 }}>Ban phụ trách</th>
                                      <th>Công việc</th>
                                      <th style={{ width: 180 }}>Người phụ trách</th>
                                      <th style={{ width: 150 }}>Người giao việc</th>
                                      <th style={{ width: 140 }}>Trạng thái</th>
                                      <th style={{ width: 140 }}>Deadline</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.tasks.map((task) => {
                                      const taskStatusStyle = statusColor(task.statusCode);
                                      return (
                                        <tr
                                          key={task.id}
                                          onClick={() => setSelectedTask(task)}
                                          style={{ cursor: "pointer" }}
                                          className="task-row"
                                        >
                                          <td onClick={(e) => e.stopPropagation()}>
                                            <input
                                              type="checkbox"
                                              checked={selectedTaskIds.includes(task.id)}
                                              onChange={() => handleSelectTask(task.id)}
                                            />
                                          </td>
                                          <td>
                                            <span className="fw-medium">{task.department}</span>
                                          </td>
                                          <td>
                                            <div className="fw-semibold">{task.name}</div>
                                            {task.description && (
                                              <div className="text-muted small text-truncate" style={{ maxWidth: 320 }}>
                                                {task.description}
                                              </div>
                                            )}
                                          </td>
                                          <td className="text-muted">
                                            {task.assignee === "----" ? "Chưa phân công" : task.assignee}
                                          </td>
                                          <td className="text-muted">
                                            {task.createdBy || "----"}
                                          </td>
                                          <td>
                                            <span
                                              className="status-badge"
                                              style={{
                                                backgroundColor: taskStatusStyle.bg,
                                                color: taskStatusStyle.color,
                                              }}
                                            >
                                              {task.status}
                                            </span>
                                          </td>
                                          <td className="text-muted">{task.due || "Chưa có"}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="text-muted small">
                    Hiển thị {startIndex + 1}-{Math.min(endIndex, groupedEpics.length)} trong tổng số {groupedEpics.length} Epic task
                  </div>
                  <nav>
                    <ul className="pagination mb-0">
                      <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Trước
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <li key={page} className={`page-item ${currentPage === page ? "active" : ""}`}>
                              <button className="page-link" onClick={() => setCurrentPage(page)}>
                                {page}
                              </button>
                            </li>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <li key={page} className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          );
                        }
                        return null;
                      })}
                      <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Sau
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}

          {/* Assignment View */}
          {activeTab === "assignment" && eventRole === "HoD" && (
            <div className="soft-card p-4">
              <div className="mb-3 text-muted small">
                Kéo công việc từ cột bên trái vào thành viên bên phải để giao việc
              </div>
              {membersForAssignment.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  Đang tải danh sách thành viên...
                </div>
              ) : (
                <TaskAssignmentBoard
                  tasks={tasks.filter(task => {
                    const hoDDept = departments.find(d => String(d._id) === String(hoDDepartmentId));
                    return hoDDept && task.department === hoDDept.name;
                  })}
                  members={membersForAssignment}
                  eventId={eventId}
                  departmentId={hoDDepartmentId}
                  onTaskAssigned={fetchTasks}
                  currentUserId={user?._id}
                />
              )}
            </div>
          )}

          {/* Board View */}
          {activeTab === "board" && (
            <div className="soft-card p-4 text-muted">
              <div style={{ display: 'flex', gap: 16 }}>
                {eventRole === "HoD" && (
                  <SuggestedTasksColumn
                    eventId={eventId}
                    departmentId={departments.find(d => d.name === filterDepartment)?._id}
                    onTaskAssigned={fetchTasks}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <KanbanBoardTask 
                    eventId={eventId}
                    listTask={statusGroup}
                    onTaskMove={fetchTasks}
                    currentUserId={user?._id}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Task Detail Panel */}
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
                    <label className="text-muted small mb-2">Tên công việc</label>
                    <div className="fw-semibold fs-5">{selectedTask.name}</div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">Mô tả</label>
                    <div className="text-muted">
                      {selectedTask.description || "Chưa có mô tả"}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">Ban phụ trách</label>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 20 }}>👤</span>
                      <span>{selectedTask.department}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-muted small mb-2">Người phụ trách</label>
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

        {/* Add Task Modal - giữ nguyên phần modal */}
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
                    <div className="mb-3">
                      <label className="form-label">Loại công việc *</label>
                      <select
                        className="form-select"
                        value={addTaskForm.taskType}
                        onChange={(e) => handleAddTaskInput("taskType", e.target.value)}
                      >
                        <option value="epic">Epic task</option>
                        <option value="normal">Công việc thường</option>
                      </select>
                      <div className="form-text small text-muted">
                        Epic task giao cho ban, không chọn người phụ trách. Chọn công việc thường để giao cho thành viên.
                      </div>
                    </div>
                    <div className="mb-3">
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
                            if (eventInfo?.createdAt) {
                              const eventCreatedAt = new Date(eventInfo.createdAt);
                              const eventCreatedAtStr = eventCreatedAt.toISOString().slice(0, 16);
                              return eventCreatedAtStr > minDateTime ? eventCreatedAtStr : minDateTime;
                            }
                            return minDateTime;
                          })()}
                        />
                        {eventInfo && (
                          <div className="form-text small text-muted">
                            Lưu ý: Thời gian bắt đầu phải sau thời điểm
                            {` ${new Date(eventInfo.createdAt).toLocaleString('vi-VN')}`}
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
                            const now = new Date();
                            now.setMinutes(now.getMinutes() + 1);
                            let minDateTime = now.toISOString().slice(0, 16);
                            
                            if (eventInfo?.createdAt) {
                              const eventCreatedAt = new Date(eventInfo.createdAt);
                              const eventCreatedAtStr = eventCreatedAt.toISOString().slice(0, 16);
                              if (eventCreatedAtStr > minDateTime) {
                                minDateTime = eventCreatedAtStr;
                              }
                            }
                            
                            if (addTaskForm.startDate) {
                              const startDate = new Date(addTaskForm.startDate);
                              startDate.setMinutes(startDate.getMinutes() + 1);
                              const startDateStr = startDate.toISOString().slice(0, 16);
                              if (startDateStr > minDateTime) {
                                minDateTime = startDateStr;
                              }
                            }
                            
                            return minDateTime;
                          })()}
                        />
                        {eventInfo && (
                          <div className="form-text small text-muted">
                            Lưu ý: Deadline phải sau thời điểm {` ${new Date(eventInfo.createdAt).toLocaleString('vi-VN')}`}
                            {addTaskForm.startDate && ` và sau thời gian bắt đầu (${new Date(addTaskForm.startDate).toLocaleString('vi-VN')})`}
                          </div>
                        )}
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
                        <label className="form-label">Thuộc Epic Task</label>
                        <select
                          className="form-select"
                          value={addTaskForm.parentId}
                          onChange={(e) => handleAddTaskInput("parentId", e.target.value)}
                          disabled={!addTaskForm.departmentId || addTaskForm.taskType === "epic"}
                        >
                          <option value="">Không thuộc</option>
                          {filteredParents.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                        {addTaskForm.taskType === "epic" && (
                          <div className="form-text small text-muted">
                            Epic task không thể chọn
                          </div>
                        )}
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

        {/* AI Chat Assistant for HOOC */}
        {showAIChat && eventRole === "HoOC" && (
          <AIChatAssistant
            eventId={eventId}
            onWBSGenerated={(data) => {
              setWbsData(data);
              setSessionId(data.data?.session_id);
              setShowWBSModal(true);
              setShowAIChat(false);
            }}
            onClose={() => setShowAIChat(false)}
          />
        )}

        {/* WBS Preview Modal */}
        {showWBSModal && wbsData && (
          <WBSPreviewModal
            eventId={eventId}
            wbsData={wbsData}
            sessionId={sessionId}
            onClose={() => {
              setShowWBSModal(false);
              setWbsData(null);
            }}
            onApplied={() => {
              fetchTasks();
              setShowWBSModal(false);
              setWbsData(null);
            }}
          />
        )}

        {/* Action Bar - Hiển thị khi có task hoặc epic được chọn */}
        {(selectedTaskIds.length > 0 || selectedEpicIds.length > 0) && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "white",
              borderTop: "1px solid #E5E7EB",
              padding: "12px 24px",
              boxShadow: "0 -4px 6px rgba(0,0,0,0.1)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                backgroundColor: "#F3F4F6",
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {selectedTaskIds.length + selectedEpicIds.length} selected
            </div>
            <div style={{ width: 1, height: 24, backgroundColor: "#E5E7EB" }} />
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => handleSelectAll()}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <i className="bi bi-cursor"></i>
              Select all
            </button>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-sm btn-danger"
              onClick={handleDeleteSelected}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <i className="bi bi-trash"></i>
              Delete
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setSelectedTaskIds([]);
                setSelectedEpicIds([]);
              }}
              style={{ padding: "4px 8px", minWidth: 32 }}
            >
              ×
            </button>
          </div>
        )}
      </UserLayout>
    </>
  );
}