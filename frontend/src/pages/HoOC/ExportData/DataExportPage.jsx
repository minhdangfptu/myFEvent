import React, { useState, useEffect } from "react";
import "./DataExportPage.css";
import UserLayout from "~/components/UserLayout";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getAgendaName } from "~/apis/agendaApi";
import { feedbackApi } from "~/apis/feedbackApi";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  exportItem,
  exportAllItemsZip,
  exportSelectedItemsZip,
  getExportedFiles,
  downloadExportedFile,
} from "~/apis/exportApi";

const ItemOptionsComponent = ({ item, onDownload, onClose }) => {
  const [selectedSubItems, setSelectedSubItems] = useState({});

  const handleToggleSubItem = (subItemId) => {
    setSelectedSubItems((prev) => ({
      ...prev,
      [subItemId]: !prev[subItemId],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = {};
    item.subItems.forEach((subItem) => {
      allSelected[subItem.id] = true;
    });
    setSelectedSubItems(allSelected);
  };

  const handleDeselectAll = () => {
    setSelectedSubItems({});
  };

  const getSelectedCount = () => {
    return Object.values(selectedSubItems).filter(Boolean).length;
  };

  const handleDownload = () => {
    const selected = Object.keys(selectedSubItems).filter(key => selectedSubItems[key]);
    
    if (selected.length === 0) {
      toast.error("Vui lòng chọn ít nhất một mục!");
      return;
    }

    onDownload(item.id, selected);
  };

  return (
    <>
      <div className="data-export-page__subitems-controls">
        <button
          className="data-export-page__btn data-export-page__btn--text"
          onClick={handleSelectAll}
        >
          Chọn tất cả
        </button>
        <button
          className="data-export-page__btn data-export-page__btn--text"
          onClick={handleDeselectAll}
        >
          Bỏ chọn tất cả
        </button>
      </div>

      <div className="data-export-page__subitems-list">
        {item.subItems?.map((subItem) => (
          <div key={subItem.id} className="data-export-page__subitem">
            <label className="data-export-page__subitem-label">
              <input
                type="checkbox"
                checked={selectedSubItems[subItem.id] || false}
                onChange={() => handleToggleSubItem(subItem.id)}
                className="data-export-page__subitem-checkbox"
              />
              <div className="data-export-page__subitem-content">
                <h4>{subItem.title}</h4>
                <p>{subItem.description}</p>
              </div>
            </label>
          </div>
        ))}
      </div>

      <div className="data-export-page__modal-footer">
        <button
          className="data-export-page__btn data-export-page__btn--text"
          onClick={onClose}
        >
          Hủy
        </button>
        <button
          className="data-export-page__btn data-export-page__btn--primary"
          onClick={handleDownload} // ✅ Gọi function đã fix
          disabled={getSelectedCount() === 0}
        >
          <i className="bi bi-download me-2"></i>
          Tải Xuống ({getSelectedCount()} mục)
        </button>
      </div>
    </>
  );
};

export default function DataExportPage() {
  const [selectedItems, setSelectedItems] = useState({});
  const [showOptions, setShowOptions] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(null);
  const [downloadingItems, setDownloadingItems] = useState(new Set());
  const [agendaSubItems, setAgendaSubItems] = useState([]);
  const [loadingAgendas, setLoadingAgendas] = useState(true);
   const [feedbackSubItems, setFeedbackSubItems] = useState([]); 
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true); 
  const [exportedFiles, setExportedFiles] = useState([]);
  const navigate = useNavigate();
  const { eventId } = useParams();

  // Fetch agenda và feedback data on component mount
  useEffect(() => {
    const fetchAgendas = async () => {
      try {
        setLoadingAgendas(true);
        const response = await getAgendaName(eventId);

        if (response.success && response.data) {
          const validAgendas = response.data
            .filter(
              (agenda) =>
                agenda.milestoneId !== null && agenda.milestoneId !== undefined
            )
            .map((agenda) => ({
              id: agenda.milestoneId._id,
              title: agenda.milestoneId.name || `Agenda ${agenda._id}`,
              description: `Agenda cho cột mốc: ${
                agenda.milestoneId.name || "N/A"
              }`,
            }));

          setAgendaSubItems(validAgendas);
        }
      } catch (error) {
        console.error("Error fetching agendas:", error);
        setAgendaSubItems([]);
      } finally {
        setLoadingAgendas(false);
      }
    };

    const fetchFeedbackForms = async () => {
      try {
        setLoadingFeedbacks(true);
        const response = await feedbackApi.listFormsNameByEvent(eventId, 1, 100); 

        if (response.status === 200 && response.data) {
          const formattedForms = response.data.map((form) => ({
            id: form._id,
            title: form.name,
            description: form.description || 'Không có mô tả',
          }));

          setFeedbackSubItems(formattedForms);
        }
      } catch (error) {
        console.error("Error fetching feedback forms:", error);
        setFeedbackSubItems([]);
      } finally {
        setLoadingFeedbacks(false);
      }
    };

    const fetchExportedFiles = async () => {
      try {
        const response = await getExportedFiles(eventId);
        setExportedFiles(response.files || []);
      } catch (error) {
        console.error("Error fetching exported files:", error);
      }
    };

    if (eventId) {
      fetchAgendas();
      fetchFeedbackForms(); 
      fetchExportedFiles();
    }
  }, [eventId]);

  

  const exportItems = [
    {
      id: "team",
      title: "Danh sách Ban sự kiện",
      icon: "bi-people-fill",
      color: "#f3f3f3",
      iconColor: "#1976D2",
      description:
        "Xuất danh sách các ban tổ chức: Tên ban, Miêu tả, Số lượng thành viên, Trưởng ban",
      subItems: [
        {
          id: "team-all",
          title: "Tất cả Danh sách Ban sự kiện",
          description: "Xuất toàn bộ thông tin các ban sự kiện",
        },
      ],
    },
    {
      id: "members",
      title: "Danh sách Thành viên",
      icon: "bi-person-lines-fill",
      color: "#f3f3f3",
      iconColor: "#F57C00",
      description:
        "Xuất thông tin thành viên: Họ tên, Email, Số điện thoại, Ban phụ trách",
      subItems: [
        {
          id: "members-all",
          title: "Tất cả Danh sách Thành viên",
          description: "Xuất toàn bộ thông tin thành viên",
        },
      ],
    },
    {
      id: "timeline",
      title: "Timeline Sự kiện",
      icon: "bi-calendar3",
      color: "#f3f3f3",
      iconColor: "#388E3C",
      description:
        "Xuất timeline milestone: Hoạt động, Thời gian, Mô tả, Trạng thái",
      subItems: [
        {
          id: "timeline-all",
          title: "Tất cả Timeline Sự kiện",
          description: "Xuất toàn bộ timeline sự kiện",
        },
      ],
    },
    {
      id: "agenda",
      title: "Agenda Sự kiện",
      icon: "bi-calendar2-week",
      color: "#f3f4f6",
      iconColor: "#7B1FA2",
      description:
        "Xuất agenda Sự kiện theo milestone: Ngày, Giờ, Hoạt động, Thời lượng",
      subItems: loadingAgendas
        ? [{ id: "loading", title: "Đang tải...", description: "Vui lòng đợi" }]
        : agendaSubItems.length > 0
        ? agendaSubItems
        : [
            {
              id: "no-agenda",
              title: "Chưa có agenda",
              description: "Chưa có agenda nào được tạo cho sự kiện này",
            },
          ],
    },
    {
      id: "tasks",
      title: "Danh sách Công việc",
      icon: "bi-check2-square",
      color: "#f3f3f3",
      iconColor: "#00ACC1",
      description:
        "Xuất danh sách công việc lớn: Tên công việc, Thời gian, Trạng thái, Ban phụ trách",
      subItems: [
        {
          id: "tasks-all",
          title: "Tất cả công việc lớn",
          description: "Danh sách đầy đủ các công việc lớn",
        },
      ],
    },
    {
      id: "feedback",
      title: "Danh sách Phản hồi",
      icon: "bi-chat-square-dots",
      color: "#f3f3f3",
      iconColor: "#F9A825",
      description:
        "Xuất phản hồi từ người tham gia: Câu hỏi, Câu trả lời, Đánh giá",
      // ✅ Cập nhật subItems với data động
      subItems: loadingFeedbacks
        ? [{ id: "loading", title: "Đang tải...", description: "Vui lòng đợi" }]
        : feedbackSubItems.length > 0
        ? feedbackSubItems
        : [
            {
              id: "no-feedback",
              title: "Chưa có biểu mẫu",
              description: "Chưa có biểu mẫu phản hồi nào được tạo cho sự kiện này",
            },
          ],
    },
    {
      id: "budget",
      title: "Kinh phí sự kiện",
      icon: "bi-currency-dollar",
      color: "#f3f3f3",
      iconColor: "#E53935",
      description:
        "Xuất báo cáo tài chính: Hạng mục, Số lượng, Đơn giá, Thành tiền",
      subItems: [
        {
          id: "budget-summary",
          title: "Tổng quan ngân sách",
          description: "Báo cáo tổng hợp chi phí",
        },
        {
          id: "budget-expenses",
          title: "Chi tiết chi phí",
          description: "Từng khoản chi cụ thể",
        },
        {
          id: "budget-revenue",
          title: "Nguồn thu",
          description: "Tài trợ và nguồn kinh phí",
        },
        {
          id: "budget-comparison",
          title: "So sánh dự kiến/thực tế",
          description: "Đối chiếu ngân sách ban đầu",
        },
      ],
    },
    {
      id: "risks",
      title: "Danh sách Rủi ro",
      icon: "bi-shield-exclamation",
      color: "#f3f3f3",
      iconColor: "#FB8C00",
      description:
        "Xuất đánh giá rủi ro: Loại rủi ro, Mức độ, Biện pháp phòng ngừa",
      subItems: [
        {
          id: "risks-all",
          title: "Tất cả Danh sách Rủi ro",
          description: "Xuất toàn bộ thông tin rủi ro",
        },
      ],
    },
    {
      id: "incidents",
      title: "Danh sách Sự cố",
      icon: "bi-exclamation-triangle-fill",
      color: "#f3f3f3",
      iconColor: "#1976D2",
      description:
        "Xuất sự cố đã xảy ra: Sự cố, Thời gian, Người xử lý, Hành động khắc phục",
      subItems: [
        {
          id: "incidents-all",
          title: "Tất cả Danh sách Sự cố",
          description: "Xuất toàn bộ thông tin sự cố",
        },
      ],
    },
  ];

  const handleToggleItem = (id) => {
    setSelectedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleShowOptions = () => {
    setShowOptions(true);
  };

  const handleCloseOptions = () => {
    setShowOptions(false);
  };

  const handleShowItemOptions = (itemId) => {
  setShowOptionsModal(String(itemId)); // Ensure string
};

  const handleCloseItemOptions = () => {
    setShowOptionsModal(null);
  };

  // Main download function 
  const handleDownload = async (itemId, subItems = []) => {
    const implementedItems = [
      "team",
      "members",
      "timeline",
      "agenda",
      "tasks",
      "budget",
      "feedback",
      "risks",
      "incidents",
    ];

    if (!implementedItems.includes(itemId)) {
      toast.error(`Chức năng xuất ${itemId} sẽ được cập nhật trong phiên bản sau!`);
      return;
    }

    setDownloadingItems((prev) => new Set(prev).add(itemId));

    try {

      // Gọi API export, axios trả về file blob
      const response = await exportItem(eventId, itemId, subItems);

      // Xử lý tải về
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Lấy tên file từ header nếu có
      let fileName = 'export.xlsx';
      const disposition = response.headers && response.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match.length > 1) fileName = decodeURIComponent(match[1]);
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Xuất dữ liệu thành công! File: ${fileName}`);
    } catch (error) {
      // Đọc lỗi backend trả về dạng text nếu có
      if (error.response && error.response.data) {
        const reader = new FileReader();
        reader.onload = function (e) {
          toast.error('Xuất dữ liệu thất bại: ' + e.target.result);
          console.error('Lỗi BE trả về:', e.target.result);
        };
        reader.readAsText(error.response.data);
      } else {
        toast.error('Export failed: ' + error.message);
        console.error("❌ Export failed:", error);
      }
    } finally {
      setDownloadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleFileDownload = async (filename) => {
    try {
      const response = await downloadExportedFile(filename);

      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get("Content-Disposition");
      let downloadFilename = filename;

      if (contentDisposition) {
        const matches = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (matches && matches[1]) {
          downloadFilename = matches[1].replace(/['"]/g, "");
          downloadFilename = decodeURIComponent(downloadFilename);
        }
      }

      // Convert to blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", downloadFilename);

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      window.URL.revokeObjectURL(url);

      console.log(`✅ File downloaded: ${downloadFilename}`);
    } catch (error) {
      console.error("❌ Download failed:", error);
      alert(`Tải file thất bại: ${error.message}`);
    }
  };

  const fetchExportedFiles = async () => {
    try {
      const response = await getExportedFiles(eventId);
      setExportedFiles(response.files || []);
    } catch (error) {
      console.error("Error fetching exported files:", error);
    }
  };

  const handleDownloadSelected = async () => {
    const selected = Object.keys(selectedItems).filter(
      (key) => selectedItems[key]
    );
    if (selected.length === 0) {
      toast.error("Vui lòng chọn ít nhất một mục để tải xuống!");
      return;
    }

    setDownloadingItems((prev) => new Set(prev).add('selected'));

    try {
      console.log("🚀 Starting download selected items as ZIP...", selected);

      // Gọi API export selected items thành file ZIP
      const response = await exportSelectedItemsZip(eventId, selected);

      // Xử lý tải về file ZIP
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Lấy tên file từ header nếu có
      let fileName = `Du_Lieu_Da_Chon_${eventId}.zip`;
      const disposition = response.headers && response.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match.length > 1) fileName = decodeURIComponent(match[1]);
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Đã xuất ${selected.length} mục đã chọn thành file ZIP: ${fileName}`);
      setShowOptions(false);
    } catch (error) {
      // Đọc lỗi backend trả về dạng text nếu có
      if (error.response && error.response.data) {
        const reader = new FileReader();
        reader.onload = function (e) {
          toast.error('Xuất dữ liệu ZIP thất bại: ' + e.target.result);
          console.error('Lỗi BE trả về:', e.target.result);
        };
        reader.readAsText(error.response.data);
      } else {
        toast.error('Export ZIP failed: ' + error.message);
        console.error("❌ Export ZIP failed:", error);
      }
    } finally {
      setDownloadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete('selected');
        return newSet;
      });
    }
  };

  // Trong DataExportPage.jsx - Cập nhật handleDownloadItemOptions
