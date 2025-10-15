import * as React from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

export default function PolicyPage() {
  return (
    <div className="bg-white min-vh-100 d-flex flex-column">
      <Header />

      <main className="flex-grow-1" style={{ background: 'linear-gradient(180deg,#fff, #fff 40%, #f8fafc)' }}>
        <div className="container-xl py-4">
          <div className="text-center mb-3">
            <h2 className="fw-bold" style={{ color: '#111827' }}>Chính sách & Điều khoản</h2>
            <div className="text-secondary" style={{ fontSize: 14 }}>Dưới đây là các chính sách và điều khoản của chúng tôi khi sử dụng myFEvent.</div>
          </div>

          <div className="mx-auto bg-white" style={{ maxWidth: 760, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.06)' }}>
            <div className="p-3 p-sm-4">
              {[ 
                ['Giới thiệu', 'Trang web được vận hành bởi đội ngũ phát triển myFEvent. Việc bạn truy cập và sử dụng trang web đồng nghĩa với việc bạn đã đồng ý với các điều khoản và chính sách như được nêu dưới đây.'],
                ['Quyền và trách nhiệm của người dùng', 'Người dùng có trách nhiệm cung cấp thông tin chính xác, không sử dụng trang web vào mục đích vi phạm pháp luật, gây ảnh hưởng đến hoạt động của Ban tổ chức hoặc quyền lợi của người khác.'],
                ['Quyền và trách nhiệm của chúng tôi', 'Chúng tôi có quyền tạm dừng, hạn chế nội dung hoặc tạm ngưng hoạt động của trang web mà không cần thông báo trước. Bất kỳ thiệt hại nào phát sinh sẽ được mô tả minh bạch và chỉ liên quan đến phạm vi cho phép của pháp luật.'],
                ['Thu thập và bảo mật thông tin', 'Chúng tôi thu thập các thông tin như họ tên, email, số điện thoại, hoặc sẽ được bạn cung cấp khi tham gia sự kiện. Dữ liệu của bạn sẽ được sử dụng vì mục đích vận hành dịch vụ.'],
                ['Sử dụng dữ liệu cá nhân', 'Dữ liệu cá nhân có thể được sử dụng cho mục đích hỗ trợ người dùng, truyền thông, hoặc thống kê nội bộ. Chúng tôi không chuyển giao dữ liệu cá nhân của bạn cho bên thứ ba trừ khi có yêu cầu hợp pháp từ cơ quan có thẩm quyền.'],
                ['Chính sách bản quyền', 'Tất cả nội dung, hình ảnh, biểu tượng và văn bản hiển thị thuộc quyền sở hữu của chúng tôi. Mọi hành vi sao chép, chỉnh sửa, sử dụng lại cần có sự cho phép bằng văn bản.'],
                ['Thay đổi điều khoản', 'Chúng tôi có thể cập nhật hoặc điều chỉnh các điều khoản khi cần thiết. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên website.'],
                ['Liên hệ', 'Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ: myf.event@gmail.com hoặc 0247 300 5588.'],
              ].map((item, idx) => (
                <div key={idx} className="mb-4">
                  <div className="fw-semibold mb-2" style={{ fontSize: 18, color: '#111827' }}>{idx + 1}. {item[0]}</div>
                  <div className="text-secondary" style={{ lineHeight: 1.7 }}>{item[1]}</div>
                  {item[0] === 'Liên hệ' && (
                    <div className="mt-3 p-3" style={{ background: '#f8fafc', borderRadius: 10 }}>
                      <div className="d-flex align-items-center gap-2 mb-2" style={{ color: '#111827' }}>
                        <i className="bi bi-envelope-open text-danger" />
                        <span>Email: myFEvent@gmail.com</span>
                      </div>
                      <div className="d-flex align-items-center gap-2" style={{ color: '#111827' }}>
                        <i className="bi bi-telephone text-danger" />
                        <span>Số điện thoại: (024) 7300 5588</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-secondary mt-3" style={{ fontSize: 12 }}>Cập nhật lần cuối: 01 tháng 10, 2025</div>
        </div>
      </main>

      <Footer />
    </div>
  )
}


