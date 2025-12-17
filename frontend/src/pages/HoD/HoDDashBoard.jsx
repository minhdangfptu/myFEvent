import { useEffect, useMemo, useState } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import UserLayout from "../../components/UserLayout"
import { eventApi } from "../../apis/eventApi"
import { taskApi } from "../../apis/taskApi"
import { departmentService } from "../../services/departmentService"
import { milestoneService } from "../../services/milestoneService"
import calendarService from "../../services/calendarService"
import Loading from "../../components/Loading"
import DashboardSkeleton from "../../components/DashboardSkeleton"
import { formatDate } from "../../utils/formatDate"
import { getEventIdFromUrl } from "../../utils/getEventIdFromUrl"
import { useEvents } from "../../contexts/EventContext"
import { userApi } from "../../apis/userApi"
import { Calendar, Sparkles, Goal, User, Users, LaptopMinimalCheck, CircleCheckBig, FileExclamationPoint, PinOff, MapPin } from "lucide-react";

// Helper function to generate calendar days (week starts on Monday)
function generateCalendarDays() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  
  // Get day of week for first day of month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayOfWeek = firstDay.getDay()
  // Convert to Monday-based week (0 = Monday, 1 = Tuesday, ..., 6 = Sunday)
  const mondayBasedDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  
  const days = []
  
  // Add empty days at the beginning to align with Monday start
  for (let i = 0; i < mondayBasedDay; i++) {
    days.push(null)
  }
  
  // Add actual days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      today: i === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
      highlight: false
    })
  }
  
  // Add empty days at the end to complete the last week
  const remainingDays = 7 - (days.length % 7)
  if (remainingDays < 7) {
    for (let i = 0; i < remainingDays; i++) {
      days.push(null)
    }
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

const normalizeCalendars = (payload) => {
  const data = unwrapApiData(payload)
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.calendars)) return data.calendars
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data.items)) return data.items
  return []
}

