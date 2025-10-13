import Header from "../components/Header"
import Footer from "../components/Footer"

export default function ContactPage() {
  return (
    <>
      <Header />

      <div className="container-xl px-2 py-5 py-md-5">
        <div className="text-center mb-5">
          <h1 className="fw-bold mb-2" style={{ fontSize: 32 }}>Liên hệ với chúng tôi</h1>
          <p className="text-secondary" style={{ fontSize: 15, lineHeight: 1.7 }}>Nếu bạn có thắc mắc hoặc muốn hợp tác, hãy gửi tin nhắn cho chúng tôi nhé!</p>
        </div>

        <div className="row g-4">
          <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3" style={{ fontSize: 18 }}>Gửi tin nhắn cho chúng tôi</h5>
                <form className="d-flex flex-column gap-3">
                  <div>
                    <div className="form-label mb-1" style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>Tên của bạn *</div>
                    <input className="form-control form-control-sm" placeholder="Nhập tên của bạn" />
                  </div>
                  <div>
                    <div className="form-label mb-1" style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>Email *</div>
                    <input type="email" className="form-control form-control-sm" placeholder="example@gmail.com" />
                  </div>
                  <div>
                    <div className="form-label mb-1" style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>Chủ đề</div>
                    <input className="form-control form-control-sm" placeholder="Nhập chủ đề tin nhắn" />
                  </div>
                  <div>
                    <div className="form-label mb-1" style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>Nội dung tin nhắn *</div>
                    <textarea className="form-control" rows="4" placeholder="Nhập nội dung tin nhắn của bạn..."></textarea>
                  </div>
                  <button type="button" className="btn btn-danger w-100 fw-semibold py-2">Gửi ngay</button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3" style={{ fontSize: 18 }}>Thông tin liên hệ</h5>
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 44, height: 44, backgroundColor: '#fff3e0' }}>
                      <i className="bi bi-geo-alt-fill" style={{ color: '#ff9800', fontSize: 20 }}></i>
                    </div>
                    <div>
                      <div className="fw-semibold" style={{ fontSize: 15, color: '#333' }}>Địa chỉ</div>
                      <div className="text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>Đường 30m, Đại học FPT, Hà Nội</div>
                    </div>
                  </div>
                  <div className="d-flex gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 44, height: 44, backgroundColor: '#ffe0e0' }}>
                      <i className="bi bi-envelope-fill" style={{ color: '#ff5757', fontSize: 20 }}></i>
                    </div>
                    <div>
                      <div className="fw-semibold" style={{ fontSize: 15, color: '#333' }}>Email</div>
                      <div className="text-secondary" style={{ fontSize: 14 }}>myfevent@gmail.com</div>
                    </div>
                  </div>
                  <div className="d-flex gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 44, height: 44, backgroundColor: '#e3f2fd' }}>
                      <i className="bi bi-telephone-fill" style={{ color: '#2196f3', fontSize: 20 }}></i>
                    </div>
                    <div>
                      <div className="fw-semibold" style={{ fontSize: 15, color: '#333' }}>Số điện thoại</div>
                      <div className="text-secondary" style={{ fontSize: 14 }}>0123 7456 5689</div>
                    </div>
                  </div>
                  <div className="d-flex gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 44, height: 44, backgroundColor: '#f3e5f5' }}>
                      <i className="bi bi-clock-fill" style={{ color: '#9c27b0', fontSize: 20 }}></i>
                    </div>
                    <div>
                      <div className="fw-semibold" style={{ fontSize: 15, color: '#333' }}>Thời gian làm việc</div>
                      <div className="text-secondary" style={{ fontSize: 14 }}>Thứ 2 - Thứ 6: 8h00 - 17h00</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-3 overflow-hidden border" style={{ height: 220, borderColor: '#e0e0e0' }}>
                  <iframe title="map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.4967707743644!2d105.52488631540255!3d21.012372793840447!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345b465a4e65fb%3A0xaae6040cfabe8fe!2sFPT%20University!5e0!3m2!1sen!2s!4v1234567890123!5m2!1sen!2s" style={{ width: '100%', height: '100%', border: 0 }} loading="lazy" allowFullScreen></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}


