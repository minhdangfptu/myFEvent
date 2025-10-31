"use client"

import { useState } from "react"
import UserLayout from "../../components/UserLayout"

// Task Completion Chart Data
const taskCompletionData = [
  { name: "T2", "Lý thuyết": 50, "Thực tế": 50 },
  { name: "T3", "Lý thuyết": 45, "Thực tế": 48 },
  { name: "T4", "Lý thuyết": 40, "Thực tế": 42 },
  { name: "T5", "Lý thuyết": 35, "Thực tế": 38 },
  { name: "T6", "Lý thuyết": 30, "Thực tế": 32 },
  { name: "T7", "Lý thuyết": 25, "Thực tế": 28 },
  { name: "CN", "Lý thuyết": 15, "Thực tế": 18 },
]

// Budget Chart Data
const budgetData = [
  { name: "Tuần 1", "Ngân sách": 25, "Chi tiêu": 20 },
  { name: "Tuần 2", "Ngân sách": 30, "Chi tiêu": 25 },
  { name: "Tuần 3", "Ngân sách": 35, "Chi tiêu": 30 },
  { name: "Tuần 4", "Ngân sách": 40, "Chi tiêu": 38 },
]

// Recent Activities Data
const activities = [
  {
    name: "Nguyễn Minh Anh",
    action: 'đã hoàn thành task "Thiết kế poster"',
    time: "2 giờ trước",
    color: "#00897b",
  },
  {
    name: "Trần Văn B",
    action: 'đã tạo sự kiện mới "Workshop React"',
    time: "4 giờ trước",
    color: "#f57c00",
  },
  {
    name: "Lê Thị C",
    action: 'đã cập nhật ngân sách cho sự kiện "FPT Techday"',
    time: "6 giờ trước",
    color: "#f9a825",
  },
]

// Upcoming Tasks Data
const tasks = [
  {
    title: "Hoàn thiện kế hoạch marketing",
    date: "Hôm nay, 18:00",
    status: "Khẩn cấp",
    statusColor: "#e63946",
    statusBgColor: "#ffe0e0",
  },
  {
    title: "Review nội dung workshop",
    date: "Mai, 10:00",
    status: "Cấp",
    statusColor: "#f9a825",
    statusBgColor: "#fff9e6",
  },
  {
    title: "Chuẩn bị tài liệu hướng dẫn",
    date: "25/10/2024",
    status: "Thường",
    statusColor: "#666",
    statusBgColor: "#f0f0f0",
  },
]

