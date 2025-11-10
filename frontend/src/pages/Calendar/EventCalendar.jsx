import { useEffect, useState } from "react";
import { useEvents } from "../../contexts/EventContext";
import { useNavigate, useParams } from "react-router-dom"
import UserLayout from "../../components/UserLayout"
import { ToastContainer } from "react-toastify";
import calendarService from "../../services/calendarService";
export default function EventCalendar() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { fetchEventRole, getEventRole } = useEvents();
  const [eventRole, setEventRole] = useState("");
  const [calendars, setCalendars] = useState([]);

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
  console.log("Event Role:", eventRole);

  const fetchCalendars = async () => {
    try{
      const response = await calendarService.getMyCalendarInEvent(eventId);
      console.log("API Response:", response);
      console.log("Calendars fetched:", response.data);
      setCalendars(response);
    }catch(error){
      console.error("Failed to fetch calendars:", error);
    }
  };

  // Lấy ngày hiện tại
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const [currentMonth, setCurrentMonth] = useState(10); // November = 10
  const [currentYear, setCurrentYear] = useState(2025);
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
    if(eventRole == "HoOC"){
      navigate(`/events/${eventId}/calendars/create-event-calendar`);
    }else if(eventRole == "HoD"){

    }
  }

  return (
    <UserLayout title="Event Calendar Page" sidebarType={eventRole} activePage="work-timeline">
      <ToastContainer position="top-right" autoClose={3000} />
      <div style={{ padding: "20px", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        {/* Header */}
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
            <button  style={{
              width: "36px",
              height: "36px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#4285f4",
              color: "white",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              ⟳
            </button>
            <button onClick={handleCreateCalendar} style={{
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
            }}>
              +
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          border: "1px solid #e5e7eb"
        }}>
          {/* Week days */}
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

          {/* Calendar days */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {days.map((dayObj, index) => {
              const dayCalendars = getCalendarsForDay(dayObj.day, dayObj.month, dayObj.year);

              const isToday = dayObj.isCurrentMonth &&
                dayObj.day === todayDay &&
                dayObj.month === todayMonth &&
                dayObj.year === todayYear;

              return (
                <div
                  key={index}
                  style={{
                    borderRight: index % 7 !== 6 ? "1px solid #e5e7eb" : "none",
                    borderBottom: index < 28 ? "1px solid #e5e7eb" : "none",
                    padding: "8px",
                    minHeight: "200px",
                    backgroundColor: dayObj.isCurrentMonth ? "white" : "#fafafa",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: dayObj.isCurrentMonth ? "500" : "normal",
                      marginBottom: "8px",
                      color: isToday ? "#4285f4" : (dayObj.isCurrentMonth ? "#1a1a1a" : "#9ca3af"),
                      display: "inline-block",
                    }}
                  >
                    {dayObj.day}
                  </div>

                  {/* Events */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {dayCalendars.map((calendar) => (
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
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        <div style={{ fontWeight: "500" }}>{calendar.title} - {calendar.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Detail Modal */}
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