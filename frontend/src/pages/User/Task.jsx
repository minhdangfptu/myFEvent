import { useMemo, useState } from 'react';
import UserLayout from '../../components/UserLayout';

export default function Task() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('Tên');

  const tasks = useMemo(() => ([
    { name: 'Chuẩn bị bàn ghế khu vực check-in', owner: 'Bạn (Hậu cần)', due: '10/10/2025', status: 'Đang làm', priority: 'Cao' },
    { name: 'Kiểm tra thiết bị âm thanh', owner: 'Bạn (Hậu cần)', due: '11/10/2025', status: 'Đang làm', priority: 'Trung bình' },
    { name: 'Mua nước uống cho khách mời', owner: 'Bạn (Hậu cần)', due: '12/10/2025', status: 'Đang làm', priority: 'Thấp' },
    { name: 'Sắp xếp kho đạo cụ', owner: 'Tất cả thành viên ban Hậu cần', due: '13/10/2025', status: 'Đang làm', priority: 'Cao' },
    { name: 'Chuẩn bị khu vực hậu trường', owner: 'Tất cả thành viên sự kiện', due: '14/10/2025', status: 'Đang làm', priority: 'Trung bình' }
  ]), []);

  const priorityColor = (p) => {
    if (p === 'Cao') return { color: '#DC2626' };
    if (p === 'Thấp') return { color: '#16A34A' };
    return { color: '#D97706' };
  };

  // Select trung tính; màu hiển thị trong option của dropdown

  return (
    <UserLayout title="Số liệu - Nhiệm vụ" activePage="task">
      <div className="container-fluid" style={{ maxWidth: 1100 }}>
        <style>{`
          .soft-input{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;height:44px}
          .soft-card{border:1px solid #E5E7EB;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
          .pill-select{appearance:none;border-radius:9999px;padding:.4rem .75rem;min-width:140px}
        `}</style>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="position-relative">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm" className="form-control ps-5 soft-input" style={{ width: 320 }} />
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">🔍</span>
          </div>
          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="small text-muted">Sắp xếp theo:</span>
            <select className="form-select form-select-sm soft-input" style={{ width: 160, height: 36 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option>Tên</option>
              <option>Hạn chót</option>
              <option>Ưu tiên</option>
            </select>
          </div>
        </div>

        <div className="soft-card">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="text-muted">
                  <th style={{ width: '35%' }}>Tên nhiệm vụ</th>
                  <th style={{ width: '20%' }}>Người phụ trách</th>
                  <th style={{ width: '15%' }}>Hạn chót</th>
                  <th style={{ width: '20%' }}>Trạng thái</th>
                  <th style={{ width: '10%' }}>Ưu tiên</th>
                </tr>
              </thead>
              <tbody>
                {tasks
                  .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
                  .map((t, i) => (
                  <tr key={i}>
                    <td>{t.name}</td>
                    <td className="text-muted">{t.owner}</td>
                    <td className="text-muted">{t.due}</td>
                    <td>
                      <select className="form-select form-select-sm pill-select" defaultValue={t.status}>
                        <option value="Đang làm" style={{ color: '#92400e' }}>Đang làm</option>
                        <option value="Hoàn thành" style={{ color: '#166534' }}>Hoàn thành</option>
                        <option value="Tạm hoãn" style={{ color: '#991B1B' }}>Tạm hoãn</option>
                      </select>
                    </td>
                    <td className="fw-semibold" style={priorityColor(t.priority)}>{t.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}


