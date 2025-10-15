import { useMemo, useState } from 'react';
import UserLayout from '../../components/UserLayout';

export default function Task() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('Tên');
  const [filterPriority, setFilterPriority] = useState('Tất cả');
  const [filterStatus, setFilterStatus] = useState('Tất cả');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    owner: '',
    due: '',
    status: 'Đang làm',
    priority: 'Trung bình',
    description: ''
  });

  const initialTasks = useMemo(() => ([
    { id: 1, name: 'Chuẩn bị bàn ghế khu vực check-in', owner: 'Bạn (Hậu cần)', due: '10/10/2025', status: 'Đang làm', priority: 'Cao', description: 'Sắp xếp 50 bộ bàn ghế tại khu vực lễ tân' },
    { id: 2, name: 'Kiểm tra thiết bị âm thanh', owner: 'Bạn (Hậu cần)', due: '11/10/2025', status: 'Đang làm', priority: 'Trung bình', description: 'Test loa, micro và hệ thống âm thanh' },
    { id: 3, name: 'Mua nước uống cho khách mời', owner: 'Bạn (Hậu cần)', due: '12/10/2025', status: 'Đang làm', priority: 'Thấp', description: 'Đặt mua 200 chai nước và đồ uống' },
    { id: 4, name: 'Sắp xếp kho đạo cụ', owner: 'Tất cả thành viên ban Hậu cần', due: '13/10/2025', status: 'Hoàn thành', priority: 'Cao', description: 'Phân loại và sắp xếp lại kho đạo cụ' },
    { id: 5, name: 'Chuẩn bị khu vực hậu trường', owner: 'Tất cả thành viên sự kiện', due: '14/10/2025', status: 'Tạm hoãn', priority: 'Trung bình', description: 'Setup phòng thay đồ và khu vực nghỉ ngơi' }
  ]), []);

  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(null);

  const priorityColor = (p) => {
    if (p === 'Cao') return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
    if (p === 'Thấp') return { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
    return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
  };

  const statusColor = (s) => {
    if (s === 'Hoàn thành') return { bg: '#DCFCE7', color: '#16A34A' };
    if (s === 'Tạm hoãn')   return { bg: '#FEE2E2', color: '#DC2626' };
    return { bg: '#FEF3C7', color: '#D97706' }; // Đang làm
  };

  const filteredTasks = tasks
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    .filter(t => filterPriority === 'Tất cả' || t.priority === filterPriority)
    .filter(t => filterStatus === 'Tất cả' || t.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'Tên') return a.name.localeCompare(b.name);
      if (sortBy === 'Hạn chót') return new Date(a.due.split('/').reverse().join('-')) - new Date(b.due.split('/').reverse().join('-'));
      if (sortBy === 'Ưu tiên') {
        const priority = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };
        return priority[b.priority] - priority[a.priority];
      }
      return 0;
    });

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Hoàn thành').length,
    inProgress: tasks.filter(t => t.status === 'Đang làm').length,
    paused: tasks.filter(t => t.status === 'Tạm hoãn').length,
    highPriority: tasks.filter(t => t.priority === 'Cao').length
  };

  const handleAddTask = () => {
    if (!newTask.name || !newTask.owner || !newTask.due) return;
    const task = { id: Date.now(), ...newTask };
    setTasks([...tasks, task]);
    setNewTask({ name: '', owner: '', due: '', status: 'Đang làm', priority: 'Trung bình', description: '' });
    setShowAddModal(false);
  };

  const handleUpdateTaskStatus = (taskId, newStatus) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setSelectedTask(st => st && st.id === taskId ? { ...st, status: newStatus } : st);
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Bạn có chắc muốn xóa nhiệm vụ này?')) {
      setTasks(tasks.filter(t => t.id !== taskId));
      setSelectedTask(null);
    }
  };

  return (
    <UserLayout title="Công việc" activePage="task">
      <style>{`
        .task-header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px; }
        .stat-card { background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .soft-input { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; height: 44px; transition: all 0.2s; }
        .soft-input:focus { background: white; border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .soft-card { background: white; border: 1px solid #E5E7EB; border-radius: 16px; box-shadow: 0 1px 3px rgba(16,24,40,.06); }

        .task-row { cursor: pointer; transition: background 0.2s; }
        .task-row:hover { background: #F9FAFB; }
        .priority-badge { padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 500; border: 1px solid; }
        .status-badge { padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .status-badge:hover { opacity: 0.8; }

        /* Bo góc bảng + đồng bộ header/body */
        .rounded-table { border-radius: 16px; overflow: hidden; }
        .rounded-table table { margin-bottom: 0; }
        .rounded-table thead { background: #F9FAFB; }
        .rounded-table thead th { border-bottom: 2px solid #E5E7EB !important; }

        /* Viền nhẹ cho các dòng */
        .rounded-table tbody tr:not(:last-child) td { border-bottom: 1px solid #EEF2F7; }

        /* Đẩy lề trái cho cột tên để thoáng hơn */
        .col-name { padding-left: 20px !important; }
      `}</style>

      <div className="container-fluid" style={{ maxWidth: 1200 }}>
        {/* Header with stats */}
        <div className="task-header">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h3 className="mb-2">📋 Quản lý Nhiệm vụ</h3>
              <p className="mb-0 opacity-75">Theo dõi và quản lý tất cả các nhiệm vụ của sự kiện</p>
            </div>
            <div className="col-md-6">
              <div className="row g-2">
                <div className="col-6">
                  <div className="stat-card text-center" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                    <div className="fs-4 fw-bold">{taskStats.completed}/{taskStats.total}</div>
                    <div className="small">Hoàn thành</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="stat-card text-center" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                    <div className="fs-4 fw-bold">{taskStats.highPriority}</div>
                    <div className="small">Ưu tiên cao</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="🔍 Tìm kiếm nhiệm vụ..." 
            className="form-control soft-input" 
            style={{ width: 320, paddingLeft: 16 }} 
          />

          {/* Dropdown trạng thái */}
          <select
            className="form-select form-select-sm soft-input"
            style={{ width: 160, height: 40 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Đang làm">Đang làm</option>
            <option value="Hoàn thành">Hoàn thành</option>
            <option value="Tạm hoãn">Tạm hoãn</option>
          </select>

          <div className="ms-auto d-flex align-items-center gap-2">
            <select 
              className="form-select form-select-sm soft-input" 
              style={{ width: 160, height: 40 }} 
              value={filterPriority} 
              onChange={(e) => setFilterPriority(e.target.value)}
              aria-label="Lọc theo mức độ ưu tiên"
            >
              <option value="Tất cả">Tất cả mức độ</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>

            <select 
              className="form-select form-select-sm soft-input" 
              style={{ width: 140, height: 40 }} 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sắp xếp"
            >
              <option value="Tên">Tên</option>
              <option value="Hạn chót">Hạn chót</option>
              <option value="Ưu tiên">Ưu tiên</option>
            </select>

            <button className="add-btn" onClick={() => setShowAddModal(true)}>
              + Thêm nhiệm vụ
            </button>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="soft-card rounded-table">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr className="text-muted">
                  <th className="py-3 col-name" style={{ width: '35%' }}>Tên nhiệm vụ</th>
                  <th className="py-3" style={{ width: '20%' }}>Người phụ trách</th>
                  <th className="py-3" style={{ width: '12%' }}>Hạn chót</th>
                  <th className="py-3" style={{ width: '18%' }}>Trạng thái</th>
                  <th className="py-3" style={{ width: '15%' }}>Mức độ</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <div style={{ fontSize: 48 }}>📭</div>
                      <div className="mt-2">Không tìm thấy nhiệm vụ nào</div>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="task-row" onClick={() => setSelectedTask(t)}>
                      <td className="py-3 col-name">
                        <div className="fw-medium">{t.name}</div>
                      </td>
                      <td className="py-3 text-muted small">{t.owner}</td>
                      <td className="py-3">
                        <span className="small text-muted">📅 {t.due}</span>
                      </td>
                      <td className="py-3">
                        <span 
                          className="status-badge"
                          style={{ background: statusColor(t.status).bg, color: statusColor(t.status).color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const statuses = ['Đang làm', 'Hoàn thành', 'Tạm hoãn'];
                            const currentIndex = statuses.indexOf(t.status);
                            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                            handleUpdateTaskStatus(t.id, nextStatus);
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span 
                          className="priority-badge"
                          style={{ 
                            background: priorityColor(t.priority).bg,
                            color: priorityColor(t.priority).color,
                            borderColor: priorityColor(t.priority).border
                          }}
                        >
                          {t.priority}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <>
          <div className="overlay" onClick={() => setSelectedTask(null)} />
          <div className={`task-detail-panel ${selectedTask ? 'open' : ''}`}>
            <div className="p-4" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <h5 className="mb-0">Chi tiết nhiệm vụ</h5>
                <button className="btn btn-sm btn-light rounded-circle" style={{ width: 32, height: 32 }} onClick={() => setSelectedTask(null)}>×</button>
              </div>

              <div className="flex-grow-1 overflow-auto">
                <div className="mb-4">
                  <label className="text-muted small mb-2">Tên nhiệm vụ</label>
                  <div className="fw-semibold fs-5">{selectedTask.name}</div>
                </div>

                <div className="mb-4">
                  <label className="text-muted small mb-2">Mô tả</label>
                  <div className="text-muted">{selectedTask.description || 'Chưa có mô tả'}</div>
                </div>

                <div className="mb-4">
                  <label className="text-muted small mb-2">Người phụ trách</label>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: 20 }}>👤</span>
                    <span>{selectedTask.owner}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-muted small mb-2">Hạn chót</label>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: 20 }}>📅</span>
                    <span>{selectedTask.due}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-muted small mb-2">Trạng thái</label>
                  <select className="form-select" value={selectedTask.status} onChange={(e) => handleUpdateTaskStatus(selectedTask.id, e.target.value)}>
                    <option value="Đang làm">Đang làm</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Tạm hoãn">Tạm hoãn</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="text-muted small mb-2">Mức độ ưu tiên</label>
                  <div>
                    <span 
                      className="priority-badge"
                      style={{ 
                        background: priorityColor(selectedTask.priority).bg,
                        color: priorityColor(selectedTask.priority).color,
                        borderColor: priorityColor(selectedTask.priority).border
                      }}
                    >
                      {selectedTask.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-top pt-3">
                <button className="btn btn-danger w-100" onClick={() => handleDeleteTask(selectedTask.id)}>
                  🗑️ Xóa nhiệm vụ
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <>
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 1050 }} onClick={() => setShowAddModal(false)} />
          <div className="modal d-block" tabIndex={-1} style={{ zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">➕ Thêm nhiệm vụ mới</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Tên nhiệm vụ *</label>
                    <input type="text" className="form-control" value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} placeholder="Nhập tên nhiệm vụ..." />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Người phụ trách *</label>
                    <input type="text" className="form-control" value={newTask.owner} onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })} placeholder="Nhập tên người phụ trách..." />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Hạn chót *</label>
                    <input 
                      type="date" 
                      className="form-control"
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        if (isNaN(date)) return;
                        const formatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                        setNewTask({ ...newTask, due: formatted });
                      }}
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Trạng thái</label>
                      <select className="form-select" value={newTask.status} onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}>
                        <option value="Đang làm">Đang làm</option>
                        <option value="Hoàn thành">Hoàn thành</option>
                        <option value="Tạm hoãn">Tạm hoãn</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Mức độ ưu tiên</label>
                      <select className="form-select" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                        <option value="Cao">Cao</option>
                        <option value="Trung bình">Trung bình</option>
                        <option value="Thấp">Thấp</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-0">
                    <label className="form-label">Mô tả</label>
                    <textarea className="form-control" rows={3} value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Mô tả ngắn..." />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>Hủy</button>
                  <button type="button" className="btn btn-primary" onClick={handleAddTask}>Thêm nhiệm vụ</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </UserLayout>
  );
}
