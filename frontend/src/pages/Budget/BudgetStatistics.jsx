import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";

const BudgetStatistics = () => {
  const { eventId } = useParams();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, [eventId]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const data = await budgetApi.getBudgetStatistics(eventId);
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

  if (loading) {
    return <Loading />;
  }

  if (!statistics) {
    return null;
  }

  const { totalEstimated, totalActual, totalPaid, totalDifference, departmentStats } = statistics;

  return (
    <UserLayout
      title="Thống kê thu chi"
      activePage="budget"
      sidebarType="hooc"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4">
          <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
            Thống kê thu chi
          </h2>
          <p className="text-muted mb-0">
            Tổng quan về tình hình tài chính của sự kiện
          </p>
        </div>

        {/* Summary Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted" style={{ fontSize: "14px" }}>
                  Tổng dự trù
                </span>
                <i className="bi bi-calculator" style={{ fontSize: "24px", color: "#3B82F6" }}></i>
              </div>
              <div
                className="fw-bold"
                style={{ fontSize: "28px", color: "#3B82F6" }}
              >
                {formatCurrency(totalEstimated)} VND
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted" style={{ fontSize: "14px" }}>
                  Tổng thực tế
                </span>
                <i className="bi bi-cash-stack" style={{ fontSize: "24px", color: "#10B981" }}></i>
              </div>
              <div
                className="fw-bold"
                style={{ fontSize: "28px", color: "#10B981" }}
              >
                {formatCurrency(totalActual)} VND
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted" style={{ fontSize: "14px" }}>
                  Đã thanh toán
                </span>
                <i className="bi bi-check-circle" style={{ fontSize: "24px", color: "#8B5CF6" }}></i>
              </div>
              <div
                className="fw-bold"
                style={{ fontSize: "28px", color: "#8B5CF6" }}
              >
                {formatCurrency(totalPaid)} VND
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted" style={{ fontSize: "14px" }}>
                  Chênh lệch
                </span>
                <i
                  className={`bi ${totalDifference >= 0 ? "bi-arrow-up" : "bi-arrow-down"}`}
                  style={{
                    fontSize: "24px",
                    color: totalDifference >= 0 ? "#EF4444" : "#10B981",
                  }}
                ></i>
              </div>
              <div
                className="fw-bold"
                style={{
                  fontSize: "28px",
                  color: totalDifference >= 0 ? "#EF4444" : "#10B981",
                }}
              >
                {totalDifference >= 0 ? "+" : ""}
                {formatCurrency(totalDifference)} VND
              </div>
            </div>
          </div>
        </div>

        {/* Department Statistics Table */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "24px",
          }}
        >
          <h5 className="fw-bold mb-4" style={{ fontSize: "18px", color: "#111827" }}>
            Thống kê theo ban
          </h5>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Tên Ban
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Dự Trù (VNĐ)
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Thực Tế (VNĐ)
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Đã Thanh Toán (VNĐ)
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Chênh Lệch (VNĐ)
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Trạng Thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      Chưa có dữ liệu thống kê
                    </td>
                  </tr>
                ) : (
                  departmentStats.map((dept, index) => {
                    const getStatusBadge = (status) => {
                      const statusMap = {
                        draft: { label: "Nháp", color: "#6B7280", bg: "#F3F4F6" },
                        submitted: { label: "Chờ duyệt", color: "#F59E0B", bg: "#FEF3C7" },
                        changes_requested: { label: "Bị từ chối", color: "#EF4444", bg: "#FEE2E2" },
                        approved: { label: "Đã duyệt", color: "#10B981", bg: "#D1FAE5" },
                        locked: { label: "Đã khóa", color: "#374151", bg: "#E5E7EB" },
                      };
                      const statusInfo = statusMap[status] || statusMap.draft;
                      return (
                        <span
                          className="badge px-3 py-2"
                          style={{
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      );
                    };

                    return (
                      <tr key={index}>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold">{dept.departmentName}</span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold" style={{ color: "#3B82F6" }}>
                            {formatCurrency(dept.estimated)}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold" style={{ color: "#10B981" }}>
                            {formatCurrency(dept.actual)}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold" style={{ color: "#8B5CF6" }}>
                            {formatCurrency(dept.paid)}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            className="fw-semibold"
                            style={{
                              color: dept.difference >= 0 ? "#EF4444" : "#10B981",
                            }}
                          >
                            {dept.difference >= 0 ? "+" : ""}
                            {formatCurrency(dept.difference)}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>{getStatusBadge(dept.status)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default BudgetStatistics;


