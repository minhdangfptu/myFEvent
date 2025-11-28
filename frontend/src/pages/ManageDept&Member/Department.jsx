import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import UserLayout from '../../components/UserLayout';
import { departmentService } from '../../services/departmentService';
import NoDataImg from '~/assets/no-data.png';
import Loading from '~/components/Loading';
import { useEvents } from '~/contexts/EventContext';
import { ArrowUp, Plus, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const Department = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId } = useParams();
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [evenntRole, setEventRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { fetchEventRole } = useEvents();

  useEffect(() => {
    setRoleLoading(true);
    fetchEventRole(eventId).then(role => {
      setEventRole(role);
      setRoleLoading(false);
    });
  }, [eventId]);

  // Handle toast notification from navigation state (e.g., after delete)
  useEffect(() => {
    if (location.state?.showToast) {
      if (location.state.toastType === 'success') {
        toast.success(location.state.toastMessage);
      } else if (location.state.toastType === 'error') {
        toast.error(location.state.toastMessage);
      }
      // Clear the state to prevent toast from showing on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const getSidebarType = () => {
    if (evenntRole === 'HoOC') return 'HoOC';
    if (evenntRole === 'HoD') return 'HoD';
    if (evenntRole === 'Member') return 'Member';
    return 'user';
  }

  useEffect(() => {
    fetchDepartments();
  }, [eventId]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentService.getDepartments(eventId);
      const mappedDepartments = (response || []).map(dept => ({
        ...dept,
        leader: dept.leaderName || 'Chưa có',
        action: 'Xem chi tiết'
      }));
      setDepartments(mappedDepartments);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError('Không thể tải danh sách ban');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = () => {
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      setError('');

      const response = await departmentService.createDepartment(eventId, {
        name: createForm.name.trim(),
        description: createForm.description.trim()
      });

      const newDepartment = {
        ...response,
        leader: response.leaderName || 'Chưa có',
        action: 'Xem chi tiết'
      };

      // Thêm ban mới vào danh sách
      setDepartments([...departments, newDepartment]);

      // Đóng modal và reset form
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });

      toast.success('Tạo ban thành công!');
    } catch (err) {
      console.error('Error creating department:', err);
      setError(err.response?.data?.message || 'Tạo ban thất bại');
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewDetails = (departmentId) => {
    navigate(`/events/${eventId}/department-detail/${departmentId}`);
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDepartments = filteredDepartments.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Auto scroll to top when pagination changes
  useEffect(() => {
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // Show loading while fetching role to prevent showing wrong sidebar
  if (roleLoading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Loading />
        <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải thông tin sự kiện...</div>
      </div>
    );
  }

  return (
    <UserLayout
      title="Quản lý phân ban sự kiện"
      sidebarType={getSidebarType()}
      activePage="department-management"
      eventId={eventId}
    >
      <ToastContainer position="top-right" autoClose={3000} />
      {/* Main Content */}
      <div  className="bg-white rounded-3 shadow-sm" style={{height: "80vh", padding: '30px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 style={{ color: '#dc2626', fontWeight: '600', margin: 0 }}>
              Danh sách các ban
            </h3>
            <div className="d-flex align-items-center gap-3">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm ban..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '250px', borderRadius: '8px' }}
              />
              {evenntRole === 'HoOC' && (<button
                className="btn btn-danger d-flex align-items-center"
                onClick={handleCreateDepartment}
                style={{
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: '500'
                }}
              >
                <Plus className="me-2" size={18} />
                 Tạo ban
              </button>
              )}
            </div>
          </div>

          {/* Departments Table */}
          {loading ? (
            <div className="d-flex flex-column justify-content-center align-items-center py-5">
              <Loading />
              <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải danh sách ban...</div>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="d-flex flex-column justify-content-center align-items-center py-4">
              <img src={NoDataImg} alt="Không có dữ liệu" style={{ width: 200, maxWidth: '50vw', opacity: 0.8 }} />
              <div className="text-muted mt-3" style={{ fontSize: 18 }}>Chưa có ban nào được tạo!</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                      <ArrowUp className="text-success me-1" size={16} />
                      Tên Ban
                    </th>
                    <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                      <ArrowUp className="text-success me-1" size={16} />
                      Trưởng Ban
                    </th>
                    <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                      <ArrowUp className="text-success me-1" size={16} />
                      Số thành viên
                    </th>
                    <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                      <ArrowUp className="text-success me-1" size={16} />
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentDepartments.map((dept, index) => (
                    <tr
                      key={dept.id}
                      style={{
                        backgroundColor: index === 0 ? '#f8fafc' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleViewDetails(dept.id)}
                    >
                      <td style={{ padding: '15px', fontWeight: '500', color: '#374151' }}>
                        {dept.name}
                      </td>
                      <td style={{ padding: '15px', color: '#6b7280' }}>
                        {dept.leader}
                      </td>
                      <td style={{ padding: '15px', color: '#6b7280' }}>
                        {dept.memberCount}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span 
                          className="text-primary"
                          style={{ cursor: 'pointer', fontWeight: '500' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(dept.id);
                          }}
                        >
                          {dept.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <div className="d-flex align-items-center" style={{ gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="btn"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    color: '#9ca3af',
                    padding: 0,
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCurrentPage(n)}
                    disabled={loading}
                    className="btn"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      border: '1px solid ' + (n === currentPage ? '#dc2626' : '#e5e7eb'),
                      background: n === currentPage ? '#dc2626' : '#fff',
                      color: n === currentPage ? '#fff' : '#111827',
                      padding: 0,
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                  className="btn"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    color: '#9ca3af',
                    padding: 0,
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Create Department Modal */}
      {showCreateModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            zIndex: 1050 
          }}
        >
          <div 
            className="bg-white rounded-3 p-4"
            style={{ 
              minWidth: '500px',
              maxWidth: '600px',
              border: '1px solid #e5e7eb'
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0" style={{ color: '#1f2937', fontWeight: '600' }}>
                Tạo ban mới
              </h4>
              <button 
                className="btn-close"
                onClick={() => setShowCreateModal(false)}
              ></button>
            </div>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Thêm ban, thêm những cánh tay phải mạnh mẽ cho mình!
            </p>
            
            {error && (
              <div className="alert alert-danger mb-3">
                {error}
              </div>
            )}
            
            <form onSubmit={handleCreateSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Tên ban <span className="text-danger">*</span>
                </label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Tên ban"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  style={{ borderRadius: '8px' }}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Mô tả <span className="text-danger">*</span>
                </label>
                <textarea 
                  className="form-control"
                  rows="4"
                  placeholder="Hãy mô tả ban của bạn"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  style={{ borderRadius: '8px' }}
                  required
                ></textarea>
              </div>
              
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCreateModal(false)}
                  style={{ borderRadius: '8px' }}
                  disabled={isCreating}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="btn btn-danger d-flex align-items-center"
                  style={{ borderRadius: '8px' }}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <RefreshCw className="spin-animation me-2" size={18} />
                  ) : (
                    <Check className="me-2" size={18} />
                  )}
                  {isCreating ? 'Đang tạo...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default Department;
