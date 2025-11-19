
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./HoOCTaskStatisticPage.css";
import UserLayout from "~/components/UserLayout";
import { taskApi } from "~/apis/taskApi";
import { milestoneApi } from "~/apis/milestoneApi";
import Loading from "~/components/Loading";
import HoOCTaskStatisticModal from "./HoOCTaskStatisticModal";

const MainBurnupChart = ({ data, milestone, width = 580, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        width, 
        height: 300,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        background: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Chưa có dữ liệu burnup chart
          </div>
          <div style={{ fontSize: '14px' }}>
            Tạo task lớn trong milestone để xem biểu đồ tiến độ
          </div>
        </div>
      </div>
    );
  }

  const processedData = data.map((point, index) => {
    // Nếu scope = 0 nhưng có data points sau có scope > 0, 
    // thì maintain scope ở level thấp nhất thay vì 0
    const futureMaxScope = Math.max(...data.slice(index).map(d => d.totalMajorTasks));
    const adjustedScope = point.totalMajorTasks === 0 && futureMaxScope > 0 
      ? Math.max(1, futureMaxScope) // Maintain at least 1 for visual consistency
      : point.totalMajorTasks;

    return {
      ...point,
      totalMajorTasks: adjustedScope
    };
  });

  const maxTasks = Math.max(...processedData.map(d => d.totalMajorTasks), 5); // Min 5 for better visual
  const margin = { top: 30, right: 80, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  const scaleX = (index) => margin.left + (index / Math.max(processedData.length - 1, 1)) * chartWidth;
  const scaleY = (value) => margin.top + chartHeight - (value / maxTasks) * chartHeight;
  
  const generatePath = (dataKey) => {
    return processedData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d[dataKey])}`)
      .join(' ');
  };
  
  return (
    <svg 
      className="hooc-task-statistic-page__svg-chart" 
      viewBox={`0 0 ${width} ${height}`} 
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines với better spacing */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map(ratio => (
        <line
          key={ratio}
          x1={margin.left}
          y1={scaleY(maxTasks * ratio)}
          x2={width - margin.right}
          y2={scaleY(maxTasks * ratio)}
          stroke={ratio === 0 ? "#333" : "#f5f5f5"}
          strokeWidth={ratio === 0 ? "2" : "1"}
        />
      ))}
      
      {/* Axes */}
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={height - margin.bottom} stroke="#000" strokeWidth="2" />
      <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#000" strokeWidth="2" />
      
      {/* Y-axis labels với better increments */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map(ratio => (
        <text key={ratio} x={margin.left - 10} y={scaleY(maxTasks * ratio) + 5} fontSize="12" textAnchor="end" fill="#666">
          {Math.round(maxTasks * ratio)}
        </text>
      ))}
      
      {/* 3. IDEAL LINE first (behind other lines) */}
      <path d={generatePath('idealMajorTasks')} fill="none" stroke="#cccccc" strokeWidth="2" strokeDasharray="5,5" />
      
      {/* 1. SCOPE LINE - Tổng task lớn (blue) với smoothed data */}
      <path d={generatePath('totalMajorTasks')} fill="none" stroke="#4da6ff" strokeWidth="3" />
      
      {/* 2. COMPLETION LINE - Task hoàn thành (green) */}
      <path d={generatePath('completedMajorTasks')} fill="none" stroke="#2ecc71" strokeWidth="3" />
      
      {/* Data points on completion line */}
      {processedData.map((d, i) => (
        <circle key={i} cx={scaleX(i)} cy={scaleY(d.completedMajorTasks)} r="4" fill="#2ecc71" />
      ))}
      
      {/* Key milestone markers */}
      {processedData.map((d, i) => {
        // Mark significant events như scope changes
        if (i > 0 && d.totalMajorTasks !== processedData[i-1].totalMajorTasks) {
          return (
            <g key={`milestone-${i}`}>
              <line 
                x1={scaleX(i)} 
                y1={margin.top} 
                x2={scaleX(i)} 
                y2={height - margin.bottom} 
                stroke="#ffc107" 
                strokeWidth="2" 
                strokeDasharray="3,3"
                opacity="0.7"
              />
              <text 
                x={scaleX(i)} 
                y={margin.top - 5} 
                fontSize="10" 
                textAnchor="middle" 
                fill="#ffc107"
                fontWeight="600"
              >
                Task Added
              </text>
            </g>
          );
        }
        return null;
      })}
      
      {/* X-axis labels - better spacing */}
      {processedData.map((d, i) => {
        // Show start, middle, end và key points
        const showLabel = i === 0 || 
                         i === processedData.length - 1 || 
                         i % Math.max(Math.floor(processedData.length / 6), 1) === 0;
        
        if (showLabel) {
          return (
            <text key={i} x={scaleX(i)} y={height - margin.bottom + 20} fontSize="11" textAnchor="middle" fill="#666">
              {d.displayDate}
            </text>
          );
        }
        return null;
      })}
      
      {/* Chart info */}
      <text x={20} y={height / 2} fontSize="12" textAnchor="middle" fill="#666" transform={`rotate(-90, 20, ${height / 2})`}>
        Số lượng task
      </text>
      
      <text x={width / 2} y={height - 10} fontSize="12" textAnchor="middle" fill="#666">
        Timeline
      </text>

      {/* Current status indicator */}
      <g transform={`translate(${width - margin.right + 10}, ${margin.top})`}>
        <rect width="60" height="80" fill="rgba(255,255,255,0.9)" stroke="#ddd" rx="4" />
        <text x="30" y="15" fontSize="10" textAnchor="middle" fill="#666" fontWeight="600">Status</text>
        <text x="30" y="30" fontSize="12" textAnchor="middle" fill="#4da6ff" fontWeight="600">
          {processedData[processedData.length - 1]?.totalMajorTasks || 0}
        </text>
        <text x="30" y="42" fontSize="8" textAnchor="middle" fill="#666">Tasks</text>
        <text x="30" y="55" fontSize="12" textAnchor="middle" fill="#2ecc71" fontWeight="600">
          {processedData[processedData.length - 1]?.completedMajorTasks || 0}
        </text>
        <text x="30" y="67" fontSize="8" textAnchor="middle" fill="#666">Done</text>
      </g>
    </svg>
  );
};

export default function HoOCTaskStatisticPage() {
  const { eventId } = useParams();
  const [selectedDept, setSelectedDept] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [burnupData, setBurnupData] = useState([]);
  const [burnupLoading, setBurnupLoading] = useState(false);
  const [burnupError, setBurnupError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const fetchMilestones = async () => {
      try {
        const response = await milestoneApi.listMilestonesByEvent(eventId);
        const milestoneList = response?.data || response || [];
        setMilestones(milestoneList);

        if (milestoneList.length > 0) {
          const firstMilestoneId = milestoneList[0]._id || milestoneList[0].id;

          if (
            !selectedMilestoneId ||
            selectedMilestoneId === "" ||
            !milestoneList.find((m) => (m._id || m.id) === selectedMilestoneId)
          ) {
            setSelectedMilestoneId(firstMilestoneId);
          } else {
            // Nếu đã có selectedMilestoneId hợp lệ, đảm bảo loading = false
            setLoading(false);
          }
        } else {
          console.log("⚠️ No milestones found in event");
          setSelectedMilestoneId("");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching milestones:", error);
        setLoading(false);
      }
    };

    fetchMilestones();
  }, [eventId]);

  // ✅ Fetch statistics
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    // Nếu không có selectedMilestoneId, set loading = false và return
    if (!selectedMilestoneId) {
      setLoading(false);
      setStatistics(null);
      return;
    }

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await taskApi.getTaskStatisticsByMilestone(
          eventId,
          selectedMilestoneId
        );

        let finalData = null;

        if (response?.data?.summary) {
          finalData = response.data;
        } else if (response?.summary) {
          finalData = response;
        } else {
          setStatistics(null);
          setLoading(false);
          return;
        }

        setStatistics(finalData);
      } catch (error) {
        console.error("💥 API Error:", error);
        setStatistics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [eventId, selectedMilestoneId]);

  // ✅ NEW: Fetch burnup data cho main chart
  useEffect(() => {
    if (!eventId || !selectedMilestoneId) return;

    const fetchBurnupData = async () => {
      try {
        setBurnupLoading(true);
        setBurnupError(null);
        
        console.log('🔥 Fetching main burnup data for milestone:', selectedMilestoneId);
        
        const response = await taskApi.getBurnupData(eventId, selectedMilestoneId);
        
        if (response.success && response.data) {
          setBurnupData(response.data.burnupData || []);
          console.log(`📊 Loaded ${response.data.burnupData?.length || 0} burnup data points for main chart`);
        } else {
          setBurnupError('Không thể tải dữ liệu burnup chart');
        }

      } catch (error) {
        console.error('💥 Error fetching main burnup data:', error);
        setBurnupError('Lỗi khi tải dữ liệu burnup: ' + (error.message || 'Unknown error'));
      } finally {
        setBurnupLoading(false);
      }
    };

    fetchBurnupData();
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

  const selectedMilestone = milestones.find(
    (m) => (m._id || m.id) === selectedMilestoneId
  );

  const handleRowClick = (dept) => {
    console.log("Raw dept data:", dept);

    const mappedDept = {
      id: dept.departmentId,
      name: dept.departmentName,
      totalTasks: (dept.majorTasksTotal || 0) + (dept.assignedTasksTotal || 0),
      completedTasks:
        (dept.majorTasksCompleted || 0) + (dept.assignedTasksCompleted || 0),
      totalTasksDetail:
        (dept.majorTasksTotal || 0) + (dept.assignedTasksTotal || 0),
      completionRate: Math.round(
        (((dept.majorTasksCompleted || 0) +
          (dept.assignedTasksCompleted || 0)) /
          Math.max(
            1,
            (dept.majorTasksTotal || 0) + (dept.assignedTasksTotal || 0)
          )) *
          100
      ),
      remainingTasks: Math.max(
        0,
        (dept.majorTasksTotal || 0) +
          (dept.assignedTasksTotal || 0) -
          ((dept.majorTasksCompleted || 0) + (dept.assignedTasksCompleted || 0))
      ),
      remainingCompleted:
        (dept.majorTasksCompleted || 0) + (dept.assignedTasksCompleted || 0),
      remainingCompletionRate: Math.round(
        (((dept.majorTasksCompleted || 0) +
          (dept.assignedTasksCompleted || 0)) /
          Math.max(
            1,
            (dept.majorTasksTotal || 0) + (dept.assignedTasksTotal || 0)
          )) *
          100
      ),
      originalData: dept,
    };

    console.log("✅ Mapped dept data for modal:", mappedDept);
    setSelectedDept(mappedDept);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    console.log("Closing modal");
    setShowModal(false);
    setSelectedDept(null);
  };

  // Giá trị phục vụ Burnup chart (dùng số task lớn)
  const totalTasksForChart =
    statistics?.summary?.totalMajorTasks || 0;
  const completedTasksForChart = statistics?.summary?.completedMajorTasks || 0;

  // Xây dựng dữ liệu động cho Burnup chart dựa trên thống kê hiện tại
  const buildBurnupChartData = () => {
    if (!statistics?.summary || totalTasksForChart === 0) return [];

    const total = totalTasksForChart;
    const completed = completedTasksForChart;

    // Lấy khung thời gian từ milestone (nếu có), nếu không thì dùng 8 mốc giả lập
    let dates = [];
    const steps = 8;

    if (selectedMilestone?.startDate && selectedMilestone?.targetDate) {
      const start = new Date(selectedMilestone.startDate);
      const end = new Date(selectedMilestone.targetDate);
      const diff = end.getTime() - start.getTime();
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const d = new Date(start.getTime() + diff * t);
        dates.push({
          date: d,
          label: formatDate(d.toISOString()),
        });
      }
    } else {
      // Fallback dates
      const today = new Date();
      for (let i = 0; i < steps; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + (i - steps + 1) * 3);
        dates.push({
          date: d,
          label: formatDate(d.toISOString()),
        });
      }
    }

    // Tạo dữ liệu scope / ideal / actual theo số lượng task
    return dates.map((dateObj, idx) => {
      const t = idx / (dates.length - 1 || 1);
      const scope = total; // scope: luôn là tổng số task
      const ideal = t * total;
      // actual: tuyến tính từ 0 → số task đã hoàn thành
      const actual = t * completed;

      return {
        label: dateObj.label,
        date: dateObj.date,
        scope,
        ideal,
        actual,
      };
    });
  };

  const burnupData = buildBurnupChartData();
  const maxYForChart = Math.max(
    totalTasksForChart,
    completedTasksForChart,
    Math.ceil(totalTasksForChart * 1.2)
  );
  // Generate Y-axis ticks in increments of 10
  const yTicks = [];
  const step = Math.max(10, Math.ceil(maxYForChart / 6));
  for (let i = 0; i <= maxYForChart + step; i += step) {
    yTicks.push(i);
  }
  
  // Get milestone deadline date for marker
  const milestoneDeadlineDate = selectedMilestone?.targetDate
    ? new Date(selectedMilestone.targetDate)
    : null;

  // ✅ EARLY RETURNS: Handle loading states
  if (milestones.length === 0 && !loading) {
    return (
      <UserLayout
        title="Thống kê công việc"
        activePage="work-statitics"
        sidebarType="HoOC"
      >
        <div className="hooc-task-statistic-page">
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
      activePage="work-statitics"
      sidebarType="HoOC"
    >
      <div className="hooc-task-statistic-page">
        {/* Header Section */}
        <div className="hooc-task-statistic-page__header">
          <h1 className="hooc-task-statistic-page__title">
            Thống kê công việc toàn sự kiện
          </h1>

          {/* Filter Controls */}
          <div className="hooc-task-statistic-page__filters">
            <div className="hooc-task-statistic-page__filter-item">
              <label className="hooc-task-statistic-page__filter-label">
                Milestone:
              </label>
              <select
                className="hooc-task-statistic-page__milestone-btn"
                value={selectedMilestoneId}
                onChange={(e) => {
                  setSelectedMilestoneId(e.target.value);
                }}
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
                <div className="hooc-task-statistic-page__filter-item">
                  <span className="hooc-task-statistic-page__date-range">
                    {selectedMilestone.startDate &&
                      formatDate(selectedMilestone.startDate)}{" "}
                    -{" "}
                    {selectedMilestone.targetDate &&
                      formatDate(selectedMilestone.targetDate)}{" "}
                    (Deadline)
                  </span>
                </div>

                {statistics?.milestone?.remainingDays !== null &&
                  statistics?.milestone?.remainingDays !== undefined && (
                    <div className="hooc-task-statistic-page__filter-item">
                      <span className="hooc-task-statistic-page__remaining-days">
                        Còn {statistics.milestone.remainingDays} ngày
                      </span>
                    </div>
                  )}
              </>
            )}

            <div className="hooc-task-statistic-page__filter-item">
              <span className="hooc-task-statistic-page__completion-rate">
                Tiến độ tổng:{" "}
                {statistics?.milestone?.overallProgress ||
                  statistics?.summary?.completedMajorTasksPercentage ||
                  0}
                %
              </span>
            </div>
          </div>
        </div>

        {/* Loading States */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(255,255,255,0.75)",
                  zIndex: 2000,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Loading size={40} />
              </div>
            </div>
          </div>
        )}

        {!loading && milestones.length > 0 && !selectedMilestoneId && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div>Đang chọn milestone...</div>
          </div>
        )}

        {/* Main Content */}
        {!loading && selectedMilestoneId && statistics && (
          <>
            {/* KPI Cards - Only 2 cards as per image */}
            <div className="hooc-task-statistic-page__kpi-section">
              <div className="hooc-task-statistic-page__kpi-card">
                <div className="hooc-task-statistic-page__kpi-content">
                  <div className="hooc-task-statistic-page__kpi-label">
                    Tổng task lớn
                  </div>
                  <div className="hooc-task-statistic-page__kpi-value">
                    {statistics?.summary?.totalMajorTasks || 0} task
                  </div>
                </div>
              </div>

              <div className="hooc-task-statistic-page__kpi-card">
                <div className="hooc-task-statistic-page__kpi-content">
                  <div className="hooc-task-statistic-page__kpi-label">
                    Đã hoàn thành
                  </div>
                  <div className="hooc-task-statistic-page__kpi-value">
                    {statistics?.summary?.completedMajorTasks || 0}/
                    {statistics?.summary?.totalMajorTasks || 0} (
                    {statistics?.summary?.completedMajorTasksPercentage || 0}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Team Progress Section */}
            <div className="hooc-task-statistic-page__team-section">
              <h2 className="hooc-task-statistic-page__section-title">
                Tiến độ theo ban
              </h2>

              <div className="hooc-task-statistic-page__table-wrapper">
                <table className="hooc-task-statistic-page__table">
                  <thead>
                    <tr className="hooc-task-statistic-page__table-header-row">
                      <th className="hooc-task-statistic-page__table-header-cell hooc-task-statistic-page__table-header-cell--team">
                        Tên ban
                      </th>
                      <th className="hooc-task-statistic-page__table-header-cell">
                        Task lớn
                      </th>
                      <th className="hooc-task-statistic-page__table-header-cell">
                        Số task con
                      </th>
                      <th className="hooc-task-statistic-page__table-header-cell">
                        Tiến độ
                      </th>
                      <th className="hooc-task-statistic-page__table-header-cell">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics?.departmentProgress?.length > 0 ? (
                      statistics.departmentProgress.map((dept) => (
                        <tr
                          key={dept.departmentId}
                          className="hooc-task-statistic-page__table-body-row"
                        >
                          <td className="hooc-task-statistic-page__table-body-cell hooc-task-statistic-page__table-body-cell--team">
                            <span className="hooc-task-statistic-page__team-dot"></span>
                            {dept.departmentName}
                          </td>
                          <td className="hooc-task-statistic-page__table-body-cell">
                            <div style={{ fontSize: "14px", fontWeight: "500" }}>
                              {dept.majorTasksCompleted || 0}/
                              {dept.majorTasksTotal || 0}
                            </div>
                          </td>
                          <td className="hooc-task-statistic-page__table-body-cell">
                            <div style={{ fontSize: "14px", fontWeight: "500" }}>
                              {dept.childTasksCompleted || 0}/
                              {dept.childTasksTotal || 0}
                            </div>
                          </td>
                          <td className="hooc-task-statistic-page__table-body-cell">
                            <div className="hooc-task-statistic-page__progress-container">
                              <div
                                className="hooc-task-statistic-page__progress-bar"
                                style={{
                                  width: `${dept.overallProgress || 0}%`,
                                }}
                              ></div>
                            </div>
                            <span className="hooc-task-statistic-page__progress-text">
                              {dept.overallProgress || 0}%
                            </span>
                          </td>
                          <td className="hooc-task-statistic-page__table-body-cell">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log(
                                  "Button clicked for dept:",
                                  dept.departmentName
                                );
                                handleRowClick(dept);
                              }}
                              className="hooc-task-statistic-page__detail-btn"
                            >
                              Xem chi tiết
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          style={{ textAlign: "center", padding: "40px" }}
                        >
                          Không có dữ liệu ban nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ✅ UPDATED: Real Burnup Chart Section */}
            <div className="hooc-task-statistic-page__chart-section">
              <div className="hooc-task-statistic-page__chart-container">
                <h3 className="hooc-task-statistic-page__chart-title">
                  Biểu đồ Burnup - Milestone:{" "}
                  {selectedMilestone?.name || "Không xác định"}
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
                    <line
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

                    {/* Y-axis label */}
                    <text
                      x="20"
                      y="150"
                      fontSize="12"
                      textAnchor="middle"
                      transform="rotate(-90, 20, 150)"
                      fill="#333"
                    >
                      Số lượng task lớn
                    </text>

                    {/* Y-axis labels theo số lượng task */}
                    {yTicks.map((v) => {
                      const yBottom = 250;
                      const yTop = 50;
                      const maxY = maxYForChart || 1;
                      const ratio = maxY === 0 ? 0 : v / maxY;
                      const y =
                        yBottom - ratio * (yBottom - yTop);
                      return (
                        <text
                          key={v}
                          x="35"
                          y={y + 5}
                          fontSize="12"
                          textAnchor="end"
                        >
                          {v}
                        </text>
                      );
                    })}

                    {/* Helper để convert % → tọa độ cho 3 đường */}
                    {burnupData.length > 0 && (
                      <>
                        {/* Scope (planned) - Blue solid line */}
                        <polyline
                          points={burnupData
                            .map((p, idx) => {
                              const xStart = 60;
                              const xEnd = 580;
                              const yBottom = 250;
                              const yTop = 50;
                              const t =
                                burnupData.length === 1
                                  ? 0
                                  : idx / (burnupData.length - 1);
                              const x =
                                xStart +
                                (xEnd - xStart) * t;
                              const y =
                                yBottom -
                                (p.scope / (maxYForChart || 1)) *
                                  (yBottom - yTop);
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="#4da6ff"
                          strokeWidth="2"
                        />

                        {/* Actual (đường hoàn thành) - Green solid line */}
                        <polyline
                          points={burnupData
                            .map((p, idx) => {
                              const xStart = 60;
                              const xEnd = 580;
                              const yBottom = 250;
                              const yTop = 50;
                              const t =
                                burnupData.length === 1
                                  ? 0
                                  : idx / (burnupData.length - 1);
                              const x =
                                xStart +
                                (xEnd - xStart) * t;
                              const y =
                                yBottom -
                                (p.actual / (maxYForChart || 1)) *
                                  (yBottom - yTop);
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="#2ecc71"
                          strokeWidth="2"
                        />

                        {/* Ideal (đường ước tính) - Blue dashed line */}
                        <polyline
                          points={burnupData
                            .map((p, idx) => {
                              const xStart = 60;
                              const xEnd = 580;
                              const yBottom = 250;
                              const yTop = 50;
                              const t =
                                burnupData.length === 1
                                  ? 0
                                  : idx / (burnupData.length - 1);
                              const x =
                                xStart +
                                (xEnd - xStart) * t;
                              const y =
                                yBottom -
                                (p.ideal / (maxYForChart || 1)) *
                                  (yBottom - yTop);
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="#4da6ff"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />

                        {/* Milestone deadline marker - Vertical grey bar */}
                        {milestoneDeadlineDate && burnupData.length > 0 && (() => {
                          const xStart = 60;
                          const xEnd = 580;
                          const startDate = burnupData[0]?.date;
                          const endDate = burnupData[burnupData.length - 1]?.date;
                          
                          if (startDate && endDate) {
                            const startTime = startDate.getTime();
                            const endTime = endDate.getTime();
                            const deadlineTime = milestoneDeadlineDate.getTime();
                            const ratio = (deadlineTime - startTime) / (endTime - startTime);
                            const x = xStart + (xEnd - xStart) * Math.max(0, Math.min(1, ratio));
                            
                            return (
                              <line
                                x1={x}
                                y1="30"
                                x2={x}
                                y2="260"
                                stroke="#999"
                                strokeWidth="2"
                                opacity="0.6"
                              />
                            );
                          }
                          return null;
                        })()}

                        {/* Nhãn ngày dưới trục X */}
                        {burnupData.map((p, idx) => {
                          const xStart = 60;
                          const xEnd = 580;
                          const t =
                            burnupData.length === 1
                              ? 0
                              : idx /
                                (burnupData.length - 1);
                          const x =
                            xStart +
                            (xEnd - xStart) * t;
                          return (
                            <text
                              key={idx}
                              x={x}
                              y="275"
                              fontSize="12"
                              textAnchor="middle"
                              fill="#333"
                            >
                              {p.label}
                            </text>
                          );
                        })}
                      </>
                    )}
                  </svg>

                  {/* Chart Legend */}
                  <div className="hooc-task-statistic-page__chart-legend">
                    <div className="hooc-task-statistic-page__legend-item">
                      <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--planned"></span>
                      <span>Tổng số task lớn</span>
                    </div>
                    <div className="hooc-task-statistic-page__legend-item">
                      <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--actual"></span>
                      <span>Thực tế hoàn thành</span>
                    </div>
                    <div className="hooc-task-statistic-page__legend-item">
                      <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--ideal"></span>
                      <span>Đường ước tính</span>
                    </div>
                  </div>
                )}

                {/* ✅ Show error state */}
                {burnupError && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#dc3545',
                    background: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
                    <div style={{ fontWeight: '600', marginBottom: '5px' }}>Lỗi tải burnup chart</div>
                    <div style={{ fontSize: '14px' }}>{burnupError}</div>
                  </div>
                )}

                {/* ✅ Show real chart hoặc fallback */}
                {!burnupLoading && !burnupError && (
                  <div className="hooc-task-statistic-page__chart-content-wrapper">
                    <MainBurnupChart 
                      data={burnupData} 
                      milestone={selectedMilestone}
                      width={580} 
                      height={300}
                    />

                    {/* Chart Legend */}
                    <div className="hooc-task-statistic-page__chart-legend">
                      <div className="hooc-task-statistic-page__legend-item">
                        <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--planned"></span>
                        <span>Đường Scope - Tổng số task lớn</span>
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

                    {/* ✅ Chart data summary */}
                    {burnupData.length > 0 && (
                      <div style={{
                        background: '#f8f9fa',
                        padding: '15px',
                        borderRadius: '8px',
                        marginTop: '20px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                          gap: '15px', 
                          fontSize: '14px' 
                        }}>
                          <div>
                            <strong>📅 Timeline:</strong>
                            <div style={{ color: '#666', fontSize: '12px' }}>
                              {burnupData[0]?.displayDate} → {burnupData[burnupData.length - 1]?.displayDate}
                            </div>
                          </div>
                          <div>
                            <strong>📊 Total Major Tasks:</strong>
                            <div style={{ color: '#666', fontSize: '12px' }}>
                              {burnupData[burnupData.length - 1]?.totalMajorTasks || 0} tasks
                            </div>
                          </div>
                          <div>
                            <strong>✅ Completed:</strong>
                            <div style={{ color: '#666', fontSize: '12px' }}>
                              {burnupData[burnupData.length - 1]?.completedMajorTasks || 0} tasks
                            </div>
                          </div>
                          <div>
                            <strong>🎯 Progress:</strong>
                            <div style={{ 
                              color: burnupData[burnupData.length - 1]?.completionRate > 50 ? '#28a745' : '#dc3545',
                              fontWeight: '600'
                            }}>
                              {burnupData[burnupData.length - 1]?.completionRate || 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Legend Explanation */}
              <div className="hooc-task-statistic-page__legend-section">
                <h3 className="hooc-task-statistic-page__legend-title">
                  Cách đọc biểu đồ
                </h3>

                <div className="hooc-task-statistic-page__legend-items">
                  <div className="hooc-task-statistic-page__legend-explanation-item">
                    <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--scope"></span>
                    <div>
                      <div className="hooc-task-statistic-page__legend-explanation-title">
                        Đường Scope - Tổng số task
                      </div>
                      <div className="hooc-task-statistic-page__legend-explanation-text">
                        Tổng số lượng task cần hoàn thành. Có thể tăng nếu thêm task.
                      </div>
                    </div>
                  </div>

                  <div className="hooc-task-statistic-page__legend-explanation-item">
                    <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--actual"></span>
                    <div>
                      <div className="hooc-task-statistic-page__legend-explanation-title">
                        Đường Thực tế - Task hoàn thành
                      </div>
                      <div className="hooc-task-statistic-page__legend-explanation-text">
                        Số lượng task đã giải quyết theo thời gian.
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
                        Tiến độ lý tưởng theo kế hoạch linear.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hooc-task-statistic-page__milestone-note">
                  <div style={{ marginBottom: "8px" }}>
                    Nếu đường xanh là nằm trên đường nét đứt → Tiến độ nhanh hơn dự kiến.
                  </div>
                  <div>
                    Nếu nằm dưới → Chậm tiến độ.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal remains unchanged for department details */}
      {showModal && selectedDept && (
        <HoOCTaskStatisticModal
          show={showModal}
          dept={selectedDept}
          onClose={handleCloseModal}
        />
      )}
    </UserLayout>
  );
}