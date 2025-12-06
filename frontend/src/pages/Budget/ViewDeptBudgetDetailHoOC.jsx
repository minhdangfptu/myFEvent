import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { departmentService } from "../../services/departmentService";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import ConfirmModal from "../../components/ConfirmModal";
import { useEvents } from "../../contexts/EventContext";
import { ArrowLeft, CheckCircle, Info, RotateCcw, Save, Search } from "lucide-react";


const ViewDeptBudgetDetailHoOC = () => {
  const { eventId, departmentId, budgetId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(null);
  const [department, setDepartment] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemFeedbacks, setItemFeedbacks] = useState({});
  const [itemStatuses, setItemStatuses] = useState({});
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingFeedbackItemId, setEditingFeedbackItemId] = useState(null);
  const [tempFeedback, setTempFeedback] = useState("");
  const [eventRole, setEventRole] = useState("");
  const [checkingRole, setCheckingRole] = useState(true);
  const [feedbackDebounceTimers, setFeedbackDebounceTimers] = useState({});

  // Kiểm tra role khi component mount
  useEffect(() => {
    const checkRole = async () => {
      if (eventId) {
        try {
          setCheckingRole(true);
          const role = await fetchEventRole(eventId);
          setEventRole(role);
          
          // Nếu không phải HoOC, redirect về trang budgets
          if (role !== 'HoOC') {
            toast.error("Bạn không có quyền truy cập trang này");
            navigate(`/events/${eventId}/budgets`);
            return;
          }
        } catch (error) {
          console.error("Error checking role:", error);
          toast.error("Không thể kiểm tra quyền truy cập");
          navigate(`/events/${eventId}/budgets`);
        } finally {
          setCheckingRole(false);
        }
      }
    };
    
    checkRole();
  }, [eventId, fetchEventRole, navigate]);

  useEffect(() => {
    if (eventRole === 'HoOC') {
      fetchData();
    }
  }, [eventId, departmentId, budgetId, eventRole]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(feedbackDebounceTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const fetchData = async () => {
    if (!departmentId || departmentId === "current" || departmentId === "") {
      navigate(`/events/${eventId}/budgets`);
      return;
    }

    try {
      setLoading(true);
      // Nếu có budgetId, dùng getDepartmentBudgetById để lấy đúng budget
      // Nếu không có budgetId, dùng getDepartmentBudget (backward compatibility)
      const budgetPromise = budgetId 
        ? budgetApi.getDepartmentBudgetById(eventId, departmentId, budgetId)
        : budgetApi.getDepartmentBudget(eventId, departmentId, true);
      
      const [budgetData, deptData] = await Promise.all([
        budgetPromise,
        departmentService.getDepartmentDetail(eventId, departmentId),
      ]);

      if (!budgetData) {
        toast.error("Budget không tồn tại hoặc chưa được gửi lên để duyệt.");
        navigate(`/events/${eventId}/budgets`);
        return;
      }

      // HoOC không được xem draft budgets từ HoD
      if (budgetData.status === 'draft') {
        toast.error("Không thể xem budget nháp. Budget này chưa được gửi lên để duyệt.");
        navigate(`/events/${eventId}/budgets`);
        return;
      }

      setBudget(budgetData);
      setDepartment(deptData);

      // Initialize item statuses and feedbacks
      // Nếu budget đã rejected (changes_requested), giữ nguyên status và feedback, không cho phép chỉnh sửa
      // Nếu budget đã approved, giữ nguyên status của item
      // Nếu budget chưa được review (status là submitted), các items mặc định là pending
      const initialStatuses = {};
      const initialFeedbacks = {};
      const budgetStatus = budgetData.status || "draft";
      const isBudgetApproved = budgetStatus === "approved";
      const isBudgetRejected = budgetStatus === "changes_requested";
      
      if (budgetData.items && Array.isArray(budgetData.items)) {
        budgetData.items.forEach((item) => {
          const itemId = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
          // Nếu budget đã rejected, giữ nguyên status và feedback (read-only)
          if (isBudgetRejected) {
            initialStatuses[itemId] = item.status || "pending";
            initialFeedbacks[itemId] = item.feedback || "";
          } else if (isBudgetApproved) {
            // Nếu budget đã approved, giữ nguyên status của item
            initialStatuses[itemId] = item.status || "pending";
            initialFeedbacks[itemId] = item.feedback || "";
          } else {
            // Budget chưa được review (submitted), mặc định là pending
            initialStatuses[itemId] = "pending";
            initialFeedbacks[itemId] = item.feedback || "";
          }
        });
      }
      setItemStatuses(initialStatuses);
      setItemFeedbacks(initialFeedbacks);
    } catch (error) {
      console.error("Error fetching data:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Không thể tải dữ liệu budget";
      toast.error(errorMessage);
      
      // Handle different error cases - always redirect back to budget list
      if (error?.response?.status === 404) {
        toast.error("Budget không tồn tại hoặc đã bị xóa. Đang quay lại danh sách...");
        setTimeout(() => navigate(`/events/${eventId}/budgets`), 1000);
      } else if (error?.response?.status === 403) {
        toast.error("Bạn không có quyền xem budget này. Đang quay lại danh sách...");
        setTimeout(() => navigate(`/events/${eventId}/budgets`), 1000);
      } else if (error?.response?.status === 500) {
        toast.error("Lỗi server. Đang quay lại danh sách...");
        setTimeout(() => navigate(`/events/${eventId}/budgets`), 1000);
      } else {
        // For other errors, redirect back to list after showing error
        toast.error("Đã xảy ra lỗi. Đang quay lại danh sách...");
        setTimeout(() => navigate(`/events/${eventId}/budgets`), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to parse Decimal128 values
  const parseDecimal = (value) => {
    if (value === null || value === undefined) return 0;
    // If it's a MongoDB Decimal128 object with $numberDecimal
    if (typeof value === 'object' && value !== null && value.$numberDecimal !== undefined) {
      return parseFloat(value.$numberDecimal) || 0;
    }
    // If it's already a number
    if (typeof value === 'number') return value;
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      return parseFloat(value) || 0;
    }
    return 0;
  };

  const formatCurrency = (amount) => {
    const numAmount = parseDecimal(amount);
    return new Intl.NumberFormat("vi-VN").format(numAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa có";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: "Chờ duyệt", color: "#F59E0B", bg: "#FEF3C7" },
      approved: { label: "Đã duyệt", color: "#10B981", bg: "#D1FAE5" },
      rejected: { label: "Bị từ chối", color: "#DC2626", bg: "#FEE2E2" },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span
        className="badge px-2 py-1"
        style={{
          background: statusInfo.bg,
          color: statusInfo.color,
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        {statusInfo.label}
      </span>
    );
  };

  const handleApproveItem = (itemId) => {
    setItemStatuses((prev) => ({ ...prev, [itemId]: "approved" }));
    setHasChanges(true);
  };

  const handleRejectItem = (itemId) => {
    const currentFeedback = itemFeedbacks[itemId] || "";
    if (!currentFeedback || currentFeedback.trim() === "") {
      toast.warning("Vui lòng nhập phản hồi trước khi từ chối!");
      // Tự động mở edit feedback
      const budgetItem = budget?.items?.find(item => {
        const id = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
        return id === itemId;
      });
      if (budgetItem) {
        handleStartEditFeedback(budgetItem);
      }
      return;
    }
    setItemStatuses((prev) => ({ ...prev, [itemId]: "rejected" }));
    setHasChanges(true);
  };

  const handleUndoStatus = (itemId) => {
    setItemStatuses((prev) => ({ ...prev, [itemId]: "pending" }));
    setHasChanges(true);
  };

  const handleFeedbackChange = (itemId, value) => {
    setItemFeedbacks((prev) => ({ ...prev, [itemId]: value }));
    setHasChanges(true);
  };

  const handleStartEditFeedback = (item) => {
    const itemId = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
    const currentFeedback = itemFeedbacks[itemId] !== undefined ? itemFeedbacks[itemId] : (item.feedback || "");
    setEditingFeedbackItemId(itemId);
    setTempFeedback(currentFeedback);
  };

  const handleSaveFeedback = async (itemId) => {
    setItemFeedbacks((prev) => ({ ...prev, [itemId]: tempFeedback }));
    setHasChanges(true);
    setEditingFeedbackItemId(null);
    setTempFeedback("");
    
    // Auto-save to backend
    try {
      const items = budget.items.map((item) => {
        const id = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
        const currentStatus = itemStatuses[id] || item.status || "pending";
        const currentFeedback = id === itemId ? tempFeedback : (itemFeedbacks[id] || item.feedback || "");
        return {
          itemId: item.itemId || item._id || item.itemId?._id,
          status: currentStatus,
          feedback: currentFeedback,
        };
      });
      await budgetApi.saveReviewDraft(eventId, departmentId, budget._id, { items });
    } catch (error) {
      console.error("Error auto-saving feedback:", error);
      // Don't show error toast for auto-save, just log it
    }
  };

  const handleCancelEditFeedback = () => {
    setEditingFeedbackItemId(null);
    setTempFeedback("");
  };

  // Auto-save feedback when changed (with debounce)
  const handleFeedbackChangeAutoSave = (itemId, value) => {
    // Update local state immediately
    setItemFeedbacks((prev) => ({ ...prev, [itemId]: value }));
    setHasChanges(true);
    
    // Clear existing timer for this item
    if (feedbackDebounceTimers[itemId]) {
      clearTimeout(feedbackDebounceTimers[itemId]);
    }
    
    // Set new timer to auto-save after 1 second of no typing
    const timer = setTimeout(async () => {
      try {
        const items = budget.items.map((item) => {
          const id = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
          const currentStatus = itemStatuses[id] || item.status || "pending";
          const currentFeedback = id === itemId ? value : (itemFeedbacks[id] || item.feedback || "");
          return {
            itemId: item.itemId || item._id || item.itemId?._id,
            status: currentStatus,
            feedback: currentFeedback,
          };
        });
        await budgetApi.saveReviewDraft(eventId, departmentId, budget._id, { items });
      } catch (error) {
        console.error("Error auto-saving feedback:", error);
        // Don't show error toast for auto-save, just log it
      }
    }, 1000); // 1 second debounce
    
    setFeedbackDebounceTimers((prev) => ({ ...prev, [itemId]: timer }));
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const items = budget.items.map((item) => {
        const itemId = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
        const currentStatus = itemStatuses[itemId] || item.status || "pending";
        const currentFeedback = itemFeedbacks[itemId] || item.feedback || "";
        return {
          itemId: item.itemId || item._id || item.itemId?._id,
          status: currentStatus,
          feedback: currentFeedback,
        };
      });

      await budgetApi.saveReviewDraft(eventId, departmentId, budget._id, { items });
      toast.success("Đã lưu nháp thành công!");
      setHasChanges(false);
      // Refresh data để lấy feedback đã lưu
      await fetchData();
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error(error?.response?.data?.message || "Lưu nháp thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReview = async () => {
    try {
      setLoading(true);
      
      // Validate: all items must be approved or rejected
      const items = budget.items.map((item) => {
        const itemId = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
        const currentStatus = itemStatuses[itemId] || item.status || "pending";
        const currentFeedback = itemFeedbacks[itemId] || item.feedback || "";
        return {
          itemId: item.itemId || item._id || item.itemId?._id,
          status: currentStatus,
          feedback: currentFeedback,
        };
      });
      
      // Check if all items are approved or rejected
      const allReviewed = items.every(item => {
        const status = item.status;
        return status === 'approved' || status === 'rejected';
      });
      
      if (!allReviewed) {
        toast.error("Vui lòng duyệt hoặc từ chối tất cả các mục trước khi hoàn tất!");
        setLoading(false);
        return;
      }

      await budgetApi.completeReview(eventId, departmentId, budget._id, { items });
      toast.success("Hoàn tất duyệt ngân sách thành công!");
      setShowCompleteModal(false);
      navigate(`/events/${eventId}/budgets`);
    } catch (error) {
      console.error("Error completing review:", error);
      toast.error(error?.response?.data?.message || "Hoàn tất duyệt thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = budget?.items?.filter((item) =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalCost = budget?.items?.reduce(
    (sum, item) => sum + parseDecimal(item.total),
    0
  ) || 0;

  // Kiểm tra quyền truy cập
  if (checkingRole) {
    return <Loading />;
  }

  if (eventRole !== 'HoOC') {
    return (
      <UserLayout
        title="Không có quyền truy cập"
        activePage="finance-budget"
        sidebarType="hooc"
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
                  Chỉ Trưởng Ban Tổ Chức mới có thể xem trang này.
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
        title="View Dept Budget Detail (HoOC)"
        activePage="finance-budget"
        sidebarType="hooc"
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải chi tiết ngân sách...</div>
        </div>
      </UserLayout>
    );
  }

  if (!budget) {
    return null;
  }

  return (
    <UserLayout
      title="View Dept Budget Detail (HoOC)"
      activePage="finance-budget"
      sidebarType="hooc"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4">
          <button
            className="btn btn-link text-decoration-none p-0 mb-2"
            onClick={() => navigate(`/events/${eventId}/budgets`)}
            style={{ color: "#6b7280" }}
          >
            <ArrowLeft className="me-2" size={20} />
            <span className="fw-bold" style={{ fontSize: "20px", color: "#111827" }}>
              Chi tiết ngân sách – {department?.name || "Ban"}
            </span>
          </button>
        </div>

        {/* Budget Overview Card */}
        <div
          className="mb-4"
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "24px",
          }}
        >
          <h5 className="fw-bold mb-4" style={{ fontSize: "18px", color: "#111827" }}>
            Tổng Quan Ngân Sách
          </h5>

          <div className="d-flex flex-wrap align-items-start gap-4" style={{ flexWrap: "nowrap" }}>
            <div style={{ flex: "1", minWidth: "0" }}>
              <div
                className="fw-bold mb-1"
                style={{ fontSize: "32px", color: "#3B82F6" }}
              >
                {formatCurrency(totalCost)}
              </div>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Tổng Chi Phí Dự Kiến (VNĐ)
              </p>
            </div>

            <div style={{ flex: "1", minWidth: "0" }}>
              <div className="fw-bold mb-1" style={{ fontSize: "24px", color: "#111827" }}>
                {budget.items?.length || 0}
              </div>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Tổng Số Mục
              </p>
            </div>

            <div style={{ flex: "1", minWidth: "0" }}>
              <div className="fw-bold mb-1" style={{ fontSize: "18px", color: "#111827" }}>
                {formatDate(budget.createdAt)}
              </div>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Ngày Tạo
              </p>
            </div>

            <div style={{ flex: "1", minWidth: "0" }}>
              <div className="fw-bold mb-1" style={{ fontSize: "18px", color: "#111827" }}>
                {budget.createdBy?.fullName || 
                 budget.creatorName || 
                 budget.createdByUser?.fullName ||
                 department?.leader?.fullName ||
                 department?.leaderId?.fullName ||
                 "Chưa có thông tin"}
              </div>
              <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                Người Tạo (Trưởng ban)
              </p>
            </div>

            <div style={{ flex: "1", minWidth: "0" }}>
              <span
                className="badge px-3 py-2"
                style={{
                  background: "#FEF3C7",
                  color: "#F59E0B",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                Chờ duyệt
              </span>
              <p className="text-muted mb-0 mt-2" style={{ fontSize: "14px" }}>
                Trạng thái budget
              </p>
            </div>
          </div>
        </div>

        {/* Budget Items List */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "24px",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold mb-0" style={{ fontSize: "18px", color: "#111827" }}>
              Danh Sách Mục Ngân Sách
            </h5>
            <div style={{ maxWidth: "300px", width: "100%" }}>
              <div className="input-group">
                <span className="input-group-text bg-white" style={{ borderRight: "none" }}>
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm kiếm theo tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    borderLeft: "none",
                    borderRadius: "8px",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Tên Mục
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Đơn Giá (VNĐ)
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Số Lượng
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Tổng Tiền (VNĐ)
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Ghi Chú
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "220px" }}>
                    Bằng chứng
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Trạng Thái
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Phản hồi từ TBTC
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151" }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center text-muted py-4">
                      Không tìm thấy mục nào
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => {
                    const itemId = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
                    const originalStatus = item.status || "pending";
                    const currentStatus = itemStatuses[itemId] !== undefined ? itemStatuses[itemId] : originalStatus;
                    const status = currentStatus;
                    const feedback = itemFeedbacks[itemId] !== undefined ? itemFeedbacks[itemId] : (item.feedback || "");
                    const isRejected = status === "rejected";
                    const isApproved = status === "approved";
                    const isBudgetRejected = budget?.status === "changes_requested";

                    // CHỈ tô màu đỏ cho dòng bị từ chối, còn lại để màu trắng
                    const cellBgColor = isRejected ? "#FCA5A5" : "transparent";

                    return (
                      <tr key={itemId || index}>
                        <td style={{ padding: "12px", color: "#111827", backgroundColor: cellBgColor }}>
                          {item.name}
                        </td>
                        <td style={{ padding: "12px", color: "#111827", backgroundColor: cellBgColor }}>
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td style={{ padding: "12px", color: "#111827", backgroundColor: cellBgColor }}>
                          {parseDecimal(item.qty)}
                        </td>
                        <td style={{ padding: "12px", backgroundColor: cellBgColor }}>
                          <span
                            className="fw-semibold"
                            style={{ color: "#111827" }}
                          >
                            {formatCurrency(item.total)}
                          </span>
                        </td>
                        <td style={{ padding: "12px", backgroundColor: cellBgColor }}>
                          <span style={{ color: "#6B7280" }}>
                            {item.note || "—"}
                          </span>
                        </td>
                        {/* Evidence */}
                        <td style={{ padding: "12px", backgroundColor: cellBgColor }}>
                          {item.evidence && item.evidence.length > 0 ? (
                            <div className="d-flex flex-column gap-1">
                              {item.evidence.map((ev, idx) => (
                                <div
                                  key={idx}
                                  className="d-flex align-items-center gap-2"
                                  style={{
                                    background: "#F3F4F6",
                                    borderRadius: "6px",
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                  }}
                                >
                                  <i
                                    className={`bi ${
                                      ev.type === "image"
                                        ? "bi-image"
                                        : ev.type === "pdf"
                                        ? "bi-file-pdf"
                                        : ev.type === "doc"
                                        ? "bi-file-earmark-text"
                                        : "bi-link-45deg"
                                    }`}
                                  ></i>
                                  {ev.url ? (
                                    <a
                                      href={ev.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: "12px" }}
                                    >
                                      {ev.name || "Xem bằng chứng"}
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: "12px" }}>
                                      {ev.name || "Bằng chứng"}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted" style={{ fontSize: "12px" }}>
                              Chưa có
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px", backgroundColor: cellBgColor }}>
                          {getStatusBadge(status)}
                        </td>
                        <td style={{ padding: "12px", backgroundColor: cellBgColor }}>
                          <textarea
                            className="form-control form-control-sm"
                            value={feedback || ""}
                            onChange={(e) => {
                              if (!isBudgetRejected) {
                                handleFeedbackChangeAutoSave(itemId, e.target.value);
                              }
                            }}
                            onBlur={(e) => {
                              // Save immediately on blur
                              if (!isBudgetRejected && e.target.value !== feedback) {
                                const items = budget.items.map((item) => {
                                  const id = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
                                  const currentStatus = itemStatuses[id] || item.status || "pending";
                                  const currentFeedback = id === itemId ? e.target.value : (itemFeedbacks[id] || item.feedback || "");
                                  return {
                                    itemId: item.itemId || item._id || item.itemId?._id,
                                    status: currentStatus,
                                    feedback: currentFeedback,
                                  };
                                });
                                budgetApi.saveReviewDraft(eventId, departmentId, budget._id, { items }).catch(err => {
                                  console.error("Error saving feedback on blur:", err);
                                });
                              }
                            }}
                            rows="2"
                            style={{ 
                              fontSize: "13px", 
                              minHeight: "60px",
                              border: isApproved ? "1px solid #10B981" : isRejected ? "1px solid #DC2626" : "1px solid #d1d5db",
                              backgroundColor: isApproved ? "#F0FDF4" : isRejected ? "#FEF2F2" : "#f9fafb",
                            }}
                            disabled={isBudgetRejected}
                            placeholder="Nhập phản hồi..."
                            title={isBudgetRejected ? "Budget đã bị từ chối, không thể chỉnh sửa" : "Nhập phản hồi (tự động lưu)"}
                          />
                        </td>
                        <td style={{ padding: "12px", backgroundColor: cellBgColor }}>
                          {isBudgetRejected ? (
                            <span className="text-muted" style={{ fontSize: "12px" }}>
                              Budget đã bị từ chối
                            </span>
                          ) : status === "pending" ? (
                            <div className="d-flex gap-1">
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleApproveItem(itemId)}
                                style={{ borderRadius: "6px", fontSize: "12px" }}
                              >
                                Duyệt
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRejectItem(itemId)}
                                style={{ borderRadius: "6px", fontSize: "12px" }}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => handleUndoStatus(itemId)}
                              style={{ borderRadius: "6px", fontSize: "12px" }}
                            >
                              <i className="bi bi-arrow-counterclockwise me-1"></i>
                              Hoàn tác
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Banner */}
        <div
          className="mt-3 p-3"
          style={{
            background: "#FEF3C7",
            borderRadius: "8px",
            border: "1px solid #FCD34D",
          }}
        >
          <div className="d-flex align-items-start gap-2">
            <Info size={24} style={{ color: "#D97706" }} />
            <p className="mb-0" style={{ color: "#92400E", fontSize: "14px" }}>
              Budget sẽ được đánh dấu là "Đã duyệt" chỉ khi bạn duyệt tất cả các hạng mục.
            </p>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="d-flex justify-content-between align-items-center mt-4">
          <button
            className="btn btn-link text-decoration-none p-0"
            onClick={() => navigate(`/events/${eventId}/budgets`)}
            style={{ color: "#6b7280" }}
          >
            <ArrowLeft className="me-2" size={18} />
            Trở lại danh sách
          </button>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={() => navigate(`/events/${eventId}/budgets`)}
              style={{ borderRadius: "8px" }}
            >
              Hủy
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveDraft}
              disabled={!hasChanges || loading}
              style={{ borderRadius: "8px" }}
            >
              <i className="bi bi-save me-2"></i>
              Lưu Nháp
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowCompleteModal(true)}
              disabled={loading}
              style={{ borderRadius: "8px", background: "#1E40AF" }}
            >
              <i className="bi bi-check-circle me-2"></i>
              Hoàn tất review budget
            </button>
          </div>
        </div>
      </div>

      {/* Complete Review Confirmation Modal */}
      <ConfirmModal
        show={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={handleCompleteReview}
        title="Xác nhận hoàn tất duyệt ngân sách?"
        body="Sau khi xác nhận, bạn sẽ không thể thay đổi trạng thái hoặc phản hồi của các mục ngân sách. Hãy chắc chắn rằng bạn đã kiểm tra kỹ tất cả các mục."
        confirmText="Xác nhận hoàn tất"
        cancelText="Hủy"
        confirmButtonStyle={{ background: "#3B82F6" }}
      />

    </UserLayout>
  );
};

export default ViewDeptBudgetDetailHoOC;