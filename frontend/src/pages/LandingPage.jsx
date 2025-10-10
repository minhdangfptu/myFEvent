// install: npm i @mui/material @emotion/react @emotion/styled @mui/icons-material
import {
    Container,
    Box,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    CssBaseline,
    Link as MUILink,
    Divider,
  } from "@mui/material"
  import { Link as RouterLink } from "react-router-dom"
  import Header from "../components/Header"
  import Footer from "../components/Footer"
  import {
    CalendarMonth,
    People,
    BarChart,
    Notifications,
    CheckCircle,
    Facebook,
    Instagram,
    YouTube,
  } from "@mui/icons-material"
  
  export default function FPTEvent_MUI() {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#fff", overflowX: "hidden" }}>
        <CssBaseline />
  
        {/* Header */}
        <Header />
  
        {/* Hero */}
        <Box sx={{ py: { xs: 8, sm: 12 }, background: "linear-gradient(135deg,#F5F3FF 0%,#EEF2FF 100%)" }}>
          <Container maxWidth="xl" sx={{ px: 2 }}>
            <Grid container spacing={6} alignItems="center">
              {/* Cột trái: text */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "grid", gap: 3 }}>
                  <Typography variant="h1" sx={{ fontSize: { xs: "2.25rem", md: "3.5rem" }, fontWeight: 700, lineHeight: 1.15, color: "#111827" }}>
                    Quản lý sự kiện tại trường ĐH FPT {" "}
                    <Box component="span" sx={{ color: "#ef4444" }}>dễ dàng đến thế!</Box>
                  </Typography>
                  <Typography sx={{ color: "#4b5563", fontSize: 18 }}>
                    Giúp bạn tổ chức, tạo và quản lý mọi hoạt động trong các sự kiện của mình một cách dễ dàng và chuyên nghiệp.
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Button component={RouterLink} to="/signup0" variant="contained" sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}>
                      Bắt đầu ngay
                    </Button>
                    <Button component={RouterLink} to="/about" variant="outlined" sx={{ borderColor: "#d1d5db", color: "#374151", bgcolor: "#fff", "&:hover": { bgcolor: "#f9fafb", borderColor: "#9ca3af" } }}>
                      Xem thêm
                    </Button>
                  </Box>
                </Box>
              </Grid>
  
              {/* Cột phải: mockup (xoay từ sm trở lên) */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", justifyContent: { xs: "center", sm: "flex-end" }, minWidth: 0, overflow: "hidden" }}>
                  <Card
                    elevation={8}
                    sx={{
                      width: "100%",
                      maxWidth: 640,
                      background: "linear-gradient(135deg, #0f172a 0%, #111827 100%)",
                      transform: { xs: "none", sm: "rotate(2deg)" },
                      transition: "transform .2s",
                      "&:hover": { transform: "none" },
                    }}
                  >
                    <CardContent>
                      {/* header giả */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Box>
                          <Box sx={{ width: 128, height: 12, bgcolor: "#334155", borderRadius: 1, mb: 0.5 }} />
                          <Box sx={{ width: 96, height: 8, bgcolor: "#1f2937", borderRadius: 1 }} />
                        </Box>
                        <Box sx={{ width: 48, height: 48, bgcolor: "#334155", borderRadius: "50%" }} />
                      </Box>
                      {/* 3 thẻ nhỏ */}
                      <Grid container spacing={1.5}>
                        {["#3b82f6", "#8b5cf6", "#10b981"].map((c, i) => (
                          <Grid key={i} item xs={4}>
                            <Box sx={{ bgcolor: "rgba(30,41,59,.5)", borderRadius: 2, p: 1.5 }}>
                              <Box sx={{ width: 64, height: 8, bgcolor: "#334155", borderRadius: 1, mb: 1 }} />
                              <Box sx={{ height: 24, borderRadius: 1, bgcolor: c }} />
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                      {/* chart cột */}
                      <Box sx={{ mt: 2, bgcolor: "rgba(30,41,59,.5)", borderRadius: 2, p: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, height: 96 }}>
                          {[45, 65, 55, 85, 75, 95].map((h, idx) => (
                            <Box key={idx} sx={{ flex: 1, height: `${h}%`, borderRadius: 1, background: idx % 2 ? "linear-gradient(180deg, rgba(139,92,246,.7), rgba(139,92,246,.3))" : "linear-gradient(180deg, rgba(59,130,246,.7), rgba(59,130,246,.3))" }} />
                          ))}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>
  
        {/* Features */}
        <Box sx={{ py: { xs: 8, sm: 12 }, bgcolor: "#fff" }}>
          <Container maxWidth="xl" sx={{ px: 2 }}>
            <Box sx={{ textAlign: "center", mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: 28, md: 36 }, color: "#111827" }}>
                Tất cả mọi thứ bạn cần để quản lý sự kiện
              </Typography>
              <Typography sx={{ color: "#4b5563", fontSize: 18, maxWidth: 720, mx: "auto" }}>
                Nền tảng toàn diện giúp bạn tổ chức và quản lý sự kiện một cách chuyên nghiệp
              </Typography>
            </Box>
  
            <Grid container spacing={3} alignItems="stretch">
              {[
                { icon: <CalendarMonth />, title: "Quản lý lịch trình", color: "#3b82f6", bg: "#dbeafe" },
                { icon: <People />, title: "Quản lý thành viên", color: "#f59e0b", bg: "#fef3c7" },
                { icon: <BarChart />, title: "Thống kê chi tiết", color: "#10b981", bg: "#d1fae5" },
                { icon: <Notifications />, title: "Thông báo tức thời", color: "#a78bfa", bg: "#eee7ff" },
              ].map((f, idx) => (
                <Grid key={idx} item xs={3}>
                  <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", borderColor: "#e5e7eb", '&:hover': { boxShadow: 6 } }}>
                    <CardContent>
                      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: f.bg, color: f.color, display: "grid", placeItems: "center", mb: 2 }}>
                        {f.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827", mb: 1 }}>{f.title}</Typography>
                      <Typography sx={{ color: "#4b5563" }}>
                        {idx === 0 && "Tạo, chỉnh sửa và quản lý lịch trình sự kiện một cách dễ dàng và trực quan."}
                        {idx === 1 && "Theo dõi và quản lý danh sách người tham gia, phân quyền và giao nhiệm vụ."}
                        {idx === 2 && "Xem báo cáo và thống kê chi tiết về hiệu quả của các sự kiện đã tổ chức."}
                        {idx === 3 && "Nhận thông báo về các sự kiện sắp diễn ra và cập nhật quan trọng."}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
  
        {/* Analytics */}
        <Box sx={{ py: { xs: 8, sm: 12 }, bgcolor: "#f9fafb" }}>
          <Container maxWidth="xl" sx={{ px: 2 }}>
            <Grid container spacing={6} alignItems="center">
              {/* Text */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "grid", gap: 3 }}>
                  <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: 28, md: 36 }, color: "#111827" }}>
                    Xem tổng quan sự kiện, theo dõi tiến độ và kết quả
                  </Typography>
                  <Typography sx={{ color: "#4b5563", fontSize: 18 }}>
                    Dashboard trực quan giúp bạn nắm bắt toàn bộ thông tin về sự kiện và đưa ra quyết định dựa trên dữ liệu thực tế.
                  </Typography>
                  <Box sx={{ display: "grid", gap: 1.5 }}>
                    {["Theo dõi thời gian thực", "Báo cáo chi tiết", "Xuất dữ liệu dễ dàng"].map((t, i) => (
                      <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <CheckCircle sx={{ fontSize: 20, color: "#ef4444" }} />
                        <Typography sx={{ color: "#111827" }}>{t}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
              {/* Card thống kê */}
              <Grid item xs={12} sm={6}>
                <Card elevation={8} sx={{ background: "linear-gradient(135deg, #0f172a 0%, #111827 100%)" }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ bgcolor: "rgba(30,41,59,.5)", borderRadius: 2, p: 2 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                            <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>Sự kiện</Typography>
                            <Typography sx={{ fontSize: 12, color: "#34d399" }}>+12%</Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5, height: 64 }}>
                            {[40, 60, 50, 80, 70].map((h, idx) => (
                              <Box key={idx} sx={{ flex: 1, height: `${h}%`, bgcolor: idx % 2 ? "#8b5cf6" : "#3b82f6", borderRadius: 0.5 }} />
                            ))}
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ bgcolor: "rgba(30,41,59,.5)", borderRadius: 2, p: 2, display: "grid", gap: 1 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>Thành viên</Typography>
                            <Typography sx={{ fontSize: 12, color: "#60a5fa" }}>+8%</Typography>
                          </Box>
                          <Box sx={{ width: 64, height: 64, borderRadius: "50%", border: "4px solid #a78bfa", borderTopColor: "transparent", transform: "rotate(45deg)", mx: "auto" }} />
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ bgcolor: "rgba(30,41,59,.5)", borderRadius: 2, p: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, height: 128 }}>
                            {[45, 65, 55, 85, 75, 95].map((h, idx) => (
                              <Box key={idx} sx={{ flex: 1, height: `${h}%`, borderRadius: 1, background: idx % 2 ? "linear-gradient(180deg, rgba(139,92,246,.7), rgba(139,92,246,.3))" : "linear-gradient(180deg, rgba(59,130,246,.7), rgba(59,130,246,.3))" }} />
                            ))}
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
        </Box>
  
        {/* Member Management */}
        <Box sx={{ py: { xs: 8, sm: 12 }, bgcolor: "#fff" }}>
          <Container maxWidth="xl" sx={{ px: 2 }}>
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} sm={6} order={{ xs: 2, sm: 1 }}>
                <Card elevation={8} sx={{ background: "linear-gradient(135deg,#f1f5f9 0%,#e5e7eb 100%)" }}>
                  <CardContent>
                    <Box sx={{ display: "grid", gap: 2 }}>
                      {[{c:"#bfdbfe", s:"Active", sc:"#16a34a", sb:"#dcfce7"}, {c:"#e9d5ff", s:"Active", sc:"#16a34a", sb:"#dcfce7"}, {c:"#fed7aa", s:"Pending", sc:"#d97706", sb:"#fef3c7"}].map((m, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1.5, bgcolor: "#fff", p: 1.5, borderRadius: 2, boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: m.c }} />
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ width: 96, height: 12, bgcolor: "#e5e7eb", borderRadius: 1, mb: 0.5 }} />
                            <Box sx={{ width: 128, height: 8, bgcolor: "#f3f4f6", borderRadius: 1 }} />
                          </Box>
                          <Box sx={{ px: 1.5, py: 0.5, bgcolor: m.sb, borderRadius: 1.5 }}>
                            <Typography sx={{ fontSize: 12, color: m.sc, fontWeight: 600 }}>{m.s}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
  
              <Grid item xs={12} sm={6} order={{ xs: 1, sm: 2 }}>
                <Box sx={{ display: "grid", gap: 3 }}>
                  <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: 28, md: 36 }, color: "#111827" }}>
                    Quản lý thành viên tiện lợi
                  </Typography>
                  <Typography sx={{ color: "#4b5563", fontSize: 18 }}>
                    Dễ dàng theo dõi, phân loại và quản lý thành viên tham gia sự kiện. Theo dõi trạng thái và gửi thông báo cho từng nhóm thành viên.
                  </Typography>
                  <Box sx={{ display: "grid", gap: 1.5 }}>
                    {["Theo dõi trạng thái thành viên", "Phân quyền và phân nhóm", "Thông báo tự động cho thành viên"].map((t, i) => (
                      <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <CheckCircle sx={{ fontSize: 20, color: "#3b82f6" }} />
                        <Typography sx={{ color: "#111827" }}>{t}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Button variant="contained" sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" }, width: "fit-content" }}>
                    Tìm hiểu thêm
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>
  
        {/* Footer */}
        <Footer />
      </Box>
    )
  }
  
  // Small helper for social icon buttons
  function IconLink({ href, ariaLabel, children }) { return null }
  