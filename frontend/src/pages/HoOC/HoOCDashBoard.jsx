"use client"

import { useEffect, useState } from "react"
import { useParams, useLocation } from "react-router-dom"
import UserLayout from "../../components/UserLayout"
import { eventApi } from "../../apis/eventApi"
import { milestoneService } from "../../services/milestoneService"
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
  const [eventRole, setEventRole] = useState("")
  
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

    const fetchData = async () => {
      try {
        setLoading(true)
        
  // Fetch event details
  const eventResponse = await eventApi.getById(eventId)
  // Normalize: backend responses often wrap payload as { data: <event> } or { data: { event } }
  const fetchedEvent = eventResponse?.data?.event || eventResponse?.data || eventResponse || null
  setEventData(fetchedEvent)

        // Fetch members
        const membersResponse = await eventApi.getMembersByEvent(eventId)
        const membersData = membersResponse.data || []
        // Flatten members from department structure
        const flatMembers = []
        Object.values(membersData).forEach(deptMembers => {
          if (Array.isArray(deptMembers)) {
            flatMembers.push(...deptMembers)
          }
        })
        setMembers(flatMembers)

        // Fetch milestones
        const milestonesResponse = await milestoneService.listMilestones(eventId, {
          sortBy: 'targetDate',
          sortDir: 'asc'
        })
        setMilestones(milestonesResponse.data || [])

        // Fetch departments
        const departmentsResponse = await eventApi.getDepartments(eventId)
        setDepartments(departmentsResponse.data || [])

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalMembers = members.length
  const totalDepartments = departments.length
  const budgetUsed = 68 // This would come from budget API when available

  // Prepare timeline data from milestones (max 5)
  const eventTimeline = milestones.slice(0, 5).map(milestone => ({
    name: milestone.name,
    date: formatDate(milestone.targetDate),
    completed: milestone.status === 'completed'
  }))

  // Prepare major tasks (mock for now - would come from task API)
  const majorTasks = departments.slice(0, 2).map(dept => ({
    title: dept.name,
    progress: Math.floor(Math.random() * 100), // Would calculate from real task progress
    deadline: "Đang cập nhật"
  }))

  // Prepare budget data (mock for now - would come from budget API)
  const budgetSpendingData = departments.slice(0, 4).map(dept => ({
    category: dept.name,
    budget: 100 + Math.floor(Math.random() * 50),
    spending: 80 + Math.floor(Math.random() * 40)
  }))

  // Calendar data (current month)
  const calendarDays = generateCalendarDays()

  const sidebarType = eventRole === 'Member' ? 'member' : eventRole === 'HoD' ? 'hod' : 'hooc'

  if (loading) {
    return (
      <UserLayout
        title="Dashboard tổng"
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
    <UserLayout title="Dashboard tổng" sidebarType={sidebarType} activePage="overview-dashboard" eventId={eventId}>
      <div className="bg-light" style={{ minHeight: "100vh", padding: "20px" }}>
        <div className="container-fluid px-0" style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <h1 className="mb-4" style={{ color: "#ff5757", fontSize: "24px", fontWeight: 600 }}>
            {eventData.name} - Dashboard tổng
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
                    <span className="fw-semibold" style={{ fontSize: "13px", color: "#10b981" }}>
                      {completedMilestones > 0 ? `+${Math.round((completedMilestones/totalMilestones)*100)}%` : '0%'}
                    </span>
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
                    <span className="fw-semibold" style={{ fontSize: "13px", color: "#10b981" }}>
                      +8%
                    </span>
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
                    <span className="fw-semibold" style={{ fontSize: "13px", color: "#10b981" }}>
                      +5%
                    </span>
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
                    <span className="fw-semibold" style={{ fontSize: "13px", color: "#ef4444" }}>
                      -3%
                    </span>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "32px", color: "#1f2937" }}>
                    {budgetUsed}%
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
                                height: `${item.budget}px`,
                                backgroundColor: "#ef4444",
                                transition: "height 0.5s ease"
                              }}
                            ></div>
                            <div
                              className="chart-bar rounded-top"
                              style={{
                                width: "32px",
                                height: `${item.spending}px`,
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
                                    : dayData?.highlight
                                    ? "#fee2e2"
                                    : "transparent",
                                  color: dayData?.today ? "white" : dayData?.highlight ? "#dc2626" : "#374151",
                                  padding: "8px 4px",
                                }}
                              >
                                {dayData?.day || ""}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-4 pt-3 border-top">
                    <div className="fw-semibold mb-1" style={{ fontSize: "13px", color: "#374151" }}>
                      Review tiến độ ban
                    </div>
                    <div className="text-muted" style={{ fontSize: "13px" }}>
                      18:00 mai
                    </div>
                  </div>
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
                            width: `${(completedMilestones / totalMilestones) * 100}%`,
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