import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";
import calendarService from "~/services/calendarService";
import { departmentService } from "~/services/departmentService";
import { eventService } from "~/services/eventService";

export default function UpdateEventCalendarPage() {
    const navigate = useNavigate();
    const { eventId, calendarId } = useParams();
    const { fetchEventRole } = useEvents();
    const [eventRole, setEventRole] = useState("");
    const [loadingCalendar, setLoadingCalendar] = useState(true);

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

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [departmentsList, setDepartmentsList] = useState([]);
    const [coreTeamList, setCoreTeamList] = useState([]);
    const [departmentMembers, setDepartmentMembers] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isDepartmentCalendar, setIsDepartmentCalendar] = useState(false);
    const [calendarDepartmentId, setCalendarDepartmentId] = useState(null);

    // Load calendar data để populate form
    useEffect(() => {
        const loadCalendarData = async () => {
            if (!eventId || !calendarId) return;

            setLoadingCalendar(true);
            try {
                const response = await calendarService.getCalendarEventDetail(eventId, calendarId);
                const calendar = response.data;

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

                setFormData({
                    name: calendar.name || "",
                    locationType: calendar.locationType || "online",
                    location: calendar.location || "",
                    meetingDate,
                    startTime,
                    endTime,
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
        setFormData(prev => ({ ...prev, [name]: value }));
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
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const duration = endMinutes - startMinutes;

            if (duration > 0) {
                const hours = Math.floor(duration / 60);
                const minutes = duration % 60;
                return `${hours} tiếng${minutes > 0 ? ' ' + minutes + ' phút' : ''}`;
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
            // Department calendar: participantType "all" or "members"
            if (formData.participantType !== "all" && formData.selectedCoreTeam.length === 0 && formData.selectedDepartments.length === 0) {
                // We'll reuse selectedCoreTeam to hold selected members in department scope
                setError("Vui lòng chọn ít nhất một thành viên ban");
                return;
            }
        }

        const [startH, startM] = formData.startTime.split(':').map(Number);
        const [endH, endM] = formData.endTime.split(':').map(Number);
        if (endH * 60 + endM <= startH * 60 + startM) {
            setError("Thời gian kết thúc phải sau thời gian bắt đầu");
            return;
        }

        setLoading(true);

        try {
            const submitData = {
                name: formData.name,
                locationType: formData.locationType,
                location: formData.location,
                meetingDate: formData.meetingDate,
                startTime: formData.startTime,
                endTime: formData.endTime,
                participantType: formData.participantType,
                notes: formData.notes,
                attachments: formData.attachments.filter(link => link.trim() !== "")
            };

            if (!isDepartmentCalendar) {
                if (formData.participantType === "departments") {
                    submitData.departments = formData.selectedDepartments;
                } else if (formData.participantType === "coreteam") {
                    submitData.coreTeamMembers = formData.selectedCoreTeam;
                }
            } else {
                // Department calendar: use members list when manual selection
                if (formData.participantType !== "all") {
                    // reuse selectedCoreTeam array to store selected memberIds in UI or introduce separate state;
                    // here, prefer selectedCoreTeam if populated, fallback to selectedDepartments
                    const selectedMembers = formData.selectedCoreTeam.length > 0 ? formData.selectedCoreTeam : formData.selectedDepartments;
                    submitData.members = selectedMembers;
                }
            }

            const response = await calendarService.updateCalendar(eventId, calendarId, submitData);

            if (response.data) {
                toast.success('Cập nhật lịch thành công');
                navigate(`/events/${eventId}/calendar/${calendarId}`);
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
        if (window.confirm('Bạn có chắc muốn hủy? Các thay đổi sẽ không được lưu.')) {
            navigate(`/events/${eventId}/calendar/${calendarId}`);
        }
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
        <UserLayout sidebarType={eventRole} activePage="work-timeline">
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
        </UserLayout>
    );
}