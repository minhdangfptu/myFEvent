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
            <h2 className="hooc-task-statistic-page__title" style={{margin: 0}}>
              Thống kê chi tiết - {dept?.name || 'Unknown Department'}
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

        {/* KPI Cards - xài chung class với page */}
        <div style={{margin: "30px"}} className="hooc-task-statistic-page__kpi-section">
          <div className="hooc-task-statistic-page__kpi-card">
            <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--tasks">
              <i className="bi bi-list-task"></i>
            </div>
            <div className="hooc-task-statistic-page__kpi-content">
              <div className="hooc-task-statistic-page__kpi-label">Tổng số công việc</div>
              <div className="hooc-task-statistic-page__kpi-value">{dept?.totalTasks || 0}</div>
            </div>
          </div>
          <div className="hooc-task-statistic-page__kpi-card">
            <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--completed">
              <i className="bi bi-check-circle"></i>
            </div>
            <div className="hooc-task-statistic-page__kpi-content">
              <div className="hooc-task-statistic-page__kpi-label">Đã hoàn thành</div>
              <div className="hooc-task-statistic-page__kpi-value">
                {dept?.completedTasks || 0}/{dept?.totalTasksDetail || dept?.totalTasks || 0}
                <span style={{marginLeft: 8, fontSize: 14, color: '#28a745', fontWeight: 600}}>
                  ({dept?.completionRate || 0}%)
                </span>
              </div>
            </div>
          </div>
          <div className="hooc-task-statistic-page__kpi-card">
            <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--assigned">
              <i className="bi bi-briefcase"></i>
            </div>
            <div className="hooc-task-statistic-page__kpi-content">
              <div className="hooc-task-statistic-page__kpi-label">Còn lại</div>
              <div className="hooc-task-statistic-page__kpi-value">{dept?.remainingTasks || 0}</div>
            </div>
          </div>
          <div className="hooc-task-statistic-page__kpi-card">
            <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--completed">
              <i className="bi bi-person-check"></i>
            </div>
            <div className="hooc-task-statistic-page__kpi-content">
              <div className="hooc-task-statistic-page__kpi-label">Progress task còn lại</div>
              <div className="hooc-task-statistic-page__kpi-value">
                {dept?.remainingCompleted || dept?.completedTasks || 0}/{dept?.remainingTasks || dept?.totalTasks || 0}
                <span style={{marginLeft: 8, fontSize: 14, color: '#28a745', fontWeight: 600}}>
                  ({dept?.remainingCompletionRate || dept?.completionRate || 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Chart - biểu đồ và chú thích nằm cùng 1 hàng */}
        <div className="hooc-task-statistic-page__chart-section" style={{padding: '35px'}}>
          <div className="hooc-task-statistic-page__chart-content-wrapper" style={{display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: 0}}>
              <div className="hooc-task-statistic-page__chart-container" style={{marginBottom: 0}}>
                <h3 className="hooc-task-statistic-page__chart-title">
                  📊 Burnup - Tổng hợp tất cả task lớn {dept?.name || 'Unknown'}
                </h3>
                <svg 
                  className="hooc-task-statistic-page__svg-chart" 
                  viewBox="0 0 600 300" 
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* chart ... */}
                  <line x1="60" y1="250" x2="580" y2="250" stroke="#e0e0e0" strokeWidth="1" />
                  <line x1="60" y1="200" x2="580" y2="200" stroke="#f5f5f5" strokeWidth="1" />
                  <line x1="60" y1="150" x2="580" y2="150" stroke="#f5f5f5" strokeWidth="1" />
                  <line x1="60" y1="100" x2="580" y2="100" stroke="#f5f5f5" strokeWidth="1" />
                  <line x1="60" y1="50" x2="580" y2="50" stroke="#f5f5f5" strokeWidth="1" />
                  {/* Axes */}
                  <line x1="60" y1="30" x2="60" y2="260" stroke="#000" strokeWidth="2" />
                  <line x1="50" y1="250" x2="580" y2="250" stroke="#000" strokeWidth="2" />
                  {/* labels, polyline, circle ... */}
                  <text x="35" y="255" fontSize="12" textAnchor="end">0</text>
                  <text x="35" y="205" fontSize="12" textAnchor="end">10</text>
                  <text x="35" y="155" fontSize="12" textAnchor="end">20</text>
                  <text x="35" y="105" fontSize="12" textAnchor="end">30</text>
                  <text x="35" y="55" fontSize="12" textAnchor="end">40</text>
                  <polyline
                    points="60,240 125,238 190,235 255,230 320,225 385,220 450,215 515,212 580,210"
                    fill="none"
                    stroke="#4da6ff"
                    strokeWidth="3"
                  />
                  <polyline
                    points="60,250 125,242 190,225 255,195 320,165 385,140 450,120 515,110 580,105"
                    fill="none"
                    stroke="#2ecc71"
                    strokeWidth="3"
                  />
                  <circle cx="125" cy="242" r="4" fill="#2ecc71" />
                  <circle cx="190" cy="225" r="4" fill="#2ecc71" />
                  <circle cx="255" cy="195" r="4" fill="#2ecc71" />
                  <circle cx="320" cy="165" r="4" fill="#2ecc71" />
                  <circle cx="385" cy="140" r="4" fill="#2ecc71" />
                  <circle cx="450" cy="120" r="4" fill="#2ecc71" />
                  <circle cx="515" cy="110" r="4" fill="#2ecc71" />
                  <circle cx="580" cy="105" r="4" fill="#2ecc71" />
                  <polyline
                    points="60,250 125,240 190,220 255,188 320,155 385,125 450,100 515,82 580,70"
                    fill="none"
                    stroke="#cccccc"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
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
              </div>
            </div>
            {/* Legend ngang - cùng hàng với chart */}
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 32, minWidth: 320}}>
              <div className="hooc-task-statistic-page__chart-legend" style={{background: 'transparent', boxShadow: 'none', border: 'none', gap: 20, padding: 0, marginTop: 0}}>
                <div className="hooc-task-statistic-page__legend-item">
                  <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--planned"></span>
                  <span>Đường Scope - Tổng số công việc</span>
                </div>
                <div className="hooc-task-statistic-page__legend-item">
                  <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--actual"></span>
                  <span>Đường Thực tế – Task hoàn thành</span>
                </div>
                <div className="hooc-task-statistic-page__legend-item">
                  <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--ideal"></span>
                  <span>Đường Ước tính – Tốc độ dự kiến</span>
                </div>
              </div>
            </div>
          </div>
          {/* Giải thích và note phía dưới chart */}
          <div className="hooc-task-statistic-page__legend-section" style={{marginTop: 30}}>
            <h3 className="hooc-task-statistic-page__legend-title">
              Cách đọc biểu đồ
            </h3>
            <div className="hooc-task-statistic-page__legend-items" style={{display: 'flex', gap: 30, flexWrap: 'wrap'}}>
              <div className="hooc-task-statistic-page__legend-explanation-item">
                <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--scope"></span>
                <div>
                  <div className="hooc-task-statistic-page__legend-explanation-title">
                    Đường Scope - Tổng số công việc
                  </div>
                  <div className="hooc-task-statistic-page__legend-explanation-text">
                    Tổng số lượng công việc cần hoàn thành. Có thể tăng nếu thêm công việc.
                  </div>
                </div>
              </div>
              <div className="hooc-task-statistic-page__legend-explanation-item">
                <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--actual"></span>
                <div>
                  <div className="hooc-task-statistic-page__legend-explanation-title">
                    Đường Thực tế – Task hoàn thành
                  </div>
                  <div className="hooc-task-statistic-page__legend-explanation-text">
                    Số lượng công việc đã giải quyết theo thời gian.
                  </div>
                </div>
              </div>
              <div className="hooc-task-statistic-page__legend-explanation-item">
                <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--ideal"></span>
                <div>
                  <div className="hooc-task-statistic-page__legend-explanation-title">
                    Đường Ước tính – Tốc độ dự kiến
                  </div>
                  <div className="hooc-task-statistic-page__legend-explanation-text">
                    Ước tính tiến độ lý tưởng.
                  </div>
                </div>
              </div>
            </div>
            <div className="hooc-task-statistic-page__milestone-note" style={{background: '#fff8dc', borderLeft: '4px solid #ffc107', color: '#856404'}}>
              Nếu đường xanh lá nằm trên đường nét đứt → Tiến độ nhanh hơn dự kiến.<br />
              Nếu nằm dưới → Chậm tiến độ.
            </div>
          </div>
        </div>

        {/* Modal Footer - dùng style button giống page */}
        <div className="hooc-task-statistic-page__modal-footer">
          <button 
            className="hooc-task-statistic-page__detail-btn" 
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