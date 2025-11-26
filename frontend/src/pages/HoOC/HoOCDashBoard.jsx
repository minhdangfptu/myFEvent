import { useEffect, useMemo, useState } from "react"
import { useParams, useLocation } from "react-router-dom"
import UserLayout from "../../components/UserLayout"
import { eventApi } from "../../apis/eventApi"
import { milestoneService } from "../../services/milestoneService"
import { departmentService } from "../../services/departmentService"
import calendarService from "../../services/calendarService"
import Loading from "../../components/Loading"
import { formatDate } from "../../utils/formatDate"
import { getEventIdFromUrl } from "../../utils/getEventIdFromUrl"
import { useEvents } from "../../contexts/EventContext"

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

const dedupeMembers = (members = []) => {
  const seen = new Set()
  return members.filter((member) => {
    const id = [
      member?.id,
      member?._id,
      member?.userId,
      member?.userId?._id,
      member?.user?.id,
      member?.user?._id,
      member?.user?.userId
    ].find(Boolean)

    if (!id) return true
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

const normalizeMembers = (payload) => {
  const data = unwrapApiData(payload)
  if (!data) return []
  if (Array.isArray(data)) return dedupeMembers(data)
  if (Array.isArray(data.members)) return dedupeMembers(data.members)
  if (Array.isArray(data.list)) return dedupeMembers(data.list)
  if (Array.isArray(data.items)) return dedupeMembers(data.items)
  if (Array.isArray(data.results)) return dedupeMembers(data.results)
  if (typeof data === "object") {
    const aggregated = Object.values(data).reduce((acc, value) => {
      if (Array.isArray(value)) acc.push(...value)
      else if (Array.isArray(value?.members)) acc.push(...value.members)
      return acc
    }, [])
    return dedupeMembers(aggregated)
  }
  return []
}

const normalizeMilestones = (payload) => {
  const data = unwrapApiData(payload)
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.milestones)) return data.milestones
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.results)) return data.results
  return []
}

const normalizeDepartments = (payload) => {
  const data = unwrapApiData(payload)
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.departments)) return data.departments
  if (Array.isArray(data.list)) return data.list
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.results)) return data.results
  return []
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

