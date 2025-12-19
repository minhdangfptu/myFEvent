import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { departmentService } from "../../services/departmentService";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { ArrowDown, ArrowDownCircle, ArrowUp, ArrowUpCircle, CheckCircle, Clock, Coins, ExternalLink, Eye, FileText, Image, Inbox, Link, ListChecks, MessageSquare, Paperclip, Search, Send, Table, Trash, TrendingUp, Upload, Users, Wallet, XCircle } from "lucide-react";


const MemberExpensePage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editFormData, setEditFormData] = useState({
    actualAmount: "",
    memberNote: "",
    evidence: [],
  });
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [userMemberId, setUserMemberId] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  
  // Column widths state for resizable columns
  const [columnWidths, setColumnWidths] = useState(null);
  
  // Default column widths
  const defaultWidths = {
    name: 200,
    category: 120,
    unitCost: 130,
    qty: 100,
    unit: 100,
    total: 150,
    actualAmount: 150,
    evidence: 180,
    memberNote: 200,
    status: 120
  };
  
  const widths = columnWidths || defaultWidths;
  
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
      // Save to localStorage
      const finalWidths = { ...(columnWidths || defaultWidths), [column]: currentWidth };
      setColumnWidths(finalWidths);
      localStorage.setItem('member-expense-table-columns', JSON.stringify(finalWidths));
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Load column widths from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('member-expense-table-columns');
    if (saved) {
      try {
        setColumnWidths(JSON.parse(saved));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [eventId, user]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const userId = user?._id || user?.id || user?.userId?._id || user?.userId?.id;
      if (!userId) {
        toast.error("Vui lòng đăng nhập");
        setBudgets([]);
        return;
      }

      const departments = await departmentService.getDepartments(eventId);
      // Đảm bảo departments là array
      const departmentsList = Array.isArray(departments) 
        ? departments 
        : (departments?.items || departments?.data || []);
      
      let userDept = null;
      let currentUserMemberId = null;

      for (const dept of departmentsList) {
        try {
          const members = await departmentService.getMembersByDepartment(eventId, dept._id || dept.id);
          // Đảm bảo members là array
          const membersArray = Array.isArray(members) ? members : [];
          const userMember = membersArray.find(m => {
            const memberUserId = m.userId?._id || m.userId?.id || m.userId;
            return String(memberUserId) === String(userId);
          });
          if (userMember) {
            userDept = dept;
            currentUserMemberId = userMember._id || userMember.id;
            break;
          }
        } catch (err) {
          console.error("Error checking members:", err);
        }
      }

      if (!userDept) {
        toast.info("Bạn chưa thuộc ban nào");
        setBudgets([]);
        return;
      }

      setUserMemberId(currentUserMemberId);

      // Load tất cả budgets của department (không chỉ budget hiện tại)
      // Vì có thể có nhiều budgets đã được approved và gửi xuống member
      const deptId = userDept._id || userDept.id;
      let budgetsList = [];
      
      try {
        const budgetsResponse = await budgetApi.getAllBudgetsForDepartment(eventId, deptId, {
          page: 1,
          limit: 100
        });
        
        budgetsList = Array.isArray(budgetsResponse) 
          ? budgetsResponse 
          : (budgetsResponse?.data || budgetsResponse?.budgets || []);
      } catch (error) {
        console.warn("Failed to load all budgets, trying single budget:", error);
        // Fallback: thử load budget hiện tại
        try {
          const singleBudget = await budgetApi.getDepartmentBudget(eventId, deptId);
          if (singleBudget) {
            budgetsList = [singleBudget];
          }
        } catch (err) {
          console.error("Error loading budget:", err);
        }
      }
      
      // Lọc chỉ lấy budgets đã được approved hoặc sent_to_members
      const approvedBudgets = budgetsList.filter(budget => 
        budget.status === 'approved' || budget.status === 'sent_to_members'
      );
      
      if (approvedBudgets.length === 0) {
        setBudgets([]);
        return;
      }
      
      // Lọc items được assign cho member này từ tất cả budgets
      const budgetsWithAssignedItems = approvedBudgets.map(budget => {
        const filteredItems = (budget.items || []).filter(item => {
          const userMemberIdStr = String(currentUserMemberId);
          
          // Nếu budget status là 'sent_to_members', hiển thị tất cả items (kể cả chưa assign)
          if (budget.status === 'sent_to_members') {
            // Nếu item chưa được assign, vẫn hiển thị (member có thể xem tất cả)
            if (!item.assignedTo && !item.assignedToInfo) {
              return true;
            }
          } else if (budget.status === 'approved') {
            // Nếu budget chỉ approved nhưng chưa gửi xuống, chỉ hiển thị items đã được assign
            if (!item.assignedTo && !item.assignedToInfo) {
              return false;
            }
          }
          
          // Kiểm tra xem item có được assign cho member này không
          // Xử lý nhiều trường hợp khác nhau của assignedTo
          let assignedId = null;
          if (item.assignedTo) {
            if (typeof item.assignedTo === 'string') {
              assignedId = item.assignedTo;
            } else if (item.assignedTo._id) {
              assignedId = String(item.assignedTo._id);
            } else if (item.assignedTo.id) {
              assignedId = String(item.assignedTo.id);
            } else if (typeof item.assignedTo === 'object' && item.assignedTo !== null) {
              // Thử lấy bất kỳ giá trị nào có thể là ID
              assignedId = String(Object.values(item.assignedTo)[0] || '');
            } else {
              assignedId = String(item.assignedTo);
            }
          }
          
          // Xử lý assignedToInfo (có thể là member object)
          let assignedToInfoId = null;
          if (item.assignedToInfo) {
            if (typeof item.assignedToInfo === 'string') {
              assignedToInfoId = item.assignedToInfo;
            } else if (item.assignedToInfo._id) {
              assignedToInfoId = String(item.assignedToInfo._id);
            } else if (item.assignedToInfo.id) {
              assignedToInfoId = String(item.assignedToInfo.id);
            } else if (typeof item.assignedToInfo === 'object' && item.assignedToInfo !== null) {
              // Thử lấy _id hoặc id từ object
              assignedToInfoId = String(item.assignedToInfo._id || item.assignedToInfo.id || Object.values(item.assignedToInfo)[0] || '');
            }
          }
          
          // So sánh với nhiều cách khác nhau để đảm bảo match
          const normalizedUserMemberId = userMemberIdStr.trim();
          const normalizedAssignedId = assignedId ? assignedId.trim() : '';
          const normalizedAssignedToInfoId = assignedToInfoId ? assignedToInfoId.trim() : '';
          
          // Kiểm tra match với assignedId
          const matchAssignedId = normalizedAssignedId && 
            (normalizedAssignedId === normalizedUserMemberId);
          
          // Kiểm tra match với assignedToInfoId
          const matchAssignedToInfo = normalizedAssignedToInfoId && 
            (normalizedAssignedToInfoId === normalizedUserMemberId);
          
          // Kiểm tra trực tiếp với item.assignedTo (fallback)
          let matchDirectAssignedTo = false;
          if (item.assignedTo) {
            const directAssignedToStr = String(item.assignedTo).trim();
            matchDirectAssignedTo = directAssignedToStr === normalizedUserMemberId;
          }
          
          // Kiểm tra với assignedToInfo object (fallback)
          let matchAssignedToInfoObject = false;
          if (item.assignedToInfo && typeof item.assignedToInfo === 'object') {
            const infoId = item.assignedToInfo._id || item.assignedToInfo.id;
            if (infoId) {
              matchAssignedToInfoObject = String(infoId).trim() === normalizedUserMemberId;
            }
          }
          
          const match = matchAssignedId || matchAssignedToInfo || matchDirectAssignedTo || matchAssignedToInfoObject;
          
          // Debug log để kiểm tra (chỉ log items có assignedTo hoặc assignedToInfo)
          if (item.assignedTo || item.assignedToInfo) {
            console.log('MemberExpensePage - Checking item:', {
              itemName: item.name,
              budgetStatus: budget.status,
              assignedId: normalizedAssignedId || 'null',
              assignedToInfoId: normalizedAssignedToInfoId || 'null',
              userMemberIdStr: normalizedUserMemberId,
              assignedTo: item.assignedTo,
              assignedToInfo: item.assignedToInfo,
              match,
              matchAssignedId,
              matchAssignedToInfo,
              matchDirectAssignedTo,
              matchAssignedToInfoObject
            });
          }
          
          // Nếu budget status là 'sent_to_members' và item chưa được assign, vẫn hiển thị
          if (budget.status === 'sent_to_members' && !item.assignedTo && !item.assignedToInfo) {
            return true;
          }
          
          return match;
        });

        return {
          ...budget,
          items: filteredItems,
          departmentId: deptId,
          departmentName: userDept.name || budget.departmentName || "Chưa có"
        };
      }).filter(budget => budget.items && budget.items.length > 0); // Chỉ giữ budgets có items được assign

      // Debug log chi tiết
      console.log('MemberExpensePage - Final result:', {
        totalBudgets: budgetsList.length,
        approvedBudgets: approvedBudgets.length,
        budgetsWithAssignedItems: budgetsWithAssignedItems.length,
        currentUserMemberId: String(currentUserMemberId),
        userDept: userDept.name,
        approvedBudgetsStatus: approvedBudgets.map(b => ({ 
          id: b._id || b.id, 
          status: b.status, 
          itemsCount: b.items?.length || 0,
          itemsWithAssigned: b.items?.filter(item => item.assignedTo || item.assignedToInfo).length || 0,
          items: b.items?.map(item => {
            let assignedId = null;
            if (item.assignedTo) {
              if (typeof item.assignedTo === 'string') {
                assignedId = item.assignedTo;
              } else if (item.assignedTo._id) {
                assignedId = String(item.assignedTo._id);
              } else if (item.assignedTo.id) {
                assignedId = String(item.assignedTo.id);
              } else {
                assignedId = String(item.assignedTo);
              }
            }
            let assignedToInfoId = null;
            if (item.assignedToInfo) {
              if (typeof item.assignedToInfo === 'string') {
                assignedToInfoId = item.assignedToInfo;
              } else if (item.assignedToInfo._id) {
                assignedToInfoId = String(item.assignedToInfo._id);
              } else if (item.assignedToInfo.id) {
                assignedToInfoId = String(item.assignedToInfo.id);
              }
            }
            return {
              name: item.name,
              itemId: item.itemId || item._id,
              assignedTo: item.assignedTo,
              assignedToInfo: item.assignedToInfo,
              assignedId: assignedId,
              assignedToInfoId: assignedToInfoId,
              matchesUser: assignedId && String(assignedId) === String(currentUserMemberId) ||
                           assignedToInfoId && String(assignedToInfoId) === String(currentUserMemberId)
            };
          }) || []
        }))
      });
      
      if (budgetsWithAssignedItems.length > 0) {
        setBudgets(budgetsWithAssignedItems);
      } else {
        setBudgets([]);
        // Chỉ hiển thị toast nếu có budgets approved nhưng không có items được assign
        if (approvedBudgets.length > 0) {
          toast.info("Chưa có mục ngân sách nào được phân công cho bạn. Vui lòng đợi Trưởng ban phân công.");
        }
      }
    } catch (error) {
      console.error("Error fetching budgets:", error);
      if (error?.response?.status !== 404) {
        toast.error("Không thể tải dữ liệu");
      }
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount || 0);
  };

  const handleOpenEditModal = (item, budget) => {
    const submittedStatus = item.submittedStatus || 'draft';
    if (submittedStatus === 'submitted') {
      toast.info("Mục này đã được nộp, không thể chỉnh sửa");
      return;
    }
    
    setEditingItem(item);
    setEditingBudget(budget);
    setEditFormData({
      actualAmount: item.actualAmount || "",
      memberNote: item.memberNote || "",
      evidence: item.evidence || [],
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setEditingBudget(null);
    setEditFormData({
      actualAmount: "",
      memberNote: "",
      evidence: [],
    });
  };

  const handleSaveFromModal = async () => {
    if (!editingItem || !editingBudget) return;
    
    try {
      setLoading(true);
      // Đảm bảo evidence là array và có format đúng
      const evidenceToSave = Array.isArray(editFormData.evidence) 
        ? editFormData.evidence.map(ev => ({
            type: ev.type || 'image',
            url: ev.url || ev,
            name: ev.name || 'Bằng chứng'
          }))
        : [];
      
      const response = await budgetApi.reportExpense(
        eventId,
        editingBudget.departmentId,
        editingBudget._id,
        editingItem.itemId,
        {
          actualAmount: parseFloat(editFormData.actualAmount) || 0,
          evidence: evidenceToSave,
          memberNote: editFormData.memberNote || "",
        }
      );
      
      console.log("Save response:", response);
      toast.success("Đã lưu thành công!");
      handleCloseEditModal();
      await fetchBudgets();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error(error?.response?.data?.message || "Lưu thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    if (!editingItem || !editingBudget) return;
    
    try {
      setLoading(true);
      
      // Đảm bảo evidence là array và có format đúng
      const evidenceToSave = Array.isArray(editFormData.evidence) 
        ? editFormData.evidence.map(ev => ({
            type: ev.type || 'image',
            url: ev.url || ev,
            name: ev.name || 'Bằng chứng'
          }))
        : [];
      
      await budgetApi.reportExpense(
        eventId,
        editingBudget.departmentId,
        editingBudget._id,
        editingItem.itemId,
        {
          actualAmount: parseFloat(editFormData.actualAmount) || 0,
          evidence: evidenceToSave,
          memberNote: editFormData.memberNote || "",
        }
      );
      await budgetApi.submitExpense(eventId, editingBudget.departmentId, editingBudget._id, editingItem.itemId);
      toast.success("Đã lưu và nộp thành công!");
      handleCloseEditModal();
      await fetchBudgets();
    } catch (error) {
      console.error("Error saving and submitting:", error);
      toast.error(error?.response?.data?.message || "Thao tác thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvidenceLink = () => {
    setLinkInput("");
    setShowLinkModal(true);
  };

  const handleConfirmAddLink = () => {
    if (linkInput && linkInput.trim()) {
      setEditFormData(prev => ({
        ...prev,
        evidence: [...(prev.evidence || []), {
          type: 'link',
          url: linkInput.trim(),
          name: `Link ${(prev.evidence || []).length + 1}`
        }]
      }));
      setShowLinkModal(false);
      setLinkInput("");
    }
  };

  const handleAddEvidenceFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra kích thước file (tối đa 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File quá lớn. Vui lòng chọn file nhỏ hơn 10MB");
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const fileType = file.type.startsWith('image/') ? 'image' : 
                        file.type === 'application/pdf' ? 'pdf' : 'doc';
        setEditFormData(prev => ({
          ...prev,
          evidence: [...(prev.evidence || []), {
            type: fileType,
            url: event.target.result,
            name: file.name
          }]
        }));
        toast.success("Đã thêm bằng chứng thành công!");
      } catch (error) {
        console.error("Error processing file:", error);
        toast.error("Không thể xử lý file. Vui lòng thử lại.");
      }
    };
    
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      toast.error("Không thể đọc file. Vui lòng thử lại.");
    };
    
    reader.readAsDataURL(file);
    
    // Reset input để có thể chọn lại cùng file
    e.target.value = '';
  };

  const handleRemoveEvidence = (idx) => {
    setEditFormData(prev => ({
      ...prev,
      evidence: (prev.evidence || []).filter((_, i) => i !== idx)
    }));
  };

  if (loading && budgets.length === 0) {
    return <Loading />;
  }

  if (budgets.length === 0) {
    return (
      <UserLayout
        title="Chi tiêu"
        activePage="finance-statistics"
        sidebarType="member"
        eventId={eventId}
      >
        <div className="container-fluid px-3 px-lg-4 py-3">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10 col-xl-8">
              <div className="text-center py-5">
                <Inbox size={32} style={{ color: "#9CA3AF" }} />
                <h4 className="mt-3">Chưa có budget được gửi xuống</h4>
                <p className="text-muted">
                  Trưởng ban sẽ gửi budget xuống cho bạn sau khi được duyệt. Vui lòng quay lại sau.
                </p>
              </div>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title="Chi tiêu"
      activePage="finance-statistics"
      sidebarType="member"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        {budgets.map((budget) => {
          const totalCost = budget.items?.reduce(
            (sum, item) => sum + (parseFloat(item.total?.toString() || 0)),
            0
          ) || 0;
          const totalActual = budget.items?.reduce(
            (sum, item) => sum + (parseFloat(item.actualAmount?.toString() || 0)),
            0
          ) || 0;
          
          const draftCount = budget.items?.filter(item => 
            (item.submittedStatus || 'draft') === 'draft'
          ).length || 0;
          
          const submittedCount = budget.items?.filter(item => 
            (item.submittedStatus || 'draft') === 'submitted'
          ).length || 0;

          let filteredItems = budget.items?.filter(item =>
            item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase())
          ) || [];

          if (filterStatus !== 'all') {
            filteredItems = filteredItems.filter(item => 
              (item.submittedStatus || 'draft') === filterStatus
            );
          }

          return (
            <div key={budget._id}>
                  {/* Header Section */}
              <div className="mb-4">
                <h2 className="fw-bold mb-2" style={{ fontSize: "28px", color: "#111827" }}>
                  Báo cáo chi tiêu
                </h2>
                <div className="d-flex flex-column gap-2">
                  {budget.name && (
                    <div className="d-flex align-items-center gap-2" style={{ color: "#3B82F6" }}>
                      <FileText size={18} />
                      <span className="fw-semibold">Đơn: {budget.name}</span>
                    </div>
                  )}
                  <div className="d-flex align-items-center gap-2 text-muted">
                    <Users size={18} />
                    <span>Ban: {budget.departmentName || "Đang tải..."}</span>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="d-flex flex-wrap gap-3 mb-4">
                <div
                  style={{
                    flex: "1",
                    minWidth: "200px",
                    background: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    padding: "20px",
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(59, 130, 246, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#3B82F6",
                        fontSize: "24px",
                      }}
                    >
                        <Wallet size={18} />
                      </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: "24px", color: "#111827" }}>
                        {formatCurrency(totalCost)} VNĐ
                      </div>
                      <div className="text-muted" style={{ fontSize: "14px" }}>
                        CHI PHÍ DỰ KIẾN
                      </div>
                    </div>
                      </div>
                    </div>

                <div
                  style={{
                    flex: "1",
                    minWidth: "200px",
                    background: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    padding: "20px",
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(16, 185, 129, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#10B981",
                        fontSize: "24px",
                      }}
                    >
                        <Coins size={18} />
                      </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: "24px", color: "#111827" }}>
                        {formatCurrency(totalActual)} VNĐ
                      </div>
                      <div className="text-muted" style={{ fontSize: "14px" }}>
                        CHI PHÍ THỰC TẾ
                      </div>
                    </div>
                      </div>
                    </div>

                <div
                  style={{
                    flex: "1",
                    minWidth: "200px",
                    background: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    padding: "20px",
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(6, 182, 212, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#06B6D4",
                        fontSize: "24px",
                      }}
                    >
                        <ListChecks size={18} />
                      </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: "24px", color: "#111827" }}>
                        {budget.items?.length || 0}
                        </div>
                      <div className="text-muted" style={{ fontSize: "14px" }}>
                        TỔNG SỐ MỤC
                      </div>
                      <div className="mt-1" style={{ fontSize: "12px" }}>
                        <span className="text-muted">{draftCount} nháp</span>
                        {" "}
                        <span style={{ color: "#10B981" }}>{submittedCount} đã nộp</span>
                      </div>
                    </div>
                      </div>
                    </div>

                <div
                  style={{
                    flex: "1",
                    minWidth: "200px",
                    background: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    padding: "20px",
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(245, 158, 11, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#F59E0B",
                        fontSize: "24px",
                      }}
                    >
                        <TrendingUp size={18} />
                      </div>
                    <div>
                      <div className="fw-bold" style={{ fontSize: "24px", color: "#111827" }}>
                          {formatCurrency(Math.abs(totalActual - totalCost))}
                        </div>
                      <div className="text-muted" style={{ fontSize: "14px" }}>
                        CHÊNH LỆCH
                      </div>
                      <div className="mt-1" style={{ fontSize: "12px", color: "#10B981" }}>
                        {totalActual < totalCost ? "Tiết kiệm" : totalActual > totalCost ? "Vượt chi" : "Cân bằng"}
                      </div>
                        </div>
                      </div>
                    </div>
                  </div>

              {/* Filter and Search */}
              <div
                className="mb-4"
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  padding: "16px 20px",
                }}
              >
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div className="d-flex gap-2">
                      <button
                      className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setFilterStatus('all')}
                      style={{ borderRadius: "8px" }}
                      >
                        Tất cả ({budget.items?.length || 0})
                      </button>
                      <button
                      className={`btn ${filterStatus === 'draft' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setFilterStatus('draft')}
                      style={{ borderRadius: "8px" }}
                      >
                        Nháp ({draftCount})
                      </button>
                      <button
                      className={`btn ${filterStatus === 'submitted' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setFilterStatus('submitted')}
                      style={{ borderRadius: "8px" }}
                      >
                        Đã nộp ({submittedCount})
                      </button>
                    </div>
                  <div style={{ maxWidth: "300px", width: "100%" }}>
                    <div className="input-group">
                      <span className="input-group-text bg-white" style={{ borderRight: "none" }}>
                      <Search size={18} />
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Tìm kiếm..."
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
              </div>

              {/* Table */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  padding: "24px",
                }}
              >
                <h5 className="fw-bold mb-4" style={{ fontSize: "18px", color: "#111827" }}>
                  <i className="bi bi-table me-2"></i>
                      Danh sách chi tiêu
                    </h5>

                <div className="table-responsive">
                  <table className="table" style={{ width: "100%", minWidth: "max-content" }}>
                      <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ 
                          padding: "12px", 
                          fontWeight: "600", 
                          color: "#374151",
                          minWidth: `${widths.name}px`,
                          width: `${widths.name}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          NỘI DUNG
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
                          minWidth: `${widths.category}px`,
                          width: `${widths.category}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          HẠNG MỤC
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
                          minWidth: `${widths.unitCost}px`,
                          width: `${widths.unitCost}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          ĐƠN GIÁ
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
                          minWidth: `${widths.qty}px`,
                          width: `${widths.qty}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          SL
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
                          minWidth: `${widths.unit}px`,
                          width: `${widths.unit}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          ĐVT
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
                          minWidth: `${widths.total}px`,
                          width: `${widths.total}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          GIÁ TRỊ DỰ KIẾN
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
                          minWidth: `${widths.actualAmount}px`,
                          width: `${widths.actualAmount}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          GIÁ TRỊ THỰC TẾ
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: "5px",
                              cursor: "col-resize",
                              backgroundColor: resizing.column === "actualAmount" ? "#3B82F6" : "transparent",
                              zIndex: 10
                            }}
                            onMouseDown={(e) => handleMouseDown(e, "actualAmount")}
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
                          minWidth: `${widths.evidence}px`,
                          width: `${widths.evidence}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          BẰNG CHỨNG
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
                          minWidth: `${widths.memberNote}px`,
                          width: `${widths.memberNote}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          GHI CHÚ
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
                          minWidth: `${widths.status}px`,
                          width: `${widths.status}px`,
                          position: "relative",
                          userSelect: "none"
                        }}>
                          TRẠNG THÁI
                        </th>
                      </tr>
                    </thead>
                      <tbody>
                        {filteredItems.length === 0 ? (
                          <tr>
                          <td colSpan={10} className="text-center text-muted py-4">
                            Không tìm thấy mục nào
                            </td>
                          </tr>
                        ) : (
                        filteredItems.map((item, index) => {
                            const estimatedTotal = parseFloat(item.total?.toString() || 0);
                            const actualAmount = parseFloat(item.actualAmount?.toString() || 0);
                            const submittedStatus = item.submittedStatus || 'draft';
                            const isSubmitted = submittedStatus === 'submitted';

                            return (
                              <tr 
                              key={item.itemId || index}
                                onClick={() => !isSubmitted && handleOpenEditModal(item, budget)}
                              style={{ 
                                cursor: !isSubmitted ? 'pointer' : 'default',
                                backgroundColor: isSubmitted ? 'rgba(16, 185, 129, 0.02)' : 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubmitted) {
                                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.03)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSubmitted) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                } else {
                                  e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.02)';
                                }
                              }}
                            >
                              <td style={{ padding: "12px" }}>{item.name}</td>
                              <td style={{ padding: "12px" }}>
                                <span style={{ color: "#3B82F6" }}>{item.category || "—"}</span>
                                </td>
                              <td style={{ padding: "12px" }}>
                                    {formatCurrency(parseFloat(item.unitCost) || 0)}
                                </td>
                              <td style={{ padding: "12px" }}>{item.qty || 0}</td>
                              <td style={{ padding: "12px" }}>
                                <span style={{ color: "#6B7280" }}>{item.unit || "cái"}</span>
                                </td>
                              <td style={{ padding: "12px" }}>
                                <span className="fw-semibold" style={{ color: "#3B82F6" }}>
                                    {formatCurrency(estimatedTotal)}
                                  </span>
                                </td>
                              <td style={{ padding: "12px" }}>
                                    {actualAmount > 0 ? (
                                  <span className="fw-semibold d-flex align-items-center gap-1" style={{
                                    color: actualAmount > estimatedTotal ? "#EF4444" : actualAmount < estimatedTotal ? "#10B981" : "#10B981"
                                  }}>
                                        {actualAmount > estimatedTotal && (
                                          <ArrowUpCircle size={18} />
                                        )}
                                        {actualAmount < estimatedTotal && (
                                          <ArrowDownCircle size={18} />
                                        )}
                                        {formatCurrency(actualAmount)}
                                      </span>
                                    ) : (
                                  <span className="text-muted">Chưa nhập</span>
                                    )}
                                </td>
                              <td style={{ padding: "12px" }}>
                                    {item.evidence && item.evidence.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-1">
                                        {item.evidence.slice(0, 2).map((ev, idx) => (
                                      <span key={idx} className="badge" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
                                        {ev.type === 'image' && <i className="bi bi-image me-1"></i>}
                                        {ev.type === 'pdf' && <i className="bi bi-file-pdf me-1"></i>}
                                        {ev.type === 'doc' && <i className="bi bi-file-word me-1"></i>}
                                        {ev.type === 'link' && <i className="bi bi-link-45deg me-1"></i>}
                                          </span>
                                        ))}
                                        {item.evidence.length > 2 && (
                                      <span className="text-muted">+{item.evidence.length - 2}</span>
                                        )}
                                      </div>
                                    ) : (
                                  <span className="text-muted">Chưa có</span>
                                    )}
                                </td>
                              <td style={{ padding: "12px" }}>
                                    {item.memberNote ? (
                                  <span style={{ fontSize: "13px" }}>
                                        {item.memberNote.length > 30 
                                          ? item.memberNote.substring(0, 30) + '...' 
                                          : item.memberNote}
                                      </span>
                                    ) : (
                                  <span className="text-muted">Chưa có</span>
                                    )}
                                </td>
                              <td style={{ padding: "12px" }}>
                                  {isSubmitted ? (
                                  <span className="badge" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10B981" }}>
                                    <i className="bi bi-check-circle-fill me-1"></i>
                                    Đã nộp
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: "rgba(107, 114, 128, 0.1)", color: "#6B7280" }}>
                                    <i className="bi bi-clock me-1"></i>
                                    Chưa nộp
                                  </span>
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
            </div>
          );
        })}

        {/* Edit Modal */}
        {showEditModal && editingItem && editingBudget && (
          <div
            className="modal show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 }}
            onClick={handleCloseEditModal}
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
                    onClick={handleCloseEditModal}
                  ></button>
                </div>
                <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  <p className="text-muted mb-4">{editingItem.name}</p>

                  {/* Item Info */}
                  <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                      <label className="form-label text-muted" style={{ fontSize: "12px" }}>HẠNG MỤC</label>
                      <div>{editingItem.category || "—"}</div>
                  </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label text-muted" style={{ fontSize: "12px" }}>ĐƠN GIÁ</label>
                      <div>{formatCurrency(parseFloat(editingItem.unitCost) || 0)} VNĐ</div>
                  </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label text-muted" style={{ fontSize: "12px" }}>SỐ LƯỢNG</label>
                      <div>{editingItem.qty} {editingItem.unit || "cái"}</div>
                  </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label text-muted" style={{ fontSize: "12px" }}>TỔNG DỰ KIẾN</label>
                      <div className="fw-bold" style={{ color: "#3B82F6" }}>
                      {formatCurrency(parseFloat(editingItem.total) || 0)} VNĐ
                      </div>
                  </div>
                </div>

                  <hr />

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
                      value={editFormData.actualAmount}
                      onChange={(e) => setEditFormData({ ...editFormData, actualAmount: e.target.value })}
                      placeholder="Nhập số tiền thực tế..."
                    />
                      <span className="input-group-text">VNĐ</span>
                  </div>
                  {editFormData.actualAmount && (
                      <div className="mt-2">
                        <span className={`badge ${
                        parseFloat(editFormData.actualAmount) < parseFloat(editingItem.total)
                            ? 'bg-success'
                          : parseFloat(editFormData.actualAmount) > parseFloat(editingItem.total)
                            ? 'bg-danger'
                            : 'bg-info'
                      }`}>
                        {parseFloat(editFormData.actualAmount) < parseFloat(editingItem.total) ? (
                          <>
                              <i className="bi bi-arrow-down me-1"></i>
                            Tiết kiệm {formatCurrency(parseFloat(editingItem.total) - parseFloat(editFormData.actualAmount))} VNĐ
                          </>
                        ) : parseFloat(editFormData.actualAmount) > parseFloat(editingItem.total) ? (
                          <>
                              <i className="bi bi-arrow-up me-1"></i>
                            Vượt {formatCurrency(parseFloat(editFormData.actualAmount) - parseFloat(editingItem.total))} VNĐ
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

                  {/* Evidence */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                    <i className="bi bi-paperclip me-2"></i>
                    Bằng chứng
                  </label>
                  {editFormData.evidence && editFormData.evidence.length > 0 && (
                      <div className="mb-3">
                      {editFormData.evidence.map((ev, idx) => (
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

                  {/* Member Note */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                    <i className="bi bi-chat-left-text me-2"></i>
                    Ghi chú
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={editFormData.memberNote}
                    onChange={(e) => setEditFormData({ ...editFormData, memberNote: e.target.value })}
                    placeholder="Nhập ghi chú nếu cần..."
                  />
                </div>
              </div>
                <div className="modal-footer" style={{ borderTop: "1px solid #e5e7eb" }}>
                <button
                    className="btn btn-secondary"
                  onClick={handleCloseEditModal}
                    disabled={loading}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Hủy
                </button>
                <button
                    className="btn btn-primary"
                  onClick={handleSaveFromModal}
                  disabled={loading}
                >
                  <i className="bi bi-check-circle me-2"></i>
                    {loading ? "Đang lưu..." : "Lưu"}
                </button>
                <button
                    className="btn btn-success"
                  onClick={handleSaveAndSubmit}
                  disabled={loading}
                >
                  <i className="bi bi-send-fill me-2"></i>
                    {loading ? "Đang nộp..." : "Lưu & Nộp"}
                </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && selectedImage && (
          <div
            className="modal show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.8)", zIndex: 10000 }}
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
      </div>

      {/* Add Link Modal */}
      {showLinkModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
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

export default MemberExpensePage;
