import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { departmentService } from "../../services/departmentService";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import ConfirmModal from "../../components/ConfirmModal";
import { useEvents } from "../../contexts/EventContext";
import { ArrowLeft, CheckCircle, Info, RotateCcw, Save, Search, AlertCircle, X } from "lucide-react";


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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectItemId, setRejectItemId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

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

  // Warn user before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn rời khỏi trang này?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  // Debug: Log when showRejectModal changes
  useEffect(() => {
    console.log("showRejectModal changed to:", showRejectModal);
    console.log("rejectItemId:", rejectItemId);
  }, [showRejectModal, rejectItemId]);

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

  const handleApproveItem = async (itemId) => {
    setItemStatuses((prev) => ({ ...prev, [itemId]: "approved" }));
    setHasChanges(true);
    
    // Auto-save to backend
    try {
      const items = budget.items.map((item) => {
        const id = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
        const currentStatus = id === itemId ? "approved" : (itemStatuses[id] || item.status || "pending");
        const currentFeedback = itemFeedbacks[id] || item.feedback || "";
        return {
          itemId: item.itemId || item._id || item.itemId?._id,
          status: currentStatus,
          feedback: currentFeedback,
        };
      });
      
      await budgetApi.saveReviewDraft(eventId, departmentId, budget._id, { items });
      // Don't show toast for auto-save on approve to avoid spam
    } catch (err) {
      console.error("Error auto-saving approve:", err);
      // Don't show error toast for auto-save, just log it
    }
  };

  const handleRejectItem = (itemId) => {
    console.log("handleRejectItem called with itemId:", itemId);
    setRejectItemId(itemId);

    // Nếu đã có phản hồi ở ô "Phản hồi từ trưởng ban tổ chức" thì tự động
    // lấy lại nội dung này đưa vào modal, tránh bắt user nhập lại lần nữa.
    let existingReason = itemFeedbacks[itemId] || "";
    if (!existingReason && budget?.items?.length) {
      const item = budget.items.find((it) => {
        const id =
          it.itemId?.toString() ||
          it._id?.toString() ||
          it.itemId?._id?.toString();
        return id === itemId;
      });
      if (item?.feedback) {
        existingReason = String(item.feedback);
      }
    }

    setRejectReason(existingReason || "");
    setShowRejectModal(true);
    console.log("showRejectModal should be set to true");
  };

  const handleConfirmReject = async () => {
    if (!rejectReason || rejectReason.trim() === "") {
      toast.warning("Bạn hãy vui lòng nhập lý do nếu từ chối!");
      return;
    }
    
    try {
      // Update feedback with the reason
      setItemFeedbacks((prev) => ({ ...prev, [rejectItemId]: rejectReason.trim() }));
      setItemStatuses((prev) => ({ ...prev, [rejectItemId]: "rejected" }));
      setHasChanges(true);
      
      // Build items array with current statuses and feedbacks
      const items = budget.items.map((item) => {
        const id = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
        const currentStatus = id === rejectItemId ? "rejected" : (itemStatuses[id] || item.status || "pending");
        const currentFeedback = id === rejectItemId ? rejectReason.trim() : (itemFeedbacks[id] || item.feedback || "");
        return {
          itemId: item.itemId || item._id || item.itemId?._id,
          status: currentStatus,
          feedback: currentFeedback,
        };
      });
      
      // Save to backend and wait for completion
      await budgetApi.saveReviewDraft(eventId, departmentId, budget._id, { items });
      
      // Only close modal and show success after save is complete
      setShowRejectModal(false);
      setRejectItemId(null);
      setRejectReason("");
      setHasChanges(false); // Mark as saved
      toast.success("Đã từ chối mục ngân sách và lưu thành công!");
    } catch (err) {
      console.error("Error saving reject reason:", err);
      toast.error("Lỗi khi lưu thay đổi. Vui lòng thử lại!");
      // Don't close modal if save failed
    }
  };

  const handleCancelReject = () => {
    setShowRejectModal(false);
    setRejectItemId(null);
    setRejectReason("");
  };

  const handleUndoStatus = async (itemId) => {
    setItemStatuses((prev) => ({ ...prev, [itemId]: "pending" }));
    setHasChanges(true);
    
    // Auto-save to backend
    try {
      const items = budget.items.map((item) => {
        const id = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
        const currentStatus = id === itemId ? "pending" : (itemStatuses[id] || item.status || "pending");
        const currentFeedback = itemFeedbacks[id] || item.feedback || "";
        return {
          itemId: item.itemId || item._id || item.itemId?._id,
          status: currentStatus,
          feedback: currentFeedback,
        };
      });
      
      await budgetApi.saveReviewDraft(eventId, departmentId, budget._id, { items });
      // Don't show toast for auto-save on undo to avoid spam
    } catch (err) {
      console.error("Error auto-saving undo:", err);
      // Don't show error toast for auto-save, just log it
    }
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
      toast.success("Đã lưu thành công!");
      setHasChanges(false);
      // Refresh data để lấy feedback đã lưu
      await fetchData();
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error(error?.response?.data?.message || "Lưu thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReview = async () => {
    try {
      setLoading(true);
      
      // Validate: all items must be approved or rejected
      // First, check if all items have been reviewed (approved or rejected)
      const unreviewedItems = budget.items.filter((item) => {
        const itemId = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
        // Get current status: prioritize itemStatuses (user's current changes) over item.status (from backend)
        const currentStatus = itemStatuses[itemId] !== undefined 
          ? itemStatuses[itemId] 
          : (item.status || "pending");
        
        // Item is considered unreviewed if status is still "pending"
        return currentStatus === "pending";
      });
      
      if (unreviewedItems.length > 0) {
        toast.error(`Vui lòng duyệt hoặc từ chối tất cả các mục trước khi hoàn tất! Còn ${unreviewedItems.length} mục chưa được duyệt.`);
        setLoading(false);
        return;
      }
      
      // Build items array with current statuses and feedbacks
      const items = budget.items.map((item) => {
        const itemId = item.itemId?.toString() || item._id?.toString() || item.itemId?._id?.toString();
        // Prioritize itemStatuses (user's current changes) over item.status (from backend)
        const currentStatus = itemStatuses[itemId] !== undefined 
          ? itemStatuses[itemId] 
          : (item.status || "pending");
        const currentFeedback = itemFeedbacks[itemId] !== undefined 
          ? itemFeedbacks[itemId] 
          : (item.feedback || "");
        
        // Double check: status must be approved or rejected
        if (currentStatus !== "approved" && currentStatus !== "rejected") {
          console.error(`Item ${itemId} has invalid status: ${currentStatus}`);
        }
        
        return {
          itemId: item.itemId || item._id || item.itemId?._id,
          status: currentStatus,
          feedback: currentFeedback,
        };
      });
      
      // Final validation: ensure all items are approved or rejected
      const allReviewed = items.every(item => {
        const status = item.status;
        return status === 'approved' || status === 'rejected';
      });
      
      if (!allReviewed) {
        toast.error("Vui lòng duyệt hoặc từ chối tất cả các mục trước khi hoàn tất!");
        setLoading(false);
        return;
      }

      // Check if there are any rejected items
      const rejectedItems = items.filter(item => item.status === 'rejected');
      const approvedItems = items.filter(item => item.status === 'approved');
      
      // Log for debugging
      console.log('Complete Review - Items Status:', {
        total: items.length,
        approved: approvedItems.length,
        rejected: rejectedItems.length,
        rejectedItemIds: rejectedItems.map(item => item.itemId),
        expectedBudgetStatus: rejectedItems.length > 0 ? 'changes_requested' : 'approved'
      });

      // Important: Backend should set budget status based on items:
      // - If ALL items are approved → budget status = "approved"
      // - If ANY items are rejected → budget status = "changes_requested"
      // If backend sets status incorrectly, this will help identify the issue
      if (rejectedItems.length > 0) {
        console.warn('⚠️ Budget has rejected items. Backend should set budget status to "changes_requested", not "approved"');
      }

      const response = await budgetApi.completeReview(eventId, departmentId, budget._id, { items });
      
      // Verify the response status matches expected status
      // Backend should set budget status based on items:
      // - If ALL items are approved → budget status = "approved"
      // - If ANY items are rejected → budget status = "changes_requested"
      const returnedBudget = response?.budget || response?.data || response;
      const returnedStatus = returnedBudget?.status;
      const expectedStatus = rejectedItems.length > 0 ? 'changes_requested' : 'approved';
      
      if (returnedStatus && returnedStatus !== expectedStatus) {
        console.error('❌ Budget status mismatch!', {
          expected: expectedStatus,
          actual: returnedStatus,
          hasRejectedItems: rejectedItems.length > 0,
          rejectedCount: rejectedItems.length,
          approvedCount: approvedItems.length
        });
        
        // Show warning to user if status is incorrect
        if (rejectedItems.length > 0 && returnedStatus === 'approved') {
          toast.warning('Cảnh báo: Budget có items bị từ chối nhưng status hiển thị là "Đã duyệt". Vui lòng kiểm tra lại.');
        }
      } else if (rejectedItems.length > 0) {
        console.log('✅ Budget status correctly set to "changes_requested"');
      }
      
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
        title="Xem chi tiết ngân sách của các ban"
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
      title="Xem chi tiết ngân sách của các ban"
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
                Trạng thái ngân sách dự trù
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
                  Phản hồi từ tưởng ban tổ chức
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
              Lưu 
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowCompleteModal(true)}
              disabled={loading}
              style={{ borderRadius: "8px", background: "#1E40AF" }}
            >
              <i className="bi bi-check-circle me-2"></i>
              Hoàn tất
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

      {/* Reject Item Modal - Using Portal to render outside component tree */}
      {showRejectModal && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={handleCancelReject}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              width: "500px",
              maxWidth: "90vw",
              padding: "24px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <AlertCircle size={24} style={{ color: "#DC2626" }} />
                <h5 className="mb-0 fw-bold" style={{ fontSize: "18px", color: "#111827" }}>
                  Từ chối mục ngân sách
                </h5>
              </div>
              <button
                className="btn btn-link p-0"
                onClick={handleCancelReject}
                style={{ color: "#6B7280" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mb-4">
              <p className="mb-3" style={{ color: "#374151", fontSize: "14px" }}>
                Bạn hãy vui lòng nhập lý do nếu từ chối
              </p>
              <textarea
                className="form-control"
                rows="4"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                style={{
                  fontSize: "14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  resize: "vertical",
                }}
                autoFocus
              />
            </div>

            {/* Modal Footer */}
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-outline-secondary"
                onClick={handleCancelReject}
                style={{ borderRadius: "8px", fontSize: "14px" }}
              >
                Hủy
              </button>
              <button
                className="btn btn-danger d-flex align-items-center"
                onClick={handleConfirmReject}
                style={{ borderRadius: "8px", fontSize: "14px" }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </UserLayout>
  );
};

export default ViewDeptBudgetDetailHoOC;