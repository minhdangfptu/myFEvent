import { useState } from 'react';
import UserLayout from '../../components/UserLayout';

export default function UserHomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  const events = [
    {
      id: 1,
      title: "Halloween 2025",
      status: "Sắp diễn ra",
      date: "12/12",
      description: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit. Exercitation veniam consequat sunt nostrud amet.",
      image: "/api/placeholder/300/200"
    },
    {
      id: 2,
      title: "International Day 2025",
      status: "Đang diễn ra",
      date: "12/12 - 13/12",
      description: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit. Exercitation veniam consequat sunt nostrud amet.",
      image: "/api/placeholder/300/200"
    },
    {
      id: 3,
      title: "Halloween 2024",
      status: "Đã kết thúc",
      date: "12/12",
      description: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit. Exercitation veniam consequat sunt nostrud amet.",
      image: "/api/placeholder/300/200"
    }
  ];

  const blogs = [
    {
      id: 1,
      title: "Title Blog",
      topic: "topic",
      user: "user",
      date: "15 Sep 2021",
      image: "/api/placeholder/300/200"
    },
    {
      id: 2,
      title: "Title Blog",
      topic: "topic",
      user: "user",
      date: "15 Sep 2021",
      image: "/api/placeholder/300/200"
    },
    {
      id: 3,
      title: "Title Blog",
      topic: "topic",
      user: "user",
      date: "15 Sep 2021",
      image: "/api/placeholder/300/200"
    }
  ];

  return (
    <UserLayout 
      title="User Home Page - Primary"
      activePage="home"
      showSearch={true}
      showEventAction={true}
      onSearch={setSearchQuery}
      onEventAction={(action) => { if (action === 'join') setShowJoinModal(true); }}
    >
      {/* Events Section */}
      <div className="mb-5">
        <h4 className="mb-4">Tất cả sự kiện</h4>
        <div className="row g-4">
          {events.map((event) => (
            <div key={event.id} className="col-lg-4 col-md-6">
              <div className="card h-100 shadow-sm">
                <div 
                  className="card-img-top bg-secondary" 
                  style={{ height: '200px' }}
                ></div>
                <div className="card-body">
                  <h5 className="card-title">{event.title}</h5>
                  <div className="d-flex gap-2 mb-2">
                    <span className="badge bg-secondary">{event.status}</span>
                    <span className="badge bg-secondary">{event.date}</span>
                  </div>
                  <p className="card-text text-muted small">{event.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blog Section */}
      <div>
        <h4 className="mb-4">Blog</h4>
        <div className="row g-4">
          {blogs.map((blog) => (
            <div key={blog.id} className="col-lg-4 col-md-6">
              <div className="card h-100 shadow-sm">
                <div 
                  className="card-img-top bg-secondary" 
                  style={{ height: '200px' }}
                ></div>
                <div className="card-body">
                  <h5 className="card-title">{blog.title}</h5>
                  <div className="d-flex gap-1 mb-2">
                    <span className="badge bg-secondary small">{blog.topic}</span>
                    <span className="badge bg-secondary small">{blog.user}</span>
                    <span className="badge bg-secondary small">{blog.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showJoinModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <div className="d-flex align-items-center">
                  <i className="bi bi-clipboard-data text-primary me-2"></i>
                  <h5 className="modal-title fw-bold">Tham gia sự kiện</h5>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowJoinModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">Hãy nhập mã sự kiện được cấp để tham gia.</p>
                <form onSubmit={(e) => { e.preventDefault(); setShowJoinModal(false); }}>
                  <div className="mb-3">
                    <label htmlFor="eventCode" className="form-label fw-bold">Mã sự kiện</label>
                    <input type="text" className="form-control" id="eventCode" placeholder="Nhập mã sự kiện" required />
                  </div>
                  <div className="d-flex gap-2 justify-content-end">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowJoinModal(false)}>Hủy</button>
                    <button type="submit" className="btn btn-danger">Xác nhận</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}