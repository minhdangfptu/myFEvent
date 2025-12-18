import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
// 1. Import thêm ToastContainer
import { toast, ToastContainer } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css"; // Đảm bảo import CSS nếu project chưa có global
import { AlertCircle, Trash2, Plus, X, Check } from "lucide-react";

import CancelConfirmModal from "~/components/CancelConfirmModal";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";
import { useNotifications } from "~/contexts/NotificationsContext";
import calendarService from "~/services/calendarService";
import { departmentService } from "~/services/departmentService";

// --- Utility Functions ---
const toMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return Number.isNaN(hours) || Number.isNaN(minutes) ? null : hours * 60 + minutes;
};

const isValidUrl = (string) => {
    if (!string || typeof string !== 'string') return false;
    const trimmed = string.trim();
    if (!trimmed) return false;
    try {
        const url = new URL(trimmed);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return /^(http:\/\/|https:\/\/)/i.test(trimmed) && trimmed.length > 8;
    }
};

export default function CreateDepartmentCalendarPage() {
    const navigate = useNavigate();
    const { eventId, departmentId } = useParams();
    const { fetchEventRole } = useEvents();
    const { refreshNotifications } = useNotifications();

    const [eventRole, setEventRole] = useState("");
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // Data Lists
    const [membersList, setMembersList] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    const [formData, setFormData] = useState({
        name: "",
        locationType: "online",
        location: "",
        meetingDate: "",
        startTime: "",
        endTime: "",
        participantType: "all",
        selectedMembers: [],
        notes: "",
        attachments: []
    });

    const todayISODate = useMemo(() => new Date().toISOString().split("T")[0], []);

    useEffect(() => {
        let mounted = true;
        if (eventId) {
            fetchEventRole(eventId).then(role => {
                if (mounted) setEventRole(role || "");
            }).catch(() => {
                if (mounted) setEventRole("");
            });
        }
        return () => { mounted = false; };
    }, [eventId, fetchEventRole]);

    useEffect(() => {
        const loadMembers = async () => {
            if (!eventId || !departmentId) return;
            setLoadingMembers(true);
            try {
                const res = await departmentService.getDepartmentAvailableMembers(eventId, departmentId);
                setMembersList(res || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingMembers(false);
            }
        };
        loadMembers();
    }, [eventId, departmentId]);

    // --- LOGIC 1: Xử lý Input (Không báo lỗi Time khi end < start) ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "location") setError("");
        // Reset time input, không báo lỗi realtime để hỗ trợ qua đêm
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMemberToggle = (memberId) => {
        setFormData(prev => ({
            ...prev,
            selectedMembers: prev.selectedMembers.includes(memberId)
                ? prev.selectedMembers.filter(id => id !== memberId)
                : [...prev.selectedMembers, memberId]
        }));
    };

    // --- LOGIC 2: Tính toán hiển thị (Có xử lý qua đêm) ---
    const durationDisplay = useMemo(() => {
        if (!formData.startTime || !formData.endTime) return "";
        const startM = toMinutes(formData.startTime);
        const endM = toMinutes(formData.endTime);
        if (startM === null || endM === null) return "";

        let diff = endM - startM;
        const isOvernight = diff < 0; // Nếu kết thúc nhỏ hơn bắt đầu -> Qua đêm

        if (isOvernight) {
            diff += 24 * 60; // Cộng thêm 24h
        }

        if (diff === 0) return ""; 

        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `${h} tiếng${m > 0 ? ` ${m} phút` : ''}${isOvernight ? ' (qua đêm)' : ''}`;
    }, [formData.startTime, formData.endTime]);

    // --- LOGIC 3: Submit (Cộng ngày nếu cần) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!formData.name.trim()) return setError("Vui lòng nhập tên cuộc họp");
        if (!formData.location.trim()) return setError("Vui lòng nhập địa điểm");
        if (formData.locationType === "online" && !isValidUrl(formData.location)) {
            return setError("Link Online phải hợp lệ");
        }
        if (!formData.meetingDate || !formData.startTime || !formData.endTime) {
            return setError("Vui lòng nhập đầy đủ thời gian");
        }
        
        const validAttachments = formData.attachments.filter(a => a && a.trim() !== "");
        if (validAttachments.some(link => !isValidUrl(link))) return setError("Link tài liệu không hợp lệ");
        
        if (formData.participantType === "members" && formData.selectedMembers.length === 0) {
            return setError("Vui lòng chọn ít nhất một thành viên");
        }

        // --- XỬ LÝ THỜI GIAN QUA ĐÊM ---
        const startDateTime = new Date(`${formData.meetingDate}T${formData.startTime}:00`);
        let endDateTime = new Date(`${formData.meetingDate}T${formData.endTime}:00`);
        const now = new Date();

        // Nếu giờ kết thúc <= giờ bắt đầu, tự động hiểu là ngày hôm sau
        if (endDateTime <= startDateTime) {
            endDateTime.setDate(endDateTime.getDate() + 1);
        }

        // Kiểm tra quá khứ 
        if (startDateTime < now) {
            return setError("Thời gian bắt đầu không được ở quá khứ");
        }
        if (formData.participantType === "members" && formData.selectedMembers.length === 0) {
            return setError("Vui lòng chọn ít nhất một thành viên");
        }

        setLoading(true);
        try {
            // Chuẩn bị payload cơ bản
            const payload = {
                name: formData.name,
                locationType: formData.locationType,
                location: formData.location,
                meetingDate: formData.meetingDate,
                startTime: formData.startTime,
                endTime: formData.endTime,
                startAt: startDateTime.toISOString(),
                endAt: endDateTime.toISOString(),
                notes: formData.notes,
                attachments: validAttachments,
                participantType: formData.participantType, 
            };

            if (formData.participantType === "members") {
                payload.members = formData.selectedMembers;
            }

            const response = await calendarService.createCalendarForDepartment(eventId, departmentId, payload);
            
            if (response.data) {
                toast.success("Tạo lịch ban thành công");
                refreshNotifications?.();
                setTimeout(() => {
                    navigate(`/events/${eventId}/my-calendar`);
                }, 1000);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Có lỗi xảy ra");
            toast.error(err.response?.data?.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    const handleAttachmentChange = (index, value) => {
        const newAttachments = [...formData.attachments];
        newAttachments[index] = value;
        setFormData(prev => ({ ...prev, attachments: newAttachments }));
    };

    return (
        <UserLayout title="Lên lịch họp" eventId={eventId} sidebarType={eventRole} activePage="calendar">
            <div style={styles.pageContainer}>
                <div style={styles.formContainer}>
                    <h1 style={styles.headerTitle}>Tạo cuộc họp cho ban</h1>

                    {error && (
                        <div style={styles.errorBanner}>
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={styles.gridThree}>
                            {/* Cột 1: Thông tin cơ bản */}
                            <div style={styles.card}>
                                <label style={styles.label}>Tên cuộc họp</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Nhập tên cuộc họp"
                                    style={styles.input}
                                />
                                
                                <label style={{...styles.label, paddingTop: "20px"}}>
                                    Địa điểm <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <div style={styles.radioGroup}>
                                    <label style={styles.radioLabel}>
                                        <input
                                            type="radio"
                                            name="locationType"
                                            value="online"
                                            checked={formData.locationType === "online"}
                                            onChange={handleInputChange}
                                            style={styles.radioInput}
                                        /> Online
                                    </label>
                                    <label style={styles.radioLabel}>
                                        <input
                                            type="radio"
                                            name="locationType"
                                            value="offline"
                                            checked={formData.locationType === "offline"}
                                            onChange={handleInputChange}
                                            style={styles.radioInput}
                                        /> Offline
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    placeholder="Địa điểm hoặc Link họp"
                                    style={styles.input}
                                />
                            </div>

                            {/* Cột 2: Thời gian */}
                            <div style={styles.card}>
                                <label style={styles.label}>Thời gian <span style={{ color: "#ef4444" }}>*</span></label>
                                <div style={{ marginBottom: "12px" }}>
                                    <div style={styles.subLabel}>Ngày họp</div>
                                    <input
                                        type="date"
                                        name="meetingDate"
                                        value={formData.meetingDate}
                                        onChange={handleInputChange}
                                        min={todayISODate}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    <div>
                                        <div style={styles.subLabel}>Bắt đầu</div>
                                        <input
                                            type="time"
                                            name="startTime"
                                            value={formData.startTime}
                                            onChange={handleInputChange}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div>
                                        <div style={styles.subLabel}>Kết thúc</div>
                                        <input
                                            type="time"
                                            name="endTime"
                                            value={formData.endTime}
                                            onChange={handleInputChange}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                                {durationDisplay && (
                                    <div style={styles.durationText}>
                                        {durationDisplay}
                                    </div>
                                )}
                            </div>

                            {/* Cột 3: Thành viên */}
                            <div style={styles.card}>
                                <label style={styles.label}>Đối tượng tham gia <span style={{ color: "#ef4444" }}>*</span></label>
                                <div style={{ marginBottom: "12px" }}>
                                    <label style={styles.radioLabel}>
                                        <input
                                            type="radio"
                                            checked={formData.participantType === "all"}
                                            onChange={() => setFormData(p => ({...p, participantType: "all", selectedMembers: []}))}
                                            style={styles.radioInput}
                                        /> Toàn bộ thành viên
                                    </label>
                                    <label style={{...styles.radioLabel, marginTop: "8px"}}>
                                        <input
                                            type="radio"
                                            checked={formData.participantType === "members"}
                                            onChange={() => setFormData(p => ({...p, participantType: "members"}))}
                                            style={styles.radioInput}
                                        /> Chọn thành viên
                                    </label>
                                </div>
                                {formData.participantType === "members" && (
                                    <div style={styles.scrollList}>
                                        {loadingMembers ? <div style={styles.emptyText}>Đang tải...</div> : 
                                         membersList.length === 0 ? <div style={styles.emptyText}>Trống</div> :
                                         membersList.map(m => (
                                            <label key={m._id || m.id} style={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.selectedMembers.includes(m._id || m.id)}
                                                    onChange={() => handleMemberToggle(m._id || m.id)}
                                                    style={styles.radioInput}
                                                />
                                                <span style={{fontSize: "13px"}}>{m.name || m.userId?.fullName}</span>
                                            </label>
                                         ))
                                        }
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={styles.gridTwo}>
                            <div style={styles.card}>
                                <label style={styles.label}>Ghi chú</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={6}
                                    style={styles.textarea}
                                    placeholder="Nội dung cuộc họp..."
                                />
                            </div>
                            <div style={styles.card}>
                                <label style={styles.label}>Tài liệu đính kèm</label>
                                {formData.attachments.map((link, i) => (
                                    <div key={i} style={styles.attachmentRow}>
                                        <input
                                            value={link}
                                            onChange={(e) => handleAttachmentChange(i, e.target.value)}
                                            style={styles.input}
                                            placeholder="Link tài liệu..."
                                        />
                                        <button type="button" onClick={() => {
                                            const newAtt = formData.attachments.filter((_, idx) => idx !== i);
                                            setFormData(prev => ({ ...prev, attachments: newAtt }));
                                        }} style={styles.iconButton}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setFormData(p => ({...p, attachments: [...p.attachments, ""]}))} style={styles.addButton}>
                                    <Plus size={16} /> Thêm link
                                </button>
                            </div>
                        </div>

                        <div style={styles.footer}>
                            <button type="button" onClick={() => setIsCancelModalOpen(true)} style={styles.cancelButton}>
                                <X size={18} /> Hủy
                            </button>
                            <button type="submit" disabled={loading} style={styles.submitButton(loading)}>
                                {loading ? "Đang xử lý..." : <><Check size={18} /> Tạo lịch</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            {/* 2. Thêm ToastContainer vào cuối layout */}
            <ToastContainer position="top-right" autoClose={3000} />
            
            <CancelConfirmModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={() => navigate(`/events/${eventId}/my-calendar`)}
                title="Hủy thao tác"
                message="Bạn có chắc chắn muốn hủy? Dữ liệu chưa lưu sẽ bị mất."
            />
        </UserLayout>
    );
}

// --- Styles ---
const styles = {
    pageContainer: { minHeight: "100vh", backgroundColor: "#f8f9fa", padding: "24px" },
    formContainer: { maxWidth: "1200px", margin: "0 auto", backgroundColor: "white", borderRadius: "12px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
    headerTitle: { margin: "0 0 32px 0", fontSize: "24px", fontWeight: "600", color: "#ef4444" },
    errorBanner: { backgroundColor: "#fee2e2", color: "#991b1b", padding: "12px 16px", borderRadius: "8px", marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center" },
    gridThree: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" },
    gridTwo: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" },
    card: { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", backgroundColor: "white" },
    label: { display: "block", marginBottom: "16px", fontSize: "15px", fontWeight: "600", color: "#1a1a1a" },
    subLabel: { fontSize: "12px", color: "#6b7280", marginBottom: "6px" },
    input: { width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none" },
    textarea: { width: "100%", padding: "12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", resize: "vertical", minHeight: "160px" },
    radioGroup: { marginBottom: "12px", display: "flex", gap: "20px" },
    radioLabel: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: "#374151" },
    radioInput: { width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" },
    checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", cursor: "pointer" },
    scrollList: { marginTop: "12px", padding: "12px", border: "1px solid #e5e7eb", borderRadius: "6px", maxHeight: "220px", overflowY: "auto" },
    emptyText: { fontSize: "13px", color: "#6b7280", textAlign: "center" },
    durationText: { fontSize: "12px", color: "#6b7280", marginTop: "4px", fontWeight: "500" },
    attachmentRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" },
    iconButton: { background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" },
    addButton: { marginTop: "8px", padding: "8px 16px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" },
    footer: { display: "flex", justifyContent: "center", gap: "16px", paddingTop: "24px", borderTop: "1px solid #e5e7eb" },
    cancelButton: { padding: "12px 32px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" },
    submitButton: (loading) => ({ padding: "12px 32px", backgroundColor: loading ? "#93c5fd" : "#4285f4", color: "white", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", minWidth: "150px", justifyContent: "center" })
};