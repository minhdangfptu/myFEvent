import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { departmentService } from "../../services/departmentService";
import { budgetApi } from "../../apis/budgetApi";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";

const DepartmentBudgetsListPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole, forceCheckEventAccess } = useEvents();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [hodDepartmentId, setHodDepartmentId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra role và lấy department của HOD
      // Dùng forceCheckEventAccess để đảm bảo lấy role mới nhất từ server
      // (quan trọng khi vừa được chuyển ban)
      let role = await forceCheckEventAccess(eventId);
      if (!role || role === '') {
        role = await fetchEventRole(eventId);
      }
      
      // Đảm bảo có user trước khi tiếp tục
      if (!user) {
        setLoading(false);
        navigate(`/events/${eventId}/hod-event-detail`, { replace: true });
        return;
      }
      
      if (role === 'HoD') {
        // Lấy department mà user là leader (để biết ban của HoD)
        // QUAN TRỌNG: Luôn fetch departments từ server để đảm bảo có dữ liệu mới nhất
        // (đặc biệt quan trọng khi vừa được chuyển ban hoặc thay đổi role)
        const depts = await departmentService.getDepartments(eventId);
        const departmentsList = Array.isArray(depts) ? depts : (depts?.items || depts?.data || []);
        const userId = user._id || user.id;
        
        // Tìm department mà user là leader
        // Lưu ý: Có thể user vừa được chuyển ban nên cần tìm trong tất cả departments
        const userDepartment = departmentsList.find(dept => {
          const leaderId = dept.leaderId?._id || dept.leaderId || dept.leader?._id || dept.leader;
          return leaderId && (leaderId.toString() === userId?.toString() || leaderId === userId);
        });
        
        if (userDepartment) {
          const deptId = userDepartment._id || userDepartment.id;
          setHodDepartmentId(deptId);
          
          // Lấy tất cả budgets mà HoD được phép xem trong event:
          // - Budget của ban mình
          // - + tất cả budget được HoOC "Công khai" (isPublic = true)
          const budgetsResponse = await budgetApi.getAllBudgetsForEvent(eventId, {
            page: 1,
            limit: 100,
            includeItems: false,
          });
          
          const budgetsList = Array.isArray(budgetsResponse) 
            ? budgetsResponse 
            : (budgetsResponse?.data || budgetsResponse?.budgets || []);
          
          // Filter budgets: chỉ hiển thị budget của ban mình HOẶC budget công khai
          const filteredBudgets = budgetsList.filter(budget => {
            const budgetDeptId = budget.departmentId?._id || budget.departmentId;
            const isOwnDepartment = budgetDeptId && String(budgetDeptId) === String(deptId);
            const isPublic = !!budget.isPublic;
            // Hiển thị nếu là budget của ban mình HOẶC là budget công khai
            return isOwnDepartment || isPublic;
          });
          
          // Format budgets để hiển thị (giữ cả thông tin isPublic)
          const formattedBudgets = filteredBudgets.map((budget) => ({
            budgetId: budget._id || budget.id,
            departmentId: budget.departmentId?._id || budget.departmentId,
            departmentName: budget.departmentName || budget.departmentId?.name || "Không rõ ban",
            requestName: (budget.name && budget.name.trim()) || "Ngân sách dự trù của Ban",
            creatorName: budget.creatorName || "",
            budgetStatus: budget.status || null,
            totalItems: budget.totalItems || 0,
            totalCost: budget.totalCost || 0,
            createdAt: budget.createdAt,
            submittedAt: budget.submittedAt,
            isPublic: !!budget.isPublic,
          }));
          
          setDepartments(formattedBudgets);
          setLoading(false);
        } else {
          // Không tìm thấy ban - có thể là:
          // 1. User vừa được chuyển ban nhưng backend chưa cập nhật leaderId
          // 2. User chưa được gán làm leader của department nào
          // 3. Cache chưa được cập nhật
          
          // Thử lại một lần nữa sau khi đợi một chút (có thể backend đang xử lý)
          console.warn('Không tìm thấy department cho HoD, thử lại sau 500ms...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Fetch lại departments
          const retryDepts = await departmentService.getDepartments(eventId);
          const retryDepartmentsList = Array.isArray(retryDepts) ? retryDepts : (retryDepts?.items || retryDepts?.data || []);
          
          const retryUserDepartment = retryDepartmentsList.find(dept => {
            const leaderId = dept.leaderId?._id || dept.leaderId || dept.leader?._id || dept.leader;
            return leaderId && (leaderId.toString() === userId?.toString() || leaderId === userId);
          });
          
          if (retryUserDepartment) {
            const deptId = retryUserDepartment._id || retryUserDepartment.id;
            setHodDepartmentId(deptId);
            setDepartments([]); // Hiển thị trang trống nhưng không redirect
            setLoading(false);
          } else {
            // Vẫn không tìm thấy, redirect về trang chính
            console.warn('Vẫn không tìm thấy department sau retry');
            setLoading(false);
            navigate(`/events/${eventId}/hod-event-detail`, { replace: true });
            return;
          }
        }
      } else {
        // Nếu không phải HoD, redirect về trang phù hợp
        setLoading(false);
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
            <p className="text-muted">Danh sách tất cả các đơn budget của ban</p>
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
                            {budget.requestName || "Ngân sách dự trù của Ban"}
                          </span>
                          {budget.creatorName && (
                            <div className="text-muted" style={{ fontSize: "13px" }}>
                              Trưởng ban: {budget.creatorName}
                            </div>
                          )}
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
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => navigate(`/events/${eventId}/departments/${budget.departmentId}/budget/${budget.budgetId}`)}
                              style={{ borderRadius: "8px" }}
                            >
                              <i className="bi bi-eye me-1"></i>
                              Chi tiết
                            </button>
                            {/* Nút "Gửi cho HoOC" chỉ hiển thị cho draft VÀ chỉ cho budget của ban mình */}
                            {budget.budgetStatus === 'draft' && hodDepartmentId && String(budget.departmentId) === String(hodDepartmentId) && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={async () => {
                                  try {
                                    await budgetApi.submitBudget(eventId, budget.departmentId, budget.budgetId);
                                    toast.success("Gửi cho Trường ban tổ chức duyệt thành công!");
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
                            {/* Nút "Xóa" chỉ cho draft của ban mình, không cho xóa khi status là submitted (chờ duyệt) */}
                            {budget.budgetStatus === 'draft' && hodDepartmentId && String(budget.departmentId) === String(hodDepartmentId) && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                  setBudgetToDelete(budget);
                                  setShowDeleteModal(true);
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setBudgetToDelete(null);
        }}
        onConfirm={async () => {
          if (!budgetToDelete) return;
          
          setIsDeleting(true);
          try {
            await budgetApi.deleteDraft(eventId, budgetToDelete.departmentId, budgetToDelete.budgetId);
            toast.success("Xóa budget thành công!");
            setShowDeleteModal(false);
            setBudgetToDelete(null);
            fetchData(); // Refresh danh sách
          } catch (error) {
            toast.error(error?.response?.data?.message || "Xóa budget thất bại!");
          } finally {
            setIsDeleting(false);
          }
        }}
        message="Bạn có chắc chắn muốn xóa budget này? Hành động này không thể hoàn tác."
        isLoading={isDeleting}
      />
    </UserLayout>
  );
};

export default DepartmentBudgetsListPage;



