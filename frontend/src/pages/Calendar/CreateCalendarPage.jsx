import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { AlertCircle, Trash2, Plus, X, Check } from "lucide-react";
import CancelConfirmModal from "~/components/CancelConfirmModal";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";
import { useNotifications } from "~/contexts/NotificationsContext";
import calendarService from "~/services/calendarService";
import { departmentService } from "~/services/departmentService";
import { eventService } from "~/services/eventService";
import ConfirmModal from "../../components/ConfirmModal";

const toMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
};

const isTimeBefore = (timeA, timeB) => {
    const minutesA = toMinutes(timeA);
    const minutesB = toMinutes(timeB);
    if (minutesA == null || minutesB == null) return false;
    return minutesA < minutesB;
};

const getSafeNowInfo = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMilliseconds(0);
    now.setMinutes(now.getMinutes() + 1);
    return {
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().slice(0, 5)
    };
};

const sanitizeMeetingTimes = (meetingDate, startTime, endTime, safeInfo = getSafeNowInfo()) => {
    let sanitizedStart = startTime;
    let sanitizedEnd = endTime;

    if (meetingDate === safeInfo.date) {
        if (!sanitizedStart || isTimeBefore(sanitizedStart, safeInfo.time)) {
            sanitizedStart = safeInfo.time;
        }

        if (sanitizedEnd && !isTimeBefore(sanitizedStart, sanitizedEnd)) {
            sanitizedEnd = "";
        }
    }

    return {
        startTime: sanitizedStart,
        endTime: sanitizedEnd
    };
};

// Validate URL format
const isValidUrl = (string) => {
    if (!string || typeof string !== 'string') return false;
    const trimmed = string.trim();
    if (!trimmed) return false;
    
    // Check if it starts with http:// or https:// (case insensitive)
    const lowerTrimmed = trimmed.toLowerCase();
    const isValidProtocol = lowerTrimmed.startsWith('http://') || lowerTrimmed.startsWith('https://');
    
    if (!isValidProtocol) {
        return false;
    }
    
    // Try to create URL object to validate format
    try {
        const url = new URL(trimmed);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
        // If URL constructor fails but starts with http:// or https://, still accept it
        // (some URLs might have special characters that URL constructor doesn't like)
        // But ensure it has at least some content after the protocol
        const afterProtocol = trimmed.substring(trimmed.indexOf('://') + 3);
        return afterProtocol.length > 0;
    }
};