const handleDownloadItemOptions = async (itemId, selectedSubItems) => {
  console.log("🔍 Debug handleDownloadItemOptions:");
  console.log("- itemId:", itemId, "type:", typeof itemId);
  console.log("- selectedSubItems:", selectedSubItems, "type:", typeof selectedSubItems);
  
  // Ensure itemId is string
  const cleanItemId = String(itemId);
  
  // Ensure selectedSubItems is array
  const cleanSubItems = Array.isArray(selectedSubItems) ? selectedSubItems : [];
  
  console.log("🔧 Cleaned values:");
  console.log("- cleanItemId:", cleanItemId);
  console.log("- cleanSubItems:", cleanSubItems);
  
  await handleDownload(cleanItemId, cleanSubItems);
  setShowOptionsModal(null);
};

  const handleDownloadAll = async () => {
    setDownloadingItems((prev) => new Set(prev).add('all'));

    try {
      console.log("🚀 Starting download all as ZIP...");

      // Gọi API export all items thành file ZIP
      const response = await exportAllItemsZip(eventId);

      // Xử lý tải về file ZIP
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Lấy tên file từ header nếu có
      let fileName = `Tat_Ca_Du_Lieu_${eventId}.zip`;
      const disposition = response.headers && response.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match.length > 1) fileName = decodeURIComponent(match[1]);
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Đã xuất tất cả dữ liệu thành file ZIP: ${fileName}`);
    } catch (error) {
      // Đọc lỗi backend trả về dạng text nếu có
      if (error.response && error.response.data) {
        const reader = new FileReader();
        reader.onload = function (e) {
          toast.error('Xuất dữ liệu ZIP thất bại: ' + e.target.result);
          console.error('Lỗi BE trả về:', e.target.result);
        };
        reader.readAsText(error.response.data);
      } else {
        toast.error('Export ZIP failed: ' + error.message);
        console.error("❌ Export ZIP failed:", error);
      }
    } finally {
      setDownloadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete('all');
        return newSet;
      });
    }
  };

  const handleViewTemplate = () => {
    navigate(`/events/${eventId}/export/templates`);
  };

  const getSelectedCount = () => {
    return Object.keys(selectedItems).filter((key) => selectedItems[key])
      .length;
  };

  return (
    <UserLayout
      sidebarType="hooc"
      title="Xuất dữ liệu báo cáo"
      activePage="export-all"
    >
      <div className="data-export-page">
        <div className="data-export-page__container">
          {/* Top Section */}
          <div className="data-export-page__top-section">
            {/* Export All Section */}
            <div className="data-export-page__export-all">
              <h2 className="data-export-page__section-title">
                Xuất Tất Cả Dữ Liệu Sự Kiện
              </h2>
              <p className="data-export-page__section-description">
                Xuất toàn bộ thông tin về Thành viên, Ban, Timeline, Agenda, Rủi
                ro, và Sự cố thành các file Excel riêng biệt.
              </p>
              <button
                className="data-export-page__btn data-export-page__btn--primary"
                onClick={handleDownloadAll}
                disabled={downloadingItems.size > 0}
              >
                <span className="data-export-page__btn-icon">
                  {downloadingItems.size > 0 ? (
                    <i className="bi bi-arrow-clockwise spin-animation"></i>
                  ) : (
                    <i className="bi bi-download"></i>
                  )}
                </span>
                {downloadingItems.size > 0
                  ? "Đang xuất..."
                  : "Tải Dữ Liệu Đã Hỗ Trợ"}
              </button>
            </div>

            {/* Template Section */}
            <div className="data-export-page__template">
              <h2 className="data-export-page__section-title">
                Mẫu Tài Liệu & Template
              </h2>
              <p className="data-export-page__section-description">
                Xem trước và tải xuống template cùng với các mẫu tài liệu cần
                thiết cho sự kiện của bạn.
              </p>
              <button
                className="data-export-page__btn data-export-page__btn--outline"
                onClick={handleViewTemplate}
              >
                <span className="data-export-page__btn-icon">
                  <i className="bi bi-file-earmark-fill"></i>
                </span>
                Xem & Tải Template
              </button>
            </div>
          </div>

          {/* Exported Files Section */}
          {exportedFiles.length > 0 && (
            <div className="data-export-page__files-section">
              <h3>Files đã xuất gần đây</h3>
              <div className="data-export-page__files-list">
                {exportedFiles.slice(0, 5).map((file) => (
                  <div
                    key={file.filename}
                    className="data-export-page__file-item"
                  >
                    <i className="bi bi-file-earmark-excel"></i>
                    <span>{file.filename}</span>
                    <button
                      onClick={() => handleFileDownload(file.filename)}
                      className="data-export-page__btn data-export-page__btn--text"
                    >
                      <i className="bi bi-download"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Items Section */}
          <div className="data-export-page__items-section">
            <div className="data-export-page__section-header">
              <div>
                <h2 className="data-export-page__section-title">
                  Chọn Mục Dữ Liệu Cần Xuất Lẻ
                </h2>
                <p className="data-export-page__section-description">
                  Chọn một hoặc nhiều mục để xuất ra các tệp riêng biệt.
                </p>
              </div>

              {getSelectedCount() > 0 && (
                <button
                  className="data-export-page__btn data-export-page__btn--primary"
                  onClick={handleShowOptions}
                  disabled={downloadingItems.size > 0}
                >
                  <span className="data-export-page__btn-icon">
                    <i className="bi bi-check2-all"></i>
                  </span>
                  Tùy Chọn Xuất ({getSelectedCount()})
                </button>
              )}
            </div>

            <div className="data-export-page__grid">
              {exportItems.map((item) => {
                const isImplemented = [
                  "team",
                  "members",
                  "timeline",
                  "agenda",
                  "tasks",
                  "budget",
                  "feedback",
                  "risks",
                  "incidents",
                ].includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`data-export-page__card ${
                      !isImplemented ? "data-export-page__card--disabled" : ""
                    }`}
                  >
                    {/* Checkbox ở góc trên phải */}
                    <div className="data-export-page__card-checkbox">
                      <input
                        type="checkbox"
                        id={`checkbox-${item.id}`}
                        checked={selectedItems[item.id] || false}
                        onChange={() => handleToggleItem(item.id)}
                        className="data-export-page__checkbox"
                        disabled={downloadingItems.has(item.id)}
                      />
                      <label
                        htmlFor={`checkbox-${item.id}`}
                        className="data-export-page__checkbox-label"
                      >
                        <i
                          className={
                            selectedItems[item.id]
                              ? "bi bi-check-square-fill"
                              : "bi bi-square"
                          }
                        ></i>
                      </label>
                    </div>

                    <div
                      className="data-export-page__card-header"
                      style={{ backgroundColor: item.color }}
                    >
                      <div
                        className="data-export-page__card-icon"
                        style={{ backgroundColor: item.iconColor }}
                      >
                        <i
                          className={item.icon}
                          style={{
                            fontSize: "1.5rem",
                            color: "white",
                          }}
                        ></i>
                      </div>
                      <div className="data-export-page__card-title-section">
                        <h3 className="data-export-page__card-title">
                          {item.title}
                          {/* {!isImplemented && <span className="data-export-page__card-badge">Sắp có</span>} */}
                        </h3>
                        <span className="data-export-page__card-filetype">
                          XLSX
                        </span>
                      </div>
                    </div>

                    {item.description && (
                      <div className="data-export-page__card-description">
                        {item.description}
                      </div>
                    )}

                    <div className="data-export-page__card-footer">
                      <button
                        className="data-export-page__btn data-export-page__btn--text"
                        onClick={() => handleShowItemOptions(item.id)}
                        disabled={!isImplemented}
                      >
                        <span className="data-export-page__btn-icon">
                          <i className="bi bi-check2-square"></i>
                        </span>
                        Tùy chọn
                      </button>
                      <button
                        className="data-export-page__btn data-export-page__btn--download"
                        onClick={() => handleDownload(item.id)}
                        disabled={
                          downloadingItems.has(item.id) || !isImplemented
                        }
                      >
                        <span className="data-export-page__btn-icon">
                          {downloadingItems.has(item.id) ? (
                            <i className="bi bi-arrow-clockwise spin-animation"></i>
                          ) : (
                            <i className="bi bi-download"></i>
                          )}
                        </span>
                        {downloadingItems.has(item.id)
                          ? "Đang xuất..."
                          : isImplemented
                          ? "Tải Xuống"
                          : "Sắp có"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-select Options Modal */}
      {showOptions && (
        <div
          className="data-export-page__modal-overlay"
          onClick={handleCloseOptions}
        >
          <div
            className="data-export-page__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="data-export-page__modal-header">
              <h3>Tùy Chọn Xuất Dữ Liệu</h3>
              <button
                className="data-export-page__modal-close"
                onClick={handleCloseOptions}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="data-export-page__modal-content">
              <p className="data-export-page__modal-description">
                Các mục đã chọn để xuất dữ liệu:
              </p>

              <div className="data-export-page__selected-list">
                {exportItems
                  .filter((item) => selectedItems[item.id])
                  .map((item) => (
                    <div
                      key={item.id}
                      className="data-export-page__selected-item"
                    >
                      <div className="data-export-page__selected-item-icon">
                        <i
                          className={item.icon}
                          style={{ color: item.iconColor }}
                        ></i>
                      </div>
                      <div className="data-export-page__selected-item-content">
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                      </div>
                      <button
                        className="data-export-page__selected-item-remove"
                        onClick={() => handleToggleItem(item.id)}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="data-export-page__modal-footer">
              <button
                className="data-export-page__btn data-export-page__btn--text"
                onClick={handleCloseOptions}
              >
                Hủy
              </button>
              <button
                className="data-export-page__btn data-export-page__btn--primary"
                onClick={handleDownloadSelected}
                disabled={downloadingItems.size > 0}
              >
                <i className="bi bi-download me-2"></i>
                {downloadingItems.size > 0
                  ? "Đang xuất..."
                  : `Tải Xuống (${getSelectedCount()} mục)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item-specific Options Modal */}
      {showOptionsModal && (
        <div
          className="data-export-page__modal-overlay"
          onClick={handleCloseItemOptions}
        >
          <div
            className="data-export-page__modal"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const currentItem = exportItems.find(
                (item) => item.id === showOptionsModal
              );
              return (
                <>
                  <div className="data-export-page__modal-header">
                    <h3>Tùy Chọn: {currentItem?.title}</h3>
                    <button
                      className="data-export-page__modal-close"
                      onClick={handleCloseItemOptions}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </div>

                  <div className="data-export-page__modal-content">
                    <p className="data-export-page__modal-description">
                      Chọn các mục bạn muốn xuất:
                    </p>

                    <ItemOptionsComponent
                      item={currentItem}
                      onDownload={handleDownloadItemOptions}
                      onClose={handleCloseItemOptions}
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </UserLayout>
  );
}
