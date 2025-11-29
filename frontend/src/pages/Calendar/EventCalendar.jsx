import { useEffect, useState, useCallback } from "react";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { ToastContainer, toast } from "react-toastify";
import calendarService from "../../services/calendarService";
import { departmentService } from "../../services/departmentService";
import { milestoneApi } from "../../apis/milestoneApi";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Plus,
  Star,
  Target,
  Calendar as CalendarIcon,
  CalendarDays,
  Building2,
  Check,
  X,
  Clock,
  MapPin,
  Users,
  ClipboardList,
  FileText,
  Loader2,
  RotateCcw,
} from "lucide-react";

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

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const [currentMonth, setCurrentMonth] = useState(todayMonth);
  const [currentYear, setCurrentYear] = useState(todayYear);
  const [selectedCalendar, setSelectedCalendar] = useState(null);

  const fetchCalendars = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      console.log("Fetching calendars for:", {
        eventId,
        month: currentMonth + 1,
        year: currentYear,
      });

      const [calendarResponse, milestoneResponse] = await Promise.all([
        calendarService.getMyCalendarInEvent(
          eventId,
          currentMonth + 1,
          currentYear
        ),
        milestoneApi.listMilestonesByEvent(eventId),
      ]);

      console.log("Calendar Response:", calendarResponse);
      console.log("Milestone Response:", milestoneResponse);

      const grouped = {};
      const calendarArray = calendarResponse.data || [];
      const milestoneArray = milestoneResponse.data || [];

      // ===== Calendar items =====
      calendarArray.forEach((calendar) => {
        const startDate = new Date(calendar.startAt);

        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, "0");
        const day = String(startDate.getDate()).padStart(2, "0");
        const dateKey = `${year}-${month}-${day}`;

        if (!grouped[dateKey]) grouped[dateKey] = [];

        const startHour = String(startDate.getHours()).padStart(2, "0");
        const startMinute = String(startDate.getMinutes()).padStart(2, "0");

        const endDate = new Date(calendar.endAt);
        const endHour = String(endDate.getHours()).padStart(2, "0");
        const endMinute = String(endDate.getMinutes()).padStart(2, "0");

        // Current user participation
        const userIdCandidates = [user?._id, user?.id]
          .filter(Boolean)
          .map((v) => v?.toString());
        const userEmail = user?.email?.toLowerCase?.();
        const currentUserParticipant = calendar.participants?.find((p) => {
          const populatedUser = p.member?.userId;
          const participantUserId =
            typeof populatedUser === "object" && populatedUser !== null
              ? (populatedUser?._id ||
                  populatedUser?.id ||
                  populatedUser
                )?.toString()
              : populatedUser?.toString();
          const participantEmail =
            typeof populatedUser === "object" && populatedUser !== null
              ? populatedUser?.email?.toLowerCase?.()
              : undefined;

          const idMatch =
            participantUserId && userIdCandidates.includes(participantUserId);
          const emailMatch =
            participantEmail && userEmail && participantEmail === userEmail;
          return Boolean(idMatch || emailMatch);
        });

        const userParticipateStatus =
          currentUserParticipant?.participateStatus || null;

        grouped[dateKey].push({
          _id: calendar._id,
          title: calendar.name,
          time: `${startHour}:${startMinute}`,
          timeRange: `${startHour}:${startMinute} - ${endHour}:${endMinute}`,
          location: calendar.location,
          type: calendar.type,
          itemType: "calendar",
          participants: calendar.participants,
          participantCount: calendar.participants.length,
          startAt: calendar.startAt,
          endAt: calendar.endAt,
          userParticipateStatus,
          originalData: calendar,
        });
      });

      // ===== Milestones =====
      milestoneArray.forEach((milestone) => {
        if (!milestone.targetDate) return;

        const targetDate = new Date(milestone.targetDate);
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, "0");
        const day = String(targetDate.getDate()).padStart(2, "0");
        const dateKey = `${year}-${month}-${day}`;

        if (!grouped[dateKey]) grouped[dateKey] = [];

        grouped[dateKey].push({
          _id: milestone._id || milestone.id,
          title: milestone.name,
          time: "All day",
          timeRange: "Cột mốc sự kiện",
          location: milestone.description || "Không có mô tả",
          type: "milestone",
          itemType: "milestone",
          participants: [],
          participantCount: 0,
          startAt: milestone.targetDate,
          endAt: milestone.targetDate,
          userParticipateStatus: null,
          originalData: milestone,
        });
      });

      // Sort by start time
      Object.keys(grouped).forEach((dateKey) => {
        grouped[dateKey].sort(
          (a, b) => new Date(a.startAt) - new Date(b.startAt)
        );
      });

      console.log("Grouped calendars:", grouped);
      setCalendars(grouped);
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
      console.error(
        "Error details:",
        error.response?.data || error.message
      );
      toast.error(
        "Không thể tải lịch họp: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, currentMonth, currentYear, user]);

  // Role
  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      if (!eventId) {
        if (mounted) setEventRole("");
        return;
      }
      try {
        const role = await fetchEventRole(eventId);
        if (mounted) setEventRole(role);
      } catch (_) {
        if (mounted) setEventRole("");
      }
    };
    loadRole();
    return () => {
      mounted = false;
    };
  }, [eventId, fetchEventRole]);

  // Calendars
  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  // HoD department
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
          const userIdCandidates = [user.id, user._id]
            .filter(Boolean)
            .map((v) => v.toString());
          const hodDept = deptResponse.find((dept) => {
            const leaderId =
              dept?.leaderId?._id || dept?.leaderId?.id || dept?.leaderId;
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

  const getCalendarsForDay = (day, month, year) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return calendars[dateKey] || [];
  };

  const getDaysInMonth = (month, year) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const daysInPrevMonth = getDaysInMonth(currentMonth - 1, currentYear);

    const days = [];

    // prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
      });
    }

    // current
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        month: currentMonth,
        year: currentYear,
      });
    }

    // next month (fill 5 rows = 35 cells)
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
  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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
        toast.error(
          "Không tìm thấy ban bạn đang quản lý. Vui lòng kiểm tra lại quyền HoD."
        );
        return;
      }
      navigate(
        `/events/${eventId}/departments/${hodDepartmentId}/calendars/create-department-calendar`
      );
      return;
    }

    toast.error("Bạn không có quyền tạo lịch họp.");
  };

  const handleRefresh = () => {
    fetchCalendars();
  };

  return (
    <UserLayout
      title="Lịch sự kiện"
      sidebarType={eventRole}
      activePage="calendar"
      eventId={eventId}
    >
      <ToastContainer position="top-right" autoClose={3000} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          padding: "20px",
          backgroundColor: "#f8f9fa",
          minHeight: "100vh",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "16px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "600",
                color: "#1a1a1a",
              }}
            >
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
                  cursor: "pointer",
                  color: "#666",
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <span
                style={{
                  fontSize: "14px",
                  color: "#333",
                  minWidth: "80px",
                  textAlign: "center",
                  fontWeight: "500",
                }}
              >
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
                  cursor: "pointer",
                  color: "#666",
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronRight size={18} />
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
            {eventRole !== "Member" && (
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
            )}
          </div>
        </div>

        {/* CALENDAR */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            border: "1px solid #e5e7eb",
            position: "relative",
          }}
        >
          {loading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(255, 255, 255, 0.85)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
                backdropFilter: "blur(2px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <Loader2
                  size={40}
                  style={{
                    color: "#4285f4",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <div
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    fontWeight: "500",
                  }}
                >
                  Đang tải lịch...
                </div>
              </div>
            </div>
          )}

          {/* Week header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            {weekDays.map((day) => (
              <div
                key={day}
                style={{
                  padding: "12px",
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#6b7280",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
            }}
          >
            {days.map((dayObj, index) => {
              const dayCalendars = getCalendarsForDay(
                dayObj.day,
                dayObj.month,
                dayObj.year
              );
              const isToday =
                dayObj.isCurrentMonth &&
                dayObj.day === todayDay &&
                dayObj.month === todayMonth &&
                dayObj.year === todayYear;
              const hasEvents = dayCalendars.length > 0;

              let backgroundColor = dayObj.isCurrentMonth ? "white" : "#fafafa";
              if (isToday) backgroundColor = "#ffeded";

              return (
                <div
                  key={index}
                  style={{
                    borderRight: index % 7 !== 6 ? "1px solid #e5e7eb" : "none",
                    borderBottom: index < 28 ? "1px solid #e5e7eb" : "none",
                    padding: "8px",
                    minHeight: "160px",
                    backgroundColor,
                    position: "relative",
                  }}
                >
                  {/* Day + mini icon */}
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: isToday
                        ? "700"
                        : dayObj.isCurrentMonth
                        ? "500"
                        : "normal",
                      marginBottom: "8px",
                      color: isToday
                        ? "#dc2626"
                        : dayObj.isCurrentMonth
                        ? "#1a1a1a"
                        : "#9ca3af",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        textDecoration: isToday ? "underline" : "none",
                        textUnderlineOffset: isToday ? "3px" : undefined,
                        textDecorationThickness: isToday ? "2px" : undefined,
                      }}
                    >
                      {dayObj.day}
                    </span>
                    {hasEvents &&
                      (() => {
                        const milestones = dayCalendars.filter(
                          (item) => item.itemType === "milestone"
                        );
                        const calendarsOnly = dayCalendars.filter(
                          (item) => item.itemType === "calendar"
                        );
                        const hasBoth =
                          milestones.length > 0 && calendarsOnly.length > 0;

                        if (hasBoth) {
                          return (
                            <Star
                              size={12}
                              style={{ marginLeft: 3 }}
                              color="#f59e0b"
                              fill="#fbbf24"
                            />
                          );
                        }
                        if (milestones.length > 0) {
                          return (
                            <Target
                              size={12}
                              style={{ marginLeft: 3 }}
                              color="#dc2626"
                            />
                          );
                        }
                        if (calendarsOnly.length > 0) {
                          return (
                            <CalendarIcon
                              size={12}
                              style={{ marginLeft: 3 }}
                              color="#2563eb"
                            />
                          );
                        }
                        return null;
                      })()}
                  </div>

                  {/* items in cell */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {dayCalendars.slice(0, 3).map((item) => {
                      const isMilestone = item.itemType === "milestone";

                      let StatusIcon = null;
                      let statusColor = "";
                      if (item.userParticipateStatus === "confirmed") {
                        StatusIcon = Check;
                        statusColor = "#10b981";
                      } else if (item.userParticipateStatus === "absent") {
                        StatusIcon = X;
                        statusColor = "#dc2626";
                      }

                      const chipConfig = isMilestone
                        ? {
                            Icon: Target,
                            label: "Cột mốc",
                            chipBg: "#fee2e2",
                            chipText: "#991b1b",
                            borderColor: "#dc2626",
                            bgColor: "#fef2f2",
                          }
                        : item.type === "event"
                        ? {
                            Icon: CalendarDays,
                            label: "Lịch họp",
                            chipBg: "#dbeafe",
                            chipText: "#1e40af",
                            borderColor: "#3b82f6",
                            bgColor: "#eff6ff",
                          }
                        : {
                            Icon: Building2,
                            label: "Họp ban",
                            chipBg: "#fed7aa",
                            chipText: "#9a3412",
                            borderColor: "#f57c00",
                            bgColor: "#fef3e8",
                          };

                      const ChipIcon = chipConfig.Icon;

                      return (
                        <div
                          key={item._id}
                          onClick={() => handleCalendarClick(item)}
                          style={{
                            fontSize: "11px",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            backgroundColor: chipConfig.bgColor,
                            lineHeight: "1.4",
                            borderLeft: `3px solid ${chipConfig.borderColor}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.85";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "4px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "9px",
                                backgroundColor: chipConfig.chipBg,
                                color: chipConfig.chipText,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "600",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                lineHeight: 1,
                              }}
                            >
                              <ChipIcon size={10} />
                              <span>{chipConfig.label}</span>
                            </span>
                            {!isMilestone && StatusIcon && (
                              <StatusIcon
                                size={11}
                                style={{ color: statusColor }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "500",
                                fontSize: "10.5px",
                                color: chipConfig.chipText,
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.title}
                            </div>
                            {!isMilestone && (
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#6b7280",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "2px",
                                  flexShrink: 0,
                                }}
                              >
                                <Clock size={10} />
                                <span>{item.time}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {dayCalendars.length > 3 && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#9ca3af",
                          marginTop: "2px",
                        }}
                      >
                        +{dayCalendars.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DETAIL MODAL */}
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
              <div
                style={{
                  margin: "0 0 20px 0",
                  borderBottom: "1px solid #e5e7eb",
                  paddingBottom: "12px",
                }}
              >
                {(() => {
                  const isMilestone = selectedCalendar.itemType === "milestone";
                  const chipConfig = isMilestone
                    ? {
                        Icon: Target,
                        label: "Cột mốc",
                        bgColor: "#fee2e2",
                        textColor: "#991b1b",
                      }
                    : selectedCalendar.type === "event"
                    ? {
                        Icon: CalendarDays,
                        label: "Lịch họp",
                        bgColor: "#dbeafe",
                        textColor: "#1e40af",
                      }
                    : {
                        Icon: Building2,
                        label: "Họp ban",
                        bgColor: "#fed7aa",
                        textColor: "#9a3412",
                      };

                  const ChipIcon = chipConfig.Icon;

                  return (
                    <>
                      <div style={{ marginBottom: "10px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            backgroundColor: chipConfig.bgColor,
                            color: chipConfig.textColor,
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <ChipIcon size={14} />
                          {chipConfig.label}
                        </span>
                      </div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "#1a1a1a",
                        }}
                      >
                        {selectedCalendar.title}
                      </h3>
                    </>
                  );
                })()}
              </div>

              <div
                style={{
                  marginBottom: "20px",
                  fontSize: "14px",
                  color: "#4b5563",
                }}
              >
                {selectedCalendar.itemType === "milestone" ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <ClipboardList size={18} />
                      <div>
                        <div
                          style={{
                            fontWeight: "500",
                            color: "#6b7280",
                            fontSize: "12px",
                            marginBottom: "2px",
                          }}
                        >
                          Loại
                        </div>
                        <div>Cột mốc sự kiện</div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <CalendarIcon size={18} />
                      <div>
                        <div
                          style={{
                            fontWeight: "500",
                            color: "#6b7280",
                            fontSize: "12px",
                            marginBottom: "2px",
                          }}
                        >
                          Ngày
                        </div>
                        <div>
                          {new Date(
                            selectedCalendar.startAt
                          ).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      <FileText size={18} />
                      <div>
                        <div
                          style={{
                            fontWeight: "500",
                            color: "#6b7280",
                            fontSize: "12px",
                            marginBottom: "2px",
                          }}
                        >
                          Mô tả
                        </div>
                        <div>{selectedCalendar.location}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <MapPin size={18} />
                      <div>
                        <div
                          style={{
                            fontWeight: "500",
                            color: "#6b7280",
                            fontSize: "12px",
                            marginBottom: "2px",
                          }}
                        >
                          Địa điểm
                        </div>
                        <div>{selectedCalendar.location}</div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <Clock size={18} />
                      <div>
                        <div
                          style={{
                            fontWeight: "500",
                            color: "#6b7280",
                            fontSize: "12px",
                            marginBottom: "2px",
                          }}
                        >
                          Thời gian
                        </div>
                        <div>{selectedCalendar.timeRange}</div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      <Users size={18} />
                      <div>
                        <div
                          style={{
                            fontWeight: "500",
                            color: "#6b7280",
                            fontSize: "12px",
                            marginBottom: "2px",
                          }}
                        >
                          Người tham gia
                        </div>
                        <div>{selectedCalendar.participantCount} người</div>
                      </div>
                    </div>
                  </>
                )}
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
                  onClick={() => {
                    if (selectedCalendar.itemType === "milestone") {
                      navigate(
                        `/events/${eventId}/milestone-detail/${selectedCalendar._id}`
                      );
                    } else {
                      navigate(
                        `/events/${eventId}/my-calendar/${selectedCalendar._id}`
                      );
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor:
                      selectedCalendar.itemType === "milestone"
                        ? "#dc2626"
                        : "#4285f4",
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
