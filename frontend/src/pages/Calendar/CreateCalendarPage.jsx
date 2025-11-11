import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";
import calendarService from "~/services/calendarService";
import { departmentService } from "~/services/departmentService";
import { eventService } from "~/services/eventService";

export default function CreateEventCalendarPage() {
    const navigate = useNavigate();
    const { eventId } = useParams();
    const { fetchEventRole } = useEvents();
    const [eventRole, setEventRole] = useState("");

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
        locationType: "online",
        location: "",
        meetingDate: "",
        startTime: "",
        endTime: "",
        participantType: "all", // "all", "departments", "coreteam"
        selectedDepartments: [],
        selectedCoreTeam: [],
        notes: "",
    });

    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [departmentsList, setDepartmentsList] = useState([]);
    const [coreTeamList, setCoreTeamList] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

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

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        handleFiles(droppedFiles);
    };

    const handleFileInput = (e) => {
        const selectedFiles = Array.from(e.target.files);
        handleFiles(selectedFiles);
    };

    const handleFiles = (newFiles) => {
        setError("");
        const validFiles = newFiles.filter(file => {
            const validTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ];
            const maxSize = 10 * 1024 * 1024; // 10MB

            if (!validTypes.includes(file.type)) {
                setError("Chỉ chấp nhận file PDF, DOC, XLS, PPT");
                return false;
            }
            if (file.size > maxSize) {
                setError("File không được vượt quá 10MB");
                return false;
            }
            return true;
        });

        setFiles(prev => [...prev, ...validFiles.map(file => ({
            id: Date.now() + Math.random(),
            file,
            name: file.name,
            size: formatFileSize(file.size)
        }))]);
    };

    const removeFile = (fileId) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
        if (endH * 60 + endM <= startH * 60 + startM) {
            setError("Thời gian kết thúc phải sau thời gian bắt đầu");
            return;
        }

        setLoading(true);

        try {
            const submitData = new FormData();
            submitData.append('eventId', eventId);
            submitData.append('locationType', formData.locationType);
            submitData.append('location', formData.location);
            submitData.append('meetingDate', formData.meetingDate);
            submitData.append('startTime', formData.startTime);
            submitData.append('endTime', formData.endTime);
            submitData.append('participantType', formData.participantType);

            if (formData.participantType === "departments") {
                submitData.append('departments', JSON.stringify(formData.selectedDepartments));
            } else if (formData.participantType === "coreteam") {
                submitData.append('coreTeamMembers', JSON.stringify(formData.selectedCoreTeam));
            }

            submitData.append('notes', formData.notes);

            files.forEach(f => {
                submitData.append('files', f.file);
            });

            const response = await calendarService.createCalendarForEvent(eventId, submitData);

            // Axios response already has data parsed
            if (response.data) {
                toast.success('Tạo lịch thành công');
                navigate(`/events/${eventId}/my-calendar`);
            } else {
                throw new Error('Không nhận được dữ liệu từ server');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
            navigate(`/events/${eventId}/my-calendar`);
        }
    };

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
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Grid 3 cột */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>

                            {/* Box 1: Địa điểm */}
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
                                    Địa điểm
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
                                    Thời gian
                                </label>

                                <div style={{ marginBottom: "12px" }}>
                                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Ngày họp</div>
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
                                        Đối tượng tham gia
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
                                                        key={member._id }
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
                                                            { member.userId.fullName}
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

                            {/* Box 5: Tệp đính kèm */}
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
                                    Tệp đính kèm (tài liệu buổi họp)
                                </label>

                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    style={{
                                        border: dragActive ? "2px dashed #4285f4" : "2px dashed #d1d5db",
                                        borderRadius: "6px",
                                        padding: "24px 16px",
                                        textAlign: "center",
                                        backgroundColor: dragActive ? "#f0f9ff" : "white",
                                        transition: "all 0.2s",
                                        cursor: "pointer",
                                        minHeight: "160px",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        alignItems: "center"
                                    }}
                                >
                                    <div style={{ fontSize: "36px", marginBottom: "10px" }}>☁️</div>
                                    <div style={{ fontSize: "13px", color: "#374151", marginBottom: "6px", fontWeight: "500" }}>
                                        Kéo thả tập vào đây hoặc{" "}
                                        <label style={{ color: "#4285f4", cursor: "pointer", textDecoration: "underline" }}>
                                            Chọn tập từ máy tính
                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleFileInput}
                                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                                style={{ display: "none" }}
                                            />
                                        </label>
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                                        Hỗ trợ PDF, DOC, XLS, PPT (tối đa 10MB)
                                    </div>
                                </div>

                                {/* File list */}
                                {files.length > 0 && (
                                    <div style={{ marginTop: "12px" }}>
                                        {files.map(file => (
                                            <div
                                                key={file.id}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    padding: "8px 10px",
                                                    border: "1px solid #e5e7eb",
                                                    borderRadius: "6px",
                                                    marginBottom: "6px",
                                                    backgroundColor: "white"
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <div style={{
                                                        fontSize: "18px",
                                                        color: file.name.endsWith('.pdf') ? "#ef4444" : "#4285f4"
                                                    }}>
                                                        {file.name.endsWith('.pdf') ? '📄' : '📘'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: "12px", color: "#1a1a1a", fontWeight: "500" }}>
                                                            {file.name}
                                                        </div>
                                                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                                                            {file.size}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(file.id)}
                                                    style={{
                                                        background: "transparent",
                                                        border: "none",
                                                        color: "#ef4444",
                                                        cursor: "pointer",
                                                        fontSize: "16px",
                                                        padding: "4px",
                                                        lineHeight: 1
                                                    }}
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                {loading ? "Đang tạo..." : "✓ Tạo cuộc họp"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </UserLayout>
    );
}