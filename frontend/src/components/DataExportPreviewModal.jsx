import React, { useState } from 'react';
import { Info, X } from "lucide-react";


export default function DataExportPreviewModal({ 
  show, 
  template, 
  previewType = 'data',
  onClose, 
  onDownload 
}) {
  const [loading, setLoading] = useState(false);

  if (!show || !template) return null;

  const getPreviewUrl = (template) => {
    if (!template.driveFileId) return null;
    
    switch(template.fileType) {
      case 'XLSX':
        return `https://docs.google.com/spreadsheets/d/${template.driveFileId}/preview`;
      case 'DOCX':
        return `https://docs.google.com/document/d/${template.driveFileId}/preview`;
      case 'PDF':
        return `https://drive.google.com/file/d/${template.driveFileId}/preview`;
      default:
        return null;
    }
  };

  const previewUrl = getPreviewUrl(template);

  const getPreviewTitle = () => {
    const baseTitle = template.title;
    const suffix = previewType === 'data' ? ' (Có dữ liệu mẫu)' : ' (Template trống)';
    return baseTitle + suffix;
  };

  return (
    <div 
      className="position-fixed w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        top: 0,
        left: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3 shadow-lg d-flex flex-column"
        style={{
          maxWidth: '1200px',
          width: '100%',
          height: '85vh' // Fixed height thay vì maxHeight
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Bootstrap classes */}
        <div className="d-flex justify-content-between align-items-start p-4 border-bottom flex-shrink-0">
          <div className="flex-grow-1">
            <h2 className="fs-5 fw-bold m-0 mb-1">
              {getPreviewTitle()}
            </h2>
            <p className="text-secondary small m-0">
              <span style={{backgroundColor: "green"}} className="badge me-2">{template.fileType}</span>
              {previewType === 'data' ? (
                <span className="text-success">
                  <i className="bi bi-database me-1"></i>
                  File này chứa dữ liệu mẫu giúp bạn hiểu cách sử dụng template.
                </span>
              ) : (
                <span className="text-primary">
                  <i className="bi bi-file-earmark me-1"></i>
                  File này là template trống, sẵn sàng để bạn nhập dữ liệu của mình.
                </span>
              )}
            </p>
          </div>
          <button 
            className="btn btn-link text-secondary p-0"
            style={{ fontSize: '28px', lineHeight: '1' }}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
              
        {/* Content - Bootstrap flex utilities */}
        <div className="flex-fill p-4 overflow-hidden">
          {previewUrl ? (
            <div className="h-100 border rounded overflow-hidden bg-light">
              <iframe 
                src={previewUrl}
                className="w-100 h-100 border-0"
                title={`Preview ${template.title}`}
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center">
              <i className="bi bi-eye-slash text-muted mb-3" style={{ fontSize: '4rem' }}></i>
              <h5 className="text-muted">Preview không khả dụng</h5>
              <p className="text-muted">
                File preview chưa được cấu hình hoặc link Google Drive không hợp lệ.
              </p>
              <button 
                className="btn btn-outline-primary"
                onClick={() => onDownload(template.id)}
              >
                <i className="bi bi-download me-2"></i>
                Tải file để xem
              </button>
            </div>
          )}
        </div>

        {/* Footer - Bootstrap classes */}
        <div style={{borderRadius: "10px"}} className="d-flex justify-content-between align-items-center p-3 border-top bg-light flex-shrink-0">
          <div className="small text-muted d-flex align-items-center">
            <i className="bi bi-info-circle me-1"></i>
            <span>
              {previewType === 'data' 
                ? `File ${template.fileType} có dữ liệu mẫu chỉ để tham khảo. Vui lòng bấm nút Tải xuống để bắt đầu nhập liệu` 
                : `Tải template ${template.fileType} trống để bắt đầu nhập liệu`
              }
            </span>
          </div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-primary"
              onClick={() => onDownload(template.id)}
            >
              <i className="bi bi-download me-2"></i>
              {previewType === 'data' ? 'Tải File Mẫu' : 'Tải Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}