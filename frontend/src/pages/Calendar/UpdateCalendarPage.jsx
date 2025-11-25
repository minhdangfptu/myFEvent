import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import CancelConfirmModal from "~/components/CancelConfirmModal";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";
import { useAuth } from "~/contexts/AuthContext";
import calendarService from "~/services/calendarService";
import { departmentService } from "~/services/departmentService";
import { eventService } from "~/services/eventService";

const toMinutes = (timeStr) => {
    const [hours, minutes] = (timeStr || "").split(":").map(Number);
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
import { Users, UserPlus, Bell, Search, X } from "lucide-react";

export default function UpdateEventCalendarPage() {
    const navigate = useNavigate();
    const { eventId, calendarId } = useParams();
    const { fetchEventRole } = useEvents();
    const { user } = useAuth();
    const [eventRole, setEventRole] = useState("");
    const [loadingCalendar, setLoadingCalendar] = useState(true);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isManageParticipantsOpen, setIsManageParticipantsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("list"); // "list", "add", "remind"
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    const [availableMembers, setAvailableMembers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [loadingAvailableMembers, setLoadingAvailableMembers] = useState(false);

    const [remindTarget, setRemindTarget] = useState("unconfirmed");
    const [currentParticipants, setCurrentParticipants] = useState([]);

    const todayISODate = useMemo(() => new Date().toISOString().split("T")[0], []);

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
        participantType: "all",
        selectedDepartments: [],
        selectedCoreTeam: [],
        notes: "",
        attachments: []
    });


    useEffect(() => {
        if (isManageParticipantsOpen && activeTab === "add" && eventId && calendarId) {
            fetchAvailableMembers();
        }
    }, [isManageParticipantsOpen, activeTab, eventId, calendarId]);

    const fetchAvailableMembers = async () => {
        setLoadingAvailableMembers(true);
        try {
            const response = await calendarService.getAvailableMembers(eventId, calendarId);
            setAvailableMembers(response.data || []);
        } catch (error) {
            console.error('Error fetching available members:', error);
            toast.error('Không thể tải danh sách thành viên');
            setAvailableMembers([]);
        } finally {
            setLoadingAvailableMembers(false);
        }
    };

    const handleToggleMember = (memberId) => {
        setSelectedMembers(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };

    const handleAddParticipants = async () => {
        if (selectedMembers.length === 0) {
            toast.error("Vui lòng chọn ít nhất một người tham gia");
            return;
        }

        try {
            const response = await calendarService.addParticipants(eventId, calendarId, selectedMembers);
            toast.success(response.message || `Đã thêm ${selectedMembers.length} người tham gia`);
            setSelectedMembers([]);
            setActiveTab("list");

            // Refresh calendar data
            const updatedCalendar = await calendarService.getCalendarEventDetail(eventId, calendarId);
            setCurrentParticipants(updatedCalendar.data.participants || []);

            // Refresh available members
            fetchAvailableMembers();
        } catch (error) {
            console.error('Error adding participants:', error);
            toast.error(error.response?.data?.message || 'Không thể thêm người tham gia');
        }
    };

    const handleRemoveParticipant = async (memberId, memberName) => {
        if (!window.confirm(`Bạn có chắc muốn xóa "${memberName}" khỏi cuộc họp?`)) {
            return;
        }

        try {
            const response = await calendarService.removeParticipant(eventId, calendarId, memberId);
            toast.success(response.message || `Đã xóa ${memberName} khỏi cuộc họp`);

            // Refresh calendar data
            const updatedCalendar = await calendarService.getCalendarEventDetail(eventId, calendarId);
            setCurrentParticipants(updatedCalendar.data.participants || []);
            
            // Refresh available members list
            await fetchAvailableMembers();
        } catch (error) {
            console.error('Error removing participant:', error);
            toast.error(error.response?.data?.message || 'Không thể xóa người tham gia');
        }
    };

    const handleSendReminder = async () => {
        try {
            const response = await calendarService.sendReminder(eventId, calendarId, remindTarget);
            toast.success(response.message || 'Đã gửi nhắc nhở thành công');
            setIsManageParticipantsOpen(false);
        } catch (error) {
            console.error('Error sending reminder:', error);
            toast.error(error.response?.data?.message || 'Không thể gửi nhắc nhở');
        }
    };

    const getFilteredParticipants = () => {
        let filtered = currentParticipants;

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(p => p.participateStatus === filterStatus);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.member?.userId?.fullName?.toLowerCase().includes(query) ||
                p.member?.userId?.email?.toLowerCase().includes(query)
            );
        }

        return filtered;
    };

    // Categorize participants by status
    const attendees = currentParticipants.filter(p => p.participateStatus === 'confirmed');
    const notAttending = currentParticipants.filter(p => p.participateStatus === 'absent');
    const pending = currentParticipants.filter(p => p.participateStatus === 'unconfirmed');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [departmentsList, setDepartmentsList] = useState([]);
    const [coreTeamList, setCoreTeamList] = useState([]);
    const [departmentMembers, setDepartmentMembers] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isDepartmentCalendar, setIsDepartmentCalendar] = useState(false);
    const [calendarDepartmentId, setCalendarDepartmentId] = useState(null);
    const [calendarCreatorId, setCalendarCreatorId] = useState(null);

    // Load calendar data để populate form
    useEffect(() => {
        const loadCalendarData = async () => {
            if (!eventId || !calendarId) return;

            setLoadingCalendar(true);
            try {
                const response = await calendarService.getCalendarEventDetail(eventId, calendarId);
                const calendar = response.data;

                setCurrentParticipants(calendar.participants || []);

                // Parse date and time
                const startDate = new Date(calendar.startAt);
                const endDate = new Date(calendar.endAt);

                const meetingDate = startDate.toISOString().split('T')[0];
                const startTime = startDate.toTimeString().slice(0, 5);
                const endTime = endDate.toTimeString().slice(0, 5);

                // Determine calendar scope
                const depId = calendar.departmentId || null;
                setIsDepartmentCalendar(!!depId);
                setCalendarDepartmentId(depId);

                // Default participant UI state (we will let user re-select on update)
                let participantType = depId ? "all" : "all";
                let selectedDepartments = [];
                let selectedCoreTeam = [];

                const safeInfo = getSafeNowInfo();
                const sanitizedTimes = sanitizeMeetingTimes(meetingDate, startTime, endTime, safeInfo);
                setFormData({
                    name: calendar.name || "",
                    locationType: calendar.locationType || "online",
                    location: calendar.location || "",
                    meetingDate,
                    startTime: sanitizedTimes.startTime,
                    endTime: sanitizedTimes.endTime,
                    participantType,
                    selectedDepartments,
                    selectedCoreTeam,
                    notes: calendar.notes || "",
                    attachments: calendar.attachments || []
                });

            } catch (err) {
                console.error("Error loading calendar:", err);
                setError("Không thể tải thông tin lịch họp");
                toast.error("Không thể tải thông tin lịch họp");
            } finally {
                setLoadingCalendar(false);
            }
        };

        loadCalendarData();
    }, [eventId, calendarId]);

    useEffect(() => {
        const loadParticipants = async () => {
            if (!eventId) return;

            setLoadingData(true);
            try {
                if (isDepartmentCalendar && calendarDepartmentId) {
                    const memRes = await departmentService.getMembersByDepartment(eventId, calendarDepartmentId);
                    setDepartmentMembers(memRes || []);
                } else {
                    const deptResponse = await departmentService.getDepartments(eventId);
                    setDepartmentsList(deptResponse || []);

                    const coreTeamResponse = await eventService.getCoreTeamList(eventId);
                    setCoreTeamList(coreTeamResponse.data || []);
                }
            } catch (err) {
                console.error("Error loading participants:", err);
            } finally {
                setLoadingData(false);
            }
        };

        loadParticipants();
    }, [eventId, isDepartmentCalendar, calendarDepartmentId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const safeInfo = getSafeNowInfo();
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
        if (!formData.name.trim()) {
            setError("Vui lòng nhập tên cuộc họp");
            return;
        }
        if (!formData.location.trim()) {
            setError("Vui lòng nhập địa điểm");
            return;
        }
        if (!formData.meetingDate) {
            setError("Vui lòng chọn ngày họp");
            return;
        }
        if (!formData.startTime || !formData.endTime) {
            setError("Vui lòng nhập đầy đủ thời gian");
            return;
        }

        // Validate participants
        if (!isDepartmentCalendar) {
            if (formData.participantType === "departments" && formData.selectedDepartments.length === 0) {
                setError("Vui lòng chọn ít nhất một ban");
                return;
            }
            if (formData.participantType === "coreteam" && formData.selectedCoreTeam.length === 0) {
                setError("Vui lòng chọn ít nhất một thành viên core team");
                return;
            }
        } else {
            if (formData.participantType !== "all" && formData.selectedCoreTeam.length === 0 && formData.selectedDepartments.length === 0) {
                setError("Vui lòng chọn ít nhất một thành viên ban");
                return;
            }
        }

        const [startH, startM] = formData.startTime.split(':').map(Number);
        const [endH, endM] = formData.endTime.split(':').map(Number);

        // KIỂM TRA THỜI GIAN
        const now = new Date();
        const selectedStartDateTime = new Date(formData.meetingDate + 'T' + formData.startTime + ':00');
        const selectedEndDateTime = new Date(formData.meetingDate + 'T' + formData.endTime + ':00');

        // Nếu giờ kết thúc < giờ bắt đầu, nghĩa là sang ngày hôm sau
        if (endH < startH || (endH === startH && endM < startM)) {
            selectedEndDateTime.setDate(selectedEndDateTime.getDate() + 1);
        }

        // Kiểm tra thời gian bắt đầu có trong quá khứ không
        if (selectedStartDateTime < now) {
            setError("Không thể tạo cuộc họp với thời gian trong quá khứ");
            return;
        }

        setLoading(true);

        try {
            // TẠO updateData OBJECT
            const updateData = {
                name: formData.name,
                locationType: formData.locationType,
                location: formData.location,
                startAt: selectedStartDateTime.toISOString(),
                endAt: selectedEndDateTime.toISOString(),
                participantType: formData.participantType,
                notes: formData.notes,
                attachments: formData.attachments.filter(link => link.trim() !== "")
            };

            if (!isDepartmentCalendar) {
                if (formData.participantType === "departments") {
                    updateData.departments = formData.selectedDepartments;
                } else if (formData.participantType === "coreteam") {
                    updateData.coreTeamMembers = formData.selectedCoreTeam;
                }
            } else {
                if (formData.participantType !== "all") {
                    const selectedMembers = formData.selectedCoreTeam.length > 0 ? formData.selectedCoreTeam : formData.selectedDepartments;
                    updateData.members = selectedMembers;
                }
            }

            // WRAP updateData TRONG OBJECT
            const submitData = {
                updateData: updateData
            };

            const response = await calendarService.updateCalendar(eventId, calendarId, submitData);

            if (response) {
                toast.success('Cập nhật lịch thành công');
                await new Promise(resolve => setTimeout(resolve, 1200));
                navigate(`/events/${eventId}/my-calendar/${calendarId}`);
            } else {
                throw new Error('Không nhận được dữ liệu từ server');
            }

        } catch (err) {
            console.error("Update error:", err);
            setError(err.response?.data?.message || err.message || "Có lỗi xảy ra khi cập nhật");
            toast.error(err.response?.data?.message || "Có lỗi xảy ra khi cập nhật");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setIsCancelModalOpen(true);
    };

    const confirmCancel = () => {
        navigate(`/events/${eventId}/my-calendar/${calendarId}`);
    };

    if (loadingCalendar) {
        return (
            <UserLayout sidebarType={eventRole}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                        <p style={{ fontSize: '16px', color: '#6b7280' }}>Đang tải thông tin cuộc họp...</p>
                    </div>
                </div>
            </UserLayout>
        );
    }

    return (
        <UserLayout sidebarType={eventRole} activePage="calendar">
            <ToastContainer position="top-right" autoClose={3000} />
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
                        Chỉnh sửa cuộc họp
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
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {currentParticipants.length > 0 && (
                            <div style={{
                                marginBottom: "24px",
                                padding: "20px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 600, color: "#1f2937" }}>
                                            Người tham gia hiện tại
                                        </h3>
                                        <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
                                            Tổng: {currentParticipants.length} người
                                            (Đã xác nhận: {attendees.length}, Từ chối: {notAttending.length}, Chưa phản hồi: {pending.length})
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsManageParticipantsOpen(true)}
                                        style={{
                                            backgroundColor: '#059669',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px 20px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Users size={18} />
                                        Quản lý người tham gia
                                    </button>
                                </div>
                            </div>
                        )}
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
                                    Tên cuộc họp <span style={{ color: "#ef4444" }}>*</span>
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
                                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Ngày họp </div>
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
                                </div>

                                {calculateDuration() && (
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
                            {!isDepartmentCalendar && eventRole === "HoOC" && (
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

                            {isDepartmentCalendar && eventRole === "HoD" && (
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

                                    <div style={{ marginBottom: "12px" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}>
                                            <input
                                                type="radio"
                                                checked={formData.participantType === "all"}
                                                onChange={() => handleParticipantTypeChange("all")}
                                                style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                            />
                                            <span style={{ fontSize: "14px", color: "#374151" }}>Toàn bộ thành viên ban</span>
                                        </label>

                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                            <input
                                                type="radio"
                                                checked={formData.participantType !== "all"}
                                                onChange={() => handleParticipantTypeChange("members")}
                                                style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                            />
                                            <span style={{ fontSize: "14px", color: "#374151" }}>Chọn thành viên</span>
                                        </label>
                                    </div>

                                    {formData.participantType !== "all" && (
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
                                            ) : departmentMembers.length === 0 ? (
                                                <div style={{ fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
                                                    Ban này chưa có thành viên
                                                </div>
                                            ) : (
                                                departmentMembers.map(member => (
                                                    <label
                                                        key={member._id || member.id}
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
                                                            onChange={() => setFormData(prev => ({
                                                                ...prev,
                                                                selectedCoreTeam: prev.selectedCoreTeam.includes(member._id || member.id)
                                                                    ? prev.selectedCoreTeam.filter(id => id !== (member._id || member.id))
                                                                    : [...prev.selectedCoreTeam, (member._id || member.id)]
                                                            }))}
                                                            style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
                                                        />
                                                        <span style={{ fontSize: "13px", color: "#374151" }}>
                                                            {member.name || member.userId?.fullName}
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

                            {/* Box 5: Link tài liệu */}
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
                                    Link tài liệu cuộc họp <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "normal" }}>(vui lòng share quyền truy cập)</span>
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
                                                fontSize: "18px",
                                                padding: "4px 8px"
                                            }}
                                        >
                                            🗑
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
                                        fontWeight: "500"
                                    }}
                                >
                                    ➕ Thêm link
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
                                    transition: "opacity 0.2s"
                                }}
                            >
                                × Hủy
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
                                    minWidth: "150px"
                                }}
                            >
                                {loading ? "Đang cập nhật..." : "✓ Cập nhật"}
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

            {/* Modal Quản lý người tham gia */}
            {isManageParticipantsOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={() => {
                        setIsManageParticipantsOpen(false);
                        setActiveTab("list");
                        setSearchQuery("");
                        setFilterStatus("all");
                        setSelectedMembers([]);
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            maxWidth: '800px',
                            width: '100%',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
                                        Quản lý người tham gia
                                    </h2>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                        Tổng số: {currentParticipants.length} người
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsManageParticipantsOpen(false);
                                        setActiveTab("list");
                                        setSearchQuery("");
                                        setFilterStatus("all");
                                        setSelectedMembers([]);
                                    }}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#6b7280'
                                    }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                                <button
                                    onClick={() => setActiveTab("list")}
                                    style={{
                                        flex: 1,
                                        padding: '8px 16px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        backgroundColor: activeTab === "list" ? 'white' : 'transparent',
                                        color: activeTab === "list" ? '#1f2937' : '#6b7280'
                                    }}
                                >
                                    Danh sách
                                </button>
                                <button
                                    onClick={() => setActiveTab("add")}
                                    style={{
                                        flex: 1,
                                        padding: '8px 16px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        backgroundColor: activeTab === "add" ? 'white' : 'transparent',
                                        color: activeTab === "add" ? '#1f2937' : '#6b7280'
                                    }}
                                >
                                    Thêm người
                                </button>
                                <button
                                    onClick={() => setActiveTab("remind")}
                                    style={{
                                        flex: 1,
                                        padding: '8px 16px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        backgroundColor: activeTab === "remind" ? 'white' : 'transparent',
                                        color: activeTab === "remind" ? '#1f2937' : '#6b7280'
                                    }}
                                >
                                    Gửi nhắc nhở
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                            {/* Tab: Danh sách */}
                            {activeTab === "list" && (
                                <div>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input
                                                type="text"
                                                placeholder="Tìm kiếm theo tên hoặc email..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px 10px 40px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '8px',
                                                    fontSize: '14px',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            style={{
                                                padding: '10px 16px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                backgroundColor: 'white'
                                            }}
                                        >
                                            <option value="all">Tất cả</option>
                                            <option value="confirmed">Đã xác nhận</option>
                                            <option value="absent">Không tham gia</option>
                                            <option value="unconfirmed">Chưa phản hồi</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {getFilteredParticipants().map(participant => (
                                            <div
                                                key={participant.member?._id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '16px',
                                                    backgroundColor: '#f9fafb',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#e5e7eb',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {participant.member?.userId?.avatarUrl ? (
                                                            <img
                                                                src={participant.member.userId.avatarUrl}
                                                                alt={participant.member.userId.fullName}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <span style={{ fontSize: '18px' }}>👤</span>
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                                                            {participant.member?.userId?.fullName || 'N/A'}
                                                        </p>
                                                        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                                            {participant.member?.userId?.email || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {participant.participateStatus === 'confirmed' && (
                                                        <span style={{
                                                            backgroundColor: '#d1fae5',
                                                            color: '#065f46',
                                                            padding: '4px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}>
                                                            ✓ Tham gia
                                                        </span>
                                                    )}
                                                    {participant.participateStatus === 'absent' && (
                                                        <span style={{
                                                            backgroundColor: '#fee2e2',
                                                            color: '#991b1b',
                                                            padding: '4px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}>
                                                            ✖ Từ chối
                                                        </span>
                                                    )}
                                                    {participant.participateStatus === 'unconfirmed' && (
                                                        <span style={{
                                                            backgroundColor: '#fef3c7',
                                                            color: '#92400e',
                                                            padding: '4px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}>
                                                            ⏳ Chưa phản hồi
                                                        </span>
                                                    )}

                                                    {participant.member?.userId?._id !== user?.id && (
                                                        <button
                                                            onClick={() => handleRemoveParticipant(
                                                                participant.member?._id,
                                                                participant.member?.userId?.fullName
                                                            )}
                                                            style={{
                                                                backgroundColor: '#fee2e2',
                                                                color: '#dc2626',
                                                                border: 'none',
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '13px',
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {getFilteredParticipants().length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                                <Users size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
                                                <p style={{ margin: 0, fontSize: '15px' }}>Không tìm thấy người tham gia nào</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab: Thêm người */}
                            {activeTab === "add" && (
                                <div>
                                    <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6b7280' }}>
                                        Chọn thành viên để thêm vào cuộc họp
                                    </p>

                                    {loadingAvailableMembers ? (
                                        <div style={{ textAlign: 'center', padding: '40px' }}>
                                            <p style={{ color: '#6b7280' }}>Đang tải...</p>
                                        </div>
                                    ) : availableMembers.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                            <UserPlus size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
                                            <p style={{ margin: 0, fontSize: '15px' }}>Tất cả thành viên đã được thêm vào cuộc họp</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                                {availableMembers.map(member => (
                                                    <div
                                                        key={member._id}
                                                        onClick={() => handleToggleMember(member._id)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '16px',
                                                            backgroundColor: selectedMembers.includes(member._id) ? '#dbeafe' : '#f9fafb',
                                                            borderRadius: '8px',
                                                            border: selectedMembers.includes(member._id) ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#e5e7eb',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                overflow: 'hidden'
                                                            }}>
                                                                {member.userId?.avatarUrl ? (
                                                                    <img
                                                                        src={member.userId.avatarUrl}
                                                                        alt={member.userId.fullName}
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    />
                                                                ) : (
                                                                    <span style={{ fontSize: '18px' }}>👤</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                                                                    {member.userId?.fullName}
                                                                </p>
                                                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                                                    {member.userId?.email}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            border: selectedMembers.includes(member._id) ? '2px solid #2563eb' : '2px solid #d1d5db',
                                                            backgroundColor: selectedMembers.includes(member._id) ? '#2563eb' : 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '12px',
                                                            color: 'white'
                                                        }}>
                                                            {selectedMembers.includes(member._id) && '✓'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                                                <button
                                                    onClick={() => setSelectedMembers([])}
                                                    style={{
                                                        backgroundColor: 'white',
                                                        color: '#1f2937',
                                                        border: '1px solid #d1d5db',
                                                        padding: '10px 24px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '15px',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    Bỏ chọn tất cả
                                                </button>
                                                <button
                                                    onClick={handleAddParticipants}
                                                    disabled={selectedMembers.length === 0}
                                                    style={{
                                                        backgroundColor: selectedMembers.length === 0 ? '#9ca3af' : '#2563eb',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '10px 24px',
                                                        borderRadius: '8px',
                                                        cursor: selectedMembers.length === 0 ? 'not-allowed' : 'pointer',
                                                        fontSize: '15px',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    Thêm {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Tab: Gửi nhắc nhở */}
                            {activeTab === "remind" && (
                                <div>
                                    <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6b7280' }}>
                                        Chọn đối tượng bạn muốn gửi nhắc nhở về cuộc họp
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                        <div
                                            onClick={() => setRemindTarget('unconfirmed')}
                                            style={{
                                                padding: '20px',
                                                border: remindTarget === 'unconfirmed' ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: remindTarget === 'unconfirmed' ? '#fef3c7' : 'white'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    border: remindTarget === 'unconfirmed' ? '2px solid #f59e0b' : '2px solid #d1d5db',
                                                    backgroundColor: remindTarget === 'unconfirmed' ? '#f59e0b' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    color: 'white'
                                                }}>
                                                    {remindTarget === 'unconfirmed' && '✓'}
                                                </div>
                                                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                                                    Những người chưa phản hồi ({pending.length} người)
                                                </div>
                                            </div>
                                            <p style={{ margin: '0 0 0 36px', fontSize: '14px', color: '#6b7280' }}>
                                                Gửi nhắc nhở đến những người chưa xác nhận tham gia
                                            </p>
                                        </div>

                                        <div
                                            onClick={() => setRemindTarget('all')}
                                            style={{
                                                padding: '20px',
                                                border: remindTarget === 'all' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: remindTarget === 'all' ? '#dbeafe' : 'white'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    border: remindTarget === 'all' ? '2px solid #2563eb' : '2px solid #d1d5db',
                                                    backgroundColor: remindTarget === 'all' ? '#2563eb' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    color: 'white'
                                                }}>
                                                    {remindTarget === 'all' && '✓'}
                                                </div>
                                                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                                                    Tất cả mọi người ({currentParticipants.length} người)
                                                </div>
                                            </div>
                                            <p style={{ margin: '0 0 0 36px', fontSize: '14px', color: '#6b7280' }}>
                                                Gửi thông báo nhắc nhở đến tất cả người tham gia cuộc họp
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                                        <button
                                            onClick={() => setIsManageParticipantsOpen(false)}
                                            style={{
                                                backgroundColor: 'white',
                                                color: '#1f2937',
                                                border: '1px solid #d1d5db',
                                                padding: '10px 24px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '15px',
                                                fontWeight: 600
                                            }}
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleSendReminder}
                                            style={{
                                                backgroundColor: '#2563eb',
                                                color: 'white',
                                                border: 'none',
                                                padding: '10px 24px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '15px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <Bell size={18} />
                                            Gửi nhắc nhở
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </UserLayout>
    );
}