import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { departmentService } from "../../services/departmentService";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../contexts/AuthContext";

const ViewDepartmentBudget = () => {
  const { eventId, departmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(null);
  const [department, setDepartment] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTable, setActiveTable] = useState("hooc"); // "hooc" hoặc "member"
  const [members, setMembers] = useState([]);
  const [assigningItem, setAssigningItem] = useState(null);
  
  // Column widths state for resizable columns
  const [columnWidths, setColumnWidths] = useState(null);
  
  // Default column widths
  const defaultWidths = {
    category: 120,
    name: 200,
    unitCost: 130,
    qty: 100,
    unit: 100,
    note: 200,
    assign: 200,
    evidence: 150,
    memberNote: 200,
    total: 130,
    actualAmount: 150
  };
  
  const widths = columnWidths || defaultWidths;
  
  // Save column widths to localStorage
  const saveColumnWidths = (newWidths) => {
    if (departmentId) {
      setColumnWidths(newWidths);
      localStorage.setItem(`budget-table-columns-${departmentId}`, JSON.stringify(newWidths));
    }
  };
  
  // Resize handler
  const [resizing, setResizing] = useState({ column: null, startX: 0, startWidth: 0 });
  
  const handleMouseDown = (e, column) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const startWidth = widths[column] || defaultWidths[column];
    setResizing({ column, startX, startWidth });
    
    let currentWidth = startWidth;
    
    const handleMouseMove = (e) => {
      const diff = e.pageX - startX;
      currentWidth = Math.max(80, startWidth + diff); // Min width 80px
      setColumnWidths(prev => {
        const updated = { ...(prev || defaultWidths), [column]: currentWidth };
        return updated;
      });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setResizing({ column: null, startX: 0, startWidth: 0 });
      // Save to localStorage with final width
      const finalWidths = { ...(columnWidths || defaultWidths), [column]: currentWidth };
      saveColumnWidths(finalWidths);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Check if current user is HoD (Head of Department)
  const isHoD = React.useMemo(() => {
    if (!user || !department) return false;
    const userId = user._id || user.id;
    const leaderId = department.leaderId?._id || department.leaderId || department.leader?._id || department.leader;
    return leaderId && (leaderId.toString() === userId?.toString() || leaderId === userId);
  }, [user, department]);

  // Load column widths from localStorage when departmentId is available
  useEffect(() => {
    if (departmentId) {
      const saved = localStorage.getItem(`budget-table-columns-${departmentId}`);
      if (saved) {
        try {
          setColumnWidths(JSON.parse(saved));
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [departmentId]);

  useEffect(() => {
    fetchData();
  }, [eventId, departmentId]);

  const fetchData = async () => {
    if (!departmentId || departmentId === "current" || departmentId === "") {
      console.warn("Invalid departmentId:", departmentId);
      navigate(`/events/${eventId}/departments`);
      return;
    }

    try {
      setLoading(true);
      const [budgetData, deptData, membersData] = await Promise.all([
        budgetApi.getDepartmentBudget(eventId, departmentId),
        departmentService.getDepartmentDetail(eventId, departmentId),
        departmentService.getMembersByDepartment(eventId, departmentId).catch(() => []),
      ]);
      
      if (!budgetData) {
        navigate(`/events/${eventId}/departments/${departmentId}/budget/empty`);
        return;
      }
      
      setBudget(budgetData);
      setDepartment(deptData);
      setMembers(membersData || []);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error?.response?.status === 404) {
        navigate(`/events/${eventId}/departments/${departmentId}/budget/empty`);
        return;
      } else if (error?.response?.status === 500 || departmentId === "current") {
        navigate(`/events/${eventId}/departments`);
        return;
      } else {
        toast.error("Không thể tải dữ liệu budget");
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

  const getStatusLabel = (status) => {
    const statusMap = {
      draft: "Nháp",
      submitted: "Chờ duyệt",
      changes_requested: "Cần chỉnh sửa",
      approved: "Đã phê duyệt",
      locked: "Đã khóa",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      draft: "#6B7280",
      submitted: "#F59E0B",
      changes_requested: "#EF4444",
      approved: "#10B981",
      locked: "#374151",
    };
    return colorMap[status] || "#6B7280";
  };

  const filteredItems = budget?.items?.filter((item) =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalCost = budget?.items?.reduce(
    (sum, item) => sum + (parseFloat(item.total) || 0),
    0
  ) || 0;

  const handleEdit = () => {
    navigate(`/events/${eventId}/departments/${departmentId}/budget/edit`);
  };

  const handleDeleteDraft = async () => {
    try {
      await budgetApi.deleteDraft(eventId, departmentId, budget._id);
      toast.success("Đã xóa bản nháp thành công!");
      navigate(`/events/${eventId}/departments/${departmentId}/budget/empty`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Xóa bản nháp thất bại!");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleSubmit = async () => {
    const currentStatus = budget?.status || "draft";
    
    if (currentStatus !== "draft" && currentStatus !== "changes_requested" && currentStatus !== "submitted") {
      toast.error(`Không thể gửi duyệt. Trạng thái hiện tại: ${currentStatus}`);
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Submitting budget:', { eventId, departmentId, budgetId: budget._id, status: budget.status });
      
      await budgetApi.submitBudget(eventId, departmentId, budget._id);
      toast.success("Gửi duyệt thành công!");
      await fetchData();
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || "Gửi duyệt thất bại!";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecall = async () => {
    try {
      await budgetApi.recallBudget(eventId, departmentId, budget._id);
      toast.success("Thu hồi bản gửi thành công!");
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Thu hồi thất bại!");
    } finally {
      setShowRecallModal(false);
    }
  };

  const handleSendToMembers = async () => {
    try {
      await budgetApi.sendBudgetToMembers(eventId, departmentId, budget._id);
      toast.success("Gửi budget xuống member thành công!");
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Gửi thất bại!");
    }
  };

  const handleAssignItem = async (itemId, memberId) => {
    try {
      setAssigningItem(itemId);
      // Đảm bảo itemId là string
      const itemIdStr = itemId?.toString() || itemId;
      console.log('Assigning item:', itemIdStr, 'to member:', memberId);
      await budgetApi.assignItem(eventId, departmentId, budget._id, itemIdStr, memberId);
      toast.success("Phân công thành công!");
      await fetchData();
    } catch (error) {
      console.error('Assign error:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          (error?.response?.status === 403 ? "Bạn không có quyền thực hiện thao tác này. Chỉ trưởng ban (HoD) mới có quyền phân công." :
                           error?.response?.status === 401 ? "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn." :
                           "Phân công thất bại!");
      toast.error(errorMessage);
    } finally {
      setAssigningItem(null);
    }
  };

  // Kiểm tra xem tất cả items đã được assign chưa
  const allItemsAssigned = budget?.items?.every(item => {
    const assignedId = item.assignedTo?.toString() || 
                       item.assignedToInfo?._id?.toString() || 
                       item.assignedToInfo?.id?.toString();
    return assignedId && assignedId !== '';
  }) || false;
  const unassignedCount = budget?.items?.filter(item => {
    const assignedId = item.assignedTo?.toString() || 
                       item.assignedToInfo?._id?.toString() || 
                       item.assignedToInfo?.id?.toString();
    return !assignedId || assignedId === '';
  }).length || 0;

  // Hàm so sánh mới: so sánh Tổng Tiền (VNĐ) và Tổng tiền thực tế
  const getComparisonDisplay = (estimatedTotal, actualAmount) => {
    const estimated = parseFloat(estimatedTotal?.toString() || 0);
    const actual = parseFloat(actualAmount?.toString() || 0);
    
    if (actual === 0) {
      return <span className="text-muted">—</span>;
    }
    
    if (actual < estimated) {
      // Thực tế < dự trù: màu đỏ + mũi tên xuống
      return (
        <span style={{ color: "#DC2626", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
          <i className="bi bi-arrow-down" style={{ fontSize: "16px" }}></i>
          {formatCurrency(estimated - actual)}
        </span>
      );
    } else if (actual > estimated) {
      // Thực tế > dự trù: màu xanh + mũi tên lên
      return (
        <span style={{ color: "#10B981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
          <i className="bi bi-arrow-up" style={{ fontSize: "16px" }}></i>
          {formatCurrency(actual - estimated)}
        </span>
      );
    } else {
      // Bằng nhau
      return (
        <span style={{ color: "#6B7280", fontWeight: "600" }}>
          Bằng nhau
        </span>
      );
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!budget) {
    return null;
  }

  const status = budget.status || "draft";
  const isDraft = status === "draft";
  const isSubmitted = status === "submitted";
  const isRejected = status === "changes_requested";
  const isApproved = status === "approved";
  const isSentToMembers = status === "sent_to_members";

  const itemsWithFeedback = budget?.items?.filter(item => 
    item.feedback && item.feedback.trim() !== "" && item.status === "rejected"
  ) || [];
  const hasRejectedItems = itemsWithFeedback.length > 0;

  return (
    <UserLayout
      title="Xem Ngân sách của Ban"
      activePage="budget"
      sidebarType="hod"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4 d-flex justify-content-between align-items-start">
          <div>
            <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
              Budget Ban
            </h2>
            <div className="d-flex align-items-center gap-2 text-muted">
              <i className="bi bi-people-fill"></i>
              <span>Ban: {department?.name || "Đang tải..."}</span>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/events/${eventId}/departments/${departmentId}/budget/create`)}
            style={{ borderRadius: "8px" }}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Tạo Budget mới
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

          <div className="d-flex flex-wrap" style={{ gap: "32px" }}>
            <div style={{ flex: "1", minWidth: "150px" }}>
              <div>
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
            </div>

            <div style={{ flex: "1", minWidth: "150px" }}>
              <div>
                <div className="fw-bold mb-1" style={{ fontSize: "24px", color: "#111827" }}>
                  {budget.items?.length || 0}
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                  Tổng Số Mục
                </p>
              </div>
            </div>

            <div style={{ flex: "1", minWidth: "150px" }}>
              <div>
                <div className="fw-bold mb-1" style={{ fontSize: "18px", color: "#111827" }}>
                  {formatDate(budget.createdAt)}
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                  Ngày Tạo
                </p>
              </div>
            </div>

            <div style={{ flex: "1", minWidth: "150px" }}>
              <div>
                <div className="fw-bold mb-1" style={{ fontSize: "18px", color: "#111827" }}>
                  {budget.createdBy?.fullName || "Nguyễn Văn A"}
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                  Người Tạo (Trưởng ban)
                </p>
              </div>
            </div>

            <div style={{ flex: "1", minWidth: "150px" }}>
              <div>
                <span
                  className="badge px-3 py-2"
                  style={{
                    background: getStatusColor(status) + "22",
                    color: getStatusColor(status),
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {getStatusLabel(status)}
                </span>
                <p className="text-muted mb-0 mt-2" style={{ fontSize: "14px" }}>
                  Trạng thái budget
                </p>
              </div>
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
                  <i className="bi bi-search"></i>
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

          {/* Tab Selection */}
          <div className="d-flex gap-2 mb-4">
            <button
              className={`btn ${activeTable === "hooc" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveTable("hooc")}
              style={{ borderRadius: "8px" }}
            >
              <i className="bi bi-send me-2"></i>
              Bảng gửi HoOC
            </button>
            {(isApproved || isSentToMembers) && (
              <button
                className={`btn ${activeTable === "member" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setActiveTable("member")}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-people me-2"></i>
                Bảng kiểm soát Member
              </button>
            )}
          </div>

          {/* Bảng 1: Gửi cho HoOC */}
          {activeTable === "hooc" && (
            <div className="table-responsive" style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", wordWrap: "break-word" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "120px" }}>
                      Hạng Mục
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "200px" }}>
                      Nội dung
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "130px" }}>
                      Đơn Giá (VNĐ)
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "100px" }}>
                      Số Lượng
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "100px" }}>
                      Đơn Vị Tính
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "130px" }}>
                      Tổng Tiền (VNĐ)
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "200px" }}>
                      Ghi Chú
                    </th>
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "250px" }}>
                      Phản hồi từ HoOC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        Không tìm thấy mục nào
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, index) => {
                      const hasFeedback = item.feedback && item.feedback.trim() !== "";
                      const isItemRejected = item.status === "rejected";
                      const shouldHighlight = hasFeedback && isItemRejected;
                      
                      // CHỈ tô màu đỏ cho dòng bị từ chối
                      const cellBgColor = shouldHighlight ? "#FCA5A5" : "transparent";
                      
                      return (
                        <tr key={item.itemId || index}>
                          <td style={{ padding: "12px", backgroundColor: cellBgColor }}>
                            <span style={{ color: shouldHighlight ? "#DC2626" : "#6B7280" }}>
                              {item.category || "—"}
                            </span>
                          </td>
                          <td style={{ 
                            padding: "12px", 
                            backgroundColor: cellBgColor, 
                            width: "200px",
                            minWidth: "200px",
                            maxWidth: "200px",
                            wordWrap: "break-word",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            verticalAlign: "top"
                          }}>
                            <span 
                              style={{ 
                                color: shouldHighlight ? "#DC2626" : "#111827", 
                                fontWeight: shouldHighlight ? "500" : "normal"
                              }}
                            >
                              {item.name}
                            </span>
                          </td>
                          <td style={{ padding: "12px", color: shouldHighlight ? "#DC2626" : "#111827", backgroundColor: cellBgColor }}>
                            {formatCurrency(parseFloat(item.unitCost) || 0)}
                          </td>
                          <td style={{ padding: "12px", color: shouldHighlight ? "#DC2626" : "#111827", backgroundColor: cellBgColor }}>
                            {item.qty || 0}
                          </td>
                          <td style={{ padding: "12px", backgroundColor: cellBgColor }}>
                            <span style={{ color: shouldHighlight ? "#DC2626" : "#6B7280" }}>
                              {item.unit || "cái"}
                            </span>
                          </td>
                          <td style={{ padding: "12px", backgroundColor: cellBgColor }}>
                            <span 
                              className="fw-semibold"
                              style={{ color: shouldHighlight ? "#DC2626" : "#111827" }}
                            >
                              {formatCurrency(parseFloat(item.total) || 0)}
                            </span>
                          </td>
                          <td style={{ 
                            padding: "12px", 
                            backgroundColor: cellBgColor, 
                            width: "200px",
                            minWidth: "200px",
                            maxWidth: "200px",
                            wordWrap: "break-word",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            verticalAlign: "top"
                          }}>
                            <span 
                              style={{ 
                                color: shouldHighlight ? "#DC2626" : "#111827"
                              }}
                            >
                              {item.note || "—"}
                            </span>
                          </td>
                          <td style={{ 
                            padding: "12px", 
                            backgroundColor: cellBgColor, 
                            width: "250px",
                            minWidth: "250px",
                            maxWidth: "250px",
                            wordWrap: "break-word",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            verticalAlign: "top"
                          }}>
                            {hasFeedback ? (
                              <span 
                                style={{ 
                                  color: "#111827", 
                                  fontSize: "13px", 
                                  fontWeight: "500"
                                }}
                              >
                                {item.feedback}
                              </span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: "13px" }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Bảng 2: Kiểm soát Member (hiện khi đã approved hoặc đã gửi xuống member) */}
          {activeTable === "member" && (isApproved || isSentToMembers) && (
            <div className="table-responsive" style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", wordWrap: "break-word", tableLayout: "fixed" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.category}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Hạng Mục
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "5px",
                          cursor: "col-resize",
                          backgroundColor: resizing.column === "category" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "category")}
                        onMouseEnter={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "#E5E7EB";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.name}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Nội dung
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "5px",
                          cursor: "col-resize",
                          backgroundColor: resizing.column === "name" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "name")}
                        onMouseEnter={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "#E5E7EB";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.unitCost}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Đơn Giá (VNĐ)
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "5px",
                          cursor: "col-resize",
                          backgroundColor: resizing.column === "unitCost" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "unitCost")}
                        onMouseEnter={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "#E5E7EB";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.qty}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Số Lượng
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "5px",
                          cursor: "col-resize",
                          backgroundColor: resizing.column === "qty" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "qty")}
                        onMouseEnter={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "#E5E7EB";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.unit}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Đơn Vị Tính
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "5px",
                          cursor: "col-resize",
                          backgroundColor: resizing.column === "unit" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "unit")}
                        onMouseEnter={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "#E5E7EB";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.note}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Ghi Chú
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "5px",
                          cursor: "col-resize",
                          backgroundColor: resizing.column === "note" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "note")}
                        onMouseEnter={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "#E5E7EB";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      />
                    </th>
                    {isApproved && isHoD && (
                      <th style={{ 
                        padding: "12px", 
                        fontWeight: "600", 
                        color: "#374151", 
                        width: `${widths.assign}px`,
                        position: "relative",
                        userSelect: "none"
                      }}>
                        Giao việc
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: "5px",
                            cursor: "col-resize",
                            backgroundColor: resizing.column === "assign" ? "#3B82F6" : "transparent",
                            zIndex: 10
                          }}
                          onMouseDown={(e) => handleMouseDown(e, "assign")}
                          onMouseEnter={(e) => {
                            if (!resizing.column) {
                              e.currentTarget.style.backgroundColor = "#E5E7EB";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!resizing.column) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        />
                      </th>
                    )}
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.evidence}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Bằng chứng
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "5px",
                          cursor: "col-resize",
                          backgroundColor: resizing.column === "evidence" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "evidence")}
                        onMouseEnter={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "#E5E7EB";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.memberNote}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Chú thích (member ghi)
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "5px",
                          cursor: "col-resize",
                          backgroundColor: resizing.column === "memberNote" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "memberNote")}
                        onMouseEnter={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "#E5E7EB";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.total}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Tổng Tiền (VNĐ)
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "5px",
                          cursor: "col-resize",
                          backgroundColor: resizing.column === "total" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "total")}
                        onMouseEnter={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "#E5E7EB";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!resizing.column) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      />
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.actualAmount}px`,
                      position: "relative",
                      userSelect: "none"
                    }}>
                      Tổng tiền thực tế
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={isApproved && isHoD ? 11 : 10} className="text-center text-muted py-4">
                        Không tìm thấy mục nào
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, index) => {
                      const estimatedTotal = parseFloat(item.total?.toString() || 0);
                      const actualAmount = parseFloat(item.actualAmount?.toString() || 0);
                      const isPaid = item.isPaid || false;
                      // Nếu đã thanh toán, background màu xanh lá nhạt
                      const rowBgColor = isPaid ? "#D1FAE5" : "transparent";
                      
                      return (
                        <tr key={item.itemId || index} style={{ backgroundColor: rowBgColor }}>
                          <td style={{ padding: "12px" }}>
                            <span style={{ color: "#6B7280" }}>
                              {item.category || "—"}
                            </span>
                          </td>
                          <td style={{ 
                            padding: "12px", 
                            width: "200px",
                            minWidth: "200px",
                            maxWidth: "200px",
                            wordWrap: "break-word",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            verticalAlign: "top"
                          }}>
                            <span style={{ color: "#111827" }}>
                              {item.name}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            {formatCurrency(parseFloat(item.unitCost) || 0)}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {item.qty || 0}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ color: "#6B7280" }}>
                              {item.unit || "cái"}
                            </span>
                          </td>
                          <td style={{ 
                            padding: "12px", 
                            width: "200px",
                            minWidth: "200px",
                            maxWidth: "200px",
                            wordWrap: "break-word",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            verticalAlign: "top"
                          }}>
                            <span style={{ color: "#111827" }}>
                              {item.note || "—"}
                            </span>
                          </td>
                          {isApproved && isHoD && (
                            <td style={{ padding: "12px" }}>
                              <select
                                className="form-select form-select-sm"
                                value={
                                  item.assignedTo?.toString() || 
                                  item.assignedToInfo?._id?.toString() || 
                                  item.assignedToInfo?.id?.toString() || 
                                  ""
                                }
                                onChange={(e) => {
                                  const itemIdToUse = item.itemId?.toString() || item.itemId?._id?.toString() || item.itemId || item._id?.toString() || item._id;
                                  handleAssignItem(itemIdToUse, e.target.value || null);
                                }}
                                disabled={assigningItem === (item.itemId?.toString() || item.itemId || item._id?.toString() || item._id)}
                                style={{ minWidth: "150px" }}
                              >
                                <option value="">Chưa phân công</option>
                                {members.map((member) => (
                                  <option key={member._id || member.id} value={member._id || member.id}>
                                    {member.name || member.userId?.fullName || member.email || member.userId?.email || "Member"}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          <td style={{ 
                            padding: "12px", 
                            width: "150px",
                            minWidth: "150px",
                            maxWidth: "150px",
                            wordWrap: "break-word",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            verticalAlign: "top"
                          }}>
                            {item.evidence && item.evidence.length > 0 ? (
                              <div className="d-flex flex-wrap gap-1">
                                {item.evidence.map((ev, idx) => {
                                  const isImage = ev.type === 'image';
                                  const evidenceName = ev.name || `Bằng chứng ${idx + 1}`;
                                  return isImage ? (
                                    <button
                                      key={idx}
                                      className="badge"
                                      onClick={() => {
                                        setSelectedImage(ev.url);
                                        setShowImageModal(true);
                                      }}
                                      style={{
                                        background: "#DBEAFE",
                                        color: "#1E40AF",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "11px",
                                        wordWrap: "break-word",
                                        wordBreak: "break-word",
                                        whiteSpace: "normal",
                                        marginBottom: "4px"
                                      }}
                                      title="Click để xem ảnh"
                                    >
                                      <i className="bi bi-image me-1"></i>
                                      {evidenceName}
                                    </button>
                                  ) : (
                                    <a
                                      key={idx}
                                      href={ev.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="badge"
                                      style={{
                                        background: "#DBEAFE",
                                        color: "#1E40AF",
                                        textDecoration: "none",
                                        fontSize: "11px",
                                        wordWrap: "break-word",
                                        wordBreak: "break-word",
                                        whiteSpace: "normal",
                                        display: "inline-block",
                                        marginBottom: "4px"
                                      }}
                                    >
                                      {ev.type === 'pdf' && <i className="bi bi-file-pdf me-1"></i>}
                                      {ev.type === 'doc' && <i className="bi bi-file-word me-1"></i>}
                                      {ev.type === 'link' && <i className="bi bi-link-45deg me-1"></i>}
                                      {evidenceName}
                                    </a>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td style={{ 
                            padding: "12px", 
                            width: "200px",
                            minWidth: "200px",
                            maxWidth: "200px",
                            wordWrap: "break-word",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            verticalAlign: "top"
                          }}>
                            <span style={{ color: "#111827", fontSize: "13px" }}>
                              {item.memberNote || "—"}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span className="fw-semibold" style={{ color: "#111827" }}>
                              {formatCurrency(estimatedTotal)}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            {actualAmount > 0 ? (
                              <span
                                className="fw-semibold"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  color: actualAmount < estimatedTotal 
                                    ? "#DC2626"  // Đỏ nếu thực tế < dự trù
                                    : actualAmount > estimatedTotal 
                                    ? "#10B981"  // Xanh nếu thực tế > dự trù
                                    : "#6B7280", // Xám nếu bằng nhau
                                }}
                              >
                                {actualAmount < estimatedTotal && (
                                  <i className="bi bi-arrow-down" style={{ fontSize: "16px" }}></i>
                                )}
                                {actualAmount > estimatedTotal && (
                                  <i className="bi bi-arrow-up" style={{ fontSize: "16px" }}></i>
                                )}
                                {formatCurrency(actualAmount)}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {hasRejectedItems && (
            <div
              className="mt-3 p-3"
              style={{
                background: "#FEF3C7",
                borderRadius: "8px",
                border: "1px solid #FCD34D",
              }}
            >
              <div className="d-flex align-items-start gap-2">
                <i className="bi bi-info-circle" style={{ color: "#D97706", fontSize: "20px", marginTop: "2px" }}></i>
                <p className="mb-0" style={{ color: "#92400E", fontSize: "14px" }}>
                  Một số mục trong ngân sách này bị từ chối, vui lòng chỉnh sửa lại trước khi gửi duyệt lại.
                </p>
              </div>
            </div>
          )}

          {isSentToMembers && (
            <div
              className="mt-3 p-3"
              style={{
                background: "#D1FAE5",
                borderRadius: "8px",
                border: "1px solid #6EE7B7",
              }}
            >
              <div className="d-flex align-items-start gap-2">
                <i className="bi bi-check-circle" style={{ color: "#10B981", fontSize: "20px", marginTop: "2px" }}></i>
                <p className="mb-0" style={{ color: "#065F46", fontSize: "14px" }}>
                  Budget đã được gửi xuống các thành viên. Bạn có thể xem báo cáo chi tiêu của họ trong bảng trên.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-end gap-2 mt-4">
          {isDraft && (
            <>
              <button
                className="btn btn-danger"
                onClick={() => setShowDeleteModal(true)}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-trash me-2"></i>
                Xoá Bản Nháp
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEdit}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-pencil me-2"></i>
                Chỉnh Sửa
              </button>
            </>
          )}

          {isSubmitted && (
            <>
              <button
                className="btn btn-outline-primary"
                onClick={() => setShowRecallModal(true)}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-arrow-counterclockwise me-2"></i>
                Thu hồi bản gửi
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEdit}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-pencil me-2"></i>
                Chỉnh Sửa
              </button>
            </>
          )}

          {isRejected && (
            <>
              <button
                className="btn btn-primary"
                onClick={handleEdit}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-pencil me-2"></i>
                Chỉnh Sửa
              </button>
            </>
          )}

          <button
            className="btn btn-primary"
            onClick={() => {
              toast.info("Tính năng tải PDF đang được phát triển");
            }}
            style={{ borderRadius: "8px" }}
          >
            <i className="bi bi-download me-2"></i>
            Tải xuống PDF
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteDraft}
        title="Xác nhận xóa bản nháp"
        message="Bạn có chắc chắn muốn xóa bản nháp này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        confirmVariant="danger"
      />

      {/* Recall Confirmation Modal */}
      <ConfirmModal
        show={showRecallModal}
        onClose={() => setShowRecallModal(false)}
        onConfirm={handleRecall}
        title="Xác nhận thu hồi"
        message="Bạn có chắc chắn muốn thu hồi bản gửi này? Budget sẽ chuyển về trạng thái nháp."
        confirmText="Thu hồi"
        confirmVariant="primary"
      />

      {/* Image View Modal */}
      {showImageModal && selectedImage && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.8)", zIndex: 9999 }}
          onClick={() => {
            setShowImageModal(false);
            setSelectedImage(null);
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ background: "transparent", border: "none" }}>
              <div className="modal-header" style={{ border: "none", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowImageModal(false);
                    setSelectedImage(null);
                  }}
                  style={{ fontSize: "24px" }}
                ></button>
              </div>
              <div className="modal-body p-0" style={{ textAlign: "center" }}>
                <img
                  src={selectedImage}
                  alt="Bằng chứng"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    borderRadius: "8px",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                  }}
                  onError={(e) => {
                    e.target.src = "/no-data.png";
                    e.target.alt = "Không thể tải ảnh";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default ViewDepartmentBudget;