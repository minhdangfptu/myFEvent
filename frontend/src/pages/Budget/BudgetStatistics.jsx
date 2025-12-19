import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { Calculator, Coins, ArrowUp, ArrowDown, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import { departmentService } from "../../services/departmentService";

const BudgetStatistics = () => {
  const { eventId } = useParams();
  const { fetchEventRole } = useEvents();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [eventRole, setEventRole] = useState("");
  const [hodDepartmentId, setHodDepartmentId] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      if (eventId) {
        try {
          const role = await fetchEventRole(eventId);
          setEventRole(role);
          
          // Nếu là HoD, lấy department mà họ là leader
          if (role === 'HoD' && user) {
            try {
              const departments = await departmentService.getDepartments(eventId);
              const userId = user._id || user.id;
              const userDepartment = departments.find(dept => {
                const leaderId = dept.leaderId?._id || dept.leaderId || dept.leader?._id || dept.leader;
                return leaderId && (leaderId.toString() === userId?.toString() || leaderId === userId);
              });
              
              if (userDepartment) {
                setHodDepartmentId(userDepartment._id || userDepartment.id);
              }
            } catch (error) {
              console.error("Error fetching HoD department:", error);
            }
          }
        } catch (error) {
          console.error("Error checking role:", error);
        }
      }
    };
    
    checkRole();
  }, [eventId, fetchEventRole, user]);

  useEffect(() => {
    if (eventRole) {
      fetchStatistics();
    }
  }, [eventId, eventRole, hodDepartmentId]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const departmentId = eventRole === 'HoD' ? hodDepartmentId : null;
      const data = await budgetApi.getBudgetStatistics(eventId, departmentId);
      setStatistics(data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast.error("Không thể tải thống kê");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0);
  };

  if (loading || !eventRole) {
    return (
      <UserLayout
        title="Thống kê chi tiêu"
        activePage={eventRole === 'HoD' ? 'finance-statistics' : 'finance-stats'}
        sidebarType={eventRole === 'HoD' ? 'hod' : 'hooc'}
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải Thống kê chi tiêu...</div>
        </div>
      </UserLayout>
    );
  }

  if (!statistics) {
    return null;
  }

  const { totalEstimated, totalActual, totalDifference, budgetCounts, departmentStats } = statistics;

  return (
    <UserLayout
      title="Thống kê chi tiêu"
      activePage={eventRole === 'HoD' ? 'finance-statistics' : 'finance-stats'}
      sidebarType={eventRole === 'HoD' ? 'hod' : 'hooc'}
      eventId={eventId}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4">
          <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
            {eventRole === 'HoD' ? 'Thống kê chi tiêu của ban' : 'Thống kê chi tiêu'}
          </h2>
          <p className="text-muted mb-0">
            {eventRole === 'HoD' 
              ? 'Tổng quan về tình hình tài chính của ban bạn'
              : 'Tổng quan về tình hình tài chính của sự kiện'}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                minHeight: "160px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted" style={{ fontSize: "14px", fontWeight: "500" }}>
                  Tổng dự trù
                </span>
                <div style={{ 
                  background: "#EFF6FF", 
                  borderRadius: "8px", 
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Calculator size={20} style={{ color: "#3B82F6" }} />
                </div>
              </div>
              <div
                className="fw-bold"
                style={{ fontSize: "32px", color: "#3B82F6", lineHeight: "1.2" }}
              >
                {formatCurrency(totalEstimated)} VND
              </div>
              <div className="text-muted mt-2" style={{ fontSize: "12px" }}>
                (Chỉ tính đơn đã duyệt)
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                minHeight: "160px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted" style={{ fontSize: "14px", fontWeight: "500" }}>
                  Tổng thực tế
                </span>
                <div style={{ 
                  background: "#F0FDF4", 
                  borderRadius: "8px", 
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Coins size={20} style={{ color: "#10B981" }} />
                </div>
              </div>
              <div
                className="fw-bold"
                style={{ fontSize: "32px", color: "#10B981", lineHeight: "1.2" }}
              >
                {formatCurrency(totalActual)} VND
              </div>
              <div className="text-muted mt-2" style={{ fontSize: "12px" }}>
                (Chỉ tính đơn đã duyệt)
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                minHeight: "160px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted" style={{ fontSize: "14px", fontWeight: "500" }}>
                  Chênh lệch
                </span>
                <div style={{ 
                  background: totalDifference >= 0 ? "#FEE2E2" : "#F0FDF4", 
                  borderRadius: "8px", 
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {totalDifference >= 0 ? (
                    <ArrowUp size={20} style={{ color: "#EF4444" }} />
                  ) : (
                    <ArrowDown size={20} style={{ color: "#10B981" }} />
                  )}
                </div>
              </div>
              <div
                className="fw-bold d-flex align-items-center gap-2"
                style={{
                  fontSize: "32px",
                  color: totalDifference >= 0 ? "#EF4444" : "#10B981",
                  lineHeight: "1.2"
                }}
              >
                {totalDifference >= 0 ? (
                  <>
                    <ArrowUp size={24} />
                    {formatCurrency(Math.abs(totalDifference))}
                  </>
                ) : (
                  <>
                    <ArrowDown size={24} />
                    {formatCurrency(Math.abs(totalDifference))}
                  </>
                )}
              </div>
              <div className="text-muted mt-2" style={{ fontSize: "12px" }}>
                (Chỉ tính đơn đã duyệt)
              </div>
            </div>
          </div>
        </div>

        {/* Department Statistics - Cards Layout */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h5 className="fw-bold mb-4" style={{ fontSize: "18px", color: "#111827" }}>
            Thống kê chi tiết theo ban
          </h5>

          {departmentStats.length === 0 ? (
            <div className="text-center text-muted py-5">
              Chưa có dữ liệu thống kê
            </div>
          ) : (
            <div className="row g-4">
              {departmentStats.map((dept, index) => {
                const deptDifference = dept.difference || 0;
                return (
                  <div key={index} className="col-md-6 col-lg-4">
                    <div
                      style={{
                        background: "#F9FAFB",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        padding: "20px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        height: "100%",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <h6 className="fw-bold mb-0" style={{ fontSize: "16px", color: "#111827" }}>
                          {dept.departmentName}
                        </h6>
                        <BarChart3 size={20} style={{ color: "#6B7280" }} />
                      </div>
                      
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted" style={{ fontSize: "12px" }}>Dự trù</span>
                          <span className="fw-semibold" style={{ color: "#3B82F6", fontSize: "14px" }}>
                            {formatCurrency(dept.estimated)} VND
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted" style={{ fontSize: "12px" }}>Thực tế</span>
                          <span className="fw-semibold" style={{ color: "#10B981", fontSize: "14px" }}>
                            {formatCurrency(dept.actual)} VND
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted" style={{ fontSize: "12px" }}>Chênh lệch</span>
                          <span 
                            className="fw-semibold d-flex align-items-center gap-1"
                            style={{ 
                              color: deptDifference >= 0 ? "#EF4444" : "#10B981", 
                              fontSize: "14px" 
                            }}
                          >
                            {deptDifference >= 0 ? (
                              <>
                                <ArrowUp size={16} />
                                {formatCurrency(Math.abs(deptDifference))}
                              </>
                            ) : (
                              <>
                                <ArrowDown size={16} />
                                {formatCurrency(Math.abs(deptDifference))}
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-top">
                        <div className="d-flex flex-wrap gap-1">
                          {dept.approvedCount > 0 && (
                            <span className="badge" style={{ background: "#D1FAE5", color: "#10B981", fontSize: "10px", padding: "4px 8px" }}>
                              Đã duyệt: {dept.approvedCount}
                            </span>
                          )}
                          {dept.submittedCount > 0 && (
                            <span className="badge" style={{ background: "#FEF3C7", color: "#F59E0B", fontSize: "10px", padding: "4px 8px" }}>
                              Chờ: {dept.submittedCount}
                            </span>
                          )}
                          {dept.rejectedCount > 0 && (
                            <span className="badge" style={{ background: "#FEE2E2", color: "#EF4444", fontSize: "10px", padding: "4px 8px" }}>
                              Từ chối: {dept.rejectedCount}
                            </span>
                          )}
                          <span className="text-muted" style={{ fontSize: "10px", padding: "4px 0" }}>
                            Tổng: {dept.totalCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default BudgetStatistics;


