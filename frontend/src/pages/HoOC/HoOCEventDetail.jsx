import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import UserLayout from '../../components/UserLayout';
import { eventApi } from '../../apis/eventApi';

export default function HoOCEventDetail() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [event, setEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    description: '', 
    organizerName: '', 
    eventDate: '', 
    location: '', 
    status: '' 
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageInputType, setImageInputType] = useState("file"); // "url" hoặc "file"
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check if user is HoOC
  const isHoOC = user?.role === 'HoOC';

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const [eventRes, membersRes] = await Promise.all([
        eventApi.getById(eventId),
        eventApi.getEventSummary(eventId)
      ]);
      
      setEvent(eventRes.data);
      setMembers(membersRes.data.members || []);
      setEditForm({
        name: eventRes.data.name || '',
        description: eventRes.data.description || '',
        organizerName: eventRes.data.organizerName || '',
        eventDate: eventRes.data.eventDate || '',
        location: eventRes.data.location || '',
        status: eventRes.data.status || ''
      });
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Không thể tải thông tin sự kiện');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      // Validate required fields
      if (!editForm.name.trim()) {
        setError('Tên sự kiện không được để trống');
        return;
      }
      if (!editForm.organizerName.trim()) {
        setError('Tên người tổ chức không được để trống');
        return;
      }
      
      await eventApi.updateEvent(eventId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        organizerName: editForm.organizerName.trim(),
        eventDate: editForm.eventDate,
        location: editForm.location.trim(),
        status: editForm.status
      });
      
      setEditing(false);
      await fetchEventDetails();
      alert('Cập nhật thông tin sự kiện thành công!');
    } catch (error) {
      console.error('Update event error:', error);
      setError(error.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác.')) {
      return;
    }
    
    try {
      await eventApi.deleteEvent(eventId);
      navigate('/home-page');
    } catch (error) {
      setError('Xóa sự kiện thất bại');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Đã sao chép!');
  };

  const getImageSrc = (image) => {
    if (!image) return '/default-events.jpg';
    
    // Nếu image là array, lấy ảnh đầu tiên
    if (Array.isArray(image) && image.length > 0) {
      const firstImage = image[0];
      if (typeof firstImage === 'string' && firstImage.startsWith('data:')) {
        return firstImage;
      }
      return `data:image/jpeg;base64,${firstImage}`;
    }
    
    // Nếu image là string
    if (typeof image === 'string') {
      if (image.startsWith('data:')) {
        return image;
      }
      if (image.startsWith('http')) {
        return image;
      }
      return `data:image/jpeg;base64,${image}`;
    }
    
    return '/default-events.jpg';
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file hình ảnh hợp lệ");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Kích thước file không được vượt quá 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setImageFiles(prev => [...prev, file]);
      setImagePreviews(prev => [...prev, base64]);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlAdd = () => {
    if (!imageUrl.trim()) {
      setError("Vui lòng nhập URL hình ảnh");
      return;
    }

    // Validate URL
    try {
      new URL(imageUrl);
    } catch {
      setError("URL không hợp lệ");
      return;
    }

    setImagePreviews(prev => [...prev, imageUrl.trim()]);
    setImageUrl("");
    setError("");
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (index) => {
    if (!event.image || !Array.isArray(event.image)) return;
    
    try {
      setSubmitting(true);
      setError('');
      
      // Tạo array mới không có ảnh tại index
      const updatedImages = event.image.filter((_, i) => i !== index);
      
      await eventApi.replaceEventImages(eventId, updatedImages);
      await fetchEventDetails();
      alert('Xóa ảnh thành công!');
    } catch (error) {
      console.error('Remove image error:', error);
      setError('Xóa ảnh thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async () => {
    if (imagePreviews.length === 0) return;
    
    try {
      setSubmitting(true);
      setError("");
      
      // Convert files to base64
      const base64Images = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const base64 = await convertToBase64(imageFiles[i]);
        base64Images.push(base64);
      }
      
      // Add URL images
      const urlImages = imagePreviews.filter((_, i) => i >= imageFiles.length);
      const allImages = [...base64Images, ...urlImages];
      
      // Sử dụng replaceEventImages API để thay thế toàn bộ ảnh
      await eventApi.replaceEventImages(eventId, allImages);
      
      setImageFiles([]);
      setImagePreviews([]);
      setImageUrl("");
      await fetchEventDetails();
      alert('Cập nhật hình ảnh thành công!');
    } catch (error) {
      setError('Cập nhật hình ảnh thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <UserLayout title="Chi tiết sự kiện" sidebarType="hooc">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (!event) {
    return (
      <UserLayout title="Chi tiết sự kiện" sidebarType="hooc">
        <div className="alert alert-danger">Không tìm thấy sự kiện</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Chi tiết sự kiện" sidebarType="hooc">
      <style>{`
        .event-header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; }
        .event-title { font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; }
        .event-stats { display: flex; gap: 1rem; flex-wrap: wrap; }
        .stat-item { background: rgba(255,255,255,0.2); padding: 0.75rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; }
        .tab-nav { border-bottom: 2px solid #e5e7eb; margin-bottom: 2rem; }
        .tab-btn { border: none; background: none; padding: 1rem 2rem; font-weight: 600; color: #6b7280; border-bottom: 3px solid transparent; }
        .tab-btn.active { color: #dc2626; border-bottom-color: #dc2626; }
        .info-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
        .info-card h5 { color: #374151; margin-bottom: 1rem; font-weight: 600; }
        .form-control { border: 1px solid #d1d5db; border-radius: 8px; padding: 0.75rem; }
        .form-control:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.1); }
        .btn-danger { background: #dc2626; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; }
        .btn-danger:hover { background: #b91c1c; }
        .btn-outline-danger { border: 1px solid #dc2626; color: #dc2626; padding: 0.75rem 1.5rem; border-radius: 8px; }
        .btn-outline-danger:hover { background: #dc2626; color: white; }
        .member-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
        .copy-btn { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem; cursor: pointer; }
        .copy-btn:hover { background: #e5e7eb; }
        .event-image-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
        .event-image { width: 100%; height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem; }
        .event-image-placeholder { width: 100%; height: 200px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6b7280; margin-bottom: 1rem; }
        .image-actions { display: flex; gap: 0.5rem; }
        .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.875rem; }
      `}</style>

      {/* Event Header */}
      <div className="event-header">
        <div className="d-flex justify-content-between align-items-start">
          <h1 className="event-title">{event.name}</h1>
          {isHoOC && (
            <div className="d-flex gap-2">
              {!editing ? (
                <button 
                  className="btn btn-light btn-sm"
                  onClick={() => setEditing(true)}
                  title="Chỉnh sửa thông tin sự kiện"
                >
                  <i className="bi bi-pencil me-1"></i>Chỉnh sửa
                </button>
              ) : (
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={handleSave}
                    disabled={submitting}
                  >
                    <i className="bi bi-check me-1"></i>
                    {submitting ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button 
                    className="btn btn-outline-light btn-sm"
                    onClick={() => {
                      setEditing(false);
                      setError('');
                      setEditForm({
                        name: event.name,
                        description: event.description,
                        organizerName: event.organizerName,
                        eventDate: event.eventDate,
                        location: event.location,
                        status: event.status
                      });
                    }}
                  >
                    <i className="bi bi-x me-1"></i>Hủy
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="event-stats">
          <div className="stat-item">
            <i className="bi bi-people"></i>
            <span>{members.length} thành viên</span>
          </div>
          <div className="stat-item">
            <i className="bi bi-person-plus"></i>
            <span>1 thành viên mới hôm nay</span>
          </div>
          <div className="stat-item">
            <i className="bi bi-calendar"></i>
            <span>Ngày tạo: {new Date(event.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
          <div className="stat-item">
            <i className="bi bi-clock"></i>
            <span>D-Day: {new Date(event.eventDate).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Thông tin
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Cài đặt
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="row">
          {/* Event Image Card */}
          <div className="col-12">
            <div className="event-image-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Hình ảnh sự kiện</h5>
                {isHoOC && (
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setActiveTab('settings')}
                  >
                    <i className="bi bi-pencil me-1"></i>Chỉnh sửa ảnh
                  </button>
                )}
              </div>
              <div>
                {/* Hiển thị ảnh đầu tiên nếu có array */}
                {event.image && Array.isArray(event.image) && event.image.length > 0 ? (
                  <div className="position-relative">
                    <img 
                      src={getImageSrc(event.image)}
                      alt={event.name}
                      className="event-image"
                      onError={(e) => {
                        console.error("Event image load error:", event.image);
                        e.target.src = "/default-events.jpg";
                      }}
                      onLoad={() => {
                        console.log("Event image loaded successfully:", event.image);
                      }}
                    />
                    {/* Image count indicator nếu có nhiều ảnh */}
                    {event.image.length > 1 && (
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className="badge bg-dark bg-opacity-75 text-white">
                          <i className="bi bi-images me-1"></i>
                          {event.image.length}
                        </span>
                      </div>
                    )}
                    {/* Nút xóa ảnh */}
                    {isHoOC && (
                      <div className="position-absolute top-0 start-0 m-2">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            if (window.confirm('Bạn có chắc chắn muốn xóa ảnh này?')) {
                              removeExistingImage(0);
                            }
                          }}
                          disabled={submitting}
                          title="Xóa ảnh"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <img 
                    src={getImageSrc(event.image)}
                    alt={event.name}
                    className="event-image"
                    onError={(e) => {
                      console.error("Event image load error:", event.image);
                      e.target.src = "/default-events.jpg";
                    }}
                    onLoad={() => {
                      console.log("Event image loaded successfully:", event.image);
                    }}
                  />
                )}
                
                <div className="image-actions">
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => copyToClipboard(getImageSrc(event.image))}
                  >
                    <i className="bi bi-copy me-1"></i>Sao chép ảnh
                  </button>
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = getImageSrc(event.image);
                      link.download = `${event.name}-image.jpg`;
                      link.click();
                    }}
                  >
                    <i className="bi bi-download me-1"></i>Tải xuống
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="info-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Thông tin sự kiện</h5>
                {isHoOC && !editing && (
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setEditing(true)}
                  >
                    <i className="bi bi-pencil me-1"></i>Chỉnh sửa
                  </button>
                )}
              </div>
              <div className="mb-3">
                <strong>Tên sự kiện:</strong> {event.name}
              </div>
              <div className="mb-3">
                <strong>Người tổ chức:</strong> {event.organizerName}
              </div>
              <div className="mb-3">
                <strong>Ngày diễn ra:</strong> {new Date(event.eventDate).toLocaleDateString('vi-VN')}
              </div>
              <div className="mb-3">
                <strong>Địa điểm:</strong> {event.location || 'Chưa cập nhật'}
              </div>
              <div className="mb-3">
                <strong>Trạng thái:</strong> 
                <span className={`badge ms-2 ${
                  event.status === 'scheduled' ? 'bg-warning' :
                  event.status === 'ongoing' ? 'bg-success' :
                  event.status === 'completed' ? 'bg-secondary' :
                  'bg-danger'
                }`}>
                  {event.status === 'scheduled' ? 'Sắp diễn ra' :
                   event.status === 'ongoing' ? 'Đang diễn ra' :
                   event.status === 'completed' ? 'Đã kết thúc' :
                   'Đã hủy'}
                </span>
              </div>
              <div>
                <strong>Mô tả:</strong>
                <p className="mt-2">{event.description || 'Chưa có mô tả'}</p>
              </div>
            </div>
          </div>
          
          <div className="col-lg-4">
            <div className="info-card">
              <h5>Thành viên ({members.length})</h5>
              <div className="d-flex flex-wrap gap-2">
                {members.slice(0, 10).map((member, index) => (
                  <div key={index} className="member-avatar" title={member.userId?.fullName || 'Thành viên'}>
                    <i className="bi bi-person"></i>
                  </div>
                ))}
                {members.length > 10 && (
                  <div className="member-avatar">
                    <span className="small">+{members.length - 10}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="row">
          <div className="col-lg-8">
            {/* Event Details */}
            <div className="info-card">
              <h5>Chi tiết sự kiện</h5>
              <div className="mb-3">
                <label className="form-label fw-semibold">Tên sự kiện</label>
                <input
                  type="text"
                  className="form-control"
                  value={editing ? editForm.name : event.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  disabled={!editing}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Mô tả</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={editing ? editForm.description : event.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  disabled={!editing}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Người tổ chức</label>
                <input
                  type="text"
                  className="form-control"
                  value={editing ? editForm.organizerName : event.organizerName}
                  onChange={(e) => setEditForm({...editForm, organizerName: e.target.value})}
                  disabled={!editing}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Ngày diễn ra</label>
                <input
                  type="date"
                  className="form-control"
                  value={editing ? editForm.eventDate : event.eventDate}
                  onChange={(e) => setEditForm({...editForm, eventDate: e.target.value})}
                  disabled={!editing}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Địa điểm</label>
                <input
                  type="text"
                  className="form-control"
                  value={editing ? editForm.location : event.location}
                  onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                  disabled={!editing}
                  placeholder="Nhập địa điểm tổ chức sự kiện"
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Trạng thái</label>
                <select
                  className="form-control"
                  value={editing ? editForm.status : event.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  disabled={!editing}
                >
                  <option value="scheduled">Sắp diễn ra</option>
                  <option value="ongoing">Đang diễn ra</option>
                  <option value="completed">Đã kết thúc</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
              {isHoOC && editing && (
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  Bạn đang ở chế độ chỉnh sửa. Sử dụng nút "Lưu thay đổi" hoặc "Hủy" ở dưới form để hoàn tất.
                </div>
              )}
              
            </div>
            
            {/* Form Actions - chỉ hiển thị khi đang chỉnh sửa */}
            {isHoOC && editing && (
              <div className="info-card">
                <div className="alert alert-warning mb-3">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  DEBUG: editing = {editing.toString()}, isHoOC = {isHoOC.toString()}
                </div>
                <div className="d-flex gap-2 justify-content-end">
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setEditing(false);
                      setError('');
                      setEditForm({
                        name: event.name,
                        description: event.description,
                        organizerName: event.organizerName,
                        eventDate: event.eventDate,
                        location: event.location,
                        status: event.status
                      });
                    }}
                    disabled={submitting}
                  >
                    <i className="bi bi-x me-1"></i>Hủy
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={submitting}
                  >
                    <i className="bi bi-check me-1"></i>
                    {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            )}

            {/* Event Image Upload */}
            <div className="info-card">
              <h5>Hình ảnh sự kiện</h5>
              <div className="mb-3">
                <label className="form-label fw-semibold">Tải lên hình ảnh mới</label>

                {/* Image Input Type Toggle */}
                <div className="d-flex gap-2 mb-3">
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      imageInputType === "url"
                        ? "btn-primary"
                        : "btn-outline-primary"
                    }`}
                    onClick={() => setImageInputType("url")}
                    disabled={submitting}
                  >
                    <i className="bi bi-link-45deg me-1"></i>
                    URL
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      imageInputType === "file"
                        ? "btn-primary"
                        : "btn-outline-primary"
                    }`}
                    onClick={() => setImageInputType("file")}
                    disabled={submitting}
                  >
                    <i className="bi bi-upload me-1"></i>
                    Upload File
                  </button>
                </div>

                {/* URL Input */}
                {imageInputType === "url" && (
                  <div className="d-flex gap-2 mb-3">
                    <input
                      type="url"
                      className="form-control"
                      placeholder="Nhập URL hình ảnh..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleUrlAdd}
                      disabled={submitting || !imageUrl.trim()}
                    >
                      <i className="bi bi-plus"></i>
                    </button>
                  </div>
                )}

                {/* File Upload */}
                {imageInputType === "file" && (
                  <div className="mb-3">
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={submitting}
                    />
                    <small className="text-muted">
                      Chấp nhận: JPG, PNG, GIF. Kích thước tối đa: 5MB
                    </small>
                  </div>
                )}

                {/* Image Preview */}
                {imagePreviews.length > 0 && (
                  <div className="mt-3">
                    <label className="form-label fw-semibold">
                      Hình ảnh đã chọn:
                    </label>
                    <div className="row g-2">
                      {imagePreviews.map((img, index) => (
                        <div key={index} className="col-md-3">
                          <div className="position-relative">
                            <img
                              src={img}
                              alt={`Preview ${index + 1}`}
                              className="img-fluid rounded"
                              style={{
                                width: "100%",
                                height: "100px",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                e.target.src = "/default-events.jpg";
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                              onClick={() => removeImage(index)}
                              disabled={submitting}
                              style={{
                                width: "24px",
                                height: "24px",
                                padding: "0",
                              }}
                            >
                              <i
                                className="bi bi-x"
                                style={{ fontSize: "12px" }}
                              ></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {imagePreviews.length > 0 && (
                  <div className="d-flex gap-2 mt-3">
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={handleImageUpload}
                      disabled={submitting}
                    >
                      {submitting ? 'Đang tải lên...' : 'Tải lên ảnh'}
                    </button>
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setImageFiles([]);
                        setImagePreviews([]);
                        setImageUrl("");
                        setError("");
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Join Code */}
            <div className="info-card">
              <h5>Mã mời tham gia</h5>
              <div className="mb-3">
                <label className="form-label fw-semibold">Đường liên kết mời</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={`https://myfevent.vn/e/${event.joinCode}`}
                    readOnly
                  />
                  <button className="copy-btn" onClick={() => copyToClipboard(`https://myfevent.vn/e/${event.joinCode}`)}>
                    <i className="bi bi-copy"></i>
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Mã tham gia</label>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    value={event.joinCode}
                    readOnly
                  />
                  <button className="copy-btn" onClick={() => copyToClipboard(event.joinCode)}>
                    <i className="bi bi-copy"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Event Actions */}
            <div className="info-card">
              <h5>Hành động sự kiện</h5>
              <div className="d-flex gap-2 flex-wrap">
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => setEditing(true)}
                  disabled={editing}
                >
                  <i className="bi bi-pencil me-2"></i>Chỉnh sửa thông tin
                </button>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => setActiveTab('info')}
                >
                  <i className="bi bi-image me-2"></i>Xem hình ảnh
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={handleDelete}
                >
                  <i className="bi bi-trash me-2"></i>Xóa sự kiện
                </button>
              </div>
              <p className="text-muted small mt-3 mb-0">
                <i className="bi bi-exclamation-triangle me-1"></i>
                Xóa sự kiện sẽ ảnh hưởng tới toàn bộ thành viên và không thể hoàn tác.
              </p>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
