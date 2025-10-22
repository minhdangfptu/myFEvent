import { useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from "react-router-dom"
import Header from "../../components/Header"
import Footer from "../../components/Footer"
import { eventService } from '../../services/eventService';
import { formatDate } from '../../utils/formatDate';


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
    return eventsList
      .filter(e => (k ? (( e.name || '').toLowerCase().includes(k)) : true))
      .filter(e => {
        if (statusFilter === 'ALL') return true
        return e.status.toUpperCase() === statusFilter
      })
  }, [keyword, eventsList, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * perPage
  const visible = filtered.slice(start, start + perPage)

  return (
    <>
      <Header />
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
          <div className="text-danger fw-bold mb-3 mb-sm-4" style={{ fontSize: 20 }}>Tất cả sự kiện</div>

          {loading && <div className="text-center py-4">Đang tải...</div>}
          {error && <div className="text-danger mb-3">{error}</div>}

          <div className="row row-cols-1 row-cols-md-3 g-3">
            {visible.map((event) => {
              const id = event._id || event.id;
              const title = event.name || event.title || 'Untitled';
              const img = Array.isArray(event.image) ? event.image[0] : event.image || '/placeholder.png';
              const dateText = event.eventDate ? formatDate(event.eventDate) : (event.date || '');
              return (
                <div className="col" key={id}>
                  <RouterLink to={`/events/${id}`} state={{ event }} className="text-decoration-none text-reset">
                    <div className="card h-100 shadow-sm border-0">
                      <img src={img} alt={title} className="card-img-top" style={{ height: 180, objectFit: 'cover', backgroundColor: '#e5e7eb' }} />
                      <div className="card-body">
                        <div className="fw-semibold mb-2" style={{ fontSize: 16, color: '#111827' }}>{title}</div>
                        <div className="d-flex gap-2 mb-2">
                          <span className="badge text-bg-light border" style={{ fontSize: 12 }}>{dateText}</span>
                          <span className="badge text-bg-light border" style={{ fontSize: 12 }}>{event.location || ''}</span>
                        </div>
                      </div>
                    </div>
                  </RouterLink>
                </div>
              );
            })}
          </div>

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
                    border: '1px solid ' + (n === currentPage ? '#f97316' : '#e5e7eb'),
                    background: n === currentPage ? '#f97316' : '#fff',
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
    </>
  )
}


