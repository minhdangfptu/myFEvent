"use client"

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import UserLayout from '../../components/UserLayout';
import { eventApi } from '../../apis/eventApi';
import { useAuth } from '../../contexts/AuthContext';

export default function HoDLandingPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [eventsHod, setEventsHod] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Dropdown/filter state (có thể khi chưa hỗ trợ i18n thì hardcode value)
  const STATUS_OPTIONS = [t('home.statuses.all') || 'Tất cả', t('home.statuses.upcoming') || 'Sắp diễn ra', t('home.statuses.ongoing') || 'Đang diễn ra', t('home.statuses.past') || 'Đã kết thúc'];
  const SORT_OPTIONS = [t('home.sorts.newest') || 'Mới nhất', t('home.sorts.oldest') || 'Cũ nhất', t('home.sorts.az') || 'A-Z'];

  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0]);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
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

  // Fetch API lấy event HoD phụ trách
  useEffect(() => {
    // Đợi authLoading xong trước khi fetch events
    if (authLoading) {
      setLoading(true);
      return;
    }
    const fetchEvents = async () => {
      // Đợi authLoading xong và có user trước khi fetch
      if (authLoading || !user) {
        setLoading(true);
        return;
      }
      try {
        setLoading(true);
        const res = await eventApi.listMyEvents();
        const allEvents = res.data || [];
        // Lọc event theo role HoD
        const hodEvents = allEvents.filter(ev => ev.membership === 'HoD');
        setEventsHod(hodEvents);
      } catch (err) {
        setEventsHod([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [authLoading, user]);

  // Lọc/sắp xếp/search
  const filteredEvents = useMemo(() => {
    return eventsHod
      .filter(ev =>
        (ev.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(ev => (statusFilter === 'Tất cả' || statusFilter === STATUS_OPTIONS[0] ? true : (ev.status === statusFilter)))
      .sort((a, b) => {
        if (sortBy === 'A-Z' || sortBy === SORT_OPTIONS[2]) return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'Mới nhất' || sortBy === SORT_OPTIONS[0]) return (b.createdAt || 0) - (a.createdAt || 0);
        if (sortBy === 'Cũ nhất' || sortBy === SORT_OPTIONS[1]) return (a.createdAt || 0) - (b.createdAt || 0);
        return 0;
      });
  }, [eventsHod, searchQuery, statusFilter, sortBy]);

  // Giao diện loading
  if (loading) {
    return (
      <UserLayout title="Trang chủ Ban (HoD)" sidebarType="hod">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title="Trang chủ Ban (HoD)"
      activePage="home"
      sidebarType="hod"
      showSearch={true}
      showEventAction={false}
      onSearch={setSearchQuery}
    >
      <style>{`
        .brand-red { color: #EF4444; }
        .bg-brand-red { background: #EF4444; }
        .soft-card { background:#fff; border:1px solid #E5E7EB; border-radius:16px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
        .badge-soft { border-radius:999px; padding:6px 10px; font-size:12px; border:1px solid #E5E7EB; background:#F9FAFB; color:#374151; }
        .active-red { background:#FEE2E2 !important; color:#991B1B !important; }
        .dropdown-trigger { border:1px solid #E5E7EB; border-radius:10px; padding:8px 12px; background:#fff; min-width:160px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .dropdown-panel { position:absolute; top:110%; left:0; z-index:50; background:#fff; border:1px solid #E5E7EB; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.08); min-width:220px; overflow:hidden; }
        .dropdown-item { padding:10px 12px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:space-between; }
        .dropdown-item:hover { background:#F3F4F6; }
        .dropdown-header { padding:10px 12px; font-size:12px; color:#6B7280; background:#F9FAFB; border-bottom:1px solid #E5E7EB; }
        .event-card { border-radius:16px; overflow:hidden; border:1px solid #E5E7EB; background:#fff; transition:transform .2s, box-shadow .2s; }
        .event-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.08); }
        .event-img { height:180px; background:#f3f4f6; position:relative; }
        .event-img::after { content:''; position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0)); }
        .event-body { padding:16px; }
        .event-title { font-weight:700; font-size:18px; margin-bottom:6px; }
        .event-chip { border-radius:999px; font-size:12px; padding:6px 10px; display:inline-flex; align-items:center; gap:6px; }
        .chip-gray { background:#F3F4F6; color:#374151; border:1px solid #E5E7EB; }
        .event-desc { color:#6B7280; font-size:14px; }
        .section-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
        .section-title { margin:0; font-size:18px; font-weight:700; }
        .filters { display:flex; gap:10px; flex-wrap:wrap; }
      `}</style>
      {/* ====== SECTION: Events ====== */}
      <div className="mb-5">
        <div className="section-head">
          <h4 className="section-title">{t('home.allEvents') || 'Các sự kiện của Ban bạn phụ trách'}</h4>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Filter/sort */}
            <div className="filters position-relative">
              {/* Status Dropdown */}
              <div className="position-relative me-2" ref={statusMenuRef}>
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
                    <div className="dropdown-header">Trạng thái</div>
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
                    <div className="dropdown-header">Sắp xếp</div>
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
        </div>

        {/* Event Grid */}
        <div className="row g-4">
          {filteredEvents.map((event) => (
            <div key={event._id || event.id} className="col-xl-4 col-lg-4 col-md-6">
              <div className="event-card h-100">
                <div
                  className="event-img"
                  style={{ backgroundImage: `url(${event.coverImage || event.image || '/api/placeholder/600/360'})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="event-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="event-chip chip-gray">
                      <i className="bi bi-lightning-charge-fill me-1" />
                      {event.status || 'Chưa rõ'}
                    </span>
                    <span className="event-chip chip-gray">
                      <i className="bi bi-calendar-event me-1" />
                      {/* Giả lập ngày demo hoặc lấy từ event */}
                      {(event.dateRange || event.date || event.startDate || 'N/A')}
                    </span>
                  </div>
                  <div className="event-title">{event.name || event.title}</div>
                  <p className="event-desc mb-3">{event.description || 'Không có mô tả.'}</p>
                  <div className="d-flex justify-content-between">
                    <button className="ghost-btn" onClick={() => navigate(`/events/${event._id || event.id}/detail`)}>
                      {t('actions.viewDetails') || 'Xem chi tiết'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredEvents.length === 0 && (
            <div className="col-12">
              <div className="soft-card p-4 text-center text-muted">
                {t('home.noEvents') || 'Không có sự kiện nào.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
