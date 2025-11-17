import { useEffect, useMemo, useState } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import UserLayout from "../../components/UserLayout"
import { eventApi } from "../../apis/eventApi"
import { taskApi } from "../../apis/taskApi"
import { milestoneService } from "../../services/milestoneService"
import Loading from "../../components/Loading"
import { formatDate } from "../../utils/formatDate"
import { getEventIdFromUrl } from "../../utils/getEventIdFromUrl"
import { useEvents } from "../../contexts/EventContext"
import { useAuth } from "../../contexts/AuthContext"

// Helper function to generate calendar days
function generateCalendarDays() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  
  const days = []
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      today: i === today.getDate(),
      highlight: false
    })
  }
  
  return days
}

const unwrapApiData = (payload) => {
  let current = payload
  while (
    current &&
    typeof current === "object" &&
    !Array.isArray(current) &&
    (current.data !== undefined || current.result !== undefined || current.payload !== undefined)
  ) {
    current = current.data ?? current.result ?? current.payload
  }
  return current
}

const parseDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date
  return null
}

const normalizeStatus = (status) => String(status ?? "").trim().toLowerCase()

const isCompletedStatus = (status) => {
  const normalized = normalizeStatus(status)
  return (
    normalized === "completed" ||
    normalized === "done" ||
    normalized === "đã hoàn thành" ||
    normalized === "hoàn thành" ||
    normalized === "da hoan thanh"
  )
}

const isOverdue = (task) => {
  if (!task.dueDate && !task.deadline) return false
  const dueDate = parseDate(task.dueDate || task.deadline)
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today && !isCompletedStatus(task.status)
}

// Map task status from API to Vietnamese text (consistent with EventTaskPage)
const getTaskStatusText = (status, isOverdueTask = false) => {
  if (isOverdueTask) return "Quá hạn"
  
  const normalized = normalizeStatus(status)
  
  if (normalized === "done" || normalized === "completed" || normalized === "hoàn thành" || normalized === "đã hoàn thành") {
    return "Hoàn thành"
  }
  if (normalized === "blocked" || normalized === "tạm hoãn" || normalized === "tam hoan") {
    return "Tạm hoãn"
  }
  if (normalized === "todo" || normalized === "chưa bắt đầu" || normalized === "chua bat dau") {
    return "Chưa bắt đầu"
  }
  if (normalized === "cancelled" || normalized === "đã hủy" || normalized === "da huy") {
    return "Đã hủy"
  }
  // Default: in-progress, ongoing, đang làm, etc.
  return "Đang làm"
}

