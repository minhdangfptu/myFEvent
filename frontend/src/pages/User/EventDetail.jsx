import { useState } from 'react';
import UserLayout from '../../components/UserLayout';

export default function EventDetailPage() {
  const [activeTab, setActiveTab] = useState('Số liệu');

  const tabs = [
    'Tổng quát', 'Thành viên', 'Công việc', 'Timeline', 
    'Tài chính', 'Rủi ro', 'Số liệu', 'Đánh giá'
  ];

  return (
    <UserLayout title="Event Detail Page" activePage="home">
      {/* Navigation Tabs */}
      <div className="d-flex border-bottom mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`btn btn-link text-decoration-none me-4 pb-2 ${
              activeTab === tab ? 'border-bottom border-primary border-2' : ''
            }`}
            onClick={() => setActiveTab(tab)}
            style={{
              borderBottom: activeTab === tab ? '2px solid #dc3545' : 'none',
              color: activeTab === tab ? '#dc3545' : '#6c757d'
            }}
          >
            {tab}
            {activeTab === tab && <i className="bi bi-arrow-up ms-1"></i>}
          </button>
        ))}
      </div>

      {/* Event Summary Card */}
      <div className="card mb-4">
        <div 
          className="card-img-top bg-secondary" 
          style={{ height: '300px' }}
        ></div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h2 className="card-title">Halloween 2025</h2>
              <p className="text-muted">Thời gian: 12/12/2025</p>
              <p className="text-muted">Địa điểm: Đường 30m, Đại học FPT Hà Nội</p>
            </div>
            <div className="col-md-6">
              <p className="text-muted">Trạng thái sự kiện: Sắp diễn ra</p>
              <p className="text-muted">Đơn vị tổ chức: <span className="text-danger fw-bold">FBGC</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="card">
        <div className="card-header">
          <h4 className="mb-0">Chi tiết sự kiện</h4>
        </div>
        <div className="card-body">
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
        </div>
      </div>
    </UserLayout>
  );
}