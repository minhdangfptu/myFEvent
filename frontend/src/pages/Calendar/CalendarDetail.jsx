import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";
import { useAuth } from "~/contexts/AuthContext";
import calendarService from "~/services/calendarService";
import { CheckCircle2Icon, Clock, Delete, Edit, FileText, MapPin, Paperclip, Search, Trash, Users, X, XCircle } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import Loading from "~/components/Loading";

export default function CalendarDetail() {
    const navigate = useNavigate();
    const { eventId, calendarId } = useParams();
    const { fetchEventRole } = useEvents();
    const { user } = useAuth();
    const [eventRole, setEventRole] = useState("");
    const [calendar, setCalendar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    // States cho modal thay đổi trạng thái
    const [isChangeStatusModalOpen, setIsChangeStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState("");
    const [absentReason, setAbsentReason] = useState("");
    const [isQuickAbsent, setIsQuickAbsent] = useState(false);

    const [isPastMeeting, setIsPastMeeting] = useState(false);
    const [isParticipating, setIsParticipating] = useState(false);
    const [isConfirmingStatus, setIsConfirmingStatus] = useState(false);
    const [isDeletingCalendar, setIsDeletingCalendar] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // States cho modal xem tất cả
    const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
    const [viewAllType, setViewAllType] = useState(""); // "confirmed", "absent", "unconfirmed"
    const [searchQuery, setSearchQuery] = useState("");

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

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                const response = await calendarService.getCalendarEventDetail(eventId, calendarId);
                setCalendar(response.data);
                console.log(calendar);
                const currentDate = new Date();
                if (new Date(response?.data.endAt).getTime() < currentDate.getTime()) {
                    setIsPastMeeting(true);
                }
            } catch (error) {
                console.error('Error fetching event:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        if (eventId) {
            fetchEventDetails();
        }
    }, [eventId, calendarId]);
    console.log(calendar);
    if (loading) {
        return (
            <UserLayout eventId={eventId} sidebarType={eventRole}>
                <Loading/>
            </UserLayout>
        );
    }

    if (error) {
        return (
            <UserLayout title="Cuộc họp của bạn" eventId={eventId} sidebarType={eventRole}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
                    <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                        <p style={{ fontSize: '18px', color: '#1f2937', fontWeight: 600, marginBottom: '8px' }}>Đã có lỗi xảy ra</p>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>{error}</p>
                        <button
                            onClick={() => navigate(-1)}
                            style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            </UserLayout>
        );
    }

    if (!calendar) {
        return null;
    }

    // Format date and time
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    // Calculate duration
    const calculateDuration = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const durationMs = endDate - startDate;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours} giờ ${minutes > 0 ? minutes + ' phút' : ''}`;
    };

    // Categorize participants by status
    const attendees = calendar.participants
        .filter(p => p.participateStatus === 'confirmed')
        .map(p => ({
            id: p.member._id,
            name: p.member.userId.fullName,
            avatar: p.member.userId.avatarUrl || '👤',
            email: p.member.userId.email
        }));

    const notAttending = calendar.participants
        .filter(p => p.participateStatus === 'absent')
        .map(p => ({
            id: p.member._id,
            name: p.member.userId.fullName,
            avatar: p.member.userId.avatarUrl || '👤',
            email: p.member.userId.email,
            reasonAbsent: p.reasonAbsent || 'Không có lý do'
        }));

    const pending = calendar.participants
        .filter(p => p.participateStatus === 'unconfirmed')
        .map(p => ({
            id: p.member._id,
            name: p.member.userId.fullName,
            avatar: p.member.userId.avatarUrl || '👤',
            email: p.member.userId.email
        }));

    // Handle view reason modal
    const handleViewReason = (person) => {
        setSelectedPerson(person);
        setIsReasonModalOpen(true);
    };

    // Handle view all modal
    const handleViewAll = (type) => {
        setViewAllType(type);
        setSearchQuery("");
        setIsViewAllModalOpen(true);
    };

    // Get filtered list for view all modal
    const getFilteredList = () => {
        let list = [];
        if (viewAllType === 'confirmed') list = attendees;
        else if (viewAllType === 'absent') list = notAttending;
        else if (viewAllType === 'unconfirmed') list = pending;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return list.filter(p => 
                p.name?.toLowerCase().includes(query) || 
                p.email?.toLowerCase().includes(query)
            );
        }
        return list;
    };

    // Get modal title based on type
    const getModalTitle = () => {
        if (viewAllType === 'confirmed') return 'Danh sách người tham gia';
        if (viewAllType === 'absent') return 'Danh sách người không tham gia';
        if (viewAllType === 'unconfirmed') return 'Danh sách người chưa phản hồi';
        return '';
    };

    // Get current user's participation status
    const getCurrentUserParticipateStatus = () => {
        if (!user || !calendar) return null;
        const userIdCandidates = [user?._id, user?.id].filter(Boolean).map(v => v?.toString());
        const userEmail = user?.email?.toLowerCase?.();

        const currentUserParticipant = calendar.participants.find(p => {
            // p.member.userId may be populated object or just an id/string depending on API
            const populatedUser = p.member?.userId;
            const participantUserId = (typeof populatedUser === 'object' && populatedUser !== null)
                ? (populatedUser?._id || populatedUser?.id || populatedUser)?.toString()
                : (populatedUser)?.toString();
            const participantEmail = (typeof populatedUser === 'object' && populatedUser !== null)
                ? populatedUser?.email?.toLowerCase?.()
                : undefined;

            const idMatch = participantUserId && userIdCandidates.includes(participantUserId);
            const emailMatch = participantEmail && userEmail && participantEmail === userEmail;
            return Boolean(idMatch || emailMatch);
        });
        console.log('currentUserParticipant:', currentUserParticipant);
        return currentUserParticipant?.participateStatus || null;
    };

    const currentUserStatus = getCurrentUserParticipateStatus();

    // Handle participate actions
    const handleParticipate = async (status, reason = "") => {
        setIsParticipating(true);
        try {
            const payload = { participateStatus: status };
            if (status === 'absent' && reason) {
                payload.reasonAbsent = reason;
            }

            const response = await calendarService.updateParticipateStatus(eventId, calendarId, payload);

            if (response) {
                const updatedResponse = await calendarService.getCalendarEventDetail(eventId, calendarId);
                setCalendar(updatedResponse.data);
                toast.success('Cập nhật trạng thái tham gia thành công');
            }
        } catch (error) {
            console.error('Error updating participation status:', error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái tham gia');
        } finally {
            setIsParticipating(false);
        }
    };

    // delete calendar functionality reverted

    const handleOpenChangeStatus = (initialStatus = "") => {
        setNewStatus(initialStatus || "");
        setAbsentReason("");
        setIsQuickAbsent(initialStatus === "absent");
        setIsChangeStatusModalOpen(true);
    };

    const handleConfirmChangeStatus = async () => {
        if (!newStatus) {
            alert("Vui lòng chọn trạng thái mới");
            return;
        }

        if (newStatus === 'absent' && !absentReason.trim()) {
            alert("Vui lòng nhập lý do nghỉ họp");
            return;
        }

        setIsConfirmingStatus(true);
        try {
            await handleParticipate(newStatus, absentReason);
            setIsChangeStatusModalOpen(false);
            setNewStatus("");
            setAbsentReason("");
        } finally {
            setIsConfirmingStatus(false);
        }
    };

    const handleDeleteCalendar = () => {
        setShowDeleteModal(true);
    };

    const confirmDeleteCalendar = async () => {
        setIsDeletingCalendar(true);
        try {
            await calendarService.deleteCalendarEvent(eventId, calendarId);
            toast.success('Đã xóa cuộc họp thành công');
            navigate(`/events/${eventId}/my-calendar`);
        } catch (error) {
            console.error('Error deleting calendar:', error);
            toast.error(error.response?.data?.message || 'Không thể xóa cuộc họp');
        } finally {
            setIsDeletingCalendar(false);
            setShowDeleteModal(false);
        }
    };

    return (
        <UserLayout title="Cuộc họp của bạn" eventId={eventId} sidebarType={eventRole} activePage="calendar">
            <ToastContainer position="top-right" autoClose={3000} />
            <div style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
                    {/* Header */}
                    <div style={{ backgroundColor: 'white', padding: '16px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#dc2626', fontSize: '16px', fontWeight: 600 }}>Chi tiết cuộc họp</h3>

                        {!isPastMeeting && user?.id === calendar?.createdBy?.userId?._id && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Link
                                    to={`/events/${eventId}/my-calendar/${calendarId}/edit-event-calendar`}
                                    style={{ textDecoration: 'none' }}>
                                    <button style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                            <Edit size={18} color="#ffff" />
                                            <h4 style={{ margin: -1, fontSize: '14px', fontWeight: 600, color: '#ffff' }}>Chỉnh sửa</h4>

                                        </div>
                                    </button>
                                </Link>
                                <button 
                                    onClick={handleDeleteCalendar}
                                    style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                        <Trash size={18} color="#ffff" />
                                        <h4 style={{ margin: -1, fontSize: '14px', fontWeight: 600, color: '#ffff' }}>Xóa</h4>
                                    </div>
                                </button>
                            </div>)}
                    </div>

                    {/* Main Content */}
                    <div style={{ padding: '24px' }}>
                        {/* Meeting Title */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#1f2937' }}>{calendar.name}</h1>
                                
                                {/* Badge hiển thị cuộc họp đã qua */}
                                {isPastMeeting && (
                                    <span style={{ backgroundColor: '#e5e7eb', color: '#4b5563', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}>
                                        🕐 Cuộc họp đã kết thúc
                                    </span>
                                )}
                                
                                {/* Badge trạng thái tham gia của user */}
                                {!isPastMeeting && (
                                    <>
                                        {currentUserStatus === 'confirmed' ? (
                                            <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}>
                                                ✓ Đã xác nhận tham gia
                                            </span>
                                        ) : currentUserStatus === 'absent' ? (
                                            <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}>
                                                ✖ Đã từ chối
                                            </span>
                                        ) : (
                                            <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}>
                                                ⏳ Chưa phản hồi
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Meeting Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <MapPin size={18} color="#ffff" fill="#2563eb" />
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>Địa điểm</h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                                    {calendar.locationType === 'online' ? (
                                        <a href={calendar.location} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                                            Link họp online
                                        </a>
                                    ) : calendar.location}
                                </p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
                                    {calendar.locationType === 'online' ? 'Online' : 'Offline'}
                                </p>
                            </div>

                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <div style={{
                                        backgroundColor: "#047857",
                                        borderRadius: "50%",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        <Clock size={16} color="#fff" />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>Thời gian</h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>{formatDate(calendar.startAt)}</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                    {formatTime(calendar.startAt)} - {formatTime(calendar.endAt)}
                                </p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                                    {calculateDuration(calendar.startAt, calendar.endAt)}
                                </p>
                            </div>

                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <Users size={18} color="#9d174d" />
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>Đối tượng tham gia</h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>Tất cả thành viên</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>{calendar.participants.length} người</p>
                            </div>
                        </div>

                        {/* Attendance Sections */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <div style={{
                                        backgroundColor: "#10b981",
                                        borderRadius: "50%",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        <CheckCircle2Icon size={16} color="#fff" />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>Tham gia ({attendees.length})</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {attendees.slice(0, 3).map(person => (
                                        <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', overflow: 'hidden' }}>
                                                {person.avatar.startsWith('http') ? (
                                                    <img src={person.avatar} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span>{person.avatar}</span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '14px', color: '#1f2937' }}>{person.name}</span>
                                        </div>
                                    ))}
                                    {attendees.length > 3 && (
                                        <button
                                            onClick={() => handleViewAll('confirmed')}
                                            style={{
                                                fontSize: '13px',
                                                color: '#2563eb',
                                                textDecoration: 'none',
                                                marginTop: '4px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                padding: 0
                                            }}
                                        >
                                            + Xem tất cả ({attendees.length})
                                        </button>
                                    )}
                                    {attendees.length === 0 && (
                                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Chưa có người tham gia</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <div style={{
                                        backgroundColor: "#dc2626",
                                        borderRadius: "50%",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        <XCircle size={16} color="#fff" />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>Không tham gia ({notAttending.length})</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {notAttending.slice(0, 3).map(person => (
                                        <div key={person.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', overflow: 'hidden' }}>
                                                    {person.avatar.startsWith('http') ? (
                                                        <img src={person.avatar} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span>{person.avatar}</span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '14px', color: '#1f2937' }}>{person.name}</span>
                                            </div>
                                            <button
                                                onClick={() => handleViewReason(person)}
                                                style={{
                                                    fontSize: '12px',
                                                    color: '#6b7280',
                                                    textDecoration: 'underline',
                                                    cursor: 'pointer',
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0
                                                }}
                                            >
                                                Xem lý do
                                            </button>
                                        </div>
                                    ))}
                                    {notAttending.length > 3 && (
                                        <button
                                            onClick={() => handleViewAll('absent')}
                                            style={{
                                                fontSize: '13px',
                                                color: '#2563eb',
                                                textDecoration: 'none',
                                                marginTop: '4px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                padding: 0
                                            }}
                                        >
                                            + Xem tất cả ({notAttending.length})
                                        </button>
                                    )}
                                    {notAttending.length === 0 && (
                                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Không có người từ chối</p>
                                    )}
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <div style={{
                                        backgroundColor: "#f59e0b",
                                        borderRadius: "50%",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        <Clock size={16} color="#fff" />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>Chưa phản hồi ({pending.length})</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {pending.slice(0, 3).map(person => (
                                        <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', overflow: 'hidden' }}>
                                                {person.avatar.startsWith('http') ? (
                                                    <img src={person.avatar} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span>{person.avatar}</span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '14px', color: '#1f2937' }}>{person.name}</span>
                                        </div>
                                    ))}
                                    {pending.length > 3 && (
                                        <button
                                            onClick={() => handleViewAll('unconfirmed')}
                                            style={{
                                                fontSize: '13px',
                                                color: '#2563eb',
                                                textDecoration: 'none',
                                                marginTop: '4px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                padding: 0
                                            }}
                                        >
                                            + Xem tất cả ({pending.length})
                                        </button>
                                    )}
                                    {pending.length === 0 && (
                                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Tất cả đã phản hồi</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Notes and Documents */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <FileText size={16} color="#ffff" fill="#2563eb" />
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>Ghi chú cuộc họp</h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                                    {calendar.description || 'Chưa có ghi chú cho cuộc họp này.'}
                                </p>
                            </div>

                            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <Paperclip size={16} color="#5b45afff " />
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>Tài liệu cuộc họp</h4>
                                </div>
                                {calendar.attachments.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {calendar.attachments.map((att, index) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                                                    <a
                                                        href={att}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            fontSize: '14px',
                                                            color: '#2563eb',
                                                            textDecoration: 'none',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        Tài liệu {index + 1}
                                                    </a>
                                                </div>
                                                <a
                                                    href={att}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        color: '#2563eb',
                                                        cursor: 'pointer',
                                                        fontSize: '20px',
                                                        textDecoration: 'none',
                                                        marginLeft: '8px'
                                                    }}
                                                >
                                                    🔗
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>Chưa có tài liệu đính kèm</p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {!isPastMeeting && (
                            <>
                                {currentUserStatus === 'confirmed' ? (
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingTop: '20px', alignItems: 'center' }}>
                                        <div style={{
                                            backgroundColor: '#d1fae5',
                                            color: '#065f46',
                                            border: '2px solid #10b981',
                                            padding: '12px 32px',
                                            borderRadius: '8px',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span>✓</span> Bạn đã xác nhận tham gia cuộc họp này
                                        </div>
                                        <button
                                            onClick={() => handleOpenChangeStatus()}
                                            style={{
                                                backgroundColor: '#6b7280',
                                                color: 'white',
                                                border: 'none',
                                                padding: '12px 24px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 600
                                            }}
                                        >
                                            Thay đổi
                                        </button>
                                    </div>
                                ) : currentUserStatus === 'absent' ? (
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingTop: '20px', alignItems: 'center' }}>
                                        <div style={{
                                            backgroundColor: '#fee2e2',
                                            color: '#991b1b',
                                            border: '2px solid #dc2626',
                                            padding: '12px 32px',
                                            borderRadius: '8px',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span>✖</span> Bạn đã từ chối tham gia
                                        </div>
                                        <button
                                            onClick={() => handleOpenChangeStatus()}
                                            style={{
                                                backgroundColor: '#6b7280',
                                                color: 'white',
                                                border: 'none',
                                                padding: '12px 24px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 600
                                            }}
                                        >
                                            Thay đổi
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingTop: '20px' }}>
                                        <button
                                            onClick={() => handleParticipate('confirmed')}
                                            disabled={isParticipating}
                                            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '8px', cursor: isParticipating ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '200px', justifyContent: 'center', opacity: isParticipating ? 0.6 : 1 }}
                                        >
                                            {isParticipating ? (
                                                <><i className="bi bi-arrow-clockwise spin-animation"></i> Đang xử lý...</>
                                            ) : (
                                                <><span>✓</span> Tham gia</>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleOpenChangeStatus('absent')}
                                            disabled={isParticipating}
                                            style={{ backgroundColor: '#c3c4c4ff', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '8px', cursor: isParticipating ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '200px', justifyContent: 'center', opacity: isParticipating ? 0.6 : 1 }}
                                        >
                                            <span>✖</span> Không tham gia
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal xem tất cả người tham gia */}
            {isViewAllModalOpen && (
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
                        setIsViewAllModalOpen(false);
                        setSearchQuery("");
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            maxWidth: '700px',
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
                                        {getModalTitle()}
                                    </h2>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                        Tổng số: {getFilteredList().length} người
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsViewAllModalOpen(false);
                                        setSearchQuery("");
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

                            {/* Search bar */}
                            <div style={{ position: 'relative' }}>
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
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {getFilteredList().map(person => (
                                    <div
                                        key={person.id}
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
                                                {person.avatar && person.avatar.startsWith('http') ? (
                                                    <img
                                                        src={person.avatar}
                                                        alt={person.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: '18px' }}>👤</span>
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                                                    {person.name}
                                                </p>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                                                    {person.email}
                                                </p>
                                            </div>
                                        </div>

                                        {viewAllType === 'absent' && (
                                            <button
                                                onClick={() => handleViewReason(person)}
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
                                                Xem lý do
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {getFilteredList().length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                        <Users size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
                                        <p style={{ margin: 0, fontSize: '15px' }}>Không tìm thấy người nào</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal xem lý do nghỉ của người khác */}
            {isReasonModalOpen && selectedPerson && (
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
                    onClick={() => setIsReasonModalOpen(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            maxWidth: '600px',
                            width: '100%',
                            padding: '24px',
                            position: 'relative',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
                                    Xem lý do nghỉ họp
                                </h2>
                                <button
                                    onClick={() => setIsReasonModalOpen(false)}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#6b7280',
                                        transition: 'color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#1f2937'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                                Người ấy là ai và nguyên cớ gì lại nghỉ?
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                backgroundColor: '#e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {selectedPerson.avatar && selectedPerson.avatar.startsWith('http') ? (
                                    <img
                                        src={selectedPerson.avatar}
                                        alt={selectedPerson.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '20px' }}>👤</span>
                                )}
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                                    {selectedPerson.name}
                                </p>
                                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                                    {selectedPerson.email}
                                </p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#1f2937',
                                marginBottom: '8px'
                            }}>
                                Lí do xin nghỉ họp
                            </label>
                            <div style={{
                                padding: '12px 16px',
                                backgroundColor: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                minHeight: '120px',
                                fontSize: '14px',
                                color: '#4b5563',
                                lineHeight: '1.6'
                            }}>
                                {selectedPerson.reasonAbsent || 'Không có lý do'}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setIsReasonModalOpen(false)}
                                style={{
                                    backgroundColor: 'white',
                                    color: '#1f2937',
                                    border: '1px solid #d1d5db',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                    e.currentTarget.style.borderColor = '#9ca3af';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white';
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal thay đổi trạng thái */}
            {isChangeStatusModalOpen && (
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
                        setIsChangeStatusModalOpen(false);
                        setNewStatus("");
                        setAbsentReason("");
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            maxWidth: '600px',
                            width: '100%',
                            padding: '24px',
                            position: 'relative',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
                                    Thay đổi trạng thái tham gia
                                </h2>
                                <button
                                    onClick={() => {
                                        setIsChangeStatusModalOpen(false);
                                        setNewStatus("");
                                        setAbsentReason("");
                                    }}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#6b7280',
                                        transition: 'color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#1f2937'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                                Chọn trạng thái mới của bạn cho cuộc họp này
                            </p>
                        </div>

                        {!isQuickAbsent && (
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#1f2937',
                                    marginBottom: '12px'
                                }}>
                                    Chọn trạng thái <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Tham gia */}
                                    {currentUserStatus !== 'confirmed' && (
                                        <div
                                            onClick={() => setNewStatus('confirmed')}
                                            style={{
                                                padding: '16px',
                                                border: newStatus === 'confirmed' ? '2px solid #10b981' : '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: newStatus === 'confirmed' ? '#d1fae5' : 'white',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                border: newStatus === 'confirmed' ? '2px solid #10b981' : '2px solid #d1d5db',
                                                backgroundColor: newStatus === 'confirmed' ? '#10b981' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                color: 'white'
                                            }}>
                                                {newStatus === 'confirmed' && '✓'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                                                    Tham gia cuộc họp
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                    Xác nhận rằng bạn sẽ tham gia cuộc họp này
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Không tham gia */}
                                    {currentUserStatus !== 'absent' && (
                                        <div
                                            onClick={() => setNewStatus('absent')}
                                            style={{
                                                padding: '16px',
                                                border: newStatus === 'absent' ? '2px solid #dc2626' : '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: newStatus === 'absent' ? '#fee2e2' : 'white',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                border: newStatus === 'absent' ? '2px solid #dc2626' : '2px solid #d1d5db',
                                                backgroundColor: newStatus === 'absent' ? '#dc2626' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                color: 'white'
                                            }}>
                                                {newStatus === 'absent' && '✓'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                                                    Không tham gia
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                    Từ chối tham gia cuộc họp này
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Chưa xác định */}
                                    {currentUserStatus !== 'unconfirmed' && (
                                        <div
                                            onClick={() => setNewStatus('unconfirmed')}
                                            style={{
                                                padding: '16px',
                                                border: newStatus === 'unconfirmed' ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: newStatus === 'unconfirmed' ? '#fef3c7' : 'white',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                border: newStatus === 'unconfirmed' ? '2px solid #f59e0b' : '2px solid #d1d5db',
                                                backgroundColor: newStatus === 'unconfirmed' ? '#f59e0b' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                color: 'white'
                                            }}>
                                                {newStatus === 'unconfirmed' && '✓'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                                                    Chưa xác định
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                    Chưa quyết định có tham gia hay không
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lý do nghỉ (chỉ hiện khi chọn absent) */}
                        {newStatus === 'absent' && (
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#1f2937',
                                    marginBottom: '8px'
                                }}>
                                    Lý do xin nghỉ họp <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <textarea
                                    value={absentReason}
                                    onChange={(e) => setAbsentReason(e.target.value)}
                                    placeholder="Vui lòng nhập lý do bạn không thể tham gia cuộc họp..."
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        color: '#1f2937',
                                        minHeight: '120px',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setIsChangeStatusModalOpen(false);
                                    setNewStatus("");
                                    setAbsentReason("");
                                }}
                                style={{
                                    backgroundColor: 'white',
                                    color: '#1f2937',
                                    border: '1px solid #d1d5db',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                    e.currentTarget.style.borderColor = '#9ca3af';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white';
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmChangeStatus}
                                disabled={isConfirmingStatus}
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: isConfirmingStatus ? 'not-allowed' : 'pointer',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: isConfirmingStatus ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!isConfirmingStatus) e.currentTarget.style.backgroundColor = '#1d4ed8';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isConfirmingStatus) e.currentTarget.style.backgroundColor = '#2563eb';
                                }}
                            >
                                {isConfirmingStatus && <i className="bi bi-arrow-clockwise spin-animation"></i>}
                                {isConfirmingStatus ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
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
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            maxWidth: '500px',
                            width: '100%',
                            padding: '24px',
                            position: 'relative',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
                            Xác nhận xóa cuộc họp
                        </h2>
                        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280' }}>
                            Bạn có chắc chắn muốn xóa cuộc họp "{calendar?.name}"? Hành động này không thể hoàn tác.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeletingCalendar}
                                style={{
                                    backgroundColor: 'white',
                                    color: '#1f2937',
                                    border: '1px solid #d1d5db',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: isDeletingCalendar ? 'not-allowed' : 'pointer',
                                    fontSize: '15px',
                                    fontWeight: 600
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmDeleteCalendar}
                                disabled={isDeletingCalendar}
                                style={{
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    cursor: isDeletingCalendar ? 'not-allowed' : 'pointer',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    opacity: isDeletingCalendar ? 0.6 : 1
                                }}
                            >
                                {isDeletingCalendar ? 'Đang xóa...' : 'Xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </UserLayout>
    );
}