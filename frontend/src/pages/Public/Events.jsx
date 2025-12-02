import { useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from "react-router-dom"
import Header from "../../components/Header"
import Footer from "../../components/Footer"
import { eventService } from '../../services/eventService';
import { formatDate } from '../../utils/formatDate';
import { deriveEventStatus } from '../../utils/getEventStatus';
import Loading from '../../components/Loading';
import { getEventImage } from '../../utils/getEventImage';


export default function EventsPage() {
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const perPage = 9

  const [eventsList, setEventsList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await eventService.fetchAllPublicEvents()

        const items = res?.data ?? res ?? []
        if (mounted && Array.isArray(items)) {
          setEventsList(items)
          setPage(1)
        }
      } catch (e) {
        console.error('fetch public events error', e)
        setError('Không thể tải danh sách sự kiện')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()

    const mapped = {
      ALL: null,
      UPCOMING: "scheduled",
      ONGOING: "ongoing",
      ENDED: "completed",
      CANCELLED: "cancelled"
    }

    return eventsList
      .filter(e => k ? (e.name || "").toLowerCase().includes(k) : true)
      .filter(e => {
        if (!mapped[statusFilter]) return true
        return e.status === mapped[statusFilter]
      })
  }, [keyword, eventsList, statusFilter])


  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * perPage
  const visible = filtered.slice(start, start + perPage)

  return (
    <>
      <Header />

      {/* Full-page loading overlay */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,255,255,0.75)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Loading size={80} />
        </div>
      )}

      <div className="container-xl py-4">
        <div className="mx-auto" style={{ maxWidth: 900 }}>
          {/* Thanh tìm + lọc status */}
          <div className="row g-3 align-items-stretch mb-4">
            <div className="col-12 col-md-7">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-search text-muted" /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm kiếm sự kiện..."
                  value={keyword}
                  onChange={e => { setPage(1); setKeyword(e.target.value) }}
                />
              </div>
            </div>
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-funnel text-muted" /></span>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="UPCOMING">Sắp diễn ra</option>
                  <option value="ONGOING">Đang diễn ra</option>
                  <option value="ENDED">Đã kết thúc</option>
                  <option value="CANCELLED">Đã huỷ</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-3 p-3 p-sm-4" style={{ borderColor: '#fca5a5' }}>
          <div className="text-danger fw-bold mb-3 mb-sm-4" style={{ fontSize: 20 }}>Tất cả sự kiện tại trường</div>

          {error && <div className="text-danger mb-3">{error}</div>}

          <div className="row row-cols-1 row-cols-md-3 g-4">
            {visible.map((event) => {
              const id = event._id || event.id;
              const title = event.name || event.title || 'Untitled';
              const img = getEventImage(event);
              return (
                <div className="col" key={id}>
                  <RouterLink to={`/events/${id}`} state={{ event }} className="text-decoration-none text-reset">
                    <div className="blog-card h-100">
                      <div className="blog-img-wrapper position-relative">
                        <img
                          src={img}
                          alt={title}
                          style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                          onError={(e) => {
                            if (!e.target.dataset.fallback) {
                              e.target.dataset.fallback = 'true';
                              e.target.src = '/default-events.jpg';
                            }
                          }}
                        />

                        {/* Button Xem chi tiết */}
                        <button
                          className="position-absolute btn btn-light border soft-btn-top-right"
                          style={{ top: 12, right: 12, zIndex: 2, fontSize: 14, fontWeight: 500 }}
                          onClick={(e) => { e.preventDefault(); }}
                        >
                          Xem chi tiết
                        </button>
                      </div>

                      <div className="blog-body">
                        <div className="blog-title">{title}</div>
                        <div className="blog-meta">
                          {event.status ? (
                            <span className={`badge-soft chip-status-${event.status}`}>
                              <i className="bi bi-lightning-charge-fill me-1" />
                              {event.status === "scheduled" ? "Sắp diễn ra" :
                                event.status === "ongoing" ? "Đang diễn ra" :
                                  event.status === "completed" ? "Đã kết thúc" :
                                    event.status === "cancelled" ? "Đã hủy" : event.status}
                            </span>
                          ) : null}
                        </div>

                        {event.description && (
                          <div className="event-desc mt-2">{event.description}</div>
                        )}

                        <div className="pt-2 pb-2 mt-auto">
                          {event.location && (
                            <div style={{ fontSize: '14px' }} className="d-flex align-items-center">
                              <i className="bi bi-geo-alt me-2 text-danger" style={{ fontSize: '12px', width: '12px' }} />
                              <small className="text-muted fw-medium text-truncate">{event.location}</small>
                            </div>
                          )}

                          {event.eventStartDate && event.eventEndDate && (
                            <div style={{ fontSize: '14px' }} className="d-flex align-items-center">
                              <i className="bi bi-calendar-event me-2 text-danger" style={{ fontSize: '12px', width: '12px' }} />
                              <small className="text-muted fw-medium text-truncate">
                                {formatDate(event.eventStartDate)} - {formatDate(event.eventEndDate)}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </RouterLink>
                </div>
              );
            })}
          </div>

          {/* ⭐ Empty state khi không có kết quả */}
          {visible.length === 0 && !loading && (
            <div className="text-center w-100 py-5 text-muted" style={{ fontSize: 18 }}>
              Không tìm thấy sự kiện nào phù hợp.
            </div>
          )}


          {/* Pagination */}
          <div className="d-flex justify-content-center mt-4">
            <div className="d-flex align-items-center" style={{ gap: 16 }}>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn"
                style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', padding: 0 }}
              >
                <i className="bi bi-chevron-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className="btn"
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    border: '1px solid ' + (n === currentPage ? '#EF4444' : '#e5e7eb'),
                    background: n === currentPage ? '#EF4444' : '#fff',
                    color: n === currentPage ? '#fff' : '#111827', padding: 0
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn"
                style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', padding: 0 }}
              >
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <style>{`
  .blog-card { border-radius:16px; overflow:hidden; border:1px solid #E5E7EB; background:#fff; transition:transform .2s, box-shadow .2s; box-shadow:0 8px 24px rgba(0, 0, 0, 0.04) }
  .blog-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0, 0, 0, 0.08); }
  .blog-img-wrapper { height:160px; background:#f3f4f6; overflow:hidden; }
  .blog-img-wrapper img { width:100%; height:100%; object-fit:cover; }
  .blog-body { padding:16px; }
  .blog-title { font-weight:700; font-size:16px; margin-bottom:8px; }
  .blog-meta { display:flex; flex-wrap:wrap; gap:6px; color:#6B7280; font-size:12px; }
  .event-desc {
    color:#6B7280;
    font-size:14px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .badge-soft { border-radius:999px; padding:6px 10px; font-size:12px; border:1px solid #E5E7EB; background:#F9FAFB; color:#374151; display:inline-flex; align-items:center; }
  .soft-btn-top-right{box-shadow:0 2px 6px rgba(0,0,0,0.04);transition:.1s;border-radius:8px;padding:6px 15px;}
  .soft-btn-top-right:hover{background:#fee2e2 !important;color:#dc2626 !important;border:1px solid #dc2626;}
  .chip-status-scheduled { background:#dcfce7 !important; color:#22c55e !important; border:1px solid #bbf7d0; }
  .chip-status-ongoing   { background:#fff7ed !important; color:#f59e42 !important; border:1px solid #fed7aa; }
  .chip-status-completed { background:#f3f4f6 !important; color:#6b7280 !important; border:1px solid #e5e7eb; }
  .chip-status-cancelled { background:#fef2f2 !important; color:#dc2626 !important; border:1px solid #fecaca; }
`}</style>
    </>
  )
}