const parseCalendarEventStart = (calendar) => {
  if (!calendar) return null
  const candidate =
    calendar.startAt ||
    (calendar.meetingDate
      ? `${calendar.meetingDate}T${calendar.startTime || "00:00"}`
      : null)
  if (!candidate) return null
  const date = new Date(candidate)
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeStatus = (status) => String(status ?? "").trim().toLowerCase()

const isCompletedStatus = (status) => {
  const normalized = normalizeStatus(status)
  return (
    normalized === "completed" ||
    normalized === "done" ||
    normalized === "đã hoàn thành" ||
    normalized === "hoàn thành" ||
    normalized === "da hoan thanh" ||
    normalized === "hoan_thanh" ||
    normalized === "hoan-thanh"
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
  
  // Check for completed status (including underscore-separated codes from API)
  if (normalized === "done" || normalized === "completed" || normalized === "hoàn thành" || normalized === "đã hoàn thành" || normalized === "hoan_thanh" || normalized === "hoan-thanh") {
    return "Hoàn thành"
  }
  if (normalized === "blocked" || normalized === "tạm hoãn" || normalized === "tam hoan") {
    return "Tạm hoãn"
  }
  if (normalized === "todo" || normalized === "chưa bắt đầu" || normalized === "chua bat dau" || normalized === "chua_bat_dau" || normalized === "chua-bat-dau") {
    return "Chưa bắt đầu"
  }
  if (normalized === "cancelled" || normalized === "đã hủy" || normalized === "da huy" || normalized === "huy") {
    return "Đã hủy"
  }
  // Check for in-progress status (including underscore-separated codes from API)
  if (normalized === "in-progress" || normalized === "in_progress" || normalized === "ongoing" || normalized === "đang làm" || normalized === "dang lam" || normalized === "da_bat_dau" || normalized === "da-bat-dau") {
    return "Đang làm"
  }
  // Default: in-progress, ongoing, đang làm, etc.
  return "Đang làm"
}

export default function HoDDashBoard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { eventId: paramEventId } = useParams()
  const { fetchEventRole, events: ctxEvents } = useEvents()
  
  // State
  const [loading, setLoading] = useState(true)
  const [eventData, setEventData] = useState(null)
  const [department, setDepartment] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [milestones, setMilestones] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [eventRole, setEventRole] = useState("")
  const [departmentId, setDepartmentId] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)
  
  // Get event ID from URL or EventContext
  const urlEventId = paramEventId || getEventIdFromUrl(location.pathname, location.search)
  const eventId = urlEventId || (ctxEvents && ctxEvents.length > 0 ? (ctxEvents[0]._id || ctxEvents[0].id) : null)

  // Load event role and departmentId
  useEffect(() => {
    let mounted = true
    const loadRole = async () => {
      if (!eventId) {
        if (mounted) {
          setEventRole("")
          setDepartmentId(null)
        }
        return
      }
      try {
        const roleResponse = await userApi.getUserRoleByEvent(eventId)
        const role = roleResponse?.role || ""
        
        // Get departmentId from response if HoD
        if (role === "HoD" && roleResponse?.departmentId) {
          const deptId = roleResponse.departmentId?._id || roleResponse.departmentId
          if (mounted && deptId) {
            setDepartmentId(deptId)
          }
        }
        
        if (mounted) setEventRole(role)
      } catch (_) {
        if (mounted) {
          setEventRole("")
          setDepartmentId(null)
        }
      }
    }
    loadRole()
    return () => {
      mounted = false
    }
  }, [eventId])

  // Fetch all data
  useEffect(() => {
    if (!eventId) {
      // If no eventId, stop loading and show message
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch event data
        const eventResponse = await eventApi.getById(eventId)
        const eventPayload = unwrapApiData(eventResponse)
        if (!cancelled) {
          setEventData(eventPayload?.event ?? eventPayload ?? null)
        }

        // If we have departmentId, fetch department-specific data
        if (departmentId) {
          const [deptResponse, membersResponse, tasksResponse, milestonesResponse] = await Promise.all([
            departmentService.getDepartmentDetail(eventId, departmentId),
            departmentService.getMembersByDepartment(eventId, departmentId),
            taskApi.getTaskByEvent(eventId),
            milestoneService.listMilestones(eventId, {
              sortBy: "targetDate",
              sortDir: "asc"
            })
          ])

          if (cancelled) return

          const deptData = unwrapApiData(deptResponse)
          if (!cancelled) setDepartment(deptData || null)

          const membersData = Array.isArray(membersResponse) ? membersResponse : (membersResponse?.data || [])
          if (!cancelled) setMembers(membersData)

          const tasksData = unwrapApiData(tasksResponse)
          const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData?.data || tasksData?.tasks || [])
          // Filter tasks by departmentId
          const deptTasks = tasksArray.filter(task => {
            const taskDeptId = task.departmentId?._id || task.departmentId || task.department?._id || task.department
            return String(taskDeptId) === String(departmentId)
          })
          if (!cancelled) setTasks(deptTasks)

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

          // Show dashboard immediately
          if (!cancelled) setLoading(false)

          // Lazy load calendar events in background (non-critical)
          if (!cancelled) {
            calendarService.getCalendarsByEventId(eventId)
              .then(calendarsResponse => {
                if (!cancelled) {
                  setCalendarEvents(normalizeCalendars(calendarsResponse))
                }
              })
              .catch(err => {
                if (!cancelled) {
                  console.error("Error loading calendar events:", err)
                }
              })
          }
        }
        // If no departmentId yet, the useEffect will run again when departmentId is set
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching dashboard data:", error)
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [eventId, departmentId])

  // Calculate stats
  const totalMembers = members.length
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

  // Major tasks (only epic/parent tasks)
  const majorTasks = useMemo(() => {
    const allTasks = Array.isArray(tasks) ? tasks : []
    const parentIds = new Set(
      allTasks
        .map(t => t.parentTaskId)
        .filter(Boolean)
        .map(id => id.toString())
    )

    const majorOnly = allTasks.filter((t) => {
      const type = String(t.taskType || "").toLowerCase()
      if (type === "epic") return true

      const id = (t._id || t.id || "").toString()
      return id && parentIds.has(id)
    })

    return majorOnly
      .slice(0, 2)
      .map((task) => {
        const progress = task.progressPct || task.progress || 0
        const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)))
        
        const deadline = task.dueDate || task.deadline
        const deadlineDate = deadline ? formatDate(deadline) : "Đang cập nhật"
        
        return {
          id: task._id || task.id,
          title: task.title || task.name || "Công việc",
          progress: normalizedProgress,
          deadline: deadlineDate
        }
      })
  }, [tasks])

  // Detailed tasks (recent or upcoming tasks)
  const detailedTasks = useMemo(() => {
    return tasks
      .filter(t => t.parentTaskId || !isCompletedStatus(t.status))
      .slice(0, 3)
      .map((task) => {
        const deadline = task.dueDate || task.deadline
        const deadlineDate = deadline ? formatDate(deadline) : "Đang cập nhật"
        
        return {
          id: task._id || task.id,
          title: task.title || task.name || "Công việc",
          deadline: deadlineDate,
          status: task.status || "pending"
        }
      })
  }, [tasks])

  // Prepare timeline data from milestones (max 5)
  const eventTimeline = useMemo(
    () =>
      milestones.slice(0, 5).map((milestone) => {
        // FIX: Lấy ngày và kiểm tra xem đã quá khứ chưa
        const targetDate = parseDate(milestone?.targetDate || milestone?.dueDate)
        const isPast = targetDate && targetDate < new Date()

        return {
          name: milestone?.name || "Cột mốc",
          date: formatDate(milestone?.targetDate || milestone?.dueDate),
          // FIX: Hoàn thành nếu status OK HOẶC ngày đã qua
          completed: isCompletedStatus(milestone?.status) || isPast
        }
      }),
    [milestones]
  )

  // Calendar data (current month) - includes both calendar events and milestones
  const calendarDays = useMemo(() => {
    const baseDays = generateCalendarDays()
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const calendarDays = new Set()
    const milestoneDays = new Set()

    // Track days with calendar events
    calendarEvents.forEach((event) => {
      const startDate = parseCalendarEventStart(event)
      if (!startDate) return
      if (startDate.getFullYear() !== year || startDate.getMonth() !== month) return
      calendarDays.add(startDate.getDate())
    })

    // Track days with milestones
    milestones.forEach((milestone) => {
      const targetDate = parseDate(milestone?.targetDate || milestone?.dueDate)
      if (!targetDate) return
      if (targetDate.getFullYear() !== year || targetDate.getMonth() !== month) return
      milestoneDays.add(targetDate.getDate())
    })

    return baseDays.map((day) => {
      if (!day) return null
      return {
        ...day,
        hasCalendar: calendarDays.has(day.day),
        hasMilestone: milestoneDays.has(day.day),
        highlight: calendarDays.has(day.day) || milestoneDays.has(day.day)
      }
    })
  }, [calendarEvents, milestones])

  // Get events for a specific day - includes both calendar events and milestones
  const getEventsForDay = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()

    return (day) => {
      if (!day) return []
      const items = []

      // Add calendar events for this day
      calendarEvents.forEach((event) => {
        const startDate = parseCalendarEventStart(event)
        if (!startDate) return
        if (startDate.getFullYear() === year && startDate.getMonth() === month && startDate.getDate() === day) {
          items.push({
            ...event,
            itemType: 'calendar',
            startDate
          })
        }
      })

      // Add milestones for this day
      milestones.forEach((milestone) => {
        const targetDate = parseDate(milestone?.targetDate || milestone?.dueDate)
        if (!targetDate) return
        if (targetDate.getFullYear() === year && targetDate.getMonth() === month && targetDate.getDate() === day) {
          items.push({
            ...milestone,
            itemType: 'milestone',
            startDate: targetDate
          })
        }
      })

      // Sort by time (milestones first as "all day", then calendar events by time)
      items.sort((a, b) => {
        if (a.itemType === 'milestone' && b.itemType !== 'milestone') return -1
        if (a.itemType !== 'milestone' && b.itemType === 'milestone') return 1
        return a.startDate - b.startDate
      })

      return items
    }
  }, [calendarEvents, milestones])

  const completedMilestoneCount = useMemo(() => {
    return milestones.filter((m) => {
      const targetDate = parseDate(m?.targetDate || m?.dueDate)
      const isPast = targetDate && targetDate < new Date()
      return isCompletedStatus(m?.status) || isPast
    }).length
  }, [milestones])

  const milestoneCompletionPercent = milestones.length > 0
    ? Math.round((completedMilestoneCount / milestones.length) * 100)
    : 0
  const milestoneProgressRatio = milestones.length > 0
    ? Math.min(100, Math.max(0, (completedMilestoneCount / milestones.length) * 100))
    : 0

  const sidebarType = eventRole === 'Member' ? 'member' : eventRole === 'HoD' ? 'hod' : 'hooc'

  if (loading) {
    return (
      <UserLayout
        title="Dashboard ban"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={eventId}
      >
        <DashboardSkeleton />
      </UserLayout>
    )
  }

  if (!eventId) {
    return (
      <UserLayout
        title="Dashboard ban"
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

  // Only show error if loading is done AND we have departmentId but no department
  if (!loading && !eventData) {
    return (
      <UserLayout
        title="Dashboard ban"
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

  // Show error only if we tried to fetch department but failed
  if (!loading && departmentId && !department) {
    return (
      <UserLayout
        title="Dashboard ban"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={eventId}
      >
        <div className="alert alert-danger" style={{ margin: "20px" }}>
          Không tìm thấy ban. Bạn có thể chưa được phân công vào ban nào.
        </div>
      </UserLayout>
    )
  }

  // Still loading department data
  if (!department) {
    return (
      <UserLayout
        title="Dashboard ban"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải thông tin ban...</div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout title="Dashboard ban" sidebarType={sidebarType} activePage="overview-dashboard" eventId={eventId}>
      <div className="bg-light" style={{ minHeight: "100vh", padding: "24px" }}>
        <div className="container-fluid px-0" style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div className="mb-4">
            <h1 className="mb-2" style={{ color: "#dc2626", fontSize: "28px", fontWeight: 700 }}>
              {eventData.name}
            </h1>
            <div className="d-flex align-items-center gap-2">
              <span style={{ color: "#6b7280", fontSize: "16px" }}>Dashboard ban</span>
              <span style={{ color: "#dc2626", fontSize: "16px", fontWeight: 600 }}>{department.name}</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row g-4 mb-4">
            <div className="col-12 col-sm-6 col-md-6 col-lg-3">
              <div className="card shadow-sm border-0 rounded-4" style={{ transition: "transform 0.2s ease", cursor: "default", height: "100%" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div className="card-body p-4" style={{ minHeight: "160px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
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
                      <Users style={{ color: "#3b82f6" }} />
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "36px", color: "#1f2937", lineHeight: "1" }}>
                    {totalMembers}
                  </div>
                  <div className="text-muted" style={{ fontSize: "14px", fontWeight: "500" }}>
                    Số thành viên
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-6 col-lg-3">
              <div className="card shadow-sm border-0 rounded-4" style={{ transition: "transform 0.2s ease", cursor: "default", height: "100%" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div className="card-body p-4" style={{ minHeight: "160px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{
                        width: "56px",
                        height: "56px",
                        backgroundColor: "#e9d5ff",
                        fontSize: "24px",
                      }}
                    >
                      <LaptopMinimalCheck style={{ color: "#8b5cf6" }} />
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "36px", color: "#1f2937", lineHeight: "1" }}>
                    {totalTasks}
                  </div>
                  <div className="text-muted" style={{ fontSize: "14px", fontWeight: "500" }}>
                    Tổng số công việc
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-6 col-lg-3">
              <div className="card shadow-sm border-0 rounded-4" style={{ transition: "transform 0.2s ease", cursor: "default", height: "100%" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div className="card-body p-4" style={{ minHeight: "160px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
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
                      <CircleCheckBig style={{ color: "#22c55e" }} />
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "36px", color: "#1f2937", lineHeight: "1" }}>
                    {completedTasksPercent}%
                  </div>
                  <div className="text-muted" style={{ fontSize: "14px", fontWeight: "500" }}>
                    Công việc đã hoàn thành
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-6 col-lg-3">
              <div className="card shadow-sm border-0 rounded-4" style={{ transition: "transform 0.2s ease", cursor: "default", height: "100%" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div className="card-body p-4" style={{ minHeight: "160px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
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
                      <FileExclamationPoint style={{ color: "#ef4444" }} />
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "36px", color: "#1f2937", lineHeight: "1" }}>
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
            {/* Major Tasks */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "320px" }}>
                  <h6 className="fw-semibold mb-4" style={{ fontSize: "18px", color: "#1f2937" }}>
                    Công việc lớn của ban
                  </h6>

                  {majorTasks.length > 0 ? (
                    majorTasks.map((task, index) => (
                      <div key={task.id} className={index !== majorTasks.length - 1 ? "mb-4 pb-4 border-bottom" : ""}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="d-flex align-items-center flex-grow-1">
                            <span
                              className="rounded-circle me-3"
                              style={{
                                width: "12px",
                                height: "12px",
                                backgroundColor: "#f59e0b",
                              }}
                            ></span>
                            <span style={{ fontSize: "15px", color: "#374151", fontWeight: "500" }}>{task.title}</span>
                          </div>
                          <span className="text-muted" style={{ fontSize: "13px" }}>
                            {task.deadline}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: "10px", borderRadius: "10px", backgroundColor: "#f3f4f6" }}>
                            <div
                              className="progress-fill rounded"
                              style={{
                                width: `${task.progress}%`,
                                height: "100%",
                                backgroundColor: "#f59e0b",
                                transition: "width 0.5s ease"
                              }}
                            ></div>
                          </div>
                          <span className="fw-semibold" style={{ fontSize: "14px", color: "#f59e0b", minWidth: "45px", textAlign: "right" }}>
                            {task.progress}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted py-5">
                      <div style={{ fontSize: "48px", opacity: 0.3 }}><LaptopMinimalCheck /></div>
                      <div className="mt-2">Chưa có dữ liệu công việc</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Tasks */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "320px" }}>
                  <h6 className="fw-semibold mb-4" style={{ fontSize: "16px", color: "#1f2937" }}>
                    Công việc chi tiết của ban
                  </h6>

                  {detailedTasks.length > 0 ? (
                    <div className="d-flex flex-column gap-3">
                      {detailedTasks.map((task) => {
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
                              <span
                                className="rounded-circle me-3"
                                style={{
                                  width: "10px",
                                  height: "10px",
                                  backgroundColor: statusText === "Hoàn thành" 
                                    ? "#10b981" 
                                    : statusText === "Quá hạn" || statusText === "Tạm hoãn" || statusText === "Đã hủy"
                                    ? "#ef4444"
                                    : "#f59e0b",
                                }}
                              ></span>
                              <div>
                                <div style={{ fontSize: "14px", color: "#374151", fontWeight: "500" }}>
                                  {task.title}
                                </div>
                                <div className="text-muted" style={{ fontSize: "12px" }}>
                                  Hạn tới: {task.deadline}
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
                    <div className="text-center text-muted py-5">
                      <div style={{ fontSize: "48px", opacity: 0.3 }}><FileExclamationPoint /></div>
                      <div className="mt-2">Chưa có công việc chi tiết</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="row g-3">
            {/* Calendar */}
            {/* Calendar Section - Đã đồng bộ giao diện với HoOC */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4" style={{ cursor: "pointer", minHeight: "458px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }} onClick={() => navigate(`/events/${eventId}/my-calendar`)}>
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
                        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
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
                            if (!dayData) {
                              return <td key={dayIndex} style={{ padding: "8px 4px" }}></td>
                            }
                            const isHovered = hoveredDay === dayData?.day
                            const dayEvents = dayData?.day ? getEventsForDay(dayData.day) : []
                            const hasEvents = dayEvents.length > 0
                            let bgColor = "transparent"
                            let textColor = "#374151"

                            const isToday = dayData?.today
                            const isMilestone = dayData?.hasMilestone
                            const isCalendar = dayData?.hasCalendar

                            // Logic màu sắc giống HoOC
                            if (isHovered && hasEvents) {
                              if (isMilestone && isCalendar) {
                                bgColor = "#fef3e8"; textColor = "#92400e";
                              } else if (isMilestone) {
                                bgColor = "#ffe4e6"; textColor = "#991b1b";
                              } else {
                                bgColor = "#dbeafe"; textColor = "#1e40af";
                              }
                            } else if (hasEvents) {
                              if (isMilestone && isCalendar) {
                                bgColor = "#fef3c7"; textColor = "#92400e";
                              } else if (isMilestone) {
                                bgColor = "#fee2e2"; textColor = "#991b1b";
                              } else {
                                bgColor = "#e0f2fe"; textColor = "#1e40af";
                              }
                            }
                            
                            if (isToday) {
                              textColor = hasEvents && isCalendar ? "#1e40af" : (isMilestone ? "#dc2626" : "#dc2626");
                            }

                            return (
                              <td
                                key={dayIndex}
                                className={`text-center ${isToday ? "text-white rounded" : hasEvents ? "fw-semibold" : ""}`}
                                style={{
                                  fontSize: "13px",
                                  backgroundColor: bgColor,
                                  color: textColor,
                                  border: `none`,
                                  minWidth: 0,
                                  width: "36px",
                                  height: "36px",
                                  padding: 0,
                                  borderRadius: "7px",
                                  cursor: dayData?.day ? "pointer" : "default",
                                  transition: "all 0.2s",
                                  verticalAlign: "middle"
                                }}
                                onMouseEnter={() => dayData?.day && setHoveredDay(dayData.day)}
                                onMouseLeave={() => setHoveredDay(null)}
                              >
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "36px" }}>
                                  <span style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 2,
                                    color: textColor
                                  }}>
                                    <span style={{
                                      textDecoration: isToday ? "underline" : "none",
                                      textUnderlineOffset: isToday ? "3px" : undefined,
                                      textDecorationThickness: isToday ? "2px" : undefined,
                                    }}>
                                      {dayData?.day}
                                    </span>
                                    {/* Icon hiển thị loại sự kiện */}
                                    {isMilestone && isCalendar && <Sparkles size={16} style={{marginLeft: 3}} />}
                                    {!isMilestone && isCalendar && <Calendar size={16} style={{marginLeft: 3}} />}
                                    {isMilestone && !isCalendar && <Goal size={16} style={{marginLeft: 3}} />}
                                  </span>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Phần hiển thị chi tiết bên dưới (Detail Section) */}
                  {(() => {
                    const hoveredEvents = hoveredDay ? getEventsForDay(hoveredDay) : []
                    
                    // CASE 1: Đang di chuột vào ngày có sự kiện
                    if (hoveredDay && hoveredEvents.length > 0) {
                      // Nếu có nhiều events, gộp thành 1 chip (Logic HoOC)
                      if (hoveredEvents.length > 1) {
                        const hasMilestone = hoveredEvents.some(e => e.itemType === 'milestone')
                        const hasCalendar = hoveredEvents.some(e => e.itemType === 'calendar')
                        const milestoneCount = hoveredEvents.filter(e => e.itemType === 'milestone').length
                        const calendarCount = hoveredEvents.filter(e => e.itemType === 'calendar').length
                        
                        let chipConfig = {}
                        if (hasMilestone && hasCalendar) {
                          chipConfig = {
                            icon: "sparkles", // Sparkles
                            label: "Cột mốc & Lịch họp",
                            bgColor: "#fef3c7",
                            borderColor: "#fcd34d",
                            textColor: "#92400e"
                          }
                        } else if (hasMilestone) {
                          chipConfig = {
                            icon: "goal", // Goal
                            label: milestoneCount > 1 ? `${milestoneCount} Cột mốc` : "Cột mốc",
                            bgColor: "#fef2f2",
                            borderColor: "#dc2626",
                            textColor: "#dc2626"
                          }
                        } else {
                          chipConfig = {
                            icon: "calendar", // Calendar
                            label: calendarCount > 1 ? `${calendarCount} Lịch họp` : "Lịch họp",
                            bgColor: "#eff6ff",
                            borderColor: "#3b82f6",
                            textColor: "#1e40af"
                          }
                        }
                        
                        const eventNames = hoveredEvents.map(e => e?.name || (e.itemType === 'milestone' ? 'Cột mốc' : 'Lịch họp')).filter(Boolean)
                        
                        return (
                          <div className="mt-4 pt-3 border-top">
                            <div style={{ backgroundColor: chipConfig.bgColor, padding: "10px", borderRadius: "6px", borderLeft: `3px solid ${chipConfig.borderColor}` }}>
                              <div className="d-flex align-items-start gap-2">
                                <span style={{ fontSize: "16px", flexShrink: 0 }}>
                                  {chipConfig.icon === "sparkles" ? <Sparkles size={16} /> : chipConfig.icon === "goal" ? <Goal size={16} /> : chipConfig.icon === "calendar" ? <Calendar size={16} /> : chipConfig.icon}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    display: "inline-block",
                                    fontSize: "9px",
                                    backgroundColor: chipConfig.bgColor === "#fef3c7" ? "#fef3c7" : chipConfig.bgColor,
                                    color: chipConfig.textColor,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontWeight: "600",
                                    marginBottom: "4px",
                                    border: `1px solid ${chipConfig.borderColor}`
                                  }}>
                                    {chipConfig.label}
                                  </div>
                                  <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: chipConfig.textColor }}>
                                    {eventNames.join(", ")}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: "11px" }}>
                                    {hoveredEvents.length} sự kiện trong ngày này
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      
                      // Nếu chỉ có 1 event, hiển thị chi tiết (Logic HoOC)
                      return (
                        <div className="mt-4 pt-3 border-top">
                          {hoveredEvents.map((item, index) => {
                            if (item.itemType === 'milestone') {
                              return (
                                <div key={index} className={index > 0 ? "mt-3" : ""}>
                                  <div style={{ backgroundColor: "#fef2f2", padding: "10px", borderRadius: "6px", borderLeft: "3px solid #dc2626" }}>
                                    <div className="d-flex align-items-start gap-2">
                                      <span style={{ fontSize: "16px", flexShrink: 0 }}><Goal size={16} color="#dc2626" /></span>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: "inline-block", fontSize: "9px", backgroundColor: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "4px", fontWeight: "600", marginBottom: "4px" }}>
                                          Cột mốc
                                        </div>
                                        <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#dc2626" }}>
                                          {item?.name || "Cột mốc"}
                                        </div>
                                        {item?.description && (
                                          <div className="text-muted" style={{ fontSize: "11px" }}>{item.description}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }

                            // Calendar items
                            const startDate = parseCalendarEventStart(item)
                            const endCandidate = item?.endAt || (item?.meetingDate && item?.endTime ? `${item.meetingDate}T${item.endTime}` : null)
                            const endDate = endCandidate ? new Date(endCandidate) : null
                            const timeStr = startDate ? startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""
                            const endStr = endDate && !Number.isNaN(endDate.getTime()) ? endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""
                            const timeDisplay = endStr && timeStr ? `${timeStr} - ${endStr}` : timeStr

                            return (
                              <div key={index} className={index > 0 ? "mt-3" : ""}>
                                <div style={{ backgroundColor: "#eff6ff", padding: "10px", borderRadius: "6px", borderLeft: "3px solid #3b82f6" }}>
                                  <div className="d-flex align-items-start gap-2">
                                    <span style={{ fontSize: "16px", flexShrink: 0 }}><Calendar size={16} color="#3b82f6" /></span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "inline-block", fontSize: "9px", backgroundColor: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px", fontWeight: "600", marginBottom: "4px" }}>
                                        Lịch họp
                                      </div>
                                      <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#1e40af" }}>
                                        {item?.name || "Lịch họp"}
                                      </div>
                                      {timeDisplay && (
                                        <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "11px" }}>
                                          <span><Clock size={12} style={{ flexShrink: 0 }} /></span><span>{timeDisplay}</span>
                                        </div>
                                      )}
                                      {item?.location && (
                                        <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "11px", marginTop: "2px" }}>
                                          <MapPin size={12} style={{ flexShrink: 0 }} /><span>{item.location}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    }

                    // CASE 2: Đang di chuột vào ngày trống
                    if (hoveredDay) {
                      return (
                        <div className="mt-4 pt-3 border-top">
                          <div className="text-muted" style={{ fontSize: "13px" }}>
                            Không có lịch họp
                          </div>
                        </div>
                      )
                    }

                    // CASE 3: Không di chuột - Hiển thị fallback (Logic cũ của bạn giữ lại vì nó hữu ích)
                    // Fallback: upcoming milestone within 7 days
                    const upcomingMilestone = milestones.find(m => !isCompletedStatus(m?.status))
                    if (!upcomingMilestone) {
                        return (
                            <div className="mt-4 pt-3 border-top" style={{minHeight:80}}>
                                <div className="text-muted text-center" style={{ fontSize: "14px", fontStyle: "italic" }}>
                                    Di chuột vào một ngày trên lịch để xem chi tiết.
                                </div>
                            </div>
                        )
                    }
                    
                    const milestoneDate = parseDate(upcomingMilestone?.targetDate || upcomingMilestone?.dueDate)
                    if (!milestoneDate) return null
                    
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const milestoneDay = new Date(milestoneDate)
                    milestoneDay.setHours(0, 0, 0, 0)
                    
                    const diffTime = milestoneDay - today
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    
                    if (diffDays >= 0 && diffDays <= 7) {
                      const timeStr = milestoneDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                      const dateStr = diffDays === 0 ? "Hôm nay" : diffDays === 1 ? "Mai" : formatDate(milestoneDate)
                      
                      return (
                        <div className="mt-4 pt-3 border-top">
                          <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ backgroundColor: "#fef2f2", borderLeft: "3px solid #dc2626" }}>
                            <span style={{ color: "#dc2626", fontSize: "16px" }}><Goal size={16} /></span>
                            <div>
                              <div className="fw-semibold mb-0" style={{ fontSize: "13px", color: "#dc2626" }}>
                                Sắp đến: {upcomingMilestone?.name}
                              </div>
                              <div className="text-muted" style={{ fontSize: "11px" }}>
                                {dateStr} {timeStr !== "00:00" ? `- ${timeStr}` : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                        <div className="mt-4 pt-3 border-top" style={{minHeight:80}}>
                            <div className="text-muted text-center" style={{ fontSize: "14px", fontStyle: "italic" }}>
                                Di chuột vào một ngày trên lịch để xem chi tiết.
                            </div>
                        </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Event Card with Horizontal Timeline */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "458px" }}>
                  {/* Event Header */}
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle"
                      style={{
                        width: "48px",
                        height: "48px",
                        backgroundColor: "#fef2f2",
                        fontSize: "24px",
                      }}
                    >
                      <Goal style={{ color: "#dc2626" }} />
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="fw-bold mb-1" style={{ fontSize: "18px", color: "#1f2937" }}>
                        {eventData.name}
                      </h6>
                      <div className="text-muted" style={{ fontSize: "13px" }}>
                        Thông tin sự kiện
                      </div>
                    </div>
                  </div>

                  {/* Progress Dots and Status */}
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>Tiến độ</div>
                    <div className="d-flex gap-1">
                      {eventTimeline.map((_, index) => (
                        <span
                          key={index}
                          className="rounded-circle"
                          style={{
                            width: "10px",
                            height: "10px",
                            backgroundColor: eventTimeline[index]?.completed ? "#dc2626" : "#e5e7eb",
                          }}
                        ></span>
                      ))}
                    </div>
                    <span className="fw-semibold" style={{ fontSize: "13px", color: "#dc2626" }}>
                      {completedMilestoneCount}/{milestones.length} hoàn thành
                    </span>
                  </div>

                  {/* Next Milestone */}
                  {(() => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)

                    // Check for ongoing milestone (today)
                    const ongoingMilestone = milestones.find(m => {
                      const targetDate = parseDate(m?.targetDate || m?.dueDate)
                      if (!targetDate) return false
                      const milestoneDay = new Date(targetDate)
                      milestoneDay.setHours(0, 0, 0, 0)
                      return !isCompletedStatus(m?.status) && milestoneDay.getTime() === today.getTime()
                    })

                    if (ongoingMilestone) {
                      return (
                        <div
                          className="d-flex align-items-center gap-2 mb-4 p-3 rounded-2"
                          style={{ backgroundColor: "#fef2f2" }}
                        >
                          <span style={{ color: "#dc2626", fontSize: "16px" }}><Calendar style={{ color: "#dc2626" }} /></span>
                          <span className="flex-grow-1" style={{ fontSize: "14px", color: "#374151", fontWeight: 500 }}>
                            Đang diễn ra: {ongoingMilestone.name}
                          </span>
                          <span style={{ fontSize: "13px", color: "#6b7280" }}>
                            (Hôm nay)
                          </span>
                        </div>
                      )
                    }

                    // Check for next milestone (future)
                    const nextMilestone = milestones.find(m => {
                      const targetDate = parseDate(m?.targetDate || m?.dueDate)
                      if (!targetDate) return false
                      const milestoneDay = new Date(targetDate)
                      milestoneDay.setHours(0, 0, 0, 0)
                      return !isCompletedStatus(m?.status) && milestoneDay > today
                    })

                    if (nextMilestone) {
                      return (
                        <div
                          className="d-flex align-items-center gap-2 mb-4 p-3 rounded-2"
                          style={{ backgroundColor: "#fef2f2" }}
                        >
                          <span style={{ color: "#dc2626", fontSize: "16px" }}><Calendar style={{ color: "#dc2626" }} /></span>
                          <span className="flex-grow-1" style={{ fontSize: "14px", color: "#374151", fontWeight: 500 }}>
                            Tiếp theo: {nextMilestone.name}
                          </span>
                          <span style={{ fontSize: "13px", color: "#6b7280" }}>
                            ({formatDate(nextMilestone.targetDate || nextMilestone.dueDate)})
                          </span>
                        </div>
                      )
                    }

                    // Show completion message if no future milestones
                    if (milestones.length > 0) {
                      return (
                        <div
                          className="d-flex align-items-center gap-2 mb-4 p-3 rounded-2"
                          style={{ backgroundColor: "#d4f4dd" }}
                        >
                          <CircleCheckBig style={{ color: "#10b981" }} />
                          <span className="flex-grow-1" style={{ fontSize: "14px", color: "#166534", fontWeight: 500 }}>
                            Đã hoàn thành tất cả cột mốc
                          </span>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {/* Horizontal Timeline */}
                  {eventTimeline.length > 0 ? (
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
                  ): (<div className="text-center text-muted py-5">
                    <div style={{ fontSize: "48px", opacity: 0.3 }}><PinOff /></div>
                    <div className="mt-2">Chưa có dữ liệu cột mốc sự kiện</div>
                  </div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  )
}

