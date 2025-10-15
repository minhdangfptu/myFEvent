import * as React from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

const clubs = [
  {
    name: 'FPTU Psychology Club',
    email: 'psychology.club@fpt.edu.vn',
    image: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1200&auto=format&fit=crop',
    icon: 'bi-heart',
  },
  {
    name: 'FPT Coding Club',
    email: 'coding.club@fpt.edu.vn',
    image: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1200&auto=format&fit=crop',
    icon: 'bi-cpu',
  },
  {
    name: 'FPT Dance Club',
    email: 'dance.club@fpt.edu.vn',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop',
    icon: 'bi-music-note-beamed',
  },
  {
    name: 'FPT Business Club',
    email: 'business.club@fpt.edu.vn',
    image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1200&auto=format&fit=crop',
    icon: 'bi-briefcase',
  },
  {
    name: 'FPT Photography Club',
    email: 'photo.club@fpt.edu.vn',
    image: 'https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?q=80&w=1200&auto=format&fit=crop',
    icon: 'bi-camera',
  },
  {
    name: 'FPT Football Club',
    email: 'football.club@fpt.edu.vn',
    image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1200&auto=format&fit=crop',
    icon: 'bi-trophy',
  },
  {
    name: 'FPT Volunteer Club',
    email: 'volunteer.club@fpt.edu.vn',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop',
    icon: 'bi-people',
  },
  {
    name: 'FPT English Club',
    email: 'english.club@fpt.edu.vn',
    image: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1200&auto=format&fit=crop',
    icon: 'bi-chat-dots',
  },
]

export default function ClubsPage() {
  const [keyword, setKeyword] = React.useState('')
  const [page, setPage] = React.useState(1)
  const totalPages = 4
  const filtered = React.useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return clubs
    return clubs.filter(c => c.name.toLowerCase().includes(k))
  }, [keyword])

  return (
    <div className="bg-white min-vh-100 d-flex flex-column">
      <Header />

      <main className="flex-grow-1">
        <section className="py-4">
          <div className="container-xl">
            <h2 className="text-center fw-bold mb-2" style={{ color: '#111827' }}>Câu lạc bộ</h2>
            <p className="text-center text-secondary mb-4">Cùng khám phá hơn 48 câu lạc bộ đang hoạt động tại cơ sở</p>

            <div className="d-flex justify-content-center mb-4">
              <div className="input-group" style={{ maxWidth: 560 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tên câu lạc bộ"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                />
                <button className="btn btn-danger">
                  <i className="bi bi-search me-1" />
                  Tìm kiếm
                </button>
              </div>
            </div>

            <div className="row g-3">
              {filtered.map((c, i) => (
                <div className="col-12 col-md-6 col-lg-4 col-xl-3" key={i}>
                  <div className="card h-100 border-0" style={{ borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
                    <div className="position-relative">
                      <div className="ratio ratio-16x9">
                        <img src={c.image} alt={c.name} className="w-100 h-100 object-fit-cover" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
                      </div>
                      <div className="position-absolute start-50 translate-middle" style={{ bottom: -24 }}>
                        <div className="d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', boxShadow: '0 8px 20px rgba(0,0,0,.12)', marginTop: -22 }}>
                          <div className="d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, borderRadius: '50%', background: '#fee2e2', color: '#fb923c' }}>
                            <i className={`bi ${c.icon || 'bi-heart-fill'}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card-body text-center" style={{ paddingTop: 40 }}>
                      <div className="h5 fw-bold mb-1" style={{ color: '#111827' }}>{c.name}</div>
                      <div className="text-secondary mb-3">{c.email}</div>
                      <div className="d-flex justify-content-center">
                        <button className="btn btn-danger d-inline-flex align-items-center gap-2 px-4 py-2 rounded-3">
                          <i className="bi bi-person-plus" />
                          Tuyển thành viên
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="d-flex justify-content-center mt-4">
              <div className="d-flex align-items-center" style={{ gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
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
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      border: '1px solid ' + (n === page ? '#f97316' : '#e5e7eb'),
                      background: n === page ? '#f97316' : '#fff',
                      color: n === page ? '#fff' : '#111827',
                      padding: 0,
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn"
                  style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', padding: 0 }}
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}


