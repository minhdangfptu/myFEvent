import React, { useState } from 'react';
import './HoOCTaskStatisticPage.css';
import UserLayout from '~/components/UserLayout';

export default function HoOCTaskStatisticPage() {
  const [selectedTeam, setSelectedTeam] = useState(null);

  const teamData = [
    { id: 1, name: 'Ban Hậu cần', tasksAssigned: '8/10', tasksRemaining: '18/24', progress: 80 },
    { id: 2, name: 'Ban Kỹ thuật', tasksAssigned: '7/8', tasksRemaining: '15/20', progress: 87.5 },
    { id: 3, name: 'Ban Tài chính', tasksAssigned: '6/7', tasksRemaining: '12/15', progress: 85.7 },
    { id: 4, name: 'Ban Truyền thông', tasksAssigned: '5/8', tasksRemaining: '10/18', progress: 62.5 },
    { id: 5, name: 'Ban Nội dung', tasksAssigned: '4/8', tasksRemaining: '8/12', progress: 66.7 },
  ];

  const chartData = [
    { date: '11/30', planned: 2, actual: 2, ideal: 0 },
    { date: '12/03', planned: 5, actual: 5, ideal: 5 },
    { date: '12/06', planned: 15, actual: 15, ideal: 15 },
    { date: '12/09', planned: 25, actual: 28, ideal: 30 },
    { date: '12/12', planned: 40, actual: 45, ideal: 45 },
    { date: '12/15', planned: 48, actual: 50, ideal: 50 },
    { date: '12/18', planned: 52, actual: 51, ideal: 52 },
    { date: '12/21', planned: 56, actual: 56, ideal: 56 },
  ];

  return (
    <UserLayout
      title="Thống kê công việc toàn sư kiện"
      activePage="work-statitics"
      sidebarType="HoOC"
    >
    <div className="hooc-task-statistic-page">
      {/* Header Section */}
      <div className="hooc-task-statistic-page__header">
        <h1 className="hooc-task-statistic-page__title">Thống kê công việc toàn sư kiện</h1>
        
        {/* Filter Controls */}
        <div className="hooc-task-statistic-page__filters">
          <div className="hooc-task-statistic-page__filter-item">
            <button className="hooc-task-statistic-page__milestone-btn">
              📌 Milestone: Chuẩn bị sự kiện tháng 12
            </button>
          </div>
          <div className="hooc-task-statistic-page__filter-item">
            <span className="hooc-task-statistic-page__date-range">01/12 - 21/12 (Deadline)</span>
          </div>
          <div className="hooc-task-statistic-page__filter-item">
            <span className="hooc-task-statistic-page__remaining-days">Còn 16 ngày</span>
          </div>
          <div className="hooc-task-statistic-page__filter-item">
            <span className="hooc-task-statistic-page__completion-rate">Tiến độ tổng: 77%</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="hooc-task-statistic-page__kpi-section">
        <div className="hooc-task-statistic-page__kpi-card">
          <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--tasks">
          <i class="bi bi-list-task"></i>
          </div>
          <div className="hooc-task-statistic-page__kpi-content">
            <div className="hooc-task-statistic-page__kpi-label">Tổng task lớn</div>
            <div className="hooc-task-statistic-page__kpi-value">39 task</div>
          </div>
        </div>

        <div className="hooc-task-statistic-page__kpi-card">
          <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--completed">
            ✓
          </div>
          <div className="hooc-task-statistic-page__kpi-content">
            <div className="hooc-task-statistic-page__kpi-label">Đã hoàn thành</div>
            <div className="hooc-task-statistic-page__kpi-value">30/39 (77%)</div>
          </div>
        </div>
      </div>

      {/* Team Progress Section */}
      <div className="hooc-task-statistic-page__team-section">
        <h2 className="hooc-task-statistic-page__section-title">Tiến độ theo ban</h2>
        
        <div className="hooc-task-statistic-page__table-wrapper">
          <table className="hooc-task-statistic-page__table">
            <thead>
              <tr className="hooc-task-statistic-page__table-header-row">
                <th className="hooc-task-statistic-page__table-header-cell hooc-task-statistic-page__table-header-cell--team">
                  Tên ban
                </th>
                <th className="hooc-task-statistic-page__table-header-cell">Công việc lớn</th>
                <th className="hooc-task-statistic-page__table-header-cell">Số công việc lớn còn lại</th>
                <th className="hooc-task-statistic-page__table-header-cell">Tiến độ</th>
                <th className="hooc-task-statistic-page__table-header-cell">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {teamData.map((team) => (
                <tr key={team.id} className="hooc-task-statistic-page__table-body-row">
                  <td className="hooc-task-statistic-page__table-body-cell hooc-task-statistic-page__table-body-cell--team">
                    <span className="hooc-task-statistic-page__team-dot"></span>
                    {team.name}
                  </td>
                  <td className="hooc-task-statistic-page__table-body-cell">{team.tasksAssigned}</td>
                  <td className="hooc-task-statistic-page__table-body-cell">{team.tasksRemaining}</td>
                  <td className="hooc-task-statistic-page__table-body-cell">
                    <div className="hooc-task-statistic-page__progress-container">
                      <div 
                        className="hooc-task-statistic-page__progress-bar" 
                        style={{ width: `${team.progress}%` }}
                      ></div>
                    </div>
                    <span className="hooc-task-statistic-page__progress-text">{team.progress}%</span>
                  </td>
                  <td className="hooc-task-statistic-page__table-body-cell">
                    <button className="hooc-task-statistic-page__detail-btn">
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Burnup Chart Section */}
      <div className="hooc-task-statistic-page__chart-section">
        <div className="hooc-task-statistic-page__chart-container">
          <h3 className="hooc-task-statistic-page__chart-title">
            Biểu độ Burnup - Milestone: Chuẩn bị sự kiện tháng 12
          </h3>
          <p className="hooc-task-statistic-page__chart-subtitle">
            Tiến độ tất cả công việc lớn theo thời gian
          </p>

          <div className="hooc-task-statistic-page__chart-content-wrapper">
            <svg 
              className="hooc-task-statistic-page__svg-chart" 
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
            <text x="35" y="205" fontSize="12" textAnchor="end">20</text>
            <text x="35" y="155" fontSize="12" textAnchor="end">40</text>
            <text x="35" y="105" fontSize="12" textAnchor="end">60</text>

            {/* Ideal line (dashed) */}
            <polyline
              points="60,240 113,238 166,210 219,180 272,128 325,80 378,52 431,50 484,50 537,50"
              fill="none"
              stroke="#00d4aa"
              strokeWidth="2"
              strokeDasharray="5,5"
            />

            {/* Actual line (blue) */}
            <polyline
              points="60,240 113,235 166,208 219,175 272,120 325,70 378,45 431,42 484,40 537,40"
              fill="none"
              stroke="#1e90ff"
              strokeWidth="2"
            />

            {/* Planned line (blue lighter) */}
            <polyline
              points="60,240 113,236 166,225 219,205 272,165 325,95 378,55 431,50 484,45 537,42"
              fill="none"
              stroke="#4da6ff"
              strokeWidth="2"
            />

            {/* X-axis labels */}
            <text x="60" y="275" fontSize="12" textAnchor="middle">11/30</text>
            <text x="113" y="275" fontSize="12" textAnchor="middle">12/03</text>
            <text x="166" y="275" fontSize="12" textAnchor="middle">12/06</text>
            <text x="219" y="275" fontSize="12" textAnchor="middle">12/09</text>
            <text x="272" y="275" fontSize="12" textAnchor="middle">12/12</text>
            <text x="325" y="275" fontSize="12" textAnchor="middle">12/15</text>
            <text x="378" y="275" fontSize="12" textAnchor="middle">12/18</text>
            <text x="431" y="275" fontSize="12" textAnchor="middle">12/21</text>
            </svg>

            {/* Chart Legend - Bên phải biểu đồ */}
            <div className="hooc-task-statistic-page__chart-legend">
              <div className="hooc-task-statistic-page__legend-item">
                <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--planned"></span>
                <span>Đường Scope - Tổng số task</span>
              </div>
              <div className="hooc-task-statistic-page__legend-item">
                <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--actual"></span>
                <span>Đường Thực tế – Task hoàn thành</span>
              </div>
              <div className="hooc-task-statistic-page__legend-item">
                <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--ideal"></span>
                <span>Đường Ước tính – Tốc độ dự kiến</span>
              </div>
              <div className="hooc-task-statistic-page__legend-item">
                <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--milestone"></span>
                <span>Mốc Milestone</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend Explanation */}
        <div className="hooc-task-statistic-page__legend-section">
          <h3 className="hooc-task-statistic-page__legend-title">Cách đọc biểu độ</h3>
          
          <div className="hooc-task-statistic-page__legend-items">
            <div className="hooc-task-statistic-page__legend-explanation-item">
              <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--scope"></span>
              <div>
                <div className="hooc-task-statistic-page__legend-explanation-title">Đường Scope - Tổng số task</div>
                <div className="hooc-task-statistic-page__legend-explanation-text">
                  Tổng số lượng task cần hoàn thành. Có thể tăng nếu thêm task.
                </div>
              </div>
            </div>

            <div className="hooc-task-statistic-page__legend-explanation-item">
              <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--actual"></span>
              <div>
                <div className="hooc-task-statistic-page__legend-explanation-title">Đường Thực tế – Task hoàn thành</div>
                <div className="hooc-task-statistic-page__legend-explanation-text">
                  Số lượng task đã giải quyết theo thời gian.
                </div>
              </div>
            </div>

            <div className="hooc-task-statistic-page__legend-explanation-item">
              <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--ideal"></span>
              <div>
                <div className="hooc-task-statistic-page__legend-explanation-title">Đường Ước tính – Tốc độ dự kiến</div>
                <div className="hooc-task-statistic-page__legend-explanation-text">
                  Ước tính tiến độ lý tưởng.
                </div>
              </div>
            </div>

            <div className="hooc-task-statistic-page__legend-explanation-item hooc-task-statistic-page__legend-explanation-item--milestone">
              <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--milestone"></span>
              <div>
                <div className="hooc-task-statistic-page__legend-explanation-title">Mốc Milestone</div>
                <div className="hooc-task-statistic-page__legend-explanation-text">
                  Đánh dấu ngày deadline.
                </div>
              </div>
            </div>
          </div>

          <div className="hooc-task-statistic-page__milestone-note">
            Nếu đường xanh lá nằm trên đường nét đứt → Tiến độ nhanh hơn dự kiến.<br />
            Nếu nằm dưới → Chậm tiến độ.
          </div>
        </div>
      </div>
    </div>
    </UserLayout>
  );
}
