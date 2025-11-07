import * as React from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import img from "/aboutus_event.jpg"
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
                    <button className="btn btn-outline-secondary">
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
                "https://scontent-nrt1-1.xx.fbcdn.net/v/t1.15752-9/550846168_1968528680605325_4350914197767645049_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeH5NRKQC7FgJVF0mHjhLG78zpKtZwS3i1LOkq1nBLeLUklgB7c-d3OueHA-ONZiqLPPg7G34jgHhR5teF7ufNBA&_nc_ohc=SoeGOlah02AQ7kNvwGomeSD&_nc_oc=AdkBYcyN9tSd0EZFfdPfHE6tEDutPCG8OZg8GlGuJBlkeW2CoGAHfqpt8rPxp6lAx2M&_nc_zt=23&_nc_ht=scontent-nrt1-1.xx&oh=03_Q7cD3gGZYlOK6-tkk8I2xkiH8x6Kp7SVWXaUikpCrNlTqMdCSg&oe=691EBC63",
                "https://scontent-nrt1-2.xx.fbcdn.net/v/t1.15752-9/574901600_2242003846283916_3523672598757401474_n.png?_nc_cat=105&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeGIQexfs2kLoigAwEmQ_wklCP69VkBhdVYI_r1WQGF1Vjyeb0bUmOa48ClAIZARuMElgjsUvF1pRRTaJlpVQ-P6&_nc_ohc=fTNz0Agm7rMQ7kNvwHJxfE0&_nc_oc=Adm9XCGBMuD96x-NhxLNGSKSqTom5eDSb_th6etfxde6TsCWxWkziA8HwbLC1HNIniE&_nc_zt=23&_nc_ht=scontent-nrt1-2.xx&oh=03_Q7cD3wEybW3FovD9KpHp2H4HufPOOE2bnW-WVBiHYuBQri_mOA&oe=69336515",
                "https://scontent-nrt1-2.xx.fbcdn.net/v/t1.15752-9/566596919_827011233025594_2922072484590488873_n.png?_nc_cat=104&ccb=1-7&_nc_sid=0024fc&_nc_eui2=AeF7tzW_kYsYebPRpAtrFStwCsAgRWRYfjgKwCBFZFh-OP7ySXBE9FHAtfeMr4dginM1RfjBhqtUFvVa9emP7Bhl&_nc_ohc=6HOhTqE0va4Q7kNvwEZ1lRq&_nc_oc=AdkHG5hcOzbdJejCWaEqMPHivwuVQnQ3JobXqdfFF-3omwqyjR9DJt2I8_adsUHEc-w&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-nrt1-2.xx&oh=03_Q7cD3gF27Nn4dGrpPelsEGt0PFN4OQHLF_NxB1Mhz2EjaH-nzg&oe=691EC1EE",
                "https://scontent-nrt1-1.xx.fbcdn.net/v/t1.15752-9/566368049_1145930187044398_1627346525192196137_n.png?_nc_cat=111&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeHJloFxOY5q8p9aKOhVSTMtp6XYczSpctunpdhzNKly24mMHnzwpMgqwG5cJx70Ih44nPLdcf9W_ftiMD_Ln9gU&_nc_ohc=-t6RjWwdC4oQ7kNvwES89Vf&_nc_oc=AdkDzBv-cx-Z1Xq7Y3uCNIoehHBqQDQX0A16dRSyvw_Zp9TSZvwD0bHiTvFs_eTNvZA&_nc_zt=23&_nc_ht=scontent-nrt1-1.xx&oh=03_Q7cD3gE9YHWq12BYmWXlLJuCQRF62XfP4ISk5qxUfOw16XiAPg&oe=691EDDDF",
                "https://scontent-nrt1-1.xx.fbcdn.net/v/t1.15752-9/506738012_1711083279781638_3339800596618501383_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeHDtzXOXWt7-xS1ty9-A0BQS2mUanFYWb9LaZRqcVhZvzrkTsI4gdYjzBV3Il0NYrhlFRWzkllQGdNlS_1ZLMad&_nc_ohc=wZeO951oc-gQ7kNvwERBLGZ&_nc_oc=AdloFyqA0WxaSesHEWZXLz_XBVpHeTcxIhdUKqgjX_GlJ6lp_0yAt9jgx9Pw6_KGXak&_nc_zt=23&_nc_ht=scontent-nrt1-1.xx&oh=03_Q7cD3gGl5JFoiZX1keQyD-rvHg65I9nynDT4G-yxsGwwZTYkog&oe=691EC3CB",
                "https://scontent-nrt1-2.xx.fbcdn.net/v/t1.15752-9/485444754_1020278956644918_721616754027606122_n.png?stp=cp0_dst-png&_nc_cat=107&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeHutY0OK8O0l-GdBl7W5FpBdpe1RmwrPy12l7VGbCs_LTLdmG-YrCITcGi_YuSfpz41HWdyVMR8nJBl4hl6bLxM&_nc_ohc=7naOOqxVs_4Q7kNvwEQc69W&_nc_oc=AdnjsqW6mQeNz9EFl6RBxaHdwW2EGvZLQufHqQFkSmCBW-pUu4uDOr0yQRZsNyBlcwo&_nc_zt=23&_nc_ht=scontent-nrt1-2.xx&oh=03_Q7cD3gH4-MhrekZ6h_hV4xcdaRfFFfw6yhK7b9XLbv4Y9Z6XAw&oe=691ED72B",
                "https://scontent-nrt1-2.xx.fbcdn.net/v/t1.15752-9/566655152_2288049668380610_1904681273816672860_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeFn5vWA_Z_1yJ3kuNLFUlPBfYm_XtA7FG59ib9e0DsUbvuyx1rwwFVMij03pQ3U210q9vEPRZ0SOZDrCoCTCpOR&_nc_ohc=rUvngG2hnCYQ7kNvwEunHCh&_nc_oc=AdkWVNUUMU9KWH-p_UXgZwBeUlgWUAnhjN_YL0j0wMYHtla9emBz43Tm5xwUvsaBpyk&_nc_zt=23&_nc_ht=scontent-nrt1-2.xx&oh=03_Q7cD3gFraX2GHKuFm5sRR2TQylIc0fbiYbZaLBSJwCmnasWZPA&oe=691EC256",
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
