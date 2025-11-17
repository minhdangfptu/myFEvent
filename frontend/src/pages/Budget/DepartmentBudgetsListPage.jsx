import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { departmentService } from "../../services/departmentService";
import { budgetApi } from "../../apis/budgetApi";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";

const DepartmentBudgetsListPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const depts = await departmentService.getDepartments(eventId);
      const departmentsList = Array.isArray(depts) ? depts : (depts?.items || depts?.data || []);
      
      // Lấy thông tin budget cho mỗi department
      const departmentsWithBudget = await Promise.all(
        departmentsList.map(async (dept) => {
          try {
            const budget = await budgetApi.getDepartmentBudget(eventId, dept._id || dept.id);
            return {
              ...dept,
              budget: budget || null,
              hasBudget: !!budget,
              budgetStatus: budget?.status || null,
              totalItems: budget?.items?.length || 0,
              totalCost: budget?.items?.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0) || 0,
            };
          } catch (error) {
            // Nếu không có budget, trả về department không có budget
            return {
              ...dept,
              budget: null,
              hasBudget: false,
              budgetStatus: null,
              totalItems: 0,
              totalCost: 0,
            };
          }
        })
      );
      
      setDepartments(departmentsWithBudget);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0);
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      draft: "Nháp",
      submitted: "Chờ duyệt",
      approved: "Đã duyệt",
      changes_requested: "Yêu cầu chỉnh sửa",
      sent_to_members: "Đã gửi xuống member",
    };
    return statusMap[status] || status || "Chưa có";
  };

  const getStatusColor = (status) => {
    const colorMap = {
      draft: "#6B7280",
      submitted: "#3B82F6",
      approved: "#10B981",
      changes_requested: "#EF4444",
      sent_to_members: "#8B5CF6",
    };
    return colorMap[status] || "#6B7280";
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <UserLayout
      title="Danh sách Ngân sách của Ban"
      activePage="budget"
      sidebarType="hod"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4">
          <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
            Danh sách Ngân sách của Ban
          </h2>
          <p className="text-muted">Xem tổng quan ngân sách của tất cả các ban trong sự kiện</p>
        </div>

        {/* Departments List */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "24px",
          }}
        >
          {departments.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">Chưa có ban nào trong sự kiện</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Tên Ban
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Trạng thái
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Tổng số mục
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Tổng ngân sách (VNĐ)
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept._id || dept.id}>
                      <td style={{ padding: "12px" }}>
                        <span className="fw-semibold" style={{ fontSize: "16px" }}>
                          {dept.name || "Chưa có tên"}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {dept.hasBudget ? (
                          <span
                            className="badge px-3 py-2"
                            style={{
                              background: getStatusColor(dept.budgetStatus) + "22",
                              color: getStatusColor(dept.budgetStatus),
                              fontSize: "14px",
                              fontWeight: "600",
                            }}
                          >
                            {getStatusLabel(dept.budgetStatus)}
                          </span>
                        ) : (
                          <span className="text-muted">Chưa có budget</span>
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span className="fw-semibold">
                          {dept.totalItems}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span className="fw-semibold" style={{ color: "#3B82F6" }}>
                          {formatCurrency(dept.totalCost)}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/events/${eventId}/departments/${dept._id || dept.id}/budget`)}
                          style={{ borderRadius: "8px" }}
                        >
                          <i className="bi bi-eye me-1"></i>
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default DepartmentBudgetsListPage;


