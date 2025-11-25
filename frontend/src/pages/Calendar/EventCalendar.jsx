import { useEffect, useState } from "react";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom"
import UserLayout from "../../components/UserLayout"
import { ToastContainer, toast } from "react-toastify";
import calendarService from "../../services/calendarService";
import { departmentService } from "../../services/departmentService";

export default function EventCalendar() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { fetchEventRole } = useEvents();
  const { user } = useAuth();
  const [eventRole, setEventRole] = useState("");
  const [calendars, setCalendars] = useState({});
  const [loading, setLoading] = useState(true);
  const [hodDepartmentId, setHodDepartmentId] = useState(null);
  const [loadingHoDDepartment, setLoadingHoDDepartment] = useState(false);

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
    fetchCalendars();
    return () => {
      mounted = false
    }
  }, [eventId, fetchEventRole]);

  useEffect(() => {
    const loadHoDDepartment = async () => {
      if (!eventId || eventRole !== "HoD" || !user?.id) {
        setHodDepartmentId(null);
        return;
      }
      setLoadingHoDDepartment(true);
      try {
        const deptResponse = await departmentService.getDepartments(eventId);
        if (Array.isArray(deptResponse)) {
          const userIdCandidates = [user.id, user._id].filter(Boolean).map(v => v.toString());
          const hodDept = deptResponse.find(dept => {
            const leaderId = dept?.leaderId?._id || dept?.leaderId?.id || dept?.leaderId;
            if (!leaderId) return false;
            return userIdCandidates.includes(leaderId.toString());
          });
          setHodDepartmentId(hodDept?._id || hodDept?.id || null);
        } else {
          setHodDepartmentId(null);
        }
      } catch (error) {
        console.error("Failed to load HoD department:", error);
        setHodDepartmentId(null);
      } finally {
        setLoadingHoDDepartment(false);
      }
    };

    loadHoDDepartment();
  }, [eventId, eventRole, user]);

  const fetchCalendars = async () => {
    setLoading(true);
    try {
      const response = await calendarService.getMyCalendarInEvent(eventId);
      console.log("API Response:", response);

      // Group calendars by date
      const grouped = {};
      const calendarArray = response.data || [];

      calendarArray.forEach(calendar => {
        const startDate = new Date(calendar.startAt);

        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }

        // Format time
        const startHour = String(startDate.getHours()).padStart(2, '0');
        const startMinute = String(startDate.getMinutes()).padStart(2, '0');

        const endDate = new Date(calendar.endAt);
        const endHour = String(endDate.getHours()).padStart(2, '0');
        const endMinute = String(endDate.getMinutes()).padStart(2, '0');

        // Get current user's participation status (robust match by id or email)
        const userIdCandidates = [user?._id, user?.id].filter(Boolean).map(v => v?.toString());
        const userEmail = user?.email?.toLowerCase?.();
        const currentUserParticipant = calendar.participants?.find(p => {
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
        const userParticipateStatus = currentUserParticipant?.participateStatus || null;

        grouped[dateKey].push({
          _id: calendar._id,
          title: calendar.name,
          time: `${startHour}:${startMinute}`,
          timeRange: `${startHour}:${startMinute} - ${endHour}:${endMinute}`,
          location: calendar.location,
          type: calendar.type,
          participants: calendar.participants,
          participantCount: calendar.participants.length,
          startAt: calendar.startAt,
          endAt: calendar.endAt,
          userParticipateStatus: userParticipateStatus,
          originalData: calendar
        });
      });

      // Sort events by time within each day
      Object.keys(grouped).forEach(dateKey => {
        grouped[dateKey].sort((a, b) =>
          new Date(a.startAt) - new Date(b.startAt)
        );
      });

      console.log("Grouped calendars:", grouped);
      setCalendars(grouped);
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const [currentMonth, setCurrentMonth] = useState(todayMonth);
  const [currentYear, setCurrentYear] = useState(todayYear);
  const [selectedCalendar, setSelectedCalendar] = useState(null);

  const getCalendarsForDay = (day, month, year) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendars[dateKey] || [];
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const daysInPrevMonth = getDaysInMonth(currentMonth - 1, currentYear);

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        month: currentMonth,
        year: currentYear,
      });
    }

    const remainingDays = 35 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
      });
    }

    return days;
  };

  const days = generateCalendarDays();
  const weekDays = ["MON", "TUE", "WED", "THUR", "FRI", "SAT", "SUN"];

  const handleCalendarClick = (calendar) => {
    setSelectedCalendar(calendar);
  };

  const handleCreateCalendar = () => {
    if (eventRole === "HoOC") {
      navigate(`/events/${eventId}/calendars/create-event-calendar`);
      return;
    }

    if (eventRole === "HoD") {
      if (loadingHoDDepartment) {
        toast.info("Đang tải thông tin ban của bạn, vui lòng chờ...");
        return;
      }
      if (!hodDepartmentId) {
        toast.error("Không tìm thấy ban bạn đang quản lý. Vui lòng kiểm tra lại quyền HoD.");
        return;
      }
      navigate(`/events/${eventId}/departments/${hodDepartmentId}/calendars/create-department-calendar`);
      return;
    }

    toast.error("Bạn không có quyền tạo lịch họp.");
  };

  const handleRefresh = () => {
    fetchCalendars();
  };

  return (
    <UserLayout title="Lịch sự kiện" sidebarType={eventRole} activePage="calendar">
      <ToastContainer position="top-right" autoClose={3000} />
      <div style={{ padding: "20px", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "16px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>
              Lịch sự kiện
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear(currentYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#666",
                  padding: "0 4px"
                }}
              >
                ‹
              </button>
              <span style={{ fontSize: "14px", color: "#333", minWidth: "80px", textAlign: "center", fontWeight: "500" }}>
                {currentMonth + 1}/{currentYear}
              </span>
              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear(currentYear + 1);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#666",
                  padding: "0 4px"
                }}
              >
                ›
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleRefresh}
              disabled={loading}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#4285f4",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.5 : 1
              }}
            >
              ⟳
            </button>
            <button
              onClick={handleCreateCalendar}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#ea4335",
                color: "white",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              +
            </button>
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb"
          }}>
            {weekDays.map((day) => (
              <div key={day} style={{
                padding: "12px",
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: "#6b7280"
              }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {days.map((dayObj, index) => {
              const dayCalendars = getCalendarsForDay(dayObj.day, dayObj.month, dayObj.year);
              const isToday = dayObj.isCurrentMonth && dayObj.day === todayDay && dayObj.month === todayMonth && dayObj.year === todayYear;

              return (
                <div
                  key={index}
                  style={{
                    borderRight: index % 7 !== 6 ? "1px solid #e5e7eb" : "none",
                    borderBottom: index < 28 ? "1px solid #e5e7eb" : "none",
                    padding: "8px",
                    minHeight: "160px",
                    backgroundColor: dayObj.isCurrentMonth ? "white" : "#fafafa",
                    position: "relative",
                  }}
                >
                  <div style={{
                    fontSize: "13px",
                    fontWeight: dayObj.isCurrentMonth ? "500" : "normal",
                    marginBottom: "8px",
                    color: isToday ? "#4285f4" : (dayObj.isCurrentMonth ? "#1a1a1a" : "#9ca3af"),
                    display: "inline-block",
                  }}>
                    {dayObj.day}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {dayCalendars.slice(0, 3).map((calendar) => {
                      const statusIcon = calendar.userParticipateStatus === 'confirmed' ? '✓' : 
                                        calendar.userParticipateStatus === 'absent' ? '✖' : '';
                      const statusColor = calendar.userParticipateStatus === 'confirmed' ? '#10b981' : 
                                        calendar.userParticipateStatus === 'absent' ? '#dc2626' : '';
                      
                      return (
                        <div
                          key={calendar._id}
                          onClick={() => handleCalendarClick(calendar)}
                          style={{
                            fontSize: "11px",
                            padding: "3px 6px",
                            borderRadius: "3px",
                            cursor: "pointer",
                            backgroundColor: calendar.type === "event" ? "#e8f0fe" : "#fef3e8",
                            color: calendar.type === "event" ? "#1967d2" : "#f57c00",
                            lineHeight: "1.4",
                            transition: "all 0.2s",
                            borderLeft: statusColor ? `3px solid ${statusColor}` : 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.8";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          <div style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                            {statusIcon && <span style={{ color: statusColor, fontSize: "12px" }}>{statusIcon}</span>}
                            <span>{calendar.title} - {calendar.time}</span>
                          </div>
                        </div>
                      );
                    })}
                    {dayCalendars.length > 3 && (
                      <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>
                        +{dayCalendars.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedCalendar && (
          <div
            onClick={() => setSelectedCalendar(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "24px",
                minWidth: "360px",
                maxWidth: "480px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              }}
            >
              <h3 style={{
                margin: "0 0 20px 0",
                fontSize: "18px",
                fontWeight: "600",
                color: "#1a1a1a",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: "12px"
              }}>
                {selectedCalendar.title}
              </h3>
              <div style={{ marginBottom: "20px", fontSize: "14px", color: "#4b5563" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "16px" }}>📍</span>
                  <div>
                    <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "12px", marginBottom: "2px" }}>
                      Địa điểm
                    </div>
                    <div>{selectedCalendar.location}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "16px" }}>⏰</span>
                  <div>
                    <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "12px", marginBottom: "2px" }}>
                      Thời gian
                    </div>
                    <div>{selectedCalendar.timeRange}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ fontSize: "16px" }}>👥</span>
                  <div>
                    <div style={{ fontWeight: "500", color: "#6b7280", fontSize: "12px", marginBottom: "2px" }}>
                      Người tham gia
                    </div>
                    <div>{selectedCalendar.participantCount} người</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setSelectedCalendar(null)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Đóng
                </button>
                <button 
                  onClick={() => navigate(`/events/${eventId}/my-calendar/${selectedCalendar._id}`)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor: "#4285f4",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Chi tiết
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}