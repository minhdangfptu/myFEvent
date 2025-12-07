import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { departmentService } from "../../services/departmentService";
import { budgetApi } from "../../apis/budgetApi";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";

const DepartmentBudgetsListPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [hodDepartmentId, setHodDepartmentId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra role và lấy department của HOD
      const role = await fetchEventRole(eventId);
      
      if (role === 'HoD' && user) {
        // Lấy department mà user là leader
        const depts = await departmentService.getDepartments(eventId);
        const departmentsList = Array.isArray(depts) ? depts : (depts?.items || depts?.data || []);
        const userId = user._id || user.id;
        
        const userDepartment = departmentsList.find(dept => {
          const leaderId = dept.leaderId?._id || dept.leaderId || dept.leader?._id || dept.leader;
          return leaderId && (leaderId.toString() === userId?.toString() || leaderId === userId);
        });
        
        if (userDepartment) {
          const deptId = userDepartment._id || userDepartment.id;
          setHodDepartmentId(deptId);
          
          // Chỉ load summary của budgets (không load items để tối ưu)
          const budgetsResponse = await budgetApi.getAllBudgetsForDepartment(eventId, deptId, {
            page: 1,
            limit: 100, // Giảm từ 1000 xuống 100
            includeItems: false // Chỉ load summary, không load items
          });
          
          const budgetsList = Array.isArray(budgetsResponse) 
            ? budgetsResponse 
            : (budgetsResponse?.data || budgetsResponse?.budgets || []);
          
          // Format budgets để hiển thị
          const formattedBudgets = budgetsList.map((budget) => ({
            budgetId: budget._id || budget.id,
            departmentId: budget.departmentId || deptId,
            departmentName: budget.departmentName || userDepartment.name || "Ban của tôi",
            requestName: (budget.name && budget.name.trim()) || "Budget Ban",
            creatorName: budget.creatorName || "",
            budgetStatus: budget.status || null,
            totalItems: budget.totalItems || 0,
            totalCost: budget.totalCost || 0,
            createdAt: budget.createdAt,
            submittedAt: budget.submittedAt,
          }));
          
          setDepartments(formattedBudgets);
        } else {
          toast.error("Không tìm thấy ban mà bạn là trưởng ban");
          setDepartments([]);
        }
      } else {
        // Nếu không phải HoD, redirect về trang phù hợp
        if (role === 'Member') {
          navigate(`/events/${eventId}/budgets/member`, { replace: true });
        } else if (role === 'HoOC') {
          navigate(`/events/${eventId}/budgets`, { replace: true });
        } else {
          // Fallback: redirect về trang budgets chung
          navigate(`/events/${eventId}/budgets`, { replace: true });
        }
        return;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Không thể tải dữ liệu");
      setDepartments([]);
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
        sidebarType="hod"
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
      sidebarType="hod"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4 d-flex justify-content-between align-items-start">
          <div>
            <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
              Danh sách Ngân sách của Ban
            </h2>
            <p className="text-muted">Danh sách tất cả các đơn budget của ban bạn</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              try {
                if (hodDepartmentId) {
                  navigate(`/events/${eventId}/departments/${hodDepartmentId}/budget/create`);
                } else {
                  const depts = await departmentService.getDepartments(eventId);
                  const departmentsList = Array.isArray(depts) ? depts : (depts?.items || depts?.data || []);
                  
                  if (departmentsList.length > 0) {
                    const firstDept = departmentsList[0];
                    const deptId = firstDept._id || firstDept.id;
                    if (deptId) {
                      navigate(`/events/${eventId}/departments/${deptId}/budget/create`);
                    } else {
                      toast.error("Không tìm thấy ban để tạo budget");
                    }
                  } else {
                    toast.error("Chưa có ban nào trong sự kiện");
                  }
                }
              } catch (error) {
                console.error("Error fetching departments:", error);
                toast.error("Không thể tải danh sách ban");
              }
            }}
            style={{ borderRadius: "8px" }}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Tạo Budget mới
          </button>
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
              <p className="text-muted">Chưa có budget nào</p>
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
                      Ban phụ trách
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
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        Chưa có budget nào
                      </td>
                    </tr>
                  ) : (
                    departments.map((budget) => (
                      <tr key={budget.budgetId}>
                        <td style={{ padding: "12px", maxWidth: 240 }}>
                          <span className="fw-semibold" style={{ fontSize: "16px" }}>
                            {budget.requestName || "Budget Ban"}
                          </span>
                          {budget.creatorName && (
                            <div className="text-muted" style={{ fontSize: "13px" }}>
                              Trưởng ban: {budget.creatorName}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span className="text-muted">{budget.departmentName}</span>
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
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => navigate(`/events/${eventId}/departments/${budget.departmentId}/budget/${budget.budgetId}`)}
                              style={{ borderRadius: "8px" }}
                            >
                              <i className="bi bi-eye me-1"></i>
                              Chi tiết
                            </button>
                            {/* Nút "Gửi cho HoOC" chỉ hiển thị cho draft */}
                            {budget.budgetStatus === 'draft' && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={async () => {
                                  try {
                                    await budgetApi.submitBudget(eventId, budget.departmentId, budget.budgetId);
                                    toast.success("Gửi cho TBTC duyệt thành công!");
                                    fetchData(); // Refresh danh sách
                                  } catch (error) {
                                    toast.error(error?.response?.data?.message || "Gửi duyệt thất bại!");
                                  }
                                }}
                                style={{ borderRadius: "8px" }}
                              >
                                <i className="bi bi-send me-1"></i>
                                Gửi
                              </button>
                            )}
                            {/* Nút "Xóa" chỉ cho draft, không cho xóa khi status là submitted (chờ duyệt) */}
                            {budget.budgetStatus === 'draft' && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={async () => {
                                  if (window.confirm(`Bạn có chắc chắn muốn xóa budget này? Hành động này không thể hoàn tác.`)) {
                                    try {
                                      await budgetApi.deleteDraft(eventId, budget.departmentId, budget.budgetId);
                                      toast.success("Xóa budget thành công!");
                                      fetchData(); // Refresh danh sách
                                    } catch (error) {
                                      toast.error(error?.response?.data?.message || "Xóa budget thất bại!");
                                    }
                                  }
                                }}
                                style={{ borderRadius: "8px" }}
                              >
                                <i className="bi bi-trash me-1"></i>
                                Xóa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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



