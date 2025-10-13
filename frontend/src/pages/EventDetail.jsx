import Header from "../components/Header"
import Footer from "../components/Footer"
import { useLocation } from 'react-router-dom'

export default function EventDetailPage() {
  const location = useLocation()
  const event = location.state?.event || {
    title: 'Halloween 2025',
    date: '12/12/2025',
    location: 'Hà Nội',
    image: 'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?q=80&w=1200&auto=format&fit=crop',
    description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit...`,
    organizer: 'FBGC',
    status: 'Sắp diễn ra',
    address: 'Đường 30m, Đại học FPT Hà Nội',
  }
  return (
    <>
      <Header />

      <div className="container-xl py-4">
        <div className="bg-white rounded-3 shadow-sm overflow-hidden">
          <div style={{ width: '100%', height: 320, backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#a0a0a0' }} />

          <div className="p-4 p-md-5">
            <h2 className="fw-bold text-danger mb-4" style={{ fontSize: 28 }}>{event.title}</h2>

            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6">
                <div className="mb-2" style={{ fontSize: 15, color: '#333' }}><strong>Thời gian:</strong> {event.date}</div>
                <div style={{ fontSize: 15, color: '#333' }}><strong>Địa điểm:</strong> {event.address || event.location}</div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-2" style={{ fontSize: 15, color: '#333' }}><strong>Trạng thái sự kiện:</strong> {event.status || 'Sắp diễn ra'}</div>
                <div className="d-flex align-items-center gap-2" style={{ fontSize: 15, color: '#333' }}>
                  <strong>Đơn vị tổ chức:</strong>
                  <span className="badge" style={{ backgroundColor: '#ffe0e0', color: '#ff5757' }}>{event.organizer || 'FBGC'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-top">
              <h5 className="fw-bold mb-3" style={{ fontSize: 18 }}>Chi tiết sự kiện</h5>
              <p className="text-secondary" style={{ fontSize: 15, lineHeight: 1.8 }}>{event.description}</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}


