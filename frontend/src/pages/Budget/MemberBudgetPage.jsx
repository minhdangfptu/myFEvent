import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { departmentService } from "../../services/departmentService";
import { budgetApi } from "../../apis/budgetApi";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { useAuth } from "../../contexts/AuthContext";
import { Eye, Info, Wallet } from "lucide-react";


const MemberBudgetPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [department, setDepartment] = useState(null);

  useEffect(() => {
    fetchData();
  }, [eventId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = user?._id || user?.id || user?.userId?._id || user?.userId?.id;
      if (!userId) {
        toast.error("Vui lòng đăng nhập");
        return;
      }

      // Tìm department mà member thuộc về
      const departments = await departmentService.getDepartments(eventId);
      const departmentsList = Array.isArray(departments) 
        ? departments 
        : (departments?.items || departments?.data || []);

      let userDepartment = null;

      for (const dept of departmentsList) {
        try {
          const members = await departmentService.getMembersByDepartment(eventId, dept._id || dept.id);
          const membersArray = Array.isArray(members) ? members : [];
          const isMember = membersArray.some(member => {
            const memberUserId = member.userId?._id || member.userId?.id || member.userId;
            return String(memberUserId) === String(userId);
          });
          
          if (isMember) {
            userDepartment = dept;
            break;
          }
        } catch (err) {
          console.error("Error checking members:", err);
        }
      }

      if (!userDepartment) {
        toast.info("Bạn chưa thuộc ban nào");
        setDepartment(null);
        setBudgets([]);
        return;
      }

      setDepartment(userDepartment);
      const deptId = userDepartment._id || userDepartment.id;

      // Lấy tất cả budgets của department
      try {
        const budgetsResponse = await budgetApi.getAllBudgetsForDepartment(eventId, deptId, {
          page: 1,
          limit: 1000
        });
        
        const budgetsList = Array.isArray(budgetsResponse) 
          ? budgetsResponse 
          : (budgetsResponse?.data || budgetsResponse?.budgets || []);
        
        // Lọc chỉ lấy budgets đã được HoOC duyệt (status = 'approved')
        const approvedBudgets = budgetsList.filter(budget => budget.status === 'approved');
        
        // Format budgets để hiển thị
        const formattedBudgets = approvedBudgets.map((budget) => ({
          budgetId: budget._id || budget.id,
          departmentId: budget.departmentId || deptId,
          departmentName: budget.departmentName || userDepartment.name || "Ban của tôi",
          budgetStatus: budget.status || null,
          totalItems: budget.totalItems || 0,
          totalCost: budget.totalCost || 0,
          createdAt: budget.createdAt,
          submittedAt: budget.submittedAt,
        }));
        
        setBudgets(formattedBudgets);
      } catch (error) {
        if (error?.response?.status === 404) {
          // Chưa có budget
          setBudgets([]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Không thể tải dữ liệu");
      setBudgets([]);
      setDepartment(null);
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
    return (
      <UserLayout
        title="Danh sách Ngân sách của Ban"
        activePage="finance-budget"
        sidebarType="member"
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải danh sách ngân sách...</div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title="Danh sách Ngân sách của Ban"
      activePage="finance-budget"
      sidebarType="member"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4">
          <div>
            <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
              Danh sách Ngân sách của Ban
            </h2>
            <p className="text-muted">Danh sách các đơn budget đã được duyệt của ban bạn (chỉ xem)</p>
          </div>
        </div>

        {!department ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "48px",
              textAlign: "center",
            }}
          >
            <Info size={24} style={{ color: "#6b7280" }} />
            <h4 style={{ color: "#374151", marginBottom: "8px" }}>Chưa thuộc ban nào</h4>
            <p className="text-muted">Bạn chưa được thêm vào ban nào trong sự kiện này.</p>
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "24px",
            }}
          >
            {budgets.length === 0 ? (
              <div className="text-center py-5">
                <Wallet size={32} style={{ color: "#6b7280" }} />
                <p className="text-muted">Chưa có budget nào đã được duyệt</p>
                <p className="text-muted small">Vui lòng đợi Trưởng ban tạo và HoOC duyệt ngân sách.</p>
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
                        Ngày tạo
                      </th>
                      <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.map((budget) => (
                      <tr key={budget.budgetId}>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold" style={{ fontSize: "16px" }}>
                            {budget.departmentName}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            className="badge px-3 py-2"
                            style={{
                              background: getStatusColor(budget.budgetStatus) + "22",
                              color: getStatusColor(budget.budgetStatus),
                              fontSize: "14px",
                              fontWeight: "600",
                            }}
                          >
                            {getStatusLabel(budget.budgetStatus)}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold">
                            {budget.totalItems}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold" style={{ color: "#3B82F6" }}>
                            {formatCurrency(budget.totalCost)}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span className="text-muted" style={{ fontSize: "14px" }}>
                            {budget.createdAt 
                              ? new Date(budget.createdAt).toLocaleDateString('vi-VN')
                              : '—'}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              // Đảm bảo chỉ xem budget của ban mình
                              const userDeptId = department?._id || department?.id;
                              const budgetDeptId = budget.departmentId;
                              
                              if (String(userDeptId) === String(budgetDeptId)) {
                                navigate(`/events/${eventId}/departments/${budget.departmentId}/budget/${budget.budgetId}`);
                              } else {
                                toast.error("Bạn chỉ được xem budget của ban mình");
                              }
                            }}
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
        )}
      </div>
    </UserLayout>
  );
};

export default MemberBudgetPage;

