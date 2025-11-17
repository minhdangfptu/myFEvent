import { useEffect, useState, useCallback } from "react";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useEvents } from "~/contexts/EventContext";
import { useParams, useNavigate } from "react-router-dom";
import { riskApiWithErrorHandling, getFullMember } from "~/apis/riskApi";
import { departmentApi } from "~/apis/departmentApi";
import { toast } from "react-toastify";
import ConfirmModal from "../../components/ConfirmModal";

export default function RiskDetailPage() {
  const { t } = useTranslation();
  const { eventId, riskId } = useParams();
  const navigate = useNavigate();
  const [eventRole, setEventRole] = useState("");
  const { fetchEventRole } = useEvents();

  // ====== API States ======
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  // ====== Edit States ======
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingChanges, setSavingChanges] = useState(false);

  // ====== Occurred Risk States ======
  const [showOccurredModal, setShowOccurredModal] = useState(false);
  const [editingOccurred, setEditingOccurred] = useState(null);
  const [occurredForm, setOccurredForm] = useState({
    occurred_name: "",
    occurred_location: "",
    occurred_date: "",
    occurred_description: "",
    occurred_status: "resolving",
    resolve_action: "",
    resolve_personId: "",
  });
  const [submittingOccurred, setSubmittingOccurred] = useState(false);
  const [resolvePersons, setResolvePersons] = useState([]);

  // ====== Filter & Search States ======
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");

  // ====== Delete States ======
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteOccurredModal, setShowDeleteOccurredModal] = useState(false);
  const [occurredToDelete, setOccurredToDelete] = useState(null);

  // ====== Constants ======
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
    resolving: "Đang xử lý",
    resolved: "Đã xử lý",
  };

  const occurredStatusLabels = {
    resolving: "Đang xử lý",
    resolved: "Đã xử lý",
  };

  // ====== Helper Functions ======
  const mapImpactToLevel = (impact) => impactLabels[impact] || "Trung bình";

  const mapLevelToImpact = (level) => {
    const reverseMap = Object.entries(impactLabels).find(([_, label]) => label === level);
    return reverseMap ? reverseMap[0] : "medium";
  };

  const transformApiRiskToComponent = (apiRisk) => ({
    id: apiRisk._id,
    name: apiRisk.name,
    owner: apiRisk.departmentId?.name || "Chưa phân công",
    ownerId: apiRisk.departmentId?._id,
    status: statusLabels[apiRisk.risk_status] || "Chưa xảy ra",
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
    resolvingOccurred: apiRisk.occurred_risk?.filter((occ) => occ.occurred_status === "resolving").length || 0,
    originalData: apiRisk,
  });

  // ====== Filter & Search Logic ======
  const getFilteredOccurredRisks = () => {
    if (!risk?.originalData?.occurred_risk) return [];
    
    let filtered = risk.originalData.occurred_risk;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.occurred_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.occurred_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.occurred_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.resolve_action?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(item => item.occurred_status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.occurred_date || 0) - new Date(b.occurred_date || 0);
        case "date_desc":
          return new Date(b.occurred_date || 0) - new Date(a.occurred_date || 0);
        case "name_asc":
          return (a.occurred_name || "").localeCompare(b.occurred_name || "");
        case "name_desc":
          return (b.occurred_name || "").localeCompare(a.occurred_name || "");
        case "status":
          return (a.occurred_status || "").localeCompare(b.occurred_status || "");
        default:
          return 0;
      }
    });

    return filtered;
  };

  // ====== API Calls ======
  const fetchRisk = useCallback(async () => {
    try {
      setLoading(true);
      const response = await riskApiWithErrorHandling.getRiskDetail(eventId, riskId);

      if (response.success) {
        const transformedRisk = transformApiRiskToComponent(response.data);
        setRisk(transformedRisk);
        setEditForm({
          name: transformedRisk.name,
          description: transformedRisk.description || "",
          mitigation: transformedRisk.mitigation || "",
          level: transformedRisk.level,
        });
      } else {
        toast.error("Không thể tải thông tin rủi ro");
        navigate(`/events/${eventId}/risks`);
      }
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu");
      navigate(`/events/${eventId}/risks`);
    } finally {
      setLoading(false);
    }
  }, [eventId, riskId, navigate]);

  const updateRisk = async () => {
    if (!editForm.name.trim()) {
      toast.error("Tên rủi ro không được để trống");
      return;
    }

    try {
      setSavingChanges(true);
      const updateData = {
        name: editForm.name,
        risk_mitigation_plan: editForm.description,
        risk_response_plan: editForm.mitigation,
        impact: mapLevelToImpact(editForm.level),
      };

      const response = await riskApiWithErrorHandling.updateRisk(eventId, riskId, updateData);

      if (response.success) {
        toast.success("Cập nhật thành công!");
        setRisk(prev => ({
          ...prev,
          name: editForm.name,
          description: editForm.description,
          mitigation: editForm.mitigation,
          level: editForm.level,
        }));
        setIsEditing(false);
        await fetchRisk();
      } else {
        toast.error(response.error || "Không thể cập nhật");
      }
    } catch (error) {
      toast.error("Lỗi khi cập nhật");
    } finally {
      setSavingChanges(false);
    }
  };

  const deleteRisk = async () => {
    try {
      const response = await riskApiWithErrorHandling.deleteRisk(eventId, riskId);
      if (response.success) {
        toast.success("Xóa rủi ro thành công!");
        navigate(`/events/${eventId}/risks`);
      } else {
        toast.error(response.error || "Không thể xóa rủi ro");
      }
    } catch (error) {
      toast.error("Lỗi khi xóa rủi ro");
    }
  };

  const handleOccurredSubmit = async () => {
    if (!occurredForm.occurred_name.trim()) {
      toast.error("Tên sự cố không được để trống");
      return;
    }

    if (occurredForm.occurred_status === "resolved") {
      if (!occurredForm.resolve_personId) {
        toast.error("Vui lòng chọn người xử lý");
        return;
      }
      if (!occurredForm.resolve_action.trim()) {
        toast.error("Vui lòng nhập hành động xử lý");
        return;
      }
    }

    try {
      setSubmittingOccurred(true);

      const submitData = {
        occurred_name: occurredForm.occurred_name,
        occurred_location: occurredForm.occurred_location,
        occurred_date: occurredForm.occurred_date,
        occurred_description: occurredForm.occurred_description,
        occurred_status: occurredForm.occurred_status,
      };

      if (occurredForm.occurred_status === "resolved") {
        submitData.resolve_personId = occurredForm.resolve_personId;
        submitData.resolve_action = occurredForm.resolve_action;
      }

      let response;
      if (editingOccurred) {
        response = await riskApiWithErrorHandling.updateOccurredRisk(eventId, riskId, editingOccurred._id, submitData);
      } else {
        response = await riskApiWithErrorHandling.addOccurredRisk(eventId, riskId, submitData);
      }

      if (response.success) {
        toast.success(editingOccurred ? "Cập nhật sự cố thành công!" : "Báo cáo sự cố thành công!");
        setShowOccurredModal(false);
        setEditingOccurred(null);
        setOccurredForm({
          occurred_name: "",
          occurred_location: "",
          occurred_date: "",
          occurred_description: "",
          occurred_status: "resolving",
          resolve_action: "",
          resolve_personId: "",
        });
        await fetchRisk();
      } else {
        toast.error(response.error || "Không thể lưu sự cố");
      }
    } catch (error) {
      toast.error("Lỗi khi lưu sự cố");
    } finally {
      setSubmittingOccurred(false);
    }
  };

  const handleDeleteOccurred = async () => {
    if (!occurredToDelete) return;

    try {
      const response = await riskApiWithErrorHandling.removeOccurredRisk(eventId, riskId, occurredToDelete._id);
      if (response.success) {
        toast.success("Xóa sự cố thành công!");
        setShowDeleteOccurredModal(false);
        setOccurredToDelete(null);
        await fetchRisk();
      } else {
        toast.error(response.error || "Không thể xóa sự cố");
      }
    } catch (error) {
      toast.error("Lỗi khi xóa sự cố");
    }
  };

  // ====== Event Handlers ======
  const resetForm = () => {
    setEditForm({
      name: risk.name,
      description: risk.description || "",
      mitigation: risk.mitigation || "",
      level: risk.level,
    });
  };

  const resetOccurredForm = () => {
    setOccurredForm({
      occurred_name: "",
      occurred_location: "",
      occurred_date: "",
      occurred_description: "",
      occurred_status: "resolving",
      resolve_action: "",
      resolve_personId: "",
    });
  };

  const handleShowOccurredModal = (occurred = null) => {
    if (!canManageOccurred()) {
      toast.error("Chỉ HoOC và HoD mới có quyền quản lý sự cố");
      return;
    }

    if (occurred) {
      setEditingOccurred(occurred);
      setOccurredForm({
        occurred_name: occurred.occurred_name || "",
        occurred_location: occurred.occurred_location || "",
        occurred_date: occurred.occurred_date ? new Date(occurred.occurred_date).toISOString().slice(0, 16) : "",
        occurred_description: occurred.occurred_description || "",
        occurred_status: occurred.occurred_status || "resolving",
        resolve_action: occurred.resolve_action || "",
        resolve_personId: occurred.resolve_personId?._id || "",
      });
    } else {
      setEditingOccurred(null);
      resetOccurredForm();
    }
    setShowOccurredModal(true);
  };

  const handleCloseOccurredModal = () => {
    setShowOccurredModal(false);
    setEditingOccurred(null);
    resetOccurredForm();
  };

  // ====== Effects ======
  useEffect(() => {
    if (!showOccurredModal || occurredForm.occurred_status !== "resolved") {
      setResolvePersons([]);
      return;
    }
    
    const fetchMembers = async () => {
      try {
        const response = await getFullMember(eventId);
        const members = response?.data || [];
        setResolvePersons(members);
      } catch (error) {
        toast.error("Lỗi khi tải danh sách thành viên");
        setResolvePersons([]);
      }
    };

    fetchMembers();
  }, [showOccurredModal, occurredForm.occurred_status, eventId]);

  useEffect(() => {
    if (eventId && riskId) {
      fetchRisk();
    }
  }, [eventId, riskId, fetchRisk]);

  useEffect(() => {
    fetchEventRole(eventId).then(setEventRole);
  }, [eventId, fetchEventRole]);

  // ====== UI Logic ======
  const getStatusStyle = (status) => {
    switch (status) {
      case "resolved": return { color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" };
      case "resolving": return { color: "#D97706", bg: "#FFFBEB", border: "#F59E0B" };
      default: return { color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" };
    }
  };

  const getSidebarType = () => {
    if (eventRole === "HoOC") return "HoOC";
    if (eventRole === "HoD") return "HoD";
    if (eventRole === "Member") return "Member";
    return "user";
  };

  // ====== Permission Checks ======
  const canEdit = () => eventRole === "HoOC" || eventRole === "HoD";
  const canDelete = () => eventRole === "HoOC" || eventRole === "HoD";
  const canManageOccurred = () => eventRole === "HoOC" || eventRole === "HoD";

  if (loading) {
    return (
      <UserLayout title="Chi tiết rủi ro" activePage={"risk"} sidebarType={getSidebarType()}>
        <div className="container-fluid d-flex justify-content-center align-items-center" style={{ height: "60vh" }}>
          <div className="text-center">
            <div className="loading-spinner mb-3"></div>
            <div className="text-muted">Đang tải thông tin rủi ro...</div>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!risk) {
    return (
      <UserLayout title="Chi tiết rủi ro" activePage={"risk"} sidebarType={getSidebarType()}>
        <div className="container-fluid d-flex justify-content-center align-items-center" style={{ height: "60vh" }}>
          <div className="text-center">
            <div style={{ fontSize: 48 }}>❌</div>
            <div className="mt-2 text-muted">Không tìm thấy rủi ro</div>
            <button className="btn btn-primary mt-3" onClick={() => navigate(`/events/${eventId}/risks`)}>
              Quay lại danh sách
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  const filteredOccurredRisks = getFilteredOccurredRisks();

  return (
    <UserLayout title="Chi tiết rủi ro" activePage={"risk"} sidebarType={getSidebarType()}>
      <style>{`
        .loading-spinner {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .detail-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(16,24,40,.06);
          margin-bottom: 24px;
        }

        .detail-header {
          background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%);
          border-radius: 16px 16px 0 0;
          padding: 24px;
          color: white;
        }

        .occurred-item {
          background: rgba(109, 97, 97, 0.03);
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          transition: all 0.2s;
        }

        .occurred-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        
        }

        .info-section {
          background: rgba(59, 130, 246, 0.04);
          border-radius: 8px;
          padding: 16px;
          min-height: 160px
        }

        .resolution-section {
          background: rgba(16, 185, 129, 0.04);
          border-radius: 8px;
          padding: 16px;
          min-height: 160px
        }

        .info-item {
          margin-bottom: 8px;
        }

        .info-label {
          font-weight: 600;
          color: #4B5563;
          font-size: 0.875rem;
          margin-right: 8px;
          display: inline-block;
          min-width: 90px;
        }

        .info-value {
          color: #1F2937;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .resolution-info .info-value {
          color: #059669;
          font-weight: 500;
        }

        .resolution-pending {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .alert-sm {
          font-size: 0.8rem;
          border-radius: 6px;
          border: 1px solid #FCD34D;
          background-color: #FFFBEB;
          color: #92400E;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }

        .info-box {
          padding: 12px 16px;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-weight: 500;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .action-buttons {
            flex-direction: column;
          }
          .detail-header {
            padding: 16px;
          }
        }

        .filter-section {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .filter-row {
          display: flex;
          gap: 12px;
          align-items: end;
          flex-wrap: wrap;
        }

        .filter-group {
          flex: 1;
          min-width: 200px;
        }
      `}</style>

      <div className="container-fluid" style={{ maxWidth: 1200 }}>
        {/* Main Risk Info Card */}
        <div className="detail-card">
          <div className="detail-header">
            <div className="row align-items-center">
              <div className="col-md-8">
                {isEditing ? (
                  <input
                    className="form-control form-control-lg"
                    style={{ background: "rgba(255,255,255,0.9)", border: "none" }}
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Tên rủi ro..."
                  />
                ) : (
                  <h2 className="mb-2">{risk.name}</h2>
                )}
                <p className="mb-0 opacity-75">{risk.category} • {risk.owner}</p>
              </div>
              <div className="col-md-4 text-md-end">
                <div className="d-flex flex-column gap-4">
                  <small className="opacity-75">Mức độ: {risk.level}</small>
                  <small className="opacity-75">Khả năng: {risk.likelihoodLabel}</small>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="row">
              <div className="col-md-6">
                <div className="form-group">
                  <label>Kế hoạch giảm thiểu</label>
                  {isEditing ? (
                    <textarea
                      className="form-control"
                      rows={4}
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Mô tả kế hoạch giảm thiểu rủi ro…"
                    />
                  ) : (
                    <div className="info-box">{risk.description || "Chưa có mô tả"}</div>
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label>Kế hoạch ứng phó</label>
                  {isEditing ? (
                    <textarea
                      className="form-control"
                      rows={4}
                      value={editForm.mitigation || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, mitigation: e.target.value }))}
                      placeholder="Mô tả kế hoạch ứng phó khi rủi ro xảy ra…"
                    />
                  ) : (
                    <div className="info-box">{risk.mitigation || "Chưa có kế hoạch"}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-3">
                <div className="form-group">
                  <label>Mức độ tác động</label>
                  {isEditing ? (
                    <select
                      className="form-select"
                      value={editForm.level || "Trung bình"}
                      onChange={(e) => setEditForm(prev => ({ ...prev, level: e.target.value }))}
                    >
                      <option value="Cao">Cao</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Thấp">Thấp</option>
                    </select>
                  ) : (
                    <div className="info-box">{risk.level}</div>
                  )}
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Khả năng xảy ra</label>
                  <div className="info-box">{risk.likelihoodLabel}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Trạng thái</label>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="status-badge"
                      style={{
                        ...getStatusStyle(risk.statusKey),
                        background: getStatusStyle(risk.statusKey).bg,
                        borderColor: getStatusStyle(risk.statusKey).border,
                      }}
                    >
                      {risk.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Sự cố</label>
                  <div className="info-box">
                    {risk.occurredCount} sự cố
                    {risk.resolvingOccurred > 0 && (
                      <span className="text-warning ms-2">({risk.resolvingOccurred} chờ xử lý)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons mt-4">
              {isEditing ? (
                <>
                  <button className="btn btn-outline-secondary" onClick={() => { setIsEditing(false); resetForm(); }} disabled={savingChanges}>
                    Hủy
                  </button>
                  <button className="btn btn-primary" onClick={updateRisk} disabled={savingChanges}>
                    {savingChanges ? (
                      <>
                        <div className="loading-spinner me-2" style={{ width: 16, height: 16 }}></div>
                        Đang lưu...
                      </>
                    ) : (
                      "💾 Lưu thay đổi"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => navigate(`/events/${eventId}/risks`)}>
                  <i class="bi bi-arrow-left"></i>  Quay lại danh sách rủi ro
                  </button>
                  
                  {canEdit() && (
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                      <i class="bi bi-pencil"></i> Chỉnh sửa
                    </button>
                  )}

                  {canManageOccurred() && (
                    <button className="btn btn-success" onClick={() => handleShowOccurredModal()}>
                      <i class="bi bi-plus-circle"></i> Báo cáo sự cố
                    </button>
                  )}

                  {canDelete() && (
                    <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                      <i class="bi bi-archive"></i> Xóa rủi ro
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Occurred Risks Section */}
        {risk.hasOccurred && (
          <div className="detail-card">
            <div className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0">Sự cố đã xảy ra ({filteredOccurredRisks.length}/{risk.occurredCount})</h4>
              </div>

              {/* Filter & Search Section */}
              <div className="filter-section">
                <div className="filter-row">
                  <div className="filter-group">
                    <label className="form-label"> Tìm kiếm</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm theo tên, địa điểm, mô tả..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="filter-group">
                    <label className="form-label"> Trạng thái</label>
                    <select
                      className="form-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Tất cả</option>
                      <option value="resolving">Đang xử lý</option>
                      <option value="resolved">Đã xử lý</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="form-label"> Sắp xếp</label>
                    <select
                      className="form-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="date_desc">Ngày mới nhất</option>
                      <option value="date_asc">Ngày cũ nhất</option>
                      <option value="name_asc">Tên A-Z</option>
                      <option value="name_desc">Tên Z-A</option>
                      <option value="status">Trạng thái</option>
                    </select>
                  </div>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setSortBy("date_desc");
                    }}
                  >
                    Đặt lại
                  </button>
                </div>
              </div>

              {/* Occurred Risks List */}
              {filteredOccurredRisks.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">
                    {searchTerm || statusFilter !== "all" ? "Không tìm thấy sự cố phù hợp" : "Chưa có sự cố nào"}
                  </p>
                </div>
              ) : (
                filteredOccurredRisks.map((occurred) => (
                  <div key={occurred._id} className="occurred-item">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        {/* Header with title and action buttons */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5 className="mb-0 fw-bold">{occurred.occurred_name}</h5>
                          {canManageOccurred() && (
                            <div className="ms-3">
                              <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => handleShowOccurredModal(occurred)}
                              >
                                <i class="bi bi-pencil"></i> Chỉnh sửa
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  setOccurredToDelete(occurred);
                                  setShowDeleteOccurredModal(true);
                                }}
                              >
                                <i class="bi bi-archive"></i> Xóa
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Two-column layout */}
                        <div className="row">
                          {/* Left Column: Basic Info */}
                          <div className="col-md-6">
                            <div className="info-section">
                              <div className="info-item mb-2">
                                <span className="info-label">📍 Địa điểm:</span>
                                <span className="info-value">{occurred.occurred_location || "Chưa xác định"}</span>
                              </div>
                              <div className="info-item mb-2">
                                <span className="info-label">📅 Thời gian:</span>
                                <span className="info-value">
                                  {occurred.occurred_date
                                    ? new Date(occurred.occurred_date).toLocaleString("vi-VN")
                                    : "Chưa xác định"}
                                </span>
                              </div>
                              <div className="info-item mb-2">
                                <span className="info-label">📝 Mô tả: </span>
                                <span className="info-value">
                                {occurred.occurred_description}
                                </span>
                              </div>
                              <div className="info-item mb-2">
                                <span className="info-label">👤 Người cập nhật: </span>
                                <span className="info-value">
                                {occurred.update_personId.userId.fullName}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Status & Resolution Info */}
                          <div className="col-md-6">
                            <div className="resolution-section">
                              {/* Status Badge */}
                              <div className="d-flex align-items-center mb-3">
                                <span className="info-label me-2">🏷️ Trạng thái:</span>
                                <span
                                  className="status-badge"
                                  style={{
                                    ...getStatusStyle(occurred.occurred_status),
                                    background: getStatusStyle(occurred.occurred_status).bg,
                                    borderColor: getStatusStyle(occurred.occurred_status).border,
                                  }}
                                >
                                  {occurredStatusLabels[occurred.occurred_status] || occurred.occurred_status}
                                </span>
                              </div>

                              {/* Resolution Info */}
                              {occurred.occurred_status === "resolved" && (
                                <div className="resolution-info">
                                  {occurred.resolve_personId && (
                                    <div className="d-flex align-items-center mb-3">
                                      <span className="info-label me-2">👤 Người xử lý:</span>
                                      <span className="info-value fw-bold text-success">
                                        {occurred.resolve_personId?.userId?.fullName || 
                                         occurred.resolve_personId?.userId?.name || 
                                         "Không rõ"}
                                      </span>
                                    </div>
                                  )}
                                  {occurred.resolve_action && (
                                    <div className="info-item">
                                      <span className="info-label me-2">🔧 Hành động xử lý: {occurred.resolve_action}</span>
                                      
                                    </div>
                                  )}
                                </div>
                              )}

                              {occurred.occurred_status === "resolving" && (
                                <div className="resolution-pending">
                                  <div className="alert alert-warning alert-sm py-2 px-3 mb-0">
                                    <i className="bi bi-clock me-1"></i>
                                    Đang chờ xử lý...
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {!risk.hasOccurred && (
          <div className="detail-card">
            <div className="p-4 text-center">
              <div style={{ fontSize: 48 }}>✅</div>
              <h5 className="mt-3 mb-2">Chưa có sự cố nào xảy ra</h5>
              <p className="text-muted mb-3">Rủi ro này chưa từng xảy ra trong thực tế</p>
              {canManageOccurred() && (
                <button className="btn btn-success" onClick={() => handleShowOccurredModal()}>
                  + Báo cáo sự cố đầu tiên
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Occurred Risk Modal */}
      {showOccurredModal && (
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
              maxWidth: 600,
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h5 style={{ margin: 0, fontWeight: 600 }}>
                {editingOccurred ? "✏️ Chỉnh sửa sự cố" : "📋 Báo cáo sự cố mới"}
              </h5>
              <button
                className="btn btn-sm btn-light rounded-circle"
                style={{ width: 32, height: 32, border: "none" }}
                onClick={handleCloseOccurredModal}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 24, flex: 1, overflow: "auto" }}>
              <div className="form-group">
                <label>Tên sự cố *</label>
                <input
                  type="text"
                  className="form-control"
                  value={occurredForm.occurred_name}
                  onChange={(e) => setOccurredForm(prev => ({ ...prev, occurred_name: e.target.value }))}
                  placeholder="Mô tả ngắn gọn về sự cố..."
                />
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Địa điểm</label>
                    <input
                      type="text"
                      className="form-control"
                      value={occurredForm.occurred_location}
                      onChange={(e) => setOccurredForm(prev => ({ ...prev, occurred_location: e.target.value }))}
                      placeholder="Nơi xảy ra sự cố..."
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Thời gian</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={occurredForm.occurred_date}
                      onChange={(e) => setOccurredForm(prev => ({ ...prev, occurred_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Mô tả chi tiết</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={occurredForm.occurred_description}
                  onChange={(e) => setOccurredForm(prev => ({ ...prev, occurred_description: e.target.value }))}
                  placeholder="Mô tả chi tiết về sự cố và tác động..."
                />
              </div>

              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  className="form-select"
                  value={occurredForm.occurred_status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setOccurredForm(prev => ({
                      ...prev,
                      occurred_status: newStatus,
                      ...(newStatus === "resolving" && {
                        resolve_action: "",
                        resolve_personId: "",
                      })
                    }));
                  }}
                >
                  <option value="resolving">Đang xử lý</option>
                  <option value="resolved">Đã xử lý</option>
                </select>
              </div>

              {occurredForm.occurred_status === "resolved" && (
                <>
                  <div className="form-group">
                    <label>Người xử lý *</label>
                    <select
                      className="form-select"
                      value={occurredForm.resolve_personId}
                      onChange={(e) => setOccurredForm(prev => ({ ...prev, resolve_personId: e.target.value }))}
                    >
                      <option value="">Chọn người xử lý</option>
                      {resolvePersons.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.userId?.fullName || member.userId?.name || "Không rõ tên"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Hành động xử lý *</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={occurredForm.resolve_action}
                      onChange={(e) => setOccurredForm(prev => ({ ...prev, resolve_action: e.target.value }))}
                      placeholder="Mô tả hành động xử lý sự cố..."
                    />
                  </div>
                </>
              )}
            </div>

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
                onClick={handleCloseOccurredModal}
                disabled={submittingOccurred}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOccurredSubmit}
                disabled={submittingOccurred}
              >
                {submittingOccurred ? (
                  <>
                    <div className="loading-spinner me-2" style={{ width: 16, height: 16 }}></div>
                    Đang lưu...
                  </>
                ) : editingOccurred ? (
                  "Cập nhật"
                ) : (
                  "Báo cáo sự cố"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modals */}
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteRisk}
        message="Bạn có chắc muốn xóa rủi ro này? Tất cả sự cố liên quan cũng sẽ bị xóa."
      />

      <ConfirmModal
        show={showDeleteOccurredModal}
        onClose={() => {
          setShowDeleteOccurredModal(false);
          setOccurredToDelete(null);
        }}
        onConfirm={handleDeleteOccurred}
        message="Bạn có chắc muốn xóa sự cố này?"
      />
    </UserLayout>
  );
}