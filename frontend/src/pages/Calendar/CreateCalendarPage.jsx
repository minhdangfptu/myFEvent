import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";

export default function CreateEventCalenderPage() {
    const navigate = useNavigate();
    const { eventId } = useParams();
    const { fetchEventRole} = useEvents();
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
        departments: [{ id: 1, value: "" }],
        notes: "",
    });
    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Danh sách ban (mock data)
    const departmentsList = [
        { id: "hc", name: "Ban Hậu cần" },
        { id: "tc", name: "Ban Tài chính" },
        { id: "tt", name: "Ban Truyền thông" },
        { id: "ns", name: "Ban Nhân sự" },
        { id: "kt", name: "Ban Kỹ thuật" },
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDepartmentChange = (index, value) => {
        const newDepartments = [...formData.departments];
        newDepartments[index].value = value;
        setFormData(prev => ({ ...prev, departments: newDepartments }));
    };

    const addDepartment = () => {
        setFormData(prev => ({
            ...prev,
            departments: [...prev.departments, { id: Date.now(), value: "" }]
        }));
    };

    const removeDepartment = (index) => {
        if (formData.departments.length > 1) {
            const newDepartments = formData.departments.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, departments: newDepartments }));
        }
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

        const [startH, startM] = formData.startTime.split(':').map(Number);
        const [endH, endM] = formData.endTime.split(':').map(Number);
        if (endH * 60 + endM <= startH * 60 + startM) {
            setError("Thời gian kết thúc phải sau thời gian bắt đầu");
            return;
        }

        setLoading(true);

        try {
            const submitData = new FormData();
            submitData.append('locationType', formData.locationType);
            submitData.append('location', formData.location);
            submitData.append('meetingDate', formData.meetingDate);
            submitData.append('startTime', formData.startTime);
            submitData.append('endTime', formData.endTime);
            submitData.append('departments', JSON.stringify(formData.departments.map(d => d.value).filter(v => v)));
            submitData.append('notes', formData.notes);

            files.forEach(f => {
                submitData.append('files', f.file);
            });

            const response = await fetch('/api/meetings/create', {
                method: 'POST',
                body: submitData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }

            alert('Tạo cuộc họp thành công!');

            setFormData({
                locationType: "online",
                location: "",
                meetingDate: "",
                startTime: "",
                endTime: "",
                departments: [{ id: 1, value: "" }],
                notes: "",
            });
            setFiles([]);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
            window.history.back();
        }
    };

    return (
        <UserLayout title="Tạo cuộc họp mới" sidebarType={eventRole} activePage="work-timeline">
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
                        {/* Grid 3 cột - mỗi cột là 1 box */}
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

                                {formData.departments.map((dept, index) => (
                                    <div key={dept.id} style={{ marginBottom: "10px", position: "relative" }}>
                                        <select
                                            value={dept.value}
                                            onChange={(e) => handleDepartmentChange(index, e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                fontSize: "14px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                                outline: "none",
                                                backgroundColor: "white",
                                                cursor: "pointer",
                                                appearance: "none",
                                                backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg width='14' height='8' viewBox='0 0 14 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M1 1L7 7L13 1' stroke='%23666' stroke-width='2' stroke-linecap='round'/%3e%3c/svg%3e')",
                                                backgroundRepeat: "no-repeat",
                                                backgroundPosition: "right 12px center",
                                                paddingRight: "36px"
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = "#4285f4"}
                                            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                        >
                                            <option value="">Chọn ban</option>
                                            {departmentsList.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        {formData.departments.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeDepartment(index)}
                                                style={{
                                                    position: "absolute",
                                                    right: "32px",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    background: "transparent",
                                                    border: "none",
                                                    color: "#ef4444",
                                                    cursor: "pointer",
                                                    fontSize: "18px",
                                                    padding: "4px",
                                                    lineHeight: 1
                                                }}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addDepartment}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "#ef4444",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        padding: "4px 0",
                                        marginTop: "4px",
                                        fontWeight: "500"
                                    }}
                                >
                                    + Thêm ban tham gia
                                </button>
                            </div>
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
                            justifyContent: "flex-end",
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