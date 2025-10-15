import { useMemo, useState } from 'react';
import UserLayout from '../../components/UserLayout';

export default function Risk() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('Tên');

  const initialRisks = useMemo(() => ([
    { name: 'Thiếu nhân lực trong ngày sự kiện', owner: 'Bạn (Hậu cần)', status: 'Đang xử lý', level: 'Cao' },
    { name: 'Chậm giao vật tư trang trí', owner: 'Bạn (Hậu cần)', status: 'Đang xử lý', level: 'Trung bình' },
    { name: 'Thiết bị âm thanh không hoạt động ổn định', owner: 'Bạn (Hậu cần)', status: 'Đang xử lý', level: 'Thấp' },
    { name: 'Không đủ tình nguyện viên cho khu vực hậu trường', owner: 'Tất cả thành viên ban Hậu cần', status: 'Đang xử lý', level: 'Cao' },
    { name: 'Thời tiết xấu ảnh hưởng đến khâu tổ chức ngoài trời', owner: 'Tất cả thành viên sự kiện', status: 'Đang xử lý', level: 'Cao' }
  ]), []);

  const [risks, setRisks] = useState(initialRisks);

  const levelColor = (level) => {
    if (level === 'Cao') return { color: '#DC2626' };
    if (level === 'Thấp') return { color: '#16A34A' };
    return { color: '#D97706' };
  };

  // Select sẽ giữ màu trung tính; màu được áp cho từng option trong dropdown

  return (
    <UserLayout title="Rủi ro" activePage="risk">
      <div className="container-fluid" style={{ maxWidth: 1100 }}>
        <style>{`
          .soft-input{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;height:44px}
          .soft-card{border:1px solid #E5E7EB;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
          .pill-select{appearance:none;border-radius:9999px;padding:.4rem .75rem;min-width:150px;border:1px solid #E5E7EB;background:#fff}
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
              <option>Mức độ</option>
              <option>Trạng thái</option>
            </select>
          </div>
        </div>

        <div className="soft-card">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="text-muted">
                  <th style={{ width: '35%' }}>Tên rủi ro</th>
                  <th style={{ width: '28%' }}>Người chịu trách nhiệm</th>
                  <th style={{ width: '22%' }}>Trạng thái</th>
                  <th style={{ width: '15%' }}>Mức độ</th>
                </tr>
              </thead>
              <tbody>
                {risks
                  .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
                  .map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td className="text-muted">{r.owner}</td>
                    <td>
                      <select
                        className="form-select form-select-sm pill-select"
                        value={r.status}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRisks(prev => prev.map((it, idx) => idx === i ? { ...it, status: value } : it));
                        }}
                      >
                        <option value="Đang xử lý" style={{ color: '#92400e' }}>Đang xử lý</option>
                        <option value="Đã xử lý" style={{ color: '#166534' }}>Đã xử lý</option>
                        <option value="Tạm hoãn" style={{ color: '#991B1B' }}>Tạm hoãn</option>
                      </select>
                    </td>
                    <td style={levelColor(r.level)} className="fw-semibold">{r.level}</td>
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


