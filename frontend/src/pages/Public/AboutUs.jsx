import * as React from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import img from "/aboutus_event.jpg"
import { useNavigate } from "react-router-dom";
function MaxContainer({ children }) {
  return <div className="container-xl px-2">{children}</div>;
}

function Illustration() {
  return (
    <div
      className="position-relative mx-auto"
      style={{ width: "100%", maxWidth: 420 }}
    >
      <div
        className="p-3 rounded-3 shadow-sm"
        style={{ background: "#F3F4F6" }}
      >
        <div className="d-grid gap-2">
          <div
            style={{
              height: 10,
              width: 120,
              background: "#D1D5DB",
              borderRadius: 4,
            }}
          />
          <div
            style={{
              height: 8,
              width: 96,
              background: "#E5E7EB",
              borderRadius: 4,
            }}
          />
          <div className="row g-2 mt-1">
            {["#3B82F6", "#F59E0B", "#10B981"].map((c, i) => (
              <div className="col-4" key={i}>
                <div
                  className="p-2 rounded-3 shadow-sm"
                  style={{ background: "#FFFFFF" }}
                >
                  <div
                    style={{
                      height: 64,
                      borderRadius: 4,
                      background: c,
                      opacity: 0.9,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-3 p-2" style={{ background: "#111827" }}>
            <div className="d-flex gap-2" style={{ height: 80 }}>
              {[45, 70, 55, 85, 60, 90].map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    alignSelf: "flex-end",
                    height: `${h}%`,
                    background: "#EF4444",
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutUs() {
  const navigate = useNavigate();
  return (
    <>
      <Header />
      <div className="bg-white">
        <section
          className="py-5"
          style={{
            background: "linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)",
          }}
        >
          <MaxContainer>
            <div className="row g-4 align-items-center">
              <div className="col-12 col-md-6">
                <div className="d-grid gap-3">
                  <h2
                    className="fw-bold"
                    style={{ color: "#111827", fontSize: "2.6rem" }}
                  >
                    Chúng tôi là myFEvent, nền tảng quản lý sự kiện dành cho
                    sinh viên
                  </h2>
                  <p className="text-secondary">
                    myFEvent hướng tới hỗ trợ các CLB, tổ chức sinh viên tổ chức
                    và vận hành hoạt động hiệu quả hơn, minh bạch hơn và kết nối
                    tốt hơn.
                  </p>
                  <div className="d-flex gap-2">
                    <button className="btn btn-danger">Tìm hiểu thêm</button>
                    <button onClick={()=> { navigate("/contact")}} className="btn btn-outline-secondary">
                      Liên hệ
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <Illustration />
              </div>
            </div>
          </MaxContainer>
        </section>

        <section className="py-5 bg-white">
          <MaxContainer>
            <div className="text-center mb-4">
              <h3 className="fw-bold" style={{ color: "#111827" }}>
                Sứ mệnh của chúng tôi
              </h3>
              <p className="text-secondary mx-auto" style={{ maxWidth: 760 }}>
                myFEvent mong muốn mang lại trải nghiệm quản lý sự kiện tốt hơn
                cho người tổ chức lẫn người tham gia thông qua các công cụ hiện
                đại và dữ liệu.
              </p>
            </div>
            <div className="row g-3">
              {[
                {
                  icon: "bi-calendar-event",
                  title: "Tổ chức hiệu quả",
                  text: "Quy trình rõ ràng, phân công minh bạch và theo dõi tiến độ trực quan.",
                  bg: "#DBEAFE",
                  color: "#3B82F6",
                },
                {
                  icon: "bi-people",
                  title: "Kết nối cộng đồng",
                  text: "Gắn kết thành viên, mở rộng mạng lưới và chia sẻ tri thức dễ dàng.",
                  bg: "#FEF3C7",
                  color: "#F59E0B",
                },
                {
                  icon: "bi-lightbulb",
                  title: "Thúc đẩy sáng tạo",
                  text: "Tạo môi trường để ý tưởng được nuôi dưỡng và triển khai nhanh chóng.",
                  bg: "#DCFCE7",
                  color: "#10B981",
                },
                {
                  icon: "bi-heart",
                  title: "Phát triển bền vững",
                  text: "Dựa trên dữ liệu, minh bạch và hiệu quả để xây dựng giá trị dài hạn.",
                  bg: "#FCE7F3",
                  color: "#EC4899",
                },
              ].map((f, idx) => (
                <div className="col-12 col-md-6 col-lg-3" key={idx}>
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <div
                        className="rounded-2 d-grid place-items-center mb-2"
                        style={{
                          width: 48,
                          height: 48,
                          background: f.bg,
                          color: f.color,
                        }}
                      >
                        <i className={`bi ${f.icon}`} />
                      </div>
                      <h6 className="fw-bold" style={{ color: "#111827" }}>
                        {f.title}
                      </h6>
                      <p className="text-secondary mb-0">{f.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </MaxContainer>
        </section>

        <section className="py-5" style={{ background: "#F9FAFB" }}>
          <MaxContainer>
            <div className="row g-4 align-items-center">
              <div className="col-12 col-md-6">
                <div className="d-grid gap-2">
                  <h4 className="fw-bold" style={{ color: "#111827" }}>
                    Câu chuyện của myFEvent
                  </h4>
                  <p className="text-secondary">
                    Bắt nguồn từ mong muốn giúp các CLB và tổ chức sinh viên vận
                    hành sự kiện tốt hơn, myFEvent được xây dựng dựa trên kinh
                    nghiệm thực tế và phản hồi liên tục.
                  </p>
                  <p className="text-secondary">
                    Chúng tôi tin rằng công nghệ có thể góp phần giúp quy trình
                    tổ chức minh bạch và hiệu quả. Từ lập kế hoạch, ngân sách,
                    nhân sự cho tới đánh giá sau sự kiện, tất cả được tích hợp
                    trong một nền tảng.
                  </p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="rounded-3 overflow-hidden shadow">
                  <img
                  src = {img}
                    alt="Team working"
                    className="w-100"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              </div>
            </div>
          </MaxContainer>
        </section>

        <section className="py-5 bg-white">
          <MaxContainer>
            <div className="text-center mb-3">
              <h4 className="fw-bold" style={{ color: "#111827" }}>
                Đội ngũ myFEvent
              </h4>
              <p className="text-secondary mx-auto" style={{ maxWidth: 760 }}>
                Những người trẻ mang tinh thần sáng tạo, trách nhiệm và đam mê
                đổi mới trong hoạt động sinh viên.
              </p>
            </div>
            <div className="d-flex justify-content-center flex-wrap gap-3">
              {[
                "/DevTeam/dung.jpg",
                "/DevTeam/giang.jpg",
                "/DevTeam/md.jpg",
                "/DevTeam/qhuy.jpg",
                "/DevTeam/thu.png",
                "/DevTeam/tung.png",
                "/DevTeam/tram.png",
              ].map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  className="rounded-circle shadow-sm"
                  style={{ width: 72, height: 72 }}
                />
              ))}
            </div>
          </MaxContainer>
        </section>
      </div>
      <Footer />
    </>
  );
}
