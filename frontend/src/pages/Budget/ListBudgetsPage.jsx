import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import { departmentService } from "../../services/departmentService";

const ListBudgetsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole, getEventRole } = useEvents();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [activeTab, setActiveTab] = useState("submitted"); // submitted, approved, changes_requested, completed
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasAnyBudgets, setHasAnyBudgets] = useState(false); // Check if there are any budgets at all (across all tabs)
  const [eventRole, setEventRole] = useState("");
  const [checkingRole, setCheckingRole] = useState(true);
  const [hodDepartmentId, setHodDepartmentId] = useState(null); // Department ID nếu user là HoD
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
        // Nếu là HoD, chỉ check budget của department của họ
        if (eventRole === 'HoD' && hodDepartmentId) {
          try {
            const budgetData = await budgetApi.getDepartmentBudget(eventId, hodDepartmentId).catch(() => null);
            setHasAnyBudgets(!!budgetData);
          } catch (error) {
            setHasAnyBudgets(false);
          }
        } else if (eventRole === 'HoOC') {
          // HoOC: check tất cả budgets
          const [submitted, approved, rejected, completed] = await Promise.all([
            budgetApi.getAllBudgetsForEvent(eventId, { status: 'submitted', page: 1, limit: 1 }).catch(() => ({ data: [] })),
            budgetApi.getAllBudgetsForEvent(eventId, { status: 'approved', page: 1, limit: 1 }).catch(() => ({ data: [] })),
            budgetApi.getAllBudgetsForEvent(eventId, { status: 'changes_requested', page: 1, limit: 1 }).catch(() => ({ data: [] })),
            budgetApi.getAllBudgetsForEvent(eventId, { status: 'completed', page: 1, limit: 1 }).catch(() => ({ data: [] })),
          ]);
          
          const hasData = 
            (Array.isArray(submitted) ? submitted.length > 0 : (submitted?.data?.length > 0 || submitted?.items?.length > 0)) ||
            (Array.isArray(approved) ? approved.length > 0 : (approved?.data?.length > 0 || approved?.items?.length > 0)) ||
            (Array.isArray(rejected) ? rejected.length > 0 : (rejected?.data?.length > 0 || rejected?.items?.length > 0)) ||
            (Array.isArray(completed) ? completed.length > 0 : (completed?.data?.length > 0 || completed?.items?.length > 0));
          
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
      
      // Nếu là HoD, chỉ lấy budget của department của họ
      if (eventRole === 'HoD' && hodDepartmentId) {
        // Lấy budget của department cụ thể
        try {
          const [budgetData, deptData] = await Promise.all([
            budgetApi.getDepartmentBudget(eventId, hodDepartmentId).catch(() => null),
            departmentService.getDepartmentDetail(eventId, hodDepartmentId).catch(() => null)
          ]);
          
          // Format để phù hợp với cấu trúc dữ liệu
          const formattedBudget = budgetData ? [{
            _id: budgetData._id,
            id: budgetData._id,
            departmentId: budgetData.departmentId || hodDepartmentId,
            departmentName: deptData?.name || "Ban của tôi",
            creatorName: "Trưởng ban",
            totalCost: budgetData.items?.reduce((sum, item) => sum + (parseFloat(item.total?.toString() || 0)), 0) || 0,
            status: budgetData.status,
            submittedAt: budgetData.submittedAt || budgetData.createdAt,
            createdAt: budgetData.createdAt,
            submittedCount: budgetData.items?.filter(item => item.submittedStatus === 'submitted').length || 0,
            totalItems: budgetData.items?.length || 0,
            allItemsSubmitted: budgetData.items?.every(item => item.submittedStatus === 'submitted') || false
          }].filter(b => {
            // Filter theo activeTab
            if (activeTab === 'submitted') return b.status === 'submitted';
            if (activeTab === 'approved') return b.status === 'approved';
            if (activeTab === 'changes_requested') return b.status === 'changes_requested';
            if (activeTab === 'completed') return b.status === 'sent_to_members' && b.allItemsSubmitted;
            return true;
          }) : [];
          
          response = { data: formattedBudget, pagination: { totalPages: 1 } };
        } catch (error) {
          // Nếu không tìm thấy budget, trả về mảng rỗng
          if (error?.response?.status === 404) {
            response = { data: [], pagination: { totalPages: 1 } };
          } else {
            throw error;
          }
        }
      } else {
        // HoOC: lấy tất cả budgets
        response = await budgetApi.getAllBudgetsForEvent(eventId, {
          status: activeTab,
          page: currentPage,
          limit: itemsPerPage,
        });
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
        hasItems: response?.items
      });
      
      if (response) {
        // Response có thể là { data: [...], pagination: {...} } hoặc array trực tiếp
        const budgetsData = Array.isArray(response) ? response : (response.data || response.items || []);
        const paginationData = response.pagination || {};
        
        console.log('fetchBudgets processed:', {
          budgetsDataLength: budgetsData.length,
          budgetsData: budgetsData.map(b => ({ id: b._id || b.id, departmentName: b.departmentName, status: b.status })),
          paginationData
        });
        
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

  const handleViewDetail = (departmentId) => {
    // Nếu là HoD, điều hướng đến trang view budget của họ
    // Nếu là HoOC, điều hướng đến trang review
    if (eventRole === 'HoD') {
      navigate(`/events/${eventId}/departments/${departmentId}/budget/view`);
    } else {
      navigate(`/events/${eventId}/departments/${departmentId}/budget/review`);
    }
  };

  const filteredBudgets = budgets.filter((budget) =>
    budget.departmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    budget.creatorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        activePage="budget"
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
                  Chỉ Trưởng Ban Tổ Chức (HoOC) hoặc Trưởng Ban (HoD) mới có thể xem trang này.
                </p>
              </div>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (loading) {
    return <Loading />;
  }

  const isEmpty = filteredBudgets.length === 0;
  // Show message if current tab is empty but other tabs have data
  const showEmptyMessage = isEmpty && !hasAnyBudgets;

  return (
    <UserLayout
      title={isEmpty && !hasAnyBudgets ? 
        (eventRole === 'HoD' ? "Ngân sách của ban (trống)" : "Danh sách Ngân sách của Ban (trống)") : 
        (eventRole === 'HoD' ? "Ngân sách của ban" : "Danh sách Ngân sách của Ban")}
      activePage="budget"
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
                <i className="bi bi-file-earmark-text" style={{ fontSize: "60px", color: "#9CA3AF" }}></i>
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
                  <i className="bi bi-clock" style={{ fontSize: "14px", color: "#9CA3AF" }}></i>
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
                      <i className="bi bi-clock" style={{ fontSize: "32px", color: "#3B82F6" }}></i>
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
                      <i className="bi bi-check-circle" style={{ fontSize: "32px", color: "#10B981" }}></i>
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
                      <i className="bi bi-bell" style={{ fontSize: "32px", color: "#8B5CF6" }}></i>
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
            {/* Status Tabs */}
            <div className="d-flex gap-2 mb-4 flex-wrap">
              <button
                className={`btn ${activeTab === "submitted" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => {
                  setActiveTab("submitted");
                  setCurrentPage(1);
                }}
                style={{ borderRadius: "8px" }}
              >
                Chờ duyệt
              </button>
              <button
                className={`btn ${activeTab === "approved" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => {
                  setActiveTab("approved");
                  setCurrentPage(1);
                }}
                style={{ borderRadius: "8px" }}
              >
                Đã duyệt
              </button>
              <button
                className={`btn ${activeTab === "changes_requested" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => {
                  setActiveTab("changes_requested");
                  setCurrentPage(1);
                }}
                style={{ borderRadius: "8px" }}
              >
                Bị từ chối
              </button>
              <button
                className={`btn ${activeTab === "completed" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => {
                  setActiveTab("completed");
                  setCurrentPage(1);
                }}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-check-circle me-1"></i>
                Đã hoàn thành
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="input-group" style={{ maxWidth: "400px" }}>
                <span className="input-group-text bg-white" style={{ borderRight: "none" }}>
                  <i className="bi bi-search"></i>
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
                      Tên Ngân Sách
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
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                      Hành Động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBudgets.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === "completed" ? 8 : 7} className="text-center text-muted py-4">
                        {isEmpty && hasAnyBudgets 
                          ? `Không có ngân sách nào ở tab "${activeTab === 'submitted' ? 'Chờ duyệt' : activeTab === 'approved' ? 'Đã duyệt' : activeTab === 'changes_requested' ? 'Bị từ chối' : 'Đã hoàn thành'}", vui lòng chuyển sang tab khác.`
                          : "Không tìm thấy ngân sách nào"}
                      </td>
                    </tr>
                  ) : (
                    paginatedBudgets.map((budget) => (
                      <tr key={budget._id || budget.id}>
                        <td style={{ padding: "12px" }}>
                          <span className="fw-semibold">
                            Ngân sách {budget.departmentName || "Ban"}
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
                        <td style={{ padding: "12px" }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleViewDetail(budget.departmentId || budget.department?._id)}
                            style={{ borderRadius: "8px" }}
                          >
                            Xem chi tiết
                          </button>
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
                    <i className="bi bi-chevron-left"></i>
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
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </UserLayout>
  );
};

export default ListBudgetsPage;

