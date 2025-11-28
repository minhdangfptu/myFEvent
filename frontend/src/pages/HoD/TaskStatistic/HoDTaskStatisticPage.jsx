import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./HoDTaskStatisticPage.css";
import UserLayout from "~/components/UserLayout";
import { taskApi } from "~/apis/taskApi";
import { milestoneApi } from "~/apis/milestoneApi";
import { departmentApi } from "~/apis/departmentApi";
import Loading from "~/components/Loading";
import { CheckCircle } from "lucide-react";


export default function HoDTaskStatisticPage() {
  const { eventId } = useParams();
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [memberWorkload, setMemberWorkload] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 6;

  // Fetch milestones
  useEffect(() => {
    if (!eventId) return;

    const fetchMilestones = async () => {
      try {
        const response = await milestoneApi.listMilestonesByEvent(eventId);
        const milestoneList = response?.data || response || [];
        setMilestones(milestoneList);

        if (milestoneList.length > 0) {
          setSelectedMilestoneId(milestoneList[0]._id || milestoneList[0].id);
        }
      } catch (error) {
        console.error("Error fetching milestones:", error);
      }
    };

    fetchMilestones();
  }, [eventId]);

  // Fetch department statistics
  useEffect(() => {
    if (!eventId || !selectedMilestoneId) return;

    const fetchDepartmentStatistics = async () => {
      try {
        setLoading(true);
        
        // Get current user's department info
        const deptResponse = await departmentApi.getCurrentUserDepartment(eventId);
        setDepartmentInfo(deptResponse?.data);
        
        const departmentId = deptResponse?.data?._id;
        
        if (departmentId) {
          // Get department task statistics
          const statsResponse = await taskApi.getDepartmentTaskStatistics(
            eventId,
            departmentId,
            selectedMilestoneId
          );
          setStatistics(statsResponse?.data || statsResponse);

          // Get member workload
          const workloadResponse = await taskApi.getDepartmentMemberWorkload(
            eventId,
            departmentId,
            selectedMilestoneId
          );
          setMemberWorkload(workloadResponse?.data || workloadResponse || []);
        }
      } catch (error) {
        console.error("Error fetching department statistics:", error);
        setStatistics(null);
        setMemberWorkload([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartmentStatistics();
  }, [eventId, selectedMilestoneId]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  // Get selected milestone info
  const selectedMilestone = milestones.find(
    (m) => (m._id || m.id) === selectedMilestoneId
  );

  // Pagination for member workload
  const totalPages = Math.ceil(memberWorkload.length / membersPerPage);
  const currentMembers = memberWorkload.slice(
    (currentPage - 1) * membersPerPage,
    currentPage * membersPerPage
  );

  // Handle no milestones
  if (milestones.length === 0 && !loading) {
    return (
      <UserLayout
        title="Thống kê công việc"
        activePage="work-statistics"
        sidebarType="HoD"
        eventId={eventId}
      >
        <div className="hod-task-statistic-page">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <h2>Không có milestone nào trong sự kiện này</h2>
            <p>Vui lòng tạo milestone trước khi xem thống kê.</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title="Thống kê công việc"
      activePage="work-statistics"
      sidebarType="HoD"
      eventId={eventId}
    >
      <div className="hod-task-statistic-page">
        {/* Header Section */}
        <div className="hod-task-statistic-page__header">
          <h1 className="hod-task-statistic-page__title">
            Thống kê công việc {departmentInfo?.name || "Ban"}
          </h1>

          {/* Filter Controls */}
          <div className="hod-task-statistic-page__filters">
            <div className="hod-task-statistic-page__filter-item">
              <span className="hod-task-statistic-page__filter-label">📍 Milestone:</span>
              <select
                className="hod-task-statistic-page__milestone-select"
                value={selectedMilestoneId}
                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                disabled={milestones.length === 0}
              >
                {milestones.length === 0 && (
                  <option value="">Đang tải milestones...</option>
                )}
                {milestones.map((m) => (
                  <option key={m._id || m.id} value={m._id || m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedMilestone && (
              <>
                <div className="hod-task-statistic-page__filter-item">
                  <span className="hod-task-statistic-page__filter-info">
                    📅 {formatDate(selectedMilestone.startDate)} → {formatDate(selectedMilestone.targetDate)} (Deadline)
                  </span>
                </div>

                {statistics?.milestone?.remainingDays !== null && 
                 statistics?.milestone?.remainingDays !== undefined && (
                  <div className="hod-task-statistic-page__filter-item">
                    <span className="hod-task-statistic-page__filter-info hod-task-statistic-page__filter-info--days">
                      ⏰ Còn {statistics.milestone.remainingDays} ngày
                    </span>
                  </div>
                )}

                <div className="hod-task-statistic-page__filter-item">
                  <span className="hod-task-statistic-page__filter-info hod-task-statistic-page__filter-info--progress">
                    📊 Tiến độ tổng: {statistics?.milestone?.overallProgress || 0}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="hod-task-statistic-page__loading">
            <Loading size={40} />
            <p>Đang tải dữ liệu thống kê...</p>
          </div>
        )}

        {/* Main Content */}
        {!loading && selectedMilestoneId && statistics && (
          <>
            {/* Task Selection */}
            <div className="hod-task-statistic-page__task-selection">
              <label htmlFor="task-filter" className="hod-task-statistic-page__task-label">
                Chọn task to
              </label>
              <select 
                id="task-filter" 
                className="hod-task-statistic-page__task-select"
                defaultValue="all"
              >
                <option value="all">Tổng hợp tất cả task to</option>
                {statistics?.majorTasks?.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>

            {/* KPI Cards */}
            <div className="hod-task-statistic-page__kpi-section">
              <div className="hod-task-statistic-page__kpi-card hod-task-statistic-page__kpi-card--total">
                <div className="hod-task-statistic-page__kpi-icon">
                  <i className="bi bi-list-task"></i>
                </div>
                <div className="hod-task-statistic-page__kpi-content">
                  <div className="hod-task-statistic-page__kpi-value">
                    {statistics?.summary?.totalTasks || 0}
                  </div>
                  <div className="hod-task-statistic-page__kpi-label">
                    Tổng số task tôn trong ban
                  </div>
                </div>
              </div>

              <div className="hod-task-statistic-page__kpi-card hod-task-statistic-page__kpi-card--completed">
                <div className="hod-task-statistic-page__kpi-icon">
                  <CheckCircle size={18} />
                </div>
                <div className="hod-task-statistic-page__kpi-content">
                  <div className="hod-task-statistic-page__kpi-value">
                    {statistics?.summary?.completedTasks || 0}/{statistics?.summary?.totalTasks || 0}
                  </div>
                  <div className="hod-task-statistic-page__kpi-label">
                    Task đã hoàn thành
                  </div>
                  <div className="hod-task-statistic-page__kpi-percentage">
                    {Math.round(((statistics?.summary?.completedTasks || 0) / (statistics?.summary?.totalTasks || 1)) * 100)}% hoàn thành
                  </div>
                </div>
              </div>

              <div className="hod-task-statistic-page__kpi-card hod-task-statistic-page__kpi-card--assigned">
                <div className="hod-task-statistic-page__kpi-icon">
                  <i className="bi bi-clipboard-check"></i>
                </div>
                <div className="hod-task-statistic-page__kpi-content">
                  <div className="hod-task-statistic-page__kpi-value">
                    {statistics?.summary?.totalAssignedTasks || 0}
                  </div>
                  <div className="hod-task-statistic-page__kpi-label">
                    Tổng số task con
                  </div>
                </div>
              </div>

              <div className="hod-task-statistic-page__kpi-card hod-task-statistic-page__kpi-card--progress">
                <div className="hod-task-statistic-page__kpi-icon">
                  <i className="bi bi-graph-up"></i>
                </div>
                <div className="hod-task-statistic-page__kpi-content">
                  <div className="hod-task-statistic-page__kpi-value">
                    {statistics?.summary?.completedAssignedTasks || 0}/{statistics?.summary?.totalAssignedTasks || 0}
                  </div>
                  <div className="hod-task-statistic-page__kpi-label">
                    Task con đã hoàn thành
                  </div>
                  <div className="hod-task-statistic-page__kpi-percentage">
                    {Math.round(((statistics?.summary?.completedAssignedTasks || 0) / (statistics?.summary?.totalAssignedTasks || 1)) * 100)}% hoàn thành
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="hod-task-statistic-page__chart-section">
              <div className="hod-task-statistic-page__chart-container">
                <h3 className="hod-task-statistic-page__chart-title">
                  Burnup — Tổng hợp tất cả task nhỏ của ban
                </h3>
                <div className="hod-task-statistic-page__chart-subtitle">
                  Scope: {statistics?.summary?.totalTasks || 0} • Đã hoàn thành: {statistics?.summary?.completedTasks || 0}
                </div>

                <div className="hod-task-statistic-page__chart-wrapper">
                  <div className="hod-task-statistic-page__chart-content">
                    {/* SVG Chart */}
                    <svg
                      className="hod-task-statistic-page__svg-chart"
                      viewBox="0 0 500 250"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {/* Grid lines */}
                      <line x1="50" y1="200" x2="450" y2="200" stroke="#e0e0e0" strokeWidth="1" />
                      <line x1="50" y1="160" x2="450" y2="160" stroke="#f5f5f5" strokeWidth="1" />
                      <line x1="50" y1="120" x2="450" y2="120" stroke="#f5f5f5" strokeWidth="1" />
                      <line x1="50" y1="80" x2="450" y2="80" stroke="#f5f5f5" strokeWidth="1" />
                      <line x1="50" y1="40" x2="450" y2="40" stroke="#f5f5f5" strokeWidth="1" />

                      {/* Axes */}
                      <line x1="50" y1="20" x2="50" y2="210" stroke="#333" strokeWidth="2" />
                      <line x1="40" y1="200" x2="450" y2="200" stroke="#333" strokeWidth="2" />

                      {/* Y-axis labels */}
                      <text x="35" y="205" fontSize="10" textAnchor="end">0</text>
                      <text x="35" y="165" fontSize="10" textAnchor="end">10</text>
                      <text x="35" y="125" fontSize="10" textAnchor="end">20</text>
                      <text x="35" y="85" fontSize="10" textAnchor="end">30</text>
                      <text x="35" y="45" fontSize="10" textAnchor="end">40</text>

                      {/* Sample lines */}
                      {/* Scope line (blue) */}
                      <polyline
                        points="50,180 100,175 150,160 200,150 250,140 300,130 350,120 400,110 450,100"
                        fill="none"
                        stroke="#4285f4"
                        strokeWidth="2"
                      />

                      {/* Actual completion line (green) */}
                      <polyline
                        points="50,190 100,185 150,175 200,165 250,150 300,135 350,120 400,105 450,90"
                        fill="none"
                        stroke="#34a853"
                        strokeWidth="2"
                      />

                      {/* Ideal line (dashed) */}
                      <polyline
                        points="50,190 450,80"
                        fill="none"
                        stroke="#fbbc05"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />

                      {/* X-axis labels */}
                      <text x="50" y="220" fontSize="10" textAnchor="middle">01/12</text>
                      <text x="100" y="220" fontSize="10" textAnchor="middle">03/12</text>
                      <text x="150" y="220" fontSize="10" textAnchor="middle">05/12</text>
                      <text x="200" y="220" fontSize="10" textAnchor="middle">07/12</text>
                      <text x="250" y="220" fontSize="10" textAnchor="middle">09/12</text>
                      <text x="300" y="220" fontSize="10" textAnchor="middle">11/12</text>
                      <text x="350" y="220" fontSize="10" textAnchor="middle">13/12</text>
                      <text x="400" y="220" fontSize="10" textAnchor="middle">15/12</text>
                      <text x="450" y="220" fontSize="10" textAnchor="middle">17/12</text>
                    </svg>
                  </div>

                  {/* Chart Legend */}
                  <div className="hod-task-statistic-page__chart-legend">
                    <h4 className="hod-task-statistic-page__legend-title">Các đọc biểu đồ</h4>
                    
                    <div className="hod-task-statistic-page__legend-item">
                      <div className="hod-task-statistic-page__legend-color hod-task-statistic-page__legend-color--scope"></div>
                      <div className="hod-task-statistic-page__legend-content">
                        <div className="hod-task-statistic-page__legend-label">Đường Scope — Tổng số task</div>
                        <div className="hod-task-statistic-page__legend-description">
                          Tổng số lượng task cần hoàn thành. Có thể tăng nếu thêm task.
                        </div>
                      </div>
                    </div>

                    <div className="hod-task-statistic-page__legend-item">
                      <div className="hod-task-statistic-page__legend-color hod-task-statistic-page__legend-color--actual"></div>
                      <div className="hod-task-statistic-page__legend-content">
                        <div className="hod-task-statistic-page__legend-label">Đường Thực tế — Task hoàn thành</div>
                        <div className="hod-task-statistic-page__legend-description">
                          Số lượng task đã giải quyết theo thời gian.
                        </div>
                      </div>
                    </div>

                    <div className="hod-task-statistic-page__legend-item">
                      <div className="hod-task-statistic-page__legend-color hod-task-statistic-page__legend-color--ideal"></div>
                      <div className="hod-task-statistic-page__legend-content">
                        <div className="hod-task-statistic-page__legend-label">Đường Ước tính — Tốc độ dự kiến</div>
                        <div className="hod-task-statistic-page__legend-description">
                          Ước tính tiến độ lý tưởng.
                        </div>
                      </div>
                    </div>

                    <div className="hod-task-statistic-page__legend-note">
                      <div className="hod-task-statistic-page__legend-milestone">
                        <span className="hod-task-statistic-page__legend-milestone-icon">📍</span>
                        Nếu đường xanh lá nằm trên đường nét đứt → Tiến độ nhanh hơn dự kiến.<br />
                        Nếu nằm dưới → Chậm tiến độ.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Workload Section */}
            <div className="hod-task-statistic-page__workload-section">
              <div className="hod-task-statistic-page__workload-header">
                <h3 className="hod-task-statistic-page__workload-title">Ai đang nhiều việc?</h3>
                <div className="hod-task-statistic-page__pagination">
                  <button 
                    className="hod-task-statistic-page__pagination-btn"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    ❮
                  </button>
                  <span className="hod-task-statistic-page__pagination-info">
                    {currentPage}/{totalPages}
                  </span>
                  <button 
                    className="hod-task-statistic-page__pagination-btn"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    ❯
                  </button>
                </div>
              </div>

              <div className="hod-task-statistic-page__member-grid">
                {currentMembers.length > 0 ? (
                  currentMembers.map((member, index) => (
                    <div key={member.memberId || index} className="hod-task-statistic-page__member-card">
                      <div className="hod-task-statistic-page__member-avatar">
                        <img 
                          src={member.avatar || "/default-avatar.png"} 
                          alt={member.name}
                          className="hod-task-statistic-page__member-img"
                        />
                      </div>
                      <div className="hod-task-statistic-page__member-info">
                        <div className="hod-task-statistic-page__member-name">{member.name}</div>
                        <div className="hod-task-statistic-page__member-tasks">{member.totalTasks || 0} task</div>
                      </div>
                      <div className="hod-task-statistic-page__member-progress">
                        <div 
                          className="hod-task-statistic-page__member-progress-bar"
                          style={{ 
                            width: `${Math.min(100, (member.totalTasks || 0) * 10)}%`,
                            backgroundColor: member.totalTasks > 8 ? '#ff6b6b' : member.totalTasks > 5 ? '#ffd93d' : '#6bcf7f'
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="hod-task-statistic-page__no-members">
                    <p>Không có dữ liệu thành viên</p>
                  </div>
                )}
              </div>

              {memberWorkload.length > 0 && (
                <div className="hod-task-statistic-page__workload-note">
                  Màu đỏ = &gt;8 task • Màu vàng = 6-8 task • Màu xanh = &lt;6 task • Tiêu chuẩn: Một mỗi thành viên chỉ nên làm tối đa 5 task.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </UserLayout>
  );
}