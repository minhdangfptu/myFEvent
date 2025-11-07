"use client"

import { useEffect } from "react"
import UserLayout from "../../components/UserLayout"

// Major Tasks Data
const majorTasks = [
  {
    title: "Xây công sự kiện",
    progress: 75,
    deadline: "Hôm nay, 18:00",
  },
  {
    title: "Dựng gian hàng",
    progress: 45,
    deadline: "18/12, 18:00",
  },
]

// Budget vs Spending Data
const budgetSpendingData = [
  { category: "Hậu cần", budget: 60, spending: 50 },
  { category: "Game", budget: 90, spending: 85 },
  { category: "Takecare", budget: 130, spending: 130 },
  { category: "Media", budget: 150, spending: 145 },
]

// Calendar data for April - starts from Monday (T2)
const calendarDays = [
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5 },
  { day: 6 },
  { day: 7 },
  { day: 8 },
  { day: 9 },
  { day: 10 },
  { day: 11 },
  { day: 12 },
  { day: 13 },
  { day: 14 },
  { day: 15 },
  { day: 16 },
  { day: 17 },
  { day: 18 },
  { day: 19 },
  { day: 20 },
  { day: 21 },
  { day: 22, highlight: true },
  { day: 23, today: true },
  { day: 24, highlight: true },
  { day: 25 },
  { day: 26 },
  { day: 27 },
  { day: 28 },
  { day: 29 },
  { day: 30 },
]

// Event Timeline Data
const eventTimeline = [
  { name: "Setup", date: "15/10", completed: true },
  { name: "Prep", date: "25/10", completed: true },
  { name: "Decor", date: "30/10", completed: true },
  { name: "D-Day", date: "01/11", completed: false },
  { name: "Tổng kết", date: "04/11", completed: false },
]

export default function HoOCDashBoard() {
  useEffect(() => {
    // Add smooth animations on load
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
  }, [])

  return (
    <UserLayout title="Dashboard tổng" sidebarType="hooc" activePage="overview-dashboard">
      <div className="bg-light" style={{ minHeight: "100vh", padding: "20px" }}>
        <div className="container-fluid px-0" style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <h1 className="mb-4" style={{ color: "#ff5757", fontSize: "24px", fontWeight: 600 }}>
            Halloween 2024 - Dashboard tổng
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
                      +12%
                    </span>
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: "32px", color: "#1f2937" }}>
                    5
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
                    40
                  </div>
                  <div className="text-muted" style={{ fontSize: "13px" }}>
                    Công việc lớn
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
                    142
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
                    68%
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

                  {majorTasks.map((task, index) => (
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
                            }}
                          ></div>
                        </div>
                        <span className="text-muted ms-2" style={{ fontSize: "12px" }}>
                          {task.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
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
                            }}
                          ></div>
                          <div
                            className="chart-bar rounded-top"
                            style={{
                              width: "32px",
                              height: `${item.spending}px`,
                              backgroundColor: "#991b1b",
                            }}
                          ></div>
                        </div>
                        <div className="text-muted mt-2" style={{ fontSize: "12px" }}>
                          {item.category}
                        </div>
                      </div>
                    ))}
                  </div>
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
                      Tháng 4
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
                      {[
                        [1, 2, 3, 4, 5, 6, 7],
                        [8, 9, 10, 11, 12, 13, 14],
                        [15, 16, 17, 18, 19, 20, 21],
                        [22, 23, 24, 25, 26, 27, 28],
                        [29, 30, null, null, null, null, null],
                      ].map((week, weekIndex) => (
                        <tr key={weekIndex}>
                          {week.map((day, dayIndex) => {
                            const calDay = calendarDays.find((d) => d.day === day)
                            return (
                              <td
                                key={dayIndex}
                                className={`text-center ${
                                  calDay?.today ? "text-white rounded" : calDay?.highlight ? "fw-semibold" : ""
                                }`}
                                style={{
                                  fontSize: "13px",
                                  backgroundColor: calDay?.today
                                    ? "#dc2626"
                                    : calDay?.highlight
                                    ? "#fee2e2"
                                    : "transparent",
                                  color: calDay?.today ? "white" : calDay?.highlight ? "#dc2626" : "#374151",
                                  padding: "8px 4px",
                                }}
                              >
                                {day || ""}
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
                      Halloween 2024
                    </h6>
                    <button className="btn btn-danger btn-sm d-flex align-items-center gap-1" style={{ fontSize: "13px" }}>
                      Xem chi tiết →
                    </button>
                  </div>

                  {/* Progress Dots and Status */}
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div style={{ fontSize: "13px", color: "#6b7280" }}>Tiến độ</div>
                    <div className="d-flex gap-1">
                      {[true, true, true, false, false].map((active, index) => (
                        <span
                          key={index}
                          className="rounded-circle"
                          style={{
                            width: "10px",
                            height: "10px",
                            backgroundColor: active ? "#dc2626" : "#e5e7eb",
                          }}
                        ></span>
                      ))}
                    </div>
                    <span className="fw-semibold" style={{ fontSize: "13px", color: "#dc2626" }}>
                      3/5 hoàn thành
                    </span>
                  </div>

                  {/* Next Milestone */}
                  <div
                    className="d-flex align-items-center gap-2 mb-4 p-3 rounded-2"
                    style={{ backgroundColor: "#fef2f2" }}
                  >
                    <span style={{ color: "#dc2626", fontSize: "16px" }}>📅</span>
                    <span className="flex-grow-1" style={{ fontSize: "14px", color: "#374151", fontWeight: 500 }}>
                      Tiếp theo: D-Day
                    </span>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>(01/11)</span>
                  </div>

                  {/* Horizontal Timeline */}
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
                          width: "60%",
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  )
}