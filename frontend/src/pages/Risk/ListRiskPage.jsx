import { useEffect, useMemo, useState, useCallback } from "react";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useEvents } from "~/contexts/EventContext";
import { useParams, useNavigate } from "react-router-dom";
import { riskApiWithErrorHandling } from "~/apis/riskApi";
import { departmentApi } from "~/apis/departmentApi";
import { toast } from "react-toastify";
import ConfirmModal from "../../components/ConfirmModal";
import Loading from "../../components/Loading";
import { UmbrellaOff } from "lucide-react";

export default function ListRiskPage() {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterLevel, setFilterLevel] = useState("Tất cả");
  const [filterLikelihood, setFilterLikelihood] = useState("Tất cả");
  const [filterCategory, setFilterCategory] = useState("Tất cả");
  const [filterDepartment, setFilterDepartment] = useState("Tất cả");
  const [eventRole, setEventRole] = useState("");
  const [memberInfo, setMemberInfo] = useState({ role: "", departmentId: null });
  const { fetchEventRole, getEventMember } = useEvents();

  // ====== Pagination States ======
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  // ====== API States ======
  const [allRisks, setAllRisks] = useState([]);
  const [risks, setRisks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    hasNext: false,
    hasPrev: false,
    totalCount: 0,
    limit: 10,
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    high: 0,
    resolved: 0,
  });

  // ====== Modal states ======
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRisk, setNewRisk] = useState({
    name: "",
    scope: "department",
    departmentId: "",
    risk_category: "infrastructure",
    custom_category: "", // For custom category input when "others" is selected
    impact: "medium",
    likelihood: "medium",
    risk_mitigation_plan: "",
    risk_response_plan: "",
  });

  // ====== Delete Confirmation Modal ======
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ====== Risk Category Mappings ======
  const categoryLabels = {
    infrastructure: "Cơ sở vật chất",
    "mc-guests": "MC & Khách mời",
    communication: "Truyền thông",
    players: "Người chơi",
    staffing: "Nhân sự",
    communication_post: "Tuyến bài",
    attendees: "Người tham gia",
    weather: "Thời tiết",
    time: "Thời gian",
    timeline: "Timeline",
    tickets: "Vé",
    collateral: "Ấn phẩm",
    game: "Game",
    sponsorship: "Nhà tài trợ",
    finance: "Tài chính",
    transportation: "Vận chuyển",
    decor: "Đồ trang trí",
    others: "Khác",
  };

  const impactLabels = {
    high: "Cao",
    medium: "Trung bình",
    low: "Thấp",
  };

  const likelihoodLabels = {
    very_high: "Rất cao",
    high: "Cao",
    medium: "Trung bình",
    low: "Thấp",
    very_low: "Rất thấp",
  };

  const statusLabels = {
    not_yet: "Chưa xảy ra",
    resolved: "Đã xử lý",
    resolving: "Đang xử lý",
  };

  // ====== Helper Functions ======

  const mapImpactToLevel = (impact) => {
    return impactLabels[impact] || "Trung bình";
  };

  const getDisplayStatus = (apiRisk) => {
    return statusLabels[apiRisk.risk_status] || "Chưa xảy ra";
  };

  const transformApiRiskToComponent = (apiRisk) => ({
    id: apiRisk._id,
    name: apiRisk.name,
    scope: apiRisk.scope || "department",
    owner: apiRisk.scope === "event" || !apiRisk.departmentId ? "Toàn BTC" : (apiRisk.departmentId?.name || "Chưa phân công"),
    ownerId: apiRisk.departmentId?._id,
    status: getDisplayStatus(apiRisk),
    statusKey: apiRisk.risk_status,
    level: mapImpactToLevel(apiRisk.impact),
    impact: apiRisk.impact,
    likelihood: apiRisk.likelihood,
    likelihoodLabel: likelihoodLabels[apiRisk.likelihood] || "Trung bình",
    description: apiRisk.risk_mitigation_plan,
    mitigation: apiRisk.risk_response_plan,
    category: categoryLabels[apiRisk.risk_category] || apiRisk.risk_category,
    categoryKey: apiRisk.risk_category,
    occurredCount: apiRisk.occurred_risk?.length || 0,
    hasOccurred: (apiRisk.occurred_risk?.length || 0) > 0,
    pendingOccurred:
      apiRisk.occurred_risk?.filter((occ) => occ.occurred_status === "pending")
        .length || 0,
    originalData: apiRisk,
  });

  const calculateStats = (riskList) => {
    setStatistics({
      total: riskList.length,
      high: riskList.filter((r) => r.impact === "high").length,
      resolved: riskList.filter((r) => r.statusKey === "resolved").length,
    });
  };

  // Get unique departments and categories for filters
  const uniqueDepartments = useMemo(() => {
    const departments = [...new Set(allRisks.map((r) => r.owner))].filter(
      (dept) => dept && dept !== "Chưa phân công"
    );
    return departments.sort();
  }, [allRisks]);

  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(allRisks.map((r) => r.category))].filter(
      Boolean
    );
    return categories.sort();
  }, [allRisks]);

  // Filter và search ở frontend
  const filteredRisks = useMemo(() => {
    let filtered = [...allRisks];

    // Search filter
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name?.toLowerCase().includes(searchLower) ||
          r.description?.toLowerCase().includes(searchLower) ||
          r.mitigation?.toLowerCase().includes(searchLower)
      );
    }

    // Impact filter
    if (filterLevel !== "Tất cả") {
      filtered = filtered.filter((r) => r.level === filterLevel);
    }

    // Category filter
    if (filterCategory !== "Tất cả") {
      filtered = filtered.filter((r) => r.category === filterCategory);
    }

    // Department filter
    if (filterDepartment !== "Tất cả") {
      filtered = filtered.filter((r) => r.owner === filterDepartment);
    }

    // Likelihood filter
    if (filterLikelihood !== "Tất cả") {
      filtered = filtered.filter((r) => r.likelihood === filterLikelihood);
    }

    return filtered;
  }, [
    allRisks,
    search,
    filterLevel,
    filterCategory,
    filterDepartment,
    filterLikelihood,
  ]);

  // Sort risks ở frontend
  const sortedRisks = useMemo(() => {
    const sorted = [...filteredRisks];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "owner":
          aValue = a.owner?.toLowerCase() || "";
          bValue = b.owner?.toLowerCase() || "";
          break;
        case "impact":
          const impactOrder = { high: 3, medium: 2, low: 1 };
          aValue = impactOrder[a.impact] || 0;
          bValue = impactOrder[b.impact] || 0;
          break;
        case "likelihood":
          const likelihoodOrder = {
            very_high: 5,
            high: 4,
            medium: 3,
            low: 2,
            very_low: 1,
          };
          aValue = likelihoodOrder[a.likelihood] || 0;
          bValue = likelihoodOrder[b.likelihood] || 0;
          break;
        default:
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return sorted;
  }, [filteredRisks, sortBy, sortOrder]);

  // Pagination ở frontend
  const paginatedRisks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedRisks.slice(startIndex, endIndex);
  }, [sortedRisks, currentPage, itemsPerPage]);

  // Cập nhật risks và pagination state
  useEffect(() => {
    const totalPages = Math.ceil(sortedRisks.length / itemsPerPage);
    setPagination({
      current: currentPage,
      total: totalPages || 1,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      totalCount: sortedRisks.length,
      limit: itemsPerPage,
    });
    setRisks(paginatedRisks);
    calculateStats(sortedRisks);
  }, [sortedRisks, currentPage, itemsPerPage, paginatedRisks]);

  // ====== API Calls ======

  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);

      const response = await riskApiWithErrorHandling.getAllRisksByEvent(
        eventId,
        {}
      );

      if (response.success) {
        const apiRisks = response.data || [];
        const transformedRisks = apiRisks.map(transformApiRiskToComponent);
        setAllRisks(transformedRisks);
      } else {
        console.error("Failed to fetch risks:", response.error);
        toast.error("Không thể tải danh sách rủi ro. Vui lòng thử lại.", {
          position: "top-right",
          autoClose: 4000,
        });
        setAllRisks([]);
      }
    } catch (error) {
      console.error("Error fetching risks:", error);
      toast.error("Lỗi khi tải dữ liệu. Vui lòng kiểm tra kết nối.", {
        position: "top-right",
        autoClose: 4000,
      });
      setAllRisks([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getDepartments(eventId);

      const departmentsList = response?.data || [];
      setDepartments(departmentsList);

      // Don't auto-select first department - let user choose manually
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Lỗi khi tải danh sách ban. Vui lòng thử lại.", {
        position: "top-right",
        autoClose: 4000,
      });
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  }, [eventId]);

  const createRisk = async () => {
    // Check required fields
    const missingFields = [];
    if (!newRisk.name) missingFields.push("tên rủi ro");
    if (!newRisk.risk_mitigation_plan) missingFields.push("kế hoạch giảm thiểu");
    if (!newRisk.risk_response_plan) missingFields.push("Phương án giải quyết");

    // Only require departmentId when scope is "department"
    if (newRisk.scope === "department" && !newRisk.departmentId) {
      missingFields.push("ban phụ trách");
    }

    // Require custom category when "others" is selected
    if (newRisk.risk_category === "others" && !newRisk.custom_category?.trim()) {
      missingFields.push("danh mục tùy chỉnh");
    }

    if (missingFields.length > 0) {
      toast.error(`Vui lòng điền đầy đủ thông tin cho: ${missingFields.join(", ")}`, {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading("Đang tạo rủi ro...", {
      position: "top-right",
    });

    try {
      setSubmitting(true);

      // Prepare payload - exclude departmentId if scope is "event"
      const payload = { ...newRisk };
      if (payload.scope === "event") {
        delete payload.departmentId;
      }

      // If "others" is selected, use custom_category as risk_category
      if (payload.risk_category === "others" && payload.custom_category) {
        payload.risk_category = payload.custom_category.trim();
      }
      // Remove custom_category from payload
      delete payload.custom_category;

      const response = await riskApiWithErrorHandling.createRisk(
        eventId,
        payload
      );

      if (response.success) {
        toast.update(loadingToast, {
          render: `Đã thêm rủi ro "${newRisk.name}" thành công!`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        setShowAddModal(false);
        setNewRisk({
          name: "",
          scope: "department",
          departmentId: "",
          risk_category: "infrastructure",
          custom_category: "",
          impact: "medium",
          likelihood: "medium",
          risk_mitigation_plan: "",
          risk_response_plan: "",
        });
        fetchRisks();
      } else {
        toast.update(loadingToast, {
          render: response.error || "Không thể tạo rủi ro. Vui lòng thử lại.",
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
      }
    } catch (error) {
      console.error("Error creating risk:", error);
      toast.update(loadingToast, {
        render: "Lỗi khi tạo rủi ro. Vui lòng kiểm tra kết nối và thử lại.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (risk) => {
    setRiskToDelete(risk);
    setShowDeleteModal(true);
  };

  const deleteRisk = async () => {
    if (!riskToDelete) return;

    const loadingToast = toast.loading(`Đang xóa rủi ro "${riskToDelete.name}"...`, {
      position: "top-right",
    });

    setIsDeleting(true);
    try {
      const response = await riskApiWithErrorHandling.deleteRisk(
        eventId,
        riskToDelete.originalData._id
      );
      if (response.success) {
        toast.update(loadingToast, {
          render: `✅ Đã xóa rủi ro "${riskToDelete.name}" thành công!`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        setShowDeleteModal(false);
        setRiskToDelete(null);
        fetchRisks();
      } else {
        toast.update(loadingToast, {
          render: response.error || "Không thể xóa rủi ro. Vui lòng thử lại.",
          type: "error",
          isLoading: false,
          autoClose: 4000,
        });
      }
    } catch (error) {
      console.error("Error deleting risk:", error);
      toast.update(loadingToast, {
        render: "Lỗi khi xóa rủi ro. Vui lòng kiểm tra kết nối và thử lại.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ====== Event Handlers ======

  const handleRiskClick = (risk) => {
    // Navigate to detail page
    navigate(`/events/${eventId}/risks/detail/${risk.id}`);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    document.querySelector(".rounded-table")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleShowAddModal = () => {
    if (departments.length === 0) {
      fetchDepartments();
    }

    // Auto-select department for HoD
    if (memberInfo.role === "HoD" && memberInfo.departmentId) {
      setNewRisk((prev) => ({
        ...prev,
        departmentId: memberInfo.departmentId,
      }));
    }

    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewRisk({
      name: "",
      scope: "department",
      departmentId: "",
      risk_category: "infrastructure",
      custom_category: "",
      impact: "medium",
      likelihood: "medium",
      risk_mitigation_plan: "",
      risk_response_plan: "",
    });
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // ====== Effects ======

  useEffect(() => {
    if (eventId) {
      fetchDepartments();
      fetchRisks();
    }
  }, [eventId, fetchDepartments, fetchRisks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterLevel, filterCategory, filterDepartment, filterLikelihood]);

  useEffect(() => {
    fetchEventRole(eventId).then((role) => {
      setEventRole(role);
      // Also get full member info including departmentId
      const member = getEventMember(eventId);
      setMemberInfo(member);
    });
  }, [eventId, fetchEventRole, getEventMember]);

  // ====== UI Logic ======

  const getLevelStyleAndIcon = (level) => {
    if (["Cao", "high", "Rất cao", "very_high"].includes(level)) {
      return { color: "#B91C1C", icon: "↑" };
    }
    if (["Thấp", "low", "Rất thấp", "very_low"].includes(level)) {
      return { color: "#666", icon: "↓" };
    }
    return { color: "#D97706", icon: "≈" };
  };

  const getSidebarType = () => {
    if (eventRole === "HoOC") return "HoOC";
    if (eventRole === "HoD") return "HoD";
    if (eventRole === "Member") return "Member";
    return "user";
  };

  const renderPagination = () => {
    if (pagination.total <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(
      1,
      pagination.current - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(pagination.total, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        className={`btn btn-sm ${
          !pagination.hasPrev ? "btn-outline-secondary" : "btn-outline-primary"
        }`}
        onClick={() => handlePageChange(pagination.current - 1)}
        disabled={!pagination.hasPrev}
        style={{ margin: "0 2px" }}
      >
        «
      </button>
    );

    // First page
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          className={`btn btn-sm ${
            pagination.current === 1 ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => handlePageChange(1)}
          style={{ margin: "0 2px" }}
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="ellipsis1" style={{ margin: "0 8px" }}>
            …
          </span>
        );
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`btn btn-sm ${
            pagination.current === i ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => handlePageChange(i)}
          style={{ margin: "0 2px" }}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < pagination.total) {
      if (endPage < pagination.total - 1) {
        pages.push(
          <span key="ellipsis2" style={{ margin: "0 8px" }}>
            …
          </span>
        );
      }
      pages.push(
        <button
          key={pagination.total}
          className={`btn btn-sm ${
            pagination.current === pagination.total
              ? "btn-primary"
              : "btn-outline-primary"
          }`}
          onClick={() => handlePageChange(pagination.total)}
          style={{ margin: "0 2px" }}
        >
          {pagination.total}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        className={`btn btn-sm ${
          !pagination.hasNext ? "btn-outline-secondary" : "btn-outline-primary"
        }`}
        onClick={() => handlePageChange(pagination.current + 1)}
        disabled={!pagination.hasNext}
        style={{ margin: "0 2px" }}
      >
        »
      </button>
    );

    return (
      <div className="d-flex justify-content-between align-items-center">
        <small className="text-muted">
          Hiển thị {(pagination.current - 1) * pagination.limit + 1} -{" "}
          {Math.min(
            pagination.current * pagination.limit,
            pagination.totalCount
          )}{" "}
          trong {pagination.totalCount} rủi ro
        </small>
        <div className="d-flex align-items-center">{pages}</div>
      </div>
    );
  };

  return (
    <UserLayout
      title={t("riskPage.title")}
      activePage={"risk" && "risk-list"}
      sidebarType={getSidebarType()}
      eventId={eventId}
    >
      <style>{`
        .task-header { background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px; }
        .stat-card { background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .soft-input { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; height: 44px; transition: all 0.2s; }
        .soft-input:focus { background: white; border-color: #EF4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
        .soft-card { background: white; border: 1px solid #E5E7EB; border-radius: 16px; box-shadow: 0 1px 3px rgba(16,24,40,.06); }

        .risk-row { cursor: pointer; transition: background 0.2s; }
        .risk-row:hover { background: #F9FAFB; }

        .rounded-table { border-radius: 16px; overflow: hidden; }
        .rounded-table table { margin-bottom: 0; }
        .rounded-table thead { background: #F9FAFB; }
        .rounded-table thead th { border-bottom: 2px solid #E5E7EB !important; cursor: pointer; user-select: none; }
        .rounded-table thead th:hover { background: #F3F4F6; }
        .rounded-table tbody tr:not(:last-child) td { border-bottom: 1px solid #EEF2F7; }

        .col-name { padding-left: 20px !important; }

        .loading-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 500;
          color: #6B7280;
          margin-bottom: 4px;
        }

        .pagination-info {
          background: #F9FAFB;
          padding: 12px 20px;
          border-top: 1px solid #E5E7EB;
          border-radius: 0 0 16px 16px;
        }

        .sort-icon {
          margin-left: 4px;
          font-size: 12px;
          opacity: 0.6;
        }

        .occurred-badge {
          background: #EF4444;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 12px;
          margin-left: 8px;
        }

        @media (max-width: 768px) {
          .filters-row {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-group {
            width: 100%;
          }
          .ms-auto {
            margin-left: 0 !important;
            margin-top: 1rem;
          }
        }
      `}</style>

      <div className="container-fluid" style={{ maxWidth: 1200 }}>
        {/* Header thống kê */}
        <div className="task-header">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h3 className="mb-2">Quản lý rủi ro</h3>
              <p className="mb-0 opacity-75">
                Theo dõi và quản lý các rủi ro trong sự kiện
              </p>
            </div>
            <div className="col-md-6">
              <div className="row g-2">
                <div className="col-6">
                  <div
                    className="stat-card text-center"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      color: "white",
                    }}
                  >
                    <div className="fs-4 fw-bold">
                      {loading
                        ? "..."
                        : `${statistics.high}/${statistics.total}`}
                    </div>
                    <div className="small">Rủi ro mức cao</div>
                  </div>
                </div>
                <div className="col-6">
                  <div
                    className="stat-card text-center"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      border: "none",
                      color: "white",
                    }}
                  >
                    <div className="fs-4 fw-bold">
                      {loading ? "..." : pagination.totalCount}
                    </div>
                    <div className="small">Tổng rủi ro</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="d-flex align-items-center gap-3 mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên rủi ro..."
            className="form-control soft-input"
            style={{ width: 400, paddingLeft: 16 }}
            disabled={loading}
          />
          {eventRole !== "Member" && (
            <div className="ms-auto">
              <button
                className="add-btn"
                onClick={handleShowAddModal}
                disabled={loading}
                style={{
                  background: loading ? "#ccc" : "#EF4444",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontWeight: 500,
                }}
              >
                + Thêm rủi ro
              </button>
            </div>
          )}
        </div>

        {/* Filters Row */}
        <div className="filters-row">
          <div className="filter-group">
            <div className="filter-label">Mức độ ảnh hưởng</div>
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 160, height: 40 }}
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              disabled={loading}
            >
              <option value="Tất cả">Tất cả mức độ</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>
          </div>
          <div className="filter-group">
            <div className="filter-label">Khả năng xảy ra</div>
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 160, height: 40 }}
              value={filterLikelihood}
              onChange={(e) => setFilterLikelihood(e.target.value)}
              disabled={loading}
            >
              <option value="Tất cả">Tất cả khả năng</option>
              <option value="very_high">Rất cao</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
              <option value="very_low">Rất thấp</option>
            </select>
          </div>

          <div className="filter-group">
            <div className="filter-label">Danh mục</div>
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 180, height: 40 }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              disabled={loading}
            >
              <option value="Tất cả">Tất cả danh mục</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <div className="filter-label">Ban phụ trách</div>
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 180, height: 40 }}
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              disabled={loading}
            >
              <option value="Tất cả">Tất cả ban</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters button */}
          {(filterLevel !== "Tất cả" ||
            filterLikelihood !== "Tất cả" ||
            filterCategory !== "Tất cả" ||
            filterDepartment !== "Tất cả" ||
            search) && (
            <div className="filter-group">
              <div className="filter-label">&nbsp;</div>
              <button
                className="btn btn-outline-secondary btn-sm"
                style={{ height: 40, padding: "8px 16px" }}
                onClick={() => {
                  setFilterLevel("Tất cả");
                  setFilterLikelihood("Tất cả");
                  setFilterCategory("Tất cả");
                  setFilterDepartment("Tất cả");
                  setSearch("");
                }}
                disabled={loading}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Bảng rủi ro */}
        <div className="soft-card rounded-table">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr className="text-muted">
                  <th
                    className="py-3"
                    style={{ width: "13%", paddingLeft: 16 }}
                  >
                    Danh mục
                  </th>
                  <th
                    className="py-3 col-name"
                    style={{ width: "35%" }}
                    onClick={() => handleSortChange("name")}
                  >
                    Tên rủi ro
                    <span className="sort-icon">
                      {sortBy === "name"
                        ? sortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>
                  <th
                    className="py-3"
                    style={{ width: "13%" }}
                    onClick={() => handleSortChange("owner")}
                  >
                    Ban phụ trách
                    <span className="sort-icon">
                      {sortBy === "owner"
                        ? sortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>

                  <th
                    className="py-3"
                    style={{ width: "15%" }}
                    onClick={() => handleSortChange("impact")}
                  >
                    Mức độ ảnh hưởng
                    <span className="sort-icon">
                      {sortBy === "impact"
                        ? sortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>
                  <th
                    className="py-3"
                    style={{ width: "15%" }}
                    onClick={() => handleSortChange("likelihood")}
                  >
                    Khả năng xảy ra
                    <span className="sort-icon">
                      {sortBy === "likelihood"
                        ? sortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </th>
                  <th
                    className="py-3"
                    style={{ width: "9%", paddingRight: 14 }}
                  >
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <Loading />
                    </td>
                  </tr>
                ) : risks.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <div style={{ fontSize: 48 }}><UmbrellaOff size="48px"/></div>
                      <div className="mt-2">
                        {pagination.totalCount === 0
                          ? "Chưa có rủi ro nào"
                          : "Không tìm thấy rủi ro phù hợp với bộ lọc"}
                      </div>
                      {(filterLevel !== "Tất cả" ||
                        filterLikelihood !== "Tất cả" ||
                        filterCategory !== "Tất cả" ||
                        filterDepartment !== "Tất cả" ||
                        search) && (
                        <button
                          className="btn btn-link btn-sm mt-2"
                          onClick={() => {
                            setFilterLevel("Tất cả");
                            setFilterLikelihood("Tất cả");
                            setFilterCategory("Tất cả");
                            setFilterDepartment("Tất cả");
                            setSearch("");
                          }}
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  risks.map((r) => (
                    <tr
                      key={r.id}
                      className="risk-row"
                      onClick={() => handleRiskClick(r)}
                    >
                      <td className="py-3" style={{ paddingLeft: 16 }}>
                        <span className="small text-muted">{r.category}</span>
                      </td>
                      <td className="py-3 col-name">
                        <div className="fw-medium d-flex align-items-center">
                          {r.name}
                          {r.hasOccurred && (
                            <span className="occurred-badge">
                              {r.occurredCount} Sự cố
                            </span>
                          )}
                          {r.pendingOccurred > 0 && (
                            <span
                              className="occurred-badge"
                              style={{ background: "#F59E0B" }}
                            >
                              {r.pendingOccurred} Chờ xử lý
                            </span>
                          )}
                        </div>
                        <div
                          style={{ fontSize: "10px" }}
                          className="small text-muted"
                        >
                          {r.description?.substring(0, 60)}
                          {r.description?.length > 60 ? "..." : ""}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="small fw-medium text-muted">
                          {r.owner}
                        </span>
                      </td>

                      <td className="py-3 ">
                        {(() => {
                          const { color, icon } = getLevelStyleAndIcon(r.level);
                          return (
                            <span
                              style={{ color, fontWeight: 500, fontSize: 14 }}
                            >
                              <span style={{ marginRight: 2 }}>{icon}</span>{" "}
                              {r.level}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 ">
                        {(() => {
                          const { color, icon } = getLevelStyleAndIcon(
                            r.likelihoodLabel
                          );
                          return (
                            <span
                              style={{ color, fontWeight: 500, fontSize: 14 }}
                            >
                              <span style={{ marginRight: 2 }}>{icon}</span>{" "}
                              {r.likelihoodLabel}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3">
                        <span
                          className="small fw-medium"
                          style={{
                            color:
                              r.statusKey === "resolved"
                                ? "#16A34A"
                                : r.statusKey === "resolving"
                                ? "#D97706"
                                : "#6B7280",
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && risks.length > 0 && (
            <div className="pagination-info">{renderPagination()}</div>
          )}
        </div>
      </div>

      {/* Create Risk Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 3000,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              width: "90%",
              maxWidth: 700,
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h5 style={{ margin: 0, fontWeight: 600 }}>➕ Thêm rủi ro mới</h5>
              <button
                className="btn btn-sm btn-light rounded-circle"
                style={{ width: 32, height: 32, border: "none" }}
                onClick={handleCloseAddModal}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: 24,
                flex: 1,
                overflow: "auto",
              }}
            >
              <div className="form-group">
                <label>Tên rủi ro *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newRisk.name}
                  onChange={(e) =>
                    setNewRisk({ ...newRisk, name: e.target.value })
                  }
                  placeholder="Nhập tên rủi ro…"
                />
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Phạm vi rủi ro *</label>
                    <select
                      className="form-select"
                      value={newRisk.scope}
                      onChange={(e) => {
                        const newScope = e.target.value;
                        setNewRisk({
                          ...newRisk,
                          scope: newScope,
                          // Clear departmentId if scope changes to event
                          departmentId: newScope === "event" ? "" : newRisk.departmentId
                        });
                      }}
                    >
                      <option value="department">Theo ban</option>
                      <option value="event">Toàn BTC</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Ban phụ trách {newRisk.scope === "department" ? "*" : ""}</label>
                    <select
                      className="form-select"
                      value={newRisk.departmentId}
                      onChange={(e) =>
                        setNewRisk({ ...newRisk, departmentId: e.target.value })
                      }
                      disabled={loadingDepartments || newRisk.scope === "event" || (memberInfo.role === "HoD" && memberInfo.departmentId)}
                    >
                      <option value="">{newRisk.scope === "event" ? "Không áp dụng" : "Chọn ban phụ trách"}</option>
                      {departments
                        .filter((dept) => {
                          // HoOC can see all departments
                          if (memberInfo.role === "HoOC") return true;
                          // HoD can only see their department
                          if (memberInfo.role === "HoD" && memberInfo.departmentId) {
                            return dept._id === memberInfo.departmentId;
                          }
                          return true;
                        })
                        .map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name}
                          </option>
                        ))}
                    </select>
                    {loadingDepartments && (
                      <small className="text-muted">
                        Đang tải danh sách ban...
                      </small>
                    )}
                    {newRisk.scope === "event" && (
                      <small className="text-muted">
                        Rủi ro này áp dụng cho toàn bộ BTC
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Danh mục</label>
                    <select
                      className="form-select"
                      value={newRisk.risk_category}
                      onChange={(e) =>
                        setNewRisk({
                          ...newRisk,
                          risk_category: e.target.value,
                          custom_category: e.target.value !== "others" ? "" : newRisk.custom_category,
                        })
                      }
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {newRisk.risk_category === "others" && (
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>Danh mục tùy chỉnh *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newRisk.custom_category}
                        onChange={(e) =>
                          setNewRisk({
                            ...newRisk,
                            custom_category: e.target.value,
                          })
                        }
                        placeholder="Nhập tên danh mục tùy chỉnh..."
                      />
                      <small className="text-muted">Ví dụ: Âm thanh, Ánh sáng, An ninh, ...</small>
                    </div>
                  </div>
                )}
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Mức độ tác động</label>
                    <select
                      className="form-select"
                      value={newRisk.impact}
                      onChange={(e) =>
                        setNewRisk({ ...newRisk, impact: e.target.value })
                      }
                    >
                      <option value="high">Cao</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Khả năng xảy ra</label>
                    <select
                      className="form-select"
                      value={newRisk.likelihood}
                      onChange={(e) =>
                        setNewRisk({ ...newRisk, likelihood: e.target.value })
                      }
                    >
                      <option value="very_high">Rất cao</option>
                      <option value="high">Cao</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                      <option value="very_low">Rất thấp</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Kế hoạch giảm thiểu *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={newRisk.risk_mitigation_plan}
                  onChange={(e) =>
                    setNewRisk({
                      ...newRisk,
                      risk_mitigation_plan: e.target.value,
                    })
                  }
                  placeholder="Mô tả kế hoạch giảm thiểu rủi ro…"
                />
              </div>

              <div className="form-group">
                <label>Phương án giải quyết *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={newRisk.risk_response_plan}
                  onChange={(e) =>
                    setNewRisk({
                      ...newRisk,
                      risk_response_plan: e.target.value,
                    })
                  }
                  placeholder="Mô tả phương án giải quyết khi rủi ro xảy ra…"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <button
                className="btn btn-outline-secondary"
                onClick={handleCloseAddModal}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary d-flex align-items-center justify-content-center"
                onClick={createRisk}
                disabled={submitting || (newRisk.scope === "department" && !newRisk.departmentId)}
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-clockwise spin-animation me-2"></i>
                    Đang thêm...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-lg me-2"></i>
                    Thêm rủi ro
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setRiskToDelete(null);
        }}
        onConfirm={deleteRisk}
        message="Bạn có chắc muốn xóa rủi ro này?"
        isLoading={isDeleting}
      />
    </UserLayout>
  );
}
