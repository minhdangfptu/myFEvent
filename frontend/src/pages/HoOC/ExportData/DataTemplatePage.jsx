import React, { useState, useEffect } from "react";
import "./DataTemplatePage.css";
import UserLayout from "~/components/UserLayout";
import { useNavigate, useParams } from "react-router-dom";
import DataExportPreviewModal from "~/components/DataExportPreviewModal";
import { useEvents } from "~/contexts/EventContext";
import { toast } from "react-toastify";
import Loading from "~/components/Loading";
import {
  Eye,
  RotateCw,
  Search,
  X,
  Download,
  Users,
  User,
  CalendarDays,
  ListChecks,
  MessageCircle,
  Wallet,
  ShieldAlert,
  AlertTriangle,
  Archive,
  FileSpreadsheet,
} from "lucide-react";

export default function DataTemplatePage() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewType, setPreviewType] = useState("data");
  const [downloadingItems, setDownloadingItems] = useState(new Set());
  const [eventRole, setEventRole] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { fetchEventRole } = useEvents();

  // Check user role - only HoOC can access this page
  useEffect(() => {
    const loadEventRole = async () => {
      try {
        const role = await fetchEventRole(eventId);
        setEventRole(role);
        if (role !== 'HoOC') {
          toast.error('Bạn không có quyền truy cập trang này');
          navigate('/home-page');
          return;
        }
      } catch (error) {
        console.error('Error loading role:', error);
        toast.error('Không thể xác thực quyền truy cập');
        navigate('/home-page');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEventRole();
    } else {
      setLoading(false);
    }
  }, [eventId, fetchEventRole, navigate]);

  const templatesExcel = [
    {
      id: "team",
      title: "Mẫu Template Danh sách Ban sự kiện",
      icon: Users,
      color: "#f3f3f3",
      iconColor: "#1976D2",
      fileType: "XLSX",
      description:
        "Bao gồm các trường: Tên ban, Miêu tả, Số lượng thành viên, Trưởng ban",
      driveFileId: "1RrwP0w-wWXmvwE6hY3Dizrqlv8r0sNpq4KtPE6kunn8",
      driveNoDataFileId: "1AD2h9fWYIOI4JGZnSAJkzT-GbFQfK0JDmc-cCyc9HK4",
    },
    {
      id: "members",
      title: "Mẫu Template Danh sách Thành viên",
      icon: User,
      color: "#f3f3f3",
      iconColor: "#F57C00",
      fileType: "XLSX",
      description:
        "Bao gồm các trường: Họ tên, Email, Số điện thoại, Ban phụ trách.",
      driveFileId: "1yrWbUbiAYrLkkp3oY5kUlgIuGpnSKN9ShUwr9ueO3Z4",
      driveNoDataFileId: "1BQDILOSPdX1K7eEYmPF1IHF4hmnSN7z_Cld7Hsu0qrE",
    },
    {
      id: "timeline",
      title: "Mẫu Template Agenda DDAY Sự kiện",
      icon: CalendarDays,
      color: "#f3f3f3",
      iconColor: "#FF8F00",
      fileType: "XLSX",
      description:
        "Bao gồm các trường: Hoạt động, Thời gian, Địa điểm, Người phụ trách.",
      driveFileId: "1XRO1KWoTphvAlYRMLSFEz0SMDPcTUQEZuyhJJ-IpcjY",
      driveNoDataFileId: "1dwbzBlkI622T7PLvtdYWMLCt9DFWZcy0FoEkTF3rR3Q",
    },
    {
      id: "tasks",
      title: "Mẫu Template Danh sách Công việc",
      icon: ListChecks,
      color: "#f3f3f3",
      iconColor: "#7B1FA2",
      fileType: "XLSX",
      description:
        "Bao gồm các trường: Tên task, Deadline, Trạng thái, Người thực hiện.",
      driveFileId: "1wdG7ouQMeDq9yAp10u8XfNetRCzBVsn-4WabcuZgQnw",
      driveNoDataFileId: "104QH0Ist-FteNO7yJrlt0U8yhoFTsH6MwpDRD9soi_0",
    },
    {
      id: "schedule",
      title: "Mẫu Template Lịch Trình (Schedule)",
      icon: CalendarDays,
      color: "#f3f3f3",
      iconColor: "#00ACC1",
      fileType: "XLSX",
      description:
        "Bao gồm các trường: Ngày, Giờ bắt đầu, Giờ kết thúc, Sự kiện.",
      driveFileId: "14PEdwLBRD8FKxr5WY9OZiHtxIFMtZ1PlDTJ_IJZzH8I",
      driveNoDataFileId: "1GtqGPiUWF5qp6_RMAC1n7RWKRlmJU-LhJUqQxxsDdsg",
    },
    {
      id: "feedback",
      title: "Mẫu Template Danh sách Phản hồi",
      icon: MessageCircle,
      color: "#f3f3f3",
      iconColor: "#388E3C",
      fileType: "XLSX",
      description:
        "Bao gồm các trường: Người phản hồi, Nội dung, Đánh giá, Ghi chú.",
      driveFileId: "1NwYTlG1sBBY-cbHK6kAFFPE1CEguYSjRxQYQ8LvLMhA",
      driveNoDataFileId: "1ZNKrUZwGKrDxvAjMYjBLgKAecNda3PEmIBW4THFs154",
    },
    {
      id: "budget",
      title: "Mẫu Template Kinh phí sự kiện",
      icon: Wallet,
      color: "#f3f3f3",
      iconColor: "#F9A825",
      fileType: "XLSX",
      description:
        "Bao gồm các trường: Hạng mục, Số lượng, Đơn giá, Thành tiền.",
      driveFileId: "12AdAfFazz-gMkVjjW6JK32JJdtvYG7Lc2m4klQvzSng",
      driveNoDataFileId: "137dIb-JpET5w8Cs8pgOw8EeU7LQ2cbxQ-Jdup-KOeGY",
    },
    {
      id: "risks",
      title: "Mẫu Template Danh sách Rủi ro",
      icon: ShieldAlert,
      color: "#f3f3f3",
      iconColor: "#E53935",
      fileType: "XLSX",
      description:
        "Bao gồm các trường: Loại rủi ro, Mức độ, Biện pháp phòng ngừa.",
      driveFileId: "1OBlqjSnWfjK9bszv3jxjBzFqWHA5jP21kc6J8rBntcY",
      driveNoDataFileId: "1wR-b9DWlffez0jcLUWwl1aLxRiccD9Ou06z3yyea_gE",
    },
    {
      id: "incidents",
      title: "Mẫu Template Danh sách Sự cố đã xảy ra",
      icon: AlertTriangle,
      color: "#f3f3f3",
      iconColor: "#FB8C00",
      fileType: "XLSX",
      description:
        "Bao gồm các trường: Sự cố, Thời gian, Người xử lý, Hành động khắc phục.",
      driveFileId: "1wpl-UoLhBMVrEnhfxqjyc-IqrBa-D1mMTlyLjAC59vM",
      driveNoDataFileId: "1R8XhsD0E3dlTQ3_ysve_o2XJJ63n8tgmELuz7P9L8jQ",
    },
    {
      id: "all-templates-excel",
      title: "Tất cả Templates Excel",
      icon: Archive,
      color: "#f3f3f3",
      iconColor: "#8E24AA",
      fileType: "ZIP",
      description: "Tải về tất cả các template Excel trong một file nén.",
      driveFileId: "1g66RMLLCwY2jnVw7V4uDOaDGtiwv9L0O",
    },
  ];

  const handlePreview = (templateId, type = "data") => {
    const template = templatesExcel.find((t) => t.id === templateId);

    if (template) {
      const templateWithCorrectId = {
        ...template,
        driveFileId:
          type === "data" ? template.driveFileId : template.driveNoDataFileId,
        previewType: type,
      };

      setSelectedTemplate(templateWithCorrectId);
      setPreviewType(type);
      setShowPreviewModal(true);
    }
  };

  const handleDownload = async (templateId) => {
    const template = templatesExcel.find((t) => t.id === templateId);

    if (template) {
      setDownloadingItems((prev) => new Set(prev).add(templateId));

      try {
        const fileId = template.driveNoDataFileId || template.driveFileId;

        switch (template.fileType) {
          case "XLSX": {
            const exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
            window.location.href = exportUrl;
            break;
          }
          case "ZIP": {
            window.location.href = `https://drive.google.com/uc?export=download&id=${fileId}`;
            break;
          }
          default: {
            window.open(
              `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
              "_blank"
            );
            break;
          }
        }

        setTimeout(() => {
          setDownloadingItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(templateId);
            return newSet;
          });
        }, 3000);
      } catch (error) {
        console.error("Download failed:", error);
        setDownloadingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(templateId);
          return newSet;
        });
      }
    }
  };

  const handleCloseModal = () => {
    setShowPreviewModal(false);
    setSelectedTemplate(null);
    setPreviewType("data");
  };

  const handleBackClick = (e) => {
    e.preventDefault();
    navigate(-1);
  };

  const getCurrentTemplates = () => {
    if (!searchTerm) return templatesExcel;

    return templatesExcel.filter((template) =>
      template.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Show loading while checking role
  if (loading) {
    return (
      <UserLayout
        sidebarType="hooc"
        title="Tài liệu dữ liệu mẫu"
        activePage="export-example"
        eventId={eventId}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading size={100} />
        </div>
      </UserLayout>
    );
  }

  // Don't render content if not HoOC (will be redirected)
  if (eventRole !== 'HoOC') {
    return null;
  }

  return (
    <UserLayout
      sidebarType="hooc"
      title="Tài liệu dữ liệu mẫu"
      activePage="export-example"
      eventId={eventId}
    >
      <div className="data-template-page">
        <div className="data-template-page__container">
          {/* Back Link */}
          <a
            href="#"
            onClick={handleBackClick}
            className="data-template-page__back-link"
          >
            ← Quay lại Tùy chọn Xuất Dữ Liệu
          </a>

          {/* Header Section */}
          <div className="data-template-page__header">
            <h1 className="data-template-page__title">
              Xem và Tải Về Mẫu Tài Liệu (Templates)
            </h1>
            <p className="data-template-page__subtitle">
              Các mẫu file Excel để nhập dữ liệu hoặc lập kế hoạch
            </p>
          </div>

          {/* Info Box */}
          <div className="data-template-page__info-box">
            <div className="data-template-page__info-icon">ⓘ</div>
            <div className="data-template-page__info-content">
              <h3 className="data-template-page__info-title">Hướng Dẫn</h3>
              <p className="data-template-page__info-text">
                Các file Excel phục vụ cho việc quản lý dữ liệu, thống kê và
                theo dõi tiến độ. Hỗ trợ công thức tính toán và phân tích dữ
                liệu.
              </p>
            </div>
          </div>

          {/* Templates Section */}
          <div className="data-template-page__templates-section">
            {/* Section Header with Search */}
            <div className="data-template-page__section-header">
              <div className="data-template-page__section-title-wrapper">
                <h2 className="data-template-page__section-title">
                  Excel Templates
                  <span className="data-template-page__count">
                    ({getCurrentTemplates().length} mẫu)
                  </span>
                </h2>
              </div>

              <div className="data-template-page__controls">
                {/* Search Box */}
                <div className="data-template-page__search">
                  <div className="data-template-page__search-wrapper">
                    <Search
                      size={18}
                      className="data-template-page__search-icon"
                    />
                    <input
                      type="text"
                      className="data-template-page__search-input"
                      placeholder="Tìm kiếm template..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        className="data-template-page__search-clear"
                        onClick={() => setSearchTerm("")}
                        type="button"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="data-template-page__grid">
              {getCurrentTemplates().map((template) => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.id}
                    className="data-template-page__card"
                  >
                    <div
                      className="data-template-page__card-header"
                      style={{ backgroundColor: template.color }}
                    >
                      <div
                        className="data-template-page__card-icon"
                        style={{ backgroundColor: template.iconColor }}
                      >
                        <Icon size={22} color="white" />
                      </div>
                      <div className="data-template-page__card-title-section">
                        <h3 className="data-template-page__card-title">
                          {template.title}
                        </h3>
                        <span className="data-template-page__card-filetype">
                          {template.fileType}
                        </span>
                      </div>
                    </div>

                    <div className="data-template-page__card-footer">
                      {template.fileType !== "ZIP" && (
                        <>
                          <button
                            type="button"
                            className="data-template-page__btn data-template-page__btn--text"
                            onClick={() =>
                              handlePreview(template.id, "data")
                            }
                          >
                            <span className="data-template-page__btn-icon">
                              <Eye size={18} />
                            </span>
                            Preview dữ liệu
                          </button>
                          <button
                            type="button"
                            className="data-template-page__btn data-template-page__btn--text"
                            onClick={() =>
                              handlePreview(template.id, "template")
                            }
                          >
                            <span className="data-template-page__btn-icon">
                              <FileSpreadsheet size={18} />
                            </span>
                            Preview mẫu
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="data-template-page__btn data-template-page__btn--download"
                        onClick={() => handleDownload(template.id)}
                        disabled={downloadingItems.has(template.id)}
                      >
                        <span className="data-template-page__btn-icon">
                          {downloadingItems.has(template.id) ? (
                            <RotateCw
                              size={18}
                              className="spin-animation"
                            />
                          ) : (
                            <Download size={18} />
                          )}
                        </span>
                        {downloadingItems.has(template.id)
                          ? "Đang xử lý..."
                          : "Tải Template"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {getCurrentTemplates().length === 0 && (
              <div className="data-template-page__no-results">
                <Search size={18} />
                <p>Không tìm thấy template nào phù hợp với "{searchTerm}"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <DataExportPreviewModal
        show={showPreviewModal}
        template={selectedTemplate}
        previewType={previewType}
        onClose={handleCloseModal}
        onDownload={handleDownload}
      />
    </UserLayout>
  );
}
