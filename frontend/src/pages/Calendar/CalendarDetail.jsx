import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";
import calendarService from "~/services/calendarService";
import { CheckCircle2Icon, Clock, FileText, MapPin, Paperclip, Users, X, XCircle } from "lucide-react";

export default function CalendarDetail() {
    const navigate = useNavigate();
    const { eventId, calendarId } = useParams();
    const { fetchEventRole } = useEvents();
    const [eventRole, setEventRole] = useState("");
    const [calendar, setCalendar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);

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

    if (loading) {
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

    if (error) {
        return (
            <UserLayout sidebarType={eventRole}>
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

    const documents = calendar.attachments?.map((att, index) => ({
        id: index,
        name: att.name || att.fileName,
        icon: att.type?.includes('pdf') ? '📄' : '📊',
        url: att.url
    })) || [];

    // Handle view reason modal
    const handleViewReason = (person) => {
        setSelectedPerson(person);
        setIsReasonModalOpen(true);
    };

    // Handle participate actions
    const handleParticipate = async (status) => {
        try {
            const response = await calendarService.updateParticipateStatus(eventId, calendarId, { status });

            if (response) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Error updating participation status:', error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái tham gia');
        }
    };

    return (
        <UserLayout sidebarType={eventRole}>
            <div style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
                    {/* Header */}
                    <div style={{ backgroundColor: 'white', padding: '16px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#dc2626', fontSize: '16px', fontWeight: 600 }}>Chi tiết cuộc họp</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>✏️</span> Chỉnh sửa
                            </button>
                            <button style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🗑️</span> Xóa
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div style={{ padding: '24px' }}>
                        {/* Meeting Title */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#1f2937' }}>{calendar.name}</h1>
                                <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 500 }}> Chưa phản hồi</span>
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
                                        <a href="#" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', marginTop: '4px' }}>+ Xem tất cả</a>
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
                                        <a href="#" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', marginTop: '4px' }}>+ Xem tất cả</a>
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
                                        <a href="#" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', marginTop: '4px' }}>+ Xem tất cả</a>
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
                                {documents.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {documents.map(doc => (
                                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '20px' }}>{doc.icon}</span>
                                                    <span style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>{doc.name}</span>
                                                </div>
                                                <a href={doc.url} download style={{ backgroundColor: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '20px', textDecoration: 'none' }}>⬇️</a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>Chưa có tài liệu đính kèm</p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingTop: '20px' }}>
                            <button
                                onClick={() => handleParticipate('confirmed')}
                                style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '200px', justifyContent: 'center' }}
                            >
                                <span>✅</span> Tham gia
                            </button>
                            <button
                                onClick={() => handleParticipate('absent')}
                                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '200px', justifyContent: 'center' }}
                            >
                                <span>✖️</span> Không tham gia
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal - Embedded directly in this component */}
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
        </UserLayout>
    );
}