import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { departmentService } from "../../services/departmentService";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import { useEvents } from "../../contexts/EventContext";
import { ArrowLeft, Users, RotateCw, Save, Send, PlusCircle, CheckCircle, AlertTriangle, XCircle, Upload, Trash, Image, FileText, Link, Paperclip } from "lucide-react";

const CreateDepartmentBudget = () => {
  const { eventId, departmentId, budgetId: budgetIdFromParams } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole, getEventRole } = useEvents();
  const location = window.location.pathname;
  const isEditMode = location.includes('/edit');
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [department, setDepartment] = useState(null);
  const [eventRole, setEventRole] = useState(null);
  const [budget, setBudget] = useState(null);
  const [requestName, setRequestName] = useState("");
  const [requestNameTouched, setRequestNameTouched] = useState(false);
  const [budgetItems, setBudgetItems] = useState([
    {
      id: Date.now(),
      name: "",
      category: "",
      unit: "",
      unitPrice: "",
      quantity: "1",
      total: 0,
      note: "",
      evidence: [],
      feedback: "",
      status: "pending",
      itemId: null,
      assignedTo: null,
    },
  ]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [members, setMembers] = useState([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkItemId, setLinkItemId] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      if (eventId) {
        try {
          const role = await fetchEventRole(eventId);
          setEventRole(role);
        } catch (error) {
          console.error("Error fetching role:", error);
        }
      }
    };
    checkRole();
    fetchDepartment();
    if (isEditMode) {
      fetchBudget();
    } else {
      setBudget(null);
      setRequestName("");
      setRequestNameTouched(false);
      setBudgetItems([
        {
          id: Date.now(),
          name: "",
          category: "",
          unit: "",
          unitPrice: "",
          quantity: "1",
          total: 0,
          note: "",
          evidence: [],
          feedback: "",
          status: "pending",
          itemId: null,
          assignedTo: null,
        },
      ]);
      setCategories([]);
    }
  }, [eventId, departmentId, isEditMode, budgetIdFromParams]);

  useEffect(() => {
    if (!isEditMode) {
      setRequestName("");
      setRequestNameTouched(false);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (departmentId && departmentId !== "current" && departmentId !== "") {
      fetchMembers();
    }
  }, [eventId, departmentId]);

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

  const formatNumber = (value) => {
    if (!value && value !== 0) return "";
    const numericValue = value.toString().replace(/[^\d]/g, "");
    if (!numericValue) return "";
    return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
  };

  const parseNumber = (value) => {
    if (!value) return 0;
    const numericValue = value.toString().replace(/[^\d]/g, "");
    return numericValue ? parseInt(numericValue, 10) : 0;
  };

  const fetchDepartment = async () => {
    if (!departmentId || departmentId === "current" || departmentId === "") {
      console.warn("Invalid departmentId:", departmentId);
      navigate(`/events/${eventId}/departments`);
      return;
    }

    try {
      const dept = await departmentService.getDepartmentDetail(eventId, departmentId);
      if (dept) {
        setDepartment(dept);
      } else {
        console.warn("Department not found");
        navigate(`/events/${eventId}/departments`);
      }
    } catch (error) {
      console.error("Error fetching department:", error);
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        navigate(`/events/${eventId}/departments`);
      }
    }
  };

  const fetchMembers = async () => {
    try {
      const membersList = await departmentService.getMembersByDepartment(eventId, departmentId);
      setMembers(membersList || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const fetchBudget = async () => {
    if (!departmentId || departmentId === "current" || departmentId === "") {
      console.warn("Invalid departmentId for budget:", departmentId);
      navigate(`/events/${eventId}/departments`);
      return;
    }

    try {
      setInitialLoading(true);
      setBudget(null);
      setRequestName("");
      setBudgetItems([]);
      setCategories([]);
      
      const budgetData = budgetIdFromParams 
        ? await budgetApi.getDepartmentBudgetById(eventId, departmentId, budgetIdFromParams)
        : await budgetApi.getDepartmentBudget(eventId, departmentId);
      
      const allowedStatuses = ['draft', 'changes_requested', 'submitted'];
      if (budgetData?.status && !allowedStatuses.includes(budgetData.status)) {
        toast.error(`Budget này đã ở trạng thái "${budgetData.status === 'approved' ? 'Đã phê duyệt' : budgetData.status}" và không thể chỉnh sửa.`);
        navigate(`/events/${eventId}/departments/${departmentId}/budget`);
        return;
      }
      
      setBudget(budgetData);
      setRequestName(budgetData?.name || "");
      setRequestNameTouched(false);
      if (budgetData?.items) {
        const budgetStatus = budgetData.status || "draft";
        const isBudgetApproved = budgetStatus === "approved" || budgetStatus === "sent_to_members" || budgetStatus === "locked";
        
        setBudgetItems(
          budgetData.items.map((item) => {
            const unitCost = parseDecimal(item.unitCost);
            const qty = parseDecimal(item.qty);
            const total = parseDecimal(item.total);
            
            let itemStatus = item.status || "pending";
            if (!isBudgetApproved && itemStatus === "approved") {
              itemStatus = "pending";
            }
            return {
              id: item.itemId || Date.now() + Math.random(),
              name: item.name || "",
              category: item.category || "",
              unit: item.unit || "",
              unitPrice: unitCost > 0 ? formatNumber(unitCost.toString()) : "",
              quantity: qty > 0 ? formatNumber(qty.toString()) : qty === 0 ? "1" : "1",
              total: total || 0,
              note: item.note || "",
              evidence: Array.isArray(item.evidence) ? item.evidence : [],
              feedback: item.feedback || "",
              status: itemStatus,
              itemId: item.itemId,
              assignedTo: item.assignedTo?._id || item.assignedTo?.id || item.assignedTo || null,
            };
          })
        );
      }
      if (budgetData?.categories) {
        setCategories(budgetData.categories || []);
      }
    } catch (error) {
      console.error("Error fetching budget:", error);
      toast.error("Không thể tải budget");
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        navigate(`/events/${eventId}/departments`);
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const calculateTotal = (unitPrice, quantity) => {
    const price = parseNumber(unitPrice);
    const qty = parseNumber(quantity);
    return price * qty;
  };

  const checkDuplicateName = (name, currentId) => {
    if (!name || name.trim() === "") return false;
    return budgetItems.some(
      (item) => item.id !== currentId && item.name?.trim().toLowerCase() === name.trim().toLowerCase()
    );
  };

  const handleItemChange = (id, field, value) => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors[id]) {
        const itemErrors = { ...newErrors[id] };
        delete itemErrors[field];
        if (Object.keys(itemErrors).length === 0) {
          delete newErrors[id];
        } else {
          newErrors[id] = itemErrors;
        }
      }
      return newErrors;
    });

    setBudgetItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item };
          
          if (field === "unitPrice") {
            updated.unitPrice = formatNumber(value);
            updated.total = calculateTotal(updated.unitPrice, updated.quantity);
          } else if (field === "quantity") {
            const numValue = parseNumber(value);
            if (numValue > 0) {
              updated.quantity = formatNumber(value);
            } else {
              updated.quantity = value;
            }
            updated.total = calculateTotal(updated.unitPrice, updated.quantity);
          } else if (field === "name") {
            updated.name = value;
          } else {
            updated[field] = value;
          }
          
          return updated;
        }
        return item;
      })
    );
  };

  const handleNameBlur = (id, name) => {
    if (checkDuplicateName(name, id)) {
      setBudgetItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return { ...item, name: "" };
          }
          return item;
        })
      );
      toast.error("Tên mục trùng đã bị xóa. Vui lòng nhập tên khác.");
    }
  };

  const handleAddEvidenceLink = (itemId) => {
    setLinkItemId(itemId);
    setLinkInput("");
    setShowLinkModal(true);
  };

  const handleConfirmAddLink = () => {
    if (!linkInput || !linkInput.trim() || !linkItemId) return;
    
    const trimmedLink = linkInput.trim();
    let finalUrl = trimmedLink;
    
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    const hasProtocol = trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://');
    const looksLikeUrl = urlPattern.test(trimmedLink) || trimmedLink.includes('.') || trimmedLink.includes('/');
    
    if (!looksLikeUrl && !hasProtocol) {
      toast.error("Vui lòng nhập URL hợp lệ (ví dụ: https://example.com hoặc example.com)");
      return;
    }
    
    if (!hasProtocol) {
      finalUrl = `https://${trimmedLink}`;
    }
    
    setBudgetItems((prev) =>
      prev.map((item) => {
        if (item.id === linkItemId) {
          const allLinks = prev.reduce((count, it) => {
            return count + (it.evidence || []).filter(ev => ev.type === 'link').length;
          }, 0);
          const nextEvidence = [
            ...(item.evidence || []),
            {
              type: "link",
              url: finalUrl,
              name: `Link ${allLinks + 1}`,
            },
          ];
          return { ...item, evidence: nextEvidence };
        }
        return item;
      })
    );
    setShowLinkModal(false);
    setLinkInput("");
    setLinkItemId(null);
  };

  const handleAddEvidenceFile = (itemId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.some(type => file.type.includes(type.split('/')[1]) || file.type === type)) {
      toast.error("Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP), PDF hoặc Word (DOC, DOCX)");
      event.target.value = "";
      return;
    }
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Kích thước file không được vượt quá 10MB");
      event.target.value = "";
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileType = file.type.startsWith("image/")
        ? "image"
        : file.type === "application/pdf"
        ? "pdf"
        : "doc";
      const filePayload = {
        type: fileType,
        url: e.target.result,
        name: file.name,
      };
      setBudgetItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              evidence: [...(item.evidence || []), filePayload],
            };
          }
          return item;
        })
      );
    };
    reader.onerror = () => {
      toast.error("Lỗi khi đọc file. Vui lòng thử lại.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemoveEvidence = (itemId, index) => {
    setBudgetItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            evidence: (item.evidence || []).filter((_, idx) => idx !== index),
          };
        }
        return item;
      })
    );
  };

  const handleOpenEvidence = (evidence) => {
    if (!evidence?.url) return;
    
    if (evidence.type === "image") {
      setSelectedImage(evidence.url);
      setShowImageModal(true);
    } else if (evidence.type === "link") {
      window.open(evidence.url, "_blank", "noopener,noreferrer");
    } else if (evidence.type === "pdf" || evidence.type === "doc") {
      if (evidence.url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = evidence.url;
        link.download = evidence.name || "file";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(evidence.url, "_blank", "noopener,noreferrer");
      }
    } else {
      window.open(evidence.url, "_blank", "noopener,noreferrer");
    }
  };

  const getEvidenceIcon = (type) => {
    switch (type) {
      case "image":
        return Image;
      case "pdf":
        return FileText;
      case "doc":
        return FileText;
      case "link":
        return Link;
      default:
        return Paperclip;
    }
  };

  const getEvidenceDisplayName = (evidence) => {
    if (!evidence.name) return "Bằng chứng";
    
    if (evidence.type === "link") {
      return evidence.name;
    }
    
    const fileName = evidence.name;
    const lastDotIndex = fileName.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
      return "Bằng chứng";
    }
    
    const extension = fileName.substring(lastDotIndex);
    return `Bằng chứng${extension}`;
  };

  const handleAddItem = () => {
    setBudgetItems([
      ...budgetItems,
      {
        id: Date.now(),
        name: "",
        category: "",
        unit: "",
        unitPrice: "",
        quantity: "1",
        total: 0,
        note: "",
        evidence: [],
        feedback: "",
        status: "pending",
        itemId: null,
      },
    ]);
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()];
      setCategories(updatedCategories);
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (categoryToRemove) => {
    setCategories(categories.filter(cat => cat !== categoryToRemove));
  };

  const handleRemoveItem = (id) => {
    if (budgetItems.length > 1) {
      setBudgetItems(budgetItems.filter((item) => item.id !== id));
    } else {
      toast.warning("Phải có ít nhất một mục trong budget");
    }
  };

  const getTotalCost = () => {
    return budgetItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount);
  };

  const isRequestNameInvalid = requestNameTouched && !requestName.trim();

  const validateForm = () => {
    const errors = {};
    let firstErrorElement = null;
    let firstErrorItemId = null;
    let firstErrorField = null;

    if (!requestName.trim()) {
      setRequestNameTouched(true);
      errors.requestName = true;
      const nameInput = document.querySelector('input[data-field="requestName"]');
      if (nameInput) {
        firstErrorElement = nameInput;
        firstErrorField = 'requestName';
      }
    }

    for (let i = 0; i < budgetItems.length; i++) {
      const item = budgetItems[i];
      const itemErrors = {};
      const unitPriceNum = parseNumber(item.unitPrice);
      const quantityNum = parseNumber(item.quantity);

      if (!item.name || !item.name.trim()) {
        itemErrors.name = true;
        if (!firstErrorElement) {
          firstErrorElement = document.querySelector(`input[data-item-id="${item.id}"][data-field="name"]`);
          firstErrorItemId = item.id;
          firstErrorField = 'name';
        }
      }
      if (categories.length > 0 && (!item.category || !item.category.trim())) {
        itemErrors.category = true;
        if (!firstErrorElement) {
          firstErrorElement = document.querySelector(`select[data-item-id="${item.id}"][data-field="category"]`);
          firstErrorItemId = item.id;
          firstErrorField = 'category';
        }
      }
      if (!unitPriceNum) {
        itemErrors.unitPrice = true;
        if (!firstErrorElement) {
          firstErrorElement = document.querySelector(`input[data-item-id="${item.id}"][data-field="unitPrice"]`);
          firstErrorItemId = item.id;
          firstErrorField = 'unitPrice';
        }
      }
      if (!quantityNum || quantityNum < 1) {
        itemErrors.quantity = true;
        if (!firstErrorElement) {
          firstErrorElement = document.querySelector(`input[data-item-id="${item.id}"][data-field="quantity"]`);
          firstErrorItemId = item.id;
          firstErrorField = 'quantity';
        }
      }
      if (!item.unit || !item.unit.trim()) {
        itemErrors.unit = true;
        if (!firstErrorElement) {
          firstErrorElement = document.querySelector(`input[data-item-id="${item.id}"][data-field="unit"]`);
          firstErrorItemId = item.id;
          firstErrorField = 'unit';
        }
      }

      if (Object.keys(itemErrors).length > 0) {
        errors[item.id] = itemErrors;
      }
    }

    const names = budgetItems.map((item) => item.name?.trim().toLowerCase()).filter(Boolean);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      toast.error("Có nội dung bị trùng. Vui lòng kiểm tra và sửa lại.");
      setValidationErrors(errors);
      return false;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      
      if (errors.requestName) {
        toast.error("Vui lòng nhập tên đơn ngân sách.");
      } else {
        const errorCount = Object.keys(errors).filter(key => key !== 'requestName').length;
        if (errorCount === 1) {
          toast.error("Vui lòng điền đầy đủ thông tin cho mục này.");
        } else {
          toast.error(`Vui lòng điền đầy đủ thông tin cho ${errorCount} mục.`);
        }
      }

      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          firstErrorElement.focus();
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      } else if (firstErrorItemId) {
        const rowElement = document.querySelector(`tr[data-item-id="${firstErrorItemId}"]`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      return false;
    }

    setValidationErrors({});
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) {
      return;
    }

    const allowedStatuses = ['draft', 'changes_requested', 'submitted'];
    if (budget?._id && budget?.status && !allowedStatuses.includes(budget.status)) {
      toast.error(`Budget này đã ở trạng thái "${budget.status === 'approved' ? 'Đã phê duyệt' : budget.status}" và không thể chỉnh sửa.`);
      navigate(`/events/${eventId}/departments/${departmentId}/budget`);
      return;
    }

    setIsSavingDraft(true);
    try {
      const data = {
        items: budgetItems.map((item) => {
          const itemData = {
            itemId: item.itemId || item.id,
            name: item.name,
            category: item.category || "general",
            unit: item.unit?.trim() || "",
            unitCost: parseNumber(item.unitPrice),
            qty: parseNumber(item.quantity),
            total: item.total,
            note: item.note || "",
            evidence: item.evidence || [],
            status: item.status || "pending",
            assignedTo: item.assignedTo || null,
          };
          // Debug: Log evidence để kiểm tra
          if (item.evidence && item.evidence.length > 0) {
            console.log('Saving item with evidence:', {
              itemId: itemData.itemId,
              itemName: itemData.name,
              evidenceCount: item.evidence.length,
              evidence: item.evidence
            });
          }
          return itemData;
        }),
        status: "draft",
        name: requestName.trim(),
      };

      let budgetId = budget?._id;
      if (isEditMode && budgetId) {
        await budgetApi.updateBudget(eventId, departmentId, budgetId, data);
      } else {
        const result = await budgetApi.createBudget(eventId, departmentId, data);
        budgetId = result._id;
      }

      if (budgetId && categories.length > 0) {
        await budgetApi.updateCategories(eventId, departmentId, budgetId, categories);
      }
      toast.success("Đã lưu thành công!");
      try {
        navigate(`/events/${eventId}/budgets/departments`, { replace: true });
      } catch (navError) {
        console.error("Navigation error:", navError);
        window.location.href = `/events/${eventId}/budgets/departments`;
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      const errorMessage = error?.response?.data?.message || "Lưu thất bại!";
      
      if (budgetId) {
        toast.success("Đã lưu thành công!");
        try {
          navigate(`/events/${eventId}/budgets/departments`, { replace: true });
        } catch (navError) {
          console.error("Navigation error:", navError);
          window.location.href = `/events/${eventId}/budgets/departments`;
        }
      } else {
        toast.error(errorMessage);
        if (error?.response?.status === 400 && errorMessage.includes("Cannot update budget")) {
          setTimeout(() => {
            navigate(`/events/${eventId}/departments/${departmentId}/budget`);
          }, 2000);
        }
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const allowedStatuses = ['draft', 'changes_requested', 'submitted'];
    if (budget?._id && budget?.status && !allowedStatuses.includes(budget.status)) {
      toast.error(`Budget này đã ở trạng thái "${budget.status === 'approved' ? 'Đã phê duyệt' : budget.status}" và không thể chỉnh sửa.`);
      navigate(`/events/${eventId}/departments/${departmentId}/budget`);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        items: budgetItems.map((item) => {
          const itemData = {
            itemId: item.itemId || item.id,
            name: item.name,
            category: item.category || "general",
            unit: item.unit?.trim() || "",
            unitCost: parseNumber(item.unitPrice),
            qty: parseNumber(item.quantity),
            total: item.total,
            note: item.note || "",
            evidence: item.evidence || [],
            status: item.status || "pending",
            assignedTo: item.assignedTo || null,
          };
          // Debug: Log evidence để kiểm tra
          if (item.evidence && item.evidence.length > 0) {
            console.log('Submitting item with evidence:', {
              itemId: itemData.itemId,
              itemName: itemData.name,
              evidenceCount: item.evidence.length,
              evidence: item.evidence
            });
          }
          return itemData;
        }),
        status: "submitted",
        name: requestName.trim(),
      };

      let budgetId = budget?._id;
      if (isEditMode && budgetId) {
        await budgetApi.updateBudget(eventId, departmentId, budgetId, data);
      } else {
        const result = await budgetApi.createBudget(eventId, departmentId, data);
        budgetId = result._id;
      }

      if (budgetId && categories.length > 0) {
        await budgetApi.updateCategories(eventId, departmentId, budgetId, categories);
      }

      if (budgetId) {
        await budgetApi.submitBudget(eventId, departmentId, budgetId);
      }
      toast.success("Gửi duyệt thành công!");
      navigate(`/events/${eventId}/budgets/departments`, { replace: true });
    } catch (error) {
      const errorMessage = error?.response?.data?.message || "Gửi duyệt thất bại!";
      toast.error(errorMessage);
      
      if (error?.response?.status === 400 && errorMessage.includes("Cannot update budget")) {
        setTimeout(() => {
          navigate(`/events/${eventId}/departments/${departmentId}/budget`);
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (budgetIdFromParams) {
      navigate(`/events/${eventId}/departments/${departmentId}/budget/${budgetIdFromParams}`, { replace: true });
    } else {
      navigate(-1, { replace: true });
    }
  };

  if (initialLoading) {
    return <Loading />;
  }

  return (
    <UserLayout
      title="Tạo ngân sách"
      activePage="finance-budget"
      sidebarType="hod"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header Actions */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <button
              className="btn btn-link text-decoration-none p-0 mb-2"
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              style={{ color: "#6b7280" }}
            >
              <ArrowLeft className="me-2" size={20} />
              <span className="fw-bold" style={{ fontSize: "20px", color: "#111827" }}>
                {isEditMode ? "Chỉnh Sửa Budget" : "Tạo Budget Mới"}
              </span>
            </button>
            <div className="d-flex align-items-center gap-2 text-muted">
              <Users size={18} />
              <span>Ban: {department?.name || "Đang tải..."}</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-primary"
              onClick={handleCancel}
              style={{ borderRadius: "8px" }}
              disabled={isSavingDraft || isSubmitting}
            >
              Huỷ
            </button>
            <button
              className="btn btn-outline-primary d-flex align-items-center"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              style={{ borderRadius: "8px" }}
            >
              {isSavingDraft ? (
                <RotateCw className="spin-animation me-2" size={18} />
              ) : (
                <Save className="me-2" size={18} />
              )}
              {isSavingDraft ? "Đang lưu..." : "Lưu "}
            </button>
            <button
              className={`${budget && (budget.status === 'submitted' || budget.status === 'changes_requested') ? "btn btn-danger" : "btn btn-primary"} d-flex align-items-center`}
              onClick={handleSubmit}
              disabled={isSavingDraft || isSubmitting}
              style={{ borderRadius: "8px" }}
            >
              {isSubmitting ? (
                <RotateCw className="spin-animation me-2" size={18} />
              ) : (
                <Send className="me-2" size={18} />
              )}
              {isSubmitting ? "Đang gửi..." : (budget && (budget.status === 'submitted' || budget.status === 'changes_requested') ? "Gửi lại" : "Gửi Duyệt")}
            </button>
          </div>
        </div>

        {/* Budget Details Table */}
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
            Budget chi tiết
          </h5>

          <div className="mb-4">
            <label className="fw-semibold mb-1" style={{ fontSize: "14px", color: "#374151" }}>
              Tên đơn ngân sách <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={requestName}
              onChange={(e) => {
                setRequestName(e.target.value);
                if (requestNameTouched && e.target.value.trim()) {
                  setRequestNameTouched(false);
                }
              }}
              onBlur={() => setRequestNameTouched(true)}
              placeholder="Ví dụ: Ngân sách truyền thông Giai đoạn 1"
              data-field="requestName"
              style={{
                borderRadius: "8px",
                border: (isRequestNameInvalid || validationErrors.requestName) 
                  ? "1px solid #EF4444" 
                  : "1px solid #d1d5db",
              }}
            />
            {isRequestNameInvalid ? (
              <div className="text-danger mt-1" style={{ fontSize: "13px" }}>
                Vui lòng nhập tên đơn.
              </div>
            ) : (
              <div className="text-muted mt-1" style={{ fontSize: "13px" }}>
                Tên đơn sẽ hiển thị trong danh sách ngân sách và trang chi tiết.
              </div>
            )}
          </div>

          {/* Category Management */}
          <div className="mb-4 p-3" style={{ background: "#F9FAFB", borderRadius: "8px", border: "1px solid #E5E7EB" }}>
            <label className="fw-semibold mb-2" style={{ fontSize: "14px", color: "#374151" }}>
              Quản lý Hạng mục
            </label>
            <div className="d-flex gap-2 mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Nhập hạng mục mới"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                style={{ borderRadius: "8px", maxWidth: "300px" }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddCategory}
                style={{ borderRadius: "8px" }}
              >
                <PlusCircle className="me-1" size={18} />
                Thêm
              </button>
            </div>
            {categories.length > 0 && (
              <div className="d-flex flex-wrap gap-2">
                {categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="badge"
                    style={{
                      background: "#DBEAFE",
                      color: "#1E40AF",
                      padding: "6px 12px",
                      fontSize: "13px",
                      borderRadius: "6px",
                    }}
                  >
                    {cat}
                    <button
                      className="btn-close btn-close-sm ms-2"
                      onClick={() => handleRemoveCategory(cat)}
                      style={{ fontSize: "10px" }}
                    ></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "120px" }}>
                    Hạng Mục{categories.length > 0 && <span className="text-danger">*</span>}
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "200px" }}>
                    Nội dung<span className="text-danger">*</span>
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "130px" }}>
                    Đơn Giá (VNĐ)<span className="text-danger">*</span>
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "100px" }}>
                    Số Lượng<span className="text-danger">*</span>
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "110px" }}>
                    Đơn Vị Tính<span className="text-danger">*</span>
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "140px" }}>
                    Tổng Tiền (VNĐ)
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "180px" }}>
                    Bằng Chứng
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "150px" }}>
                    Ghi Chú
                  </th>
                  {isEditMode && budget?.status === "changes_requested" && (
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "200px" }}>
                      Phản hồi từ tưởng ban tổ chức
                    </th>
                  )}
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "120px" }}>
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {budgetItems.map((item) => {
                  const hasFeedback = item.feedback && item.feedback.trim() !== "";
                  const isApproved = budget?.status === "approved" && item.status === "approved";
                  const isRejected = item.status === "rejected";
                  const isEditable = budget?.status !== "approved" && !isApproved;
                  return (
                  <tr 
                    key={item.id}
                    data-item-id={item.id}
                    style={{
                      background: hasFeedback ? "#FEE2E2" : isApproved ? "#D1FAE5" : "transparent",
                    }}
                  >
                    {/* Hạng Mục */}
                    <td style={{ padding: "12px" }}>
                      {isApproved ? (
                        <span style={{ color: "#10B981", fontSize: "14px" }}>
                          {item.category || "—"}
                        </span>
                      ) : (
                        <select
                          className="form-select form-select-sm"
                          value={item.category || ""}
                          onChange={(e) => handleItemChange(item.id, "category", e.target.value)}
                          disabled={!isEditable}
                          required
                          data-item-id={item.id}
                          data-field="category"
                          style={{
                            borderRadius: "8px",
                            border: (validationErrors[item.id]?.category || (!item.category && categories.length > 0)) 
                              ? "1px solid #EF4444" 
                              : "1px solid #d1d5db",
                            backgroundColor: !isEditable ? "#F3F4F6" : "white",
                            cursor: !isEditable ? "not-allowed" : "pointer",
                            fontSize: "14px",
                          }}
                        >
                          <option value="">{categories.length === 0 ? "Chưa có hạng mục" : "Chọn hạng mục"}</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    {/* Nội dung */}
                    <td style={{ padding: "12px" }}>
                      <div style={{ position: "relative" }}>
                        {isApproved ? (
                          <span style={{ color: "#10B981", fontWeight: "500", fontSize: "14px" }}>
                            {item.name} <CheckCircle className="ms-1" size={16} />
                          </span>
                        ) : (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                            onBlur={(e) => handleNameBlur(item.id, e.target.value)}
                            placeholder="Nhập nội dung"
                            disabled={!isEditable}
                            data-item-id={item.id}
                            data-field="name"
                            style={{
                              borderRadius: "8px",
                              border: (validationErrors[item.id]?.name || checkDuplicateName(item.name, item.id))
                                ? "1px solid #EF4444"
                                : "1px solid #d1d5db",
                              backgroundColor: !isEditable ? "#F3F4F6" : "white",
                              cursor: !isEditable ? "not-allowed" : "text",
                              fontSize: "14px",
                            }}
                          />
                        )}
                        {checkDuplicateName(item.name, item.id) && item.name && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              marginTop: "4px",
                              fontSize: "12px",
                              color: "#EF4444",
                              background: "#FEE2E2",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              zIndex: 10,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <AlertTriangle className="me-1" size={14} />
                            Nội dung đã tồn tại
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Đơn Giá */}
                    <td style={{ padding: "12px" }}>
                      {isApproved ? (
                        <span style={{ color: "#10B981", fontSize: "14px" }}>
                          {formatCurrency(parseNumber(item.unitPrice))}
                        </span>
                      ) : (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, "unitPrice", e.target.value)}
                          placeholder="0"
                          disabled={!isEditable}
                          data-item-id={item.id}
                          data-field="unitPrice"
                          style={{ 
                            borderRadius: "8px", 
                            border: validationErrors[item.id]?.unitPrice 
                              ? "1px solid #EF4444" 
                              : "1px solid #d1d5db",
                            backgroundColor: !isEditable ? "#F3F4F6" : "white",
                            cursor: !isEditable ? "not-allowed" : "text",
                            fontSize: "14px",
                          }}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && 
                                !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                                !(e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) {
                              e.preventDefault();
                            }
                          }}
                        />
                      )}
                    </td>
                    {/* Số Lượng */}
                    <td style={{ padding: "12px" }}>
                      {isApproved ? (
                        <span style={{ color: "#10B981", fontSize: "14px" }}>
                          {item.quantity}
                        </span>
                      ) : (
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                          placeholder="1"
                          min="1"
                          disabled={!isEditable}
                          style={{ 
                            borderRadius: "8px", 
                            border: "1px solid #d1d5db",
                            backgroundColor: !isEditable ? "#F3F4F6" : "white",
                            cursor: !isEditable ? "not-allowed" : "text",
                            fontSize: "14px",
                          }}
                        />
                      )}
                    </td>
                    {/* Đơn Vị Tính */}
                    <td style={{ padding: "12px" }}>
                      {isApproved ? (
                        <span style={{ color: "#10B981", fontSize: "14px" }}>
                          {item.unit || "—"}
                        </span>
                      ) : (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                          placeholder="Ví dụ: cái, bộ..."
                          disabled={!isEditable}
                          data-item-id={item.id}
                          data-field="unit"
                          style={{
                            borderRadius: "8px",
                            border: validationErrors[item.id]?.unit || (!item.unit && !isEditable) 
                              ? "1px solid #EF4444" 
                              : "1px solid #d1d5db",
                            backgroundColor: !isEditable ? "#F3F4F6" : "white",
                            cursor: !isEditable ? "not-allowed" : "text",
                            fontSize: "14px",
                          }}
                        />
                      )}
                    </td>
                    {/* Tổng Tiền */}
                    <td style={{ padding: "12px" }}>
                      <span className="fw-semibold" style={{ color: isApproved ? "#10B981" : "#111827", fontSize: "14px" }}>
                        {formatCurrency(item.total)}
                      </span>
                    </td>
                    {/* Bằng chứng */}
                    <td style={{ padding: "12px" }}>
                      {item.evidence && item.evidence.length > 0 ? (
                        <div className="d-flex flex-column gap-2">
                          {item.evidence.map((ev, idx) => (
                            <div
                              key={idx}
                              className="d-flex align-items-center gap-2"
                              style={{
                                background: "#F3F4F6",
                                borderRadius: "8px",
                                padding: "4px 8px",
                                fontSize: "13px",
                              }}
                            >
                              {React.createElement(getEvidenceIcon(ev.type), { className: "text-primary", size: 16 })}
                              <button
                                type="button"
                                className="btn btn-link p-0"
                                onClick={() => handleOpenEvidence(ev)}
                                style={{ fontSize: "13px" }}
                                title={ev.name || "Bằng chứng"}
                              >
                                {getEvidenceDisplayName(ev)}
                              </button>
                              {isEditable && (
                                <button
                                  type="button"
                                  className="btn btn-link text-danger p-0 ms-auto"
                                  onClick={() => handleRemoveEvidence(item.id, idx)}
                                >
                                  <XCircle size={16} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: "13px" }}>
                          Chưa có
                        </span>
                      )}
                      {isEditable && (
                        <div className="row g-2 mt-2">
                          <div className="col-12 col-md-6 d-flex">
                            <button
                              type="button"
                              className="btn btn-outline-primary flex-fill"
                              onClick={() => handleAddEvidenceLink(item.id)}
                              style={{
                                fontSize: "70%",
                                padding: "4px 6px",
                                display: "inline-flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "1px",
                              }}
                            >
                              <span style={{ fontSize: "105%" }}>+</span>
                              <span className="text-center">Thêm link</span>
                            </button>
                          </div>
                          <div className="col-12 col-md-6 d-flex">
                            <label
                              className="btn btn-outline-primary mb-0 d-flex flex-column align-items-center gap-1 flex-fill"
                              style={{
                                fontSize: "70%",
                                padding: "4px 6px",
                              }}
                            >
                              <Upload style={{ fontSize: "105%" }} size={16} />
                              <span className="text-center">Tải file</span>
                              <input
                                type="file"
                                className="d-none"
                                accept="image/*,application/pdf,.doc,.docx"
                                onChange={(e) => handleAddEvidenceFile(item.id, e)}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </td>
                    {/* Ghi Chú */}
                    <td style={{ padding: "12px" }}>
                      {isApproved ? (
                        <span style={{ color: "#111827", fontSize: "13px" }}>
                          {item.note || "—"}
                        </span>
                      ) : (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={item.note}
                          onChange={(e) => handleItemChange(item.id, "note", e.target.value)}
                          placeholder="Nhập ghi chú"
                          disabled={!isEditable}
                          style={{ 
                            borderRadius: "8px", 
                            border: "1px solid #d1d5db",
                            color: "#111827",
                            backgroundColor: !isEditable ? "#F3F4F6" : "white",
                            cursor: !isEditable ? "not-allowed" : "text",
                            fontSize: "14px",
                          }}
                        />
                      )}
                    </td>
                    {/* Phản hồi từ HoOC */}
                    {isEditMode && budget?.status === "changes_requested" && (
                      <td style={{ padding: "12px" }}>
                        {hasFeedback ? (
                          <span style={{ color: "#111827", fontSize: "13px" }}>
                            {item.feedback}
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: "13px" }}>—</span>
                        )}
                      </td>
                    )}
                    {/* Trạng thái */}
                    <td style={{ padding: "12px" }}>
                      {isApproved ? (
                        <span className="badge" style={{ background: "#D1FAE5", color: "#10B981", fontSize: "12px", padding: "4px 8px" }}>
                          Đã duyệt
                        </span>
                      ) : isRejected ? (
                        <span className="badge" style={{ background: "#FEE2E2", color: "#EF4444", fontSize: "12px", padding: "4px 8px" }}>
                          Từ chối
                        </span>
                      ) : (
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge" style={{ background: "#FEF3C7", color: "#F59E0B", fontSize: "12px", padding: "4px 8px" }}>
                            Chờ duyệt
                          </span>
                          <button
                            className="btn btn-link text-danger p-0"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={!isEditable}
                            style={{ textDecoration: "none", opacity: !isEditable ? 0.5 : 1, fontSize: "14px" }}
                            title="Xóa mục"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>

          <button
            className="btn btn-primary w-100 mt-3"
            onClick={handleAddItem}
            style={{
              borderRadius: "8px",
              padding: "12px",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            <PlusCircle className="me-2" size={18} />
            Thêm Mục Mới
          </button>
        </div>

        {/* Total Cost Section */}
        <div
          className="d-flex justify-content-between align-items-center"
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: "24px",
          }}
        >
          <div>
            <h5 className="fw-bold mb-1" style={{ fontSize: "18px", color: "#111827" }}>
              Tổng Chi Phí Dự Kiến
            </h5>
            <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
              Tổng cộng tất cả các mục ngân sách
            </p>
          </div>
          <div className="text-end">
            <div
              className="fw-bold mb-1"
              style={{ fontSize: "32px", color: "#3B82F6" }}
            >
              {formatCurrency(getTotalCost())} VND
            </div>
            <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
              {budgetItems.length} mục ngân sách
            </p>
          </div>
        </div>
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

      {/* Image Preview Modal */}
      {showImageModal && selectedImage && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}
          onClick={() => {
            setShowImageModal(false);
            setSelectedImage(null);
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
          >
            <div className="modal-content" style={{ borderRadius: '12px', background: 'transparent', border: 'none' }}>
              <div className="modal-header" style={{ borderBottom: 'none', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowImageModal(false);
                    setSelectedImage(null);
                  }}
                  aria-label="Close"
                  style={{ filter: 'brightness(0) invert(1)' }}
                ></button>
              </div>
              <div className="modal-body p-0" style={{ textAlign: 'center' }}>
                <img
                  src={selectedImage}
                  alt="Bằng chứng"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    borderRadius: '8px'
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

export default CreateDepartmentBudget;