export default function CreateEventCalendarPage() {
    const navigate = useNavigate();
    const { eventId } = useParams();
    const { fetchEventRole } = useEvents();
  const { refreshNotifications } = useNotifications();
    const [eventRole, setEventRole] = useState("");
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const todayISODate = useMemo(
        () => new Date().toISOString().split("T")[0],
        []
    );
    useEffect(() => {
        let mounted = true
        const loadRole = async () => {
            if (!eventId) {
                if (mounted) setEventRole("")
                return
            }
            try {
                const role = await fetchEventRole(eventId)
                if (mounted) setEventRole(role)
            } catch (_) {
                if (mounted) setEventRole("")
            }
        }
        loadRole()
        return () => {
            mounted = false
        }
    }, [eventId, fetchEventRole]);

    const [formData, setFormData] = useState({
        name: "",
        locationType: "online",
        location: "",
        meetingDate: "",
        startTime: "",
        endTime: "",
        participantType: "all", // "all", "departments", "coreteam"
        selectedDepartments: [],
        selectedCoreTeam: [],
        notes: "",
        attachments: []
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [timeError, setTimeError] = useState("");

    const [departmentsList, setDepartmentsList] = useState([]);
    const [coreTeamList, setCoreTeamList] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        const loadParticipants = async () => {
            if (!eventId) return;

            setLoadingData(true);
            try {
                const deptResponse = await departmentService.getDepartments(eventId);
                setDepartmentsList(deptResponse || []);

                const coreTeamResponse = await eventService.getCoreTeamList(eventId);
                setCoreTeamList(coreTeamResponse.data || []);
            } catch (err) {
                console.error("Error loading participants:", err);
            } finally {
                setLoadingData(false);
            }
        };

        loadParticipants();
    }, [eventId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const safeInfo = getSafeNowInfo();
        
        // Clear time error when user starts typing
        if (["meetingDate", "startTime", "endTime"].includes(name)) {
            setTimeError("");
        }
        
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            if (["meetingDate", "startTime", "endTime"].includes(name)) {
                const sanitized = sanitizeMeetingTimes(
                    updated.meetingDate,
                    updated.startTime,
                    updated.endTime,
                    safeInfo
                );
                updated.startTime = sanitized.startTime;
                updated.endTime = sanitized.endTime;
                
                // Validate: endTime must be after startTime (on the same day)
                // Only validate when both times are filled
                if (updated.startTime && updated.endTime && updated.meetingDate) {
                    const startMinutes = toMinutes(updated.startTime);
                    const endMinutes = toMinutes(updated.endTime);
                    if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
                        // Set error message only when endTime is being changed and it's wrong
                        if (name === "endTime") {
                            setTimeError("Thời gian kết thúc phải sau thời gian bắt đầu");
                        }
                    } else {
                        // Clear error if valid
                        setTimeError("");
                    }
                } else {
                    // Clear error if either time is empty
                    setTimeError("");
                }
            }
            return updated;
        });
    };

    const handleParticipantTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            participantType: type,
            selectedDepartments: [],
            selectedCoreTeam: []
        }));
    };

    const handleDepartmentToggle = (deptId) => {
        setFormData(prev => ({
            ...prev,
            selectedDepartments: prev.selectedDepartments.includes(deptId)
                ? prev.selectedDepartments.filter(id => id !== deptId)
                : [...prev.selectedDepartments, deptId]
        }));
    };

    const handleCoreTeamToggle = (memberId) => {
        setFormData(prev => ({
            ...prev,
            selectedCoreTeam: prev.selectedCoreTeam.includes(memberId)
                ? prev.selectedCoreTeam.filter(id => id !== memberId)
                : [...prev.selectedCoreTeam, memberId]
        }));
    };

    const calculateDuration = () => {
        if (formData.startTime && formData.endTime) {
            const [startH, startM] = formData.startTime.split(':').map(Number);
            const [endH, endM] = formData.endTime.split(':').map(Number);
            let startMinutes = startH * 60 + startM;
            let endMinutes = endH * 60 + endM;

            // Nếu endTime < startTime, nghĩa là sang ngày hôm sau
            const isOvernight = endH < startH || (endH === startH && endM < startM);
            if (isOvernight) {
                endMinutes += 24 * 60; // Cộng thêm 24 giờ
            }

            const duration = endMinutes - startMinutes;

            if (duration > 0) {
                const hours = Math.floor(duration / 60);
                const minutes = duration % 60;
                return `${hours} tiếng${minutes > 0 ? ' ' + minutes + ' phút' : ''}${isOvernight ? ' (qua đêm)' : ''}`;
            }
        }
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Validation
        if (!formData.location.trim()) {
            setError("Vui lòng nhập địa điểm");
            return;
        }
        // Validate URL for online meetings
        if (formData.locationType === "online") {
            const locationTrimmed = formData.location ? formData.location.trim() : "";
            if (!locationTrimmed) {
                setError("Vui lòng nhập địa điểm");
                return;
            }
            if (!isValidUrl(locationTrimmed)) {
                setError("Vui lòng nhập link hợp lệ (bắt đầu bằng http:// hoặc https://)");
                return;
            }
        }
        if (!formData.meetingDate) {
            setError("Vui lòng chọn ngày họp");
            return;
        }
        if (!formData.startTime || !formData.endTime) {
            setError("Vui lòng nhập đầy đủ thời gian");
            return;
        }
        
        // Validate attachment links - only validate non-empty links
        const nonEmptyAttachments = formData.attachments.filter(link => link && link.trim() !== "");
        if (nonEmptyAttachments.length > 0) {
            const invalidAttachments = nonEmptyAttachments.filter(link => {
                const trimmed = link.trim();
                return !isValidUrl(trimmed);
            });
            if (invalidAttachments.length > 0) {
                setError("Các link tài liệu phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)");
                return;
            }
        }

        // Validate participants
        if (formData.participantType === "departments" && formData.selectedDepartments.length === 0) {
            setError("Vui lòng chọn ít nhất một ban");
            return;
        }
        if (formData.participantType === "coreteam" && formData.selectedCoreTeam.length === 0) {
            setError("Vui lòng chọn ít nhất một thành viên core team");
            return;
        }

        const [startH, startM] = formData.startTime.split(':').map(Number);
        const [endH, endM] = formData.endTime.split(':').map(Number);

        // Validate: endTime must be after startTime (same day)
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        if (endMinutes <= startMinutes) {
            setTimeError("Thời gian kết thúc phải sau thời gian bắt đầu trong cùng một ngày");
            setError("Thời gian kết thúc phải sau thời gian bắt đầu trong cùng một ngày");
            return;
        }

        // KIỂM TRA THỜI GIAN
        const now = new Date();
        const selectedStartDateTime = new Date(formData.meetingDate + 'T' + formData.startTime + ':00');
        const selectedEndDateTime = new Date(formData.meetingDate + 'T' + formData.endTime + ':00');

        // Kiểm tra thời gian bắt đầu có trong quá khứ không
        if (selectedStartDateTime < now) {
            setError("Không thể tạo cuộc họp với thời gian trong quá khứ");
            return;
        }
        
        // Validate endTime is after startTime
        if (selectedEndDateTime <= selectedStartDateTime) {
            setError("Thời gian kết thúc phải sau thời gian bắt đầu");
            return;
        }

        setLoading(true);

        try {
            const submitData = {
                name: formData.name,
                eventId: eventId,
                locationType: formData.locationType,
                location: formData.location,
                startAt: selectedStartDateTime.toISOString(),
                endAt: selectedEndDateTime.toISOString(),
                participantType: formData.participantType,
                notes: formData.notes,
                attachments: formData.attachments.filter(link => {
                    const trimmed = link && link.trim();
                    return trimmed !== "" && isValidUrl(trimmed);
                })
            };

            if (formData.participantType === "departments") {
                submitData.departments = formData.selectedDepartments;
            } else if (formData.participantType === "coreteam") {
                submitData.coreTeamMembers = formData.selectedCoreTeam;
            }

            const response = await calendarService.createCalendarForEvent(eventId, submitData);

            if (response.data) {
                toast.success('Tạo lịch thành công');
                refreshNotifications?.();
                setTimeout(() => navigate(`/events/${eventId}/my-calendar`), 500);
            } else {
                throw new Error('Không nhận được dữ liệu từ server');
            }

        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setIsCancelModalOpen(true);
    };
    const confirmCancel = () => {
        navigate(`/events/${eventId}/my-calendar`);
    };
    return (
        <UserLayout title="Lên lịch họp" eventId={eventId} sidebarType={eventRole} activePage="calendar">
            <div style={{
                minHeight: "100vh",
                backgroundColor: "#f8f9fa",
                padding: "24px"
            }}>
                <div style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "32px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}>
                    {/* Header */}
                    <h1 style={{
                        margin: "0 0 32px 0",
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "#ef4444"
                    }}>
                        Tạo cuộc họp mới
                    </h1>

                    {error && (
                        <div style={{
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            marginBottom: "24px",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <AlertCircle size={18} color="#991b1b" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Grid 3 cột */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>

                            {/* Box 1: Tên và Địa điểm */}
                            <div style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "20px",
                                backgroundColor: "white"
                            }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: "16px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    color: "#1a1a1a"
                                }}>
                                    Tên cuộc họp
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Nhập tên cuộc họp"
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        fontSize: "14px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        outline: "none",
                                        backgroundColor: "white"
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "#4285f4"}
                                    onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                />
                                <label style={{
                                    display: "block",
                                    marginBottom: "16px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    color: "#1a1a1a",
                                    paddingTop: "20px"
                                }}>
                                    Địa điểm <span style={{ color: "#ef4444" }}>*</span>
                                </label>

                                <div style={{ marginBottom: "12px", display: "flex", gap: "20px" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                            type="radio"
                                            name="locationType"
                                            value="online"
                                            checked={formData.locationType === "online"}
                                            onChange={handleChange}
                                            style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                        />
                                        <span style={{ fontSize: "14px", color: "#374151" }}>Online</span>
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                        <input
                                            type="radio"
                                            name="locationType"
                                            value="offline"
                                            checked={formData.locationType === "offline"}
                                            onChange={handleChange}
                                            style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                        />
                                        <span style={{ fontSize: "14px", color: "#374151" }}>Offline</span>
                                    </label>
                                </div>

                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="Nhập địa điểm/link cuộc họp"
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        fontSize: "14px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        outline: "none",
                                        backgroundColor: "white"
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "#4285f4"}
                                    onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                />
                            </div>

                            {/* Box 2: Thời gian */}
                            <div style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "20px",
                                backgroundColor: "white"
                            }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: "16px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    color: "#1a1a1a"
                                }}>
                                    Thời gian <span style={{ color: "#ef4444" }}>*</span>
                                </label>

                                <div style={{ marginBottom: "12px" }}>
                                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Ngày họp</div>
                                    <input
                                        type="date"
                                        name="meetingDate"
                                        value={formData.meetingDate}
                                        onChange={handleChange}
                                        min={todayISODate}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            fontSize: "14px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            outline: "none",
                                            backgroundColor: "white"
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = "#4285f4"}
                                        onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                                    <div>
                                        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Giờ bắt đầu</div>
                                        <input
                                            type="time"
                                            name="startTime"
                                            value={formData.startTime}
                                            onChange={handleChange}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                fontSize: "14px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                outline: "none",
                                                backgroundColor: "white"
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = "#4285f4"}
                                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Giờ kết thúc</div>
                                        <input
                                            type="time"
                                            name="endTime"
                                            value={formData.endTime}
                                            onChange={handleChange}
                                            min={formData.startTime && formData.meetingDate === todayISODate ? formData.startTime : undefined}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                fontSize: "14px",
                                                border: timeError ? "1px solid #dc2626" : "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                outline: "none",
                                                backgroundColor: "white"
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = "#4285f4"}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = timeError ? "#dc2626" : "#d1d5db";
                                                // Validate on blur - only show error if actually wrong
                                                if (formData.startTime && formData.endTime) {
                                                    const startMinutes = toMinutes(formData.startTime);
                                                    const endMinutes = toMinutes(formData.endTime);
                                                    if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
                                                        setTimeError("Thời gian kết thúc phải sau thời gian bắt đầu");
                                                    } else {
                                                        setTimeError("");
                                                    }
                                                } else {
                                                    setTimeError("");
                                                }
                                            }}
                                        />
                                        {/* Error message only shown when there's an actual error */}
                                        {timeError && (
                                            <div style={{
                                                fontSize: "12px",
                                                color: "#dc2626",
                                                marginTop: "6px",
                                                padding: "6px 8px",
                                                backgroundColor: "#fee2e2",
                                                borderRadius: "4px",
                                                border: "1px solid #fecaca",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px"
                                            }}>
                                                <AlertCircle size={16} color="#dc2626" />
                                                <span>{timeError}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!timeError && calculateDuration() && (
                                    <div style={{
                                        fontSize: "12px",
                                        color: "#6b7280",
                                        marginTop: "4px"
                                    }}>
                                        {calculateDuration()}
                                    </div>
                                )}
                            </div>

                            {/* Box 3: Đối tượng tham gia */}
                            {eventRole === "HoOC" && (
                                <div style={{
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "8px",
                                    padding: "20px",
                                    backgroundColor: "white"
                                }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: "16px",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        color: "#1a1a1a"
                                    }}>
                                        Đối tượng tham gia <span style={{ color: "#ef4444" }}>*</span>
                                    </label>

                                    {/* Radio buttons cho 3 options */}
                                    <div style={{ marginBottom: "12px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}>
                                            <input
                                                type="radio"
                                                checked={formData.participantType === "all"}
                                                onChange={() => handleParticipantTypeChange("all")}
                                                style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                            />
                                            <span style={{ fontSize: "14px", color: "#374151" }}>Toàn bộ thành viên BTC</span>
                                        </label>

                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}>
                                            <input
                                                type="radio"
                                                checked={formData.participantType === "departments"}
                                                onChange={() => handleParticipantTypeChange("departments")}
                                                style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                            />
                                            <span style={{ fontSize: "14px", color: "#374151" }}>Chọn ban</span>
                                        </label>

                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                            <input
                                                type="radio"
                                                checked={formData.participantType === "coreteam"}
                                                onChange={() => handleParticipantTypeChange("coreteam")}
                                                style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                            />
                                            <span style={{ fontSize: "14px", color: "#374151" }}>Họp riêng Core Team</span>
                                        </label>
                                    </div>

                                    {/* Hiện danh sách ban khi chọn "Chọn ban" */}
                                    {formData.participantType === "departments" && (
                                        <div style={{
                                            marginTop: "12px",
                                            padding: "12px",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "6px",
                                            maxHeight: "200px",
                                            overflowY: "auto"
                                        }}>
                                            {loadingData ? (
                                                <div style={{ fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
                                                    Đang tải...
                                                </div>
                                            ) : departmentsList.length === 0 ? (
                                                <div style={{ fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
                                                    Không có ban nào
                                                </div>
                                            ) : (
                                                departmentsList.map(dept => (
                                                    <label
                                                        key={dept._id || dept.id}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "8px",
                                                            padding: "6px 0",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.selectedDepartments.includes(dept._id || dept.id)}
                                                            onChange={() => handleDepartmentToggle(dept._id || dept.id)}
                                                            style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                                        />
                                                        <span style={{ fontSize: "13px", color: "#374151" }}>
                                                            {dept.name || dept.departmentName}
                                                        </span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Hiện danh sách core team khi chọn "Core Team" */}
                                    {formData.participantType === "coreteam" && (
                                        <div style={{
                                            marginTop: "12px",
                                            padding: "12px",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "6px",
                                            maxHeight: "200px",
                                            overflowY: "auto"
                                        }}>
                                            {loadingData ? (
                                                <div style={{ fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
                                                    Đang tải...
                                                </div>
                                            ) : coreTeamList.length === 0 ? (
                                                <div style={{ fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
                                                    Không có thành viên core team
                                                </div>
                                            ) : (
                                                coreTeamList.map(member => (
                                                    <label
                                                        key={member._id}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "8px",
                                                            padding: "6px 0",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.selectedCoreTeam.includes(member._id || member.id)}
                                                            onChange={() => handleCoreTeamToggle(member._id || member.id)}
                                                            style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                                        />
                                                        <span style={{ fontSize: "13px", color: "#374151" }}>
                                                            {member.userId.fullName}
                                                        </span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Grid 2 cột - Ghi chú và Tệp đính kèm */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>

                            {/* Box 4: Ghi chú cuộc họp */}
                            <div style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "20px",
                                backgroundColor: "white"
                            }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: "16px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    color: "#1a1a1a"
                                }}>
                                    Ghi chú cuộc họp
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Nhập nội dung ghi chú, chương trình nghị sự..."
                                    rows={6}
                                    style={{
                                        width: "100%",
                                        padding: "12px",
                                        fontSize: "14px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        outline: "none",
                                        resize: "vertical",
                                        fontFamily: "inherit",
                                        lineHeight: "1.6",
                                        backgroundColor: "white",
                                        minHeight: "160px"
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "#4285f4"}
                                    onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                />
                            </div>

                            {/* Box 5: Attachments */}
                            <div style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "20px",
                                backgroundColor: "white"
                            }}>
                                <label style={{
                                    display: "block",
                                    marginBottom: "16px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    color: "#1a1a1a"
                                }}>
                                    Link tài liệu cuộc họp <span style={{ color: "" }}>(vui lòng share quyền truy cập)</span>
                                </label>

                                {formData.attachments?.map((attachment, index) => (
                                    <div key={index} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        marginBottom: "10px"
                                    }}>
                                        <input
                                            type="text"
                                            value={attachment}
                                            onChange={(e) => {
                                                const newAttachments = [...formData.attachments];
                                                newAttachments[index] = e.target.value;
                                                setFormData(prev => ({ ...prev, attachments: newAttachments }));
                                            }}
                                            placeholder="Nhập link tài liệu (Google Drive, Docs, v.v.)"
                                            style={{
                                                flex: 1,
                                                padding: "10px 12px",
                                                fontSize: "14px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                outline: "none",
                                                backgroundColor: "white"
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = "#4285f4"}
                                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newAttachments = formData.attachments.filter((_, i) => i !== index);
                                                setFormData(prev => ({ ...prev, attachments: newAttachments }));
                                            }}
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "#ef4444",
                                                cursor: "pointer",
                                                padding: "4px 8px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            <Trash2 size={18} color="#ef4444" />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        attachments: [...(prev.attachments || []), ""]
                                    }))}
                                    style={{
                                        marginTop: "8px",
                                        padding: "8px 16px",
                                        backgroundColor: "#f3f4f6",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        color: "#374151",
                                        fontWeight: "500",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px"
                                    }}
                                >
                                    <Plus size={16} color="#374151" />
                                    Thêm link
                                </button>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "16px",
                            paddingTop: "24px",
                            borderTop: "1px solid #e5e7eb"
                        }}>
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={loading}
                                style={{
                                    padding: "12px 32px",
                                    backgroundColor: "#6b7280",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    fontSize: "15px",
                                    fontWeight: "500",
                                    opacity: loading ? 0.5 : 1,
                                    transition: "opacity 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <X size={18} color="white" />
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: "12px 32px",
                                    backgroundColor: loading ? "#93c5fd" : "#4285f4",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    fontSize: "15px",
                                    fontWeight: "500",
                                    minWidth: "150px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px"
                                }}
                            >
                                {loading ? "Đang tạo..." : (
                                    <>
                                        <Check size={18} color="white" />
                                        Tạo cuộc họp
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <CancelConfirmModal
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={confirmCancel}
                title="Hủy chỉnh sửa"
                message="Bạn có chắc chắn muốn hủy? Các thay đổi sẽ không được lưu."
            />
        </UserLayout>
    );
}