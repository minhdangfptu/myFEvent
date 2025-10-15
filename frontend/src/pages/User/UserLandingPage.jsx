import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';

export default function UserHomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();

  // ====== DATA DEMO ======
  const events = useMemo(() => ([
    {
      id: 1,
      title: 'Halloween 2025',
      status: 'Sắp diễn ra',
      date: '12/12',
      description: 'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint...',
      image: '/api/placeholder/600/360'
    },
    {
      id: 2,
      title: 'International Day 2025',
      status: 'Đang diễn ra',
      date: '12/12 - 13/12',
      description: 'Velit officia consequat duis enim velit mollit. Exercitation veniam...',
      image: '/api/placeholder/600/360'
    },
    {
      id: 3,
      title: 'Halloween 2024',
      status: 'Đã kết thúc',
      date: '12/12',
      description: 'Exercitation veniam consequat sunt nostrud amet...',
      image: '/api/placeholder/600/360'
    }
  ]), []);

  const blogs = useMemo(() => ([
    { id: 1, title: 'Kinh nghiệm chuẩn bị hậu cần', topic: 'Hậu cần', user: 'Lan', date: '15 Sep 2021', image: '/api/placeholder/600/360' },
    { id: 2, title: 'Checklist âm thanh ánh sáng', topic: 'Kỹ thuật', user: 'Minh', date: '08 Oct 2021', image: '/api/placeholder/600/360' },
    { id: 3, title: 'Gợi ý truyền thông trước sự kiện', topic: 'Truyền thông', user: 'Hà', date: '20 Oct 2021', image: '/api/placeholder/600/360' },
  ]), []);

  // ====== FILTERS / SORT ======
  const STATUS_OPTIONS = ['Tất cả', 'Sắp diễn ra', 'Đang diễn ra', 'Đã kết thúc'];
  const SORT_OPTIONS = ['Mới nhất', 'Cũ nhất', 'A-Z'];

  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [sortBy, setSortBy] = useState('Mới nhất');

  // Dropdown UI state
  const [openMenu, setOpenMenu] = useState(null); // 'status' | 'sort' | null
  const statusMenuRef = useRef(null);
  const sortMenuRef = useRef(null);
  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        statusMenuRef.current && !statusMenuRef.current.contains(e.target) &&
        sortMenuRef.current && !sortMenuRef.current.contains(e.target)
      ) setOpenMenu(null);
    };
    document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, []);

  // Filter + sort logic
  const filteredEvents = events
    .filter(ev =>
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(ev => (statusFilter === 'Tất cả' ? true : ev.status === statusFilter))
    .sort((a, b) => {
      if (sortBy === 'A-Z') return a.title.localeCompare(b.title);
      // vì data demo không có ngày cụ thể dạng Date, tạm ưu tiên: Mới nhất (id DESC), Cũ nhất (id ASC)
      if (sortBy === 'Mới nhất') return b.id - a.id;
      if (sortBy === 'Cũ nhất') return a.id - b.id;
      return 0;
    });

  return (
    <UserLayout
      title="Trang chủ"
      activePage="home"
      showSearch={true}
      showEventAction={true}
      onSearch={setSearchQuery}
      onEventAction={(action) => { if (action === 'join') setShowJoinModal(true); }}
    >
      <style>{`
        /* ===== Theme ===== */
        .brand-red { color: #EF4444; }
        .bg-brand-red { background: #EF4444; }
        .soft-card { background:#fff; border:1px solid #E5E7EB; border-radius:16px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
        .badge-soft { border-radius:999px; padding:6px 10px; font-size:12px; border:1px solid #E5E7EB; background:#F9FAFB; color:#374151; }
        .active-red { background:#FEE2E2 !important; color:#991B1B !important; }

        /* ===== Dropdown custom ===== */
        .dropdown-trigger {
          border:1px solid #E5E7EB;
          border-radius:10px;
          padding:8px 12px;
          background:#fff;
          min-width:160px;
          display:flex; align-items:center; justify-content:space-between;
          gap:8px;
        }
        .dropdown-panel {
          position:absolute; top:110%; left:0; z-index:50;
          background:#fff; border:1px solid #E5E7EB; border-radius:12px;
          box-shadow:0 8px 24px rgba(0,0,0,0.08);
          min-width:220px; overflow:hidden;
        }
        .dropdown-item {
          padding:10px 12px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:space-between;
        }
        .dropdown-item:hover { background:#F3F4F6; }
        .dropdown-header {
          padding:10px 12px; font-size:12px; color:#6B7280; background:#F9FAFB; border-bottom:1px solid #E5E7EB;
        }

        /* ===== Event Cards ===== */
        .event-card { border-radius:16px; overflow:hidden; border:1px solid #E5E7EB; background:#fff; transition:transform .2s, box-shadow .2s; }
        .event-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.08); }
        .event-img { height:180px; background:#f3f4f6; position:relative; }
        .event-img::after {
          content:''; position:absolute; inset:0;
          background:linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0));
        }
        .event-body { padding:16px; }
        .event-title { font-weight:700; font-size:18px; margin-bottom:6px; }
        .event-chip { border-radius:999px; font-size:12px; padding:6px 10px; display:inline-flex; align-items:center; gap:6px; }
        .chip-gray { background:#F3F4F6; color:#374151; border:1px solid #E5E7EB; }
        .event-desc { color:#6B7280; font-size:14px; }

        /* ===== Blog Cards ===== */
        .blog-card { border-radius:16px; overflow:hidden; border:1px solid #E5E7EB; background:#fff; transition:transform .2s, box-shadow .2s; }
        .blog-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.08); }
        .blog-img { height:160px; background:#f3f4f6; }
        .blog-body { padding:16px; }
        .blog-title { font-weight:700; font-size:16px; margin-bottom:8px; }
        .blog-meta { display:flex; flex-wrap:wrap; gap:6px; color:#6B7280; font-size:12px; }

        /* ===== Section header ===== */
        .section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
        .section-title { margin:0; font-size:18px; font-weight:700; }
        .filters { display:flex; gap:10px; flex-wrap:wrap; }

        .soft-input { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:12px; height:44px; transition:.2s; }
        .soft-input:focus { background:#fff; border-color:#EF4444; box-shadow:0 0 0 3px rgba(239,68,68,0.1); }

        /* Nút xem chi tiết */
        .ghost-btn {
          border:1px solid #E5E7EB; border-radius:10px; padding:8px 12px; background:#fff; font-size:14px;
        }
        .ghost-btn:hover { background:#F9FAFB; }
      `}</style>

      {/* ====== SECTION: Events ====== */}
      <div className="mb-5">
        <div className="section-head">
          <h4 className="section-title">Tất cả sự kiện</h4>

          {/* Filters */}
          <div className="filters position-relative">
            {/* Status Dropdown */}
            <div className="position-relative" ref={statusMenuRef}>
              <button
                type="button"
                className={`dropdown-trigger ${openMenu === 'status' ? 'active-red' : ''}`}
                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'status' ? null : 'status'); }}
              >
                <span>Trạng thái: <strong>{statusFilter}</strong></span>
                <i className={`bi ${openMenu === 'status' ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
              </button>
              {openMenu === 'status' && (
                <div className="dropdown-panel">
                  <div className="dropdown-header">Chọn trạng thái</div>
                  {STATUS_OPTIONS.map(opt => (
                    <div
                      key={opt}
                      className={`dropdown-item ${statusFilter === opt ? 'active-red' : ''}`}
                      onClick={() => { setStatusFilter(opt); setOpenMenu(null); }}
                    >
                      <span>{opt}</span>
                      {statusFilter === opt && <i className="bi bi-check-lg" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="position-relative" ref={sortMenuRef}>
              <button
                type="button"
                className={`dropdown-trigger ${openMenu === 'sort' ? 'active-red' : ''}`}
                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'sort' ? null : 'sort'); }}
              >
                <span>Sắp xếp: <strong>{sortBy}</strong></span>
                <i className={`bi ${openMenu === 'sort' ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
              </button>
              {openMenu === 'sort' && (
                <div className="dropdown-panel">
                  <div className="dropdown-header">Chọn cách sắp xếp</div>
                  {SORT_OPTIONS.map(opt => (
                    <div
                      key={opt}
                      className={`dropdown-item ${sortBy === opt ? 'active-red' : ''}`}
                      onClick={() => { setSortBy(opt); setOpenMenu(null); }}
                    >
                      <span>{opt}</span>
                      {sortBy === opt && <i className="bi bi-check-lg" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Grid */}
        <div className="row g-4">
          {filteredEvents.map((event) => (
            <div key={event.id} className="col-xl-4 col-lg-4 col-md-6">
              <div className="event-card h-100">
                <div
                  className="event-img"
                  style={{ backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="event-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="event-chip chip-gray">
                      <i className="bi bi-lightning-charge-fill me-1" />
                      {event.status}
                    </span>
                    <span className="event-chip chip-gray">
                      <i className="bi bi-calendar-event me-1" />
                      {event.date}
                    </span>
                  </div>
                  <div className="event-title">{event.title}</div>
                  <p className="event-desc mb-3">{event.description}</p>
                  <div className="d-flex justify-content-between">
                    <button className="ghost-btn" onClick={() => navigate('/event-detail')}>
                      Xem chi tiết
                    </button>
                    <button className="btn btn-danger" onClick={() => setShowJoinModal(true)}>
                      Tham gia
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredEvents.length === 0 && (
            <div className="col-12">
              <div className="soft-card p-4 text-center text-muted">
                Không có sự kiện phù hợp.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== SECTION: Blog ====== */}
      <div>
        <div className="section-head">
          <h4 className="section-title">Blog</h4>
        </div>
        <div className="row g-4">
          {blogs.map((blog) => (
            <div key={blog.id} className="col-xl-4 col-lg-4 col-md-6">
              <div className="blog-card h-100">
                <div
                  className="blog-img"
                  style={{ backgroundImage: `url(${blog.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="blog-body">
                  <div className="blog-title">{blog.title}</div>
                  <div className="blog-meta">
                    <span className="badge-soft">{blog.topic}</span>
                    <span className="badge-soft">👤 {blog.user}</span>
                    <span className="badge-soft">📅 {blog.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {blogs.length === 0 && (
            <div className="col-12">
              <div className="soft-card p-4 text-center text-muted">
                Chưa có bài viết nào.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== JOIN MODAL ====== */}
      {showJoinModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <div className="d-flex align-items-center">
                  <i className="bi bi-clipboard-data brand-red me-2"></i>
                  <h5 className="modal-title fw-bold">Tham gia sự kiện</h5>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowJoinModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">Hãy nhập mã sự kiện được cấp để tham gia.</p>
                <form onSubmit={(e) => { e.preventDefault(); setShowJoinModal(false); }}>
                  <div className="mb-3">
                    <label htmlFor="eventCode" className="form-label fw-bold">Mã sự kiện</label>
                    <input type="text" className="form-control soft-input" id="eventCode" placeholder="Nhập mã sự kiện" required />
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
