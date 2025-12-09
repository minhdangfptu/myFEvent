import * as React from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import img from "/aboutus_event.jpg";
import { useNavigate } from "react-router-dom";

function MaxContainer({ children }) {
  return <div className="container-xl px-2">{children}</div>;
}

/* ---------- Illustration (giữ nguyên) ---------- */
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

function PartnersSection() {
  const partners = [
    "/Patners/1.png",
    "/Patners/2.png",
    "/Patners/3.png",
    "/Patners/4.jpg",
    "/Patners/5.PNG",
    "/Patners/6.png",
    "/Patners/7.png",
    "/Patners/8.jpg",
    "/Patners/9.jpg",
    "/Patners/10.PNG",
    "/Patners/11.png",
    "/Patners/12.png",
    "/Patners/13.png",
    "/Patners/14.jpeg",
    "/Patners/16.png",
    "/Patners/17.PNG",
    "/Patners/18.png",
    "/Patners/19.jpeg",
    "/Patners/20.jpg",
    "/Patners/21.png",
    "/Patners/22.jpg",
    "/Patners/23.jpg",
    "/Patners/24.jpg",
    "/Patners/25.png",
    "/Patners/26.png",
    "/Patners/27.png",
    "/Patners/28.png",
    "/Patners/29.png",
    "/Patners/30.png",
    "/Patners/31.png",
    "/Patners/32.png",
  ]

  const ANIMATION_DURATION = 36
  const loopItems = [...partners, ...partners]

  return (
    <section
      className="py-5 position-relative"
      style={{ background: "#0b0520", overflow: "hidden", minHeight: "400px" }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* Base gradient layer with rainbow animation */}
        <div className="flashy-bg-layer-1" />

        {/* Secondary moving orbs */}
        <div className="flashy-orb flashy-orb-1" />
        <div className="flashy-orb flashy-orb-2" />
        <div className="flashy-orb flashy-orb-3" />
        <div className="flashy-orb flashy-orb-4" />

        {/* Rotating grid overlay */}
        <div className="grid-overlay" />
      </div>

      <MaxContainer>
        <div className="text-center mb-5 position-relative" style={{ zIndex: 10 }}>
          <h4 className="fw-bold mb-3 partners-title">Đối tác của chúng tôi</h4>
          <p className="text-light mx-auto partners-subtitle" style={{ maxWidth: 760 }}>
            Hợp tác cùng đối tác &amp; nhà tài trợ — rực rỡ, sống động và năng động.
          </p>
        </div>

        <div
          className="partners-marquee-wrapper overflow-hidden position-relative"
          style={{ width: "100%", zIndex: 10, padding: 20}}
        >
          <div
            className="partners-marquee__inner d-flex"
            style={{
              animation: `partners-scroll ${ANIMATION_DURATION}s linear infinite`,
            }}
          >
            {loopItems.map((src, idx) => (
              <div key={idx} className="partners-item-square" aria-hidden={idx >= partners.length ? "true" : "false"}>
                <div className="partners-card-neon">
                  <div className="card-inner">
                    <img src={src || "/placeholder.svg"} alt={`partner-${idx}`} />
                    <div className="shimmer" />
                    <div className="rainbow-border" />
                    <div className="glow-effect" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MaxContainer>

      <style>{`
        /* Multi-layer animated background with vibrant colors */
        .flashy-bg-layer-1 {
          position: absolute;
          inset: -50%;
          background: 
            radial-gradient(circle at 20% 30%, rgba(255, 0, 128, 0.3), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(0, 216, 255, 0.3), transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(148, 0, 255, 0.2), transparent 50%),
            linear-gradient(135deg, 
              #ff0080 0%, 
              #ff8c00 10%, 
              #40e0d0 20%, 
              #9400d3 30%, 
              #00ffff 40%, 
              #ff1493 50%,
              #ffd700 60%,
              #00ff00 70%,
              #4169e1 80%,
              #ff0080 100%
            );
          background-size: 400% 400%;
          filter: blur(80px) saturate(2) brightness(1.2);
          animation: rainbow-shift 15s ease-in-out infinite, bg-zoom 20s ease-in-out infinite;
          opacity: 0.6;
        }

        @keyframes rainbow-shift {
          0%, 100% { 
            background-position: 0% 50%;
            transform: rotate(0deg) scale(1);
          }
          25% {
            background-position: 100% 50%;
            transform: rotate(90deg) scale(1.1);
          }
          50% { 
            background-position: 100% 100%;
            transform: rotate(180deg) scale(1.2);
          }
          75% {
            background-position: 0% 100%;
            transform: rotate(270deg) scale(1.1);
          }
        }

        @keyframes bg-zoom {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.3) rotate(180deg); }
        }

        /* Floating colorful orbs */
        .flashy-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          animation: float-orb 12s ease-in-out infinite;
        }

        .flashy-orb-1 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255, 0, 255, 0.6), transparent);
          top: 10%;
          left: 10%;
          animation-duration: 14s;
        }

        .flashy-orb-2 {
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(0, 255, 255, 0.6), transparent);
          top: 60%;
          right: 15%;
          animation-duration: 16s;
          animation-delay: -4s;
        }

        .flashy-orb-3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(255, 255, 0, 0.5), transparent);
          bottom: 20%;
          left: 50%;
          animation-duration: 18s;
          animation-delay: -8s;
        }

        .flashy-orb-4 {
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(0, 255, 128, 0.5), transparent);
          top: 40%;
          right: 40%;
          animation-duration: 13s;
          animation-delay: -2s;
        }

        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, -80px) scale(1.2); }
          50% { transform: translate(-60px, 60px) scale(0.9); }
          75% { transform: translate(40px, 40px) scale(1.1); }
        }

        /* Animated grid overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: grid-move 20s linear infinite;
          opacity: 0.3;
        }

        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        /* Gradient text with glow animation */
        .partners-title {
          font-size: 2.5rem;
          background: linear-gradient(
            90deg,
            #ff0080,
            #ff8c00,
            #40e0d0,
            #9400d3,
            #00ffff,
            #ff0080
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-flow 4s linear infinite, text-glow 2s ease-in-out infinite;
          filter: drop-shadow(0 0 20px rgba(255, 0, 128, 0.5));
        }

        @keyframes gradient-flow {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        @keyframes text-glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(255, 0, 128, 0.5)); }
          50% { filter: drop-shadow(0 0 40px rgba(0, 255, 255, 0.8)); }
        }

        .partners-subtitle {
          animation: subtitle-pulse 3s ease-in-out infinite;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        @keyframes subtitle-pulse {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; text-shadow: 0 0 20px rgba(0, 255, 255, 0.5); }
        }

        /* MARQUEE track */
        .partners-marquee__inner {
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          min-width: max-content;
          gap: 0;
          will-change: transform;
        }

        .partners-item-square {
          flex: 0 0 170px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: 8px;
        }

        /* Enhanced card with rainbow border and multiple effects */
        .partners-card-neon {
          width: 100%;
          height: 100%;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-style: preserve-3d;
          perspective: 1200px;
          position: relative;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
          border: 2px solid transparent;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.7),
            0 0 60px rgba(255, 0, 128, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          will-change: transform, box-shadow, filter;
        }

        .card-inner {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Rainbow animated border */
        .rainbow-border {
          position: absolute;
          inset: -4px;
          background: linear-gradient(
            45deg,
            #ff0080, #ff8c00, #40e0d0, #9400d3, #00ffff, #ff1493, #ff0080
          );
          background-size: 400% 400%;
          border-radius: 20px;
          z-index: -1;
          animation: rainbow-rotate 3s linear infinite;
          opacity: 0;
          transition: opacity 0.6s ease;
        }

        @keyframes rainbow-rotate {
          0% { background-position: 0% 50%; transform: rotate(0deg); }
          50% { background-position: 100% 50%; transform: rotate(180deg); }
          100% { background-position: 0% 50%; transform: rotate(360deg); }
        }

        /* Glow effect layer */
        .glow-effect {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.1), transparent);
          opacity: 0;
          transition: opacity 0.6s ease;
        }

        /* LOGO image */
        .card-inner img {
          width: 84%;
          height: 84%;
          object-fit: contain;
          display: block;
          transform: translateZ(18px);
          transition: all 0.7s cubic-bezier(0.23, 1, 0.32, 1);
          filter: saturate(1.1) contrast(1.1) drop-shadow(0 8px 24px rgba(0, 0, 0, 0.3));
          backface-visibility: hidden;
        }

        /* Enhanced shimmer with color gradient */
        .card-inner .shimmer {
          position: absolute;
          left: -100%;
          top: -100%;
          width: 300%;
          height: 300%;
          background: linear-gradient(
            120deg, 
            transparent 0%, 
            rgba(255, 0, 128, 0.3) 30%,
            rgba(0, 255, 255, 0.3) 50%,
            rgba(255, 255, 0, 0.3) 70%,
            transparent 100%
          );
          transform: rotate(25deg) translateX(-100%);
          mix-blend-mode: overlay;
          pointer-events: none;
          transition: transform 1s cubic-bezier(0.23, 1, 0.32, 1);
        }

        /* Floating animation with rotation */
        @keyframes neon-float {
          0% { 
            transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); 
          }
          25% {
            transform: translateY(-12px) rotateX(5deg) rotateY(-5deg) rotateZ(2deg);
          }
          50% { 
            transform: translateY(-8px) rotateX(8deg) rotateY(-8deg) rotateZ(-2deg); 
          }
          75% {
            transform: translateY(-15px) rotateX(-5deg) rotateY(5deg) rotateZ(3deg);
          }
          100% { 
            transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); 
          }
        }

        .partners-item-square:nth-child(3n) .partners-card-neon { 
          animation: neon-float 5s ease-in-out infinite; 
        }
        .partners-item-square:nth-child(3n+1) .partners-card-neon { 
          animation: neon-float 5.5s ease-in-out infinite; 
          animation-delay: -1s;
        }
        .partners-item-square:nth-child(3n+2) .partners-card-neon { 
          animation: neon-float 6s ease-in-out infinite; 
          animation-delay: -2s;
        }

        /* Dramatic hover effects with multiple transforms and colors */
        .partners-card-neon:hover {
          transform: translateZ(80px) rotateX(15deg) rotateY(20deg) scale(1.18);
          box-shadow:
            0 50px 150px rgba(0, 0, 0, 0.8),
            0 0 150px rgba(255, 0, 255, 0.4),
            0 0 100px rgba(0, 255, 255, 0.4),
            0 0 80px rgba(255, 255, 0, 0.3);
          filter: saturate(1.5) brightness(1.15) hue-rotate(10deg);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .partners-card-neon:hover .rainbow-border {
          opacity: 1;
        }

        .partners-card-neon:hover .glow-effect {
          opacity: 1;
          animation: glow-pulse 1.5s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }

        .partners-card-neon:hover .card-inner img {
          transform: translateZ(70px) rotateY(20deg) rotateX(8deg) scale(1.12);
          filter: 
            drop-shadow(0 30px 80px rgba(255, 0, 255, 0.5))
            drop-shadow(0 -10px 40px rgba(0, 255, 255, 0.3))
            saturate(1.5) 
            contrast(1.2) 
            hue-rotate(15deg);
        }

        .partners-card-neon:hover .shimmer {
          transform: translateX(250%) rotate(25deg);
          transition-duration: 0.9s;
        }

        /* track animation */
        @keyframes partners-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Track with subtle wave motion */
        @keyframes track-wave {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        .partners-marquee__inner { 
          animation: partners-scroll ${ANIMATION_DURATION}s linear infinite, 
                     track-wave 4s ease-in-out infinite; 
        }

        /* responsive adjustments */
        @media (max-width: 992px) {
          .partners-item-square { flex: 0 0 150px; height: 130px; padding: 7px; }
          .partners-card-neon { border-radius: 16px; }
          .card-inner img { width: 80%; height: 80%; }
          .partners-title { font-size: 2rem; }
        }

        @media (max-width: 576px) {
          .partners-item-square { flex: 0 0 110px; height: 96px; padding: 6px; }
          .partners-card-neon { border-radius: 12px; }
          .card-inner img { width: 76%; height: 76%; transform: translateZ(10px); }
          .partners-title { font-size: 1.5rem; }
        }

        /* performance optimizations */
        .partners-marquee__inner, 
        .partners-card-neon, 
        .card-inner img,
        .rainbow-border,
        .shimmer,
        .glow-effect { 
          will-change: transform, filter, opacity; 
          backface-visibility: hidden; 
        }
      `}</style>
    </section>
  )
}

/* ---------- Main AboutUs component (cập nhật: chèn PartnersSection) ---------- */
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
                    src={img}
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

        {/* Chèn phần đối tác ở đây */}
        <PartnersSection />
      </div>
      <Footer />
    </>
  );
}
