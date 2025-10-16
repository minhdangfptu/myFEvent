import { Container, Box, Typography, Grid, Chip } from "@mui/material"
import Header from "../components/Header"
import Footer from "../components/Footer"

export default function EventDetailPage() {
  return (
    <>
      <Header />

      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Box sx={{ backgroundColor: "#fff", borderRadius: 2, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <Box sx={{ width: "100%", height: 350, backgroundColor: "#a0a0a0", backgroundImage: "url(https://placeholder.svg?height=350&width=1200&query=Halloween+2025+event+banner)", backgroundSize: "cover", backgroundPosition: "center" }} />

          <Box sx={{ p: 5 }}>
            <Typography variant="h4" sx={{ color: "#ff5757", fontWeight: 700, mb: 4, fontSize: "32px" }}>Halloween 2025</Typography>

            <Grid container spacing={6} sx={{ mb: 5 }}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={{ fontSize: "15px", color: "#333" }}><strong>Thời gian:</strong> 12/12/2025</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "15px", color: "#333" }}><strong>Địa điểm:</strong> Đường 30m, Đại học FPT Hà Nội</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={{ fontSize: "15px", color: "#333" }}><strong>Trạng thái sự kiện:</strong> Sắp diễn ra</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: "15px", color: "#333" }}><strong>Đơn vị tổ chức:</strong></Typography>
                  <Chip label="FBGC" size="small" sx={{ backgroundColor: "#ffe0e0", color: "#ff5757", fontWeight: 600, height: "26px", fontSize: "13px" }} />
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 5, pt: 4, borderTop: "1px solid #e0e0e0" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontSize: "20px" }}>Chi tiết sự kiện</Typography>
              <Typography sx={{ fontSize: "15px", color: "#666", lineHeight: 1.8, mb: 2.5 }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam commodo orci nec orci maximus euismod at vitae nisl. Morbi laoreet lacinia blandit. Donec elementum turpis non commodo condimentum. Aenean scelerisque est sit amet eros varius, in varius nisi varius. Sed vel nisi vitae urna. Nam mattis luctus libero id porttitor. Pellentesque sit amet finibus elit. Mauris dictum in metus egestas condimentum.</Typography>
              <Typography sx={{ fontSize: "15px", color: "#666", lineHeight: 1.8, mb: 2.5 }}>Praesent consectetur nisi vel nisi varius, ac accumsan mi accumsan. Mauris tempor ullamcorper turpis, id viverra nisi tempus. Vivamus ut ipsum non tellus congue. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Nam nec justo in purus dignissim mattis eu quis augue. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Suspendisse sem.</Typography>
              <Typography sx={{ fontSize: "15px", color: "#666", lineHeight: 1.8 }}>Nullam ac sollicitudin elit. Proin in tellus nulla. Sed vel nisi vitae urna. Nam mattis luctus libero id porttitor. Pellentesque sit amet finibus elit. Mauris dictum in metus egestas condimentum. Phasellus dapibus interdum volutpat. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.</Typography>
            </Box>
          </Box>
        </Box>
      </Container>

      <Footer />
    </>
  )
}


