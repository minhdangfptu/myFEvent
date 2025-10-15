import { useMemo, useState } from 'react';
import UserLayout from '../../components/UserLayout';

export default function Risk() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('Tên');
  const [filterLevel, setFilterLevel] = useState('Tất cả');
  const [filterStatus, setFilterStatus] = useState('Tất cả');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newRisk, setNewRisk] = useState({
    name: '',
    owner: '',
    status: 'Đang xử lý',
    level: 'Trung bình',
    description: '',
    mitigation: ''
  });

  const initialRisks = useMemo(() => ([
    { id: 1, name: 'Thiếu nhân lực trong ngày sự kiện', owner: 'Bạn (Hậu cần)', status: 'Đang xử lý', level: 'Cao', description: 'Khó tuyển đủ TNV cho các vị trí.', mitigation: 'Tuyển bổ sung, xoay ca, hợp tác CLB khác.' },
    { id: 2, name: 'Chậm giao vật tư trang trí', owner: 'Bạn (Hậu cần)', status: 'Đang xử lý', level: 'Trung bình', description: 'Nhà cung cấp báo dời lịch.', mitigation: 'Đổi NCC dự phòng, điều chỉnh timeline setup.' },
    { id: 3, name: 'Thiết bị âm thanh không ổn định', owner: 'Bạn (Kỹ thuật)', status: 'Đang xử lý', level: 'Thấp', description: 'Loa feedback, micro nhiễu.', mitigation: 'Test lại full, có thiết bị dự phòng.' },
    { id: 4, name: 'Thiếu TNV khu vực hậu trường', owner: 'Tất cả thành viên ban Hậu cần', status: 'Đang xử lý', level: 'Cao', description: 'Nhiều vị trí backstage trống.', mitigation: 'Điều phối TNV cross-ban, rút bớt checkpoint.' },
    { id: 5, name: 'Thời tiết xấu ảnh hưởng khu ngoài trời', owner: 'Tất cả thành viên sự kiện', status: 'Tạm hoãn', level: 'Cao', description: 'Mưa to trong khung giờ chính.', mitigation: 'Phương án B: chuyển sảnh trong nhà, thuê dù lớn.' }
  ]), []);

  const [risks, setRisks] = useState(initialRisks);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const levelChipStyle = (lv) => {
    if (lv === 'Cao') return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
    if (lv === 'Thấp') return { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
    return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
  };
  const statusChipStyle = (st) => {
    if (st === 'Đã xử lý') return { bg: '#DCFCE7', color: '#16A34A' };
    if (st === 'Tạm hoãn') return { bg: '#FEE2E2', color: '#DC2626' };
    return { bg: '#FEF3C7', color: '#D97706' };
  };
  const priorityOrder = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };

  const filteredRisks = risks
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .filter(r => filterLevel === 'Tất cả' || r.level === filterLevel)
    .filter(r => filterStatus === 'Tất cả' || r.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'Tên') return a.name.localeCompare(b.name);
      if (sortBy === 'Mức độ') return priorityOrder[b.level] - priorityOrder[a.level];
      if (sortBy === 'Trạng thái') return a.status.localeCompare(b.status);
      return 0;
    });

  const riskStats = {
    total: risks.length,
    high: risks.filter(r => r.level === 'Cao').length,
    resolved: risks.filter(r => r.status === 'Đã xử lý').length
  };

  const addRisk = () => {
    if (!newRisk.name || !newRisk.owner) return;
    setRisks(prev => [...prev, { id: Date.now(), ...newRisk }]);
    setNewRisk({ name: '', owner: '', status: 'Đang xử lý', level: 'Trung bình', description: '', mitigation: '' });
    setShowAddModal(false);
  };
  const deleteRisk = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa rủi ro này?')) {
      setRisks(prev => prev.filter(r => r.id !== id));
      setSelectedRisk(null);
    }
  };
  const updateRiskStatus = (id, status) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setSelectedRisk(sr => sr && sr.id === id ? { ...sr, status } : sr);
  };
  const updateRiskLevel = (id, level) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, level } : r));
    setSelectedRisk(sr => sr && sr.id === id ? { ...sr, level } : sr);
  };
  const updateRiskField = (id, field, value) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setSelectedRisk(sr => sr && sr.id === id ? { ...sr, [field]: value } : sr);
  };

  return (
    <UserLayout title="Rủi ro" activePage="risk">
      <style>{`
        .task-header { background: linear-gradient(135deg, #F43F5E 0%, #E11D48 100%); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px; }
        .stat-card { background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .soft-input { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; height: 44px; transition: all 0.2s; }
        .soft-input:focus { background: white; border-color: #EF4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
        .soft-card { background: white; border: 1px solid #E5E7EB; border-radius: 16px; box-shadow: 0 1px 3px rgba(16,24,40,.06); }

        .risk-row { cursor: pointer; transition: background 0.2s; }
        .risk-row:hover { background: #F9FAFB; }
        .chip { padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 500; border: 1px solid transparent; display: inline-block; }
        .chip-level { border: 1px solid; }

        /* Bo góc bảng + viền nhẹ */
        .rounded-table { border-radius: 16px; overflow: hidden; }
        .rounded-table table { margin-bottom: 0; }
        .rounded-table thead { background: #F9FAFB; }
        .rounded-table thead th { border-bottom: 2px solid #E5E7EB !important; }
        .rounded-table tbody tr:not(:last-child) td { border-bottom: 1px solid #EEF2F7; }

        /* Đẩy lề trái cho cột tên rủi ro */
        .col-name { padding-left: 20px !important; }
      `}</style>

      <div className="container-fluid" style={{ maxWidth: 1200 }}>
        {/* Header thống kê */}
        <div className="task-header">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h3 className="mb-2">⚠️ Quản lý Rủi ro</h3>
              <p className="mb-0 opacity-75">Theo dõi, giảm thiểu và xử lý rủi ro của sự kiện</p>
            </div>
            <div className="col-md-6">
              <div className="row g-2">
                <div className="col-6">
                  <div className="stat-card text-center" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                    <div className="fs-4 fw-bold">{riskStats.high}/{riskStats.total}</div>
                    <div className="small">Mức độ cao</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="stat-card text-center" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                    <div className="fs-4 fw-bold">{riskStats.resolved}</div>
                    <div className="small">Đã xử lý</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm kiếm rủi ro..."
            className="form-control soft-input"
            style={{ width: 320, paddingLeft: 16 }}
          />

          <div className="ms-auto d-flex align-items-center gap-2">
            {/* Dropdown trạng thái */}
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 180, height: 40 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Đã xử lý">Đã xử lý</option>
              <option value="Tạm hoãn">Tạm hoãn</option>
            </select>

            {/* Dropdown mức độ */}
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 160, height: 40 }}
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              aria-label="Lọc theo mức độ"
            >
              <option value="Tất cả">Tất cả mức độ</option>
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>

            {/* Dropdown sắp xếp */}
            <select
              className="form-select form-select-sm soft-input"
              style={{ width: 140, height: 40 }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sắp xếp"
            >
              <option value="Tên">Tên</option>
              <option value="Mức độ">Mức độ</option>
              <option value="Trạng thái">Trạng thái</option>
            </select>

            <button className="add-btn" onClick={() => setShowAddModal(true)} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 500 }}>
              + Thêm rủi ro
            </button>
          </div>
        </div>

        {/* Bảng rủi ro */}
        <div className="soft-card rounded-table">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr className="text-muted">
                  <th className="py-3 col-name" style={{ width: '38%' }}>Tên rủi ro</th>
                  <th className="py-3" style={{ width: '24%' }}>Người chịu trách nhiệm</th>
                  <th className="py-3" style={{ width: '18%' }}>Trạng thái</th>
                  <th className="py-3" style={{ width: '20%' }}>Mức độ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRisks.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                      <div style={{ fontSize: 48 }}>🫙</div>
                      <div className="mt-2">Không tìm thấy rủi ro nào</div>
                    </td>
                  </tr>
                ) : (
                  filteredRisks.map(r => (
                    <tr key={r.id} className="risk-row" onClick={() => setSelectedRisk(r)}>
                      <td className="py-3 col-name">
                        <div className="fw-medium">{r.name}</div>
                      </td>
                      <td className="py-3 text-muted small">{r.owner}</td>
                      <td className="py-3">
                        <span
                          className="chip"
                          style={{ background: statusChipStyle(r.status).bg, color: statusChipStyle(r.status).color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const flow = ['Đang xử lý', 'Đã xử lý', 'Tạm hoãn'];
                            const next = flow[(flow.indexOf(r.status) + 1) % flow.length];
                            updateRiskStatus(r.id, next);
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className="chip chip-level"
                          style={{ 
                            background: levelChipStyle(r.level).bg,
                            color: levelChipStyle(r.level).color,
                            borderColor: levelChipStyle(r.level).border
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
        </div>
      </div>

      {/* Panel chi tiết */}
      {selectedRisk && (
        <>
          <div className="overlay" onClick={() => setSelectedRisk(null)} />
          <div className="soft-card detail-panel open">
            <div className="p-4" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <h5 className="mb-0">Chi tiết rủi ro</h5>
                <button className="btn btn-sm btn-light rounded-circle" style={{ width: 32, height: 32 }} onClick={() => setSelectedRisk(null)}>×</button>
              </div>

              <div className="flex-grow-1 overflow-auto">
                <div className="mb-4">
                  <label className="text-muted small mb-2">Tên rủi ro</label>
                  <div className="fw-semibold fs-5">{selectedRisk.name}</div>
                </div>

                <div className="mb-4">
                  <label className="text-muted small mb-2">Mô tả</label>
                  <textarea className="form-control" rows={3} value={selectedRisk.description || ''} onChange={(e) => updateRiskField(selectedRisk.id, 'description', e.target.value)} placeholder="Mô tả ngắn về rủi ro…" />
                </div>

                <div className="mb-4">
                  <label className="text-muted small mb-2">Biện pháp giảm thiểu</label>
                  <textarea className="form-control" rows={3} value={selectedRisk.mitigation || ''} onChange={(e) => updateRiskField(selectedRisk.id, 'mitigation', e.target.value)} placeholder="Phương án đối phó, giảm thiểu tác động…" />
                </div>

                <div className="mb-4">
                  <label className="text-muted small mb-2">Người chịu trách nhiệm</label>
                  <input className="form-control" value={selectedRisk.owner} onChange={(e) => updateRiskField(selectedRisk.id, 'owner', e.target.value)} />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-4">
                    <label className="text-muted small mb-2">Trạng thái</label>
                    <select className="form-select" value={selectedRisk.status} onChange={(e) => updateRiskStatus(selectedRisk.id, e.target.value)}>
                      <option value="Đang xử lý">Đang xử lý</option>
                      <option value="Đã xử lý">Đã xử lý</option>
                      <option value="Tạm hoãn">Tạm hoãn</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-4">
                    <label className="text-muted small mb-2">Mức độ</label>
                    <select className="form-select" value={selectedRisk.level} onChange={(e) => updateRiskLevel(selectedRisk.id, e.target.value)}>
                      <option value="Cao">Cao</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Thấp">Thấp</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-top pt-3 d-flex gap-2">
                <button className="btn btn-outline-secondary w-50" onClick={() => setSelectedRisk(null)}>Đóng</button>
                <button className="btn btn-danger w-50" onClick={() => deleteRisk(selectedRisk.id)}>🗑️ Xóa rủi ro</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal thêm rủi ro */}
      {showAddModal && (
        <>
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 1050 }} onClick={() => setShowAddModal(false)} />
          <div className="modal d-block" tabIndex={-1} style={{ zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">➕ Thêm rủi ro mới</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Tên rủi ro *</label>
                    <input type="text" className="form-control" value={newRisk.name} onChange={(e) => setNewRisk({ ...newRisk, name: e.target.value })} placeholder="Nhập tên rủi ro…" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Người chịu trách nhiệm *</label>
                    <input type="text" className="form-control" value={newRisk.owner} onChange={(e) => setNewRisk({ ...newRisk, owner: e.target.value })} placeholder="Ví dụ: Bạn (Hậu cần)…" />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Trạng thái</label>
                      <select className="form-select" value={newRisk.status} onChange={(e) => setNewRisk({ ...newRisk, status: e.target.value })}>
                        <option value="Đang xử lý">Đang xử lý</option>
                        <option value="Đã xử lý">Đã xử lý</option>
                        <option value="Tạm hoãn">Tạm hoãn</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Mức độ</label>
                      <select className="form-select" value={newRisk.level} onChange={(e) => setNewRisk({ ...newRisk, level: e.target.value })}>
                        <option value="Cao">Cao</option>
                        <option value="Trung bình">Trung bình</option>
                        <option value="Thấp">Thấp</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Mô tả</label>
                    <textarea className="form-control" rows={3} value={newRisk.description} onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })} placeholder="Mô tả ngắn về rủi ro…" />
                  </div>
                  <div className="mb-0">
                    <label className="form-label">Biện pháp giảm thiểu</label>
                    <textarea className="form-control" rows={3} value={newRisk.mitigation} onChange={(e) => setNewRisk({ ...newRisk, mitigation: e.target.value })} placeholder="Phương án đối phó, giảm thiểu tác động…" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>Hủy</button>
                  <button type="button" className="btn btn-primary" onClick={addRisk}>Thêm rủi ro</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </UserLayout>
  );
}
