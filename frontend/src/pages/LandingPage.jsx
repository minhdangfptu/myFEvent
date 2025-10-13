import { Link as RouterLink } from "react-router-dom"
import Header from "../components/Header"
import Footer from "../components/Footer"

export default function FPTEvent_Landing() {
  return (
    <div className="min-vh-100 bg-white overflow-hidden">
      <Header />

      <section className="py-5" style={{ background: 'linear-gradient(135deg,#F5F3FF 0%,#EEF2FF 100%)' }}>
        <div className="container-xl px-2">
          <div className="row align-items-center g-4">
            <div className="col-12 col-sm-6">
              <h1 className="fw-bold" style={{ color: '#111827', lineHeight: 1.15, fontSize: '3rem' }}>
                Quản lý sự kiện tại trường ĐH FPT <span style={{ color: '#ef4444' }}>dễ dàng đến thế!</span>
              </h1>
              <p className="text-secondary fs-5">Giúp bạn tổ chức, tạo và quản lý mọi hoạt động trong các sự kiện của mình một cách dễ dàng và chuyên nghiệp.</p>
              <div className="d-flex gap-2 flex-wrap">
                <RouterLink to="/signup0" className="btn btn-danger">Bắt đầu ngay</RouterLink>
                <RouterLink to="/about" className="btn btn-outline-secondary">Xem thêm</RouterLink>
              </div>
            </div>
            <div className="col-12 col-sm-6 d-flex justify-content-sm-end justify-content-center ps-sm-0 ms-sm-n3">
              <div className="card shadow w-100" style={{ maxWidth: 720, background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <div style={{ width: 128, height: 12, backgroundColor: '#334155', borderRadius: 4, marginBottom: 6 }} />
                      <div style={{ width: 96, height: 8, backgroundColor: '#1f2937', borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 48, height: 48, backgroundColor: '#334155', borderRadius: '50%' }} />
                  </div>
                  <div className="row g-2">
                    {["#3b82f6", "#8b5cf6", "#10b981"].map((c, i) => (
                      <div className="col-4" key={i}>
                        <div className="p-2 rounded-3" style={{ background: 'rgba(30,41,59,.5)' }}>
                          <div style={{ width: 64, height: 8, background: '#334155', borderRadius: 4, marginBottom: 8 }} />
                          <div style={{ height: 24, borderRadius: 4, background: c }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-3 p-3" style={{ background: 'rgba(30,41,59,.5)' }}>
                    <div className="d-flex align-items-end gap-2" style={{ height: 96 }}>
                      {[45, 65, 55, 85, 75, 95].map((h, idx) => (
                        <div key={idx} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: idx % 2 ? 'linear-gradient(180deg, rgba(139,92,246,.7), rgba(139,92,246,.3))' : 'linear-gradient(180deg, rgba(59,130,246,.7), rgba(59,130,246,.3))' }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5 bg-white">
        <div className="container-xl px-2">
          <div className="text-center mb-4">
            <h2 className="fw-bold" style={{ color: '#111827' }}>Tất cả mọi thứ bạn cần để quản lý sự kiện</h2>
            <p className="text-secondary fs-5 mx-auto" style={{ maxWidth: 720 }}>Nền tảng toàn diện giúp bạn tổ chức và quản lý sự kiện một cách chuyên nghiệp</p>
          </div>
          <div className="row g-3">
            {[
              { icon: 'bi-calendar-event', title: 'Quản lý lịch trình', text: 'Tạo, chỉnh sửa và quản lý lịch trình sự kiện một cách dễ dàng và trực quan.', bg:'#dbeafe', color:'#3b82f6' },
              { icon: 'bi-people', title: 'Tổ chức sự kiện', text: 'Tạo, lên lịch và quản lý sự kiên với tính năng thống báo, lên lịch họp và các mốc thời gian chi tiết.', bg:'#fef3c7', color:'#f59e0b' },
              { icon: 'bi-bar-chart', title: 'Thống kê chi tiết', text: 'Xem báo cáo và thống kê chi tiết về hiệu quả của các sự kiện đã tổ chức.', bg:'#d1fae5', color:'#10b981' },
              { icon: 'bi-bell', title: 'Thông báo tức thời', text: 'Nhận thông báo về các sự kiện sắp diễn ra và cập nhật quan trọng.', bg:'#eee7ff', color:'#a78bfa' },
            ].map((f, idx) => (
              <div className="col-12 col-md-6 col-lg-3" key={idx}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <div className="rounded-2 d-grid place-items-center mb-2" style={{ width: 48, height: 48, background: f.bg, color: f.color }}>
                      <i className={`bi ${f.icon}`} />
                    </div>
                    <h6 className="fw-semibold" style={{ color: '#111827' }}>{f.title}</h6>
                    <p className="text-secondary mb-0">{f.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5" style={{ backgroundColor: '#f9fafb' }}>
        <div className="container-xl px-2">
          <div className="row gx-5 gy-4 align-items-center">
            <div className="col-12 col-sm-6">
              <h2 className="fw-bold" style={{ color: '#111827' }}>Xem tổng quan sự kiện, theo dõi tiến độ và kết quả</h2>
              <p className="text-secondary fs-5">Dashboard trực quan giúp bạn nắm bắt toàn bộ thông tin về sự kiện và đưa ra quyết định dựa trên dữ liệu thực tế.</p>
              <div className="d-grid gap-2">
                {["Theo dõi thời gian thực", "Báo cáo chi tiết", "Xuất dữ liệu dễ dàng"].map((t, i) => (
                  <div key={i} className="d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill" style={{ color: '#ef4444' }} />
                    <div style={{ color: '#111827' }}>{t}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-12 col-sm-6">
              <div className="card shadow" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)' }}>
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <div className="p-3 rounded-3" style={{ background: 'rgba(30,41,59,.5)' }}>
                        <div className="d-flex justify-content-between mb-2">
                          <small className="text-secondary">Sự kiện</small>
                          <small className="text-success">+12%</small>
                        </div>
                        <div className="d-flex align-items-end gap-1" style={{ height: 64 }}>
                          {[40,60,50,80,70].map((h, idx) => (
                            <div key={idx} style={{ flex: 1, height: `${h}%`, background: idx % 2 ? '#8b5cf6' : '#3b82f6', borderRadius: 2 }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-sm-6">
                      <div className="p-3 rounded-3 d-grid gap-2" style={{ background: 'rgba(30,41,59,.5)' }}>
                        <div className="d-flex justify-content-between">
                          <small className="text-secondary">Thành viên</small>
                          <small className="text-primary">+8%</small>
                        </div>
                        <div className="mx-auto" style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid #a78bfa', borderTopColor: 'transparent', transform: 'rotate(45deg)' }} />
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="p-3 rounded-3" style={{ background: 'rgba(30,41,59,.5)' }}>
                        <div className="d-flex align-items-end gap-2" style={{ height: 128 }}>
                          {[45,65,55,85,75,95].map((h, idx) => (
                            <div key={idx} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: idx % 2 ? 'linear-gradient(180deg, rgba(139,92,246,.7), rgba(139,92,246,.3))' : 'linear-gradient(180deg, rgba(59,130,246,.7), rgba(59,130,246,.3))' }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5 bg-white">
        <div className="container-xl px-2">
          <div className="row gx-5 gy-4 align-items-center">
            <div className="col-12 col-sm-6 order-2 order-sm-1">
              <div className="card shadow-sm" style={{ background: 'linear-gradient(135deg,#f1f5f9 0%,#e5e7eb 100%)' }}>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    {[{c:'#bfdbfe', s:'Active', sc:'#16a34a', sb:'#dcfce7'},{c:'#e9d5ff', s:'Active', sc:'#16a34a', sb:'#dcfce7'},{c:'#fed7aa', s:'Pending', sc:'#d97706', sb:'#fef3c7'}].map((m, idx) => (
                      <div key={idx} className="d-flex align-items-center gap-3 bg-white p-2 rounded-3 shadow-sm">
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: m.c }} />
                        <div className="flex-grow-1">
                          <div style={{ width: 96, height: 12, background: '#e5e7eb', borderRadius: 4, marginBottom: 6 }} />
                          <div style={{ width: 128, height: 8, background: '#f3f4f6', borderRadius: 4 }} />
                        </div>
                        <div className="px-2 py-1 rounded-3" style={{ background: m.sb }}>
                          <small className="fw-semibold" style={{ color: m.sc }}>{m.s}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 order-1 order-sm-2">
              <h2 className="fw-bold" style={{ color: '#111827' }}>Quản lý thành viên tiện lợi</h2>
              <p className="text-secondary fs-5">Dễ dàng theo dõi, phân loại và quản lý thành viên tham gia sự kiện. Theo dõi trạng thái và gửi thông báo cho từng nhóm thành viên.</p>
              <div className="d-grid gap-2 mb-3">
                {["Theo dõi trạng thái thành viên", "Phân quyền và phân nhóm", "Thông báo tự động cho thành viên"].map((t, i) => (
                  <div key={i} className="d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill" style={{ color: '#3b82f6' }} />
                    <div>{t}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width: 'fit-content' }}>Tìm hiểu thêm</button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
  