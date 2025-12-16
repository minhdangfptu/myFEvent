import { useEffect, useMemo, useState } from "react"
import { useParams, useLocation, useNavigate } from "react-router-dom"
import UserLayout from "../../components/UserLayout"
import { dashboardApi } from "../../apis/dashboardApi"
import calendarService from "../../services/calendarService"
import { taskApi } from "../../apis/taskApi"
import { budgetApi } from "../../apis/budgetApi"
import Loading from "../../components/Loading"
import DashboardSkeleton from "../../components/DashboardSkeleton"
import { formatDate } from "../../utils/formatDate"
import { getEventIdFromUrl } from "../../utils/getEventIdFromUrl"
import { useEvents } from "../../contexts/EventContext"
import { Calendar, Sparkles, Goal, CircleCheckBig, Users, Coins } from "lucide-react";

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

const normalizeCalendars = (payload) => {
  const data = unwrapApiData(payload)
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.calendars)) return data.calendars
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data.items)) return data.items
  return []
}

const parseDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) return date
  return null
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

export default function HoOCDashBoard() {
  const location = useLocation()
  const { eventId: paramEventId } = useParams()
  const { fetchEventRole } = useEvents()
  const navigate = useNavigate()
  
  // State
  const [loading, setLoading] = useState(true)
  const [eventData, setEventData] = useState(null)
  const [members, setMembers] = useState([])
  const [milestones, setMilestones] = useState([])
  const [departments, setDepartments] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [eventRole, setEventRole] = useState("")
  const [hoveredDay, setHoveredDay] = useState(null)
  const [epicTasks, setEpicTasks] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [budgetData, setBudgetData] = useState({ planned: 0, actual: 0 })
  const [departmentTotal, setDepartmentTotal] = useState(0)
  
  // Get event ID from URL
  const eventId = paramEventId || getEventIdFromUrl(location.pathname, location.search)

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
    if (!eventId) return

    let cancelled = false

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch dashboard overview from optimized API (single call with 60s cache)
        const dashboardResponse = await dashboardApi.getDashboardOverview(eventId)

        if (cancelled) return

        const { data } = dashboardResponse

        // Map event data
        if (data?.event) {
          setEventData({
            _id: data.event.id,
            name: data.event.name,
            status: data.event.status,
            type: data.event.type,
            organizerName: data.event.organizerName,
            eventStartDate: data.event.startDate,
            eventEndDate: data.event.endDate,
            location: data.event.location
          })
        }

        // Map members (create fake array with total count for stats)
        const memberCount = data?.stats?.members?.total || 0
        setMembers(Array(memberCount).fill({ _id: 'placeholder' }))

        // Map milestones
        if (data?.highlights?.nextMilestones) {
          setMilestones(data.highlights.nextMilestones.map(m => ({
            _id: m._id,
            name: m.name,
            status: m.status,
            targetDate: m.targetDate
          })))
        }

        // Map departments (use topDepartments + stats)
        if (data?.highlights?.topDepartments) {
          const depts = data.highlights.topDepartments.map(d => ({
            _id: d.id,
            name: d.name,
            progress: d.progress,
            // Add budget data from stats
            budget: data.stats?.budget?.allocated || 0,
            spent: data.stats?.budget?.spent || 0
          }))
          setDepartments(depts)
        }

        // Save total departments for stats card
        if (data?.stats?.departments?.total != null) {
          setDepartmentTotal(data.stats.departments.total)
        }

        // Show dashboard immediately
        setLoading(false)

        // Lazy load calendar events and epic tasks (non-critical)
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

          // Fetch all tasks for progress display (epic tasks and major tasks)
            taskApi.getTaskByEvent(eventId)
            .then(tasksResponse => {
              if (!cancelled) {
                const tasksData = unwrapApiData(tasksResponse)
                const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData?.data || tasksData?.tasks || [])
                
                // Store all tasks
                if (!cancelled) {
                  setAllTasks(tasksArray)
                }
                
                // Filter epic tasks (taskType === 'epic') with progressPct
                const epics = tasksArray
                  .filter(task => task?.taskType === 'epic' || task?.taskType === 'Epic')
                  .map(epic => ({
                    ...epic,
                    progressPct: typeof epic.progressPct === "number" ? epic.progressPct : (epic.progress || 0)
                  }))
                
                if (!cancelled) {
                  setEpicTasks(epics)
                }
              }
            })
            .catch(err => {
              if (!cancelled) {
                console.error("Error loading tasks:", err)
              }
            })

          // Fetch budget statistics: planned (HoD) vs actual (Member paid)
          budgetApi.getBudgetStatistics(eventId)
            .then(statsResponse => {
              if (!cancelled) {
                const stats = unwrapApiData(statsResponse)
                // totalEstimated = tiền dự trù kinh phí từ budget mà HoD nộp
                // totalActual = tiền thực tế member nộp
                const planned = Number(stats?.totalEstimated || stats?.data?.totalEstimated || 0)
                const actual = Number(stats?.totalActual || stats?.data?.totalActual || 0)
                
                if (!cancelled) {
                  setBudgetData({ planned, actual })
                }
              }
            })
            .catch(err => {
              if (!cancelled) {
                console.error("Error loading budget statistics:", err)
              }
            })

          // Fetch budget statistics: planned (HoD) vs actual (Member paid)
          budgetApi.getBudgetStatistics(eventId)
            .then(statsResponse => {
              if (!cancelled) {
                const stats = unwrapApiData(statsResponse)
                // totalEstimated = tiền dự trù kinh phí từ budget mà HoD nộp
                // totalActual = tiền thực tế member nộp
                const planned = Number(stats?.totalEstimated || stats?.data?.totalEstimated || 0)
                const actual = Number(stats?.totalActual || stats?.data?.totalActual || 0)
                
                if (!cancelled) {
                  setBudgetData({ planned, actual })
                }
              }
            })
            .catch(err => {
              if (!cancelled) {
                console.error("Error loading budget statistics:", err)
              }
            })
        }
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
  }, [eventId])

  // Add smooth animations on load
  useEffect(() => {
    if (loading) return

    const progressFills = document.querySelectorAll(".progress-fill")
    progressFills.forEach((fill) => {
      const width = fill.style.width
      fill.style.width = "0%"
      setTimeout(() => {
        fill.style.width = width
      }, 100)
    })

    const bars = document.querySelectorAll(".chart-bar")
    bars.forEach((bar, index) => {
      const height = bar.style.height
      bar.style.height = "0px"
      setTimeout(() => {
        bar.style.height = height
      }, 200 + index * 50)
    })
  }, [loading])

  // Calculate stats
  const totalMilestones = milestones.length
  const completedMilestones = useMemo(
    () => milestones.filter((m) => isCompletedStatus(m?.status)).length,
    [milestones]
  )
  const milestoneCompletionPercent = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0
  const milestoneProgressRatio = totalMilestones > 0
    ? Math.min(100, Math.max(0, (completedMilestones / totalMilestones) * 100))
    : 0
  const totalMembers = members.length
  const totalDepartments = departmentTotal || departments.length

  // Calculate budget stats from actual budget data
  const budgetStats = useMemo(() => {
    const planned = budgetData.planned || 0
    const actual = budgetData.actual || 0
    
    // Calculate percentage without capping at 100% to show actual usage rate
    // If actual > planned, it will show > 100% (e.g., 150% means 50% over budget)
    const percent = planned > 0
      ? Math.max(0, Math.round((actual / planned) * 100))
      : null

    return {
      planned,
      actual,
      percent
    }
  }, [budgetData])

  const { planned: totalPlanned, actual: totalActual, percent: budgetUsagePercent } = budgetStats
  const budgetUsageDisplay = budgetUsagePercent != null ? `${budgetUsagePercent}%` : "—"
  const budgetSummaryLabel = totalPlanned > 0
    ? `${totalActual.toLocaleString("vi-VN")} / ${totalPlanned.toLocaleString("vi-VN")}`
    : "Chưa có dữ liệu"
  
  // Calculate chart scale for comparison
  const budgetChartScale = useMemo(() => {
    const maxValue = Math.max(totalPlanned, totalActual)
    return maxValue > 0 ? 160 / maxValue : 1
  }, [totalPlanned, totalActual])

  const majorTasks = useMemo(() => {
    // Get epic tasks (parent tasks) with actual progress
    const epicTasksWithProgress = allTasks
      .filter(task => (task?.taskType === 'epic' || task?.taskType === 'Epic') && !task?.parentTaskId)
      .slice(0, 2)
      .map(epic => {
        const progressPct = typeof epic.progressPct === "number" ? epic.progressPct : (epic.progress || 0)
        const normalizedProgress = Math.max(0, Math.min(100, Math.round(progressPct)))
        
        const deadlineSource = epic?.dueDate || epic?.deadline || epic?.plannedEndDate || epic?.expectedCompletionDate
        
        return {
          title: epic?.title || epic?.name || "Epic",
          progress: normalizedProgress,
          deadline: deadlineSource ? formatDate(deadlineSource) : "Đang cập nhật"
        }
      })
    
    // If we have epic tasks, use them; otherwise fallback to departments
    if (epicTasksWithProgress.length > 0) {
      return epicTasksWithProgress
    }
    
    // Fallback to departments if no epic tasks
    return departments.slice(0, 2).map((dept) => {
      const progressSources = [
        dept?.progress,
        dept?.progressPercent,
        dept?.progressPercentage,
        dept?.completionRate,
        dept?.performance?.progress
      ]
      const progressValue = progressSources.find((value) => typeof value === "number") ?? 0
      const normalizedProgress = Math.max(0, Math.min(100, Math.round(progressValue)))

      const deadlineSource =
        dept?.deadline ||
        dept?.dueDate ||
        dept?.plannedEndDate ||
        dept?.expectedCompletionDate

      return {
        title: dept?.name || "Ban chưa đặt tên",
        progress: normalizedProgress,
        deadline: deadlineSource ? formatDate(deadlineSource) : "Đang cập nhật"
      }
    })
  }, [allTasks, departments])

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

  const sidebarType = eventRole === 'Member' ? 'member' : eventRole === 'HoD' ? 'hod' : 'hooc'

  if (loading) {
    return (
      <UserLayout
        title="Dashboard tổng"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={eventId}
      >
        <DashboardSkeleton />
      </UserLayout>
    )
  }

  // Only show error after loading is complete
  if (!loading && !eventData) {
    return (
      <UserLayout
        title="Dashboard tổng"
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
    <UserLayout title="Dashboard Trưởng ban Tổ chức" sidebarType={sidebarType} activePage="overview-dashboard" eventId={eventId}>
      <div className="bg-light" style={{ minHeight: "100vh", padding: "20px" }}>
        <div className="container-fluid px-0" style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <h1 className="mb-4" style={{ color: "#ff5757", fontSize: "24px", fontWeight: 700 }}>
            {eventData.name} 
          </h1>

          {/* Stats Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-md-6 col-lg-3">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "140px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-2"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#ffe5e5",
                        fontSize: "20px",
                      }}
                    >
                      <Calendar style={{ color: "#ff5757" }} />
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "32px", color: "#1f2937" }}>
                    {totalMilestones}
                  </div>
                  <div className="text-muted" style={{ fontSize: "13px" }}>
                    Cột mốc sự kiện
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-6 col-lg-3">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "140px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-2"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#d4f4dd",
                        fontSize: "20px",
                      }}
                    >
                      <CircleCheckBig style={{ color: "#10b981" }} />
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "32px", color: "#1f2937" }}>
                    {totalDepartments}
                  </div>
                  <div className="text-muted" style={{ fontSize: "13px" }}>
                    Ban tổ chức
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-6 col-lg-3">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "140px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-2"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#fff4d6",
                        fontSize: "20px",
                      }}
                    >
                      <Users style={{ color: "#f59e0b" }} /> 
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "32px", color: "#1f2937" }}>
                    {totalMembers}
                  </div>
                  <div className="text-muted" style={{ fontSize: "13px" }}>
                    Thành viên tham gia
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-6 col-lg-3">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "140px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-2"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#ffe8d6",
                        fontSize: "20px",
                      }}
                    >
                      <Coins  style={{ color: "#f97316" }} />
                    </div>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "32px", color: "#1f2937" }}>
                    {budgetUsageDisplay}
                  </div>
                  <div className="text-muted" style={{ fontSize: "13px" }}>
                    Ngân sách đã sử dụng
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section */}
          <div className="row g-3 mb-4">
            {/* Epic Progress Section */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "320px", display: "flex", flexDirection: "column" }}>
                  <h6 className="fw-semibold mb-4" style={{ fontSize: "16px", color: "#1f2937" }}>
                    Tiến độ Công việc lớn
                  </h6>

                  {epicTasks.length > 0 ? (
                    <div style={{ 
                      flex: 1, 
                      overflowY: "auto", 
                      maxHeight: "240px",
                      paddingRight: "8px"
                    }}>
                      {epicTasks.map((epic, index) => {
                        const progress = typeof epic.progressPct === "number" ? epic.progressPct : (epic.progress || 0)
                        const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)))
                        
                        return (
                          <div key={epic._id || epic.id || index} className={index !== epicTasks.length - 1 ? "mb-4" : ""}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center">
                                <span
                                  className="rounded-circle me-2"
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    backgroundColor: "#fbbf24",
                                  }}
                                ></span>
                                <span style={{ fontSize: "14px", color: "#374151" }}>{epic.title || epic.name || "Epic"}</span>
                              </div>
                            </div>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1" style={{ height: "8px" }}>
                                <div
                                  className="progress-fill rounded"
                                  style={{
                                    width: `${normalizedProgress}%`,
                                    height: "100%",
                                    backgroundColor: "#fbbf24",
                                    transition: "width 0.3s ease"
                                  }}
                                ></div>
                              </div>
                              <span className="text-muted ms-2" style={{ fontSize: "12px" }}>
                                {normalizedProgress}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-4">
                      Chưa có dữ liệu epic
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "320px" }}>
                  <h6 className="fw-semibold mb-4" style={{ fontSize: "16px", color: "#1f2937" }}>
                    Tiến độ của các ban
                  </h6>

                  {(() => {
                    // Calculate progress for each department based on epic tasks
                    const departmentProgress = departments.map(dept => {
                      const deptId = dept?._id || dept?.id
                      if (!deptId) return null
                      
                      // Get epic tasks for this department
                      const deptEpicTasks = epicTasks.filter(epic => {
                        const epicDeptId = epic?.departmentId?._id || epic?.departmentId || epic?.departmentId?.id
                        return String(epicDeptId) === String(deptId)
                      })
                      
                      const totalEpicTasks = deptEpicTasks.length
                      const completedEpicTasks = deptEpicTasks.filter(epic => {
                        const status = epic?.status || ""
                        return isCompletedStatus(status)
                      }).length
                      
                      const progressPercent = totalEpicTasks > 0
                        ? Math.round((completedEpicTasks / totalEpicTasks) * 100)
                        : 0
                      
                      return {
                        departmentId: deptId,
                        name: dept?.name || "Ban chưa đặt tên",
                        progress: progressPercent,
                        completed: completedEpicTasks,
                        total: totalEpicTasks
                      }
                    }).filter(Boolean)
                    
                    if (departmentProgress.length > 0) {
                      return departmentProgress.slice(0, 2).map((dept, index) => (
                        <div key={dept.departmentId || index} className={index !== departmentProgress.length - 1 ? "mb-4" : ""}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center">
                              <span
                                className="rounded-circle me-2"
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  backgroundColor: "#fbbf24",
                                }}
                              ></span>
                              <span style={{ fontSize: "14px", color: "#374151" }}>{dept.name}</span>
                            </div>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="progress flex-grow-1" style={{ height: "8px" }}>
                              <div
                                className="progress-fill rounded"
                                style={{
                                  width: `${dept.progress}%`,
                                  height: "100%",
                                  backgroundColor: "#fbbf24",
                                  transition: "width 0.3s ease"
                                }}
                              ></div>
                            </div>
                            <span className="text-muted ms-2" style={{ fontSize: "12px" }}>
                              {dept.progress}%
                            </span>
                          </div>
                          {dept.total > 0 && (
                            <div className="text-muted mt-2" style={{ fontSize: "11px" }}>
                              ({dept.completed} / {dept.total} công việc lớn đã hoàn thành)
                            </div>
                          )}
                        </div>
                      ))
                    } else {
                      return (
                        <div className="text-center text-muted py-4">
                          Chưa có dữ liệu công việc
                        </div>
                      )
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3" style={{ height: "100%" }}>
                <div className="card-body p-4" style={{ minHeight: "320px" }}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h6 className="fw-semibold mb-0" style={{ fontSize: "16px", color: "#1f2937" }}>
                      Ngân sách vs Chi tiêu
                    </h6>
                    <div className="d-flex align-items-center gap-3">
                      <div className="d-flex gap-3">
                        <div className="d-flex align-items-center gap-1">
                          <span
                            className="rounded-circle"
                            style={{
                              width: "8px",
                              height: "8px",
                              backgroundColor: "#3b82f6",
                            }}
                          ></span>
                          <span className="text-muted" style={{ fontSize: "13px" }}>
                            Tiền dự trù
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <span
                            className="rounded-circle"
                            style={{
                              width: "8px",
                              height: "8px",
                              backgroundColor: "#10b981",
                            }}
                          ></span>
                          <span className="text-muted" style={{ fontSize: "13px" }}>
                            Tiền thực tế
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {totalPlanned > 0 || totalActual > 0 ? (
                    <div style={{ marginTop: "20px" }}>
                      {/* Comparison bars */}
                      <div className="d-flex align-items-end justify-content-center gap-4" style={{ minHeight: "200px", marginBottom: "30px", position: "relative" }}>
                        <div className="d-flex flex-column align-items-center justify-content-end" style={{ flex: 1, maxWidth: "200px", height: "100%" }}>
                          <div
                            className="chart-bar rounded-top"
                            style={{
                              width: "60px",
                              height: `${Math.max(4, Math.min(160, Math.round(totalPlanned * budgetChartScale)))}px`,
                              backgroundColor: "#3b82f6",
                              transition: "height 0.5s ease",
                              marginBottom: "12px",
                              flexShrink: 0
                            }}
                          ></div>
                          <div className="text-center" style={{ marginTop: "8px" }}>
                            <div className="fw-semibold" style={{ fontSize: "14px", color: "#1f2937", lineHeight: "1.4" }}>
                              {totalPlanned.toLocaleString("vi-VN")} VNĐ
                            </div>
                            <div className="text-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
                              Tiền dự trù
                            </div>
                          </div>
                        </div>
                        <div className="d-flex flex-column align-items-center justify-content-end" style={{ flex: 1, maxWidth: "200px", height: "100%" }}>
                          <div
                            className="chart-bar rounded-top"
                            style={{
                              width: "60px",
                              height: `${Math.max(4, Math.min(160, Math.round(totalActual * budgetChartScale)))}px`,
                              backgroundColor: "#10b981",
                              transition: "height 0.5s ease",
                              marginBottom: "12px",
                              flexShrink: 0
                            }}
                          ></div>
                          <div className="text-center" style={{ marginTop: "8px" }}>
                            <div className="fw-semibold" style={{ fontSize: "14px", color: "#1f2937", lineHeight: "1.4" }}>
                              {totalActual.toLocaleString("vi-VN")} VNĐ
                            </div>
                            <div className="text-muted" style={{ fontSize: "12px", marginTop: "4px" }}>
                              Tiền thực tế
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Summary info */}
                      <div className="d-flex justify-content-center align-items-start gap-4 pt-3" style={{ borderTop: "1px solid #e5e7eb", marginTop: "20px" }}>
                        <div className="text-center" style={{ minWidth: "120px" }}>
                          <div className="text-muted" style={{ fontSize: "12px", marginBottom: "4px" }}>
                            Tỷ lệ sử dụng
                          </div>
                          <div className="fw-semibold" style={{ fontSize: "16px", color: "#1f2937" }}>
                            {budgetUsageDisplay}
                          </div>
                        </div>
                        {totalPlanned > 0 && (
                          <div className="text-center" style={{ minWidth: "120px" }}>
                            <div className="text-muted" style={{ fontSize: "12px", marginBottom: "4px" }}>
                              Chênh lệch
                            </div>
                            <div className="fw-semibold" style={{ 
                              fontSize: "16px", 
                              color: totalActual > totalPlanned ? "#ef4444" : totalActual < totalPlanned ? "#10b981" : "#6b7280"
                            }}>
                              {(totalActual - totalPlanned).toLocaleString("vi-VN")} VNĐ
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted py-4">
                      Chưa có dữ liệu ngân sách
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
                            let borderColor = "transparent"

                            const isToday = dayData?.today
                            const isMilestone = dayData?.hasMilestone
                            const isCalendar = dayData?.hasCalendar

                            // Ưu tiên event/milestone khi trùng today
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
                            // Không gán border đỏ hoặc shadow nữa
                            if (isToday) {
                              // chỉ đổi màu, không border, không chip
                              textColor = hasEvents && isCalendar ? "#1e40af" : (isMilestone ? "#dc2626" : "#dc2626");
                            }
                            // Tooltip
                            let tooltipText = "";
                            if (isToday && isMilestone && isCalendar) tooltipText = "Hôm nay - milestone & lịch họp";
                            else if (isToday && isMilestone) tooltipText = "Hôm nay - DDay milestone";
                            else if (isToday && isCalendar) tooltipText = "Hôm nay - có lịch họp";
                            else if (isToday) tooltipText = "Hôm nay";
                            else if (isMilestone && isCalendar) tooltipText = "Milestone & lịch họp";
                            else if (isMilestone) tooltipText = "Milestone DDay";
                            else if (isCalendar) tooltipText = "Có lịch họp";

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
                                  position: "relative",
                                  verticalAlign: "middle"
                                }}
                                onMouseEnter={() => dayData?.day && setHoveredDay(dayData.day)}
                                onMouseLeave={() => setHoveredDay(null)}
                                title={tooltipText}
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
                                    {/* Icon calendar/milestone sát số */}
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

                  {(() => {
                    const hoveredEvents = hoveredDay ? getEventsForDay(hoveredDay) : []
                    if (hoveredDay && hoveredEvents.length > 0) {
                      // Nếu có nhiều events, gộp thành 1 chip
                      if (hoveredEvents.length > 1) {
                        const hasMilestone = hoveredEvents.some(e => e.itemType === 'milestone')
                        const hasCalendar = hoveredEvents.some(e => e.itemType === 'calendar')
                        const milestoneCount = hoveredEvents.filter(e => e.itemType === 'milestone').length
                        const calendarCount = hoveredEvents.filter(e => e.itemType === 'calendar').length
                        
                        let chipConfig = {}
                        if (hasMilestone && hasCalendar) {
                          chipConfig = {
                            icon: "⭐",
                            label: "Cột mốc & Lịch họp",
                            bgColor: "#fef3c7",
                            borderColor: "#fcd34d",
                            textColor: "#92400e"
                          }
                        } else if (hasMilestone) {
                          chipConfig = {
                            icon: "🎯",
                            label: milestoneCount > 1 ? `${milestoneCount} Cột mốc` : "Cột mốc",
                            bgColor: "#fef2f2",
                            borderColor: "#dc2626",
                            textColor: "#dc2626"
                          }
                        } else {
                          chipConfig = {
                            icon: "📅",
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
                                <span style={{ fontSize: "16px", flexShrink: 0 }}>{chipConfig.icon === "⭐" ? <Sparkles size={16} /> : chipConfig.icon === "🎯" ? <Goal size={16} /> : chipConfig.icon === "📅" ? <Calendar size={16} /> : chipConfig.icon}</span>
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
                      
                      // Nếu chỉ có 1 event, hiển thị như cũ
                      return (
                        <div className="mt-4 pt-3 border-top">
                          {hoveredEvents.map((item, index) => {
                            // Handle milestone items differently
                            if (item.itemType === 'milestone') {
                              return (
                                <div key={index} className={index > 0 ? "mt-3" : ""}>
                                  <div style={{
                                    backgroundColor: "#fef2f2",
                                    padding: "10px",
                                    borderRadius: "6px",
                                    borderLeft: "3px solid #dc2626"
                                  }}>
                                    <div className="d-flex align-items-start gap-2">
                                      <span style={{ fontSize: "16px", flexShrink: 0 }}>🎯</span>
                                      <div style={{ flex: 1 }}>
                                        <div style={{
                                          display: "inline-block",
                                          fontSize: "9px",
                                          backgroundColor: "#fee2e2",
                                          color: "#991b1b",
                                          padding: "2px 6px",
                                          borderRadius: "4px",
                                          fontWeight: "600",
                                          marginBottom: "4px"
                                        }}>
                                          Cột mốc
                                        </div>
                                        <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#dc2626" }}>
                                          {item?.name || "Cột mốc"}
                                        </div>
                                        {item?.description && (
                                          <div className="text-muted" style={{ fontSize: "11px" }}>
                                            {item.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }

                            // Handle calendar events
                            const startDate = parseCalendarEventStart(item)
                            const endDateCandidate =
                              item?.endAt ||
                              (item?.meetingDate && item?.endTime
                                ? `${item.meetingDate}T${item.endTime}`
                                : null)
                            const endDate = endDateCandidate ? new Date(endDateCandidate) : null
                            const timeStr = startDate
                              ? startDate.toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : ""
                            const endStr =
                              endDate && !Number.isNaN(endDate.getTime())
                                ? endDate.toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                : ""
                            const timeDisplay = endStr && timeStr ? `${timeStr} - ${endStr}` : timeStr

                            return (
                              <div key={index} className={index > 0 ? "mt-3" : ""}>
                                <div style={{
                                  backgroundColor: "#eff6ff",
                                  padding: "10px",
                                  borderRadius: "6px",
                                  borderLeft: "3px solid #3b82f6"
                                }}>
                                  <div className="d-flex align-items-start gap-2">
                                    <span style={{ fontSize: "16px", flexShrink: 0 }}>📅</span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{
                                        display: "inline-block",
                                        fontSize: "9px",
                                        backgroundColor: "#dbeafe",
                                        color: "#1e40af",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        fontWeight: "600",
                                        marginBottom: "4px"
                                      }}>
                                        Lịch họp
                                      </div>
                                      <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#1e40af" }}>
                                        {item?.name || "Lịch họp"}
                                      </div>
                                      {timeDisplay && (
                                        <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "11px" }}>
                                          <span>⏰</span>
                                          <span>{timeDisplay}</span>
                                        </div>
                                      )}
                                      {item?.location && (
                                        <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "11px", marginTop: "2px" }}>
                                          <span>📍</span>
                                          <span>{item.location}</span>
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

                    if (hoveredDay) {
                      return (
                        <div className="mt-4 pt-3 border-top">
                          <div className="text-muted" style={{ fontSize: "13px" }}>
                            Không có lịch họp
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div className="mt-4 pt-3 border-top" style={{minHeight:80}}>
                        <div className="text-muted text-center" style={{ fontSize: "14px", fontStyle: "italic" }}>
                          Chọn một ngày trên lịch để xem chi tiết lịch họp hoặc cột mốc.
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
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#fff4d6",
                        fontSize: "20px",
                      }}
                    >
                      <Goal style={{ color: "#f59e0b" }} />
                    </div>
                    <h6 className="fw-bold mb-0 flex-grow-1" style={{ fontSize: "18px", color: "#1f2937" }}>
                      {eventData.name}
                    </h6>
                    <button className="btn btn-danger btn-sm d-flex align-items-center gap-1" style={{ fontSize: "13px" }}>
                      Xem chi tiết →
                    </button>
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
                      {completedMilestones}/{totalMilestones} hoàn thành
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