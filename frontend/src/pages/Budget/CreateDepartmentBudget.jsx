import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { budgetApi } from "../../apis/budgetApi";
import { departmentService } from "../../services/departmentService";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";

const CreateDepartmentBudget = () => {
  const { eventId, departmentId } = useParams();
  const navigate = useNavigate();
  const location = window.location.pathname;
  const isEditMode = location.includes('/edit');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [department, setDepartment] = useState(null);
  const [budget, setBudget] = useState(null);
  const [budgetItems, setBudgetItems] = useState([
    {
      id: Date.now(),
      name: "",
      category: "",
      unit: "cái",
      unitPrice: "",
      quantity: "",
      total: 0,
      note: "",
      feedback: "",
      status: "pending",
      itemId: null,
      assignedTo: null,
    },
  ]);
  const [categories, setCategories] = useState([]); // Danh sách hạng mục
  const [newCategory, setNewCategory] = useState(""); // Input để thêm hạng mục mới
  const [members, setMembers] = useState([]); // Danh sách members để assign

  useEffect(() => {
    fetchDepartment();
    if (isEditMode) {
      fetchBudget();
    }
  }, [eventId, departmentId, isEditMode]);

  useEffect(() => {
    if (departmentId && departmentId !== "current" && departmentId !== "") {
      fetchMembers();
    }
  }, [eventId, departmentId]);

  // Format số với dấu phẩy phân cách hàng nghìn
  const formatNumber = (value) => {
    if (!value && value !== 0) return "";
    // Loại bỏ tất cả ký tự không phải số
    const numericValue = value.toString().replace(/[^\d]/g, "");
    if (!numericValue) return "";
    // Format với dấu phẩy
    return new Intl.NumberFormat("vi-VN").format(parseInt(numericValue, 10));
  };

  // Parse số từ string có dấu phẩy
  const parseNumber = (value) => {
    if (!value) return 0;
    // Loại bỏ tất cả ký tự không phải số
    const numericValue = value.toString().replace(/[^\d]/g, "");
    return numericValue ? parseInt(numericValue, 10) : 0;
  };

  const fetchDepartment = async () => {
    // Kiểm tra nếu departmentId là "current" hoặc không hợp lệ
    if (!departmentId || departmentId === "current" || departmentId === "") {
      console.warn("Invalid departmentId:", departmentId);
      // Điều hướng đến trang departments để chọn
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
      // Nếu lỗi, điều hướng đến trang departments
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
    // Kiểm tra nếu departmentId là "current" hoặc không hợp lệ
    if (!departmentId || departmentId === "current" || departmentId === "") {
      console.warn("Invalid departmentId for budget:", departmentId);
      navigate(`/events/${eventId}/departments`);
      return;
    }

    try {
      setInitialLoading(true);
      const budgetData = await budgetApi.getDepartmentBudget(eventId, departmentId);
      setBudget(budgetData);
      if (budgetData?.items) {
        setBudgetItems(
          budgetData.items.map((item) => {
            const unitCost = parseFloat(item.unitCost) || 0;
            const qty = parseFloat(item.qty) || 0;
            return {
              id: item.itemId || Date.now() + Math.random(),
              name: item.name || "",
              category: item.category || "",
              unit: item.unit || "cái",
              unitPrice: unitCost > 0 ? formatNumber(unitCost.toString()) : "",
              quantity: qty > 0 ? formatNumber(qty.toString()) : "",
              total: parseFloat(item.total) || 0,
              note: item.note || "",
              feedback: item.feedback || "",
              status: item.status || "pending", // Lưu status của item
              itemId: item.itemId, // Lưu itemId để gửi lên backend
              assignedTo: item.assignedTo?._id || item.assignedTo?.id || item.assignedTo || null, // Lưu assignedTo
            };
          })
        );
      }
      // Load categories
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

  // Kiểm tra tên mục có trùng không
  const checkDuplicateName = (name, currentId) => {
    if (!name || name.trim() === "") return false;
    return budgetItems.some(
      (item) => item.id !== currentId && item.name?.trim().toLowerCase() === name.trim().toLowerCase()
    );
  };

  const handleItemChange = (id, field, value) => {
    setBudgetItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item };
          
          if (field === "unitPrice") {
            // Format số với dấu phẩy khi hiển thị
            updated.unitPrice = formatNumber(value);
            // Tính tổng với giá trị đã parse
            updated.total = calculateTotal(updated.unitPrice, updated.quantity);
          } else if (field === "quantity") {
            // Format số với dấu phẩy khi hiển thị
            updated.quantity = formatNumber(value);
            // Tính tổng với giá trị đã parse
            updated.total = calculateTotal(updated.unitPrice, updated.quantity);
          } else if (field === "name") {
            updated.name = value;
            // Không hiển thị toast khi đang nhập, chỉ hiển thị tooltip và border đỏ
          } else {
            updated[field] = value;
          }
          
          return updated;
        }
        return item;
      })
    );
  };

  // Xử lý khi blur khỏi ô tên mục
  const handleNameBlur = (id, name) => {
    if (checkDuplicateName(name, id)) {
      // Xóa giá trị nếu vẫn trùng
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

  const handleAddItem = () => {
    setBudgetItems([
      ...budgetItems,
      {
        id: Date.now(),
        name: "",
        category: "",
        unit: "cái",
        unitPrice: "",
        quantity: "",
        total: 0,
        note: "",
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

  const validateForm = () => {
    // Kiểm tra các trường bắt buộc
    for (const item of budgetItems) {
      const unitPriceNum = parseNumber(item.unitPrice);
      const quantityNum = parseNumber(item.quantity);
      if (!item.name || !item.name.trim()) {
        toast.error("Vui lòng điền đầy đủ nội dung cho tất cả các dòng.");
        return false;
      }
      if (categories.length > 0 && (!item.category || !item.category.trim())) {
        toast.error("Vui lòng chọn hạng mục cho tất cả các mục.");
        return false;
      }
      if (!unitPriceNum) {
        toast.error("Vui lòng điền đầy đủ đơn giá cho tất cả các mục.");
        return false;
      }
      if (!quantityNum) {
        toast.error("Vui lòng điền đầy đủ số lượng cho tất cả các mục.");
        return false;
      }
    }
    
    // Kiểm tra tên mục trùng
    const names = budgetItems.map((item) => item.name?.trim().toLowerCase()).filter(Boolean);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      toast.error("Có nội dung bị trùng. Vui lòng kiểm tra và sửa lại.");
      return false;
    }
    
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) {
      // validateForm đã có thông báo lỗi riêng
      return;
    }

    setLoading(true);
    try {
      const data = {
        items: budgetItems.map((item) => ({
          itemId: item.itemId || item.id, // Giữ nguyên itemId nếu có
          name: item.name,
          category: item.category || "general",
          unit: item.unit || "cái",
          unitCost: parseNumber(item.unitPrice),
          qty: parseNumber(item.quantity),
          total: item.total,
          note: item.note || "",
          status: item.status || "pending", // Giữ nguyên status nếu có
          assignedTo: item.assignedTo || null, // Thêm assignedTo
        })),
        status: "draft",
      };

      let budgetId = budget?._id;
      if (isEditMode && budgetId) {
        await budgetApi.updateBudget(eventId, departmentId, budgetId, data);
      } else {
        const result = await budgetApi.createBudget(eventId, departmentId, data);
        budgetId = result._id;
      }
      
      // Update categories
      if (budgetId && categories.length > 0) {
        await budgetApi.updateCategories(eventId, departmentId, budgetId, categories);
      }
      toast.success("Đã lưu nháp thành công!");
      navigate(`/events/${eventId}/departments/${departmentId}/budget`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Lưu nháp thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      // validateForm đã có thông báo lỗi riêng
      return;
    }

    setLoading(true);
    try {
      const data = {
        items: budgetItems.map((item) => ({
          itemId: item.itemId || item.id, // Giữ nguyên itemId nếu có
          name: item.name,
          category: item.category || "general",
          unit: item.unit || "cái",
          unitCost: parseNumber(item.unitPrice),
          qty: parseNumber(item.quantity),
          total: item.total,
          note: item.note || "",
          status: item.status || "pending", // Giữ nguyên status nếu có
          assignedTo: item.assignedTo || null, // Thêm assignedTo
        })),
        status: "submitted",
      };

      let budgetId = budget?._id;
      if (isEditMode && budgetId) {
        await budgetApi.updateBudget(eventId, departmentId, budgetId, data);
      } else {
        const result = await budgetApi.createBudget(eventId, departmentId, data);
        budgetId = result._id;
      }
      
      // Update categories
      if (budgetId && categories.length > 0) {
        await budgetApi.updateCategories(eventId, departmentId, budgetId, categories);
      }
      
      if (budgetId) {
        await budgetApi.submitBudget(eventId, departmentId, budgetId);
      }
      toast.success("Gửi duyệt thành công!");
      navigate(`/events/${eventId}/departments/${departmentId}/budget`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Gửi duyệt thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/events/${eventId}/departments/${departmentId}/budget`);
  };

  if (initialLoading) {
    return <Loading />;
  }

  return (
    <UserLayout
      title="Create Department Budget"
      activePage="budget"
      sidebarType="hod"
      eventId={eventId}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header Actions */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <button
              className="btn btn-link text-decoration-none p-0 mb-2"
              onClick={handleCancel}
              style={{ color: "#6b7280" }}
            >
              <i className="bi bi-arrow-left me-2"></i>
              <span className="fw-bold" style={{ fontSize: "20px", color: "#111827" }}>
                {isEditMode ? "Chỉnh Sửa Budget" : "Tạo Budget Mới"}
              </span>
            </button>
            <div className="d-flex align-items-center gap-2 text-muted">
              <i className="bi bi-people-fill"></i>
              <span>Ban: {department?.name || "Đang tải..."}</span>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-primary"
              onClick={handleCancel}
              style={{ borderRadius: "8px" }}
            >
              Huỷ
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={handleSaveDraft}
              disabled={loading}
              style={{ borderRadius: "8px" }}
            >
              Lưu Nháp
            </button>
            <button
              className={budget && (budget.status === 'submitted' || budget.status === 'changes_requested') ? "btn btn-danger" : "btn btn-primary"}
              onClick={handleSubmit}
              disabled={loading}
              style={{ borderRadius: "8px" }}
            >
              <i className="bi bi-send me-2"></i>
              {budget && (budget.status === 'submitted' || budget.status === 'changes_requested') ? "Gửi lại" : "Gửi Duyệt"}
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
                <i className="bi bi-plus-circle me-1"></i>
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
                    Đơn Vị Tính
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "140px" }}>
                    Tổng Tiền (VNĐ)
                  </th>
                  <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "150px" }}>
                    Ghi Chú
                  </th>
                  {isEditMode && budget?.status === "changes_requested" && (
                    <th style={{ padding: "12px", fontWeight: "600", color: "#374151", width: "200px" }}>
                      Phản hồi từ TBTC
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
                  const isApproved = item.status === "approved";
                  const isRejected = item.status === "rejected";
                  const isEditable = !isApproved; // Chỉ cho phép chỉnh sửa nếu chưa được duyệt
                  return (
                  <tr 
                    key={item.id}
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
                          style={{
                            borderRadius: "8px",
                            border: !item.category && categories.length > 0 ? "1px solid #EF4444" : "1px solid #d1d5db",
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
                            {item.name} <i className="bi bi-check-circle ms-1"></i>
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
                            style={{
                              borderRadius: "8px",
                              border: checkDuplicateName(item.name, item.id)
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
                            <i className="bi bi-exclamation-triangle me-1"></i>
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
                          style={{ 
                            borderRadius: "8px", 
                            border: "1px solid #d1d5db",
                            backgroundColor: !isEditable ? "#F3F4F6" : "white",
                            cursor: !isEditable ? "not-allowed" : "text",
                            fontSize: "14px",
                          }}
                          onKeyDown={(e) => {
                            // Chỉ cho phép nhập số và một số phím điều hướng
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
                          placeholder="0"
                          min="0"
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
                          {item.unit || "cái"}
                        </span>
                      ) : (
                        <select
                          className="form-select form-select-sm"
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                          disabled={!isEditable}
                          style={{
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            backgroundColor: !isEditable ? "#F3F4F6" : "white",
                            cursor: !isEditable ? "not-allowed" : "pointer",
                            fontSize: "14px",
                          }}
                        >
                          <option value="cm">cm</option>
                          <option value="mm">mm</option>
                          <option value="m">m</option>
                          <option value="km">km</option>
                          <option value="cái">cái</option>
                          <option value="lít">lít</option>
                        </select>
                      )}
                    </td>
                    {/* Tổng Tiền */}
                    <td style={{ padding: "12px" }}>
                      <span className="fw-semibold" style={{ color: isApproved ? "#10B981" : "#111827", fontSize: "14px" }}>
                        {formatCurrency(item.total)}
                      </span>
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
                            <i className="bi bi-trash"></i>
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
            <i className="bi bi-plus-circle me-2"></i>
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
    </UserLayout>
  );
};

export default CreateDepartmentBudget;

