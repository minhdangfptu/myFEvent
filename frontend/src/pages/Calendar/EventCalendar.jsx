import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { calendarApi } from "../../apis/calendarApi";

export default function EventCalendar() {
  const { eventId } = useParams();
  const [calendars, setCalendars] = useState({}); 
  const [loading, setLoading] = useState(true);
  
  // Lấy ngày hiện tại
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  
  const [currentMonth, setCurrentMonth] = useState(todayMonth);
  const [currentYear, setCurrentYear] = useState(todayYear);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Load calendars từ API
  useEffect(() => {
    const loadCalendars = async () => {
      if (!eventId) return;
      
      setLoading(true);
      try {
        const response = await calendarApi.getMyCalendarInEvent(eventId);
        
        // Format dữ liệu: group theo ngày
        const formattedCalendars = groupCalendarsByDate(response.data);
        setEvents(formattedCalendars);
        
      } catch (err) {
        console.error('Error loading calendars:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadCalendars();
  }, [eventId]);

  // Hàm group calendars theo ngày
  const groupCalendarsByDate = (calendars) => {
    const grouped = {};
    
    calendars.forEach(calendar => {
      const startDate = new Date(calendar.startAt);
      
      // Tạo key theo format: "YYYY-MM-DD"
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      // Khởi tạo array nếu chưa có
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      // Format thời gian để hiển thị
      const startHour = String(startDate.getHours()).padStart(2, '0');
      const startMinute = String(startDate.getMinutes()).padStart(2, '0');
      
      const endDate = new Date(calendar.endAt);
      const endHour = String(endDate.getHours()).padStart(2, '0');
      const endMinute = String(endDate.getMinutes()).padStart(2, '0');
      
      // Thêm vào array
      grouped[dateKey].push({
        id: calendar._id,
        title: calendar.name,
        time: `${startHour}:${startMinute}`,
        timeRange: `${startHour}:${startMinute} - ${endHour}:${endMinute}`,
        location: calendar.location,
        type: calendar.type, // 'event' hoặc 'department'
        participants: calendar.participants,
        participantCount: calendar.participants.length,
        // Giữ data gốc để dùng khi click
        startAt: calendar.startAt,
        endAt: calendar.endAt,
        originalData: calendar
      });
    });
    
    // Sort events trong mỗi ngày theo thời gian
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => 
        new Date(a.startAt) - new Date(b.startAt)
      );
    });
    
    return grouped;
  };

  // Lấy events của 1 ngày cụ thể
  const getEventsForDay = (day, month, year) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events[dateKey] || [];
  };

  // ... các hàm khác giữ nguyên (getDaysInMonth, getFirstDayOfMonth, generateCalendarDays)
  
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const daysInPrevMonth = getDaysInMonth(currentMonth - 1, currentYear);

    const days = [];

    // Ngày tháng trước
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
      });
    }

    // Ngày tháng hiện tại
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        month: currentMonth,
        year: currentYear,
      });
    }

    // Ngày tháng sau
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

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  if (loading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div style={{ padding: "20px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#333" }}>
            Lịch sự kiện
          </h2>
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#999" }}
          >
            ‹
          </button>
          <span style={{ fontSize: "14px", color: "#666", minWidth: "60px", textAlign: "center" }}>
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
            style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#999" }}
          >
            ›
          </button>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={{ width: "32px", height: "32px", borderRadius: "6px", border: "none", backgroundColor: "#4285f4", color: "white", cursor: "pointer", fontSize: "16px" }}>
            ✎
          </button>
          <button style={{ width: "32px", height: "32px", borderRadius: "6px", border: "none", backgroundColor: "#ea4335", color: "white", cursor: "pointer", fontSize: "16px" }}>
            🗑
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ backgroundColor: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {/* Week days */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e0e0e0" }}>
          {weekDays.map((day) => (
            <div key={day} style={{ padding: "12px", textAlign: "center", fontSize: "11px", fontWeight: "600", color: "#999", backgroundColor: "#fafafa" }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "120px" }}>
          {days.map((dayObj, index) => {
            // Lấy events cho ngày này
            const dayEvents = getEventsForDay(dayObj.day, dayObj.month, dayObj.year);
            

            const isToday = dayObj.isCurrentMonth && 
                           dayObj.day === todayDay && 
                           dayObj.month === todayMonth && 
                           dayObj.year === todayYear;

            return (
              <div
                key={index}
                style={{
                  borderRight: index % 7 !== 6 ? "1px solid #e0e0e0" : "none",
                  borderBottom: index < 28 ? "1px solid #e0e0e0" : "none",
                  padding: "8px",
                  backgroundColor: isToday ? "#d2e3fc" : (dayObj.isCurrentMonth ? "white" : "#fafafa"),
                  position: "relative",
                  overflow: "hidden",
                  outline: isToday ? "3px solid #1a73e8" : "none",
                  outlineOffset: "-3px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: isToday ? "700" : (dayObj.isCurrentMonth ? "500" : "normal"),
                    marginBottom: "6px",
                    backgroundColor: isToday ? "#1a73e8" : "transparent",
                    color: isToday ? "white" : (dayObj.isCurrentMonth ? "#333" : "#ccc"),
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {dayObj.day}
                </div>

                {/* Events */}
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      style={{
                        fontSize: "10px",
                        padding: "2px 4px",
                        borderRadius: "2px",
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: event.type === "event" ? "#1a73e8" : "#ea4335",
                        backgroundColor: "transparent",
                      }}
                    >
                      <span style={{ fontWeight: "500" }}>{event.title}</span>
                      {event.time && <span style={{ marginLeft: "3px" }}>- {event.time}</span>}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: "9px", color: "#999", marginTop: "2px" }}>
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
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
              borderRadius: "8px",
              padding: "24px",
              minWidth: "320px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#1a73e8" }}>
              {selectedEvent.title}
            </h3>
            <div style={{ marginBottom: "12px", fontSize: "14px", color: "#666" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span>📍</span>
                <span>{selectedEvent.location}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span>⏰</span>
                <span>{selectedEvent.timeRange}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👥</span>
                <span>{selectedEvent.participantCount} người tham gia</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              style={{
                marginTop: "20px",
                width: "100%",
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
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}