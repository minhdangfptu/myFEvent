import { useEffect, useMemo, useState } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import UserLayout from "../../components/UserLayout"
import { eventApi } from "../../apis/eventApi"
import { taskApi } from "../../apis/taskApi"
import { departmentService } from "../../services/departmentService"
import { milestoneService } from "../../services/milestoneService"
import calendarService from "../../services/calendarService"
import Loading from "../../components/Loading"
import { formatDate } from "../../utils/formatDate"
import { getEventIdFromUrl } from "../../utils/getEventIdFromUrl"
import { useEvents } from "../../contexts/EventContext"
import { userApi } from "../../apis/userApi"

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
          const [deptResponse, membersResponse, tasksResponse, milestonesResponse, calendarsResponse] = await Promise.all([
            departmentService.getDepartmentDetail(eventId, departmentId),
            departmentService.getMembersByDepartment(eventId, departmentId),
            taskApi.getTaskByEvent(eventId),
            milestoneService.listMilestones(eventId, {
              sortBy: "targetDate",
              sortDir: "asc"
            }),
            calendarService.getCalendarsByEventId(eventId)
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
          if (!cancelled) setCalendarEvents(normalizeCalendars(calendarsResponse))
        }
        // If no departmentId yet, the useEffect will run again when departmentId is set
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

  // Major tasks (parent tasks or tasks with high priority)
  const majorTasks = useMemo(() => {
    const parentTasks = tasks.filter(t => !t.parentTaskId || t.parentTaskId === null)
    return parentTasks
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
      .filter(t => t.parentTaskId || t.status !== "completed")
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
      milestones.slice(0, 5).map((milestone) => ({
        name: milestone?.name || "Cột mốc",
        date: formatDate(milestone?.targetDate || milestone?.dueDate),
        completed: isCompletedStatus(milestone?.status)
      })),
    [milestones]
  )

  // Calendar data (current month)
  const calendarDays = useMemo(() => {
    const baseDays = generateCalendarDays()
    if (!calendarEvents.length) return baseDays
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const highlighted = new Set()

    calendarEvents.forEach((event) => {
      const startDate = parseCalendarEventStart(event)
      if (!startDate) return
      if (startDate.getFullYear() !== year || startDate.getMonth() !== month) return
      highlighted.add(startDate.getDate())
    })

    return baseDays.map((day) => ({
      ...day,
      highlight: highlighted.has(day.day)
    }))
  }, [calendarEvents])

  // Get events for a specific day
  const getEventsForDay = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    
    return (day) => {
      if (!day) return []
      return calendarEvents
        .map((event) => {
          const startDate = parseCalendarEventStart(event)
          return startDate ? { event, startDate } : null
        })
        .filter(Boolean)
        .filter(({ startDate }) => startDate.getFullYear() === year && startDate.getMonth() === month && startDate.getDate() === day)
        .map(({ event }) => event)
    }
  }, [calendarEvents])

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
        title="Dashboard ban"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải dữ liệu dashboard...</div>
        </div>
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

  if (!eventData || !department) {
    return (
      <UserLayout
        title="Dashboard ban"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={eventId}
      >
        <div className="alert alert-danger" style={{ margin: "20px" }}>
          {!eventData ? "Không tìm thấy sự kiện" : "Không tìm thấy ban. Bạn có thể chưa được phân công vào ban nào."}
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
                      👥
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
              <div className="card shadow-sm border-0 rounded-4" style={{ transition: "transform 0.2s ease", cursor: "default" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <div className="card-body p-4">
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
                      📋
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
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
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
                      <div style={{ fontSize: "48px", opacity: 0.3 }}>📊</div>
                      <div className="mt-2">Chưa có dữ liệu công việc</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Tasks */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
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
                    <div className="text-center text-muted py-4">
                      <div style={{ fontSize: "48px", opacity: 0.3 }}>📋</div>
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
                            const isHovered = hoveredDay === dayData?.day
                            const dayEvents = dayData?.day ? getEventsForDay(dayData.day) : []
                            const hasEvents = dayEvents.length > 0
                            
                            return (
                              <td
                                key={dayIndex}
                                className={`text-center ${
                                  dayData?.today ? "text-white rounded" : hasEvents ? "fw-semibold" : ""
                                }`}
                                style={{
                                  fontSize: "13px",
                                  backgroundColor: dayData?.today
                                    ? "#dc2626"
                                    : isHovered && hasEvents
                                    ? "#ffe4e6"
                                    : hasEvents
                                    ? "#fee2e2"
                                    : "transparent",
                                  color: dayData?.today 
                                    ? "white" 
                                    : hasEvents
                                    ? "#991b1b"
                                    : "#374151",
                                  border: hasEvents ? "1px solid #fecdd3" : "1px solid transparent",
                                  padding: "8px 4px",
                                  borderRadius: "8px",
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

                  {(() => {
                    const hoveredEvents = hoveredDay ? getEventsForDay(hoveredDay) : []
                    if (hoveredDay && hoveredEvents.length > 0) {
                      return (
                        <div className="mt-4 pt-3 border-top">
                          {hoveredEvents.map((event, index) => {
                            const startDate = parseCalendarEventStart(event)
                            const endCandidate =
                              event?.endAt ||
                              (event?.meetingDate && event?.endTime
                                ? `${event.meetingDate}T${event.endTime}`
                                : null)
                            const endDate = endCandidate ? new Date(endCandidate) : null
                            const timeStr = startDate
                              ? startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                              : ""
                            const endStr =
                              endDate && !Number.isNaN(endDate.getTime())
                                ? endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                                : ""
                            const timeDisplay = endStr && timeStr ? `${timeStr} - ${endStr}` : timeStr

                            return (
                              <div key={index} className={index > 0 ? "mt-3" : ""}>
                                <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#374151" }}>
                                  {event?.name || "Lịch họp"}
                                </div>
                                {timeDisplay && (
                                  <div className="text-muted" style={{ fontSize: "13px" }}>
                                    {timeDisplay}
                                  </div>
                                )}
                                {event?.location && (
                                  <div className="text-muted" style={{ fontSize: "12px" }}>
                                    {event.location}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    }

                    if (hoveredDay) {
                      return (
                        <div className="mt-4 pt-3 border-top">
                          <div className="text-muted" style={{ fontSize: "13px" }}>
                            Không có lịch họp
                          </div>
                        </div>
                      )
                    }

                    // Fallback: upcoming milestone within 7 days
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

            {/* Event Card with Horizontal Timeline */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
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
                      🎯
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
                      {milestones.filter((m) => isCompletedStatus(m?.status)).length}/{milestones.length} hoàn thành
                    </span>
                  </div>

                  {/* Next Milestone */}
                  {eventTimeline.length > 0 && (
                    <div
                      className="d-flex align-items-center gap-2 mb-4 p-3 rounded-2"
                      style={{ backgroundColor: "#fef2f2" }}
                    >
                      <span style={{ color: "#dc2626", fontSize: "16px" }}>📅</span>
                      <span className="flex-grow-1" style={{ fontSize: "14px", color: "#374151", fontWeight: 500 }}>
                        Tiếp theo: {eventTimeline.find(m => !m.completed)?.name || eventTimeline[0]?.name}
                      </span>
                      <span style={{ fontSize: "13px", color: "#6b7280" }}>
                        ({eventTimeline.find(m => !m.completed)?.date || eventTimeline[0]?.date})
                      </span>
                    </div>
                  )}

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

