import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { departmentService } from "../../services/departmentService";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import { Coins, CheckCircle, XCircle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const BudgetStatisticsHoD = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole, forceCheckEventAccess } = useEvents();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalBudget: 0,
    approvedCount: 0,
    unapprovedCount: 0,
    totalActualAmount: 0,
    totalDifference: 0,
    departmentName: ""
  });
  const [hodDepartmentId, setHodDepartmentId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra role và lấy department của HOD
      // Dùng forceCheckEventAccess để đảm bảo lấy role mới nhất từ server
      // (quan trọng khi vừa được chuyển ban)
      const role = await forceCheckEventAccess(eventId) || await fetchEventRole(eventId);
      
      if (role !== 'HoD' || !user) {
        toast.error("Bạn không có quyền truy cập trang này");
        return;
      }

      // Lấy department mà user là leader
      const depts = await departmentService.getDepartments(eventId);
      const departmentsList = Array.isArray(depts) ? depts : (depts?.items || depts?.data || []);
      const userId = user._id || user.id;
      
      const userDepartment = departmentsList.find(dept => {
        const leaderId = dept.leaderId?._id || dept.leaderId || dept.leader?._id || dept.leader;
        return leaderId && (leaderId.toString() === userId?.toString() || leaderId === userId);
      });
      

      const deptId = userDepartment._id || userDepartment.id;
      setHodDepartmentId(deptId);
      
      // Sử dụng API statistics thay vì load toàn bộ budgets
      // Nếu API statistics không có, mới fallback về load budgets
      try {
        const statsData = await budgetApi.getBudgetStatistics(eventId, deptId);
        
        if (statsData) {
          // Sử dụng dữ liệu từ API statistics
          const totalBudget = parseDecimal(statsData.totalEstimated || statsData.totalBudget || 0);
          const totalActualAmount = parseDecimal(statsData.totalActual || 0);
          const totalDifference = totalActualAmount - totalBudget;
          
          // Đếm số đơn từ summary nếu có
          const approvedCount = statsData.approvedCount || 0;
          const unapprovedCount = statsData.unapprovedCount || 0;
          
          setStatistics({
            totalBudget,
            approvedCount,
            unapprovedCount,
            totalActualAmount,
            totalDifference,
            departmentName: userDepartment.name || "Ban của tôi"
          });
          return; // Thoát sớm nếu có dữ liệu từ API
        }
      } catch (error) {
        console.warn("Statistics API not available, falling back to budget list:", error);
      }
      
      // Fallback: Load budgets nhưng chỉ load summary (không load items)
      const budgetsResponse = await budgetApi.getAllBudgetsForDepartment(eventId, deptId, {
        page: 1,
        limit: 100, // Giảm từ 1000
        includeItems: false // Chỉ load summary
      });
      
      const budgetsList = Array.isArray(budgetsResponse) 
        ? budgetsResponse 
        : (budgetsResponse?.data || budgetsResponse?.budgets || []);
      
      // Tính toán thống kê từ summary (không cần items)
      let totalBudget = 0; // Tổng tiền dự trù
      let approvedCount = 0;
      let unapprovedCount = 0;
      let totalActualAmount = 0; // Tổng tiền thực tế
      
      budgetsList.forEach((budget) => {
        // Sử dụng totalCost từ summary thay vì tính từ items
        const budgetTotal = parseDecimal(budget.totalCost || budget.total || 0);
        totalBudget += budgetTotal;
        
        // Đếm số đơn đã duyệt và chưa duyệt
        const status = budget.status || "draft";
        if (status === "approved" || status === "sent_to_members") {
          approvedCount++;
        } else {
          unapprovedCount++;
        }
        
        // Sử dụng totalActual từ summary nếu có
        const budgetActual = parseDecimal(budget.totalActual || budget.actualAmount || 0);
        totalActualAmount += budgetActual;
      });
      
      // Tính tổng chênh lệch
      const totalDifference = totalActualAmount - totalBudget;
      
      setStatistics({
        totalBudget,
        approvedCount,
        unapprovedCount,
        totalActualAmount,
        totalDifference,
        departmentName: userDepartment.name || "Ban của tôi"
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Không thể tải dữ liệu thống kê");
    } finally {
      setLoading(false);
    }
  };

  const parseDecimal = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'object' && value !== null && value.$numberDecimal !== undefined) {
      return parseFloat(value.$numberDecimal) || 0;
    }
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    if (typeof value === 'string') {
      return parseFloat(value) || 0;
    }
    return 0;
  };

  const formatCurrency = (amount) => {
    const numAmount = parseDecimal(amount);
    return new Intl.NumberFormat("vi-VN").format(numAmount);
  };

  if (loading) {
    return (
      <UserLayout
        title="Thống kê chi tiêu"
        activePage="finance-statistics"
        sidebarType="hod"
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải Thống kê chi tiêu...</div>
        </div>
      </UserLayout>
    );
  }

  const { totalBudget, approvedCount, unapprovedCount, totalActualAmount, totalDifference, departmentName } = statistics;

  return (
    <UserLayout
      title="Thống kê chi tiêu"
      activePage="finance-statistics"
      sidebarType="hod"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4 d-flex justify-content-between align-items-start">
          <div>
            <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
              Thống kê chi tiêu
            </h2>
            <p className="text-muted">Thống kê tổng hợp các đơn ngân sách của {departmentName}</p>
          </div>
          <button
            className="btn btn-outline-primary"
            onClick={() => navigate(`/events/${eventId}/budgets/departments`)}
            style={{ borderRadius: "8px" }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Quay lại danh sách
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="row g-4 mb-4">
          {/* Tổng ngân sách */}
          <div className="col-md-6 col-lg-3">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                height: "100%",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#DBEAFE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DollarSign size={24} color="#3B82F6" />
                </div>
              </div>
              <div className="fw-bold mb-1" style={{ fontSize: "24px", color: "#3B82F6" }}>
                {formatCurrency(totalBudget)}
              </div>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Tổng ngân sách (VNĐ)
              </p>
            </div>
          </div>

          {/* Số đơn đã duyệt */}
          <div className="col-md-6 col-lg-3">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                height: "100%",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#D1FAE5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle size={24} color="#10B981" />
                </div>
              </div>
              <div className="fw-bold mb-1" style={{ fontSize: "24px", color: "#10B981" }}>
                {approvedCount}
              </div>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Số đơn đã duyệt
              </p>
            </div>
          </div>

          {/* Số đơn chưa duyệt */}
          <div className="col-md-6 col-lg-3">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                height: "100%",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#FEE2E2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <XCircle size={24} color="#EF4444" />
                </div>
              </div>
              <div className="fw-bold mb-1" style={{ fontSize: "24px", color: "#EF4444" }}>
                {unapprovedCount}
              </div>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Số đơn chưa duyệt
              </p>
            </div>
          </div>

          {/* Tổng tiền thực tế */}
          <div className="col-md-6 col-lg-3">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                height: "100%",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#FEF3C7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Coins size={24} color="#F59E0B" />
                </div>
              </div>
              <div className="fw-bold mb-1" style={{ fontSize: "24px", color: "#F59E0B" }}>
                {formatCurrency(totalActualAmount)}
              </div>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Tổng tiền thực tế (VNĐ)
              </p>
            </div>
          </div>
        </div>

        {/* Chênh lệch Card */}
        <div className="mb-4">
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "32px",
            }}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "12px",
                      background: totalDifference >= 0 ? "#D1FAE5" : "#FEE2E2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {totalDifference >= 0 ? (
                      <TrendingUp size={28} color={totalDifference > 0 ? "#10B981" : "#6B7280"} />
                    ) : (
                      <TrendingDown size={28} color="#EF4444" />
                    )}
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0" style={{ fontSize: "18px", color: "#111827" }}>
                      Tổng chênh lệch
                    </h5>
                    <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                      Chênh lệch giữa tổng tiền thực tế và tổng ngân sách
                    </p>
                  </div>
                </div>
                <div
                  className="fw-bold"
                  style={{
                    fontSize: "32px",
                    color: totalDifference > 0 ? "#10B981" : totalDifference < 0 ? "#EF4444" : "#6B7280",
                    marginTop: "16px",
                  }}
                >
                  {totalDifference >= 0 ? "+" : ""}
                  {formatCurrency(Math.abs(totalDifference))} VNĐ
                </div>
                {totalDifference !== 0 && (
                  <p className="text-muted mt-2 mb-0" style={{ fontSize: "14px" }}>
                    {totalDifference > 0
                      ? "Thực tế vượt dự trù"
                      : "Thực tế thấp hơn dự trù"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div
          style={{
            background: "#F9FAFB",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "24px",
          }}
        >
          <h5 className="fw-bold mb-3" style={{ fontSize: "18px", color: "#111827" }}>
            Tóm tắt
          </h5>
          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Tổng số đơn:</span>
                <span className="fw-semibold">{approvedCount + unapprovedCount}</span>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Tỷ lệ đã duyệt:</span>
                <span className="fw-semibold">
                  {approvedCount + unapprovedCount > 0
                    ? ((approvedCount / (approvedCount + unapprovedCount)) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Tỷ lệ chưa duyệt:</span>
                <span className="fw-semibold">
                  {approvedCount + unapprovedCount > 0
                    ? ((unapprovedCount / (approvedCount + unapprovedCount)) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Tỷ lệ thực tế/ngân sách:</span>
                <span className="fw-semibold">
                  {totalBudget > 0
                    ? ((totalActualAmount / totalBudget) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default BudgetStatisticsHoD;

