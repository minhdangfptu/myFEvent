import UserLayout from '../../components/UserLayout';

export default function UserProfilePage() {
  return (
    <UserLayout title="Hồ sơ của tôi" activePage="profile">
      <style>{`
        .mp-primary { color: #EF4444; }
        .mp-bg-primary { background: #EF4444; }
        .mp-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
        .mp-equal { min-height: 520px; }
        .mp-badge { border: 1px solid #e5e7eb; border-radius: 999px; background: #f3f4f6; color: #374151; padding: 6px 10px; font-size: 14px; }
        .mp-badge-green { background: #ecfdf5; color: #047857; border-color: #bbf7d0; }
        .mp-section { max-width: 1100px; margin: 0 auto; padding-left: 16px; padding-right: 16px; }
        .mp-header { height: 180px; border-radius: 16px; background: #EF4444; position: relative; }
        .mp-gear { background: #fee2e2; border: 1px solid #fecaca; color: #991B1B; border-radius: 12px; width: 44px; height: 44px; display: grid; place-items: center; }
      `}</style>
      <div className="container-fluid">
        <div className="position-relative" style={{ minHeight: 120 }}>
          <div className="mp-header d-flex align-items-start" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180, zIndex: 0 }}>
            <div className="mp-section text-white fw-semibold small p-3">MY PROFILE</div>
          </div>

          <div className="mp-section position-relative" style={{ zIndex: 1, paddingTop: 120 }}>
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <div className="mp-card p-3 mp-equal">
                <div className="d-flex align-items-start gap-3">
                  <img src="https://i.pravatar.cc/120?img=5" alt="avatar" className="rounded-circle" style={{ width: 96, height: 96, objectFit: 'cover', marginTop: -40, border: '6px solid #fff' }} />
                  <div>
                    <div className="fs-4 fw-semibold">Hoàng Khánh Linh</div>
                    <button className="btn btn-light btn-sm mt-1">Tải ảnh</button>
                  </div>
                </div>

                <div className="mt-3">
                  {[{ label: 'Username', value: 'linhhhh121' }, { label: 'Email', value: 'linhhkhe180001@fpt.edu.vn' }, { label: 'Số điện thoại', value: '+84 123 456 789' }].map((row, i) => (
                    <div key={i} className="d-flex align-items-center justify-content-between border rounded-3 p-3 mb-2">
                      <div>
                        <div className="small text-muted">{row.label}</div>
                        <div className="fw-medium">{row.value}</div>
                      </div>
                      <button className="btn btn-light btn-sm">Sửa</button>
                    </div>
                  ))}

                  <div className="border rounded-3 p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="small text-muted">Bio</div>
                      <button className="btn btn-light btn-sm">Sửa</button>
                    </div>
                    <div className="text-muted">Lorem ipsum dolor sit amet consectetur. Erat auctor a aliquam vel congue luctus…</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="mp-card p-3 mb-3 mp-equal">
                <div className="fw-semibold mb-1">Thông tin chi tiết</div>
                <div className="text-muted small">Điểm sáng về bạn: sự kiện, CLB, và những thứ tuyệt vời!</div>
                <div className="mt-3 d-flex flex-wrap gap-2">
                  <span className="mp-badge mp-badge-green">Hậu cần</span>
                  <span className="mp-badge" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>Văn hoá</span>
                  <span className="mp-badge">HR</span>
                  <span className="mp-badge">Tài chính</span>
                </div>
                <div className="mt-3">
                  <div className="small text-muted mb-1">Tổng số sự kiện đã tham gia</div>
                  <div className="d-flex align-items-center border rounded-3 p-3 gap-3" style={{ height: 100 }}>
                    <div>
                      <div className="fw-semibold">7 sự kiện</div>
                      <div className="text-muted small">Tổng số</div>
                    </div>
                    <div className="ms-auto mp-gear" style={{ height: 100, width: 100, marginRight: -20 }}>⚙️</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="small text-muted mb-1">Trạng thái</div>
                  <div className="mp-card p-3" style={{ height: 100 }}>
                    <div className="d-flex align-items-center justify-content-between small">
                      <span>Xác thực tài khoản</span>
                      <span className="badge" style={{ background: '#10B981', color: '#fff' }}>Đã xác thực</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}