export default function HoOCDashBoard() {
  const [taskPeriod, setTaskPeriod] = useState("7days")
  const [budgetPeriod, setBudgetPeriod] = useState("month")

  const cardStyle = { boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #e0e0e0" }

  const StatCard = ({ icon, iconBg, value, label, trend, trendColor }) => (
    <div className="card" style={cardStyle}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: iconBg,
              width: "40px",
              height: "40px",
              borderRadius: "4px",
              fontSize: "20px",
            }}
          >
            {icon}
          </div>
          <span style={{ color: trendColor, fontWeight: 600, fontSize: "14px" }}>{trend}</span>
        </div>
        <h5 className="fw-bold mb-2">{value}</h5>
        <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
          {label}
        </p>
      </div>
    </div>
  )

  return (
    <UserLayout title="Dashboard tổng" sidebarType="hooc" activePage="overview-dashboard">
      <div className="bg-light min-vh-100 py-4">
        <div className="container-lg">
          {/* Header */}
          <h1 className="text-danger fw-bold mb-4" style={{ fontSize: "28px" }}>
            Halloween 2024 - Dashboard tổng
          </h1>

          {/* KPI Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-md-3">
              <StatCard icon="📋" iconBg="#fce4ec" value="24" label="Cót mục sự kiện" trend="+12%" trendColor="#4caf50" />
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <StatCard
                icon="✓"
                iconBg="#e0f2f1"
                value="186"
                label="Công việc hoàn thành"
                trend="+8%"
                trendColor="#4caf50"
              />
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <StatCard
                icon="👥"
                iconBg="#ffe0b2"
                value="142"
                label="Thành viên tham gia"
                trend="+5%"
                trendColor="#4caf50"
              />
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <StatCard
                icon="$"
                iconBg="#fff9c4"
                value="68%"
                label="Ngân sách đã sử dụng"
                trend="-3%"
                trendColor="#e63946"
              />
            </div>
          </div>

          {/* Charts Section */}
          <div className="row g-3 mb-4">
            {/* Task Completion Chart */}
            <div className="col-12 col-md-6">
              <div className="card" style={cardStyle}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-semibold mb-0">Tiến độ hoàn thành công việc</h6>
                    <select
                      value={taskPeriod}
                      onChange={(e) => setTaskPeriod(e.target.value)}
                      className="form-select"
                      style={{ width: "120px" }}
                    >
                      <option value="7days">7 ngày qua</option>
                      <option value="30days">30 ngày qua</option>
                    </select>
                  </div>
                  <div style={{ height: "300px", overflowY: "auto" }}>
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                          <th style={{ fontSize: "12px", fontWeight: 600, color: "#666" }}>Ngày</th>
                          <th style={{ fontSize: "12px", fontWeight: 600, color: "#666" }}>Lý thuyết</th>
                          <th style={{ fontSize: "12px", fontWeight: 600, color: "#666" }}>Thực tế</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskCompletionData.map((item, index) => (
                          <tr key={index} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ fontSize: "13px", fontWeight: 600, width: "30px" }}>{item.name}</td>
                            <td>
                              <div className="progress" style={{ height: "20px", backgroundColor: "#f0f0f0" }}>
                                <div
                                  className="progress-bar"
                                  style={{
                                    width: `${item["Lý thuyết"]}%`,
                                    backgroundColor: "#ccc",
                                    fontSize: "11px",
                                    lineHeight: "20px",
                                  }}
                                >
                                  {item["Lý thuyết"]}%
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="progress" style={{ height: "20px", backgroundColor: "#f0f0f0" }}>
                                <div
                                  className="progress-bar"
                                  style={{
                                    width: `${item["Thực tế"]}%`,
                                    backgroundColor: "#e63946",
                                    fontSize: "11px",
                                    lineHeight: "20px",
                                  }}
                                >
                                  {item["Thực tế"]}%
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Chart */}
            <div className="col-12 col-md-6">
              <div className="card" style={cardStyle}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-semibold mb-0">Ngân sách vs Chi tiêu</h6>
                    <select
                      value={budgetPeriod}
                      onChange={(e) => setBudgetPeriod(e.target.value)}
                      className="form-select"
                      style={{ width: "120px" }}
                    >
                      <option value="month">Tháng này</option>
                      <option value="quarter">Quý này</option>
                    </select>
                  </div>
                  <div
                    style={{ height: "300px", display: "flex", flexDirection: "column", justifyContent: "space-around" }}
                  >
                    {budgetData.map((item, index) => (
                      <div key={index}>
                        <div className="d-flex justify-content-between mb-2">
                          <span style={{ fontSize: "13px", fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: "12px", color: "#666" }}>
                            Ngân sách: {item["Ngân sách"]} | Chi tiêu: {item["Chi tiêu"]}
                          </span>
                        </div>
                        <div className="d-flex gap-2">
                          <div className="flex-grow-1">
                            <div className="progress" style={{ height: "24px", backgroundColor: "#f0f0f0" }}>
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${(item["Ngân sách"] / 50) * 100}%`,
                                  backgroundColor: "#f8a5c0",
                                  fontSize: "11px",
                                  lineHeight: "24px",
                                }}
                              >
                                {item["Ngân sách"]}
                              </div>
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="progress" style={{ height: "24px", backgroundColor: "#f0f0f0" }}>
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${(item["Chi tiêu"] / 50) * 100}%`,
                                  backgroundColor: "#c41e3a",
                                  fontSize: "11px",
                                  lineHeight: "24px",
                                }}
                              >
                                {item["Chi tiêu"]}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity and Tasks Section */}
          <div className="row g-3">
            {/* Recent Activity */}
            <div className="col-12 col-md-6">
              <div className="card" style={cardStyle}>
                <div className="card-body">
                  <h6 className="fw-semibold mb-3">Hoạt động gần đây</h6>
                  <div className="d-flex flex-column gap-3">
                    {activities.map((activity, index) => (
                      <div key={index} className="d-flex gap-2">
                        <div
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "50%",
                            backgroundColor: activity.color,
                            flexShrink: 0,
                            marginTop: "4px",
                          }}
                        />
                        <div>
                          <p className="mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>
                            {activity.name} {activity.action}
                          </p>
                          <p className="text-muted mb-0" style={{ fontSize: "12px" }}>
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="col-12 col-md-6">
              <div className="card" style={cardStyle}>
                <div className="card-body">
                  <h6 className="fw-semibold mb-3">Công việc sắp tới hạn</h6>
                  <div className="d-flex flex-column gap-2">
                    {tasks.map((task, index) => (
                      <div
                        key={index}
                        className="d-flex justify-content-between align-items-center p-2"
                        style={{ backgroundColor: "#f8f9fa", borderRadius: "4px" }}
                      >
                        <div>
                          <p className="mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>
                            {task.title}
                          </p>
                          <p className="text-muted mb-0" style={{ fontSize: "12px" }}>
                            Hạn: {task.date}
                          </p>
                        </div>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: task.statusBgColor,
                            color: task.statusColor,
                            fontWeight: 600,
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                            marginLeft: "10px",
                          }}
                        >
                          {task.status}
                        </span>
                      </div>
                    ))}
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