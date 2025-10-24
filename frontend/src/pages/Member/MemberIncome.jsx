import UserLayout from '../../components/UserLayout';

export default function MemberIncome() {
  return (
    <UserLayout title="Thu nhập" sidebarType="member">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Thu nhập sự kiện</h5>
              </div>
              <div className="card-body">
                <p>Trang quản lý thu nhập của thành viên sẽ được phát triển ở đây.</p>
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  Bạn có thể xem thông tin thu nhập của sự kiện.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
