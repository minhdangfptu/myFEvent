import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useEvents } from "~/contexts/EventContext";
import { taskApi } from "~/apis/taskApi";
import { departmentService } from "~/services/departmentService";
import { milestoneApi } from "~/apis/milestoneApi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "~/components/Loading";
import ConfirmModal from "~/components/ConfirmModal";

export default function EventTaskDetailPage() {
  const { t } = useTranslation();
  const { eventId, taskId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();
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
  const [pendingStatus, setPendingStatus] = useState("");
  const [showForceStatusModal, setShowForceStatusModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    assigneeId: "",
    milestoneId: "",
    dueDate: "",
    status: "",
    progressPct: 0,
    estimate: "",
    estimateUnit: "h",
    parentId: "",
    dependenciesText: "",
  });
  const [meta, setMeta] = useState({
    createdAt: "",
    updatedAt: "",
  });

  const toId = (v) => (typeof v === "string" ? v : v && v._id ? String(v._id) : "");

  const getSidebarType = () => {
    if (eventRole === "HoOC") return "hooc";
    if (eventRole === "HoD") return "HoD";
    if (eventRole === "Member") return "member";
    return "user";
  };

  useEffect(() => {
    fetchEventRole(eventId).then(setEventRole);
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
          const mems = await departmentService.getMembersByDepartment(eventId, task.departmentId._id);
          setAssignees(mems || []);
        } else {
          setAssignees([]);
        }
        setAssigneeFallbackName(task?.assigneeId?.userId?.fullName || task?.assigneeId?.fullName || "");
        setAssigneeFallbackAvatar(task?.assigneeId?.userId?.avatarUrl || task?.assigneeId?.avatarUrl || "");
        setForm({
          title: task?.title || "",
          description: task?.description || "",
          departmentId: toId(task?.departmentId),
          assigneeId: toId(task?.assigneeId),
          milestoneId: toId(task?.milestoneId),
          dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
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
          progressPct: typeof task?.progressPct === "number" ? task.progressPct : 0,
          estimate: task?.estimate ?? "",
          estimateUnit: task?.estimateUnit || "h",
          parentId: toId(task?.parentId),
          dependenciesText: Array.isArray(task?.dependencies) ? task.dependencies.join(",") : "",
        });
        setMeta({
          createdAt: task?.createdAt || "",
          updatedAt: task?.updatedAt || "",
        });
      })
      .finally(() => setLoading(false));
  }, [eventId, taskId]);

  useEffect(() => {
    if (!form.departmentId || !eventId) return setAssignees([]);
    departmentService.getMembersByDepartment(eventId, form.departmentId).then((members) => setAssignees(members || []));
  }, [form.departmentId, eventId]);

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
      await taskApi.updateTaskProgress(eventId, taskId, { status: backendStatus });
      setForm((f) => ({ ...f, status: value }));
      toast.success("Đã cập nhật trạng thái");
      setIsEditing(false)
    } catch (err) {
      const msg = err?.response?.data?.message;
      const code = err?.response?.status;
      const isManager = ["HoOC", "HoD"].includes(eventRole);
      if (code === 409 && isManager && msg && msg.includes('Còn task phụ thuộc')) {
        setPendingStatus(value);
        setShowForceStatusModal(true);
        return;
      }
      toast.error(msg || "Cập nhật trạng thái thất bại");
    }
  };

  const confirmForceStatus = async () => {
    const backendStatus = statusMapToBackend(pendingStatus);
    try {
      await taskApi.updateTaskProgress(eventId, taskId, { status: backendStatus, force: true });
      setForm((f) => ({ ...f, status: pendingStatus }));
      toast.success("Đã cập nhật trạng thái (override)");
      setIsEditing(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể override trạng thái");
    } finally {
      setShowForceStatusModal(false);
      setPendingStatus("");
    }
  };

  const handleAssigneeChange = async (newAssigneeId) => {
    try {
      if (!newAssigneeId) {
        await taskApi.unassignTask(eventId, taskId);
        setForm((f) => ({ ...f, assigneeId: "" }));
        setAssigneeFallbackName("");
        toast.success("Đã huỷ gán người thực hiện");
        setIsEditing(false)
      } else {
        const member = assignees.find(
          (x) => String(x._id) === String(newAssigneeId) || String(x.userId?._id) === String(newAssigneeId)
        );
        const membershipId = member?._id || newAssigneeId;
        await taskApi.assignTask(eventId, taskId, membershipId);
        setForm((f) => ({ ...f, assigneeId: String(membershipId) }));
        const a = member;
        setAssigneeFallbackName(a?.userId?.fullName || a?.fullName || "");
        toast.success("Đã gán người thực hiện");
        setIsEditing(false)
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
        dueDate: new Date(form.dueDate).toISOString(),
        // status is managed via updateTaskProgress API
        progressPct: Number.isFinite(Number(form.progressPct)) ? Number(form.progressPct) : 0,
        estimate: form.estimate === "" ? undefined : Number(form.estimate),
        estimateUnit: form.estimateUnit || "h",
        parentId: form.parentId || undefined,
        dependencies: dependencies.length ? dependencies : [],
      });
      toast.success("Lưu thay đổi thành công");
      setIsEditing(false)
    } catch {
      toast.error("Lưu thay đổi thất bại");
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
        const mems = await departmentService.getMembersByDepartment(eventId, task.departmentId._id);
        setAssignees(mems || []);
      } else {
        setAssignees([]);
      }
      setAssigneeFallbackName(task?.assigneeId?.userId?.fullName || task?.assigneeId?.fullName || "");
      setAssigneeFallbackAvatar(task?.assigneeId?.userId?.avatarUrl || task?.assigneeId?.avatarUrl || "");
      setForm({
        title: task?.title || "",
        description: task?.description || "",
        departmentId: toId(task?.departmentId),
        assigneeId: toId(task?.assigneeId),
        milestoneId: toId(task?.milestoneId),
        dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
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
        progressPct: typeof task?.progressPct === "number" ? task.progressPct : 0,
        estimate: task?.estimate ?? "",
        estimateUnit: task?.estimateUnit || "h",
        parentId: toId(task?.parentId),
        dependenciesText: Array.isArray(task?.dependencies) ? task.dependencies.join(",") : "",
      });
      setMeta({
        createdAt: task?.createdAt || "",
        updatedAt: task?.updatedAt || "",
      });
    } finally {
      setLoading(false);
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
    return a?.userId?.fullName || a?.fullName || a?.name || assigneeFallbackName || "—";
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
                const isManager = ["HoOC", "HoD"].includes(eventRole);
                const NEXT = {
                  todo: ["in_progress"],
                  in_progress: ["blocked", "done"],
                  blocked: ["in_progress"],
                  done: [],
                  cancelled: [],
                };
                const all = ["todo", "in_progress", "blocked", "done", "cancelled"];
                const candidates = isManager ? all : [current, ...NEXT[current]];
                const unique = Array.from(new Set(candidates));
                return unique.map((s) => (
                  <option key={s} disabled={!isManager && s !== current && !NEXT[current]?.includes(s)}>
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
            />
            <select
              className="form-select"
              value={form.estimateUnit}
              onChange={(e) => handleChange("estimateUnit", e.target.value)}
              style={{ maxWidth: 120 }}
            >
              <option value="h">giờ</option>
              <option value="d">ngày</option>
              <option value="w">tuần</option>
            </select>
          </div>
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label">Công việc cha (parentId)</label>
          <input
            type="text"
            className="form-control"
            value={form.parentId}
            onChange={(e) => handleChange("parentId", e.target.value)}
            placeholder="Nhập ID công việc cha"
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Phụ thuộc (dependencies, phân tách dấu phẩy)</label>
        <input
          type="text"
          className="form-control"
          value={form.dependenciesText}
          onChange={(e) => handleChange("dependenciesText", e.target.value)}
          placeholder="id1,id2,id3"
        />
      </div>
      <div className="soft-card p-3">
        <div className="text-muted small mb-2">Thông tin chi tiết</div>
        <div className="d-flex flex-wrap gap-5">
          <div>
            <div className="text-muted small">Ngày tạo</div>
            <div className="fw-medium">
              {meta.createdAt ? new Date(meta.createdAt).toLocaleDateString("vi-VN") : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted small">Cập nhật lần cuối</div>
            <div className="fw-medium">
              {meta.updatedAt ? new Date(meta.updatedAt).toLocaleDateString("vi-VN") : "—"}
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
            disabled={!form.departmentId}
          >
            <option value="">Chọn người thực hiện</option>
            {displayedAssignees.map((m) => (
              <option key={m._id || m.id || m.userId} value={m._id || m.id || m.userId}>
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
                <img src={assigneeAvatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: 999, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 999, background: "#F3F4F6" }} />
              )}
              <div>
                <div className="fw-medium">{assigneeName}</div>
                <div className="text-muted small">
                  {departments.find((d) => d._id === form.departmentId)?.name || "—"}
                </div>
              </div>
            </div>
            <button className="btn btn-sm btn-outline-danger" onClick={handleRemoveAssignee}>
              🗑
            </button>
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
        <label className="form-label">Deadline</label>
        <input
          type="date"
          className="form-control"
          value={form.dueDate}
          onChange={(e) => handleChange("dueDate", e.target.value)}
        />
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
              {(form.estimate ?? "") === "" ? "—" : `${form.estimate}${form.estimateUnit}`}
            </div>
          </div>
        </div>
      </div>
      <div className="soft-card p-3">
        <div className="fw-medium mb-2">Liên kết công việc</div>
        <div>
          <div className="text-muted small">Công việc tổng</div>
          <div className="fw-medium">{form.parentId || "—"}</div>
        </div>
        <div>
          <div className="text-muted small">Công việc sau</div>
          <div className="fw-medium">{form.dependenciesText ? form.dependenciesText : "—"}</div>
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
          {milestones.find((m) => m._id === form.milestoneId)?.name || "—"}
        </div>
      </div>
      <div className="soft-card p-3 mb-3">
        <div className="text-muted small">Deadline</div>
        <div className="fw-medium">{form.dueDate || "—"}</div>
      </div>
      <div className="soft-card p-3">
        <div className="text-muted small mb-2">Thông tin chi tiết</div>
        <div className="d-flex flex-wrap gap-4">
          <div className="col-md-6 mb-2">
            <div className="text-muted small">Ngày tạo</div>
            <div className="fw-medium">
              {meta.createdAt ? new Date(meta.createdAt).toLocaleDateString("vi-VN") : "—"}
            </div>
          </div>
          <div className="col-md-6 mb-2">
            <div className="text-muted small">Cập nhật lần cuối</div>
            <div className="fw-medium">
              {meta.updatedAt ? new Date(meta.updatedAt).toLocaleDateString("vi-VN") : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <UserLayout title={t("taskPage.title")} activePage={"work" && "work-board"} sidebarType={getSidebarType()}>
        <ToastContainer position="top-right" autoClose={3000} />
        <style>{`
          .soft-card { background: white; border: 1px solid #E5E7EB; border-radius: 16px; box-shadow: 0 1px 3px rgba(16,24,40,.06); }
          .page-wrap { max-width: 1100px; margin: 0 auto; }
          .sticky-footer { margin-top: 10px; position: relative; bottom: 0; background: #fff; border-radius: 16px; border-top: 1px solid #E5E7EB; padding: 16px; }
        `}</style>
        <div className="page-wrap">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">{isEditing ? "Chỉnh sửa công việc" : "Chi tiết công việc"}</h4>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-warning" onClick={() => navigate(-1)}>Danh sách công việc</button>
              {!isEditing ? (
                <>
                  <button className="btn btn-outline-secondary" onClick={() => setIsEditing(true)}>Chỉnh sửa</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Xóa</button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={async () => { setIsEditing(false); await refetchDetail(); }}
                  >
                    Hủy
                  </button>
                  <button className="btn btn-danger" disabled={saving} onClick={handleSave}>
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
      <ConfirmModal
        show={showForceStatusModal}
        onClose={() => setShowForceStatusModal(false)}
        onConfirm={confirmForceStatus}
        message="Một số task phụ thuộc chưa 'Đã xong'. Vẫn cập nhật trạng thái này?"
      />
    </>
  );
}
