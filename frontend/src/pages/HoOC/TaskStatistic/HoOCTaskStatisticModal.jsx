import React from 'react';
import './HoOCTaskStatisticModal.css';
import './HoOCTaskStatisticPage.css';

export default function HoOCTaskStatisticModal({ show, dept, onClose }) {
  // ✅ Enhanced debugging and early returns
  console.log("Modal render called with:", { show, dept: dept ? dept.name : 'null', onClose: !!onClose });

  if (!show) {
    console.log("Modal not showing (show=false)");
    return null;
  }
  
  if (!dept) {
    console.log("Modal not showing (dept=null)", dept);
    return null;
  }

  console.log("✅ Rendering modal with dept:", dept);

  return (
    <div className="hooc-task-statistic-page__modal-overlay" onClick={onClose}>
      <div className="hooc-task-statistic-page__modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="hooc-task-statistic-page__modal-header">
          <div>
            <h2 className="hooc-task-statistic-page__modal-title">
              Burnup Chart - {dept?.name || 'Unknown Department'}
            </h2>
            <p className="hooc-task-statistic-page__modal-subtitle">
              Milestone: Chuẩn bị sự kiện tháng 12 | 01/12 - 21/12
            </p>
          </div>
          <button 
            className="hooc-task-statistic-page__modal-close-btn" 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Modal KPI Cards */}
        <div className="hooc-task-statistic-page__modal-kpi-section">
          <div className="hooc-task-statistic-page__modal-kpi-card">
            <div className="hooc-task-statistic-page__modal-kpi-icon hooc-task-statistic-page__modal-kpi-icon--blue">
              🔒
            </div>
            <div className="hooc-task-statistic-page__modal-kpi-content">
              <div className="hooc-task-statistic-page__modal-kpi-value">{dept?.totalTasks || 0}</div>
              <div className="hooc-task-statistic-page__modal-kpi-label">Tổng số task trong ban</div>
            </div>
          </div>

          <div className="hooc-task-statistic-page__modal-kpi-card">
            <div className="hooc-task-statistic-page__modal-kpi-icon hooc-task-statistic-page__modal-kpi-icon--green">
              ✓
            </div>
            <div className="hooc-task-statistic-page__modal-kpi-content">
              <div className="hooc-task-statistic-page__modal-kpi-value">
                {dept?.completedTasks || 0}/{dept?.totalTasksDetail || dept?.totalTasks || 0}
              </div>
              <div className="hooc-task-statistic-page__modal-kpi-label">Task đã hoàn thành</div>
              <div className="hooc-task-statistic-page__modal-kpi-badge hooc-task-statistic-page__modal-kpi-badge--green">
                {dept?.completionRate || 0}% hoàn thành
              </div>
            </div>
          </div>

          <div className="hooc-task-statistic-page__modal-kpi-card">
            <div className="hooc-task-statistic-page__modal-kpi-icon hooc-task-statistic-page__modal-kpi-icon--purple">
              📋
            </div>
            <div className="hooc-task-statistic-page__modal-kpi-content">
              <div className="hooc-task-statistic-page__modal-kpi-value">{dept?.remainingTasks || 0}</div>
              <div className="hooc-task-statistic-page__modal-kpi-label">Tổng số task còn lại</div>
            </div>
          </div>

          <div className="hooc-task-statistic-page__modal-kpi-card">
            <div className="hooc-task-statistic-page__modal-kpi-icon hooc-task-statistic-page__modal-kpi-icon--lightgreen">
              ✓
            </div>
            <div className="hooc-task-statistic-page__modal-kpi-content">
              <div className="hooc-task-statistic-page__modal-kpi-value">
                {dept?.remainingCompleted || dept?.completedTasks || 0}/{dept?.remainingTasks || dept?.totalTasks || 0}
              </div>
              <div className="hooc-task-statistic-page__modal-kpi-label">Progress task còn lại</div>
              <div className="hooc-task-statistic-page__modal-kpi-badge hooc-task-statistic-page__modal-kpi-badge--green">
                {dept?.remainingCompletionRate || dept?.completionRate || 0}% hoàn thành
              </div>
            </div>
          </div>
        </div>

        {/* Modal Chart and Legend */}
        <div className="hooc-task-statistic-page__modal-chart-section">
          <div className="hooc-task-statistic-page__modal-chart-container">
            <h3 className="hooc-task-statistic-page__modal-chart-title">
              📊 Burnup - Tổng hợp tất cả task lớn {dept?.name || 'Unknown'}
            </h3>

            <svg 
              className="hooc-task-statistic-page__modal-svg-chart" 
              viewBox="0 0 600 300" 
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid lines */}
              <line x1="60" y1="250" x2="580" y2="250" stroke="#e0e0e0" strokeWidth="1" />
              <line x1="60" y1="200" x2="580" y2="200" stroke="#f5f5f5" strokeWidth="1" />
              <line x1="60" y1="150" x2="580" y2="150" stroke="#f5f5f5" strokeWidth="1" />
              <line x1="60" y1="100" x2="580" y2="100" stroke="#f5f5f5" strokeWidth="1" />
              <line x1="60" y1="50" x2="580" y2="50" stroke="#f5f5f5" strokeWidth="1" />

              {/* Axes */}
              <line x1="60" y1="30" x2="60" y2="260" stroke="#000" strokeWidth="2" />
              <line x1="50" y1="250" x2="580" y2="250" stroke="#000" strokeWidth="2" />

              {/* Y-axis labels */}
              <text x="35" y="255" fontSize="12" textAnchor="end">0</text>
              <text x="35" y="205" fontSize="12" textAnchor="end">10</text>
              <text x="35" y="155" fontSize="12" textAnchor="end">20</text>
              <text x="35" y="105" fontSize="12" textAnchor="end">30</text>
              <text x="35" y="55" fontSize="12" textAnchor="end">40</text>

              {/* Scope line (blue) */}
              <polyline
                points="60,240 125,238 190,235 255,230 320,225 385,220 450,215 515,212 580,210"
                fill="none"
                stroke="#4da6ff"
                strokeWidth="3"
              />

              {/* Actual completion line (green) */}
              <polyline
                points="60,250 125,242 190,225 255,195 320,165 385,140 450,120 515,110 580,105"
                fill="none"
                stroke="#2ecc71"
                strokeWidth="3"
              />
              
              {/* Data points on green line */}
              <circle cx="125" cy="242" r="4" fill="#2ecc71" />
              <circle cx="190" cy="225" r="4" fill="#2ecc71" />
              <circle cx="255" cy="195" r="4" fill="#2ecc71" />
              <circle cx="320" cy="165" r="4" fill="#2ecc71" />
              <circle cx="385" cy="140" r="4" fill="#2ecc71" />
              <circle cx="450" cy="120" r="4" fill="#2ecc71" />
              <circle cx="515" cy="110" r="4" fill="#2ecc71" />
              <circle cx="580" cy="105" r="4" fill="#2ecc71" />

              {/* Ideal line (dashed) */}
              <polyline
                points="60,250 125,240 190,220 255,188 320,155 385,125 450,100 515,82 580,70"
                fill="none"
                stroke="#cccccc"
                strokeWidth="2"
                strokeDasharray="5,5"
              />

              {/* X-axis labels */}
              <text x="60" y="275" fontSize="11" textAnchor="middle">01/12</text>
              <text x="125" y="275" fontSize="11" textAnchor="middle">03/12</text>
              <text x="190" y="275" fontSize="11" textAnchor="middle">05/12</text>
              <text x="255" y="275" fontSize="11" textAnchor="middle">07/12</text>
              <text x="320" y="275" fontSize="11" textAnchor="middle">11/12</text>
              <text x="385" y="275" fontSize="11" textAnchor="middle">13/12</text>
              <text x="450" y="275" fontSize="11" textAnchor="middle">15/12</text>
              <text x="515" y="275" fontSize="11" textAnchor="middle">17/12</text>
              <text x="580" y="275" fontSize="11" textAnchor="middle">21/12</text>
            </svg>

            {/* Chart Legend Below */}
            <div className="hooc-task-statistic-page__modal-chart-legend">
              <div className="hooc-task-statistic-page__modal-legend-item">
                <span className="hooc-task-statistic-page__modal-legend-dot hooc-task-statistic-page__modal-legend-dot--scope"></span>
                <span>Scope</span>
              </div>
              <div className="hooc-task-statistic-page__modal-legend-item">
                <span className="hooc-task-statistic-page__modal-legend-dot hooc-task-statistic-page__modal-legend-dot--actual"></span>
                <span>Hoàn thành</span>
              </div>
              <div className="hooc-task-statistic-page__modal-legend-item">
                <span className="hooc-task-statistic-page__modal-legend-dot hooc-task-statistic-page__modal-legend-dot--ideal"></span>
                <span>Lý tưởng</span>
              </div>
            </div>
          </div>

          {/* Legend Explanation Side Panel */}
          <div className="hooc-task-statistic-page__modal-legend-panel">
            <h4 className="hooc-task-statistic-page__modal-legend-panel-title">Cách đọc biểu đồ</h4>
            
            <div className="hooc-task-statistic-page__modal-legend-section-title">
              📊 Các đường trong biểu đồ:
            </div>

            <div className="hooc-task-statistic-page__modal-legend-explanation">
              <div className="hooc-task-statistic-page__modal-legend-explanation-item">
                <span className="hooc-task-statistic-page__modal-legend-bullet hooc-task-statistic-page__modal-legend-bullet--blue">●</span>
                <div>
                  <strong>Đường xanh đường đậm (Scope):</strong>
                  <div>• Tổng số lượng công việc cần hoàn thành</div>
                  <div>• Có thể tăng lên nếu thêm công việc</div>
                </div>
              </div>

              <div className="hooc-task-statistic-page__modal-legend-explanation-item">
                <span className="hooc-task-statistic-page__modal-legend-bullet hooc-task-statistic-page__modal-legend-bullet--green">●</span>
                <div>
                  <strong>Đường xanh lá (Hoàn thành):</strong>
                  <div>• Số lượng công việc đã hoàn thành</div>
                  <div>• Chỉ tăng, không giảm</div>
                </div>
              </div>

              <div className="hooc-task-statistic-page__modal-legend-explanation-item">
                <span className="hooc-task-statistic-page__modal-legend-bullet hooc-task-statistic-page__modal-legend-bullet--gray">- -</span>
                <div>
                  <strong>Đường xám nét đứt (Lý tưởng):</strong>
                  <div>• Tiến độ hoàn thành dự đoán</div>
                  <div>• Đạng đề sở sánh theo lộ</div>
                </div>
              </div>

              <div className="hooc-task-statistic-page__modal-legend-explanation-item hooc-task-statistic-page__modal-legend-explanation-item--warning">
                <span className="hooc-task-statistic-page__modal-legend-bullet hooc-task-statistic-page__modal-legend-bullet--yellow">⚡</span>
                <div>
                  <strong>Phương cách so với - xanh đường = Việc còn lại</strong>
                </div>
              </div>
            </div>

            <div className="hooc-task-statistic-page__modal-legend-section-title">
              📈 Cách đánh giá tiến độ:
            </div>

            <div className="hooc-task-statistic-page__modal-legend-explanation">
              <div className="hooc-task-statistic-page__modal-legend-tip">
                <span className="hooc-task-statistic-page__modal-legend-tip-icon">✅</span>
                <div>
                  <strong>Xanh lá TRÊN xám:</strong> Việc xong + Tiến bộ nhanh
                </div>
              </div>
              <div className="hooc-task-statistic-page__modal-legend-tip">
                <span className="hooc-task-statistic-page__modal-legend-tip-icon">📊</span>
                <div>
                  <strong>Xanh lá DƯỚI xám:</strong> Chậm tiến độ
                </div>
              </div>
              <div className="hooc-task-statistic-page__modal-legend-tip">
                <span className="hooc-task-statistic-page__modal-legend-tip-icon">⚠️</span>
                <div>
                  <strong>Xanh lá DƯỚI nhiều:</strong> Cần điều chỉnh lộ trình
                </div>
              </div>
            </div>

            <div className="hooc-task-statistic-page__modal-legend-section-title">
              🎯 Điểm cần lưu ý:
            </div>

            <div className="hooc-task-statistic-page__modal-legend-notes">
              <div className="hooc-task-statistic-page__modal-legend-note">
                🔴 Đoạn phẳng = Không có tiến độ
              </div>
              <div className="hooc-task-statistic-page__modal-legend-note">
                🔵 Xanh đượng tăng = Thêm công việc mới
              </div>
              <div className="hooc-task-statistic-page__modal-legend-note">
                🟡 Xanh lá tăng đều = Velocity ổn định
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="hooc-task-statistic-page__modal-footer">
          <button 
            className="hooc-task-statistic-page__modal-close-footer-btn" 
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}