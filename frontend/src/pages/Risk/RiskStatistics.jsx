"use client"

import { useState } from "react"

export default function RiskStatisticsPage() {
  const [currentPage, setCurrentPage] = useState(1)

  const riskLogData = [
    {
      date: "15/03/2024",
      team: "Ban Truyền thông",
      issue: "Máy chiếu không hoạt động trong buổi khai mạc",
      priority: "Cao",
      recommendation: "Sử dụng máy chiếu dự phòng",
      lessonLearned: "Cần kiểm tra thiết bị trước",
      status: "Đã xử lý",
    },
    {
      date: "16/03/2024",
      team: "Ban Hậu cần",
      issue: "Thiếu nước uống cho khách tham dự",
      priority: "Trung bình",
      recommendation: "Mua thêm nước trước buổi sự kiện",
      lessonLearned: "Dự đoán được 30% số lượng khách",
      status: "Đã xử lý",
    },
    {
      date: "17/03/2024",
      team: "Ban Kỹ thuật",
      issue: "Sự cố âm thanh phản hồi trong phần thuyết trình",
      priority: "Trung bình",
      recommendation: "Điều chỉnh vi tơ micro và loa",
      lessonLearned: "Check trước một buổi",
      status: "Đã xử lý",
    },
    {
      date: "18/03/2024",
      team: "Ban Nội dung",
      issue: "Diễn giả chiều hôm tham gia vào phút chót",
      priority: "Cao",
      recommendation: "Một diễn giả dự phòng thay thế",
      lessonLearned: "Liên hệ có backup speaker",
      status: "Đã xử lý",
    },
    {
      date: "19/03/2024",
      team: "Ban Hậu cần",
      issue: "Tác nghiệm giao thông ánh hưởng đến thời gian đến venue",
      priority: "Thấp",
      recommendation: "Thông báo cho khách đến sớm hơn",
      lessonLearned: "Không tin traffic trước",
      status: "Đã xử lý",
    },
    {
      date: "20/03/2024",
      team: "Ban Truyền thông",
      issue: "Lỗi kết nối WiFi ảnh hưởng đến livestream",
      priority: "Cao",
      recommendation: "Chuyển sang sử dụng 4G backup",
      lessonLearned: "Thêm Lesson Learned",
      status: "Đang xử lý",
    },
  ]

  const itemsPerPage = 6
  const totalPages = Math.ceil(riskLogData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const visibleData = riskLogData.slice(startIndex, startIndex + itemsPerPage)

  const getPriorityColor = (priority) => {
    const colors = {
      Cao: "#ef4444",
      "Trung bình": "#f59e0b",
      Thấp: "#10b981",
    }
    return colors[priority] || "#6b7280"
  }

  return (
    <div className="p-4" style={{ backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="mb-1" style={{ fontSize: "24px", fontWeight: "600" }}>
            Bảng tổng kết rút ro - Sau sự kiện
          </h1>
          <p className="text-muted mb-0">Tổng quan và phân tích chi tiết rủi ro sau sự kiện</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-success d-flex align-items-center gap-2">
            <i className="bi bi-file-earmark-excel"></i>
            Xuất Excel
          </button>
          <button className="btn btn-danger d-flex align-items-center gap-2">
            <i className="bi bi-file-earmark-pdf"></i>
            Xuất PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row mb-4">
        <div className="col-md-6 col-lg-2.4 mb-3">
          <div className="card border-0" style={{ backgroundColor: "#f0f4ff" }}>
            <div className="card-body">
              <p className="text-muted small mb-2">Tổng số rủi ro</p>
              <h3 className="mb-0" style={{ color: "#4f46e5" }}>
                47
              </h3>
              <div className="mt-2" style={{ fontSize: "20px" }}>
                ⚠️
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-2.4 mb-3">
          <div className="card border-0" style={{ backgroundColor: "#f0fdf4" }}>
            <div className="card-body">
              <p className="text-muted small mb-2">Đã xử lý / Chưa xử lý</p>
              <h3 className="mb-0" style={{ color: "#10b981" }}>
                42<span style={{ color: "#ef4444" }}>/5</span>
              </h3>
              <div className="mt-2" style={{ fontSize: "20px" }}>
                ✓
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-2.4 mb-3">
          <div className="card border-0" style={{ backgroundColor: "#fef2f2" }}>
            <div className="card-body">
              <p className="text-muted small mb-2">Rủi ro bất ngờ</p>
              <h3 className="mb-0" style={{ color: "#ef4444" }}>
                12
              </h3>
              <div className="mt-2" style={{ fontSize: "20px" }}>
                ⚡
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-2.4 mb-3">
          <div className="card border-0" style={{ backgroundColor: "#faf5ff" }}>
            <div className="card-body">
              <p className="text-muted small mb-2">Thời gian xử lý TB</p>
              <h3 className="mb-0" style={{ color: "#a855f7" }}>
                2.3<span style={{ fontSize: "16px" }}>h</span>
              </h3>
              <div className="mt-2" style={{ fontSize: "20px" }}>
                ⏱️
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-2.4 mb-3">
          <div className="card border-0" style={{ backgroundColor: "#fffbeb" }}>
            <div className="card-body">
              <p className="text-muted small mb-2">% Có Lesson Learned</p>
              <h3 className="mb-0" style={{ color: "#f59e0b" }}>
                89<span style={{ fontSize: "18px" }}>%</span>
              </h3>
              <div className="mt-2" style={{ fontSize: "20px" }}>
                💡
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        {/* Pie Chart */}
        <div className="col-lg-6 mb-3">
          <div className="card border-0">
            <div className="card-body">
              <h5 className="card-title mb-3">% Rủi ro đã dự đoán trước</h5>
              <div className="d-flex justify-content-center">
                <svg width="300" height="300" viewBox="0 0 300 300">
                  <circle
                    cx="150"
                    cy="150"
                    r="120"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="80"
                    strokeDasharray="226.2 301.59"
                    transform="rotate(-90 150 150)"
                  />
                  <circle
                    cx="150"
                    cy="150"
                    r="120"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="80"
                    strokeDasharray="75.4 301.59"
                    strokeDashoffset="-226.2"
                    transform="rotate(-90 150 150)"
                  />
                  <text x="150" y="140" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3b82f6">
                    Đã dự đoán trước
                  </text>
                  <text x="150" y="160" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#3b82f6">
                    74.5%
                  </text>
                  <text x="150" y="200" textAnchor="middle" fontSize="14" fill="#ef4444">
                    Bất ngờ 25.5%
                  </text>
                </svg>
              </div>
              <div className="mt-3 d-flex justify-content-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: "12px", height: "12px", backgroundColor: "#3b82f6", borderRadius: "2px" }}></div>
                  <small>Đã dự đoán trước</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: "12px", height: "12px", backgroundColor: "#ef4444", borderRadius: "2px" }}></div>
                  <small>Bất ngờ</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="col-lg-6 mb-3">
          <div className="card border-0">
            <div className="card-body">
              <h5 className="card-title mb-3">Tần suất xây ra các rủi ro</h5>
              <div
                style={{ height: "250px", display: "flex", flexDirection: "column", justifyContent: "space-around" }}
              >
                {[
                  { label: "Tác nghiệm giao thông", value: 3 },
                  { label: "Sự cố âm thanh feedback", value: 4 },
                  { label: "Thiết bị sự cố hư hỏng", value: 5 },
                  { label: "Thiếu hụt về tài nguyên", value: 6 },
                  { label: "Dẫn dắt họp phối hợp", value: 7 },
                  { label: "Thiết bị kỹ thuật gặp vấn đề", value: 8 },
                ].map((item, idx) => (
                  <div key={idx} className="d-flex align-items-center gap-3">
                    <div style={{ width: "140px", fontSize: "12px", textAlign: "right", color: "#6b7280" }}>
                      {item.label}
                    </div>
                    <div style={{ flex: 1, backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{ width: `${(item.value / 8) * 100}%`, height: "20px", backgroundColor: "#3b82f6" }}
                      ></div>
                    </div>
                    <div style={{ width: "20px", fontSize: "12px", color: "#6b7280" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stacked Bar Chart */}
      <div className="card border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Số lượng vấn đề xây ra theo ban</h5>
          <div
            style={{
              height: "300px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              gap: "20px",
            }}
          >
            {[
              { name: "Ban Truyền thông", predicted: 8, unexpected: 2 },
              { name: "Ban Nội dung", predicted: 9, unexpected: 1 },
              { name: "Ban Hậu cần", predicted: 7, unexpected: 3 },
              { name: "Ban Kỹ thuật", predicted: 6, unexpected: 2 },
              { name: "Ban Tế chúc", predicted: 5, unexpected: 1 },
            ].map((team, idx) => (
              <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "100%", height: "200px", display: "flex", flexDirection: "column-reverse" }}>
                  <div
                    style={{
                      height: `${(team.predicted / 10) * 200}px`,
                      backgroundColor: "#3b82f6",
                      marginTop: `${(team.unexpected / 10) * 200}px`,
                    }}
                  ></div>
                  <div style={{ height: `${(team.unexpected / 10) * 200}px`, backgroundColor: "#ef4444" }}></div>
                </div>
                <small className="mt-2" style={{ fontSize: "12px", color: "#6b7280" }}>
                  {team.name}
                </small>
              </div>
            ))}
          </div>
          <div className="mt-3 d-flex justify-content-center gap-4">
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: "12px", height: "12px", backgroundColor: "#ef4444", borderRadius: "2px" }}></div>
              <small>Bất ngờ</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: "12px", height: "12px", backgroundColor: "#3b82f6", borderRadius: "2px" }}></div>
              <small>Đã dự đoán</small>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Log Table */}
      <div className="card border-0">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">Nhật ký rủi ro chi tiết</h5>
            <div className="d-flex gap-2">
              <select className="form-select form-select-sm" style={{ width: "120px" }}>
                <option>Tất cả ban</option>
              </select>
              <select className="form-select form-select-sm" style={{ width: "120px" }}>
                <option>Tất cả loại</option>
              </select>
              <select className="form-select form-select-sm" style={{ width: "120px" }}>
                <option>Tất cả trạng thái</option>
              </select>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Tìm kiếm..."
                style={{ width: "150px" }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table table-sm mb-0">
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Ngày</th>
                  <th style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Ban</th>
                  <th style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Mô tả rủi ro</th>
                  <th style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Ảnh hưởng</th>
                  <th style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Hành động đã thực hiện</th>
                  <th style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Lesson Learned</th>
                  <th style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {visibleData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ fontSize: "12px", color: "#374151" }}>{row.date}</td>
                    <td style={{ fontSize: "12px", color: "#374151" }}>{row.team}</td>
                    <td style={{ fontSize: "12px", color: "#374151", maxWidth: "200px" }}>{row.issue}</td>
                    <td>
                      <span
                        className="badge"
                        style={{ backgroundColor: getPriorityColor(row.priority), color: "white", fontSize: "11px" }}
                      >
                        {row.priority}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: "#374151" }}>{row.recommendation}</td>
                    <td style={{ fontSize: "12px" }}>
                      <div
                        style={{
                          backgroundColor: "#dbeafe",
                          color: "#0284c7",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          display: "inline-block",
                        }}
                      >
                        {row.lessonLearned}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          color: row.status === "Đã xử lý" ? "#10b981" : "#f59e0b",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        {row.status === "Đã xử lý" ? "✓" : "⏳"} {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">Hiển thị 1-6 trong 47 kết quả</small>
            <nav aria-label="Page navigation">
              <ul className="pagination mb-0">
                <li className="page-item">
                  <button className="page-link" onClick={() => setCurrentPage(1)}>
                    Trước
                  </button>
                </li>
                {[1, 2, 3].map((page) => (
                  <li key={page} className={`page-item ${currentPage === page ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setCurrentPage(page)}>
                      {page}
                    </button>
                  </li>
                ))}
                <li className="page-item">
                  <button className="page-link">Sau</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}
