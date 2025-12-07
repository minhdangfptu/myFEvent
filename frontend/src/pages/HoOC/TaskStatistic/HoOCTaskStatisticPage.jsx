import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./HoOCTaskStatisticPage.css";
import UserLayout from "~/components/UserLayout";
import { taskApi } from "~/apis/taskApi";
import { milestoneApi } from "~/apis/milestoneApi";
import Loading from "~/components/Loading";
import HoOCTaskStatisticModal from "./HoOCTaskStatisticModal";
import { ChartArea, ChartPie, CheckCircle, FileChartColumn, PinOff } from "lucide-react";


export default function HoOCTaskStatisticPage() {
  const { eventId } = useParams();
  const [selectedDept, setSelectedDept] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [burnupData, setBurnupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  // Fetch milestones
  useEffect(() => {
    if (!eventId) return;

    const fetchMilestones = async () => {
      try {
        setLoading(true);
        const response = await milestoneApi.listMilestonesByEvent(eventId);
        const milestoneList = response?.data || response || [];
        setMilestones(milestoneList);

        // ✅ FIX: LUÔN chọn milestone đầu tiên nếu chưa có milestone nào được chọn
        if (milestoneList.length > 0) {
          const firstMilestoneId = milestoneList[0]._id || milestoneList[0].id;

          // Chỉ set nếu chưa có hoặc milestone hiện tại không hợp lệ
          if (
            !selectedMilestoneId ||
            selectedMilestoneId === "" ||
            !milestoneList.find((m) => (m._id || m.id) === selectedMilestoneId)
          ) {
            setSelectedMilestoneId(firstMilestoneId);
          }
        } else {
          setSelectedMilestoneId("");
          setLoading(false); // ✅ Set loading false khi không có milestone
        }
      } catch (error) {
        setLoading(false); // ✅ Set loading false khi có lỗi
      }
    };

    fetchMilestones();
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !selectedMilestoneId) return;

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const [statsResponse, burnupResponse] = await Promise.all([
          taskApi.getTaskStatisticsByMilestone(eventId, selectedMilestoneId),
          taskApi.getBurnupData(eventId, selectedMilestoneId).catch(() => {
            return null;
          })
        ]);

        let finalData = null;

        // ✅ Handle different response structures
        if (statsResponse?.data?.summary) {
          // Case: { data: { summary, milestone, departmentProgress } }
          finalData = statsResponse.data;
        } else if (statsResponse?.summary) {
          // Case: { summary, milestone, departmentProgress }
          finalData = statsResponse;
        } else {
          setStatistics(null);
          return;
        }

        setStatistics(finalData);
        
        // Set burnup data - handle different response structures
        // Try to find burnupData in various locations
        let foundBurnupData = null;
        
        // First check for burnupData (the correct field name from backend)
        if (burnupResponse?.data?.burnupData && Array.isArray(burnupResponse.data.burnupData)) {
          foundBurnupData = burnupResponse.data.burnupData;
        } else if (burnupResponse?.burnupData && Array.isArray(burnupResponse.burnupData)) {
          foundBurnupData = burnupResponse.burnupData;
        } else if (burnupResponse?.data?.dataPoints && Array.isArray(burnupResponse.data.dataPoints)) {
          foundBurnupData = burnupResponse.data.dataPoints;
        } else if (burnupResponse?.dataPoints && Array.isArray(burnupResponse.dataPoints)) {
          foundBurnupData = burnupResponse.dataPoints;
        } else if (burnupResponse?.data && Array.isArray(burnupResponse.data)) {
          foundBurnupData = burnupResponse.data;
        } else if (Array.isArray(burnupResponse)) {
          foundBurnupData = burnupResponse;
        } else if (burnupResponse?.data) {
          // Check if data has any array property
          const dataKeys = Object.keys(burnupResponse.data);
          for (const key of dataKeys) {
            if (Array.isArray(burnupResponse.data[key]) && burnupResponse.data[key].length > 0) {
              foundBurnupData = burnupResponse.data[key];
              break;
            }
          }
        }
        
        if (foundBurnupData && Array.isArray(foundBurnupData) && foundBurnupData.length > 0) {
          setBurnupData({ dataPoints: foundBurnupData });
        } else {
          setBurnupData(null);
        }
      } catch (error) {
        setStatistics(null);
        setBurnupData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
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

  const handleRowClick = (dept) => {
    // ✅ Map API data to modal expected format
    const mappedDept = {
      id: dept.departmentId,
      name: dept.departmentName,

      // Total tasks calculation
      totalTasks: (dept.majorTasksTotal || 0) + (dept.assignedTasksTotal || 0),

      // Completed tasks
      completedTasks:
        (dept.majorTasksCompleted || 0) + (dept.assignedTasksCompleted || 0),

      // Total tasks detail (same as totalTasks for modal display)
      totalTasksDetail:
        (dept.majorTasksTotal || 0) + (dept.assignedTasksTotal || 0),

      // Completion rate calculation
      completionRate: Math.round(
        (((dept.majorTasksCompleted || 0) +
          (dept.assignedTasksCompleted || 0)) /
          Math.max(
            1,
            (dept.majorTasksTotal || 0) + (dept.assignedTasksTotal || 0)
          )) *
          100
      ),

      // Remaining tasks calculation
      remainingTasks: Math.max(
        0,
        (dept.majorTasksTotal || 0) +
          (dept.assignedTasksTotal || 0) -
          ((dept.majorTasksCompleted || 0) + (dept.assignedTasksCompleted || 0))
      ),

      // For modal's remaining section
      remainingCompleted:
        (dept.majorTasksCompleted || 0) + (dept.assignedTasksCompleted || 0),

      // Remaining completion rate (same as overall completion rate)
      remainingCompletionRate: Math.round(
        (((dept.majorTasksCompleted || 0) +
          (dept.assignedTasksCompleted || 0)) /
          Math.max(
            1,
            (dept.majorTasksTotal || 0) + (dept.assignedTasksTotal || 0)
          )) *
          100
      ),

      // Keep original data for debugging
      originalData: dept,
    };

    setSelectedDept(mappedDept);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDept(null); // ✅ Clear selected data
  };

  // Calculate chart data from burnupData or generate from statistics
  const calculateChartData = () => {
    // First, try to get dataPoints from burnupData
    let dataPoints = [];
    
    if (burnupData) {
      // Handle different data structures
    if (Array.isArray(burnupData.dataPoints)) {
      dataPoints = burnupData.dataPoints;
    } else if (Array.isArray(burnupData)) {
      dataPoints = burnupData;
    } else if (burnupData.data && Array.isArray(burnupData.data)) {
      dataPoints = burnupData.data;
    } else if (burnupData.timeline && Array.isArray(burnupData.timeline)) {
      dataPoints = burnupData.timeline;
    } else if (burnupData.history && Array.isArray(burnupData.history)) {
      dataPoints = burnupData.history;
    } else {
      // Try to find any array property
      const keys = Object.keys(burnupData);
      for (const key of keys) {
        if (Array.isArray(burnupData[key]) && burnupData[key].length > 0) {
          dataPoints = burnupData[key];
          break;
        }
      }
    }
    }

    // If no dataPoints from API, generate from statistics
    if (dataPoints.length === 0 && statistics) {
      const summary = statistics.summary || {};
      const totalTasks = (summary.majorTasksTotal || 0) + (summary.assignedTasksTotal || 0);
      const completedTasks = (summary.majorTasksCompleted || 0) + (summary.assignedTasksCompleted || 0);
      
      if (totalTasks > 0) {
        // Generate simple burnup data points from current statistics
        const milestone = statistics.milestone || {};
        const startDate = milestone.startDate ? new Date(milestone.startDate) : new Date();
        const endDate = milestone.endDate ? new Date(milestone.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days from now
        const today = new Date();
        
        // Create data points: start, today, end
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysFromStart = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        const progressRatio = Math.min(1, daysFromStart / Math.max(1, daysDiff));
        
        dataPoints = [
          {
            date: startDate.toISOString().split('T')[0],
            scope: totalTasks,
            actual: 0,
            ideal: 0
          },
          {
            date: today.toISOString().split('T')[0],
            scope: totalTasks,
            actual: completedTasks,
            ideal: Math.round(totalTasks * progressRatio)
          },
          {
            date: endDate.toISOString().split('T')[0],
            scope: totalTasks,
            actual: completedTasks,
            ideal: totalTasks
          }
        ];
      }
    }

    if (dataPoints.length === 0) {
      return {
        dataPoints: [],
        maxValue: 0,
        dateRange: { start: null, end: null }
      };
    }

    // Sort dataPoints by date to ensure correct order
    const sortedDataPoints = [...dataPoints].sort((a, b) => {
      const dateA = new Date(a.date || a.dateString || a.timestamp || 0);
      const dateB = new Date(b.date || b.dateString || b.timestamp || 0);
      return dateA - dateB;
    });

    // Map and extract values
    const mappedDataPoints = sortedDataPoints.map(dp => {
      const scope = dp.totalMajorTasks || dp.scope || dp.totalTasks || dp.planned || 0;
      const actual = dp.completedMajorTasks || dp.actual || dp.completed || dp.completedTasks || 0;
      const ideal = dp.idealMajorTasks || dp.ideal || dp.expected || dp.expectedTasks || 0;
      
      return {
        date: formatDate(dp.date || dp.dateString || dp.timestamp),
        dateObj: new Date(dp.date || dp.dateString || dp.timestamp),
        // Use backend field names: totalMajorTasks, completedMajorTasks, idealMajorTasks
        scope: scope,
        actual: actual,
        ideal: ideal
      };
    });

    const maxValue = Math.max(
      ...mappedDataPoints.flatMap(dp => [dp.scope, dp.actual, dp.ideal]),
      100 // Minimum max value
    );

    return {
      dataPoints: mappedDataPoints,
      maxValue,
      dateRange: {
        start: sortedDataPoints[0]?.date || sortedDataPoints[0]?.dateString || sortedDataPoints[0]?.timestamp 
          ? new Date(sortedDataPoints[0].date || sortedDataPoints[0].dateString || sortedDataPoints[0].timestamp) 
          : null,
        end: sortedDataPoints[sortedDataPoints.length - 1]?.date || sortedDataPoints[sortedDataPoints.length - 1]?.dateString || sortedDataPoints[sortedDataPoints.length - 1]?.timestamp
          ? new Date(sortedDataPoints[sortedDataPoints.length - 1].date || sortedDataPoints[sortedDataPoints.length - 1].dateString || sortedDataPoints[sortedDataPoints.length - 1].timestamp)
          : null
      }
    };
  };

  const chartData = calculateChartData();

  // ✅ EARLY RETURNS: Handle loading states
  if (milestones.length === 0 && !loading) {
    return (
      <UserLayout
        title="Thống kê công việc"
        activePage="work-statitics"
        sidebarType="HoOC"
        eventId={eventId}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Title Section */}
          <div className="mb-4">
            <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
              Thống kê công việc toàn sự kiện
            </h2>
            <p className="text-muted" style={{ fontSize: "14px" }}>
              Theo dõi tiến độ công việc theo milestone và department
            </p>
          </div>

          {/* Empty State */}
          <div
            className="d-flex flex-column align-items-center justify-content-center"
            style={{
              minHeight: "500px",
              padding: "60px 20px",
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "120px",
                height: "120px",
                background: "#FEF3C7",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
              }}
            >
              <div style={{ position: "relative" }}>
                <i
                  className="bi bi-calendar-event"
                  style={{ fontSize: "48px", color: "#F59E0B" }}
                ></i>
              </div>
            </div>

            {/* Text */}
            <h3 className="fw-bold mb-3" style={{ fontSize: "24px", color: "#111827" }}>
              Chưa có milestone nào được tạo
            </h3>
            <p
              className="text-muted mb-4 text-center"
              style={{ fontSize: "16px", maxWidth: "500px" }}
            >
              Milestone giúp bạn theo dõi tiến độ công việc theo từng giai đoạn của sự kiện.
              Hãy tạo milestone đầu tiên để bắt đầu quản lý và thống kê công việc hiệu quả.
            </p>

            {/* Create Button */}
            <button
              className="btn btn-warning"
              onClick={() => navigate( `/events/${eventId}/milestones`)}
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                fontWeight: "600",
                borderRadius: "12px",
                background: "#F59E0B",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#fff",
              }}
            >
              <i className="bi bi-plus-circle" style={{ fontSize: "18px" }}></i>
              Tạo Milestone Đầu Tiên
            </button>
          </div>

          {/* Feature Cards */}
          <div className="row g-4 mt-4">
            <div className="col-md-4">
              <div
                style={{
                  padding: "24px",
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    background: "#EFF6FF",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <ChartArea size=" 24px" color="#3B82F6" />
                </div>
                <h5 className="fw-bold mb-2" style={{ fontSize: "18px", color: "#111827" }}>
                  Theo dõi tiến độ
                </h5>
                <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                  Xem biểu đồ Burnup và tiến độ hoàn thành công việc theo từng milestone.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div
                style={{
                  padding: "24px",
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    background: "#ECFDF5",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <ChartPie size=" 24px" color="#10B981" />
                </div>
                <h5 className="fw-bold mb-2" style={{ fontSize: "18px", color: "#111827" }}>
                  Thống kê theo ban
                </h5>
                <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                  So sánh hiệu suất và tiến độ công việc giữa các ban trong sự kiện.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div
                style={{
                  padding: "24px",
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    background: "#F5F3FF",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <FileChartColumn size=" 24px" color="#8B5CF6" />
                </div>
                <h5 className="fw-bold mb-2" style={{ fontSize: "18px", color: "#111827" }}>
                  Báo cáo chi tiết
                </h5>
                <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                  Xem báo cáo tổng hợp về công việc lớn, công việc cá nhân và tỷ lệ hoàn thành.
                </p>
              </div>
            </div>
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
      eventId={eventId}
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
              <select
                className="hooc-task-statistic-page__milestone-btn"
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
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
                    📌 {m.name}
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

        {/* ✅ CONDITIONAL RENDERING: Loading States */}
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

        {/* ✅ MAIN CONTENT: Only show when we have data */}
        {!loading && selectedMilestoneId && statistics && (
          <>
            {/* KPI Cards */}
            <div className="hooc-task-statistic-page__kpi-section">
              <div className="hooc-task-statistic-page__kpi-card">
                <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--tasks">
                  <i className="bi bi-list-task"></i>
                </div>
                <div className="hooc-task-statistic-page__kpi-content">
                  <div className="hooc-task-statistic-page__kpi-label">
                    Tổng số công việc
                  </div>
                  <div className="hooc-task-statistic-page__kpi-value">
                    {statistics?.summary?.totalTasks || 0} task
                  </div>
                </div>
              </div>

              <div className="hooc-task-statistic-page__kpi-card">
                <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--tasks">
                  <i className="bi bi-briefcase"></i>
                </div>
                <div className="hooc-task-statistic-page__kpi-content">
                  <div className="hooc-task-statistic-page__kpi-label">
                    Công việc lớn (Ban)
                  </div>
                  <div className="hooc-task-statistic-page__kpi-value">
                    {statistics?.summary?.totalMajorTasks || 0} task
                  </div>
                </div>
              </div>

              <div className="hooc-task-statistic-page__kpi-card">
                <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--completed">
                  <i className="bi bi-person-check"></i>
                </div>
                <div className="hooc-task-statistic-page__kpi-content">
                  <div className="hooc-task-statistic-page__kpi-label">
                    Công việc cá nhân
                  </div>
                  <div className="hooc-task-statistic-page__kpi-value">
                    {statistics?.summary?.totalAssignedTasks || 0} task
                  </div>
                </div>
              </div>

              <div className="hooc-task-statistic-page__kpi-card">
                <div className="hooc-task-statistic-page__kpi-icon hooc-task-statistic-page__kpi-icon--completed">
                  <CheckCircle size={18} />
                </div>
                <div className="hooc-task-statistic-page__kpi-content">
                  <div className="hooc-task-statistic-page__kpi-label">
                    Công việc đã hoàn thành
                  </div>
                  <div className="hooc-task-statistic-page__kpi-value">
                    {statistics?.summary?.completedTasks || 0}/
                    {statistics?.summary?.totalTasks || 0} (
                    {Math.round(
                      ((statistics?.summary?.completedTasks || 0) /
                        (statistics?.summary?.totalTasks || 1)) *
                        100
                    )}
                    %)
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
                        Công việc lớn
                      </th>
                      <th className="hooc-task-statistic-page__table-header-cell">
                        Công việc cá nhân
                      </th>
                      <th className="hooc-task-statistic-page__table-header-cell">
                        Tiến độ tổng
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
                            <div style={{ fontSize: "14px" }}>
                              <div>
                                <strong>
                                  {dept.majorTasksCompleted || 0}/
                                  {dept.majorTasksTotal || 0}
                                </strong>{" "}
                                ({dept.majorTasksProgress || 0}%)
                              </div>
                              <div style={{ color: "#666", fontSize: "12px" }}>
                                {(dept.majorTasksTotal || 0) -
                                  (dept.majorTasksCompleted || 0)}{" "}
                                còn lại
                              </div>
                            </div>
                          </td>
                          <td className="hooc-task-statistic-page__table-body-cell">
                            <div style={{ fontSize: "14px" }}>
                              <div>
                                <strong>
                                  {dept.assignedTasksCompleted || 0}/
                                  {dept.assignedTasksTotal || 0}
                                </strong>{" "}
                                ({dept.assignedTasksProgress || 0}%)
                              </div>
                              <div style={{ color: "#666", fontSize: "12px" }}>
                                {dept.remainingAssignedTasks || 0} còn lại
                              </div>
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
                                e.stopPropagation(); // ✅ Prevent event bubbling
                                handleRowClick(dept); // ✅ Pass dept object with proper mapping
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

            {/* Burnup Chart Section */}
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
                  {chartData.dataPoints.length > 0 ? (() => {
                    const chartWidth = 600;
                    const chartHeight = 250;
                    const chartLeft = 70;
                    const chartTop = 20;
                    const chartBottom = 280;
                    const chartRight = chartLeft + chartWidth;
                    const dataPoints = chartData.dataPoints;
                    const maxValue = chartData.maxValue || 100;
                    const numPoints = dataPoints.length;
                    const stepX = numPoints > 1 ? chartWidth / (numPoints - 1) : 0;

                    // Calculate Y position (inverted: higher value = lower Y)
                    const getY = (value) => {
                      const ratio = maxValue > 0 ? value / maxValue : 0;
                      const yPos = chartBottom - (ratio * chartHeight);
                      return yPos;
                    };

                    return (
                      <div style={{ 
                        width: '100%', 
                        overflowX: 'auto', 
                        overflowY: 'visible',
                        marginBottom: '20px',
                        paddingBottom: '10px'
                      }}>
                        <svg
                          className="hooc-task-statistic-page__svg-chart"
                          viewBox={`0 0 ${chartRight + 20} ${chartBottom + 50}`}
                          preserveAspectRatio="xMidYMid meet"
                          style={{ width: '100%', height: '100%', minWidth: '700px' }}
                        >
                        {/* Grid lines */}
                        {Array.from({ length: 5 }, (_, i) => {
                          const y = chartTop + (i * chartHeight / 4);
                          const value = Math.round(maxValue * (1 - i / 4));
                          const isMainLine = i === 4;
                          return (
                            <React.Fragment key={`grid-${i}`}>
                              <line
                                x1={chartLeft}
                                y1={y}
                                x2={chartRight}
                                y2={y}
                                stroke={isMainLine ? "#e0e0e0" : "#f5f5f5"}
                                strokeWidth="1"
                              />
                              {i <= 3 && (
                                <text x={chartLeft - 10} y={y + 5} fontSize="12" textAnchor="end" fill="#666">
                                  {value}
                                </text>
                              )}
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Y-axis label for 0 */}
                        <text x={chartLeft - 10} y={chartBottom + 5} fontSize="12" textAnchor="end" fill="#666">
                          0
                        </text>

                        {/* Axes */}
                        <line
                          x1={chartLeft}
                          y1={chartTop}
                          x2={chartLeft}
                          y2={chartBottom + 30}
                          stroke="#333"
                          strokeWidth="2"
                        />
                        <line
                          x1={chartLeft - 10}
                          y1={chartBottom}
                          x2={chartRight}
                          y2={chartBottom}
                          stroke="#333"
                          strokeWidth="2"
                        />

                        {/* Total epic tasks line (blue) - Đường tổng số epic task */}
                        {numPoints > 0 && (
                          <>
                            <polyline
                              points={dataPoints.map((dp, idx) => 
                                `${chartLeft + idx * stepX},${getY(dp.scope)}`
                              ).join(' ')}
                              fill="none"
                              stroke="#3B82F6"
                              strokeWidth="2"
                            />
                            {/* Data points for scope line */}
                            {dataPoints.map((dp, idx) => {
                              const x = chartLeft + idx * stepX;
                              const y = getY(dp.scope);
                              return (
                                <circle
                                  key={`scope-${idx}`}
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="#3B82F6"
                                />
                              );
                            })}
                          </>
                        )}

                        {/* Actual completed epic tasks line (green) - Đường thực tế các epic task đã hoàn thiện */}
                        {numPoints > 0 && (
                          <>
                            <polyline
                              points={dataPoints.map((dp, idx) => 
                                `${chartLeft + idx * stepX},${getY(dp.actual)}`
                              ).join(' ')}
                              fill="none"
                              stroke="#10B981"
                              strokeWidth="2"
                            />
                            {/* Data points for actual line */}
                            {dataPoints.map((dp, idx) => {
                              const x = chartLeft + idx * stepX;
                              const y = getY(dp.actual);
                              return (
                                <circle
                                  key={`actual-${idx}`}
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="#10B981"
                                />
                              );
                            })}
                          </>
                        )}

                        {/* Ideal/Estimated line (gray dashed) - Đường ước tính */}
                        {numPoints > 0 && (
                          <>
                            <polyline
                              points={dataPoints.map((dp, idx) => 
                                `${chartLeft + idx * stepX},${getY(dp.ideal)}`
                              ).join(' ')}
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              strokeDasharray="5,5"
                            />
                            {/* Data points for ideal line */}
                            {dataPoints.map((dp, idx) => {
                              const x = chartLeft + idx * stepX;
                              const y = getY(dp.ideal);
                              return (
                                <circle
                                  key={`ideal-${idx}`}
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="#9CA3AF"
                                />
                              );
                            })}
                          </>
                        )}

                        {/* X-axis labels - rotated to prevent overlapping */}
                        {dataPoints.map((dp, idx) => {
                          const x = chartLeft + idx * stepX;
                          // Show every nth label to prevent crowding
                          const showLabel = numPoints <= 10 || idx % Math.ceil(numPoints / 10) === 0 || idx === numPoints - 1;
                          if (!showLabel) return null;
                          return (
                            <g key={idx}>
                              <text 
                                x={x} 
                                y={chartBottom + 35} 
                                fontSize="11" 
                                textAnchor="middle"
                                fill="#666"
                                transform={`rotate(-45 ${x} ${chartBottom + 35})`}
                                style={{ pointerEvents: 'none' }}
                              >
                                {dp.date}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                      </div>
                    );
                  })() : (
                    <div style={{ 
                      padding: "60px 20px", 
                      textAlign: "center", 
                      color: "#6B7280",
                      fontSize: "14px"
                    }}>
                      {burnupData === null ? "Đang tải dữ liệu biểu đồ..." : "Chưa có dữ liệu biểu đồ burnup"}
                    </div>
                  )}

                  {/* Chart Legend */}
                  <div className="hooc-task-statistic-page__chart-legend">
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
                        Đường Scope - Tổng số công việc
                      </div>
                      <div className="hooc-task-statistic-page__legend-explanation-text">
                        Tổng số lượng công việc cần hoàn thành. Có thể tăng nếu
                        thêm công việc.
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

                <div className="hooc-task-statistic-page__milestone-note">
                  Nếu đường xanh lá nằm trên đường nét đứt → Tiến độ nhanh hơn
                  dự kiến.
                  <br />
                  Nếu nằm dưới → Chậm tiến độ.
                </div>
              </div>
            </div>
          </>
        )}
        {showModal && selectedDept && (
          <HoOCTaskStatisticModal
            show={showModal}
            dept={selectedDept} 
            onClose={handleCloseModal}
          />
        )}
      </div>
    </UserLayout>
  );
}