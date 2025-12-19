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

      // Lấy tất cả budgets mà Member được phép xem trong event:
      // - Budget đã được HoOC duyệt của ban mình
      // - + tất cả budget đã được duyệt và "Công khai" (isPublic = true) của các ban khác
      try {
        const budgetsResponse = await budgetApi.getAllBudgetsForEvent(eventId, {
          status: 'approved',
          page: 1,
          limit: 1000,
          includeItems: false,
        });
        
        const budgetsList = Array.isArray(budgetsResponse) 
          ? budgetsResponse 
          : (budgetsResponse?.data || budgetsResponse?.budgets || []);
        
        // Format budgets để hiển thị, giữ cả isPublic để xử lý quyền xem chi tiết
        const formattedBudgets = budgetsList.map((budget) => ({
          budgetId: budget._id || budget.id,
          departmentId: budget.departmentId?._id || budget.departmentId,
          departmentName: budget.departmentName || budget.departmentId?.name || userDepartment.name || "Ban",
          requestName: (budget.name && budget.name.trim()) || "Ngân sách dự trù của Ban",
          budgetStatus: budget.status || null,
          totalItems: budget.totalItems || 0,
          totalCost: budget.totalCost || 0,
          createdAt: budget.createdAt,
          submittedAt: budget.submittedAt,
          isPublic: !!budget.isPublic,
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
                        Tên đơn
                      </th>
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
                        <td style={{ padding: "12px", maxWidth: 240 }}>
                          <span className="fw-semibold" style={{ fontSize: "16px", color: "#3B82F6" }}>
                            {budget.requestName || "Ngân sách dự trù của Ban"}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span className="text-muted">
                            {budget.departmentName}
                            {budget.isPublic && (
                              <span className="badge ms-2" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                                Công khai
                              </span>
                            )}
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
                              const userDeptId = department?._id || department?.id;
                              const budgetDeptId = budget.departmentId;
                              const isSameDept = String(userDeptId) === String(budgetDeptId);
                              
                              // Cho phép xem nếu là budget của ban mình HOẶC budget đã được HoOC công khai
                              if (isSameDept || budget.isPublic) {
                                navigate(`/events/${eventId}/departments/${budget.departmentId}/budget/${budget.budgetId}`);
                              } else {
                                toast.error("Bạn chỉ được xem budget của ban mình hoặc budget được công khai");
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