const parseMilestoneDate = (value) => {
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

export default function HoOCDashBoard() {
  const location = useLocation()
  const { eventId: paramEventId } = useParams()
  const { fetchEventRole } = useEvents()
  
  // State
  const [loading, setLoading] = useState(true)
  const [eventData, setEventData] = useState(null)
  const [members, setMembers] = useState([])
  const [milestones, setMilestones] = useState([])
  const [departments, setDepartments] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [eventRole, setEventRole] = useState("")
  const [hoveredDay, setHoveredDay] = useState(null)
  
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

        const [eventResponse, membersResponse, milestonesResponse, departmentsResponse, calendarsResponse] = await Promise.all([
          eventApi.getById(eventId),
          eventApi.getMembersByEvent(eventId),
          milestoneService.listMilestones(eventId, {
            sortBy: "targetDate",
            sortDir: "asc"
          }),
          departmentService.getDepartments(eventId),
          calendarService.getCalendarsByEventId(eventId)
        ])

        if (cancelled) return

        const eventPayload = unwrapApiData(eventResponse)
        setEventData(eventPayload?.event ?? eventPayload ?? null)

        setMembers(normalizeMembers(membersResponse))

        const milestoneList = normalizeMilestones(milestonesResponse)
        const sortedMilestones = milestoneList
          .slice()
          .sort((a, b) => {
            const da = parseMilestoneDate(a?.targetDate) || new Date(8640000000000000)
            const db = parseMilestoneDate(b?.targetDate) || new Date(8640000000000000)
            return da.getTime() - db.getTime()
          })
        setMilestones(sortedMilestones)

        setDepartments(normalizeDepartments(departmentsResponse))
        setCalendarEvents(normalizeCalendars(calendarsResponse))
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
  const totalDepartments = departments.length

  const budgetStats = useMemo(() => {
    let allocated = 0
    let spent = 0
    const items = []

    departments.forEach((dept) => {
      const name = dept?.name || "Ban chưa đặt tên"

      const budgetValue = Number(
        dept?.budget ??
        dept?.allocatedBudget ??
        dept?.budgetAllocated ??
        dept?.budgetEstimate ??
        dept?.totalBudget ??
        dept?.planBudget ??
        0
      ) || 0

      const spendingValue = Number(
        dept?.spent ??
        dept?.budgetSpent ??
        dept?.actualBudget ??
        dept?.actualSpending ??
        dept?.actualCost ??
        dept?.spending ??
        0
      ) || 0

      if (budgetValue > 0 || spendingValue > 0) {
        items.push({
          category: name,
          budget: Math.max(0, Math.round(budgetValue)),
          spending: Math.max(0, Math.round(spendingValue))
        })
      }

      allocated += Math.max(0, budgetValue)
      spent += Math.max(0, spendingValue)
    })

    const percent = allocated > 0
      ? Math.max(0, Math.min(100, Math.round((spent / allocated) * 100)))
      : null

    return {
      items,
      percent,
      allocated,
      spent
    }
  }, [departments])

  const { items: budgetItems, percent: budgetUsagePercent } = budgetStats
  const totalBudgetAllocated = budgetStats.allocated
  const totalBudgetSpent = budgetStats.spent
  const budgetUsageDisplay = budgetUsagePercent != null ? `${budgetUsagePercent}%` : "—"
  const budgetSummaryLabel = totalBudgetAllocated > 0
    ? `${totalBudgetSpent.toLocaleString("vi-VN")} / ${totalBudgetAllocated.toLocaleString("vi-VN")}`
    : "Chưa có dữ liệu"
  const budgetSpendingData = useMemo(() => budgetItems.slice(0, 4), [budgetItems])
  const budgetChartScale = useMemo(() => {
    if (!budgetSpendingData.length) return 1
    const maxValue = budgetSpendingData.reduce(
      (max, item) => Math.max(max, item.budget, item.spending),
      0
    )
    return maxValue > 0 ? 160 / maxValue : 1
  }, [budgetSpendingData])

  const majorTasks = useMemo(() => {
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
  }, [departments])

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
    const highlightedDays = new Set()

    calendarEvents.forEach((event) => {
      const startDate = parseCalendarEventStart(event)
      if (!startDate) return
      if (startDate.getFullYear() !== year || startDate.getMonth() !== month) return
      highlightedDays.add(startDate.getDate())
    })

    return baseDays.map((day) => ({
      ...day,
      highlight: highlightedDays.has(day.day)
    }))
  }, [calendarEvents])

  // Get events for a specific day
  const getEventsForDay = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const eventsWithDate = calendarEvents
      .map((event) => {
        const startDate = parseCalendarEventStart(event)
        return startDate ? { event, startDate } : null
      })
      .filter(Boolean)
      .filter(({ startDate }) => startDate.getFullYear() === year && startDate.getMonth() === month)
    
    return (day) => {
      if (!day) return []
      return eventsWithDate
        .filter(({ startDate }) => startDate.getDate() === day)
        .map(({ event }) => event)
    }
  }, [calendarEvents])

  const sidebarType = eventRole === 'Member' ? 'member' : eventRole === 'HoD' ? 'hod' : 'hooc'

  if (loading) {
    return (
      <UserLayout
        title="Dashboard tổng"
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

  if (!eventData) {
    return (
      <UserLayout
        title="Dashboard tổng"
        sidebarType={sidebarType}
        activePage="overview-dashboard"
        eventId={eventId}
      >
        <div className="alert alert-danger">Không tìm thấy sự kiện</div>
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
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
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
                      📅
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
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
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
                      ✓
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
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
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
                      👥
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
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
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
                      💰
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
            {/* Progress Section */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
                  <h6 className="fw-semibold mb-4" style={{ fontSize: "16px", color: "#1f2937" }}>
                    Công việc lớn của các ban
                  </h6>

                  {majorTasks.length > 0 ? (
                    majorTasks.map((task, index) => (
                      <div key={index} className={index !== majorTasks.length - 1 ? "mb-4" : ""}>
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
                            <span style={{ fontSize: "14px", color: "#374151" }}>{task.title}</span>
                          </div>
                          <span className="text-muted" style={{ fontSize: "12px" }}>
                            Deadline: {task.deadline}
                          </span>
                        </div>
                        <div className="d-flex align-items-center">
                          <div className="progress flex-grow-1" style={{ height: "8px" }}>
                            <div
                              className="progress-fill rounded"
                              style={{
                                width: `${task.progress}%`,
                                height: "100%",
                                backgroundColor: "#fbbf24",
                                transition: "width 0.3s ease"
                              }}
                            ></div>
                          </div>
                          <span className="text-muted ms-2" style={{ fontSize: "12px" }}>
                            {task.progress}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted py-4">
                      Chưa có dữ liệu công việc
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-4">
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
                              backgroundColor: "#ef4444",
                            }}
                          ></span>
                          <span className="text-muted" style={{ fontSize: "13px" }}>
                            Ngân sách
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <span
                            className="rounded-circle"
                            style={{
                              width: "8px",
                              height: "8px",
                              backgroundColor: "#991b1b",
                            }}
                          ></span>
                          <span className="text-muted" style={{ fontSize: "13px" }}>
                            Chi tiêu
                          </span>
                        </div>
                      </div>
                      <select className="form-select form-select-sm" style={{ fontSize: "13px", width: "auto" }}>
                        <option>Tháng này</option>
                      </select>
                    </div>
                  </div>

                  {budgetSpendingData.length > 0 ? (
                    <div className="d-flex align-items-end justify-content-around" style={{ height: "200px", marginTop: "20px" }}>
                      {budgetSpendingData.map((item, index) => (
                        <div key={index} className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
                          <div className="d-flex gap-1 align-items-end" style={{ height: "160px" }}>
                            <div
                              className="chart-bar rounded-top"
                              style={{
                                width: "32px",
                                height: `${Math.max(4, Math.round(item.budget * budgetChartScale))}px`,
                                backgroundColor: "#ef4444",
                                transition: "height 0.5s ease"
                              }}
                            ></div>
                            <div
                              className="chart-bar rounded-top"
                              style={{
                                width: "32px",
                                height: `${Math.max(4, Math.round(item.spending * budgetChartScale))}px`,
                                backgroundColor: "#991b1b",
                                transition: "height 0.5s ease"
                              }}
                            ></div>
                          </div>
                          <div className="text-muted mt-2" style={{ fontSize: "12px" }}>
                            {item.category}
                          </div>
                        </div>
                      ))}
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
                            const endDateCandidate =
                              event?.endAt ||
                              (event?.meetingDate && event?.endTime
                                ? `${event.meetingDate}T${event.endTime}`
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
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#fff4d6",
                        fontSize: "20px",
                      }}
                    >
                      🎃
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