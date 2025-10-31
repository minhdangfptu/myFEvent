import UserLayout from '../../components/UserLayout';
import { useMemo } from 'react';

export default function SoLieuDashboard() {
  const upcoming = useMemo(() => ([
    { name: 'Chuẩn bị sân khấu', left: 'Còn 3 ngày' },
    { name: 'Kiểm tra âm thanh', left: 'Còn 2 ngày' },
    { name: 'Gửi thư mời khách mời', left: 'Còn 2 ngày' },
    { name: 'Cập nhật danh sách thành viên', left: 'Còn 1 ngày', urgent: true },
    { name: 'In bảng tên', left: 'Còn 1 ngày', urgent: true }
  ]), []);

  return (
    <UserLayout title="Số liệu" activePage="stats">
      <div className="container-fluid">
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column justify-content-between">
                <div className="d-grid align-items-center" style={{ height: 160 }}>
                  <div className="text-center w-100">
                    <div className="text-muted mb-2">&nbsp;</div>
                    <div className="fs-5">6 task</div>
                  </div>
                </div>
                <div className="pt-3 border-top d-flex align-items-center gap-4 small text-muted">
                  <div className="d-flex align-items-center gap-2"><span className="rounded-circle" style={{ width: 10, height: 10, background: '#22c55e', display: 'inline-block' }}></span>Hoàn thành: 2</div>
                  <div className="d-flex align-items-center gap-2"><span className="rounded-circle" style={{ width: 10, height: 10, background: '#eab308', display: 'inline-block' }}></span>Đang làm: 2</div>
                  <div className="d-flex align-items-center gap-2"><span className="rounded-circle" style={{ width: 10, height: 10, background: '#ef4444', display: 'inline-block' }}></span>Chưa bắt đầu: 2</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="mb-0">Nhiệm vụ sắp đến hạn</h6>
                </div>
                <ul className="list-group list-group-flush">
                  {upcoming.map((t, i) => (
                    <li key={i} className="list-group-item d-flex align-items-center justify-content-between px-0">
                      <span className="text-dark">{t.name}</span>
                      <span className={`small ${t.urgent ? 'text-danger' : 'text-muted'}`}>{t.left}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <h6 className="mb-3">Hoạt động gần đây</h6>
            <ul className="ms-3">
              <li className="mb-1 small">Bạn được giao nhiệm vụ: "Chuẩn bị quà tặng"</li>
              <li className="mb-1 small">Nhiệm vụ "Thiết kế banner" đã được cập nhật tiến độ</li>
              <li className="mb-1 small">Bạn hoàn thành nhiệm vụ "Chuẩn bị backdrop"</li>
              <li className="mb-1 small">HoD đã bình luận trong nhiệm vụ "Liên hệ MC"</li>
              <li className="mb-1 small">Nhiệm vụ mới được giao: Kiểm tra âm thanh ánh sáng</li>
            </ul>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}


