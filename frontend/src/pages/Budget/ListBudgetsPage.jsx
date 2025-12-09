import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import { departmentService } from "../../services/departmentService";
import { Bell, CheckCircle, ChevronLeft, ChevronRight, Clock, FileText, RotateCw, Search, Send, Trash } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";


const ListBudgetsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole, getEventRole } = useEvents();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // all, submitted, approved, changes_requested, completed
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasAnyBudgets, setHasAnyBudgets] = useState(false); // Check if there are any budgets at all (across all tabs)
  const [eventRole, setEventRole] = useState("");
  const [checkingRole, setCheckingRole] = useState(true);
  const [hodDepartmentId, setHodDepartmentId] = useState(null); // Department ID nếu user là HoD
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 5;

  // Kiểm tra role khi component mount
  useEffect(() => {
    const checkRole = async () => {
      if (eventId) {
        try {
          setCheckingRole(true);
          const role = await fetchEventRole(eventId);
          setEventRole(role);
          
          // Cho phép HoOC và HoD truy cập
          if (role !== 'HoOC' && role !== 'HoD') {
            toast.error("Bạn không có quyền truy cập trang này");
            navigate(`/events/${eventId}/hod-event-detail`);
            return;
          }
          
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
              } else {
                toast.error("Không tìm thấy ban mà bạn là trưởng ban");
                navigate(`/events/${eventId}/hod-event-detail`);
                return;
              }
            } catch (error) {
              console.error("Error fetching HoD department:", error);
              toast.error("Không thể tải thông tin ban");
              navigate(`/events/${eventId}/hod-event-detail`);
              return;
            }
          }
        } catch (error) {
          console.error("Error checking role:", error);
          toast.error("Không thể kiểm tra quyền truy cập");
          navigate(`/events/${eventId}/hod-event-detail`);
        } finally {
          setCheckingRole(false);
        }
      }
    };
    
    checkRole();
  }, [eventId, fetchEventRole, navigate, user]);

  useEffect(() => {
    if (!checkingRole && (eventRole === 'HoOC' || (eventRole === 'HoD' && hodDepartmentId))) {
      fetchBudgets();
    }
  }, [eventId, activeTab, currentPage, eventRole, hodDepartmentId, checkingRole]);

  useEffect(() => {
    const checkAllBudgets = async () => {
      if (!eventId || checkingRole) return;
      
      try {
        // Nếu là HoD, check tất cả budgets của department của họ
        if (eventRole === 'HoD' && hodDepartmentId) {
          try {
            const budgetsResponse = await budgetApi.getAllBudgetsForDepartment(eventId, hodDepartmentId, { page: 1, limit: 1 }).catch(() => ({ data: [] }));
            const budgetsList = Array.isArray(budgetsResponse) 
              ? budgetsResponse 
              : (budgetsResponse?.data || budgetsResponse?.budgets || []);
            setHasAnyBudgets(budgetsList.length > 0);
          } catch (error) {
            setHasAnyBudgets(false);
          }
        } else if (eventRole === 'HoOC') {
          // HoOC: check tất cả budgets
          const [submitted, approved, rejected, completed] = await Promise.all([
            budgetApi.getAllBudgetsForEvent(eventId, { status: 'submitted', page: 1, limit: 1 }).catch(() => ({ data: [], pagination: {} })),
            budgetApi.getAllBudgetsForEvent(eventId, { status: 'approved', page: 1, limit: 1 }).catch(() => ({ data: [], pagination: {} })),
            budgetApi.getAllBudgetsForEvent(eventId, { status: 'changes_requested', page: 1, limit: 1 }).catch(() => ({ data: [], pagination: {} })),
            budgetApi.getAllBudgetsForEvent(eventId, { status: 'completed', page: 1, limit: 1 }).catch(() => ({ data: [], pagination: {} })),
          ]);
          
          // Response có thể là { data: [...], pagination: {...} } hoặc array sau khi unwrap
          const getBudgetsArray = (response) => {
            if (Array.isArray(response)) return response;
            if (response?.data && Array.isArray(response.data)) return response.data;
            if (response?.items && Array.isArray(response.items)) return response.items;
            if (response?.budgets && Array.isArray(response.budgets)) return response.budgets;
            return [];
          };
          
          const submittedBudgets = getBudgetsArray(submitted);
          const approvedBudgets = getBudgetsArray(approved);
          const rejectedBudgets = getBudgetsArray(rejected);
          const completedBudgets = getBudgetsArray(completed);
          
          const hasData = 
            submittedBudgets.length > 0 ||
            approvedBudgets.length > 0 ||
            rejectedBudgets.length > 0 ||
            completedBudgets.length > 0;
          
          console.log('checkAllBudgets result:', {
            submitted: submittedBudgets.length,
            approved: approvedBudgets.length,
            rejected: rejectedBudgets.length,
            completed: completedBudgets.length,
            hasData
          });
          
          setHasAnyBudgets(hasData);
        }
      } catch (error) {
        console.error("Error checking budgets:", error);
        setHasAnyBudgets(false);
      }
    };
    
    checkAllBudgets();
  }, [eventId, eventRole, hodDepartmentId, checkingRole]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      let response;
      
      // Nếu là HoD, lấy tất cả budgets của department của họ
      if (eventRole === 'HoD' && hodDepartmentId) {
        // Lấy tất cả budgets của department (không filter theo status)
        const rawResponse = await budgetApi.getAllBudgetsForDepartment(eventId, hodDepartmentId, {
          page: currentPage,
          limit: itemsPerPage,
        });
        
        // Format để phù hợp với cấu trúc dữ liệu
        const budgetsList = Array.isArray(rawResponse) 
          ? rawResponse 
          : (rawResponse?.data || rawResponse?.budgets || []);
        
        const formattedBudgets = budgetsList.map(budget => ({
          _id: budget._id || budget.id,
          id: budget._id || budget.id,
          budgetId: budget._id || budget.id,
          departmentId: budget.departmentId || hodDepartmentId,
          departmentName: budget.departmentName || "Ban của tôi",
          name: budget.name || "Budget Ban",
          creatorName: budget.creatorName || "Trưởng ban",
          totalCost: budget.totalCost || 0,
          status: budget.status,
          submittedAt: budget.submittedAt || budget.createdAt,
          createdAt: budget.createdAt,
          totalItems: budget.totalItems || 0,
        }));
        
        response = { 
          data: formattedBudgets, 
          pagination: rawResponse?.pagination || { totalPages: 1, total: formattedBudgets.length } 
        };
      } else {
        // HoOC: lấy tất cả budgets của tất cả departments (KHÔNG bao gồm draft)
        const rawResponse = await budgetApi.getAllBudgetsForEvent(eventId, {
          status: activeTab === 'all' ? undefined : activeTab, // Nếu 'all' thì không filter
          page: currentPage,
          limit: itemsPerPage,
        });
        response = rawResponse;
      }
      
      // Filter budgets theo activeTab cho HoD (nếu cần)
      if (eventRole === 'HoD' && response?.data) {
        if (activeTab !== 'all') {
          response.data = response.data.filter(b => {
            if (activeTab === 'submitted') return b.status === 'submitted';
            if (activeTab === 'approved') return b.status === 'approved';
            if (activeTab === 'changes_requested') return b.status === 'changes_requested';
            if (activeTab === 'completed') return b.status === 'sent_to_members';
            return true;
          });
        }
      }
      
      console.log('fetchBudgets response:', {
        activeTab,
        currentPage,
        eventRole,
        hodDepartmentId,
        response,
        responseType: typeof response,
        isArray: Array.isArray(response),
        hasData: response?.data,
        hasItems: response?.items,
        hasBudgets: response?.budgets,
        responseKeys: response && typeof response === 'object' && !Array.isArray(response) ? Object.keys(response) : []
      });
      
      if (response) {
        // Response có thể là { data: [...], pagination: {...} } hoặc array trực tiếp sau khi unwrap
        let budgetsData = [];
        let paginationData = {};
        
        if (Array.isArray(response)) {
          budgetsData = response;
        } else if (response.data && Array.isArray(response.data)) {
          budgetsData = response.data;
          paginationData = response.pagination || {};
        } else if (response.items && Array.isArray(response.items)) {
          budgetsData = response.items;
          paginationData = response.pagination || {};
        } else if (response.budgets && Array.isArray(response.budgets)) {
          budgetsData = response.budgets;
          paginationData = response.pagination || {};
        } else {
          // Fallback: thử lấy từ response trực tiếp nếu có
          budgetsData = [];
        }
        
        console.log('fetchBudgets processed:', {
          budgetsDataLength: budgetsData.length,
          budgetsData: budgetsData.map(b => ({ id: b._id || b.id, departmentName: b.departmentName, status: b.status })),
          paginationData,
          responseType: typeof response,
          isArray: Array.isArray(response),
          responseKeys: response && typeof response === 'object' ? Object.keys(response) : []
        });
        
        // HoOC không được xem draft budgets từ HoD - filter out draft status
        if (eventRole === 'HoOC') {
          budgetsData = budgetsData.filter(b => b.status !== 'draft');
          
          // Đảm bảo departmentName được lấy đúng từ department object hoặc departmentId
          budgetsData = budgetsData.map(budget => {
            let departmentName = budget.departmentName;
            
            // Nếu không có departmentName, thử lấy từ department object
            if (!departmentName && budget.department) {
              departmentName = budget.department.name || budget.department?.name || null;
            }
            
            // Nếu vẫn không có, thử lấy từ departmentId (sẽ fetch sau nếu cần)
            if (!departmentName && budget.departmentId) {
              // Giữ nguyên departmentId để có thể fetch sau
              departmentName = null;
            }
            
            return {
              ...budget,
              departmentName: departmentName || "—",
              departmentId: budget.departmentId || budget.department?._id || budget.department?.id || null,
            };
          });
          
          // Nếu có budgets thiếu departmentName, fetch thông tin department
          const budgetsNeedingDepartmentInfo = budgetsData.filter(b => !b.departmentName || b.departmentName === "—");
          if (budgetsNeedingDepartmentInfo.length > 0) {
            const departmentIds = [...new Set(budgetsNeedingDepartmentInfo.map(b => b.departmentId).filter(Boolean))];
            
            if (departmentIds.length > 0) {
              try {
                const departments = await departmentService.getDepartments(eventId);
                const departmentsMap = new Map();
                
                if (Array.isArray(departments)) {
                  departments.forEach(dept => {
                    const deptId = dept._id || dept.id;
                    if (deptId) {
                      departmentsMap.set(deptId.toString(), dept.name || dept.title || "—");
                    }
                  });
                }
                
                // Cập nhật departmentName cho các budgets
                budgetsData = budgetsData.map(budget => {
                  if ((!budget.departmentName || budget.departmentName === "—") && budget.departmentId) {
                    const deptName = departmentsMap.get(budget.departmentId.toString());
                    if (deptName) {
                      return { ...budget, departmentName: deptName };
                    }
                  }
                  return budget;
                });
              } catch (error) {
                console.error("Error fetching departments for budget names:", error);
              }
            }
          }
        }
        
        setBudgets(budgetsData);
        setTotalPages(paginationData.totalPages || Math.ceil(budgetsData.length / itemsPerPage) || 1);
      } else {
        console.warn('fetchBudgets: No response data');
        setBudgets([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching budgets:", error);
      console.error("Error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      // Nếu 404, có thể chưa có budgets nào, không cần hiển thị lỗi
      if (error?.response?.status === 404) {
        setBudgets([]);
        setTotalPages(1);
      } else {
        toast.error("Không thể tải danh sách ngân sách");
        setBudgets([]);
      }
    } finally {
      setLoading(false);
    }
  };


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa có";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

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
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        {statusInfo.label}
      </span>
    );
  };

  const handleViewDetail = (departmentId, budgetStatus, budgetId) => {
    // Nếu là HoD, điều hướng đến trang view budget của họ
    // Nếu là HoOC, điều hướng đến trang review (chỉ nếu budget không phải draft)
    if (eventRole === 'HoD') {
      // HoD: nếu có budgetId, navigate với budgetId, nếu không thì dùng view
      if (budgetId) {
        navigate(`/events/${eventId}/departments/${departmentId}/budget/${budgetId}`);
      } else {
        navigate(`/events/${eventId}/departments/${departmentId}/budget/view`);
      }
    } else {
      // HoOC không được xem draft budgets
      if (budgetStatus === 'draft') {
        toast.error("Không thể xem budget nháp. Budget này chưa được gửi lên để duyệt.");
        return;
      }
      // HoOC: luôn truyền budgetId để xem đúng budget
      if (budgetId) {
        navigate(`/events/${eventId}/departments/${departmentId}/budget/${budgetId}/review`);
      } else {
        // Fallback nếu không có budgetId (backward compatibility)
        navigate(`/events/${eventId}/departments/${departmentId}/budget/review`);
      }
    }
  };

  const filteredBudgets = budgets.filter((budget) => {
    const q = searchQuery.toLowerCase();
    return (
      budget.departmentName?.toLowerCase().includes(q) ||
      budget.creatorName?.toLowerCase().includes(q) ||
      budget.name?.toLowerCase().includes(q)
    );
  });

  const paginatedBudgets = filteredBudgets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Kiểm tra quyền truy cập
  if (checkingRole) {
    return <Loading />;
  }

  if (eventRole !== 'HoOC' && eventRole !== 'HoD') {
    return (
      <UserLayout
        title="Không có quyền truy cập"
        activePage="finance-budget"
        sidebarType={eventRole === 'HoD' ? 'hod' : 'hooc'}
        eventId={eventId}
      >
        <div className="container-fluid px-3 px-lg-4 py-3">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10 col-xl-8">
              <div className="empty-state-card">
                <div className="empty-state-icon">
                  <i className="bi bi-shield-exclamation"></i>
                </div>
                <h4 className="empty-state-title">Không có quyền truy cập</h4>
                <p className="empty-state-text">
                  Chỉ Trưởng Ban Tổ Chức hoặc Trưởng Ban mới có thể xem trang này.
                </p>
              </div>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (loading) {
    return (
      <UserLayout
        title={eventRole === 'HoD' ? "Ngân sách của ban" : "Danh sách Ngân sách của Ban"}
        activePage="finance-budget"
        sidebarType={eventRole === 'HoD' ? 'hod' : 'hooc'}
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải danh sách ngân sách...</div>
        </div>
      </UserLayout>
    );
  }

  const isEmpty = filteredBudgets.length === 0;
  // Show message if current tab is empty but other tabs have data
  const showEmptyMessage = isEmpty && !hasAnyBudgets;

  return (
    <UserLayout
      title={isEmpty && !hasAnyBudgets ?
        (eventRole === 'HoD' ? "Ngân sách của ban (trống)" : "Danh sách Ngân sách của Ban (trống)") :
        (eventRole === 'HoD' ? "Ngân sách của ban" : "Danh sách Ngân sách của Ban")}
      activePage="finance-budget"
      sidebarType={eventRole === 'HoD' ? 'hod' : 'hooc'}
      eventId={eventId}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {showEmptyMessage ? (
          /* Empty State */
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "60px 40px",
            }}
          >
            {/* Title and Description */}
            <div className="mb-5">
              <h2 className="fw-bold mb-3" style={{ fontSize: "28px", color: "#111827" }}>
                Ngân sách chờ duyệt (Budget)
              </h2>
              <p className="text-muted mb-0" style={{ fontSize: "16px", color: "#6B7280" }}>
                Hiện chưa có ban nào gửi ngân sách. Khi các ban hoàn thành và nộp ngân sách, chúng sẽ hiển thị tại đây để bạn xem và duyệt.
              </p>
            </div>

            {/* Empty State Icon and Message */}
            <div
              className="d-flex flex-column align-items-center justify-content-center"
              style={{
                minHeight: "400px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: "#F3F4F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "32px",
                  position: "relative",
                }}
              >
                <FileText size={24} style={{ color: "#9CA3AF" }} />
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#F3F4F6",
                    border: "2px solid #9CA3AF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock size={20} style={{ color: "#9CA3AF" }} />
                </div>
              </div>
              
              <h4 className="fw-bold mb-3" style={{ fontSize: "24px", color: "#111827" }}>
                Chưa có ngân sách nào được gửi lên
              </h4>
              
              <p className="text-muted mb-4" style={{ fontSize: "16px", maxWidth: "600px", lineHeight: "1.6" }}>
                Hãy quay lại sau khi các ban đã hoàn thành và nộp bản dự trù. Bạn sẽ có thể xem xét và phê duyệt ngân sách của từng ban tại đây.
              </p>
              
              <button
                className="btn btn-primary"
                onClick={fetchBudgets}
                style={{ borderRadius: "8px", padding: "10px 24px" }}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Làm mới
              </button>
            </div>

            {/* Feature Cards */}
            <div className="row mt-5">
              <div className="col-md-4 mb-3">
                <div
                  className="card h-100"
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    background: "#fff",
                  }}
                >
                  <div className="card-body text-center" style={{ padding: "32px 24px" }}>
                    <div
                      className="icon-wrapper p-3 rounded-circle mb-3 mx-auto"
                      style={{
                        background: "#DBEAFE",
                        width: "64px",
                        height: "64px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Clock size={16} style={{ color: "#3B82F6" }} />
                    </div>
                    <h5 className="card-title fw-bold mb-2" style={{ fontSize: "18px", color: "#111827" }}>
                      Chờ nộp
                    </h5>
                    <p className="card-text text-muted mb-0" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                      Các ban đang chuẩn bị và hoàn thiện bản dự trù ngân sách
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div
                  className="card h-100"
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    background: "#fff",
                  }}
                >
                  <div className="card-body text-center" style={{ padding: "32px 24px" }}>
                    <div
                      className="icon-wrapper p-3 rounded-circle mb-3 mx-auto"
                      style={{
                        background: "#D1FAE5",
                        width: "64px",
                        height: "64px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CheckCircle size={16} style={{ color: "#10B981" }} />
                    </div>
                    <h5 className="card-title fw-bold mb-2" style={{ fontSize: "18px", color: "#111827" }}>
                      Duyệt nhanh
                    </h5>
                    <p className="card-text text-muted mb-0" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                      Quy trình duyệt ngân sách được tối ưu hóa và minh bạch
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div
                  className="card h-100"
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    background: "#fff",
                  }}
                >
                  <div className="card-body text-center" style={{ padding: "32px 24px" }}>
                    <div
                      className="icon-wrapper p-3 rounded-circle mb-3 mx-auto"
                      style={{
                        background: "#E9D5FF",
                        width: "64px",
                        height: "64px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Bell size={16} style={{ color: "#8B5CF6" }} />
                    </div>
                    <h5 className="card-title fw-bold mb-2" style={{ fontSize: "18px", color: "#111827" }}>
                      Thông báo
                    </h5>
                    <p className="card-text text-muted mb-0" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                      Nhận thông báo ngay khi có ngân sách mới được nộp
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Title Section */}
            <div className="mb-4">
              <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
                {eventRole === 'HoD' ? 'Ngân sách của ban' : 'Danh sách Ngân sách của Ban'}
              </h2>
              <p className="text-muted mb-0">
                {eventRole === 'HoD' 
                  ? 'Xem ngân sách của ban bạn.'
                  : 'Xem tất cả ngân sách được các ban gửi lên để duyệt.'}
              </p>
            </div>

            {/* Budget List with Data */}
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "24px",
              }}
            >
            {/* Status Tabs - Chỉ hiển thị cho HoOC, HoD xem tất cả */}
            {eventRole === 'HoOC' && (
              <div className="d-flex gap-2 mb-4 flex-wrap">
                <div
                  className={`d-inline-flex align-items-center justify-content-center px-3 py-2 ${activeTab === "all" ? "text-primary fw-semibold" : "text-muted"}`}
                  onClick={() => {
                    setActiveTab("all");
                    setCurrentPage(1);
                  }}
                  style={{ 
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: activeTab === "all" ? "2px solid #3B82F6" : "2px solid #E5E7EB",
                    backgroundColor: activeTab === "all" ? "#EFF6FF" : "#FFFFFF",
                    transition: "all 0.2s ease",
                    userSelect: "none"
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "all") {
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                      e.currentTarget.style.borderColor = "#D1D5DB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "all") {
                      e.currentTarget.style.backgroundColor = "#FFFFFF";
                      e.currentTarget.style.borderColor = "#E5E7EB";
                    }
                  }}
                >
                  Tất cả
                </div>
                <div
                  className={`d-inline-flex align-items-center justify-content-center px-3 py-2 ${activeTab === "submitted" ? "text-primary fw-semibold" : "text-muted"}`}
                  onClick={() => {
                    setActiveTab("submitted");
                    setCurrentPage(1);
                  }}
                  style={{ 
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: activeTab === "submitted" ? "2px solid #3B82F6" : "2px solid #E5E7EB",
                    backgroundColor: activeTab === "submitted" ? "#EFF6FF" : "#FFFFFF",
                    transition: "all 0.2s ease",
                    userSelect: "none"
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "submitted") {
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                      e.currentTarget.style.borderColor = "#D1D5DB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "submitted") {
                      e.currentTarget.style.backgroundColor = "#FFFFFF";
                      e.currentTarget.style.borderColor = "#E5E7EB";
                    }
                  }}
                >
                  Chờ duyệt
                </div>
                <div
                  className={`d-inline-flex align-items-center justify-content-center px-3 py-2 ${activeTab === "approved" ? "text-primary fw-semibold" : "text-muted"}`}
                  onClick={() => {
                    setActiveTab("approved");
                    setCurrentPage(1);
                  }}
                  style={{ 
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: activeTab === "approved" ? "2px solid #3B82F6" : "2px solid #E5E7EB",
                    backgroundColor: activeTab === "approved" ? "#EFF6FF" : "#FFFFFF",
                    transition: "all 0.2s ease",
                    userSelect: "none"
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "approved") {
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                      e.currentTarget.style.borderColor = "#D1D5DB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "approved") {
                      e.currentTarget.style.backgroundColor = "#FFFFFF";
                      e.currentTarget.style.borderColor = "#E5E7EB";
                    }
                  }}
                >
                  Đã duyệt
                </div>
                <div
                  className={`d-inline-flex align-items-center justify-content-center px-3 py-2 ${activeTab === "changes_requested" ? "text-primary fw-semibold" : "text-muted"}`}
                  onClick={() => {
                    setActiveTab("changes_requested");
                    setCurrentPage(1);
                  }}
                  style={{ 
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: activeTab === "changes_requested" ? "2px solid #3B82F6" : "2px solid #E5E7EB",
                    backgroundColor: activeTab === "changes_requested" ? "#EFF6FF" : "#FFFFFF",
                    transition: "all 0.2s ease",
                    userSelect: "none"
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "changes_requested") {
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                      e.currentTarget.style.borderColor = "#D1D5DB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "changes_requested") {
                      e.currentTarget.style.backgroundColor = "#FFFFFF";
                      e.currentTarget.style.borderColor = "#E5E7EB";
                    }
                  }}
                >
                  Bị từ chối
                </div>
                <div
                  className={`d-inline-flex align-items-center justify-content-center px-3 py-2 ${activeTab === "completed" ? "text-primary fw-semibold" : "text-muted"}`}
                  onClick={() => {
                    setActiveTab("completed");
                    setCurrentPage(1);
                  }}
                  style={{ 
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: activeTab === "completed" ? "2px solid #3B82F6" : "2px solid #E5E7EB",
                    backgroundColor: activeTab === "completed" ? "#EFF6FF" : "#FFFFFF",
                    transition: "all 0.2s ease",
                    userSelect: "none"
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "completed") {
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                      e.currentTarget.style.borderColor = "#D1D5DB";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "completed") {
                      e.currentTarget.style.backgroundColor = "#FFFFFF";
                      e.currentTarget.style.borderColor = "#E5E7EB";
                    }
                  }}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  Đã hoàn thành
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-4">
              <div className="input-group" style={{ maxWidth: "400px" }}>
                <span className="input-group-text bg-white" style={{ borderRight: "none" }}>
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm kiếm theo tên ban hoặc người tạo..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    borderLeft: "none",
                    borderRadius: "8px",
                  }}
                />
              </div>
            </div>

            {/* Budget Table */}
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Tên đơn ngân sách
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Ban Gửi
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Người Tạo
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Ngày Gửi
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Tổng Tiền (VND)
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Trạng Thái
                    </th>
                    {activeTab === "completed" && (
                      <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                        Tiến độ
                      </th>
                    )}
                    {eventRole === 'HoOC' && (
                      <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                        Công khai
                      </th>
                    )}
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Hành Động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBudgets.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === "completed" ? (eventRole === 'HoOC' ? 9 : 8) : (eventRole === 'HoOC' ? 8 : 7)} className="text-center text-muted py-4">
                        {isEmpty && hasAnyBudgets 
                          ? `Không có ngân sách nào ở tab "${activeTab === 'all' ? 'Tất cả' : activeTab === 'submitted' ? 'Chờ duyệt' : activeTab === 'approved' ? 'Đã duyệt' : activeTab === 'changes_requested' ? 'Bị từ chối' : 'Đã hoàn thành'}", vui lòng chuyển sang tab khác.`
                          : "Không tìm thấy ngân sách nào"}
                      </td>
                    </tr>
                  ) : (
                    paginatedBudgets.map((budget) => (
                      <tr key={budget._id || budget.id}>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold">
                            {budget.name || `Ngân sách ${budget.departmentName || "Ban"}`}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>{budget.departmentName || "—"}</td>
                        <td style={{ padding: "12px" }}>{budget.creatorName || "—"}</td>
                        <td style={{ padding: "12px" }}>
                          {formatDate(budget.submittedAt || budget.createdAt)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold">
                            {formatCurrency(budget.totalCost || 0)}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>{getStatusBadge(budget.status)}</td>
                        {activeTab === "completed" && (
                          <td style={{ padding: "12px" }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-success">
                                {budget.submittedCount || 0}/{budget.totalItems || 0} đã nộp
                              </span>
                              {budget.allItemsSubmitted && (
                                <i className="bi bi-check-circle-fill text-success" title="Tất cả items đã hoàn thành"></i>
                              )}
                            </div>
                          </td>
                        )}
                        {eventRole === 'HoOC' && budget.status === 'approved' && (
                          <td style={{ padding: "12px" }}>
                            <button
                              className={`btn btn-sm ${budget.isPublic ? 'btn-success' : 'btn-outline-secondary'}`}
                              onClick={async () => {
                                try {
                                  const budgetId = budget._id || budget.id || budget.budgetId;
                                  const deptId = budget.departmentId || budget.department?._id;
                                  const newIsPublic = !budget.isPublic;
                                  await budgetApi.updateBudgetVisibility(eventId, deptId, budgetId, newIsPublic);
                                  toast.success(newIsPublic ? "Đã công khai ngân sách" : "Đã ẩn ngân sách");
                                  fetchBudgets();
                                } catch (error) {
                                  toast.error(error?.response?.data?.message || "Thay đổi trạng thái thất bại");
                                }
                              }}
                              style={{ borderRadius: "8px", minWidth: "100px" }}
                            >
                              {budget.isPublic ? "Công khai" : "Riêng tư"}
                            </button>
                          </td>
                        )}
                        {eventRole === 'HoOC' && budget.status !== 'approved' && (
                          <td style={{ padding: "12px" }}>
                            <span className="text-muted" style={{ fontSize: "13px" }}>—</span>
                          </td>
                        )}
                        <td style={{ padding: "12px" }}>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleViewDetail(
                                budget.departmentId || budget.department?._id || budget.departmentId, 
                                budget.status,
                                budget._id || budget.id || budget.budgetId
                              )}
                              style={{ borderRadius: "8px" }}
                            >
                              Xem chi tiết
                            </button>
                            {/* Nút "Gửi cho HoOC" chỉ hiển thị cho HoD và budget draft */}
                            {eventRole === 'HoD' && budget.status === 'draft' && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={async () => {
                                  try {
                                    const budgetId = budget._id || budget.id || budget.budgetId;
                                    const deptId = budget.departmentId || hodDepartmentId;
                                    await budgetApi.submitBudget(eventId, deptId, budgetId);
                                    toast.success("Gửi cho TBC duyệt thành công!");
                                    fetchBudgets(); // Refresh danh sách
                                  } catch (error) {
                                    toast.error(error?.response?.data?.message || "Gửi duyệt thất bại!");
                                  }
                                }}
                                style={{ borderRadius: "8px" }}
                              >
                                <i className="bi bi-send me-1"></i>
                                Gửi cho TBTC
                              </button>
                            )}
                            {/* Nút "Xóa" cho draft và submitted, nhưng không cho xóa khi status là submitted (chờ duyệt) */}
                            {eventRole === 'HoD' && budget.status === 'draft' && (
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

            {/* Pagination */}
            {filteredBudgets.length > itemsPerPage && (
              <div className="d-flex justify-content-between align-items-center mt-4">
                <p className="text-muted mb-0">
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredBudgets.length)} trong tổng số {filteredBudgets.length} ngân sách.
                </p>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{ borderRadius: "8px" }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        className={`btn ${currentPage === page ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setCurrentPage(page)}
                        style={{ borderRadius: "8px" }}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{ borderRadius: "8px" }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
        )}
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
            const budgetId = budgetToDelete._id || budgetToDelete.id || budgetToDelete.budgetId;
            const deptId = budgetToDelete.departmentId || budgetToDelete.department?._id || hodDepartmentId;
            await budgetApi.deleteDraft(eventId, deptId, budgetId);
            toast.success("Xóa budget thành công!");
            setShowDeleteModal(false);
            setBudgetToDelete(null);
            fetchBudgets(); // Refresh danh sách
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

export default ListBudgetsPage;

