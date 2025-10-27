import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HoOCSidebar from '../../components/HoOCSidebar';
import UserHeader from '../../components/UserHeader';

const HoOCDepartmentDetail = () => {
  const { eventId, id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [department, setDepartment] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({
    name: '',
    email: '',
    role: 'Thành viên'
  });

  // Mock data cho department
  const mockDepartment = {
    id: 6,
    name: "Ban Hậu cần",
    description: "Nơi những công việc sau cánh gà toả sáng.",
    memberCount: 16,
    newMembersToday: 1,
    createdDate: "21/11/2024",
    lastModified: "21/11/2024",
    leader: "Đặng Đình Minh"
  };

  const mockMembers = [
    {
      id: 1,
      name: "Đặng Đình Minh",
      role: "Trưởng ban",
      email: "minhddhe180032@fpt.edu.vn",
      selected: false
    },
    {
      id: 2,
      name: "Arlene McCoy",
      role: "Phó ban",
      email: "arlenemccoyy@gmail.com",
      selected: false
    },
    {
      id: 3,
      name: "Cody Fisher",
      role: "Thành viên",
      email: "codyfisher21345@gmail.com",
      selected: false
    },
    {
      id: 4,
      name: "Esther Howard",
      role: "Thành viên",
      email: "howardvn123@gmail.com",
      selected: false
    },
    {
      id: 5,
      name: "Ronald Richards",
      role: "Thành viên",
      email: "ronaldrichards2@gmail.com",
      selected: false
    }
  ];

  useEffect(() => {
    setDepartment(mockDepartment);
    setMembers(mockMembers);
    setEditForm({
      name: mockDepartment.name,
      description: mockDepartment.description
    });
    setDeleteConfirmName(mockDepartment.name);
  }, [id]);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleSave = () => {
    // Xử lý lưu thay đổi
    console.log('Saving department:', editForm);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditForm({
      name: department.name,
      description: department.description
    });
  };

  const handleDeleteDepartment = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmName === department.name) {
      // Xử lý xóa department
      console.log('Deleting department:', department.id);
      navigate(`/events/${eventId}/hooc-manage-department`);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmName(department.name);
  };

  const handleMemberAction = (memberId, action) => {
    console.log(`Action: ${action} for member: ${memberId}`);
  };

  const handleAddMember = () => {
    setShowAddMemberModal(true);
  };

  const handleAddMemberSubmit = (e) => {
    e.preventDefault();
    if (addMemberForm.name.trim() && addMemberForm.email.trim()) {
      // Xử lý thêm thành viên mới
      const newMember = {
        id: members.length + 1,
        name: addMemberForm.name,
        email: addMemberForm.email,
        role: addMemberForm.role,
        selected: false
      };
      setMembers([...members, newMember]);
      setShowAddMemberModal(false);
      setAddMemberForm({ name: '', email: '', role: 'Thành viên' });
    }
  };

  const handleCancelAddMember = () => {
    setShowAddMemberModal(false);
    setAddMemberForm({ name: '', email: '', role: 'Thành viên' });
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!department) {
    return <div>Loading...</div>;
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <HoOCSidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        activePage="department-management"
      />
      
      <div 
        className="flex-grow-1" 
        style={{ 
          marginLeft: sidebarOpen ? '230px' : '70px',
          transition: 'margin-left 0.3s ease',
          padding: '20px'
        }}
      >
        {/* Header */}
        <UserHeader title="Department Detail Page" />

        {/* Main Content */}
        <div className="bg-white rounded-3 shadow-sm" style={{ padding: '30px' }}>
          {/* Department Header */}
          <div className="mb-4">
            <h3 style={{ color: '#dc2626', fontWeight: '600', marginBottom: '8px' }}>
              {department.name}
            </h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              {department.description}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="bg-light rounded-3 p-3 text-center">
                <i className="bi bi-people-fill text-primary me-2"></i>
                <span style={{ fontWeight: '600' }}>{department.memberCount} thành viên</span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="bg-light rounded-3 p-3 text-center">
                <i className="bi bi-person-plus text-success me-2"></i>
                <span style={{ fontWeight: '600' }}>{department.newMembersToday} thành viên mới hôm nay</span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="bg-light rounded-3 p-3 text-center">
                <i className="bi bi-clock text-info me-2"></i>
                <span style={{ fontWeight: '600' }}>Ngày tạo ban: {department.createdDate}</span>
              </div>
            </div>
            <div className="col-md-3">
              <div className="bg-light rounded-3 p-3 text-center">
                <i className="bi bi-clock text-warning me-2"></i>
                <span style={{ fontWeight: '600' }}>Thay đổi lần cuối: {department.lastModified}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-bottom mb-4">
            <nav>
              <div className="nav nav-tabs border-0">
                <button 
                  className={`nav-link ${activeTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('info')}
                  style={{ 
                    border: 'none',
                    color: activeTab === 'info' ? '#dc2626' : '#6b7280',
                    fontWeight: '500',
                    borderBottom: activeTab === 'info' ? '2px solid #dc2626' : 'none'
                  }}
                >
                  Thông tin
                </button>
                <button 
                  className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                  style={{ 
                    border: 'none',
                    color: activeTab === 'settings' ? '#dc2626' : '#6b7280',
                    fontWeight: '500',
                    borderBottom: activeTab === 'settings' ? '2px solid #dc2626' : 'none'
                  }}
                >
                  Cài đặt
                </button>
              </div>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div>
              {/* Member Management Bar */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm kiếm thành viên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '300px', borderRadius: '8px' }}
                />
                 <button 
                   className="btn btn-danger d-flex align-items-center"
                   onClick={handleAddMember}
                   style={{ 
                     backgroundColor: '#dc2626', 
                     border: 'none',
                     borderRadius: '8px',
                     padding: '10px 20px',
                     fontWeight: '500'
                   }}
                 >
                   <i className="bi bi-plus-lg me-2"></i>
                   Thêm thành viên
                 </button>
              </div>

              {/* Members Table */}
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                        <input type="checkbox" className="form-check-input" />
                      </th>
                      <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                        Họ và tên
                      </th>
                      <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                        Vai trò
                      </th>
                      <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                        Email
                      </th>
                      <th style={{ border: 'none', padding: '15px', fontWeight: '600', color: '#374151' }}>
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id}>
                        <td style={{ padding: '15px' }}>
                          <input type="checkbox" className="form-check-input" />
                        </td>
                        <td style={{ padding: '15px', fontWeight: '500', color: '#374151' }}>
                          {member.name}
                        </td>
                        <td style={{ padding: '15px', color: '#6b7280' }}>
                          {member.role}
                        </td>
                        <td style={{ padding: '15px', color: '#6b7280' }}>
                          {member.email}
                        </td>
                        <td style={{ padding: '15px' }}>
                          <div className="dropdown">
                            <button 
                              className="btn btn-link text-decoration-none"
                              data-bs-toggle="dropdown"
                              style={{ color: '#6b7280' }}
                            >
                              <i className="bi bi-three-dots"></i>
                            </button>
                            <ul className="dropdown-menu">
                              <li>
                                <button 
                                  className="dropdown-item"
                                  onClick={() => handleMemberAction(member.id, 'remove')}
                                >
                                  Xoá thành viên khỏi sự kiện
                                </button>
                              </li>
                              {member.role !== 'Trưởng ban' && (
                                <li>
                                  <button 
                                    className="dropdown-item"
                                    onClick={() => handleMemberAction(member.id, 'change_leader')}
                                  >
                                    Thay đổi trưởng ban
                                  </button>
                                </li>
                              )}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              {/* Department Details */}
              <div className="mb-4">
                <h5 style={{ color: '#1f2937', fontWeight: '600', marginBottom: '20px' }}>
                  Chi tiết ban
                </h5>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Tên ban</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editing ? editForm.name : department.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    disabled={!editing}
                    style={{ borderRadius: '8px' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Mô tả</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={editing ? editForm.description : department.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    disabled={!editing}
                    style={{ borderRadius: '8px' }}
                  ></textarea>
                </div>
              </div>

              {/* Department Leader */}
              <div className="mb-4">
                <h5 style={{ color: '#1f2937', fontWeight: '600', marginBottom: '20px' }}>
                  Trưởng ban
                </h5>
                <p style={{ color: '#6b7280', marginBottom: '15px' }}>
                  Mỗi ban cần phải có một trưởng ban. Trưởng ban Hậu cần hiện tại: {department.leader}
                </p>
                <button 
                  className="btn btn-primary"
                  style={{ borderRadius: '8px' }}
                >
                  Đổi trưởng ban
                </button>
              </div>

              {/* Delete Department */}
              <div>
                <h5 style={{ color: '#1f2937', fontWeight: '600', marginBottom: '20px' }}>
                  Xoá ban
                </h5>
                <button 
                  className="btn btn-danger d-flex align-items-center"
                  onClick={handleDeleteDepartment}
                  style={{ 
                    backgroundColor: '#dc2626', 
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: '500'
                  }}
                >
                  <i className="bi bi-trash me-2"></i>
                  Xoá ban vĩnh viễn
                </button>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '10px' }}>
                  Hành động này sẽ ảnh hưởng tới toàn bộ thành viên và không thể hoàn tác.
                </p>
              </div>

              {/* Edit Actions */}
              <div className="d-flex gap-2 mt-4">
                {!editing ? (
                  <button 
                    className="btn btn-outline-danger"
                    onClick={handleEdit}
                    style={{ borderRadius: '8px' }}
                  >
                    <i className="bi bi-pencil me-2"></i>
                    Chỉnh sửa
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn btn-danger"
                      onClick={handleSave}
                      style={{ borderRadius: '8px' }}
                    >
                      Lưu thay đổi
                    </button>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={handleCancel}
                      style={{ borderRadius: '8px' }}
                    >
                      Hủy
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
              minWidth: '400px',
              maxWidth: '500px',
              border: '1px solid #e5e7eb'
            }}
          >
            <div className="d-flex align-items-center mb-3">
              <i className="bi bi-exclamation-triangle-fill text-danger me-2" style={{ fontSize: '1.2rem' }}></i>
              <h5 className="mb-0" style={{ color: '#1f2937', fontWeight: '600' }}>
                Xoá ban
              </h5>
            </div>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Hành động này sẽ xoá vĩnh viễn ban này và không thể hoàn tác.
            </p>
            
            <div className="mb-3">
              <label className="form-label" style={{ color: '#374151', fontWeight: '500' }}>
                Tên ban
              </label>
              <input 
                type="text" 
                className="form-control"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Nhập tên ban để xác nhận"
                style={{ borderRadius: '8px' }}
              />
            </div>
            
            <div className="d-flex justify-content-end gap-2">
              <button 
                className="btn btn-outline-secondary"
                onClick={handleCancelDelete}
                style={{ borderRadius: '8px' }}
              >
                Huỷ
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmName !== department.name}
                style={{ borderRadius: '8px' }}
              >
                Xoá
              </button>
            </div>
           </div>
         </div>
       )}

       {/* Add Member Modal */}
       {showAddMemberModal && (
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
                 Thêm thành viên mới
               </h4>
               <button 
                 className="btn-close"
                 onClick={handleCancelAddMember}
               ></button>
             </div>
             
             <p style={{ color: '#6b7280', marginBottom: '20px' }}>
               Thêm thành viên mới vào ban {department.name}
             </p>
             
             <form onSubmit={handleAddMemberSubmit}>
               <div className="mb-3">
                 <label className="form-label fw-semibold">
                   Họ và tên <span className="text-danger">*</span>
                 </label>
                 <input 
                   type="text" 
                   className="form-control"
                   placeholder="Nhập họ và tên thành viên"
                   value={addMemberForm.name}
                   onChange={(e) => setAddMemberForm({...addMemberForm, name: e.target.value})}
                   style={{ borderRadius: '8px' }}
                   required
                 />
               </div>
               
               <div className="mb-3">
                 <label className="form-label fw-semibold">
                   Email <span className="text-danger">*</span>
                 </label>
                 <input 
                   type="email" 
                   className="form-control"
                   placeholder="Nhập email thành viên"
                   value={addMemberForm.email}
                   onChange={(e) => setAddMemberForm({...addMemberForm, email: e.target.value})}
                   style={{ borderRadius: '8px' }}
                   required
                 />
               </div>

               <div className="mb-4">
                 <label className="form-label fw-semibold">
                   Vai trò
                 </label>
                 <select 
                   className="form-select"
                   value={addMemberForm.role}
                   onChange={(e) => setAddMemberForm({...addMemberForm, role: e.target.value})}
                   style={{ borderRadius: '8px' }}
                 >
                   <option value="Thành viên">Thành viên</option>
                   <option value="Phó ban">Phó ban</option>
                   <option value="Trưởng ban">Trưởng ban</option>
                 </select>
               </div>
               
               <div className="d-flex justify-content-end gap-2">
                 <button 
                   type="button"
                   className="btn btn-outline-secondary"
                   onClick={handleCancelAddMember}
                   style={{ borderRadius: '8px' }}
                 >
                   Huỷ
                 </button>
                 <button 
                   type="submit"
                   className="btn btn-danger"
                   style={{ borderRadius: '8px' }}
                 >
                   Thêm thành viên
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}
     </div>
   );
 };
 
 export default HoOCDepartmentDetail;
