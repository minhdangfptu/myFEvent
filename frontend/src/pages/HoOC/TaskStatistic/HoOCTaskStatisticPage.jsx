import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./HoOCTaskStatisticPage.css";
import UserLayout from "~/components/UserLayout";
import { taskApi } from "~/apis/taskApi";
import { milestoneApi } from "~/apis/milestoneApi";
import Loading from "~/components/Loading";
import HoOCTaskStatisticModal from "./HoOCTaskStatisticModal";

export default function HoOCTaskStatisticPage() {
  const { eventId } = useParams();
  const [selectedDept, setSelectedDept] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // Fetch milestones
  useEffect(() => {
    if (!eventId) return;

    const fetchMilestones = async () => {
      try {
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
          console.log("⚠️ No milestones found in event");
          setSelectedMilestoneId("");
        }
      } catch (error) {
        console.error("Error fetching milestones:", error);
      }
    };

    fetchMilestones();
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !selectedMilestoneId) return;

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await taskApi.getTaskStatisticsByMilestone(
          eventId,
          selectedMilestoneId
        );

        let finalData = null;

        // ✅ Handle different response structures
        if (response?.data?.summary) {
          // Case: { data: { summary, milestone, departmentProgress } }
          finalData = response.data;
        } else if (response?.summary) {
          // Case: { summary, milestone, departmentProgress }
          finalData = response;
        } else {
          setStatistics(null);
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
    console.log("Raw dept data:", dept);

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

    console.log("✅ Mapped dept data for modal:", mappedDept);
    setSelectedDept(mappedDept);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    console.log("Closing modal");
    setShowModal(false);
    setSelectedDept(null); // ✅ Clear selected data
  };

  const chartData = [
    { date: "11/30", planned: 2, actual: 2, ideal: 0 },
    { date: "12/03", planned: 5, actual: 5, ideal: 5 },
    { date: "12/06", planned: 15, actual: 15, ideal: 15 },
    { date: "12/09", planned: 25, actual: 28, ideal: 30 },
    { date: "12/12", planned: 40, actual: 45, ideal: 45 },
    { date: "12/15", planned: 48, actual: 50, ideal: 50 },
    { date: "12/18", planned: 52, actual: 51, ideal: 52 },
    { date: "12/21", planned: 56, actual: 56, ideal: 56 },
  ];

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
                  <i className="bi bi-check-circle"></i>
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
                                console.log(
                                  "Button clicked for dept:",
                                  dept.departmentName
                                );
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
                    <div className="hooc-task-statistic-page__legend-item">
                      <span className="hooc-task-statistic-page__legend-color hooc-task-statistic-page__legend-color--milestone"></span>
                      <span>Mốc Milestone</span>
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

                  <div className="hooc-task-statistic-page__legend-explanation-item hooc-task-statistic-page__legend-explanation-item--milestone">
                    <span className="hooc-task-statistic-page__legend-dot hooc-task-statistic-page__legend-dot--milestone"></span>
                    <div>
                      <div className="hooc-task-statistic-page__legend-explanation-title">
                        Mốc Milestone
                      </div>
                      <div className="hooc-task-statistic-page__legend-explanation-text">
                        Đánh dấu ngày deadline.
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
      </div>
      {showModal && selectedDept && (
        <HoOCTaskStatisticModal
          show={showModal}
          dept={selectedDept} // ✅ Pass mapped data
          onClose={handleCloseModal}
        />
      )}
    </UserLayout>
  );
}
