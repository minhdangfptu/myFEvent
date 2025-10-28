import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { departmentService } from '../../services/departmentService';

const HoOCManageDepartment = () => {
  const navigate = useNavigate();
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
    try {
      setLoading(true);
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
      
      alert('Tạo ban thành công!');
    } catch (err) {
      console.error('Error creating department:', err);
      setError(err.response?.data?.message || 'Tạo ban thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (departmentId) => {
    navigate(`/events/${eventId}/hooc-department-detail/${departmentId}`);
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <UserLayout
      title="Manage Department Page"
      sidebarType="hooc"
      activePage="department-management"
    >
      {/* Main Content */}
      <div className="bg-white rounded-3 shadow-sm" style={{ padding: '30px' }}>
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
              <button 
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
                <i className="bi bi-plus-lg me-2"></i>
                 Tạo ban
              </button>
            </div>
          </div>

          {/* Departments Table */}
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                    <i className="bi bi-arrow-up text-success me-1"></i>
                    Tên Ban
                  </th>
                  <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                    <i className="bi bi-arrow-up text-success me-1"></i>
                    Trưởng Ban
                  </th>
                  <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                    <i className="bi bi-arrow-up text-success me-1"></i>
                    Số thành viên
                  </th>
                  <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                    <i className="bi bi-arrow-up text-success me-1"></i>
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept, index) => (
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

          {/* Pagination */}
          <div className="d-flex justify-content-center mt-4">
            <nav>
              <ul className="pagination">
                <li className="page-item">
                  <span className="page-link" style={{ color: '#6b7280' }}>&lt;</span>
                </li>
                <li className="page-item active">
                  <span className="page-link" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: 'white' }}>1</span>
                </li>
                <li className="page-item">
                  <span className="page-link" style={{ color: '#6b7280' }}>&gt;</span>
                </li>
              </ul>
            </nav>
          </div>
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
                >
                  Huỷ
                </button>
                <button 
                  type="submit"
                  className="btn btn-danger"
                  style={{ borderRadius: '8px' }}
                  disabled={loading}
                >
                  {loading ? 'Đang tạo...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default HoOCManageDepartment;
