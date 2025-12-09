import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { departmentService } from "../../services/departmentService";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import ConfirmModal from "../../components/ConfirmModal";
import { useAuth } from "../../contexts/AuthContext";
import { useEvents } from "../../contexts/EventContext";
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle, Edit, ExternalLink, Eye, FileText, Image, Info, Link, Paperclip, Pencil, PlusCircle, RotateCcw, Search, Send, Trash, Upload, Users } from "lucide-react";


const ViewDepartmentBudget = () => {
  const { eventId, departmentId, budgetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchEventRole } = useEvents();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(null);
  const [department, setDepartment] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [sidebarType, setSidebarType] = useState('user');
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTable, setActiveTable] = useState("hooc"); // "hooc" hoặc "member"
  const [members, setMembers] = useState([]);
  const [assigningItem, setAssigningItem] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [editingEvidenceItem, setEditingEvidenceItem] = useState(null);
  const [evidenceFormData, setEvidenceFormData] = useState({
    evidence: []
  });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseItem, setEditingExpenseItem] = useState(null);
  const [expenseFormData, setExpenseFormData] = useState({
    actualAmount: "",
    memberNote: "",
    evidence: []
  });
  const [editingInlineItem, setEditingInlineItem] = useState(null);
  const [inlineFormData, setInlineFormData] = useState({
    actualAmount: "",
    memberNote: ""
  });
  
  const [columnWidths, setColumnWidths] = useState(null);
  
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
    actualAmount: 150,
    hoocCategory: 120,
    hoocName: 200,
    hoocUnitCost: 130,
    hoocQty: 100,
    hoocUnit: 100,
    hoocTotal: 130,
    hoocNote: 200,
    hoocEvidence: 150,
    hoocFeedback: 250
  };

  const minWidths = {
    category: 110,
    name: 180,
    unitCost: 140,
    qty: 100,
    unit: 110,
    note: 180,
    assign: 130,
    evidence: 130,
    memberNote: 180,
    total: 140,
    actualAmount: 150,
    hoocCategory: 110,
    hoocName: 180,
    hoocUnitCost: 140,
    hoocQty: 100,
    hoocUnit: 110,
    hoocTotal: 140,
    hoocNote: 180,
    hoocEvidence: 130,
    hoocFeedback: 220
  };
  
  const widths = columnWidths || defaultWidths;
  
  const saveColumnWidths = (newWidths) => {
    if (departmentId) {
      setColumnWidths(newWidths);
      localStorage.setItem(`budget-table-columns-${departmentId}`, JSON.stringify(newWidths));
    }
  };
  
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
      const minWidth = minWidths[column] || 80;
      currentWidth = Math.max(minWidth, startWidth + diff);
      setColumnWidths(prev => {
        const updated = { ...(prev || defaultWidths), [column]: currentWidth };
        return updated;
      });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setResizing({ column: null, startX: 0, startWidth: 0 });
      const finalWidths = { ...(columnWidths || defaultWidths), [column]: currentWidth };
      saveColumnWidths(finalWidths);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const isHoD = useMemo(() => {
    if (!user || !department) return false;
    const userId = user._id || user.id;
    const leaderId = department.leaderId?._id || department.leaderId || department.leader?._id || department.leader;
    return leaderId && (leaderId.toString() === userId?.toString() || leaderId === userId);
  }, [user, department]);

  const currentMember = useMemo(() => {
    if (!user || !Array.isArray(members) || members.length === 0) return null;
    const userId = user._id || user.id;
    if (!userId) return null;
    return members.find((member) => {
      const memberUserId =
        member?.userId?._id ||
        member?.userId ||
        member?.id ||
        member?._id;
      return memberUserId && String(memberUserId) === String(userId);
    });
  }, [members, user]);

  const currentMemberId =
    currentMember?._id || currentMember?.id || currentMember?.userId;

  useEffect(() => {
    if (departmentId) {
      const saved = localStorage.getItem(`budget-table-columns-${departmentId}`);
      if (saved) {
        try {
          setColumnWidths(JSON.parse(saved));
        } catch (e) {
        }
      }
    }
  }, [departmentId]);

  useEffect(() => {
    fetchData();
  }, [eventId, departmentId, budgetId]);

  const fetchData = async () => {
    if (!departmentId || departmentId === "current" || departmentId === "") {
      console.warn("Invalid departmentId:", departmentId);
      navigate(`/events/${eventId}/departments`);
      return;
    }

    try {
      setLoading(true);
      
      const budgetPromise = budgetId 
        ? budgetApi.getDepartmentBudgetById(eventId, departmentId, budgetId)
        : budgetApi.getDepartmentBudget(eventId, departmentId);
      
      // Load budget và department trước (cần thiết ngay)
      const [budgetData, deptData] = await Promise.all([
        budgetPromise,
        departmentService.getDepartmentDetail(eventId, departmentId),
      ]);
      
      // Lazy load members chỉ khi cần (khi budget đã approved và là HoD)
      let membersData = [];
      if (budgetData && (budgetData.status === 'approved' || budgetData.status === 'sent_to_members')) {
        try {
          membersData = await departmentService.getMembersByDepartment(eventId, departmentId);
        } catch (error) {
          console.warn("Failed to load members, will load when needed:", error);
          membersData = [];
        }
      }
      
      if (!budgetData) {
        navigate(`/events/${eventId}/departments/${departmentId}/budget/empty`);
        return;
      }
      
      if (user) {
        const role = await fetchEventRole(eventId);
        setUserRole(role);
        
        // Xác định sidebarType dựa trên role
        if (role === 'HoD') {
          setSidebarType('hod');
        } else if (role === 'Member') {
          setSidebarType('member');
        } else if (role === 'HoOC') {
          setSidebarType('hooc');
        } else {
          setSidebarType('user');
        }
        
        if (role === 'Member') {
          const userId = user._id || user.id;
          const membersArray = Array.isArray(membersData) ? membersData : [];
          const isMemberOfThisDept = membersArray.some(member => {
            const memberUserId = member.userId?._id || member.userId?.id || member.userId;
            return String(memberUserId) === String(userId);
          });
          
          if (!isMemberOfThisDept) {
            toast.error("Bạn chỉ được xem budget của ban mình");
            navigate(`/events/${eventId}/budgets/member`);
            return;
          }
          
          if (budgetData.status !== 'approved') {
            toast.error("Budget này chưa được duyệt, bạn chỉ được xem các budget đã được duyệt");
            navigate(`/events/${eventId}/budgets/member`);
            return;
          }
          
          // Set activeTable to "member" for members
          setActiveTable("member");
        }
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

  const parseDecimal = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'object' && value !== null && value.$numberDecimal !== undefined) {
      return parseFloat(value.$numberDecimal) || 0;
    }
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "Chưa có";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    (sum, item) => sum + parseDecimal(item.total),
    0
  ) || 0;

  const handleEdit = () => {
    // Navigate với budgetId cụ thể để đảm bảo edit đúng budget
    const currentBudgetId = budget?._id || budgetId;
    if (currentBudgetId) {
      navigate(`/events/${eventId}/departments/${departmentId}/budget/${currentBudgetId}/edit`);
    } else {
      navigate(`/events/${eventId}/departments/${departmentId}/budget/edit`);
    }
  };

  const handleDeleteDraft = async () => {
    try {
      await budgetApi.deleteDraft(eventId, departmentId, budget._id);
      toast.success("Đã xóa bản nháp thành công!");
      navigate(`/events/${eventId}/budgets/departments`, { replace: true });
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

  const handleRenameBudget = () => {
    if (!budget?._id) return;
    const currentName = budget.name || "Budget Ban";
    setRenameInput(currentName);
    setShowRenameModal(true);
  };

  const handleConfirmRename = async () => {
    if (!budget?._id) return;
    const trimmed = renameInput.trim();
    if (!trimmed) {
      toast.error("Tên đơn không được để trống.");
      return;
    }
    if (trimmed === budget.name) {
      setShowRenameModal(false);
      return;
    }
    try {
      setRenaming(true);
      await budgetApi.updateBudget(eventId, departmentId, budget._id, { name: trimmed });
      toast.success("Đã cập nhật tên đơn ngân sách.");
      setShowRenameModal(false);
      await fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Đổi tên thất bại!");
    } finally {
      setRenaming(false);
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
                          (error?.response?.status === 403 ? "Bạn không có quyền thực hiện thao tác này. Chỉ trưởng ban mới có quyền phân công." :
                           error?.response?.status === 401 ? "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn." :
                           "Phân công thất bại!");
      toast.error(errorMessage);
    } finally {
      setAssigningItem(null);
    }
  };

  const handleOpenEvidenceModal = (item) => {
    setEditingEvidenceItem(item);
    setEvidenceFormData({
      evidence: item.evidence || []
    });
    setShowEvidenceModal(true);
  };

  const handleCloseEvidenceModal = () => {
    setShowEvidenceModal(false);
    setEditingEvidenceItem(null);
    setEvidenceFormData({
      evidence: []
    });
  };

  const handleSaveEvidence = async () => {
    if (!editingEvidenceItem || !budget) return;
    
    try {
      setIsSubmitting(true);
      const itemIdToUse = editingEvidenceItem.itemId?.toString() || 
                         editingEvidenceItem.itemId?._id?.toString() || 
                         editingEvidenceItem.itemId ||
                         editingEvidenceItem._id?.toString() ||
                         editingEvidenceItem._id;
      
      await budgetApi.reportExpense(
        eventId,
        departmentId,
        budget._id,
        itemIdToUse,
        {
          evidence: evidenceFormData.evidence || []
        }
      );
      toast.success("Đã lưu bằng chứng thành công!");
      handleCloseEvidenceModal();
      await fetchData();
    } catch (error) {
      console.error("Error saving evidence:", error);
      toast.error(error?.response?.data?.message || "Lưu bằng chứng thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEvidenceLink = () => {
    setLinkInput("");
    // Mở modal "Thêm link bằng chứng" với z-index cao hơn modal "Thêm/Sửa Bằng Chứng"
    // Không đóng modal bằng chứng để người dùng có thể quay lại sau khi thêm link
    setShowLinkModal(true);
  };

  const handleConfirmAddLink = () => {
    if (linkInput && linkInput.trim()) {
      // Kiểm tra xem đang ở trong Expense Modal hay Evidence Modal
      if (showExpenseModal && editingExpenseItem) {
        setExpenseFormData(prev => ({
          ...prev,
          evidence: [...(prev.evidence || []), {
            type: 'link',
            url: linkInput.trim(),
            name: `Link ${(prev.evidence || []).length + 1}`
          }]
        }));
      } else {
        setEvidenceFormData(prev => ({
          ...prev,
          evidence: [...(prev.evidence || []), {
            type: 'link',
            url: linkInput.trim(),
            name: `Link ${(prev.evidence || []).length + 1}`
          }]
        }));
      }
      setShowLinkModal(false);
      setLinkInput("");
    }
  };

  const handleAddEvidenceFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileType = file.type.startsWith('image/') ? 'image' : 
                      file.type === 'application/pdf' ? 'pdf' : 'doc';
      setEvidenceFormData(prev => ({
        ...prev,
        evidence: [...(prev.evidence || []), {
          type: fileType,
          url: event.target.result,
          name: file.name
        }]
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveEvidence = (idx) => {
    setEvidenceFormData(prev => ({
      ...prev,
      evidence: (prev.evidence || []).filter((_, i) => i !== idx)
    }));
  };

  const handleOpenExpenseModal = (item) => {
    setEditingExpenseItem(item);
    setExpenseFormData({
      actualAmount: item.actualAmount || "",
      memberNote: item.memberNote || "",
      evidence: item.evidence || []
    });
    setShowExpenseModal(true);
  };

  const handleCloseExpenseModal = () => {
    setShowExpenseModal(false);
    setEditingExpenseItem(null);
    setExpenseFormData({
      actualAmount: "",
      memberNote: "",
      evidence: []
    });
  };

  const handleSaveExpense = async () => {
    if (!editingExpenseItem || !budget) return;
    
    try {
      setIsSubmitting(true);
      const itemIdToUse = editingExpenseItem.itemId?.toString() || 
                         editingExpenseItem.itemId?._id?.toString() || 
                         editingExpenseItem.itemId ||
                         editingExpenseItem._id?.toString() ||
                         editingExpenseItem._id;
      
      await budgetApi.reportExpense(
        eventId,
        departmentId,
        budget._id,
        itemIdToUse,
        {
          actualAmount: parseFloat(expenseFormData.actualAmount) || 0,
          memberNote: expenseFormData.memberNote || "",
          evidence: expenseFormData.evidence || []
        }
      );
      toast.success("Đã lưu chi tiêu thành công!");
      handleCloseExpenseModal();
      await fetchData();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error(error?.response?.data?.message || "Lưu chi tiêu thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInlineExpense = async (item) => {
    if (!item || !budget) return;
    
    try {
      const itemIdToUse = item.itemId?.toString() || 
                         item.itemId?._id?.toString() || 
                         item.itemId ||
                         item._id?.toString() ||
                         item._id;
      
      await budgetApi.reportExpense(
        eventId,
        departmentId,
        budget._id,
        itemIdToUse,
        {
          actualAmount: parseFloat(inlineFormData.actualAmount) || 0,
          memberNote: inlineFormData.memberNote || "",
          evidence: item.evidence || []
        }
      );
      setEditingInlineItem(null);
      setInlineFormData({ actualAmount: "", memberNote: "" });
      await fetchData();
    } catch (error) {
      console.error("Error saving inline expense:", error);
      toast.error(error?.response?.data?.message || "Lưu thất bại!");
    }
  };

  const handleAutoSaveExpense = async (item) => {
    if (!item || !budget) return;
    
    // Đợi một chút để đảm bảo state đã được cập nhật
    setTimeout(async () => {
      try {
        const itemIdToUse = item.itemId?.toString() || 
                           item.itemId?._id?.toString() || 
                           item.itemId ||
                           item._id?.toString() ||
                           item._id;
        
        await budgetApi.reportExpense(
          eventId,
          departmentId,
          budget._id,
          itemIdToUse,
          {
            actualAmount: parseFloat(inlineFormData.actualAmount) || 0,
            memberNote: inlineFormData.memberNote || "",
            evidence: item.evidence || []
          }
        );
        // Tự động thoát khỏi chế độ edit sau khi lưu thành công
        setEditingInlineItem(null);
        // Không hiển thị toast để không làm phiền user
        await fetchData();
      } catch (error) {
        console.error("Error auto-saving expense:", error);
        // Chỉ log error, không hiển thị toast
      }
    }, 100);
  };

  const handleSubmitExpense = async (item) => {
    if (!item || !budget) return;
    
    try {
      setIsSubmitting(true);
      const itemIdToUse = item.itemId?.toString() || 
                         item.itemId?._id?.toString() || 
                         item.itemId ||
                         item._id?.toString() ||
                         item._id;
      
      await budgetApi.submitExpense(eventId, departmentId, budget._id, itemIdToUse);
      toast.success("Đã nộp thành công!");
      await fetchData();
    } catch (error) {
      console.error("Error submitting expense:", error);
      toast.error(error?.response?.data?.message || "Nộp thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoSubmitExpense = async (item) => {
    if (!item || !budget) return;
    
    try {
      setIsSubmitting(true);
      const itemIdToUse = item.itemId?.toString() || 
                         item.itemId?._id?.toString() || 
                         item.itemId ||
                         item._id?.toString() ||
                         item._id;
      
      await budgetApi.undoSubmitExpense(eventId, departmentId, budget._id, itemIdToUse);
      toast.success("Đã hoàn tác thành công!");
      await fetchData();
    } catch (error) {
      console.error("Error undoing submit:", error);
      toast.error(error?.response?.data?.message || "Hoàn tác thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartInlineEdit = (item) => {
    setEditingInlineItem(item.itemId || item._id);
    setInlineFormData({
      actualAmount: item.actualAmount || "",
      memberNote: item.memberNote || ""
    });
  };

  const handleCancelInlineEdit = () => {
    setEditingInlineItem(null);
    setInlineFormData({ actualAmount: "", memberNote: "" });
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
    const estimated = parseDecimal(estimatedTotal);
    const actual = parseDecimal(actualAmount);
    
    if (actual === 0) {
      return <span className="text-muted">—</span>;
    }
    
    if (actual < estimated) {
      // Thực tế < dự trù: màu xanh lá + mũi tên xuống
      return (
        <span style={{ color: "#10B981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
          <ArrowDown size={16} />
          {formatCurrency(estimated - actual)}
        </span>
      );
    } else if (actual > estimated) {
      // Thực tế > dự trù: màu đỏ + mũi tên lên
      return (
        <span style={{ color: "#DC2626", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
          <ArrowUp size={16} />
          {formatCurrency(actual - estimated)}
        </span>
      );
    } else {
      // Bằng nhau: màu xanh lá
      return (
        <span style={{ color: "#10B981", fontWeight: "600" }}>
          Bằng nhau
        </span>
      );
    }
  };

  if (loading) {
    return (
      <UserLayout
        title="Xem Ngân sách của Ban"
        activePage="finance-budget"
        sidebarType={sidebarType}
        eventId={eventId}
      >
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải thông tin ngân sách...</div>
        </div>
      </UserLayout>
    );
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
  const budgetName = budget.name || "Budget Ban";
  const creatorName =
    budget.createdBy?.fullName ||
    budget.createdBy?.name ||
    department?.leaderId?.fullName ||
    department?.leader?.fullName ||
    "—";

  return (
    <UserLayout
      title="Xem Ngân sách của Ban"
      activePage="finance-budget"
      sidebarType={sidebarType}
      eventId={eventId}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Title Section */}
        <div className="mb-4 d-flex justify-content-between align-items-start">
          <div>
            <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  // Navigate back based on user role
                  if (userRole === 'Member') {
                    navigate(`/events/${eventId}/budgets/member`, { replace: true });
                  } else if (userRole === 'HoOC') {
                    navigate(`/events/${eventId}/budgets`, { replace: true });
                  } else if (userRole === 'HoD' || isHoD) {
                    navigate(`/events/${eventId}/budgets/departments`, { replace: true });
                  } else {
                    navigate(`/events/${eventId}/budgets/member`, { replace: true });
                  }
                }}
                style={{ borderRadius: "8px" }}
                title="Quay lại danh sách budgets"
              >
                <i className="bi bi-arrow-left me-2"></i>
                Quay lại
              </button>
              <h2 className="fw-bold mb-0" style={{ fontSize: "28px", color: "#111827" }}>
                {budgetName}
              </h2>
              {isHoD && (
                <button
                  className="btn btn-link p-0"
                  onClick={handleRenameBudget}
                  disabled={renaming}
                  style={{ fontSize: "14px" }}
                >
                  <i className="bi bi-pencil-square me-1"></i>
                  {renaming ? "Đang đổi tên..." : "Đổi tên đơn"}
                </button>
              )}
            </div>
            <div className="d-flex align-items-center gap-2 text-muted">
              <FileText size={18} />
              <span>Tên đơn: {budgetName}</span>
            </div>
            <div className="d-flex align-items-center gap-2 text-muted">
              <Users size={18} />
              <span>Ban: {department?.name || "Đang tải..."}</span>
            </div>
          </div>
          {!budgetId && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/events/${eventId}/departments/${departmentId}/budget/create`)}
              style={{ borderRadius: "8px" }}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Tạo Budget mới
            </button>
          )}
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

          <div className="d-flex flex-wrap align-items-start" style={{ gap: "24px" }}>
            <div style={{ flex: "1", minWidth: "160px", maxWidth: "200px" }}>
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div
                  className="fw-bold mb-2"
                  style={{ fontSize: "20px", color: "#3B82F6", lineHeight: "1.2" }}
                >
                  {formatCurrency(totalCost)}
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "13px", lineHeight: "1.4" }}>
                  Tổng Chi Phí Dự Kiến (VNĐ)
                </p>
              </div>
            </div>

            <div style={{ flex: "1", minWidth: "160px", maxWidth: "200px" }}>
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="fw-bold mb-2" style={{ fontSize: "20px", color: "#111827", lineHeight: "1.2" }}>
                  {budget.items?.length || 0}
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "13px", lineHeight: "1.4" }}>
                  Tổng Số Mục
                </p>
              </div>
            </div>

            <div style={{ flex: "1", minWidth: "160px", maxWidth: "200px" }}>
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="fw-bold mb-2" style={{ fontSize: "20px", color: "#111827", lineHeight: "1.2" }}>
                  {formatDateTime(budget.createdAt)}
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "13px", lineHeight: "1.4" }}>
                  Tạo lúc
                </p>
              </div>
            </div>

            <div style={{ flex: "1", minWidth: "160px", maxWidth: "200px" }}>
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="fw-bold mb-2" style={{ fontSize: "20px", color: "#111827", lineHeight: "1.2" }}>
                  {formatDateTime(budget.updatedAt)}
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "13px", lineHeight: "1.4" }}>
                  Cập nhật gần nhất
                </p>
              </div>
            </div>

            <div style={{ flex: "1", minWidth: "160px", maxWidth: "200px" }}>
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="fw-bold mb-2" style={{ fontSize: "20px", color: "#111827", lineHeight: "1.2" }}>
                  {creatorName}
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "13px", lineHeight: "1.4" }}>
                  Người Tạo (Trưởng ban)
                </p>
              </div>
            </div>

            <div style={{ flex: "1", minWidth: "160px", maxWidth: "200px" }}>
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="mb-2" style={{ lineHeight: "1.2", minHeight: "28px", display: "flex", alignItems: "center" }}>
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
                </div>
                <p className="text-muted mb-0" style={{ fontSize: "13px", lineHeight: "1.4" }}>
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

          {/* Tab Selection */}
          <div 
            className="d-flex gap-4 mb-4"
            style={{
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: "0"
            }}
          >
            {/* Only show "Bảng gửi TBTC" tab for HoD and HoOC, not for Member */}
            {(isHoD || userRole === 'HoD' || userRole === 'HoOC') && (
              <div
                onClick={() => setActiveTable("hooc")}
                style={{
                  padding: "12px 0",
                  cursor: "pointer",
                  userSelect: "none",
                  color: activeTable === "hooc" ? "#111827" : "#6B7280",
                  fontWeight: activeTable === "hooc" ? "600" : "400",
                  fontSize: "16px",
                  borderBottom: activeTable === "hooc" ? "2px solid #3B82F6" : "2px solid transparent",
                  marginBottom: "-1px",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                onMouseEnter={(e) => {
                  if (activeTable !== "hooc") {
                    e.currentTarget.style.color = "#374151";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTable !== "hooc") {
                    e.currentTarget.style.color = "#6B7280";
                  }
                }}
              >
                <Send size={18} />
                Bảng gửi TBTC
              </div>
            )}
            {(isApproved || isSentToMembers) && (
              <div
                onClick={() => setActiveTable("member")}
                style={{
                  padding: "12px 0",
                  cursor: "pointer",
                  userSelect: "none",
                  color: activeTable === "member" ? "#111827" : "#6B7280",
                  fontWeight: activeTable === "member" ? "600" : "400",
                  fontSize: "16px",
                  borderBottom: activeTable === "member" ? "2px solid #3B82F6" : "2px solid transparent",
                  marginBottom: "-1px",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                onMouseEnter={(e) => {
                  if (activeTable !== "member") {
                    e.currentTarget.style.color = "#374151";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTable !== "member") {
                    e.currentTarget.style.color = "#6B7280";
                  }
                }}
              >
                <Users size={18} />
                Bảng kiểm soát Member
              </div>
            )}
          </div>

          {/* Bảng 1: Gửi cho HoOC - Only show for HoD and HoOC, not for Member */}
          {activeTable === "hooc" && (isHoD || userRole === 'HoD' || userRole === 'HoOC') && (
            <div className="table-responsive" style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", wordWrap: "break-word", tableLayout: "fixed" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151", 
                      width: `${widths.hoocCategory || 120}px`,
                      minWidth: `${minWidths.hoocCategory || 110}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                          backgroundColor: resizing.column === "hoocCategory" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "hoocCategory")}
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
                      width: `${widths.hoocName || 200}px`,
                      minWidth: `${minWidths.hoocName || 180}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                          backgroundColor: resizing.column === "hoocName" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "hoocName")}
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
                      width: `${widths.hoocUnitCost || 130}px`,
                      minWidth: `${minWidths.hoocUnitCost || 140}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                          backgroundColor: resizing.column === "hoocUnitCost" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "hoocUnitCost")}
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
                      width: `${widths.hoocQty || 100}px`,
                      minWidth: `${minWidths.hoocQty || 100}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                          backgroundColor: resizing.column === "hoocQty" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "hoocQty")}
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
                      width: `${widths.hoocUnit || 100}px`,
                      minWidth: `${minWidths.hoocUnit || 110}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                          backgroundColor: resizing.column === "hoocUnit" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "hoocUnit")}
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
                      width: `${widths.hoocTotal || 130}px`,
                      minWidth: `${minWidths.hoocTotal || 140}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                          backgroundColor: resizing.column === "hoocTotal" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "hoocTotal")}
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
                      width: `${widths.hoocNote || 200}px`,
                      minWidth: `${minWidths.hoocNote || 180}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                          backgroundColor: resizing.column === "hoocNote" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "hoocNote")}
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
                      width: `${widths.hoocEvidence || 150}px`,
                      minWidth: `${minWidths.hoocEvidence || 130}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                          backgroundColor: resizing.column === "hoocEvidence" ? "#3B82F6" : "transparent",
                          zIndex: 10
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "hoocEvidence")}
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
                      width: `${widths.hoocFeedback || 250}px`,
                      minWidth: `${minWidths.hoocFeedback || 220}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
                    }}>
                      Phản hồi từ TBTC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-4">
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
                            width: `${widths.hoocName || 200}px`,
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
                            {formatCurrency(item.unitCost)}
                          </td>
                          <td style={{ padding: "12px", color: shouldHighlight ? "#DC2626" : "#111827", backgroundColor: cellBgColor }}>
                            {parseDecimal(item.qty)}
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
                              {formatCurrency(item.total)}
                            </span>
                          </td>
                          <td style={{ 
                            padding: "12px", 
                            backgroundColor: cellBgColor, 
                            width: `${widths.hoocNote || 200}px`,
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
                            width: `${widths.hoocEvidence || 150}px`,
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
                            backgroundColor: cellBgColor, 
                            width: `${widths.hoocFeedback || 250}px`,
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
                      minWidth: `${minWidths.category || 110}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                      minWidth: `${minWidths.name || 180}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                      minWidth: `${minWidths.unitCost || 140}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                      minWidth: `${minWidths.qty || 100}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                      minWidth: `${minWidths.unit || 110}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                      minWidth: `${minWidths.note || 180}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                        minWidth: `${minWidths.assign || 130}px`,
                        position: "relative",
                        userSelect: "none",
                        whiteSpace: "nowrap"
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
                      minWidth: `${minWidths.evidence || 130}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                      minWidth: `${minWidths.memberNote || 180}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                      minWidth: `${minWidths.total || 140}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
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
                      minWidth: `${minWidths.actualAmount || 150}px`,
                      position: "relative",
                      userSelect: "none",
                      whiteSpace: "nowrap"
                    }}>
                      Tổng tiền thực tế
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151",
                      minWidth: "140px",
                      width: "140px",
                      whiteSpace: "nowrap"
                    }}>
                      Hành động
                    </th>
                    <th style={{ 
                      padding: "12px", 
                      fontWeight: "600", 
                      color: "#374151",
                      minWidth: "140px",
                      width: "140px",
                      whiteSpace: "nowrap"
                    }}>
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={isApproved && isHoD ? 13 : 12} className="text-center text-muted py-4">
                        Không tìm thấy mục nào
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, index) => {
                      const estimatedTotal = parseDecimal(item.total);
                      const actualAmount = parseDecimal(item.actualAmount);
                      const isPaid = item.isPaid || false;
                      const rowBgColor = isPaid ? "#D1FAE5" : "transparent";
                      const itemIdToUse =
                        item.itemId?.toString() ||
                        item.itemId?._id?.toString() ||
                        item.itemId ||
                        item._id?.toString() ||
                        item._id;
                      const assignedMemberId =
                        item.assignedTo?.toString() ||
                        item.assignedToInfo?._id?.toString() ||
                        item.assignedToInfo?.id?.toString() ||
                        "";
                      const isSelfBudgetAssignee =
                        currentMemberId &&
                        assignedMemberId &&
                        String(assignedMemberId) === String(currentMemberId);
                      const isAssigningThisItem =
                        assigningItem === itemIdToUse;
                      
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
                            {formatCurrency(item.unitCost)}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {parseDecimal(item.qty)}
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
                                  handleAssignItem(itemIdToUse, e.target.value || null);
                                }}
                                disabled={isAssigningThisItem || (item.submittedStatus === 'submitted')}
                                style={{ width: "100%", minWidth: 0 }}
                                title={(item.submittedStatus === 'submitted') ? "Không thể thay đổi phân công vì đã được nộp" : ""}
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
                            <div className="d-flex flex-column gap-1">
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
                              {(() => {
                                // Kiểm tra xem có thể chỉnh sửa bằng chứng không
                                // Logic mới:
                                // 1. Nếu HoD tự giao công việc cho mình (assignedTo = currentMemberId của HoD hoặc userId) thì được chỉnh sửa như member
                                // 2. Nếu công việc không giao cho mình thì không được chỉnh sửa
                                // 3. Nếu người được giao đã nộp expense (actualAmount > 0) thì HoD không được chỉnh sửa
                                
                                // Lấy userId của HoD để so sánh
                                const hodUserId = user?._id || user?.id;
                                
                                // Kiểm tra xem item có được giao cho HoD không
                                // Có thể giao bằng memberId (nếu HoD có trong members) hoặc userId
                                let isAssignedToHoD = false;
                                
                                if (assignedMemberId && isHoD) {
                                  // Trường hợp 1: Giao cho memberId của HoD (nếu HoD có trong members)
                                  if (currentMemberId && String(assignedMemberId) === String(currentMemberId)) {
                                    isAssignedToHoD = true;
                                  }
                                  // Trường hợp 2: Kiểm tra qua assignedToInfo (thông tin người được giao)
                                  // Nếu HoD không có trong members, kiểm tra qua assignedToInfo
                                  if (!isAssignedToHoD && item.assignedToInfo) {
                                    const assignedUserId = item.assignedToInfo?.userId?._id || 
                                                          item.assignedToInfo?.userId || 
                                                          item.assignedToInfo?.userId?.id;
                                    const assignedMemberIdFromInfo = item.assignedToInfo?._id || 
                                                                     item.assignedToInfo?.id;
                                    
                                    // So sánh với userId của HoD (nếu assignedToInfo có userId)
                                    if (hodUserId && assignedUserId && String(assignedUserId) === String(hodUserId)) {
                                      isAssignedToHoD = true;
                                    }
                                    // So sánh với memberId của HoD (nếu assignedToInfo có memberId)
                                    else if (currentMemberId && assignedMemberIdFromInfo && String(assignedMemberIdFromInfo) === String(currentMemberId)) {
                                      isAssignedToHoD = true;
                                    }
                                    // So sánh assignedMemberId với memberId từ info (nếu cả hai đều là memberId)
                                    else if (currentMemberId && String(assignedMemberId) === String(assignedMemberIdFromInfo) && String(assignedMemberId) === String(currentMemberId)) {
                                      isAssignedToHoD = true;
                                    }
                                  }
                                }
                                
                                const isHoDAssignedToSelf = isHoD && isAssignedToHoD;
                                
                                const isMemberAssigned = !isHoD && 
                                  assignedMemberId && 
                                  currentMemberId && 
                                  String(assignedMemberId) === String(currentMemberId);
                                
                                // Kiểm tra xem người được giao đã nộp expense chưa
                                const hasExpenseSubmitted = actualAmount > 0;
                                
                                // HoD chỉ được chỉnh sửa nếu:
                                // - Tự giao cho mình VÀ chưa có expense được nộp
                                // Member được chỉnh sửa nếu được assign cho mình
                                const canEditEvidence = (isHoDAssignedToSelf && !hasExpenseSubmitted) || isMemberAssigned;
                                
                                // Debug log để kiểm tra
                                if (isHoD && assignedMemberId) {
                                  console.log('Debug edit evidence:', {
                                    isHoD,
                                    assignedMemberId: String(assignedMemberId),
                                    currentMemberId: currentMemberId ? String(currentMemberId) : 'null',
                                    isHoDAssignedToSelf,
                                    hasExpenseSubmitted,
                                    canEditEvidence,
                                    actualAmount,
                                    isApproved,
                                    isSentToMembers
                                  });
                                }
                                
                                if ((isApproved || isSentToMembers) && canEditEvidence) {
                                  return (
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => handleOpenEvidenceModal(item)}
                                      style={{
                                        fontSize: "11px",
                                        padding: "2px 8px",
                                        marginTop: "4px"
                                      }}
                                      title="Thêm/sửa bằng chứng"
                                    >
                                      <i className="bi bi-plus-circle me-1"></i>
                                      {item.evidence && item.evidence.length > 0 ? "Sửa" : "Thêm"}
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
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
                            {(() => {
                              // Kiểm tra xem có thể chỉnh sửa memberNote không
                              const isMemberAssigned = !isHoD && 
                                assignedMemberId && 
                                currentMemberId && 
                                String(assignedMemberId) === String(currentMemberId);
                              
                              const isHoDAssignedToSelf = isHoD && 
                                assignedMemberId && 
                                currentMemberId && 
                                String(assignedMemberId) === String(currentMemberId);
                              
                              const canEdit = (isApproved || isSentToMembers) && (isMemberAssigned || isHoDAssignedToSelf);
                              const isEditing = editingInlineItem === (item.itemId || item._id);
                              
                              if (canEdit) {
                                if (isEditing) {
                                  return (
                                    <textarea
                                      className="form-control form-control-sm"
                                      rows="2"
                                      value={inlineFormData.memberNote}
                                      onChange={(e) => setInlineFormData({ ...inlineFormData, memberNote: e.target.value })}
                                      onBlur={() => handleAutoSaveExpense(item)}
                                      placeholder="Nhập ghi chú..."
                                      style={{ fontSize: "13px" }}
                                    />
                                  );
                                } else {
                                  return (
                                    <div
                                      onClick={() => handleStartInlineEdit(item)}
                                      style={{
                                        cursor: "pointer",
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        border: "1px dashed #d1d5db",
                                        minHeight: "32px",
                                        display: "flex",
                                        alignItems: "center",
                                        color: item.memberNote ? "#111827" : "#9ca3af",
                                        fontSize: "13px"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f9fafb";
                                        e.currentTarget.style.borderColor = "#3b82f6";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.borderColor = "#d1d5db";
                                      }}
                                    >
                                      {item.memberNote || "Nhấp để nhập ghi chú..."}
                                    </div>
                                  );
                                }
                              } else {
                                return (
                                  <span style={{ color: "#111827", fontSize: "13px" }}>
                                    {item.memberNote || "—"}
                                  </span>
                                );
                              }
                            })()}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span className="fw-semibold" style={{ color: "#111827" }}>
                              {formatCurrency(estimatedTotal)}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            {(() => {
                              // Kiểm tra xem có thể chỉnh sửa actualAmount không
                              const isMemberAssigned = !isHoD && 
                                assignedMemberId && 
                                currentMemberId && 
                                String(assignedMemberId) === String(currentMemberId);
                              
                              const isHoDAssignedToSelf = isHoD && 
                                assignedMemberId && 
                                currentMemberId && 
                                String(assignedMemberId) === String(currentMemberId);
                              
                              const canEdit = (isApproved || isSentToMembers) && (isMemberAssigned || isHoDAssignedToSelf);
                              const isEditing = editingInlineItem === (item.itemId || item._id);
                              
                              if (canEdit) {
                                if (isEditing) {
                                  return (
                                    <div>
                                      <div className="input-group input-group-sm">
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={inlineFormData.actualAmount}
                                          onChange={(e) => setInlineFormData({ ...inlineFormData, actualAmount: e.target.value })}
                                          onBlur={() => handleAutoSaveExpense(item)}
                                          placeholder="Nhập số tiền..."
                                          style={{ fontSize: "13px" }}
                                        />
                                        <span className="input-group-text">VNĐ</span>
                                      </div>
                                      {inlineFormData.actualAmount && (
                                        <div className="mt-1">
                                          <span className={`badge ${
                                            parseFloat(inlineFormData.actualAmount) < estimatedTotal
                                              ? 'bg-success'
                                              : parseFloat(inlineFormData.actualAmount) > estimatedTotal
                                              ? 'bg-danger'
                                              : 'bg-info'
                                          }`} style={{ fontSize: "10px" }}>
                                            {parseFloat(inlineFormData.actualAmount) < estimatedTotal ? (
                                              <>Tiết kiệm {formatCurrency(estimatedTotal - parseFloat(inlineFormData.actualAmount))}</>
                                            ) : parseFloat(inlineFormData.actualAmount) > estimatedTotal ? (
                                              <>Vượt {formatCurrency(parseFloat(inlineFormData.actualAmount) - estimatedTotal)}</>
                                            ) : (
                                              <>Đúng dự kiến</>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div
                                      onClick={() => handleStartInlineEdit(item)}
                                      style={{
                                        cursor: "pointer",
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        border: "1px dashed #d1d5db",
                                        minHeight: "32px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f9fafb";
                                        e.currentTarget.style.borderColor = "#3b82f6";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                        e.currentTarget.style.borderColor = "#d1d5db";
                                      }}
                                    >
                                      {actualAmount > 0 ? (
                                        <span
                                          className="fw-semibold"
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            color: actualAmount < estimatedTotal 
                                              ? "#10B981"
                                              : actualAmount > estimatedTotal 
                                              ? "#DC2626"
                                              : "#10B981",
                                          }}
                                        >
                                          {actualAmount < estimatedTotal && <ArrowDown size={14} />}
                                          {actualAmount > estimatedTotal && <ArrowUp size={14} />}
                                          {formatCurrency(actualAmount)}
                                        </span>
                                      ) : (
                                        <span className="text-muted" style={{ fontSize: "13px" }}>
                                          Nhấp để nhập số tiền...
                                        </span>
                                      )}
                                    </div>
                                  );
                                }
                              } else {
                                // Không được chỉnh sửa, chỉ hiển thị
                                if (actualAmount > 0) {
                                  return (
                                    <span
                                      className="fw-semibold"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        color: actualAmount < estimatedTotal 
                                          ? "#10B981"
                                          : actualAmount > estimatedTotal 
                                          ? "#DC2626"
                                          : "#10B981",
                                      }}
                                    >
                                      {actualAmount < estimatedTotal && <ArrowDown size={16} />}
                                      {actualAmount > estimatedTotal && <ArrowUp size={16} />}
                                      {formatCurrency(actualAmount)}
                                    </span>
                                  );
                                } else {
                                  return <span className="text-muted">—</span>;
                                }
                              }
                            })()}
                          </td>
                          {/* Cột Hành động */}
                          <td style={{ 
                            padding: "12px",
                            minWidth: "140px",
                            width: "140px",
                            whiteSpace: "nowrap"
                          }}>
                            {(() => {
                              const isMemberAssigned = !isHoD && 
                                assignedMemberId && 
                                currentMemberId && 
                                String(assignedMemberId) === String(currentMemberId);
                              
                              const isHoDAssignedToSelf = isHoD && 
                                assignedMemberId && 
                                currentMemberId && 
                                String(assignedMemberId) === String(currentMemberId);
                              
                              const canEdit = (isApproved || isSentToMembers) && (isMemberAssigned || isHoDAssignedToSelf);
                              const submittedStatus = item.submittedStatus || 'draft';
                              const isSubmitted = submittedStatus === 'submitted';
                              
                              if (canEdit) {
                                if (isSubmitted) {
                                  return (
                                    <button
                                      className="btn btn-sm btn-warning"
                                      onClick={() => handleUndoSubmitExpense(item)}
                                      disabled={isSubmitting}
                                      style={{ fontSize: "12px", padding: "4px 10px", whiteSpace: "nowrap" }}
                                    >
                                      <i className="bi bi-arrow-counterclockwise me-1"></i>
                                      Hoàn tác
                                    </button>
                                  );
                                } else {
                                  return (
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() => handleSubmitExpense(item)}
                                      disabled={isSubmitting}
                                      style={{ fontSize: "12px", padding: "4px 10px", whiteSpace: "nowrap" }}
                                    >
                                      <i className="bi bi-send me-1"></i>
                                      Nộp
                                    </button>
                                  );
                                }
                              }
                              return <span className="text-muted">—</span>;
                            })()}
                          </td>
                          {/* Cột Trạng thái */}
                          <td style={{ 
                            padding: "12px",
                            minWidth: "140px",
                            width: "140px",
                            whiteSpace: "nowrap"
                          }}>
                            {(() => {
                              const submittedStatus = item.submittedStatus || 'draft';
                              const isSubmitted = submittedStatus === 'submitted';
                              
                              if (isSubmitted) {
                                return (
                                  <span className="badge" style={{ 
                                    background: "rgba(16, 185, 129, 0.1)", 
                                    color: "#10B981",
                                    fontSize: "12px",
                                    padding: "4px 8px",
                                    whiteSpace: "nowrap",
                                    display: "inline-block"
                                  }}>
                                    <i className="bi bi-check-circle-fill me-1"></i>
                                    Đã nộp
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="badge" style={{ 
                                    background: "rgba(107, 114, 128, 0.1)", 
                                    color: "#6B7280",
                                    fontSize: "12px",
                                    padding: "4px 8px",
                                    whiteSpace: "nowrap",
                                    display: "inline-block"
                                  }}>
                                    <i className="bi bi-clock me-1"></i>
                                    Chưa nộp
                                  </span>
                                );
                              }
                            })()}
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
                <Info size={20} style={{ color: "#D97706" }} />
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
                <CheckCircle size={20} style={{ color: "#10B981" }} />
                <p className="mb-0" style={{ color: "#065F46", fontSize: "14px" }}>
                  Budget đã được gửi xuống các thành viên. Bạn có thể xem báo cáo chi tiêu của họ trong bảng trên.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Only show for HoD */}
        {(isHoD || userRole === 'HoD') && (
          <div className="d-flex justify-content-end gap-2 mt-4">
            {isDraft && !isSubmitted && (
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
              <button
                className="btn btn-outline-primary"
                onClick={() => setShowRecallModal(true)}
                style={{ borderRadius: "8px" }}
              >
                <i className="bi bi-arrow-counterclockwise me-2"></i>
                Thu hồi bản gửi
              </button>
            )}

            {isRejected && !isSubmitted && (
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
          </div>
        )}
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

      {/* Evidence Modal */}
      {showEvidenceModal && editingEvidenceItem && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 }}
          onClick={handleCloseEvidenceModal}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Thêm/Sửa Bằng Chứng</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseEvidenceModal}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-file-earmark-text me-2"></i>
                    Mục: {editingEvidenceItem.name}
                  </label>
                </div>

                {/* Evidence */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-paperclip me-2"></i>
                    Bằng chứng
                  </label>
                  {evidenceFormData.evidence && evidenceFormData.evidence.length > 0 && (
                    <div className="mb-3">
                      {evidenceFormData.evidence.map((ev, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center p-2 mb-2" style={{ background: "#f9fafb", borderRadius: "8px" }}>
                          <div className="d-flex align-items-center gap-2">
                            {ev.type === 'image' && <i className="bi bi-image text-primary"></i>}
                            {ev.type === 'pdf' && <i className="bi bi-file-pdf text-danger"></i>}
                            {ev.type === 'doc' && <i className="bi bi-file-word text-info"></i>}
                            {ev.type === 'link' && <i className="bi bi-link-45deg text-success"></i>}
                            <span>{ev.name}</span>
                          </div>
                          <div className="d-flex gap-2">
                            {ev.type === 'image' && (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  setSelectedImage(ev.url);
                                  setShowImageModal(true);
                                }}
                              >
                                <Eye size={18} />
                              </button>
                            )}
                            {(ev.type === 'pdf' || ev.type === 'doc' || ev.type === 'link') && (
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                <ExternalLink size={18} />
                              </a>
                            )}
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveEvidence(idx)}
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-primary"
                      onClick={handleAddEvidenceLink}
                    >
                      <i className="bi bi-link-45deg me-2"></i>
                      Thêm link
                    </button>
                    <label className="btn btn-outline-primary">
                      <i className="bi bi-upload me-2"></i>
                      Tải file lên
                      <input
                        type="file"
                        className="d-none"
                        accept="image/*,application/pdf,.doc,.docx"
                        onChange={handleAddEvidenceFile}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseEvidenceModal}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveEvidence}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal - Cho phép member chỉnh sửa actualAmount, memberNote và evidence */}
      {showExpenseModal && editingExpenseItem && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 }}
          onClick={handleCloseExpenseModal}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ borderRadius: "12px" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid #e5e7eb" }}>
                <h5 className="modal-title fw-bold">Chỉnh sửa chi tiêu</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseExpenseModal}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                <p className="text-muted mb-4">{editingExpenseItem.name}</p>

                {/* Actual Amount */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-cash-coin me-2"></i>
                    Số tiền thực tế <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control form-control-lg"
                      value={expenseFormData.actualAmount}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, actualAmount: e.target.value })}
                      placeholder="Nhập số tiền thực tế..."
                    />
                    <span className="input-group-text">VNĐ</span>
                  </div>
                  {expenseFormData.actualAmount && (
                    <div className="mt-2">
                      <span className={`badge ${
                        parseFloat(expenseFormData.actualAmount) < parseDecimal(editingExpenseItem.total)
                          ? 'bg-success'
                          : parseFloat(expenseFormData.actualAmount) > parseDecimal(editingExpenseItem.total)
                          ? 'bg-danger'
                          : 'bg-info'
                      }`}>
                        {parseFloat(expenseFormData.actualAmount) < parseDecimal(editingExpenseItem.total) ? (
                          <>
                            <i className="bi bi-arrow-down me-1"></i>
                            Tiết kiệm {formatCurrency(parseDecimal(editingExpenseItem.total) - parseFloat(expenseFormData.actualAmount))} VNĐ
                          </>
                        ) : parseFloat(expenseFormData.actualAmount) > parseDecimal(editingExpenseItem.total) ? (
                          <>
                            <i className="bi bi-arrow-up me-1"></i>
                            Vượt {formatCurrency(parseFloat(expenseFormData.actualAmount) - parseDecimal(editingExpenseItem.total))} VNĐ
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-1"></i>
                            Đúng dự kiến
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Member Note */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-chat-left-text me-2"></i>
                    Ghi chú
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={expenseFormData.memberNote}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, memberNote: e.target.value })}
                    placeholder="Nhập ghi chú nếu cần..."
                  />
                </div>

                {/* Evidence */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-paperclip me-2"></i>
                    Bằng chứng
                  </label>
                  {expenseFormData.evidence && expenseFormData.evidence.length > 0 && (
                    <div className="mb-3">
                      {expenseFormData.evidence.map((ev, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center p-2 mb-2" style={{ background: "#f9fafb", borderRadius: "8px" }}>
                          <div className="d-flex align-items-center gap-2">
                            {ev.type === 'image' && <i className="bi bi-image text-primary"></i>}
                            {ev.type === 'pdf' && <i className="bi bi-file-pdf text-danger"></i>}
                            {ev.type === 'doc' && <i className="bi bi-file-word text-info"></i>}
                            {ev.type === 'link' && <i className="bi bi-link-45deg text-success"></i>}
                            <span>{ev.name}</span>
                          </div>
                          <div className="d-flex gap-2">
                            {ev.type === 'image' && (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => {
                                  setSelectedImage(ev.url);
                                  setShowImageModal(true);
                                }}
                              >
                                <Eye size={18} />
                              </button>
                            )}
                            {ev.type === 'link' && (
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                <ExternalLink size={18} />
                              </a>
                            )}
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                setExpenseFormData(prev => ({
                                  ...prev,
                                  evidence: (prev.evidence || []).filter((_, i) => i !== idx)
                                }));
                              }}
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setLinkInput("");
                        setShowLinkModal(true);
                      }}
                    >
                      <i className="bi bi-link-45deg me-2"></i>
                      Thêm link
                    </button>
                    <label className="btn btn-outline-primary">
                      <i className="bi bi-upload me-2"></i>
                      Tải file lên
                      <input
                        type="file"
                        className="d-none"
                        accept="image/*,application/pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const fileType = file.type.startsWith('image/') ? 'image' : 
                                          file.type === 'application/pdf' ? 'pdf' : 'doc';
                            setExpenseFormData(prev => ({
                              ...prev,
                              evidence: [...(prev.evidence || []), {
                                type: fileType,
                                url: event.target.result,
                                name: file.name
                              }]
                            }));
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: "1px solid #e5e7eb" }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleCloseExpenseModal}
                  disabled={isSubmitting}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Hủy
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveExpense}
                  disabled={isSubmitting}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  {isSubmitting ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Budget Modal */}
      {showRenameModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setShowRenameModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <h5 className="modal-title" style={{ fontWeight: '600', color: '#111827' }}>
                  Đổi tên đơn ngân sách
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRenameModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tên đơn ngân sách mới"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmRename();
                    } else if (e.key === 'Escape') {
                      setShowRenameModal(false);
                    }
                  }}
                  autoFocus
                  style={{ borderRadius: '8px' }}
                />
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowRenameModal(false)}
                  style={{ borderRadius: '8px' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmRename}
                  disabled={!renameInput.trim() || renaming}
                  style={{ borderRadius: '8px' }}
                >
                  {renaming ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showLinkModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000 }}
          onClick={() => setShowLinkModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <h5 className="modal-title" style={{ fontWeight: '600', color: '#111827' }}>
                  Thêm link bằng chứng
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLinkModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập link bằng chứng"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmAddLink();
                    } else if (e.key === 'Escape') {
                      setShowLinkModal(false);
                    }
                  }}
                  autoFocus
                  style={{ borderRadius: '8px' }}
                />
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowLinkModal(false)}
                  style={{ borderRadius: '8px' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmAddLink}
                  disabled={!linkInput.trim()}
                  style={{ borderRadius: '8px' }}
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default ViewDepartmentBudget;