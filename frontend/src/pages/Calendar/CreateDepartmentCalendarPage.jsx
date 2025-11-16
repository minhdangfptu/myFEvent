import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";
import calendarService from "~/services/calendarService";
import { departmentService } from "~/services/departmentService";

export default function CreateDepartmentCalendarPage() {
	const navigate = useNavigate();
	const { eventId, departmentId } = useParams();
	const { fetchEventRole } = useEvents();
	const [eventRole, setEventRole] = useState("");

	useEffect(() => {
		let mounted = true;
		const loadRole = async () => {
			try {
				const role = await fetchEventRole(eventId);
				if (mounted) setEventRole(role || "");
			} catch (_) {
				if (mounted) setEventRole("");
			}
		};
		if (eventId) loadRole();
		return () => {
			mounted = false;
		};
	}, [eventId, fetchEventRole]);

	const [formData, setFormData] = useState({
		name: "",
		locationType: "online",
		location: "",
		meetingDate: "",
		startTime: "",
		endTime: "",
		participantType: "all", // "all" or "members"
		selectedMembers: [],
		notes: "",
		attachments: []
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [membersList, setMembersList] = useState([]);
	const [loadingMembers, setLoadingMembers] = useState(true);

	useEffect(() => {
		const loadMembers = async () => {
			if (!eventId || !departmentId) return;
			setLoadingMembers(true);
			try {
				const res = await departmentService.getMembersByDepartment(eventId, departmentId);
				setMembersList(res || []);
			} catch (err) {
				console.error("Error loading department members:", err);
			} finally {
				setLoadingMembers(false);
			}
		};
		loadMembers();
	}, [eventId, departmentId]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleParticipantTypeChange = (type) => {
		setFormData(prev => ({
			...prev,
			participantType: type,
			selectedMembers: []
		}));
	};

	const handleMemberToggle = (memberId) => {
		setFormData(prev => ({
			...prev,
			selectedMembers: prev.selectedMembers.includes(memberId)
				 ? prev.selectedMembers.filter(id => id !== memberId)
			 : [...prev.selectedMembers, memberId]
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
		if (formData.participantType === "members" && formData.selectedMembers.length === 0) {
			setError("Vui lòng chọn ít nhất một thành viên ban");
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
			const submitData = {
				name: formData.name,
				locationType: formData.locationType,
				location: formData.location,
				meetingDate: formData.meetingDate,
				startTime: formData.startTime,
				endTime: formData.endTime,
				participantType: formData.participantType === "all" ? "all" : undefined,
				notes: formData.notes,
				attachments: formData.attachments.filter(link => link.trim() !== "")
			};
			if (formData.participantType === "members") {
				submitData.members = formData.selectedMembers;
			}
			const response = await calendarService.createCalendarForDepartment(eventId, departmentId, submitData);
			if (response.data) {
			 toast.success('Tạo lịch ban thành công');
			 navigate(`/events/${eventId}/my-calendar`);
			} else {
				throw new Error('Không nhận được dữ liệu từ server');
			}
		} catch (err) {
			setError(err.response?.data?.message || err.message || "Có lỗi xảy ra khi tạo lịch");
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		if (window.confirm('Bạn có chắc muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
			navigate(`/events/${eventId}/departments/${departmentId}`);
		}
	};

	return (
		<UserLayout sidebarType={eventRole} activePage="work-timeline">
			<div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa", padding: "24px" }}>
				<div style={{ maxWidth: "1200px", margin: "0 auto", backgroundColor: "white", borderRadius: "12px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
					<h1 style={{ margin: "0 0 32px 0", fontSize: "24px", fontWeight: "600", color: "#ef4444" }}>
						Tạo cuộc họp cho ban
					</h1>

					{error && (
						<div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "12px 16px", borderRadius: "8px", marginBottom: "24px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
							<span>⚠️</span>
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit}>
						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
							<div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", backgroundColor: "white" }}>
								<label style={{ display: "block", marginBottom: "16px", fontSize: "15px", fontWeight: "600", color: "#1a1a1a" }}>
									Tên cuộc họp
								</label>
								<input
									type="text"
									name="name"
									value={formData.name}
									onChange={handleChange}
									placeholder="Nhập tên cuộc họp"
									style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", backgroundColor: "white" }}
									onFocus={(e) => e.target.style.borderColor = "#4285f4"}
									onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
								/>
								<label style={{ display: "block", marginBottom: "16px", fontSize: "15px", fontWeight: "600", color: "#1a1a1a", paddingTop: "20px" }}>
									Địa điểm <span style={{ color: "#ef4444" }}>*</span>
								</label>
								<div style={{ marginBottom: "12px", display: "flex", gap: "20px" }}>
									<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
										<input type="radio" name="locationType" value="online" checked={formData.locationType === "online"} onChange={handleChange} style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }} />
										<span style={{ fontSize: "14px", color: "#374151" }}>Online</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
										<input type="radio" name="locationType" value="offline" checked={formData.locationType === "offline"} onChange={handleChange} style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }} />
										<span style={{ fontSize: "14px", color: "#374151" }}>Offline</span>
									</label>
								</div>
								<input
									type="text"
									name="location"
									value={formData.location}
									onChange={handleChange}
									placeholder="Nhập địa điểm/link cuộc họp"
									style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", backgroundColor: "white" }}
									onFocus={(e) => e.target.style.borderColor = "#4285f4"}
									onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
								/>
							</div>

							<div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", backgroundColor: "white" }}>
								<label style={{ display: "block", marginBottom: "16px", fontSize: "15px", fontWeight: "600", color: "#1a1a1a" }}>
									Thời gian <span style={{ color: "#ef4444" }}>*</span>
								</label>
								<div style={{ marginBottom: "12px" }}>
									<div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Ngày họp</div>
									<input type="date" name="meetingDate" value={formData.meetingDate} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", backgroundColor: "white" }} onFocus={(e) => e.target.style.borderColor = "#4285f4"} onBlur={(e) => e.target.style.borderColor = "#d1d5db"} />
								</div>
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
									<div>
										<div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Giờ bắt đầu</div>
										<input type="time" name="startTime" value={formData.startTime} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", backgroundColor: "white" }} onFocus={(e) => e.target.style.borderColor = "#4285f4"} onBlur={(e) => e.target.style.borderColor = "#d1d5db"} />
									</div>
									<div>
										<div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Giờ kết thúc</div>
										<input type="time" name="endTime" value={formData.endTime} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", backgroundColor: "white" }} onFocus={(e) => e.target.style.borderColor = "#4285f4"} onBlur={(e) => e.target.style.borderColor = "#d1d5db"} />
									</div>
								</div>
								{calculateDuration() && <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{calculateDuration()}</div>}
							</div>

							<div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", backgroundColor: "white" }}>
								<label style={{ display: "block", marginBottom: "16px", fontSize: "15px", fontWeight: "600", color: "#1a1a1a" }}>
									Đối tượng tham gia <span style={{ color: "#ef4444" }}>*</span>
								</label>
								<div style={{ marginBottom: "12px" }}>
									<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}>
										<input type="radio" checked={formData.participantType === "all"} onChange={() => handleParticipantTypeChange("all")} style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }} />
										<span style={{ fontSize: "14px", color: "#374151" }}>Toàn bộ thành viên ban</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
										<input type="radio" checked={formData.participantType === "members"} onChange={() => handleParticipantTypeChange("members")} style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }} />
										<span style={{ fontSize: "14px", color: "#374151" }}>Chọn thành viên</span>
									</label>
								</div>
								{formData.participantType === "members" && (
									<div style={{ marginTop: "12px", padding: "12px", border: "1px solid #e5e7eb", borderRadius: "6px", maxHeight: "220px", overflowY: "auto" }}>
										{loadingMembers ? (
											<div style={{ fontSize: "13px", color: "#6b7280", textAlign: "center" }}>Đang tải...</div>
										) : membersList.length === 0 ? (
											<div style={{ fontSize: "13px", color: "#6b7280", textAlign: "center" }}>Ban này chưa có thành viên</div>
										) : (
											membersList.map(m => (
												<label key={m._id || m.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", cursor: "pointer" }}>
													<input
														type="checkbox"
														checked={formData.selectedMembers.includes(m._id || m.id)}
														onChange={() => handleMemberToggle(m._id || m.id)}
														style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
													/>
													<span style={{ fontSize: "13px", color: "#374151" }}>{m.name || m.userId?.fullName}</span>
												</label>
											))
										)}
									</div>
								)}
							</div>
						</div>

						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
							<div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", backgroundColor: "white" }}>
								<label style={{ display: "block", marginBottom: "16px", fontSize: "15px", fontWeight: "600", color: "#1a1a1a" }}>
									Ghi chú cuộc họp
								</label>
								<textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Nhập nội dung ghi chú..." rows={6} style={{ width: "100%", padding: "12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: "1.6", backgroundColor: "white", minHeight: "160px" }} onFocus={(e) => e.target.style.borderColor = "#4285f4"} onBlur={(e) => e.target.style.borderColor = "#d1d5db"} />
							</div>
							<div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", backgroundColor: "white" }}>
								<label style={{ display: "block", marginBottom: "16px", fontSize: "15px", fontWeight: "600", color: "#1a1a1a" }}>
									Link tài liệu
								</label>
								{formData.attachments?.map((attachment, index) => (
									<div key={index} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
										<input type="text" value={attachment} onChange={(e) => {
											const newAttachments = [...formData.attachments];
											newAttachments[index] = e.target.value;
											setFormData(prev => ({ ...prev, attachments: newAttachments }));
										}} placeholder="Nhập link tài liệu" style={{ flex: 1, padding: "10px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "6px", outline: "none", backgroundColor: "white" }} onFocus={(e) => e.target.style.borderColor = "#4285f4"} onBlur={(e) => e.target.style.borderColor = "#d1d5db"} />
										<button type="button" onClick={() => {
											const newAttachments = formData.attachments.filter((_, i) => i !== index);
											setFormData(prev => ({ ...prev, attachments: newAttachments }));
										}} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "18px", padding: "4px 8px" }}>
											🗑
										</button>
									</div>
								))}
								<button type="button" onClick={() => setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), ""] }))} style={{ marginTop: "8px", padding: "8px 16px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "14px", color: "#374151", fontWeight: "500" }}>
									➕ Thêm link
								</button>
							</div>
						</div>

						<div style={{ display: "flex", justifyContent: "center", gap: "16px", paddingTop: "24px", borderTop: "1px solid #e5e7eb" }}>
							<button type="button" onClick={handleCancel} disabled={loading} style={{ padding: "12px 32px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: "500", opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
								× Hủy
							</button>
							<button type="submit" disabled={loading} style={{ padding: "12px 32px", backgroundColor: loading ? "#93c5fd" : "#4285f4", color: "white", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", fontSize: "15px", fontWeight: "500", minWidth: "150px" }}>
								{loading ? "Đang tạo..." : "✓ Tạo lịch"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</UserLayout>
	);
}




