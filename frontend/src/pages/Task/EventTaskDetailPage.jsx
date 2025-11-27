import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useEvents } from "~/contexts/EventContext";
import { taskApi } from "~/apis/taskApi";
import { departmentService } from "~/services/departmentService";
import { milestoneApi } from "~/apis/milestoneApi";
import { eventApi } from "~/apis/eventApi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "~/components/Loading";
import ConfirmModal from "~/components/ConfirmModal";
import { useNotifications } from "~/contexts/NotificationsContext";
import { useAuth } from "~/contexts/AuthContext";

export default function EventTaskDetailPage() {
  const { t } = useTranslation();
  const { eventId, taskId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();
  const { user } = useAuth();
  const [eventRole, setEventRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [assigneeFallbackName, setAssigneeFallbackName] = useState("");
  const [assigneeFallbackAvatar, setAssigneeFallbackAvatar] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    assigneeId: "",
    milestoneId: "",
    startDate: "",
    dueDate: "",
    status: "",
    progressPct: 0,
    estimate: "",
    estimateUnit: "h",
    parentId: "",
    dependenciesText: "",
  });
  const [eventInfo, setEventInfo] = useState(null);
  const [meta, setMeta] = useState({
    createdAt: "",
    updatedAt: "",
  });
  const [relatedTasks, setRelatedTasks] = useState({
    parent: null, // { id, title }
    dependencies: [], // [{ id, title }]
  });
  const [tasksAll, setTasksAll] = useState([]);
  const [claimingTask, setClaimingTask] = useState(false);
  const [releasingSelf, setReleasingSelf] = useState(false);

  const toId = (v) =>
    typeof v === "string" ? v : v && v._id ? String(v._id) : "";

  const getSidebarType = () => {
    if (eventRole === "HoOC") return "hooc";
    if (eventRole === "HoD") return "HoD";
    if (eventRole === "Member") return "member";
    return "user";
  };

  useEffect(() => {
    fetchEventRole(eventId).then(setEventRole);

    // Lấy thông tin sự kiện để validate deadline
    if (eventId) {
      eventApi
        .getById(eventId)
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
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !taskId) return;
    setLoading(true);
    Promise.all([
      taskApi.getTaskDetail(eventId, taskId),
      departmentService.getDepartments(eventId),
      milestoneApi.listMilestonesByEvent(eventId),
    ])
      .then(async ([taskRes, depts, ms]) => {
        const task = taskRes?.data;
        setDepartments(depts || []);
        setMilestones(ms?.data || []);
        if (task?.departmentId?._id) {
          const mems = await departmentService.getMembersByDepartment(
            eventId,
            task.departmentId._id
          );
          setAssignees(mems || []);
        } else {
          setAssignees([]);
        }
        setAssigneeFallbackName(
          task?.assigneeId?.userId?.fullName || task?.assigneeId?.fullName || ""
        );
        setAssigneeFallbackAvatar(
          task?.assigneeId?.userId?.avatarUrl ||
            task?.assigneeId?.avatarUrl ||
            ""
        );
        const parentId = toId(task?.parentId);
        const dependencies = Array.isArray(task?.dependencies)
          ? task.dependencies.map(toId).filter(Boolean)
          : [];

        setForm({
          title: task?.title || "",
          description: task?.description || "",
          departmentId: toId(task?.departmentId),
          assigneeId: toId(task?.assigneeId),
          milestoneId: toId(task?.milestoneId),
          startDate: task?.startDate
            ? new Date(task.startDate).toISOString().slice(0, 16)
            : "",
          dueDate: task?.dueDate
            ? new Date(task.dueDate).toISOString().slice(0, 16)
            : "",
          status:
            task?.status === "done"
              ? "Đã xong"
              : task?.status === "in_progress"
              ? "Đang làm"
              : task?.status === "blocked"
              ? "Tạm hoãn"
              : task?.status === "cancelled"
              ? "Đã huỷ"
              : "Chưa bắt đầu",
          progressPct:
            typeof task?.progressPct === "number" ? task.progressPct : 0,
          estimate: task?.estimate ?? "",
          estimateUnit: task?.estimateUnit || "h",
          parentId: parentId,
          dependenciesText: dependencies.join(","),
        });
        setMeta({
          createdAt: task?.createdAt || "",
          updatedAt: task?.updatedAt || "",
        });

        // Fetch thông tin parent task và dependencies tasks
        const fetchRelatedTasks = async () => {
          const tasksToFetch = [];
          if (parentId) tasksToFetch.push({ id: parentId, type: "parent" });
          dependencies.forEach((depId) => {
            if (depId) tasksToFetch.push({ id: depId, type: "dependency" });
          });

          if (tasksToFetch.length === 0) {
            setRelatedTasks({ parent: null, dependencies: [] });
            return;
          }

          try {
            const taskPromises = tasksToFetch.map(({ id }) =>
              taskApi.getTaskDetail(eventId, id).catch(() => null)
            );
            const results = await Promise.all(taskPromises);

            let parentTask = null;
            const dependencyTasks = [];

            results.forEach((result, index) => {
              if (!result?.data) return;
              const taskData = result.data;
              const taskInfo = {
                id: taskData._id || taskData.id,
                title: taskData.title || "—",
              };

              if (tasksToFetch[index].type === "parent") {
                parentTask = taskInfo;
              } else {
                dependencyTasks.push(taskInfo);
              }
            });

            setRelatedTasks({
              parent: parentTask,
              dependencies: dependencyTasks,
            });
          } catch (error) {
            console.error("Error fetching related tasks:", error);
            setRelatedTasks({ parent: null, dependencies: [] });
          }
        };

        fetchRelatedTasks();
      })
      .finally(() => setLoading(false));
  }, [eventId, taskId]);

  useEffect(() => {
    if (!form.departmentId || !eventId) return setAssignees([]);
    departmentService
      .getMembersByDepartment(eventId, form.departmentId)
      .then((members) => setAssignees(members || []));
  }, [form.departmentId, eventId]);

  useEffect(() => {
    if (!eventId) return;
    taskApi.getTaskByEvent(eventId).then(res => setTasksAll(res?.data || []));
  }, [eventId, isEditing]);

  const statusMapToBackend = (s) =>
    s === "Đã xong"
      ? "done"
      : s === "Đang làm"
      ? "in_progress"
      : s === "Tạm hoãn"
      ? "blocked"
      : s === "Đã huỷ"
      ? "cancelled"
      : "todo";

  const statusMapToLabel = (s) =>
    s === "done"
      ? "Đã xong"
      : s === "in_progress"
      ? "Đang làm"
      : s === "blocked"
      ? "Tạm hoãn"
      : s === "cancelled"
      ? "Đã huỷ"
      : "Chưa bắt đầu";

  const handleChange = (field, value) =>
    setForm((f) => ({
      ...f,
      [field]: value,
    }));

  const handleStatusChange = async (value) => {
    const backendStatus = statusMapToBackend(value);
    try {
      await taskApi.updateTaskProgress(eventId, taskId, {
        status: backendStatus,
      });
      setForm((f) => ({ ...f, status: value }));
      setIsEditing(false);
      // Backend sẽ tự động tạo notification khi task hoàn thành
    } catch (err) {
      const msg = err?.response?.data?.message;
      toast.error(msg || "Cập nhật trạng thái thất bại");
    }
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    try {
      if (!newAssigneeId) {
        await taskApi.unassignTask(eventId, taskId);
        setForm((f) => ({ ...f, assigneeId: "" }));
        setAssigneeFallbackName("");
        setIsEditing(false);
      } else {
        const member = assignees.find(
          (x) =>
            String(x._id) === String(newAssigneeId) ||
            String(x.userId?._id) === String(newAssigneeId)
        );
        const membershipId = member?._id || newAssigneeId;
        await taskApi.assignTask(eventId, taskId, membershipId);
        setForm((f) => ({ ...f, assigneeId: String(membershipId) }));
        const a = member;
        setAssigneeFallbackName(a?.userId?.fullName || a?.fullName || "");
        setIsEditing(false);
        // Backend sẽ tự động tạo notification khi giao việc cho Member
      }
    } catch {
      toast.error("Cập nhật người thực hiện thất bại");
    }
  };

  const handleRemoveAssignee = async () => {
    try {
      await taskApi.unassignTask(eventId, taskId);
      setForm((f) => ({ ...f, assigneeId: "" }));
      setAssigneeFallbackName("");
      toast.success("Đã huỷ gán người thực hiện");
    } catch {
      toast.error("Huỷ gán thất bại");
    }
  };

  const handleSave = async () => {
    // Kiểm tra xem có thể edit không
    const canEditCurrent =
      form.status === "Chưa bắt đầu" ||
      statusMapToBackend(form.status) === "todo";
    if (!canEditCurrent) {
      toast.error(
        "Không thể chỉnh sửa task khi trạng thái không phải 'Chưa bắt đầu'"
      );
      setIsEditing(false);
      return;
    }

    if (!form.title || !form.dueDate) {
      toast.error("Vui lòng điền đủ các trường bắt buộc");
      return;
    }
    setSaving(true);
    try {
      const dependencies = (form.dependenciesText || "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await taskApi.editTask(eventId, taskId, {
        title: form.title,
        description: form.description || undefined,
        departmentId: form.departmentId,
        // assignee is managed via assign/unassign API
        milestoneId: form.milestoneId || undefined,
        startDate: form.startDate
          ? new Date(form.startDate).toISOString()
          : undefined,
        dueDate: new Date(form.dueDate).toISOString(),
        // status is managed via updateTaskProgress API
        progressPct: Number.isFinite(Number(form.progressPct))
          ? Number(form.progressPct)
          : 0,
        estimate: form.estimate === "" ? undefined : Number(form.estimate),
        estimateUnit: form.estimateUnit || "h",
        parentId: form.parentId || undefined,
        dependencies: dependencies.length ? dependencies : [],
      });
      toast.success("Lưu thay đổi thành công");
      setIsEditing(false);
    } catch (err) {
      // Hiển thị lỗi từ backend
      const errorMessage =
        err?.response?.data?.message || "Lưu thay đổi thất bại";
      const errors = err?.response?.data?.errors || [];
      const fullError =
        errors.length > 0
          ? `${errorMessage}: ${errors.join(", ")}`
          : errorMessage;
      toast.error(fullError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await taskApi.deleteTask(eventId, taskId);
      toast.success("Đã xóa công việc");
      navigate(`/events/${eventId}/tasks`);
    } catch {
      toast.error("Xóa công việc thất bại");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const refetchDetail = async () => {
    if (!eventId || !taskId) return;
    setLoading(true);
    try {
      const [taskRes, depts, ms] = await Promise.all([
        taskApi.getTaskDetail(eventId, taskId),
        departmentService.getDepartments(eventId),
        milestoneApi.listMilestonesByEvent(eventId),
      ]);
      const task = taskRes?.data;
      setDepartments(depts || []);
      setMilestones(ms?.data || []);
      if (task?.departmentId?._id) {
        const mems = await departmentService.getMembersByDepartment(
          eventId,
          task.departmentId._id
        );
        setAssignees(mems || []);
      } else {
        setAssignees([]);
      }
      setAssigneeFallbackName(
        task?.assigneeId?.userId?.fullName || task?.assigneeId?.fullName || ""
      );
      setAssigneeFallbackAvatar(
        task?.assigneeId?.userId?.avatarUrl || task?.assigneeId?.avatarUrl || ""
      );

      const parentId = toId(task?.parentId);
      const dependencies = Array.isArray(task?.dependencies)
        ? task.dependencies.map(toId).filter(Boolean)
        : [];

      setForm({
        title: task?.title || "",
        description: task?.description || "",
        departmentId: toId(task?.departmentId),
        assigneeId: toId(task?.assigneeId),
        milestoneId: toId(task?.milestoneId),
        startDate: task?.startDate
          ? new Date(task.startDate).toISOString().slice(0, 16)
          : "",
        dueDate: task?.dueDate
          ? new Date(task.dueDate).toISOString().slice(0, 16)
          : "",
        status:
          task?.status === "done"
            ? "Đã xong"
            : task?.status === "in_progress"
            ? "Đang làm"
            : task?.status === "blocked"
            ? "Tạm hoãn"
            : task?.status === "cancelled"
            ? "Đã huỷ"
            : "Chưa bắt đầu",
        progressPct:
          typeof task?.progressPct === "number" ? task.progressPct : 0,
        estimate: task?.estimate ?? "",
        estimateUnit: task?.estimateUnit || "h",
        parentId: parentId,
        dependenciesText: dependencies.join(","),
      });
      setMeta({
        createdAt: task?.createdAt || "",
        updatedAt: task?.updatedAt || "",
      });

      // Fetch thông tin parent task và dependencies tasks
      const fetchRelatedTasks = async () => {
        const tasksToFetch = [];
        if (parentId) tasksToFetch.push({ id: parentId, type: "parent" });
        dependencies.forEach((depId) => {
          if (depId) tasksToFetch.push({ id: depId, type: "dependency" });
        });

        if (tasksToFetch.length === 0) {
          setRelatedTasks({ parent: null, dependencies: [] });
          return;
        }

        try {
          const taskPromises = tasksToFetch.map(({ id }) =>
            taskApi.getTaskDetail(eventId, id).catch(() => null)
          );
          const results = await Promise.all(taskPromises);

          let parentTask = null;
          const dependencyTasks = [];

          results.forEach((result, index) => {
            if (!result?.data) return;
            const taskData = result.data;
            const taskInfo = {
              id: taskData._id || taskData.id,
              title: taskData.title || "—",
            };

            if (tasksToFetch[index].type === "parent") {
              parentTask = taskInfo;
            } else {
              dependencyTasks.push(taskInfo);
            }
          });

          setRelatedTasks({
            parent: parentTask,
            dependencies: dependencyTasks,
          });
        } catch (error) {
          console.error("Error fetching related tasks:", error);
          setRelatedTasks({ parent: null, dependencies: [] });
        }
      };

      await fetchRelatedTasks();
    } finally {
      setLoading(false);
    }
  };

  const handleSelfAssign = async () => {
    if (!currentMembershipId) {
      toast.error("Không tìm thấy thông tin thành viên của bạn trong ban này");
      return;
    }
    try {
      setClaimingTask(true);
      await taskApi.assignTask(eventId, taskId, currentMembershipId);
      toast.success("Đã nhận công việc");
      await refetchDetail();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không thể nhận công việc"
      );
    } finally {
      setClaimingTask(false);
    }
  };

  const handleSelfUnassign = async () => {
    try {
      setReleasingSelf(true);
      await taskApi.unassignTask(eventId, taskId);
      toast.success("Đã bỏ nhận công việc");
      await refetchDetail();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không thể bỏ nhận công việc"
      );
    } finally {
      setReleasingSelf(false);
    }
  };

  const assigneeName = useMemo(() => {
    const a = assignees.find(
      (x) =>
        String(x._id) === String(form.assigneeId) ||
        String(x.id) === String(form.assigneeId) ||
        String(x.userId) === String(form.assigneeId) ||
        String(x.userId?._id) === String(form.assigneeId)
    );
    return (
      a?.userId?.fullName ||
      a?.fullName ||
      a?.name ||
      assigneeFallbackName ||
      "—"
    );
  }, [assignees, form.assigneeId, assigneeFallbackName]);

  const assigneeAvatarUrl = useMemo(() => {
    const a = assignees.find(
      (x) =>
        String(x._id) === String(form.assigneeId) ||
        String(x.id) === String(form.assigneeId) ||
        String(x.userId) === String(form.assigneeId) ||
        String(x.userId?._id) === String(form.assigneeId)
    );
    return a?.userId?.avatarUrl || a?.avatarUrl || assigneeFallbackAvatar || "";
  }, [assignees, form.assigneeId, assigneeFallbackAvatar]);

  const displayedAssignees = useMemo(() => {
    if (Array.isArray(assignees) && assignees.length > 0) return assignees;
    if (form.assigneeId && assigneeFallbackName) {
      return [
        {
          _id: form.assigneeId,
          name: assigneeFallbackName,
          userId: form.assigneeId,
        },
      ];
    }
    return [];
  }, [assignees, form.assigneeId, assigneeFallbackName]);

  const currentUserId = user?._id || user?.id || user?.userId;

  const currentMembership = useMemo(() => {
    if (!currentUserId || !Array.isArray(assignees)) return null;
    return assignees.find((member) => {
      const memberUserId =
        member?.userId?._id ||
        member?.userId ||
        member?.id ||
        member?._id;
      return (
        memberUserId && String(memberUserId) === String(currentUserId)
      );
    });
  }, [assignees, currentUserId]);

  const currentMembershipId =
    currentMembership?._id || currentMembership?.id || currentMembership?.userId;
  const currentMembershipDeptId =
    currentMembership?.departmentId?._id ||
    currentMembership?.departmentId ||
    form.departmentId;
  const isSelfAssigned =
    currentMembershipId &&
    form.assigneeId &&
    String(form.assigneeId) === String(currentMembershipId);
  const canHoDClaim =
    eventRole === "HoD" &&
    !!currentMembershipId &&
    (!!form.departmentId
      ? String(form.departmentId) === String(currentMembershipDeptId || form.departmentId)
      : true);

  // Kiểm tra xem có thể edit không (chỉ khi status = "todo"/"Chưa bắt đầu")
  const canEdit =
    form.status === "Chưa bắt đầu" ||
    statusMapToBackend(form.status) === "todo";

  // Hiển thị thông báo khi không thể edit
  const editDisabledMessage = !canEdit
    ? "Chỉ có thể chỉnh sửa task khi trạng thái là 'Chưa bắt đầu'. Chỉ có thể cập nhật trạng thái."
    : null;

  const leftBlock = (
    <div className="col-lg-7">
      <div className="mb-3">
        <label className="form-label">Tên công việc *</label>
        <input
          type="text"
          className="form-control"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Nhập tên công việc"
          disabled={!canEdit}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Mô tả</label>
        <textarea
          className="form-control"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
          placeholder="Mô tả ngắn..."
          disabled={!canEdit}
        />
      </div>
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Trạng thái</label>
          <div className="input-group">
            <select
              className="form-select"
              value={form.status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {(() => {
                const current = statusMapToBackend(form.status);
                // Chỉ assignee mới được update status, chỉ hiển thị các trạng thái có thể chuyển
                const NEXT = {
                  todo: ["in_progress"],
                  in_progress: ["blocked", "done"],
                  blocked: ["in_progress"],
                  done: [],
                  cancelled: [],
                };
                const candidates = [current, ...(NEXT[current] || [])];
                const unique = Array.from(new Set(candidates));
                return unique.map((s) => (
                  <option key={s} value={s}>
                    {statusMapToLabel(s)}
                  </option>
                ));
              })()}
            </select>
            <span className="input-group-text">▼</span>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label">Ước lượng</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              min={0}
              step="0.5"
              value={form.estimate}
              onChange={(e) => handleChange("estimate", e.target.value)}
              placeholder="Số lượng"
              disabled={!canEdit}
            />
            <select
              className="form-select"
              value={form.estimateUnit}
              onChange={(e) => handleChange("estimateUnit", e.target.value)}
              style={{ maxWidth: 120 }}
              disabled={!canEdit}
            >
              <option value="h">giờ</option>
              <option value="d">ngày</option>
              <option value="w">tuần</option>
            </select>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Công việc lớn</label>
          {isEditing ? (
            <select
              className="form-select"
              value={form.parentId}
              onChange={e => handleChange('parentId', e.target.value)}
              disabled={!canEdit}
            >
              <option value="">Không có</option>
              {tasksAll.filter(
                t => (!t.assigneeId) && String(t._id) !== String(taskId)
              ).map(t => (
                <option key={t._id} value={t._id}>{t.title}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="form-control"
              value={form.parentId}
              disabled
            />
          )}
        </div>
      </div>
      <div className="soft-card p-3">
        <div className="text-muted small mb-2">Thông tin chi tiết</div>
        <div className="d-flex flex-wrap gap-5">
          <div>
            <div className="text-muted small">Ngày tạo</div>
            <div className="fw-medium">
              {meta.createdAt
                ? new Date(meta.createdAt).toLocaleDateString("vi-VN")
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted small">Cập nhật lần cuối</div>
            <div className="fw-medium">
              {meta.updatedAt
                ? new Date(meta.updatedAt).toLocaleDateString("vi-VN")
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const rightBlock = (
    <div className="col-lg-5">
      <div className="mb-3">
        <label className="form-label">Ban phụ trách</label>
        <div className="input-group">
          <select
            className="form-select"
            value={form.departmentId}
            onChange={(e) => handleChange("departmentId", e.target.value)}
            disabled={!canEdit}
          >
            <option value="">Chọn ban</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
          <span className="input-group-text">▼</span>
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Người thực hiện</label>
        <div className="input-group">
          <select
            className="form-select"
            value={form.assigneeId}
            onChange={(e) => handleAssigneeChange(e.target.value)}
            disabled={!form.departmentId || !canEdit}
          >
            <option value="">Chọn người thực hiện</option>
            {displayedAssignees.map((m) => (
              <option
                key={m._id || m.id || m.userId}
                value={m._id || m.id || m.userId}
              >
                {m.userId?.fullName || m.fullName || m.name}
              </option>
            ))}
          </select>
          <span className="input-group-text">▼</span>
        </div>
        {form.assigneeId && (
          <div className="d-flex align-items-center justify-content-between rounded border p-2 mt-2">
            <div className="d-flex align-items-center gap-2">
              {assigneeAvatarUrl ? (
                <img
                  src={assigneeAvatarUrl}
                  alt="avatar"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: "#F3F4F6",
                  }}
                />
              )}
              <div>
                <div className="fw-medium">{assigneeName}</div>
                <div className="text-muted small">
                  {departments.find((d) => d._id === form.departmentId)?.name ||
                    "—"}
                </div>
              </div>
            </div>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={handleRemoveAssignee}
              disabled={!canEdit}
            >
              🗑
            </button>
          </div>
        )}
        {canHoDClaim && (
          <div className="d-flex flex-wrap gap-2 mt-2">
            {!isSelfAssigned && (
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={handleSelfAssign}
                disabled={claimingTask}
              >
                {claimingTask ? "Đang nhận..." : "Tôi sẽ thực hiện công việc này"}
              </button>
            )}
            {isSelfAssigned && (
              <>
                <span className="text-success small fw-semibold d-flex align-items-center">
                  Bạn đang phụ trách công việc này
                </span>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleSelfUnassign}
                  disabled={releasingSelf}
                >
                  {releasingSelf ? "Đang bỏ nhận..." : "Nhường lại"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label">Hoàn thành trước cột mốc</label>
        <div className="input-group">
          <select
            className="form-select"
            value={form.milestoneId}
            onChange={(e) => handleChange("milestoneId", e.target.value)}
            disabled={!canEdit}
          >
            <option value="">Chọn cột mốc</option>
            {milestones.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
          <span className="input-group-text">▼</span>
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Thời gian bắt đầu</label>
        <input
          type="datetime-local"
          className="form-control"
          value={form.startDate}
          onChange={(e) => handleChange("startDate", e.target.value)}
          disabled={!canEdit}
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
          max={
            eventInfo?.eventEndDate
              ? new Date(eventInfo.eventEndDate).toISOString().slice(0, 16)
              : undefined
          }
        />
        {eventInfo && (
          <div className="form-text small text-muted">
            Thời gian bắt đầu phải sau thời điểm hiện tại
            {eventInfo.eventStartDate &&
              ` và sau ${new Date(eventInfo.eventStartDate).toLocaleString(
                "vi-VN"
              )}`}
            {eventInfo.eventEndDate &&
              `, trước ${new Date(eventInfo.eventEndDate).toLocaleString(
                "vi-VN"
              )}`}
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label">Deadline *</label>
        <input
          type="datetime-local"
          className="form-control"
          value={form.dueDate}
          onChange={(e) => handleChange("dueDate", e.target.value)}
          disabled={!canEdit}
          min={(() => {
            if (form.startDate) {
              const startDate = new Date(form.startDate);
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
          max={
            eventInfo?.eventEndDate
              ? new Date(eventInfo.eventEndDate).toISOString().slice(0, 16)
              : undefined
          }
        />
        {eventInfo && (
          <div className="form-text small text-muted">
            Deadline phải sau thời điểm hiện tại
            {form.startDate && " và sau thời gian bắt đầu"}
            {eventInfo.eventStartDate &&
              `, sau ${new Date(eventInfo.eventStartDate).toLocaleString(
                "vi-VN"
              )}`}
            {eventInfo.eventEndDate &&
              `, trước ${new Date(eventInfo.eventEndDate).toLocaleString(
                "vi-VN"
              )}`}
          </div>
        )}
      </div>
    </div>
  );

  const viewLeftBlock = (
    <div className="col-lg-7">
      <div className="soft-card p-3 mb-3">
        <div className="text-muted small mb-2">Tên công việc</div>
        <div className="fw-semibold fs-5">{form.title || "—"}</div>
      </div>
      <div className="soft-card p-3 mb-3">
        <div className="text-muted small mb-2">Mô tả</div>
        <div className="text-muted">{form.description || "—"}</div>
      </div>
      <div className="soft-card p-3 mb-3">
        <div className="row">
          <div className="col-md-6 mb-2">
            <div className="text-muted small">Trạng thái</div>
            <div className="fw-medium">{form.status || "—"}</div>
          </div>
          <div className="col-md-6 mb-2">
            <div className="text-muted small">Ước lượng</div>
            <div className="fw-medium">
              {(form.estimate ?? "") === ""
                ? "—"
                : `${form.estimate}${form.estimateUnit}`}
            </div>
          </div>
        </div>
      </div>
      <div className="soft-card p-3 mb-3">
        <div className="row">
          <div className="col-md-6 mb-2">
            <div className="text-muted small">Thời gian bắt đầu</div>
            <div className="fw-medium">
              {form.startDate
                ? new Date(form.startDate).toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </div>
          </div>
          <div className="col-md-6 mb-2">
            <div className="text-muted small">Deadline</div>
            <div className="fw-medium">
              {form.dueDate
                ? new Date(form.dueDate).toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </div>
          </div>
        </div>
      </div>
      <div className="soft-card p-3">
        <div className="fw-medium mb-2">Liên kết công việc</div>
        <div className="mb-3">
          <div className="text-muted small mb-1">Công việc tổng</div>
          {relatedTasks.parent ? (
            <div className="fw-medium">
              <a
                href={`/events/${eventId}/tasks/${relatedTasks.parent.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(
                    `/events/${eventId}/tasks/${relatedTasks.parent.id}`
                  );
                }}
                style={{
                  color: "#3B82F6",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.target.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.target.style.textDecoration = "none";
                }}
              >
                {relatedTasks.parent.title}
              </a>
            </div>
          ) : (
            <div className="fw-medium">—</div>
          )}
        </div>
        <div>
        
        </div>
      </div>
    </div>
  );

  const viewRightBlock = (
    <div className="col-lg-5">
      <div className="soft-card p-3 mb-3">
        <div className="text-muted small">Ban phụ trách</div>
        <div className="fw-medium">
          {departments.find((d) => d._id === form.departmentId)?.name || "—"}
        </div>
      </div>
      <div className="soft-card p-3 mb-3">
        <div className="text-muted small">Người thực hiện</div>
        <div className="fw-medium">{assigneeName}</div>
      </div>
      <div className="soft-card p-3 mb-3">
        <div className="text-muted small">Cột mốc</div>
        <div className="fw-medium">
          {(() => {
            const milestone = milestones.find((m) => m._id === form.milestoneId);
            if (!milestone) return "—";
            const milestoneName = milestone.name || "—";
            const targetDate = milestone.targetDate
              ? new Date(milestone.targetDate).toLocaleString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit"
                })
              : "—";
            return (
              <a
                href={`/events/${eventId}/milestones`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/events/${eventId}/milestones`);
                }}
                style={{
                  color: "#3B82F6",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.target.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.target.style.textDecoration = "none";
                }}
              >
                {milestoneName} - {targetDate}
              </a>
            );
          })()}
        </div>
      </div>
      <div className="soft-card p-3">
        <div className="text-muted small mb-2">Thông tin chi tiết</div>
        <div className="d-flex flex-wrap gap-4">
          <div className="col-md-6 mb-2">
            <div className="text-muted small">Ngày tạo</div>
            <div className="fw-medium">
              {meta.createdAt
                ? new Date(meta.createdAt).toLocaleDateString("vi-VN")
                : "—"}
            </div>
          </div>
          <div className="col-md-6 mb-2">
            <div className="text-muted small">Cập nhật lần cuối</div>
            <div className="fw-medium">
              {meta.updatedAt
                ? new Date(meta.updatedAt).toLocaleDateString("vi-VN")
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <UserLayout
        title={t("taskPage.title")}
        activePage={"work" && "work-board"}
        sidebarType={getSidebarType()}
        eventId={eventId}
      >
        <ToastContainer position="top-right" autoClose={3000} />
        <style>{`
          .soft-card { background: white; border: 1px solid #E5E7EB; border-radius: 16px; box-shadow: 0 1px 3px rgba(16,24,40,.06); }
          .page-wrap { max-width: 1100px; margin: 0 auto; }
          .sticky-footer { margin-top: 10px; position: relative; bottom: 0; background: #fff; border-radius: 16px; border-top: 1px solid #E5E7EB; padding: 16px; }
        `}</style>
        <div className="page-wrap">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-0">
                {isEditing ? "Chỉnh sửa công việc" : "Chi tiết công việc"}
              </h4>
              {!canEdit && (
                <div
                  className="text-muted small mt-1"
                  style={{ color: "#dc3545" }}
                >
                  ⚠️ Chỉ có thể chỉnh sửa task khi trạng thái là 'Chưa bắt đầu'.
                  Chỉ có thể cập nhật trạng thái.
                </div>
              )}
            </div>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-warning" onClick={() => navigate(-1)}>
                Danh sách công việc
              </button>
              {!isEditing ? (
                <>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setIsEditing(true)}
                    disabled={form.status !== "Chưa bắt đầu"}
                    title={
                      form.status !== "Chưa bắt đầu"
                        ? "Chỉ có thể chỉnh sửa task khi trạng thái là 'Chưa bắt đầu'"
                        : ""
                    }
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDelete}
                    disabled={
                      form.status === "Đang làm" ||
                      statusMapToBackend(form.status) === "in_progress"
                    }
                    title={
                      form.status === "Đang làm" ||
                      statusMapToBackend(form.status) === "in_progress"
                        ? "Không thể xóa task khi đang ở trạng thái 'Đang làm'"
                        : ""
                    }
                  >
                    Xóa
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={async () => {
                      setIsEditing(false);
                      await refetchDetail();
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={saving || !canEdit}
                    onClick={handleSave}
                    title={
                      !canEdit
                        ? "Không thể chỉnh sửa task khi trạng thái không phải 'Chưa bắt đầu'"
                        : ""
                    }
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </>
              )}
            </div>
          </div>
          {loading ? (
            <div className="soft-card p-5 text-center text-muted">
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(255,255,255,1)",
                  zIndex: 2000,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Loading size={100} />
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {isEditing ? leftBlock : viewLeftBlock}
              {isEditing ? rightBlock : viewRightBlock}
            </div>
          )}
        </div>
      </UserLayout>
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        message="Bạn có chắc muốn xóa công việc này?"
      />
    </>
  );
}
