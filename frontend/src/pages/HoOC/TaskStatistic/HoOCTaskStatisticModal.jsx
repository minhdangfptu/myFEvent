import React from "react";
import "./HoOCTaskStatisticModal.css";
import "./HoOCTaskStatisticPage.css";

export default function HoOCTaskStatisticModal({ show, dept, onClose }) {
  if (!show || !dept) return null;

  const totalTasks = dept?.totalTasks || 0;
  const completedTasks = dept?.completedTasks || 0;
  const remainingTasks = dept?.remainingTasks || 0;
  const completionRate = dept?.completionRate || 0;

  return (
    <div
      className="hooc-task-statistic-page__modal-overlay"
      onClick={onClose}
    >
      <div
        className="hooc-task-statistic-page__modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header giống page */}
        <div className="hooc-task-statistic-page__modal-header">
          <div>
            <h2 className="hooc-task-statistic-page__title">
              Tiến độ ban: {dept?.name || "Không xác định"}
            </h2>
            <p className="hooc-task-statistic-page__modal-subtitle">
              Thống kê chi tiết công việc của ban trong milestone hiện tại.
            </p>
          </div>
          <button
            className="hooc-task-statistic-page__modal-close-btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* KPI Cards – dùng style giống page */}
        <div className="hooc-task-statistic-page__kpi-section">
          <div className="hooc-task-statistic-page__kpi-card">
            <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--tasks">
              <i className="bi bi-list-task" />
            </div>
            <div className="hooc-task-statistic-page__kpi-content">
              <div className="hooc-task-statistic-page__kpi-label">
                Tổng số công việc
              </div>
              <div className="hooc-task-statistic-page__kpi-value">
                {totalTasks} task
              </div>
            </div>
          </div>

          <div className="hooc-task-statistic-page__kpi-card">
            <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--tasks">
              <i className="bi bi-check-circle" />
            </div>
            <div className="hooc-task-statistic-page__kpi-content">
              <div className="hooc-task-statistic-page__kpi-label">
                Công việc đã hoàn thành
              </div>
              <div className="hooc-task-statistic-page__kpi-value">
                {completedTasks}/{totalTasks} ({completionRate}%)
              </div>
            </div>
          </div>

          <div className="hooc-task-statistic-page__kpi-card">
            <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--completed">
              <i className="bi bi-arrow-repeat" />
            </div>
            <div className="hooc-task-statistic-page__kpi-content">
              <div className="hooc-task-statistic-page__kpi-label">
                Công việc còn lại
              </div>
              <div className="hooc-task-statistic-page__kpi-value">
                {remainingTasks} task
              </div>
            </div>
          </div>

        </div>

        {/* Chart + legend – tái sử dụng layout / style của page */}
        <div className="hooc-task-statistic-page__chart-section">
          <div className="hooc-task-statistic-page__chart-container">
            <h3 className="hooc-task-statistic-page__chart-title">
              Biểu đồ Burnup - Ban: {dept?.name || "Không xác định"}
            </h3>
            <p className="hooc-task-statistic-page__chart-subtitle">
              Minh họa tiến độ công việc lớn theo thời gian cho ban này
              (demo tĩnh, chưa gắn dữ liệu thật).
            </p>

            <div className="hooc-task-statistic-page__chart-content-wrapper">
              <svg
                className="hooc-task-statistic-page__svg-chart"
                viewBox="0 0 600 300"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid lines */}
                <line
                  x1="60"
                  y1="250"
                  x2="580"
                  y2="250"
                  stroke="#e0e0e0"
                  strokeWidth="1"
                />
                <line
                  x1="60"
                  y1="200"
                  x2="580"
                  y2="200"
                  stroke="#f5f5f5"
                  strokeWidth="1"
                />
                <line
                  x1="60"
                  y1="150"
                  x2="580"
                  y2="150"
                  stroke="#f5f5f5"
                  strokeWidth="1"
                />
                <line
                  x1="60"
                  y1="100"
                  x2="580"
                  y2="100"
                  stroke="#f5f5f5"
                  strokeWidth="1"
                />
                <line
                  x1="60"
                  y1="50"
                  x2="580"
                  y2="50"
                  stroke="#f5f5f5"
                  strokeWidth="1"
                />

                {/* Axes */}
                <line
                  x1="60"
                  y1="30"
                  x2="60"
                  y2="260"
                  stroke="#000"
                  strokeWidth="2"
                />
                <line
                  x1="50"
                  y1="250"
                  x2="580"
                  y2="250"
                  stroke="#000"
                  strokeWidth="2"
                />

                {/* Y-axis labels */}
                <text x="35" y="255" fontSize="12" textAnchor="end">
                  0
                </text>
                <text x="35" y="205" fontSize="12" textAnchor="end">
                  20
                </text>
                <text x="35" y="155" fontSize="12" textAnchor="end">
                  40
                </text>
                <text x="35" y="105" fontSize="12" textAnchor="end">
                  60
                </text>

                {/* Actual line (green) */}
                <polyline
                  points="60,240 113,235 166,208 219,175 272,120 325,70 378,45 431,42 484,40 537,40"
                  fill="none"
                  stroke="#2ecc71"
                  strokeWidth="2"
                />

                {/* Planned / Scope line (blue) */}
                <polyline
                  points="60,240 113,236 166,225 219,205 272,165 325,95 378,55 431,50 484,45 537,42"
                  fill="none"
                  stroke="#4da6ff"
                  strokeWidth="2"
                />

                {/* X-axis labels */}
                <text x="60" y="275" fontSize="12" textAnchor="middle">
                  11/30
                </text>
                <text x="113" y="275" fontSize="12" textAnchor="middle">
                  12/03
                </text>
                <text x="166" y="275" fontSize="12" textAnchor="middle">
                  12/06
                </text>
                <text x="219" y="275" fontSize="12" textAnchor="middle">
                  12/09
                </text>
                <text x="272" y="275" fontSize="12" textAnchor="middle">
                  12/12
                </text>
                <text x="325" y="275" fontSize="12" textAnchor="middle">
                  12/15
                </text>
                <text x="378" y="275" fontSize="12" textAnchor="middle">
                  12/18
                </text>
                <text x="431" y="275" fontSize="12" textAnchor="middle">
                  12/21
                </text>
              </svg>

              {/* Legend giống page – chỉ còn 2 đường */}
              <div className="hooc-task-statistic-page__chart-legend">
                <div className="hooc-task-statistic-page__legend-item">
                  <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--planned" />
                  <span>Đường Scope - Tổng số công việc</span>
                </div>
                <div className="hooc-task-statistic-page__legend-item">
                  <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--actual" />
                  <span>Đường Thực tế – Task hoàn thành</span>
                </div>
              </div>
            </div>
          </div>

          {/* Giải thích legend giống page */}
            <div className="hooc-task-statistic-page__legend-section">
              <h3 className="hooc-task-statistic-page__legend-title">
                Cách đọc biểu đồ
              </h3>

              <div className="hooc-task-statistic-page__legend-items">
                <div className="hooc-task-statistic-page__legend-explanation-item">
                  <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--scope" />
                  <div>
                    <div className="hooc-task-statistic-page__legend-explanation-title">
                      Đường Scope - Tổng số công việc
                    </div>
                    <div className="hooc-task-statistic-page__legend-explanation-text">
                      Tổng số lượng công việc cần hoàn thành. Có thể tăng nếu
                      thêm công việc.
                    </div>
                  </div>
                </div>

                <div className="hooc-task-statistic-page__legend-explanation-item">
                  <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--actual" />
                  <div>
                    <div className="hooc-task-statistic-page__legend-explanation-title">
                      Đường Thực tế – Task hoàn thành
                    </div>
                    <div className="hooc-task-statistic-page__legend-explanation-text">
                      Số lượng công việc đã giải quyết theo thời gian.
                    </div>
                  </div>
                </div>
              </div>

              <div className="hooc-task-statistic-page__milestone-note">
                So sánh hai đường: nếu đường hoàn thành (màu xanh lá) tiến gần
                hoặc bằng đường Scope thì tiến độ tốt; nếu thấp hơn nhiều thì
                đang chậm tiến độ.
              </div>
            </div>
        </div>

        {/* Footer */}
        <div className="hooc-task-statistic-page__modal-footer">
          <button
            className="hooc-task-statistic-page__modal-close-footer-btn"
            onClick={onClose}
            style={{background: '#e74c3c', marginLeft: 12}}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}