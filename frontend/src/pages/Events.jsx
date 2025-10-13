import * as React from 'react'
import { Link as RouterLink } from "react-router-dom"
import Header from "../components/Header"
import Footer from "../components/Footer"

const baseEvents = [
  { id: 1, title: "Halloween 2025", date: "12/12/2025", location: "Hà Nội", image: "https://images.unsplash.com/photo-1504270997636-07ddfbd48945?q=80&w=1200&auto=format&fit=crop", description: "Sự kiện Halloween với nhiều hoạt động hóa trang và trò chơi thú vị." },
  { id: 2, title: "International Day 2025", date: "15/01/2026", location: "Hà Nội", image: "https://images.unsplash.com/photo-1520975979651-6f61dcole1a0?q=80&w=1200&auto=format&fit=crop", description: "Ngày hội giao lưu văn hoá quốc tế với nhiều gian hàng và biểu diễn đa dạng." },
  { id: 3, title: "Halloween 2024", date: "31/10/2024", location: "Hà Nội", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop", description: "Không khí Halloween sôi động cùng cosplay và âm nhạc." },
  { id: 4, title: "Workshop Startup", date: "01/01/2025", location: "Hà Nội", image: "https://images.unsplash.com/photo-1542744095-291d1f67b221?q=80&w=1200&auto=format&fit=crop", description: "Chia sẻ về khởi nghiệp và xây dựng mô hình kinh doanh bền vững." },
  { id: 5, title: "Tech Talk AI", date: "05/02/2025", location: "Hà Nội", image: "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?q=80&w=1200&auto=format&fit=crop", description: "Cập nhật xu hướng trí tuệ nhân tạo và ứng dụng thực tế." },
  { id: 6, title: "Football Friendly", date: "10/03/2025", location: "Hà Nội", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1200&auto=format&fit=crop", description: "Giao hữu bóng đá giữa các câu lạc bộ sinh viên." },
  { id: 7, title: "Music Night", date: "20/04/2025", location: "Hà Nội", image: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?q=80&w=1200&auto=format&fit=crop", description: "Đêm nhạc sinh viên với nhiều tiết mục đặc sắc." },
  { id: 8, title: "Volunteer Day", date: "12/05/2025", location: "Hà Nội", image: "https://images.unsplash.com/photo-1499933374294-4584851497cc?q=80&w=1200&auto=format&fit=crop", description: "Hoạt động tình nguyện vì cộng đồng do CLB tình nguyện tổ chức." },
]

const events = Array.from({ length: 16 }, (_, i) => ({
  ...baseEvents[i % baseEvents.length],
  id: i + 1,
}))

export default function EventsPage() {
  const [keyword, setKeyword] = React.useState("")
  const [page, setPage] = React.useState(1)
  const perPage = 9

  const filtered = React.useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return events
    return events.filter(e => e.title.toLowerCase().includes(k))
  }, [keyword])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * perPage
  const visible = filtered.slice(start, start + perPage)

  return (
    <>
      <Header />

      <div className="container-xl py-4">
        <div className="mx-auto" style={{ maxWidth: 700 }}>
          <div className="input-group mb-4">
            <span className="input-group-text bg-white"><i className="bi bi-search text-muted" /></span>
            <input type="text" className="form-control" placeholder="Tìm kiếm sự kiện..." value={keyword} onChange={e => { setPage(1); setKeyword(e.target.value) }} />
          </div>
        </div>

        <div className="border rounded-3 p-3 p-sm-4" style={{ borderColor: '#fca5a5' }}>
          <div className="text-danger fw-bold mb-3 mb-sm-4" style={{ fontSize: 20 }}>Tất cả sự kiện</div>

          <div className="row row-cols-1 row-cols-md-3 g-3">
            {visible.map((event) => (
              <div className="col" key={event.id}>
                <RouterLink to={`/events/${event.id}`} state={{ event }} className="text-decoration-none text-reset">
                  <div className="card h-100 shadow-sm border-0">
                    <img src={event.image} alt={event.title} className="card-img-top" style={{ height: 180, objectFit: 'cover', backgroundColor: '#e5e7eb' }} />
                    <div className="card-body">
                      <div className="fw-semibold mb-2" style={{ fontSize: 16, color: '#111827' }}>{event.title}</div>
                      <div className="d-flex gap-2 mb-2">
                        <span className="badge text-bg-light border" style={{ fontSize: 12 }}>{event.date}</span>
                        <span className="badge text-bg-light border" style={{ fontSize: 12 }}>{event.location}</span>
                      </div>
                      <div className="text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>{event.description}</div>
                    </div>
                  </div>
                </RouterLink>
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-center mt-4">
            <div className="d-flex align-items-center" style={{ gap: 16 }}>
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', padding: 0 }}>
                <i className="bi bi-chevron-left" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} type="button" onClick={() => setPage(n)} className="btn" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid ' + (n === currentPage ? '#f97316' : '#e5e7eb'), background: n === currentPage ? '#f97316' : '#fff', color: n === currentPage ? '#fff' : '#111827', padding: 0 }}>
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', padding: 0 }}>
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


