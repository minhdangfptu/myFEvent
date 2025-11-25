import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { useEvents } from "../../contexts/EventContext";
import { departmentService } from "../../services/departmentService";

const DepartmentBudgetEmpty = () => {
  const { eventId, departmentId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();
  const [department, setDepartment] = useState(null);

  useEffect(() => {
    fetchDepartment();
  }, [eventId, departmentId]);

  const fetchDepartment = async () => {
    // Kiểm tra nếu departmentId là "current" hoặc không hợp lệ
    if (!departmentId || departmentId === "current" || departmentId === "") {
      console.warn("Invalid departmentId:", departmentId);
      navigate(`/events/${eventId}/departments`);
      return;
    }

    try {
      const dept = await departmentService.getDepartmentDetail(eventId, departmentId);
      if (dept) {
        setDepartment(dept);
      } else {
        console.warn("Department not found");
      }
    } catch (error) {
      console.error("Error fetching department:", error);
      // Nếu lỗi, điều hướng đến trang departments
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        navigate(`/events/${eventId}/departments`);
      }
    }
  };

  const handleCreateBudget = () => {
    navigate(`/events/${eventId}/departments/${departmentId}/budget/create`);
  };

  return (
    <UserLayout
      title="View Department Budget / Empty"
      activePage="budget"
      sidebarType="hod"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4">
          <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
            Budget Ban
          </h2>
          <div className="d-flex align-items-center gap-2 text-muted">
            <i className="bi bi-people-fill"></i>
            <span>Ban: {department?.name || "Đang tải..."}</span>
          </div>
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
              background: "#EFF6FF",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <div style={{ position: "relative" }}>
              <i
                className="bi bi-folder-plus"
                style={{ fontSize: "48px", color: "#3B82F6" }}
              ></i>
              <div
                style={{
                  position: "absolute",
                  top: "-8px",
                  right: "-8px",
                  width: "24px",
                  height: "24px",
                  background: "#3B82F6",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="bi bi-three-dots" style={{ fontSize: "12px", color: "#fff" }}></i>
              </div>
            </div>
          </div>

          {/* Text */}
          <h3 className="fw-bold mb-3" style={{ fontSize: "24px", color: "#111827" }}>
            Chưa có budget nào được tạo
          </h3>
          <p
            className="text-muted mb-4 text-center"
            style={{ fontSize: "16px", maxWidth: "500px" }}
          >
            Hãy tạo budget đầu tiên cho ban của bạn để bắt đầu quản lý chi phí sự kiện một cách
            hiệu quả.
          </p>

          {/* Create Button */}
          <button
            className="btn btn-primary"
            onClick={handleCreateBudget}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "600",
              borderRadius: "12px",
              background: "#3B82F6",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <i className="bi bi-plus-circle"></i>
            Tạo Budget Mới
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
                <i className="bi bi-graph-up" style={{ fontSize: "24px", color: "#3B82F6" }}></i>
              </div>
              <h5 className="fw-bold mb-2" style={{ fontSize: "18px", color: "#111827" }}>
                Quản lý chi phí
              </h5>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Theo dõi và kiểm soát mọi khoản chi tiêu của ban một cách chi tiết.
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
                <i className="bi bi-people" style={{ fontSize: "24px", color: "#10B981" }}></i>
              </div>
              <h5 className="fw-bold mb-2" style={{ fontSize: "18px", color: "#111827" }}>
                Phân quyền ban
              </h5>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Thiết lập quyền truy cập cho các thành viên trong ban của bạn.
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
                <i className="bi bi-file-earmark-text" style={{ fontSize: "24px", color: "#8B5CF6" }}></i>
              </div>
              <h5 className="fw-bold mb-2" style={{ fontSize: "18px", color: "#111827" }}>
                Báo cáo tự động
              </h5>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Tạo báo cáo chi tiết về tình hình tài chính và hiệu quả sử dụng ngân sách.
              </p>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default DepartmentBudgetEmpty;

