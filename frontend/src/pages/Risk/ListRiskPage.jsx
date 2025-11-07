import { useEffect, useMemo, useState, useCallback } from "react";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useEvents } from "~/contexts/EventContext";
import { useParams } from "react-router-dom";
import riskApi from "~/apis/riskApi"; // Import API
import {departmentApi} from "~/apis/departmentApi"; // Import Department API
import { toast } from "react-toastify"; // For notifications
import ConfirmModal from "../../components/ConfirmModal";

export default function ListRiskPage() {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Tên");
  const [filterLevel, setFilterLevel] = useState("Tất cả");
  const [filterCategory, setFilterCategory] = useState("Tất cả");
  const [filterDepartment, setFilterDepartment] = useState("Tất cả");
  const [eventRole, setEventRole] = useState('');
  const { fetchEventRole } = useEvents();
  
  // ====== Pagination States ======
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  
  // ====== API States ======
  const [risks, setRisks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    high: 0,
    resolved: 0
  });

  // ====== Modal thêm ======
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRisk, setNewRisk] = useState({
    name: "",
    departmentId: "",
    risk_category: "others",
    impact: "medium",
    risk_mitigation_plan: "",
    risk_response_plan: "",
  });

  // ====== Detail Modal & Edit States ======
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingChanges, setSavingChanges] = useState(false);
  
  // ====== Delete Confirmation Modal ======
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState(null);

  // ====== Risk Category Mappings ======
  const categoryLabels = {
    'infrastructure': 'Cơ sở vật chất',
    'mc-guests': 'MC & Khách mời',
    'communication': 'Truyền thông',
    'players': 'Người chơi',
    'staffing': 'Nhân sự',
    'communication_post': 'Tuyến bài',
    'attendees': 'Người tham gia',
    'weather': 'Thời tiết',
    'time': 'Thời gian',
    'timeline': 'Timeline',
    'tickets': 'Vé',
    'collateral': 'Ấn phẩm',
    'game': 'Game',
    'sponsorship': 'Nhà tài trợ',
    'finance': 'Tài chính',
    'transportation': 'Vận chuyển',
    'decor': 'Đồ trang trí',
    'others': 'Khác'
  };

  // ====== Helper Functions ======
  
  const mapImpactToLevel = (impact) => {
    switch (impact) {
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return 'Trung bình';
    }
  };

  const mapLevelToImpact = (level) => {
    switch (level) {
      case 'Cao': return 'high';
      case 'Trung bình': return 'medium';
      case 'Thấp': return 'low';
      default: return 'medium';
    }
  };

  const getDisplayStatus = (apiRisk) => {
    return "Đang theo dõi";
  };

  const transformApiRiskToComponent = (apiRisk) => ({
    id: apiRisk._id,
    name: apiRisk.name,
    owner: apiRisk.departmentId?.name || "Unknown Department",
    ownerId: apiRisk.departmentId?._id,
    status: getDisplayStatus(apiRisk),
    level: mapImpactToLevel(apiRisk.impact),
    description: apiRisk.risk_mitigation_plan,
    mitigation: apiRisk.risk_response_plan,
    category: categoryLabels[apiRisk.risk_category] || apiRisk.risk_category,
    categoryKey: apiRisk.risk_category,
    originalData: apiRisk
  });

  const calculateStats = (riskList) => {
    setStatistics({
      total: riskList.length,
      high: riskList.filter(r => r.level === "Cao").length,
      resolved: riskList.filter(r => r.status === "Đã xử lý").length,
    });
  };

  // Get unique departments and categories for filters
  const uniqueDepartments = useMemo(() => {
    const departments = [...new Set(risks.map(r => r.owner))].filter(Boolean);
    return departments.sort();
  }, [risks]);

  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(risks.map(r => r.category))].filter(Boolean);
    return categories.sort();
  }, [risks]);

  // ====== Pagination Logic ======
  
  const filteredRisks = useMemo(() => {
    return risks
      .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
      .filter((r) => filterLevel === "Tất cả" || r.level === filterLevel)
      .filter((r) => filterCategory === "Tất cả" || r.category === filterCategory)
      .filter((r) => filterDepartment === "Tất cả" || r.owner === filterDepartment)
      .sort((a, b) => {
        const priorityOrder = { Cao: 3, "Trung bình": 2, Thấp: 1 };
        if (sortBy === "Tên") return a.name.localeCompare(b.name);
        if (sortBy === "Mức độ")
          return priorityOrder[b.level] - priorityOrder[a.level];
        if (sortBy === "Danh mục") return a.category.localeCompare(b.category);
        if (sortBy === "Ban") return a.owner.localeCompare(b.owner);
        return 0;
      });
  }, [risks, search, filterLevel, filterCategory, filterDepartment, sortBy]);

  const totalPages = Math.ceil(filteredRisks.length / itemsPerPage);
  
  const paginatedRisks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRisks.slice(startIndex, endIndex);
  }, [filteredRisks, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    document.querySelector('.rounded-table')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterLevel, filterCategory, filterDepartment]);

  // ====== API Calls ======
  
  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await riskApi.listRisksByEvent(eventId);
      
      if (response.success) {
        const apiRisks = response.data || [];
        const transformedRisks = apiRisks.map(transformApiRiskToComponent);
        setRisks(transformedRisks);
        calculateStats(transformedRisks);
      } else {
        console.error('Failed to fetch risks:', response.message);
        toast.error('Không thể tải danh sách rủi ro');
      }
    } catch (error) {
      console.error('Error fetching risks:', error);
      toast.error('Lỗi khi tải dữ liệu');
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
      
      if (departmentsList.length > 0) {
        setNewRisk(prev => ({ ...prev, departmentId: departmentsList[0]._id }));
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Lỗi khi tải dữ liệu ban');
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  }, [eventId]);

  const createRisk = async () => {
    if (!newRisk.name || !newRisk.risk_mitigation_plan || !newRisk.departmentId) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setSubmitting(true);
      const response = await riskApi.createRisk(eventId, newRisk);

      if (response.success) {
        toast.success('Thêm rủi ro thành công!');
        setShowAddModal(false);
        setNewRisk({
          name: "",
          departmentId: departments.length > 0 ? departments[0]._id : "",
          risk_category: "others",
          impact: "medium",
          risk_mitigation_plan: "",
          risk_response_plan: "",
        });
        fetchRisks();
      } else {
        toast.error(response.message || 'Không thể tạo rủi ro');
      }
    } catch (error) {
      console.error('Error creating risk:', error);
      toast.error('Lỗi khi tạo rủi ro');
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

    try {
      const response = await riskApi.deleteRisk(eventId, riskToDelete.originalData._id);
      if (response.success) {
        toast.success('Xóa rủi ro thành công!');
        setSelectedRisk(null);
        setShowDetailModal(false);
        setShowDeleteModal(false);
        setRiskToDelete(null);
        fetchRisks();
      } else {
        toast.error('Không thể xóa rủi ro');
      }
    } catch (error) {
      console.error('Error deleting risk:', error);
      toast.error('Lỗi khi xóa rủi ro');
    }
  };

  // ====== Event Handlers ======
  
  const handleRiskClick = (risk) => {
    setSelectedRisk(risk);
    setIsEditing(false);
    setEditForm({
      name: risk.name,
      description: risk.description || "",
      mitigation: risk.mitigation || "",
      level: risk.level
    });
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setSelectedRisk(null);
    setShowDetailModal(false);
    setIsEditing(false);
    setEditForm({});
    setSavingChanges(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: selectedRisk.name,
      description: selectedRisk.description || "",
      mitigation: selectedRisk.mitigation || "",
      level: selectedRisk.level
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error('Tên rủi ro không được để trống');
      return;
    }

    try {
      setSavingChanges(true);
      const updateData = {
        name: editForm.name,
        risk_mitigation_plan: editForm.description,
        risk_response_plan: editForm.mitigation,
        impact: mapLevelToImpact(editForm.level)
      };

      const response = await riskApi.updateRisk(eventId, selectedRisk.originalData._id, updateData);
      
      if (response.success) {
        toast.success('Cập nhật thành công!');
        
        // Update local state
        setRisks(prev => prev.map(r => 
          r.id === selectedRisk.id 
            ? { 
                ...r, 
                name: editForm.name,
                description: editForm.description,
                mitigation: editForm.mitigation,
                level: editForm.level
              } 
            : r
        ));
        
        // Update selected risk
        setSelectedRisk(prev => ({
          ...prev,
          name: editForm.name,
          description: editForm.description,
          mitigation: editForm.mitigation,
          level: editForm.level
        }));
        
        setIsEditing(false);
      } else {
        toast.error(response.message || 'Không thể cập nhật');
      }
    } catch (error) {
      console.error('Error updating risk:', error);
      toast.error('Lỗi khi cập nhật');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleShowAddModal = () => {
    if (departments.length === 0) {
      fetchDepartments();
    }
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewRisk({
      name: "",
      departmentId: departments.length > 0 ? departments[0]._id : "",
      risk_category: "others",
      impact: "medium",
      risk_mitigation_plan: "",
      risk_response_plan: "",
    });
  };

  const handleDepartmentFilterChange = (value) => {
    setFilterDepartment(value);
  };

  const handleCategoryFilterChange = (value) => {
    setFilterCategory(value);
  };

  // ====== Effects ======
  
  useEffect(() => {
    if (eventId) {
      fetchRisks();
      fetchDepartments();
    }
  }, [eventId, fetchRisks, fetchDepartments]);

  useEffect(() => {
    fetchEventRole(eventId).then(role => {
      setEventRole(role);
    });
  }, [eventId, fetchEventRole]);

  // ====== UI Logic ======
  
  const levelChipStyle = (lv) => {
    if (lv === "Cao")
      return { bg: "#FEF2F2", color: "#B91C1C", border: "#DC2626" };
    if (lv === "Thấp")
      return { bg: "#F0FDF4", color: "#15803D", border: "#16A34A" };
    return { bg: "#FFFBEB", color: "#D97706", border: "#F59E0B" };
  };

  const getSidebarType = () => {
    if (eventRole === 'HoOC') return 'HoOC';
    if (eventRole === 'HoD') return 'HoD';
    if (eventRole === 'Member') return 'Member';
    return 'user';
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        className={`btn btn-sm ${currentPage === 1 ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{ margin: '0 2px' }}
      >
        «
      </button>
    );

    // First page
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          className={`btn btn-sm ${currentPage === 1 ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handlePageChange(1)}
          style={{ margin: '0 2px' }}
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" style={{ margin: '0 8px' }}>…</span>);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`btn btn-sm ${currentPage === i ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handlePageChange(i)}
          style={{ margin: '0 2px' }}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" style={{ margin: '0 8px' }}>…</span>);
      }
      pages.push(
        <button
          key={totalPages}
          className={`btn btn-sm ${currentPage === totalPages ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handlePageChange(totalPages)}
          style={{ margin: '0 2px' }}
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        className={`btn btn-sm ${currentPage === totalPages ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{ margin: '0 2px' }}
      >
        »
      </button>
    );

    return (
      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">
          Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredRisks.length)} 
          {' '}trong {filteredRisks.length} rủi ro
          {filteredRisks.length !== risks.length && ` (lọc từ ${risks.length} tổng)`}
        </small>
        <div className="d-flex align-items-center">
          {pages}
        </div>
      </div>
    );
  };

  return (
    <UserLayout
      title={t("riskPage.title")}
      activePage={"risk" && "risk-list"}
      sidebarType={getSidebarType()}>
      <style>{`
        .task-header { background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px; }
        .stat-card { background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .soft-input { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; height: 44px; transition: all 0.2s; }
        .soft-input:focus { background: white; border-color: #EF4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
        .soft-card { background: white; border: 1px solid #E5E7EB; border-radius: 16px; box-shadow: 0 1px 3px rgba(16,24,40,.06); }

        .risk-row { cursor: pointer; transition: background 0.2s; }
        .risk-row:hover { background: #F9FAFB; }
        .chip { 
          padding: 6px 8px; 
          border-radius: 20px; 
          font-size: 12px; 
          font-weight: 600; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          border: 2px solid; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center;
          min-width: 110px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .chip-level { 
          border: 2px solid; 
        }

        .rounded-table { border-radius: 16px; overflow: hidden; }
        .rounded-table table { margin-bottom: 0; }
        .rounded-table thead { background: #F9FAFB; }
        .rounded-table thead th { border-bottom: 2px solid #E5E7EB !important; }
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
              <p className="mb-0 opacity-75">Theo dõi và quản lý các rủi ro trong sự kiện</p>
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
                      {loading ? '...' : `${statistics.high}/${statistics.total}`}
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
                      {loading ? '...' : filteredRisks.length}
                    </div>
                    <div className="small">Rủi ro</div>
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
            <div className="filter-label">Danh mục</div>
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 180, height: 40 }}
              value={filterCategory}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              disabled={loading}
            >
              <option value="Tất cả">Tất cả danh mục</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <div className="filter-label">Ban phụ trách</div>
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 180, height: 40 }}
              value={filterDepartment}
              onChange={(e) => handleDepartmentFilterChange(e.target.value)}
              disabled={loading}
            >
              <option value="Tất cả">Tất cả ban</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <div className="filter-label">Sắp xếp theo</div>
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 140, height: 40 }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              disabled={loading}
            >
              <option value="Tên">Tên A-Z</option>
              <option value="Mức độ">Mức độ</option>
              <option value="Danh mục">Danh mục</option>
              <option value="Ban">Ban phụ trách</option>
            </select>
          </div>

          {/* Clear filters button */}
          {(filterLevel !== "Tất cả" || filterCategory !== "Tất cả" || filterDepartment !== "Tất cả" || search) && (
            <div className="filter-group">
              <div className="filter-label">&nbsp;</div>
              <button
                className="btn btn-outline-secondary btn-sm"
                style={{ height: 40, padding: "8px 16px" }}
                onClick={() => {
                  setFilterLevel("Tất cả");
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
                  <th className="py-3 col-name" style={{ width: "50%" }}>
                    Tên rủi ro
                  </th>
                  <th className="py-3" style={{ width: "20%" }}>
                    Ban phụ trách
                  </th>
                  <th className="py-3" style={{ width: "15%" }}>
                    Danh mục
                  </th>
                  <th className="py-3" style={{ width: "15%" }}>
                    Mức độ ảnh hưởng
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5">
                      <div className="loading-spinner"></div>
                      <div className="mt-2 text-muted">Đang tải...</div>
                    </td>
                  </tr>
                ) : paginatedRisks.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      <div style={{ fontSize: 48 }}>🫙</div>
                      <div className="mt-2">
                        {risks.length === 0 
                          ? 'Chưa có rủi ro nào' 
                          : 'Không tìm thấy rủi ro phù hợp với bộ lọc'
                        }
                      </div>
                      {(filterLevel !== "Tất cả" || filterCategory !== "Tất cả" || filterDepartment !== "Tất cả" || search) && (
                        <button
                          className="btn btn-link btn-sm mt-2"
                          onClick={() => {
                            setFilterLevel("Tất cả");
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
                  paginatedRisks.map((r) => (
                    <tr
                      key={r.id}
                      className="risk-row"
                      onClick={() => handleRiskClick(r)}
                    >
                      <td className="py-3 col-name">
                        <div className="fw-medium">{r.name}</div>
                        <div style={{fontSize:"12px"}} className="small text-muted">
                          {r.description?.substring(0, 80)}
                          {r.description?.length > 80 ? '...' : ''}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="small fw-medium text-muted">{r.owner}</span>
                      </td>
                      <td className="py-3">
                        <span className="small text-muted">{r.category}</span>
                      </td>
                      <td className="py-3">
                        <span
                          className="chip chip-level"
                          style={{
                            background: levelChipStyle(r.level).bg,
                            color: levelChipStyle(r.level).color,
                            borderColor: levelChipStyle(r.level).border,
                          }}
                        >
                          {r.level}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredRisks.length > 0 && (
            <div className="pagination-info">
              {renderPagination()}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRisk && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 3000,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            width: '90%',
            maxWidth: 700,
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontWeight: 600 }}>
                {isEditing ? '✏️ Chỉnh sửa rủi ro' : 'Chi tiết rủi ro'}
              </h5>
              <button
                className="btn btn-sm btn-light rounded-circle"
                style={{ width: 32, height: 32, border: 'none' }}
                onClick={handleCloseDetail}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: 24,
              flex: 1,
              overflow: 'auto'
            }}>
              <div className="form-group">
                <label>Tên rủi ro {isEditing && '*'}</label>
                {isEditing ? (
                  <input
                    className="form-control"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nhập tên rủi ro..."
                  />
                ) : (
                  <div style={{ 
                    padding: '8px 12px', 
                    background: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: 6,
                    fontWeight: 500 
                  }}>
                    {selectedRisk.name}
                  </div>
                )}
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Danh mục</label>
                    <div style={{ 
                      padding: '8px 12px', 
                      background: '#F9FAFB', 
                      border: '1px solid #E5E7EB', 
                      borderRadius: 6,
                      fontWeight: 500 
                    }}>
                      {selectedRisk.category}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Ban phụ trách</label>
                    <div style={{ 
                      padding: '8px 12px', 
                      background: '#F9FAFB', 
                      border: '1px solid #E5E7EB', 
                      borderRadius: 6,
                      fontWeight: 500 
                    }}>
                      {selectedRisk.owner}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Kế hoạch giảm thiểu {isEditing && '*'}</label>
                {isEditing ? (
                  <textarea
                    className="form-control"
                    rows={4}
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Mô tả kế hoạch giảm thiểu rủi ro…"
                  />
                ) : (
                  <div style={{ 
                    padding: '8px 12px', 
                    background: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: 6,
                    minHeight: 100,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedRisk.description || 'Chưa có mô tả'}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Kế hoạch ứng phó</label>
                {isEditing ? (
                  <textarea
                    className="form-control"
                    rows={4}
                    value={editForm.mitigation || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, mitigation: e.target.value }))}
                    placeholder="Mô tả kế hoạch ứng phó khi rủi ro xảy ra…"
                  />
                ) : (
                  <div style={{ 
                    padding: '8px 12px', 
                    background: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: 6,
                    minHeight: 100,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedRisk.mitigation || 'Chưa có kế hoạch'}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Mức độ tác động</label>
                {isEditing ? (
                  <select
                    className="form-select"
                    value={editForm.level || 'Trung bình'}
                    onChange={(e) => setEditForm(prev => ({ ...prev, level: e.target.value }))}
                  >
                    <option value="Cao">Cao</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Thấp">Thấp</option>
                  </select>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span
                      className="chip chip-level"
                      style={{
                        background: levelChipStyle(selectedRisk.level).bg,
                        color: levelChipStyle(selectedRisk.level).color,
                        borderColor: levelChipStyle(selectedRisk.level).border,
                      }}
                    >
                      {selectedRisk.level}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                {!isEditing && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteClick(selectedRisk)}
                  >
                    🗑️ Xóa rủi ro
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                {isEditing ? (
                  <>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={handleCancelEdit}
                      disabled={savingChanges}
                    >
                      Hủy
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveEdit}
                      disabled={savingChanges}
                    >
                      {savingChanges ? (
                        <>
                          <div className="loading-spinner me-2"></div>
                          Đang lưu...
                        </>
                      ) : (
                        '💾 Lưu thay đổi'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={handleCloseDetail}
                    >
                      Đóng
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleStartEdit}
                    >
                      ✏️ Chỉnh sửa
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Risk Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 3000,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            width: '90%',
            maxWidth: 700,
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontWeight: 600 }}>➕ Thêm rủi ro mới</h5>
              <button
                className="btn btn-sm btn-light rounded-circle"
                style={{ width: 32, height: 32, border: 'none' }}
                onClick={handleCloseAddModal}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: 24,
              flex: 1,
              overflow: 'auto'
            }}>
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
                    <label>Ban phụ trách *</label>
                    <select
                      className="form-select"
                      value={newRisk.departmentId}
                      onChange={(e) =>
                        setNewRisk({ ...newRisk, departmentId: e.target.value })
                      }
                      disabled={loadingDepartments}
                    >
                      <option value="">Chọn ban phụ trách</option>
                      {departments.map(dept => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                      ))}
                    </select>
                    {loadingDepartments && (
                      <small className="text-muted">Đang tải danh sách ban...</small>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Danh mục</label>
                    <select
                      className="form-select"
                      value={newRisk.risk_category}
                      onChange={(e) =>
                        setNewRisk({ ...newRisk, risk_category: e.target.value })
                      }
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

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
              
              <div className="form-group">
                <label>Kế hoạch giảm thiểu *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={newRisk.risk_mitigation_plan}
                  onChange={(e) =>
                    setNewRisk({ ...newRisk, risk_mitigation_plan: e.target.value })
                  }
                  placeholder="Mô tả kế hoạch giảm thiểu rủi ro…"
                />
              </div>
              
              <div className="form-group">
                <label>Kế hoạch ứng phó</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={newRisk.risk_response_plan}
                  onChange={(e) =>
                    setNewRisk({ ...newRisk, risk_response_plan: e.target.value })
                  }
                  placeholder="Mô tả kế hoạch ứng phó khi rủi ro xảy ra…"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12
            }}>
              <button
                className="btn btn-outline-secondary"
                onClick={handleCloseAddModal}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                onClick={createRisk}
                disabled={submitting || !newRisk.departmentId}
              >
                {submitting ? (
                  <>
                    <div className="loading-spinner me-2"></div>
                    Đang thêm...
                  </>
                ) : (
                  'Thêm rủi ro'
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
      />
    </UserLayout>
  );
}