export default function MemberDashBoard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { eventId: paramEventId } = useParams()
  const { fetchEventRole } = useEvents()
  const { user } = useAuth()
  
  // State
  const [loading, setLoading] = useState(true)
  const [eventData, setEventData] = useState(null)
  const [tasks, setTasks] = useState([])
  const [milestones, setMilestones] = useState([])
  const [eventRole, setEventRole] = useState("")
  const [hoveredDay, setHoveredDay] = useState(null)
  
  // Get event ID from URL or EventContext
  const urlEventId = paramEventId || getEventIdFromUrl(location.pathname, location.search)
  const eventId = urlEventId

  // Load event role for sidebar
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
  }, [eventId, fetchEventRole])

  // Fetch all data
  useEffect(() => {
    if (!eventId || !user) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch event data, tasks, milestones, and members
        const [eventResponse, tasksResponse, milestonesResponse, membersResponse] = await Promise.all([
          eventApi.getById(eventId),
          taskApi.getTaskByEvent(eventId),
          milestoneService.listMilestones(eventId, {
            sortBy: "targetDate",
            sortDir: "asc"
          }),
          eventApi.getMembersByEvent(eventId)
        ])

        if (cancelled) return

        const eventPayload = unwrapApiData(eventResponse)
        if (!cancelled) setEventData(eventPayload?.event ?? eventPayload ?? null)

        // Get current user's EventMember ID
        const userId = user._id || user.id
        const membersData = unwrapApiData(membersResponse)
        const membersArray = Array.isArray(membersData) ? membersData : (membersData?.data || membersData?.members || [])
        
        // Find EventMember for current user
        const currentUserMember = membersArray.find(member => {
          const memberUserId = member?.userId?._id || member?.userId || member?.userId?.id
          return memberUserId && String(memberUserId) === String(userId)
        })
        const currentUserMemberId = currentUserMember?._id || currentUserMember?.id

        // Filter tasks assigned to current user
        const tasksData = unwrapApiData(tasksResponse)
        const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData?.data || tasksData?.tasks || [])
        
        const userTasks = tasksArray.filter(task => {
          // Case 1: assigneeId is EventMember ID (string/ObjectId) - compare directly
          const assigneeId = task.assigneeId?._id || task.assigneeId
          const assigneeIdMatch = currentUserMemberId && assigneeId && String(assigneeId) === String(currentUserMemberId)
          
          // Case 2: assigneeId is populated EventMember object - check userId inside
          const assigneeUserId = task.assigneeId?.userId?._id || task.assigneeId?.userId || task.assigneeId?.userId?.id
          const assigneeUserIdMatch = assigneeUserId && String(assigneeUserId) === String(userId)
          
          // Case 3: Legacy - assigneeId might be userId directly (shouldn't happen but handle it)
          const directUserIdMatch = assigneeId && String(assigneeId) === String(userId)
          
          return assigneeIdMatch || assigneeUserIdMatch || directUserIdMatch
        })
        
        // Debug log (remove in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('MemberDashBoard - User ID:', userId)
          console.log('MemberDashBoard - Current User Member ID:', currentUserMemberId)
          console.log('MemberDashBoard - Total tasks:', tasksArray.length)
          console.log('MemberDashBoard - User tasks:', userTasks.length)
          if (tasksArray.length > 0) {
            console.log('MemberDashBoard - Sample task:', {
              id: tasksArray[0]?._id,
              name: tasksArray[0]?.name || tasksArray[0]?.title,
              assigneeId: tasksArray[0]?.assigneeId,
              assigneeIdType: typeof tasksArray[0]?.assigneeId,
              assigneeUserId: tasksArray[0]?.assigneeId?.userId?._id
            })
          }
        }
        
        if (!cancelled) setTasks(userTasks)

        const milestoneList = Array.isArray(milestonesResponse) 
          ? milestonesResponse 
          : (milestonesResponse?.data || milestonesResponse?.milestones || [])
        const sortedMilestones = milestoneList
          .slice()
          .sort((a, b) => {
            const da = parseDate(a?.targetDate) || new Date(8640000000000000)
            const db = parseDate(b?.targetDate) || new Date(8640000000000000)
            return da.getTime() - db.getTime()
          })
        if (!cancelled) setMilestones(sortedMilestones)
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching dashboard data:", error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [eventId, user])

  // Calculate stats
  const totalTasks = tasks.length
  const completedTasks = useMemo(
    () => tasks.filter((t) => isCompletedStatus(t?.status)).length,
    [tasks]
  )
  const completedTasksPercent = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0
  const overdueTasks = useMemo(
    () => tasks.filter((t) => isOverdue(t)).length,
    [tasks]
  )

  // Get user tasks for display (sorted by due date, limit to 4)
  const userTasks = useMemo(() => {
    return tasks
      .slice()
      .sort((a, b) => {
        const dateA = parseDate(a.dueDate || a.deadline) || new Date(8640000000000000)
        const dateB = parseDate(b.dueDate || b.deadline) || new Date(8640000000000000)
        return dateA.getTime() - dateB.getTime()
      })
      .slice(0, 4)
      .map((task) => {
        const deadline = task.dueDate || task.deadline
        const deadlineDate = deadline ? parseDate(deadline) : null
        
        let deadlineText = "Chưa có hạn"
        if (deadlineDate) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const deadlineDay = new Date(deadlineDate)
          deadlineDay.setHours(0, 0, 0, 0)
          
          const diffTime = deadlineDay - today
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays === 0) {
            const timeStr = deadlineDate.toLocaleTimeString('vi-VN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
            deadlineText = `Hạn: ${timeStr} hôm nay`
          } else if (diffDays === 1) {
            const timeStr = deadlineDate.toLocaleTimeString('vi-VN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
            deadlineText = `Hạn: ${timeStr} mai`
          } else if (diffDays === -1) {
            deadlineText = `Hạn: Hôm qua`
          } else if (diffDays > 1) {
            const timeStr = deadlineDate.toLocaleTimeString('vi-VN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
            deadlineText = `Hạn: ${timeStr} ${formatDate(deadline)}`
          } else {
            deadlineText = `Hạn: ${formatDate(deadline)}`
          }
        }
        
        return {
          id: task._id || task.id,
          title: task.title || task.name || "Công việc",
          deadline: deadlineText,
          status: task.status || "pending"
        }
      })
  }, [tasks])

  // Prepare timeline data from milestones (max 5)
  const eventTimeline = useMemo(
    () =>
      milestones.slice(0, 5).map((milestone) => ({
        name: milestone?.name || "Cột mốc",
        date: formatDate(milestone?.targetDate || milestone?.dueDate),
        completed: isCompletedStatus(milestone?.status)
      })),
    [milestones]
  )

  // Calendar data (current month)
  const calendarDays = generateCalendarDays()

  // Get events for a specific day
  const getEventsForDay = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    
    return (day) => {
      if (!day) return []
      const targetDate = new Date(year, month, day)
      
      return milestones.filter((milestone) => {
        const milestoneDate = parseDate(milestone?.targetDate || milestone?.dueDate)
        if (!milestoneDate) return false
        
        // Compare only year, month, day (ignore time)
        return (
          milestoneDate.getFullYear() === targetDate.getFullYear() &&
          milestoneDate.getMonth() === targetDate.getMonth() &&
          milestoneDate.getDate() === targetDate.getDate()
        )
      })
    }
  }, [milestones])

  const milestoneCompletionPercent = milestones.length > 0
    ? Math.round((milestones.filter((m) => isCompletedStatus(m?.status)).length / milestones.length) * 100)
    : 0
  const milestoneProgressRatio = milestones.length > 0
    ? Math.min(100, Math.max(0, (milestones.filter((m) => isCompletedStatus(m?.status)).length / milestones.length) * 100))
    : 0

  const sidebarType = eventRole === 'Member' ? 'member' : eventRole === 'HoD' ? 'hod' : 'hooc'

  if (loading) {
    return (
      <UserLayout
        title="Dashboard tổng quan"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={eventId}
      >
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255,255,255,1)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Loading size={80} />
        </div>
      </UserLayout>
    )
  }

  if (!eventId) {
    return (
      <UserLayout
        title="Dashboard tổng quan"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={null}
      >
        <div className="alert alert-warning" style={{ margin: "20px" }}>
          <h5>Chưa chọn sự kiện</h5>
          <p>Vui lòng chọn một sự kiện từ danh sách để xem dashboard.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate("/home-page")}
          >
            Quay lại trang chủ
          </button>
        </div>
      </UserLayout>
    )
  }

  if (!eventData) {
    return (
      <UserLayout
        title="Dashboard tổng quan"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={eventId}
      >
        <div className="alert alert-danger" style={{ margin: "20px" }}>
          Không tìm thấy sự kiện
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout title="Dashboard tổng quan" sidebarType={sidebarType} activePage="overview-dashboard" eventId={eventId}>
      <div className="bg-light" style={{ minHeight: "100vh", padding: "24px" }}>
        <div className="container-fluid px-0" style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div className="mb-4">
            <h1 className="mb-2" style={{ color: "#dc2626", fontSize: "28px", fontWeight: 700 }}>
              {eventData.name} - Dashboard tổng quan
            </h1>
          </div>

          {/* Stats Cards */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-sm-6 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 rounded-4" style={{ transition: "transform 0.2s ease", cursor: "default" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{
                        width: "56px",
                        height: "56px",
                        backgroundColor: "#dbeafe",
                        fontSize: "24px",
                      }}
                    >
                      📋
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "36px", color: "#1f2937", lineHeight: "1" }}>
                    {totalTasks}
                  </div>
                  <div className="text-muted" style={{ fontSize: "14px", fontWeight: "500" }}>
                    Tổng số công việc của bạn
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 rounded-4" style={{ transition: "transform 0.2s ease", cursor: "default" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{
                        width: "56px",
                        height: "56px",
                        backgroundColor: "#d4f4dd",
                        fontSize: "24px",
                      }}
                    >
                      ✓
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "36px", color: "#10b981", lineHeight: "1" }}>
                    {completedTasksPercent}%
                  </div>
                  <div className="text-muted" style={{ fontSize: "14px", fontWeight: "500" }}>
                    Công việc đã hoàn thành
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 rounded-4" style={{ transition: "transform 0.2s ease", cursor: "default" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{
                        width: "56px",
                        height: "56px",
                        backgroundColor: "#fee2e2",
                        fontSize: "24px",
                      }}
                    >
                      ⚠️
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "36px", color: "#ef4444", lineHeight: "1" }}>
                    {overdueTasks}
                  </div>
                  <div className="text-muted" style={{ fontSize: "14px", fontWeight: "500" }}>
                    Công việc quá hạn
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section */}
          <div className="row g-3 mb-4">
            {/* User Tasks */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
                  <h6 className="fw-semibold mb-4" style={{ fontSize: "18px", color: "#1f2937" }}>
                    Công việc của bạn
                  </h6>

                  {userTasks.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                      {userTasks.map((task) => {
                        const taskObj = tasks.find(t => (t._id || t.id) === task.id)
                        const isOverdueTask = taskObj ? isOverdue(taskObj) : false
                        const statusText = getTaskStatusText(task.status, isOverdueTask)
                        
                        // Status color mapping
                        const statusColor = statusText === "Hoàn thành"
                          ? { bg: "#d4f4dd", text: "#166534" }
                          : statusText === "Quá hạn"
                          ? { bg: "#fee2e2", text: "#991b1b" }
                          : statusText === "Tạm hoãn"
                          ? { bg: "#fee2e2", text: "#991b1b" }
                          : statusText === "Đã hủy"
                          ? { bg: "#e5e7eb", text: "#6b7280" }
                          : statusText === "Chưa bắt đầu"
                          ? { bg: "#fef3c7", text: "#92400e" }
                          : { bg: "#fef3c7", text: "#92400e" } // Đang làm
                        
                        return (
                          <div key={task.id} className="d-flex align-items-center justify-content-between p-3 rounded-2" style={{ backgroundColor: "#f9fafb" }}>
                            <div className="d-flex align-items-center flex-grow-1">
                              <div>
                                <div style={{ fontSize: "14px", color: "#374151", fontWeight: "500" }}>
                                  {task.title}
                                </div>
                                <div className="text-muted" style={{ fontSize: "12px" }}>
                                  {task.deadline}
                                </div>
                              </div>
                            </div>
                            <span
                              className="px-3 py-1 rounded-pill"
                              style={{
                                backgroundColor: statusColor.bg,
                                color: statusColor.text,
                                fontSize: "12px",
                                fontWeight: "500"
                              }}
                            >
                              {statusText}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-4">
                      <div style={{ fontSize: "48px", opacity: 0.3 }}>📋</div>
                      <div className="mt-2">Chưa có công việc</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h6 className="fw-semibold mb-0" style={{ fontSize: "16px", color: "#1f2937" }}>
                      Lịch họp sắp tới
                    </h6>
                    <span className="text-muted" style={{ fontSize: "14px" }}>
                      Tháng {new Date().getMonth() + 1}
                    </span>
                  </div>

                  <table className="table table-borderless mb-0" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                          <th
                            key={day}
                            className="text-center text-muted"
                            style={{ fontSize: "11px", fontWeight: 500, padding: "8px 4px" }}
                          >
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, weekIndex) => (
                        <tr key={weekIndex}>
                          {Array.from({ length: 7 }, (_, dayIndex) => {
                            const dayData = calendarDays[weekIndex * 7 + dayIndex]
                            const isHovered = hoveredDay === dayData?.day
                            const dayEvents = dayData?.day ? getEventsForDay(dayData.day) : []
                            
                            // Check if this day has milestones
                            const hasMilestone = dayEvents.length > 0
                            
                            return (
                              <td
                                key={dayIndex}
                                className={`text-center ${
                                  dayData?.today ? "text-white rounded" : dayData?.highlight ? "fw-semibold" : ""
                                }`}
                                style={{
                                  fontSize: "13px",
                                  backgroundColor: dayData?.today
                                    ? "#dc2626"
                                    : hasMilestone && !dayData?.today
                                    ? "#fef3c7"
                                    : isHovered
                                    ? "#fee2e2"
                                    : dayData?.highlight
                                    ? "#fee2e2"
                                    : "transparent",
                                  color: dayData?.today 
                                    ? "white" 
                                    : hasMilestone && !dayData?.today
                                    ? "#92400e"
                                    : isHovered 
                                    ? "#dc2626" 
                                    : dayData?.highlight 
                                    ? "#dc2626" 
                                    : "#374151",
                                  padding: "8px 4px",
                                  cursor: dayData?.day ? "pointer" : "default",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={() => dayData?.day && setHoveredDay(dayData.day)}
                                onMouseLeave={() => setHoveredDay(null)}
                              >
                                {dayData?.day || ""}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {hoveredDay && getEventsForDay(hoveredDay).length > 0 ? (
                    <div className="mt-4 pt-3 border-top">
                      {getEventsForDay(hoveredDay).map((event, index) => {
                        const eventDate = parseDate(event?.targetDate || event?.dueDate)
                        const timeStr = eventDate ? eventDate.toLocaleTimeString('vi-VN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : ''
                        
                        return (
                          <div key={index} className={index > 0 ? "mt-3" : ""}>
                            <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#374151" }}>
                              {event?.name || "Cột mốc"}
                            </div>
                            {timeStr && (
                              <div className="text-muted" style={{ fontSize: "13px" }}>
                                {timeStr}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : hoveredDay ? (
                    <div className="mt-4 pt-3 border-top">
                      <div className="text-muted" style={{ fontSize: "13px" }}>
                        Không có sự kiện
                      </div>
                    </div>
                  ) : milestones.length > 0 && (() => {
                    // Show next upcoming milestone
                    const upcomingMilestone = milestones.find(m => !isCompletedStatus(m?.status))
                    if (!upcomingMilestone) return null
                    const milestoneDate = parseDate(upcomingMilestone?.targetDate || upcomingMilestone?.dueDate)
                    if (!milestoneDate) return null
                    
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const milestoneDay = new Date(milestoneDate)
                    milestoneDay.setHours(0, 0, 0, 0)
                    
                    const diffTime = milestoneDay - today
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    
                    if (diffDays >= 0 && diffDays <= 7) {
                      const timeStr = milestoneDate.toLocaleTimeString('vi-VN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                      const dateStr = diffDays === 0 ? "Hôm nay" : diffDays === 1 ? "Mai" : formatDate(milestoneDate)
                      
                      return (
                        <div className="mt-4 pt-3 border-top">
                          <div className="d-flex align-items-center gap-2">
                            <span style={{ color: "#dc2626", fontSize: "16px" }}>📅</span>
                            <div>
                              <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#374151" }}>
                                {upcomingMilestone?.name || "Cột mốc"}
                              </div>
                              <div className="text-muted" style={{ fontSize: "12px" }}>
                                {timeStr} {dateStr}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Progress Bar */}
          <div className="row g-3">
            <div className="col-12">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="fw-bold mb-1" style={{ fontSize: "18px", color: "#1f2937" }}>
                        {eventData.name}
                      </h6>
                      <div className="text-muted" style={{ fontSize: "14px" }}>
                        {milestones.filter((m) => isCompletedStatus(m?.status)).length}/{milestones.length} hoàn tất
                      </div>
                    </div>
                    <button 
                      className="btn btn-danger btn-sm d-flex align-items-center gap-1" 
                      style={{ fontSize: "13px" }}
                      onClick={() => navigate(`/member-event-detail/${eventId}`)}
                    >
                      Xem chi tiết →
                    </button>
                  </div>

                  {/* Horizontal Timeline */}
                  {eventTimeline.length > 0 && (
                    <div style={{ position: "relative", padding: "20px 0" }}>
                      {/* Timeline Line */}
                      <div
                        style={{
                          position: "absolute",
                          top: "28px",
                          left: "0",
                          right: "0",
                          height: "3px",
                          backgroundColor: "#e5e7eb",
                        }}
                      >
                        {/* Progress Line */}
                        <div
                          style={{
                            position: "absolute",
                            top: "0",
                            left: "0",
                            height: "100%",
                            width: `${milestoneProgressRatio}%`,
                            backgroundColor: "#dc2626",
                            transition: "width 0.5s ease",
                          }}
                        ></div>
                      </div>

                      {/* Timeline Steps */}
                      <div className="d-flex justify-content-between" style={{ position: "relative", zIndex: 1 }}>
                        {eventTimeline.map((step, index) => (
                          <div key={index} className="d-flex flex-column align-items-center" style={{ gap: "8px" }}>
                            {/* Step Dot */}
                            <div
                              className="rounded-circle"
                              style={{
                                width: "16px",
                                height: "16px",
                                backgroundColor: step.completed ? "#dc2626" : "white",
                                border: `3px solid ${step.completed ? "#dc2626" : "#e5e7eb"}`,
                                transition: "all 0.3s ease",
                              }}
                            ></div>
                            {/* Step Label */}
                            <div
                              className="text-center"
                              style={{
                                fontSize: "12px",
                                color: "#374151",
                                fontWeight: 500,
                              }}
                            >
                              {step.name}
                            </div>
                            {/* Step Date */}
                            <div
                              className="text-center"
                              style={{
                                fontSize: "11px",
                                color: "#9ca3af",
                              }}
                            >
                              {step.date}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  )
}

