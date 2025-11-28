import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import UserLayout from "~/components/UserLayout";
import { useEvents } from "~/contexts/EventContext";
import { getAllOccurredRisksByEvent, statisticRisk } from "~/apis/riskApi"; // Add statistics API import
import { toast } from "react-toastify"; // Add for error handling
import "./RiskStatistics.css";
import { Check } from "lucide-react";
 // Import enhanced chart CSS

export default function RiskStatisticsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [eventRole, setEventRole] = useState("");
  const { fetchEventRole } = useEvents();
  const [loading, setLoading] = useState(true);

  // Add states for API data
  const [occurredRisks, setOccurredRisks] = useState([]);
  const [loadingRisks, setLoadingRisks] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // Add search state

  // Add statistics data state
  const [statisticsData, setStatisticsData] = useState(null);
  const [loadingStatistics, setLoadingStatistics] = useState(true);

  // Add filter and sort states
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("desc"); // desc = newest first, asc = oldest first

  const itemsPerPage = 6;

  // Get unique departments for filter dropdown
  const uniqueDepartments = [
    ...new Set(occurredRisks.map((risk) => risk.departmentName)),
  ].filter(Boolean).sort((a, b) => {
    // Sort with "Toàn BTC" first if it exists, then alphabetically
    if (a === "Toàn BTC") return -1;
    if (b === "Toàn BTC") return 1;
    return a.localeCompare(b, 'vi');
  });

  // Filter and sort data
  const filteredData = occurredRisks
    .filter((risk) => {
      // Search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          risk.occurred_name?.toLowerCase().includes(searchLower) ||
          risk.riskName?.toLowerCase().includes(searchLower) ||
          risk.departmentName?.toLowerCase().includes(searchLower) ||
          risk.occurred_description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Department filter
      if (
        departmentFilter !== "all" &&
        risk.departmentName !== departmentFilter
      ) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && risk.occurred_status !== statusFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by time
      const dateA = new Date(a.occurred_date || 0);
      const dateB = new Date(b.occurred_date || 0);

      if (sortBy === "desc") {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, statusFilter, sortBy]);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa xác định";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  // Helper function to get status label and color
  const getStatusInfo = (status) => {
    switch (status) {
      case "resolved":
        return {
          label: "Đã xử lý",
          color: "#10b981",
          icon: <Check size={18} />,
        };
      case "resolving":
        return {
          label: "Đang xử lý",
          color: "#f59e0b",
          icon: <i className="bi bi-hourglass"></i>,
        };
      default:
        return { label: "Chưa xử lý", color: "#6b7280", icon: "◦" };
    }
  };

  // Fetch statistics data
  const fetchStatistics = async () => {
    try {
      setLoadingStatistics(true);
      const response = await statisticRisk(eventId);
      if (response.success) {
        setStatisticsData(response.data);
      } else {
        toast.error("Không thể tải dữ liệu thống kê");
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast.error("Lỗi khi tải dữ liệu thống kê");
    } finally {
      setLoadingStatistics(false);
    }
  };

  // Fetch occurred risks data
  const fetchOccurredRisks = async () => {
    try {
      setLoadingRisks(true);
      const response = await getAllOccurredRisksByEvent(eventId);
      if (response.success) {
        setOccurredRisks(response.data);
      } else {
        toast.error("Không thể tải dữ liệu sự cố");
      }
    } catch (error) {
      console.error("Error fetching occurred risks:", error);
      toast.error("Lỗi khi tải dữ liệu sự cố");
    } finally {
      setLoadingRisks(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchStatistics(); // Fetch statistics data
      fetchOccurredRisks();
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventRole(eventId).then(setEventRole);
  }, [eventId, fetchEventRole]);

  const getSidebarType = () => {
    if (eventRole === "HoOC") return "HoOC";
    if (eventRole === "HoD") return "HoD";
    if (eventRole === "Member") return "Member";
    return "user";
  };

  // Enhanced helper function to create pie chart with external labels
  const createPieChartSVG = (data, centerText, centerSubtext) => {
    if (!data || data.length === 0) {
      return (
        <div className="pie-chart-no-data">
          <p className="text-muted">Chưa có dữ liệu</p>
        </div>
      );
    }

    // Enhanced professional color palette
    const colors = [
      "#2563eb", // Blue
      "#059669", // Green
      "#d97706", // Orange
      "#dc2626", // Red
      "#9333ea", // Purple
      "#0891b2", // Cyan
      "#4f46e5", // Indigo
      "#0d9488", // Teal
    ];
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    return (
      <div className="pie-chart-container">
        <div className="d-flex justify-content-center">
          <svg
            width="500"
            height="400"
            viewBox="0 0 400 400"
            className="pie-chart-svg"
          >
            {/* Pie segments */}
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (item.value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;

              const x1 =
                200 + 100 * Math.cos(((startAngle - 90) * Math.PI) / 180);
              const y1 =
                200 + 100 * Math.sin(((startAngle - 90) * Math.PI) / 180);
              const x2 =
                200 + 100 * Math.cos(((endAngle - 90) * Math.PI) / 180);
              const y2 =
                200 + 100 * Math.sin(((endAngle - 90) * Math.PI) / 180);

              const largeArcFlag = angle > 180 ? 1 : 0;
              const pathData = `M 200 200 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

              currentAngle += angle;

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="#fff"
                  strokeWidth="3"
                />
              );
            })}

            {/* Labels with connector lines */}
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (item.value / total) * 360;
              const startAngle =
                index === 0
                  ? 0
                  : data
                      .slice(0, index)
                      .reduce((sum, d) => sum + (d.value / total) * 360, 0);
              const midAngle = startAngle + angle / 2 - 90; // -90 to start from top

              // Points for the label
              const innerRadius = 100;
              const outerRadius = 130;
              const labelRadius = 160;

              // Inner point (on pie edge)
              const innerX =
                200 + innerRadius * Math.cos((midAngle * Math.PI) / 180);
              const innerY =
                200 + innerRadius * Math.sin((midAngle * Math.PI) / 180);

              // Outer point (before label)
              const outerX =
                200 + outerRadius * Math.cos((midAngle * Math.PI) / 180);
              const outerY =
                200 + outerRadius * Math.sin((midAngle * Math.PI) / 180);

              // Label position
              const labelX =
                200 + labelRadius * Math.cos((midAngle * Math.PI) / 180);
              const labelY =
                200 + labelRadius * Math.sin((midAngle * Math.PI) / 180);

              // Horizontal line extension
              const extendLength = 25;
              const extendX =
                labelX + (labelX > 200 ? extendLength : -extendLength);

              // Text anchor based on position
              const textAnchor = labelX > 200 ? "start" : "end";
              const textX = extendX + (labelX > 200 ? 5 : -5);

              return (
                <g key={`label-${index}`}>
                  {/* Connector line */}
                  <polyline
                    points={`${innerX},${innerY} ${outerX},${outerY} ${extendX},${outerY}`}
                    stroke={colors[index % colors.length]}
                    strokeWidth="2"
                    fill="none"
                  />

                  {/* Label text */}
                  <text
                    x={textX}
                    y={outerY - 5}
                    textAnchor={textAnchor}
                    fontSize="12"
                    fontWeight="600"
                    fill="#1e293b"
                  >
                    {item.label}
                  </text>

                  {/* Percentage text */}
                  <text
                    x={textX}
                    y={outerY + 10}
                    textAnchor={textAnchor}
                    fontSize="11"
                    fontWeight="500"
                    fill={colors[index % colors.length]}
                  >
                    {item.percentage}%
                  </text>
                </g>
              );
            })}

            {/* Center text */}
            <text
              x="200"
              y="20"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#1e293b"
            >
              {centerText}
            </text>
            <text
              x="200"
              y="40"
              textAnchor="middle"
              fontSize="16"
              fontWeight="bold"
              fill="#2563eb"
            >
              {centerSubtext}
            </text>
          </svg>
        </div>

        {/* Simplified legend */}
        <div className="pie-chart-legend" style={{ marginTop: "1rem" }}>
          {data.map((item, index) => (
            <div key={index} className="pie-legend-item">
              <div
                className="pie-legend-color"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <small>{item.label}</small>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <UserLayout
      title="Tổng kết Rủi ro"
      activePage={"risk-analysis"}
      sidebarType={getSidebarType()}
      eventId={eventId}
    >
      <div className="p-4" style={{ backgroundColor: "#f9fafb" }}>
        {/* Header - KEEP ORIGINAL */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h1
              className="mb-1"
              style={{ fontSize: "24px", fontWeight: "600" }}
            >
              Bảng tổng kết rủi ro
            </h1>
            <p className="text-muted mb-0">
              Tổng quan và phân tích chi tiết rủi ro sau sự kiện
            </p>
          </div>
          <div className="d-flex gap-2">
            {/* <button className="btn btn-success d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-excel"></i>
              Xuất Excel
            </button> */}
            <button onClick={()=>navigate(`/events/${eventId}/export/data`)} className="btn btn-danger d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-pdf"></i>
              Xuất tài liệu
            </button>
          </div>
        </div>

        {/* KPI Cards - KEEP ORIGINAL */}
        {loadingStatistics ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="mt-2">Đang tải thống kê...</div>
          </div>
        ) : (
          <div className="row mb-4">
            <div className="col-md-6 col-lg-2.4 mb-3">
              <div
                className="card border-0"
                style={{ backgroundColor: "#f0f4ff", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}
              >
                <div className="card-body">
                  <p className="text-muted small mb-2">Tổng số rủi ro</p>
                  <h3 className="mb-0" style={{ color: "#4f46e5" }}>
                    {statisticsData?.summary?.totalRisks || 0}
                  </h3>
                  <div className="mt-2" style={{ fontSize: "20px" }}>
                    ⚠️
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-2.4 mb-3">
              <div
                className="card border-0"
                style={{ backgroundColor: "#fffbeb", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}
              >
                <div className="card-body">
                  <p className="text-muted small mb-2">
                    Rủi ro xảy ra nhiều sự cố nhất
                  </p>
                  <h3 className="mb-0" style={{ color: "#f59e0b" }}>
                    {statisticsData?.summary?.riskWithMostIncidents?.name}:{" "}
                    {statisticsData?.summary?.riskWithMostIncidents
                      ?.incidentCount || 0}
                  </h3>
                  {/* <small className="text-muted">
                    {statisticsData?.summary?.riskWithMostIncidents?.department}
                  </small> */}
                  <div className="mt-2" style={{ fontSize: "20px" }}>
                    🚨
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-2.4 mb-3">
              <div
                className="card border-0"
                style={{ backgroundColor: "#fef2f2", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}
              >
                <div className="card-body">
                  <p className="text-muted small mb-2">Tổng số sự cố</p>
                  <h3 className="mb-0" style={{ color: "#ef4444" }}>
                    {statisticsData?.summary?.totalOccurred || 0}
                  </h3>
                  <div className="mt-2" style={{ fontSize: "20px" }}>
                    ⚡
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-lg-2.4 mb-3">
              <div
                className="card border-0"
                style={{ backgroundColor: "#f0fdf4", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}
              >
                <div className="card-body">
                  <p className="text-muted small mb-2">Đã xử lý / Đang xử lý</p>
                  <h3 className="mb-0" style={{ color: "#10b981" }}>
                    {
                      occurredRisks.filter(
                        (r) => r.occurred_status === "resolved"
                      ).length
                    }
                    <span style={{ color: "#ef4444" }}>
                      /
                      {
                        occurredRisks.filter(
                          (r) => r.occurred_status === "resolving"
                        ).length
                      }
                    </span>
                  </h3>
                  <div className="mt-2" style={{ fontSize: "20px" }}>
                    ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row - ENHANCED WITH NEW STYLING */}
        <div className="row mb-4">
          {/* Pie Chart 1 - % Rủi ro theo danh mục */}
          <div className="col-lg-6 mb-3">
            <div style={{ minHeight: "635px" }} className="card chart-card">
              <div className="card-body">
                <h5 className="chart-title">% Rủi ro theo danh mục</h5>
                {loadingStatistics ? (
                  <div className="pie-chart-loading">
                    <div
                      className="spinner-border text-primary"
                      role="status"
                    ></div>
                  </div>
                ) : (
                  createPieChartSVG(
                    statisticsData?.riskByCategory,
                    "Phân bổ rủi ro",
                    `${statisticsData?.summary?.totalRisks || 0} rủi ro`
                  )
                )}
              </div>
            </div>
          </div>

          {/* Pie Chart 2 - % Sự cố theo danh mục */}
          <div className="col-lg-6 mb-3">
            <div style={{ minHeight: "635px" }} className="card chart-card">
              <div className="card-body">
                <h5 className="chart-title">% Sự cố theo danh mục</h5>
                {loadingStatistics ? (
                  <div className="pie-chart-loading">
                    <div
                      className="spinner-border text-primary"
                      role="status"
                    ></div>
                  </div>
                ) : (
                  createPieChartSVG(
                    statisticsData?.occurredByCategory,
                    "Phân bổ sự cố",
                    `${statisticsData?.summary?.totalOccurred || 0} sự cố`
                  )
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Bar Chart 1 - Tần suất xảy ra các rủi ro - ENHANCED */}
          <div className="col-lg-6 mb-3">
            <div className="card chart-card">
              <div className="card-body">
                <h5 className="chart-title">Tần suất xảy ra các rủi ro</h5>
                {loadingStatistics ? (
                  <div className="pie-chart-loading">
                    <div
                      className="spinner-border text-primary"
                      role="status"
                    ></div>
                  </div>
                ) : (
                  <div className="bar-chart-container">
                    {(statisticsData?.riskFrequency || [])
                      .sort((a, b) => b.value - a.value) // Sort by value descending
                      .slice(0, 5) // Take only top 5 items
                      .map((item, idx) => {
                        const maxValue = Math.max(
                          ...(statisticsData?.riskFrequency || []).map(
                            (i) => i.value
                          )
                        );
                        const percentage =
                          maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                        const totalRisks = (
                          statisticsData?.riskFrequency || []
                        ).reduce((sum, r) => sum + r.value, 0);
                        const sharePercentage =
                          totalRisks > 0
                            ? ((item.value / totalRisks) * 100).toFixed(1)
                            : 0;

                        return (
                          <div
                            key={idx}
                            className="bar-chart-item"
                            title={`${item.label}\nSố lần xảy ra: ${
                              item.value
                            }\nTỷ lệ: ${sharePercentage}% tổng số rủi ro\nThứ hạng: #${
                              idx + 1
                            }`}
                          >
                            <div className="bar-label" title={item.label}>
                              {item.label.length > 20
                                ? `${item.label.substring(0, 19)}...`
                                : item.label}
                            </div>
                            <div className="bar-track">
                              <div
                                className="bar-fill"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div
                              className="bar-value"
                              title={`${item.value} lần xảy ra (${sharePercentage}%)`}
                            >
                              {item.value}
                            </div>
                          </div>
                        );
                      })}
                    {(statisticsData?.riskFrequency || []).length > 5 && (
                      <div className="bar-chart-more">
                        <small
                          className="text-muted"
                          title={`Còn ${
                            (statisticsData?.riskFrequency || []).length - 5
                          } loại rủi ro khác với tần suất thấp hơn`}
                        >
                          ... và{" "}
                          {(statisticsData?.riskFrequency || []).length - 5} mục
                          khác
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Bar Chart 2 - Tần suất theo ban - ENHANCED */}
          <div className="col-lg-6 mb-3">
            <div className="card chart-card">
              <div className="card-body">
                <h5 className="chart-title">
                  Tần suất xảy ra các rủi ro theo các ban
                </h5>
                {loadingStatistics ? (
                  <div className="pie-chart-loading">
                    <div
                      className="spinner-border text-primary"
                      role="status"
                    ></div>
                  </div>
                ) : (
                  <div className="bar-chart-container">
                    {(statisticsData?.riskByDepartment || [])
                      .sort((a, b) => b.value - a.value) // Sort by value descending
                      .slice(0, 5) // Take only top 5 items
                      .map((item, idx) => {
                        const maxValue = Math.max(
                          ...(statisticsData?.riskByDepartment || []).map(
                            (i) => i.value
                          )
                        );
                        const percentage =
                          maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                        const totalIncidents = (
                          statisticsData?.riskByDepartment || []
                        ).reduce((sum, d) => sum + d.value, 0);
                        const sharePercentage =
                          totalIncidents > 0
                            ? ((item.value / totalIncidents) * 100).toFixed(1)
                            : 0;

                        return (
                          <div
                            key={idx}
                            className="bar-chart-item"
                            title={`${item.label}\nSố rủi ro xảy ra: ${
                              item.value
                            }\nTỷ lệ: ${sharePercentage}% tổng số rủi ro\nXếp hạng: #${
                              idx + 1
                            }`}
                          >
                            <div className="bar-label" title={item.label}>
                              {item.label.length > 20
                                ? `${item.label.substring(0, 17)}...`
                                : item.label}
                            </div>
                            <div className="bar-track">
                              <div
                                className="bar-fill"
                                style={{ width: `${percentage}%` }}
                                title={`${sharePercentage}% của tổng số rủi ro theo ban`}
                              ></div>
                            </div>
                            <div
                              className="bar-value"
                              title={`${item.value} rủi ro xảy ra (${sharePercentage}%)`}
                            >
                              {item.value}
                            </div>
                          </div>
                        );
                      })}
                    {(statisticsData?.riskByDepartment || []).length > 5 && (
                      <div className="bar-chart-more">
                        <small
                          className="text-muted"
                          title={`Còn ${
                            (statisticsData?.riskByDepartment || []).length - 5
                          } ban khác với số lượng rủi ro ít hơn`}
                        >
                          ... và{" "}
                          {(statisticsData?.riskByDepartment || []).length - 5}{" "}
                          ban khác
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card chart-card mb-4">
          <div className="card-body">
            <h5 className="chart-title">Số lượng sự cố xảy ra theo ban</h5>
            {loadingStatistics ? (
              <div className="pie-chart-loading">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : (
              <>
                <div className="stacked-chart-svg-container">
                  {(() => {
                    const data = (statisticsData?.occurredByDepartment || [])
                      .filter(dept => dept.total > 0) // Only show departments with incidents
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 5);
                    
                    if (data.length === 0) {
                      return (
                        <div className="no-data-message" style={{ 
                          height: '200px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <p className="text-muted">Chưa có sự cố nào xảy ra</p>
                        </div>
                      );
                    }
                    
                    const maxValue = Math.max(...data.map(d => d.total), 1);
                    const svgWidth = 500;
                    const svgHeight = 200;
                    const margin = { top: 15, right: 30, bottom: 50, left: 45 };
                    const chartWidth = svgWidth - margin.left - margin.right;
                    const chartHeight = svgHeight - margin.top - margin.bottom;
                    
                    // Calculate bar positions with dynamic width based on data count
                    const barWidthRatio = Math.min(0.7, 0.4 + (0.3 * (5 - data.length) / 4)); // More space if fewer bars
                    const barWidth = (chartWidth / data.length) * barWidthRatio;
                    const barSpacing = chartWidth / data.length;
                    
                    // Y-axis ticks with better scaling
                    const yTicks = [];
                    const tickCount = Math.min(4, maxValue);
                    for (let i = 0; i <= tickCount; i++) {
                      yTicks.push(Math.ceil((maxValue / tickCount) * i));
                    }
                    
                    return (
                      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="stacked-chart-svg">
                        <defs>
                        <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" />
  <stop offset="50%" stopColor="#dc2626" />
  <stop offset="100%" stopColor="#b91c1c" />
                        </linearGradient>
                          <filter id="barShadow">
                            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0, 0, 0, 0.1)" />
                          </filter>
                          
                          {/* Arrow markers for axes */}
                          <marker 
                            id="arrowhead" 
                            markerWidth="10" 
                            markerHeight="7" 
                            refX="9" 
                            refY="3.5" 
                            orient="auto"
                          >
                            <polygon 
                              points="0 0, 10 3.5, 0 7" 
                              fill="#374151" 
                            />
                          </marker>
                        </defs>
                        
                        {/* Grid lines */}
                        {yTicks.map((tick, idx) => {
                          const y = margin.top + chartHeight - (tick / maxValue) * chartHeight;
                          return (
                            <line
                              key={`grid-${idx}`}
                              x1={margin.left}
                              y1={y}
                              x2={margin.left + chartWidth}
                              y2={y}
                              stroke="#e2e8f0"
                              strokeWidth="1"
                              strokeDasharray={idx === 0 ? "none" : "2,2"}
                            />
                          );
                        })}
                        
                        {/* Y-axis with arrow */}
                        <line
                          x1={margin.left}
                          y1={margin.top + chartHeight}
                          x2={margin.left}
                          y2={margin.top - 5}
                          stroke="#374151"
                          strokeWidth="1.5"
                          markerEnd="url(#arrowhead)"
                        />
                        
                        {/* X-axis with arrow */}
                        <line
                          x1={margin.left}
                          y1={margin.top + chartHeight}
                          x2={margin.left + chartWidth + 10}
                          y2={margin.top + chartHeight}
                          stroke="#374151"
                          strokeWidth="1.5"
                          markerEnd="url(#arrowhead)"
                        />
                        
                        {/* Y-axis labels */}
                        {yTicks.map((tick, idx) => {
                          const y = margin.top + chartHeight - (tick / maxValue) * chartHeight;
                          return (
                            <text
                              key={`y-label-${idx}`}
                              x={margin.left - 8}
                              y={y + 3}
                              textAnchor="end"
                              fontSize="7"
                              fill="#6b7280"
                              fontWeight="500"
                            >
                              {tick}
                            </text>
                          );
                        })}
                        
                        {/* Y-axis title */}
                        <text
                          x={15}
                          y={margin.top + chartHeight / 2}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#374151"
                          fontWeight="600"
                          transform={`rotate(-90, 15, ${margin.top + chartHeight / 2})`}
                        >
                          Số lượng
                        </text>
                        
                        {/* Bars */}
                        {data.map((item, idx) => {
                          const barHeight = Math.max(2, (item.total / maxValue) * chartHeight); // Minimum height of 2px
                          const x = margin.left + idx * barSpacing + (barSpacing - barWidth) / 2;
                          const y = margin.top + chartHeight - barHeight;
                          
                          return (
                            <g key={idx}>
                              <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill="url(#barGradient)"
                                filter="url(#barShadow)"
                                rx="3"
                                ry="3"
                                className="stacked-bar-rect"
                                style={{ cursor: 'pointer' }}
                              >
                                <title>{`${item.name}\nSố sự cố: ${item.total}\nXếp hạng: #${idx + 1}`}</title>
                              </rect>
                              
                              {/* Value label on bar */}
                              {barHeight > 15 && (
                                <text
                                  x={x + barWidth / 2}
                                  y={y + barHeight / 2}
                                  textAnchor="middle"
                                  fontSize="8"
                                  fill="white"
                                  fontWeight="700"
                                >
                                  {item.total}
                                </text>
                              )}
                              
                              {/* Value label above bar if too small */}
                              {barHeight <= 15 && (
                                <text
                                  x={x + barWidth / 2}
                                  y={y - 5}
                                  textAnchor="middle"
                                  fontSize="8"
                                  fill="#374151"
                                  fontWeight="600"
                                >
                                  {item.total}
                                </text>
                              )}
                            </g>
                          );
                        })}
                        
                        {/* X-axis labels */}
                        {data.map((item, idx) => {
                          const x = margin.left + idx * barSpacing + barSpacing / 2;
                          const maxLabelLength = data.length <= 3 ? 15 : 10; // More space for fewer items
                          const truncatedLabel = item.name.length > maxLabelLength 
                            ? `${item.name.substring(0, maxLabelLength - 3)}...` 
                            : item.name;
                          
                          return (
                            <text
                              key={`x-label-${idx}`}
                              x={x}
                              y={margin.top + chartHeight + 12}
                              textAnchor="middle"
                              fontSize="7"
                              fill="#374151"
                              fontWeight="500"
                            >
                              <title>{item.name}</title>
                              {truncatedLabel}
                            </text>
                          );
                        })}
                        
                        {/* X-axis title */}
                        <text
                          x={margin.left + chartWidth / 2}
                          y={svgHeight - 8}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#374151"
                          fontWeight="600"
                        >
                          Các ban tổ chức
                        </text>
                      </svg>
                    );
                  })()}
                </div>
                
                {(statisticsData?.occurredByDepartment || []).length > 5 && (
                  <div className="bar-chart-more" style={{ marginTop: "1rem" }}>
                    <small className="text-muted">
                      ... và {(statisticsData?.occurredByDepartment || []).length - 5} ban khác
                    </small>
                  </div>
                )}
                
                <div className="stacked-chart-legend">
                  <div className="stacked-legend-item">
                    <div className="stacked-legend-color" style={{ background: '#de2626' }}></div>
                    <span>Số lượng sự cố</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Risk Log Table - KEEP ORIGINAL */}
        <div className="card border-0" style={{ boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="chart-title mb-0">
                Nhật ký sự cố đã xảy ra chi tiết
              </h5>
              <div className="d-flex gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "140px" }}
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <option value="all">Tất cả ban</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "140px" }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="resolved">Đã xử lý</option>
                  <option value="resolving">Đang xử lý</option>
                </select>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "140px" }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="desc">Mới nhất trước</option>
                  <option value="asc">Cũ nhất trước</option>
                </select>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Tìm kiếm sự cố..."
                  style={{ width: "180px" }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {(searchTerm ||
                  departmentFilter !== "all" ||
                  statusFilter !== "all" ||
                  sortBy !== "desc") && (
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setSearchTerm("");
                      setDepartmentFilter("all");
                      setStatusFilter("all");
                      setSortBy("desc");
                    }}
                    title="Xóa tất cả bộ lọc"
                  >
                    🔄 Reset
                  </button>
                )}
              </div>
            </div>

            {loadingRisks ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="mt-2">Đang tải dữ liệu sự cố...</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f3f4f6",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <th
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                          }}
                        >
                          Ngày
                        </th>
                        <th
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                          }}
                        >
                          Địa điểm
                        </th>
                        <th
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                          }}
                        >
                          Ban
                        </th>
                        <th
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                          }}
                        >
                          Sự cố
                        </th>
                        <th
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                          }}
                        >
                          Mô tả sự cố
                        </th>
                        <th
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                          }}
                        >
                          Hành động đã thực hiện
                        </th>
                        <th
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#6b7280",
                          }}
                        >
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleData.length === 0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            className="text-center py-4"
                            style={{ color: "#6b7280" }}
                          >
                            {searchTerm ||
                            departmentFilter !== "all" ||
                            statusFilter !== "all" ? (
                              <div>
                                <div>
                                  Không tìm thấy sự cố phù hợp với bộ lọc đã
                                  chọn
                                </div>
                                <div className="mt-2">
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => {
                                      setSearchTerm("");
                                      setDepartmentFilter("all");
                                      setStatusFilter("all");
                                      setSortBy("desc");
                                    }}
                                  >
                                    🔄 Xóa tất cả bộ lọc
                                  </button>
                                </div>
                              </div>
                            ) : (
                              "Chưa có sự cố nào xảy ra"
                            )}
                          </td>
                        </tr>
                      ) : (
                        visibleData.map((row, idx) => {
                          const statusInfo = getStatusInfo(row.occurred_status);
                          return (
                            <tr
                              key={idx}
                              style={{
                                borderBottom: "1px solid #e5e7eb",
                                cursor: "pointer",
                              }}
                            >
                              <td
                                style={{ fontSize: "12px", color: "#374151" }}
                              >
                                {formatDate(row.occurred_date)}
                              </td>
                              <td
                                style={{ fontSize: "12px", color: "#374151" }}
                              >
                                {row.occurred_location || "Không xác định"}
                              </td>
                              <td
                                style={{ fontSize: "12px", color: "#374151" }}
                              >
                                {row.departmentName}
                              </td>
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
                                  {row.occurred_name}
                                </div>
                              </td>
                              <td
                                style={{ fontSize: "12px", color: "#374151" }}
                              >
                                {row.occurred_description || "Không có mô tả"}
                              </td>
                              <td
                                style={{ fontSize: "12px", color: "#374151" }}
                              >
                                {row.resolve_action || "Chưa có hành động"}
                              </td>
                              <td>
                                <span
                                  style={{
                                    color: statusInfo.color,
                                    fontSize: "12px",
                                    fontWeight: "500",
                                  }}
                                >
                                  {statusInfo.icon} {statusInfo.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination - KEEP ORIGINAL */}
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <small className="text-muted">
                    Hiển thị {filteredData.length > 0 ? startIndex + 1 : 0}-
                    {Math.min(startIndex + itemsPerPage, filteredData.length)}{" "}
                    trong {filteredData.length} kết quả
                    {(searchTerm ||
                      departmentFilter !== "all" ||
                      statusFilter !== "all") && (
                      <span className="text-primary">
                        {" "}
                        (đã lọc từ {occurredRisks.length} tổng)
                      </span>
                    )}
                  </small>

                  {/* Always show pagination if there are more than 1 page */}
                  {totalPages > 1 && (
                    <nav aria-label="Page navigation">
                      <ul className="pagination pagination-sm mb-0">
                        <li
                          className={`page-item ${
                            currentPage === 1 ? "disabled" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() =>
                              setCurrentPage(Math.max(1, currentPage - 1))
                            }
                            disabled={currentPage === 1}
                          >
                            Trước
                          </button>
                        </li>
                        {(() => {
                          const maxVisiblePages = 5;
                          const startPage = Math.max(
                            1,
                            currentPage - Math.floor(maxVisiblePages / 2)
                          );
                          const endPage = Math.min(
                            totalPages,
                            startPage + maxVisiblePages - 1
                          );
                          const pages = [];

                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(i);
                          }

                          return pages.map((page) => (
                            <li
                              key={page}
                              className={`page-item ${
                                currentPage === page ? "active" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </li>
                          ));
                        })()}
                        <li
                          className={`page-item ${
                            currentPage === totalPages ? "disabled" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() =>
                              setCurrentPage(
                                Math.min(totalPages, currentPage + 1)
                              )
                            }
                            disabled={currentPage === totalPages}
                          >
                            Sau
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}

                  {/* Show page info even when only 1 page */}
                  {totalPages <= 1 && filteredData.length > 0 && (
                    <small className="text-muted">Trang 1 / 1</small>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}