import { useState } from "react"
import UserLayout from "../../components/UserLayout"
import ContactPage from "../Public/Contact"

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState("faq")
  const [expandedFaqId, setExpandedFaqId] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState("Tổng quan")
  const [faqSearchTerm, setFaqSearchTerm] = useState("")

  const faqCategories = ["Tổng quan", "Tài khoản", "Sự kiện", "Tính năng"]

  const faqData = {
    "Tổng quan": [
      {
        id: 1,
        question: "myFEvent là gì?",
        answer:
          "myFEvent là hệ thống quản lý sự kiện toàn diện, giúp các tổ chức lập kế hoạch, theo dõi tiến độ, quản lý ngân sách và phối hợp đội ngũ một cách chuyên nghiệp. Hệ thống được thiết kế đặc biệt cho các sự kiện học thuật, hội thảo, và hoạt động cộng đồng.",
      },
      {
        id: 2,
        question: "Hệ thống có những vai trò nào?",
        answer:
          "Hệ thống có 4 vai trò chính: Trưởng ban Tổ chức - quản lý toàn bộ sự kiện, tạo và phê duyệt mọi hoạt động. Trưởng ban - quản lý một ban cụ thể, tạo ngân sách và phân công công việc cho thành viên trong ban. Thành viên - thực hiện công việc được giao, cập nhật tiến độ và ghi chi tiêu. Admin - quản trị hệ thống, quản lý người dùng và sự kiện tổng thể.",
      },
      {
        id: 3,
        question: "Làm sao để bắt đầu sử dụng hệ thống?",
        answer:
          "Bước 1: Đăng ký tài khoản với email và mật khẩu hoặc sử dụng Google. Bước 2: Xác thực email qua link được gửi đến hộp thư. Bước 3: Chờ Trưởng ban Tổ chức thêm bạn vào sự kiện với vai trò phù hợp. Bước 4: Truy cập trang chủ để xem danh sách sự kiện của bạn. Bước 5: Chọn sự kiện để xem dashboard và bắt đầu làm việc.",
      },
      {
        id: 4,
        question: "Làm sao để quản lý thông báo?",
        answer:
          "Vào mục 'Thông báo' trên sidebar để xem tất cả thông báo. Icon chuông sẽ hiển thị số lượng thông báo chưa đọc. Nhấn vào từng thông báo để đánh dấu đã đọc. Bạn có thể tùy chỉnh loại thông báo muốn nhận trong phần 'Cài đặt' > 'Thông báo'.",
      },
      {
        id: 5,
        question: "Dashboard hiển thị những thông tin gì?",
        answer:
          "Dashboard hiển thị tổng quan về sự kiện: Số lượng công việc theo trạng thái (To-do, In Progress, Done), tổng ngân sách và chi tiêu thực tế, số lượng rủi ro đang theo dõi, timeline các milestone quan trọng, và lịch họp sắp tới. Mỗi vai trò sẽ thấy dashboard phù hợp với quyền hạn của mình.",
      },
      {
        id: 6,
        question: "Làm sao để chuyển đổi giữa các sự kiện?",
        answer:
          "Tại trang chủ, bạn sẽ thấy danh sách tất cả sự kiện mà bạn tham gia. Nhấn vào sự kiện muốn làm việc để truy cập. Trong từng sự kiện, tên sự kiện hiện tại sẽ được hiển thị ở đầu sidebar. Bạn cũng có thể quay lại trang chủ bất kỳ lúc nào bằng cách nhấn vào 'Trang chủ' trên sidebar.",
      },
      {
        id: 7,
        question: "Hệ thống có hỗ trợ mobile không?",
        answer:
          "Có, giao diện myFEvent được thiết kế responsive, tự động điều chỉnh theo kích thước màn hình. Bạn có thể truy cập từ điện thoại, tablet để xem thông tin, cập nhật tiến độ công việc, và nhận thông báo. Tuy nhiên, một số tính năng phức tạp như biểu đồ Gantt hoặc xuất dữ liệu sẽ trải nghiệm tốt hơn trên máy tính.",
      },
      {
        id: 8,
        question: "Tôi có thể tham gia bao nhiêu sự kiện cùng lúc?",
        answer:
          "Bạn có thể tham gia không giới hạn số lượng sự kiện. Tuy nhiên, trong mỗi sự kiện, bạn chỉ có một vai trò duy nhất (Trưởng ban Tổ chức, Trưởng ban hoặc Thành viên). Bạn có thể có vai trò khác nhau ở các sự kiện khác nhau, ví dụ là Trưởng ban Tổ chức ở sự kiện A và Thành viên ở sự kiện B.",
      },
    ],
    "Tài khoản": [
      {
        id: 9,
        question: "Làm sao để đặt lại mật khẩu?",
        answer:
          "Tại trang đăng nhập, nhấn 'Quên mật khẩu'. Nhập địa chỉ email đã đăng ký. Kiểm tra hộp thư (kể cả thư mục spam) để nhận link đặt lại mật khẩu. Link có hiệu lực trong 1 giờ. Nhấn vào link, nhập mật khẩu mới (tối thiểu 8 ký tự) và xác nhận. Sau khi đổi mật khẩu thành công, đăng nhập lại với mật khẩu mới.",
      },
      {
        id: 10,
        question: "Làm sao để cập nhật thông tin cá nhân?",
        answer:
          "Vào 'Hồ sơ' trên sidebar. Nhấn nút 'Chỉnh sửa' ở góc trên. Bạn có thể cập nhật: Tên hiển thị, số điện thoại, ngày sinh, giới tính, địa chỉ, và avatar. Để đổi avatar, nhấn vào ảnh đại diện hiện tại và chọn ảnh mới từ máy tính (định dạng JPG, PNG, tối đa 5MB). Nhấn 'Lưu' để hoàn tất.",
      },
      {
        id: 11,
        question: "Tôi có thể đăng nhập bằng Google không?",
        answer:
          "Có, hệ thống hỗ trợ đăng nhập bằng tài khoản Google. Tại trang đăng nhập, chọn 'Đăng nhập với Google'. Chọn tài khoản Google muốn sử dụng. Nếu là lần đầu, hệ thống sẽ tự động tạo tài khoản myFEvent liên kết với Google của bạn. Lần sau bạn có thể đăng nhập nhanh chóng mà không cần nhập mật khẩu.",
      },
      {
        id: 12,
        question: "Tôi quên email đã đăng ký thì làm sao?",
        answer:
          "Nếu bạn quên email đã đăng ký, hãy liên hệ với Trưởng ban Tổ chức của sự kiện bạn tham gia hoặc Admin hệ thống qua trang 'Liên hệ'. Cung cấp thông tin cá nhân để xác minh danh tính (tên đầy đủ, số điện thoại, tên sự kiện tham gia). Admin sẽ hỗ trợ khôi phục tài khoản của bạn.",
      },
      {
        id: 13,
        question: "Làm sao để đổi email tài khoản?",
        answer:
          "Hiện tại hệ thống chưa hỗ trợ thay đổi email trực tiếp. Nếu bạn cần đổi email, vui lòng liên hệ Admin qua trang 'Liên hệ' hoặc email support@myfEvent.com. Cung cấp email cũ, email mới và lý do thay đổi. Admin sẽ xử lý yêu cầu của bạn trong vòng 24-48 giờ.",
      },
      {
        id: 14,
        question: "Tài khoản của tôi bị khóa, làm sao để mở lại?",
        answer:
          "Tài khoản có thể bị khóa do vi phạm chính sách hoặc hoạt động bất thường. Liên hệ Admin qua email support@myfEvent.com với tiêu đề '[Mở khóa tài khoản] - Email của bạn'. Giải thích lý do và cam kết tuân thủ chính sách. Admin sẽ xem xét và phản hồi trong vòng 2-3 ngày làm việc.",
      },
      {
        id: 15,
        question: "Làm sao để xóa tài khoản?",
        answer:
          "Vào 'Cài đặt' > 'Tài khoản' > 'Xóa tài khoản'. Đọc kỹ cảnh báo về việc xóa tài khoản (toàn bộ dữ liệu sẽ bị xóa vĩnh viễn). Nhập mật khẩu để xác nhận. Nhấn 'Xóa vĩnh viễn'. Lưu ý: Bạn không thể xóa tài khoản nếu đang là Trưởng ban Tổ chức của sự kiện đang diễn ra. Cần chuyển quyền Trưởng ban Tổ chức cho người khác trước.",
      },
    ],
    "Sự kiện": [
      {
        id: 16,
        question: "Làm sao để tạo sự kiện mới?",
        answer:
          "Chỉ người dùng có vai trò User (đã xác thực email) mới có thể tạo sự kiện và trở thành Trưởng ban Tổ chức. Tại trang chủ, nhấn nút 'Tạo sự kiện mới'. Điền thông tin: Tên sự kiện, mô tả, thời gian bắt đầu/kết thúc, địa điểm, loại sự kiện, số lượng người tham gia dự kiến. Upload ảnh bìa (tùy chọn). Nhấn 'Tạo sự kiện'. Sau khi tạo, bạn tự động trở thành Trưởng ban Tổ chức của sự kiện đó.",
      },
      {
        id: 17,
        question: "Làm sao để chỉnh sửa thông tin sự kiện?",
        answer:
          "Chỉ Trưởng ban Tổ chức mới có quyền chỉnh sửa. Vào 'Tổng quan' > 'Chi tiết sự kiện'. Nhấn nút 'Chỉnh sửa' ở góc trên. Cập nhật các thông tin cần thiết. Nhấn 'Lưu thay đổi'. Lưu ý: Không thể thay đổi thời gian bắt đầu nếu sự kiện đã diễn ra.",
      },
      {
        id: 18,
        question: "Làm sao để theo dõi tiến độ sự kiện?",
        answer:
          "Vào mục 'Tổng quan' > 'Dashboard tổng'. Trưởng ban Tổ chức và Trưởng ban sẽ thấy biểu đồ tổng quan: Tiến độ công việc (phần trăm hoàn thành), ngân sách (dự kiến vs thực tế), số lượng rủi ro theo mức độ nghiêm trọng, timeline các milestone. Thành viên chỉ thấy dashboard của công việc mình tham gia. Dữ liệu được cập nhật real-time.",
      },
      {
        id: 19,
        question: "Milestone là gì và cách sử dụng?",
        answer:
          "Milestone (Cột mốc) là các mốc thời gian quan trọng trong sự kiện, ví dụ: deadline nộp proposal, ngày khai mạc, deadline hoàn thành tài liệu, v.v. Trưởng ban Tổ chức tạo milestone tại 'Tổng quan' > 'Timeline sự kiện'. Nhấn 'Thêm milestone', điền tên, mô tả, ngày đến hạn, mức độ quan trọng. Milestone sẽ hiển thị trên timeline và lịch sự kiện. Hệ thống sẽ gửi thông báo nhắc nhở trước khi đến hạn.",
      },
      {
        id: 20,
        question: "Làm sao để quản lý ban sự kiện?",
        answer:
          "Trưởng ban Tổ chức vào 'Ban sự kiện' để tạo và quản lý các ban. Nhấn 'Tạo ban mới', điền tên ban, mô tả, chọn Trưởng ban từ danh sách thành viên. Sau khi tạo, Trưởng ban có thể thêm thành viên vào ban của mình. Mỗi ban có thể có nhiều thành viên nhưng chỉ 1 Trưởng ban. Trưởng ban Tổ chức có thể xem tất cả các ban và thay đổi Trưởng ban nếu cần.",
      },
      {
        id: 21,
        question: "Làm sao để thêm thành viên vào sự kiện?",
        answer:
          "Trưởng ban Tổ chức vào 'Thành viên' > 'Thêm thành viên mới'. Nhập email người muốn mời hoặc chọn từ danh sách người dùng hệ thống. Chọn vai trò (Trưởng ban Tổ chức, Trưởng ban, hoặc Thành viên). Nếu email chưa có trong hệ thống, họ sẽ nhận email mời đăng ký. Sau khi chấp nhận, họ sẽ xuất hiện trong danh sách thành viên sự kiện.",
      },
      {
        id: 22,
        question: "Làm sao để xóa hoặc tạm dừng sự kiện?",
        answer:
          "Chỉ Trưởng ban Tổ chức mới có quyền. Vào 'Tổng quan' > 'Chi tiết sự kiện' > 'Cài đặt nâng cao'. Để tạm dừng: Chọn 'Đặt trạng thái tạm dừng'. Sự kiện sẽ ẩn khỏi trang chủ của thành viên nhưng dữ liệu vẫn được giữ. Để xóa: Chọn 'Xóa sự kiện', xác nhận bằng mật khẩu. Cảnh báo: Xóa sự kiện sẽ xóa vĩnh viễn toàn bộ dữ liệu liên quan. Nên xuất dữ liệu trước khi xóa.",
      },
      {
        id: 23,
        question: "Sự kiện có thể có bao nhiêu thành viên?",
        answer:
          "Không giới hạn số lượng thành viên. Tuy nhiên, với sự kiện lớn (>100 người), khuyến nghị chia thành nhiều ban để dễ quản lý. Hiệu suất hệ thống được tối ưu cho sự kiện từ 10-200 người.",
      },
    ],
    "Tính năng": [
      {
        id: 24,
        question: "Làm sao để tạo và giao công việc?",
        answer:
          "Trưởng ban Tổ chức và Trưởng ban vào 'Công việc' > 'Tạo công việc mới'. Điền: Tên công việc, mô tả chi tiết, thời gian bắt đầu/kết thúc, mức độ ưu tiên (Thấp/Trung bình/Cao), gán cho thành viên (có thể gán nhiều người), đính kèm file nếu cần. Chọn trạng thái ban đầu (thường là To-do). Nhấn 'Tạo'. Người được gán sẽ nhận thông báo ngay lập tức.",
      },
      {
        id: 25,
        question: "Làm sao để theo dõi tiến độ công việc?",
        answer:
          "Vào 'Công việc' để xem danh sách. Chế độ xem Kanban: Công việc được chia theo cột To-do, In Progress, Done. Kéo thả để đổi trạng thái. Chế độ Gantt: Xem timeline công việc trên biểu đồ, phát hiện xung đột thời gian và phụ thuộc. Chế độ Danh sách: Lọc theo người thực hiện, trạng thái, ưu tiên. Trưởng ban Tổ chức và Trưởng ban xem thống kê tiến độ tại 'Công việc' > 'Thống kê tiến độ'.",
      },
      {
        id: 26,
        question: "Thành viên cập nhật tiến độ công việc như thế nào?",
        answer:
          "Thành viên vào 'Công việc' > chọn công việc của mình. Nhấn 'Cập nhật tiến độ'. Đổi trạng thái (To-do → In Progress → Done). Thêm comment báo cáo tiến độ hoặc vấn đề gặp phải. Upload file kết quả (nếu có). Nhấn 'Lưu'. Trưởng ban và Trưởng ban Tổ chức sẽ nhận thông báo về cập nhật này.",
      },
      {
        id: 27,
        question: "Làm sao để tạo ngân sách cho ban?",
        answer:
          "Trưởng ban vào 'Tài chính' > 'Ngân sách' > 'Tạo ngân sách mới'. Nhập tổng ngân sách dự kiến cho ban. Thêm các hạng mục chi tiêu: Tên hạng mục (vd: Trang trí, Ăn uống), số tiền dự kiến, mô tả. Đính kèm tài liệu dự toán (nếu có). Nhấn 'Gửi phê duyệt'. Trưởng ban Tổ chức sẽ nhận thông báo và xem xét phê duyệt ngân sách.",
      },
      {
        id: 28,
        question: "Làm sao để ghi chi tiêu và quản lý hóa đơn?",
        answer:
          "Thành viên vào 'Tài chính' > 'Chi tiêu' > 'Thêm chi tiêu'. Chọn hạng mục chi, nhập số tiền, ngày chi, mô tả. Upload ảnh hóa đơn/biên lai (bắt buộc nếu >200k). Nhấn 'Lưu'. Trưởng ban sẽ xem xét và phê duyệt. Sau khi phê duyệt, số tiền sẽ được trừ vào ngân sách thực tế. Thành viên có thể xem lịch sử chi tiêu của mình tại 'Tài chính' > 'Lịch sử chi tiêu'.",
      },
      {
        id: 29,
        question: "Làm sao để theo dõi và phân tích ngân sách?",
        answer:
          "Trưởng ban Tổ chức và Trưởng ban vào 'Tài chính' > 'Thống kê thu chi'. Xem biểu đồ so sánh ngân sách dự kiến vs thực tế theo từng ban. Xem chi tiết từng hạng mục đã chi bao nhiêu. Phát hiện các hạng mục vượt ngân sách (màu đỏ cảnh báo). Xuất báo cáo chi tiết dưới dạng Excel để trình sponsor hoặc lãnh đạo.",
      },
      {
        id: 30,
        question: "Làm sao để quản lý rủi ro trong sự kiện?",
        answer:
          "Vào 'Rủi ro' > 'Thêm rủi ro mới'. Mô tả rủi ro (vd: Mưa vào ngày sự kiện). Đánh giá: Xác suất xảy ra (Thấp/Trung bình/Cao), mức độ ảnh hưởng (Nhỏ/Trung bình/Lớn). Hệ thống tự động tính mức độ nghiêm trọng. Đề xuất biện pháp phòng ngừa và xử lý. Gán người chịu trách nhiệm theo dõi. Cập nhật trạng thái khi rủi ro thay đổi hoặc đã được xử lý.",
      },
      {
        id: 31,
        question: "Làm sao để phân tích rủi ro?",
        answer:
          "Vào 'Rủi ro' > 'Phân tích rủi ro'. Xem ma trận rủi ro: Trục X là xác suất, trục Y là mức độ ảnh hưởng. Rủi ro ở góc trên phải (đỏ) cần ưu tiên xử lý. Xem biểu đồ phân bổ rủi ro theo loại và trạng thái. Lọc rủi ro cần theo dõi sát. Xuất báo cáo rủi ro để báo cáo hoặc họp team.",
      },
      {
        id: 32,
        question: "Làm sao để tạo lịch họp?",
        answer:
          "Vào 'Lịch sự kiện' > 'Tạo lịch mới'. Chọn loại: Lịch toàn sự kiện (tất cả thành viên) hoặc lịch ban (chỉ thành viên trong ban). Điền: Tiêu đề, thời gian bắt đầu/kết thúc, địa điểm (có thể là link meet), agenda (nội dung cuộc họp), đính kèm tài liệu chuẩn bị. Chọn người tham gia (nếu là lịch ban). Nhấn 'Tạo'. Mọi người sẽ nhận thông báo và lịch sẽ hiển thị trên calendar của họ.",
      },
      {
        id: 33,
        question: "Làm sao để xem lịch sự kiện của mình?",
        answer:
          "Vào 'Lịch sự kiện'. Calendar hiển thị: Lịch họp (màu xanh), Milestone (màu đỏ), Deadline công việc. Nhấn vào từng mục để xem chi tiết. Chuyển đổi chế độ xem: Tháng, tuần, hoặc ngày. Đồng bộ với Google Calendar (nếu bật tính năng trong 'Cài đặt').",
      },
      {
        id: 34,
        question: "Làm sao để tạo và gửi feedback cho thành viên?",
        answer:
          "Chỉ khả dụng sau khi sự kiện kết thúc. Trưởng ban Tổ chức vào 'Feedback' > 'Tạo form feedback'. Thiết kế form với các câu hỏi: Đánh giá, lựa chọn, văn bản tự do. Chọn đối tượng nhận (toàn bộ hoặc theo ban). Nhấn 'Gửi feedback'. Thành viên nhận thông báo và điền feedback. Trưởng ban Tổ chức xem kết quả tại 'Feedback' > 'Thống kê phản hồi'.",
      },
      {
        id: 35,
        question: "Làm sao để xuất dữ liệu sự kiện?",
        answer:
          "Trưởng ban Tổ chức vào 'Tải xuống' > 'Dữ liệu sự kiện'. Chọn các mục cần xuất: Danh sách thành viên, công việc, ngân sách, rủi ro, timeline, feedback. Chọn định dạng: Excel (tất cả sheet trong 1 file) hoặc PDF (báo cáo tổng hợp). Nhấn 'Xuất'. File sẽ được tạo và tự động tải về. Thời gian xuất phụ thuộc vào lượng dữ liệu (thường 10-30 giây).",
      },
      {
        id: 36,
        question: "Làm sao để sử dụng mẫu tài liệu?",
        answer:
          "Vào 'Tải xuống' > 'Mẫu tài liệu'. Hệ thống cung cấp các mẫu: Proposal sự kiện, kế hoạch chi tiết, mẫu ngân sách, mẫu phân công công việc, checklist chuẩn bị sự kiện, v.v. Nhấn 'Tải về' mẫu cần dùng. Chỉnh sửa theo sự kiện của bạn. Upload lại vào hệ thống nếu cần chia sẻ với team.",
      },
      {
        id: 37,
        question: "Dữ liệu của tôi có an toàn không?",
        answer:
          "Có. Chúng tôi sử dụng mã hóa SSL/TLS cho mọi kết nối. Dữ liệu được mã hóa khi lưu trữ (encryption at rest). Backup tự động hàng ngày, lưu trữ ở nhiều địa điểm. Chỉ người trong sự kiện mới truy cập được dữ liệu sự kiện đó. Tuân thủ GDPR và các quy định bảo mật dữ liệu. Admin không thể xem dữ liệu sự kiện mà không được phép.",
      },
      {
        id: 38,
        question: "Làm sao để liên hệ support khi gặp lỗi?",
        answer:
          "Cách 1: Nhấn nút '?' ở góc dưới phải màn hình để vào trang Hỗ trợ. Cách 2: Vào sidebar > 'Hỗ trợ'. Tại đây, tìm câu hỏi trong FAQ hoặc gửi yêu cầu hỗ trợ với thông tin: Mô tả lỗi chi tiết, các bước tái hiện lỗi, screenshot (nếu có), thông tin trình duyệt/thiết bị. Team support sẽ phản hồi trong 24h (ngày làm việc).",
      },
    ],
  }

  const documents = [
    {
      icon: "📘",
      title: "Hướng dẫn sử dụng tổng quan",
      filename: "huong-dan-tong-quan.pdf",
    },
    {
      icon: "👤",
      title: "Hướng dẫn cho Trưởng ban Tổ chức",
      filename: "huong-dan-Trưởng ban Tổ chức.pdf",
    },
    {
      icon: "👥",
      title: "Hướng dẫn cho Trưởng ban",
      filename: "huong-dan-Trưởng ban.pdf",
    },
    {
      icon: "🙋",
      title: "Hướng dẫn cho Thành viên",
      filename: "huong-dan-Thành viên.pdf",
    },
    {
      icon: "⚙️",
      title: "Hướng dẫn quản lý công việc",
      filename: "huong-dan-cong-viec.pdf",
    },
    {
      icon: "💰",
      title: "Hướng dẫn quản lý ngân sách",
      filename: "huong-dan-ngan-sach.pdf",
    },
  ]

  // Lọc theo category + từ khóa (tìm trong cả câu hỏi & câu trả lời)
  const filteredFaqs = (faqData[selectedCategory] || []).filter((faq) => {
    if (!faqSearchTerm.trim()) return true
    const term = faqSearchTerm.toLowerCase()
    return (
      faq.question.toLowerCase().includes(term) ||
      faq.answer.toLowerCase().includes(term)
    )
  })

  return (
    <UserLayout title="Trung tâm hỗ trợ" activePage="support" sidebarType="user">
      <div className="support-page">
        {/* Header */}
        <div className="support-page__header mb-4">
          {/* Tab Navigation */}
          <div className="support-page__tabs d-flex gap-3 border-bottom" style={{ borderColor: '#e5e7eb' }}>
            <button
              className="support-page__tab-button btn btn-link text-decoration-none fw-semibold pb-3"
              style={{
                borderRadius: '0',
                color: activeTab === "faq" ? "#1f2937" : "#6b7280",
                borderBottom: activeTab === "faq" ? "3px solid #dc2626" : "3px solid transparent",
                fontSize: '15px',
                outline: 'none',
                boxShadow: 'none'
              }}
              onClick={() => setActiveTab("faq")}
            >
              Câu hỏi thường gặp
            </button>

            <button
              className="support-page__tab-button btn btn-link text-decoration-none fw-semibold pb-3"
              style={{
                color: activeTab === "documents" ? "#1f2937" : "#6b7280",
                borderBottom: activeTab === "documents" ? "3px solid #dc2626" : "3px solid transparent",
                fontSize: '15px',
                borderRadius: '0',
                outline: 'none',
                boxShadow: 'none'
              }}
              onClick={() => setActiveTab("documents")}
            >
              Tài liệu
            </button>

            <button
              className="support-page__tab-button btn btn-link text-decoration-none fw-semibold pb-3"
              style={{
                color: activeTab === "contact" ? "#1f2937" : "#6b7280",
                borderBottom: activeTab === "contact" ? "3px solid #dc2626" : "3px solid transparent",
                fontSize: '15px',
                borderRadius: '0',
                outline: 'none',
                boxShadow: 'none'
              }}
              onClick={() => setActiveTab("contact")}
            >
              Liên hệ
            </button>
          </div>
        </div>

        {/* FAQ Tab */}
        {activeTab === "faq" && (
          <div className="support-page__faq-section row g-4">
            {/* Categories Sidebar */}
            <div className="col-lg-3">
              <div className="support-page__categories d-flex flex-wrap gap-2 flex-lg-column" style={{ gap: '12px' }}>
                {faqCategories.map((category) => (
                  <button
                    key={category}
                    className="support-page__category-button btn fw-semibold"
                    style={{
                      backgroundColor: selectedCategory === category ? "#dc2626" : "#ffffff",
                      color: selectedCategory === category ? "#ffffff" : "#374151",
                      border: selectedCategory === category ? "2px solid #dc2626" : "2px solid #d1d5db",
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      width: '100%',
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                    onClick={() => {
                      setSelectedCategory(category)
                      setFaqSearchTerm("")
                      setExpandedFaqId(null)
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Thanh tìm kiếm FAQ dưới các category button */}
              <div className="mt-3">
                <div className="position-relative">
                  <i
                    className="bi bi-search position-absolute"
                    style={{
                      left: 12,
                      top: 10,
                      color: "#9CA3AF",
                      pointerEvents: "none"
                    }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm theo câu hỏi hoặc nội dung..."
                    value={faqSearchTerm}
                    onChange={(e) => {
                      setFaqSearchTerm(e.target.value)
                      setExpandedFaqId(null)
                    }}
                    style={{
                      paddingLeft: 36,
                      borderRadius: 8,
                      fontSize: 14,
                      borderColor: "#d1d5db",
                      height: 40
                    }}
                  />
                </div>
              </div>
            </div>

            {/* FAQ Items */}
            <div className="col-lg-9">
              <div className="support-page__faq-list">
                {filteredFaqs.length === 0 && (
                  <div
                    className="mb-3"
                    style={{
                      padding: "12px 16px",
                      borderRadius: 8,
                      backgroundColor: "#f9fafb",
                      border: "1px dashed #e5e7eb",
                      color: "#6b7280",
                      fontSize: 14,
                    }}
                  >
                    Không tìm thấy câu hỏi nào phù hợp với từ khóa.
                  </div>
                )}

                {filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="support-page__faq-item mb-3"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <button
                      className="btn btn-link w-100 text-start text-decoration-none fw-semibold"
                      style={{
                        color: '#1f2937',
                        padding: '16px 20px',
                        fontSize: '15px'
                      }}
                      onClick={() => setExpandedFaqId(expandedFaqId === faq.id ? null : faq.id)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{faq.question}</span>
                        <span
                          className="support-page__faq-icon"
                          style={{
                            fontSize: '20px',
                            color: '#dc2626',
                            fontWeight: 'bold',
                            minWidth: '24px',
                            textAlign: 'center'
                          }}
                        >
                          {expandedFaqId === faq.id ? "−" : "+"}
                        </span>
                      </div>
                    </button>
                    {expandedFaqId === faq.id && (
                      <div
                        className="support-page__faq-answer border-top"
                        style={{
                          padding: '16px 20px',
                          color: '#6b7280',
                          backgroundColor: '#f9fafb',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          borderColor: '#e5e7eb'
                        }}
                      >
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="support-page__documents-tab">
            <div className="row g-4">
              {/* Video Tutorial Section */}
              <div className="col-lg-8">
                <div className="support-page__video-section">
                  <h2 className="support-page__video-title fw-bold mb-3" style={{ fontSize: '20px', color: '#1f2937' }}>
                    Video hướng dẫn
                  </h2>
                  <div
                    className="support-page__video-placeholder d-flex align-items-center justify-content-center"
                    style={{
                      height: "400px",
                      borderRadius: "12px",
                      backgroundColor: '#1f2937',
                      border: '2px solid #374151'
                    }}
                  >
                    <div className="text-center" style={{ color: '#ffffff' }}>
                      <div className="mb-3">
                        <svg width="80" height="80" fill="currentColor" viewBox="0 0 16 16" style={{ opacity: 0.4 }}>
                          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          <path d="M8 4v.001M8 6v4M8 11v.001" strokeWidth="2" stroke="currentColor" />
                        </svg>
                      </div>
                      <h4 className="fw-bold mb-2" style={{ fontSize: '18px' }}>Video không có sẵn</h4>
                      <p className="mb-0" style={{ color: '#9ca3af', fontSize: '14px' }}>
                        Video này hiện không khả dụng
                      </p>
                    </div>
                  </div>
                  <div className="mt-4" style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 className="fw-bold mb-2" style={{ fontSize: '18px', color: '#1f2937' }}>
                      Hướng dẫn sử dụng myFEvent cho người dùng mới
                    </h3>
                    <p className="mb-0" style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
                      Video hướng dẫn sử dụng hệ thống myFEvent từ cơ bản đến nâng cao. Học cách tạo và quản lý sự kiện,
                      phân công công việc, theo dõi tiến độ, quản lý ngân sách, phân tích rủi ro và phối hợp đội ngũ hiệu quả.
                      Hệ thống giúp bạn tổ chức các sự kiện một cách chuyên nghiệp với giao diện thân thiện và đầy đủ tính năng.
                    </p>
                  </div>
                </div>
              </div>

              {/* Documents List Section */}
              <div className="col-lg-4">
                <div className="support-page__documents-section">
                  <h2 className="support-page__documents-title fw-bold mb-3" style={{ fontSize: '20px', color: '#1f2937' }}>
                    Tài liệu tải về
                  </h2>
                  <div className="d-flex flex-column gap-3">
                    {documents.map((doc, index) => (
                      <div
                        key={index}
                        className="support-page__document-item"
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '16px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div className="d-flex align-items-start gap-3">
                          <div
                            className="support-page__document-icon d-flex align-items-center justify-content-center"
                            style={{
                              width: "48px",
                              height: "48px",
                              fontSize: "24px",
                              backgroundColor: '#fef2f2',
                              borderRadius: '8px',
                              border: '1px solid #fee2e2',
                              flexShrink: 0
                            }}
                          >
                            {doc.icon}
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="fw-semibold mb-1" style={{ fontSize: '15px', color: '#1f2937' }}>
                              {doc.title}
                            </h5>
                            <p className="mb-0" style={{ fontSize: '13px', color: '#dc2626' }}>
                              {doc.filename}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === "contact" && (
          <div className="support-page__contact-tab">
            <ContactPage hideLayout />
          </div>
        )}
      </div>
    </UserLayout>
  )
}
