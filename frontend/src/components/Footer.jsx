import { Box, Container, Grid, Typography, IconButton, Link as MUILink } from "@mui/material"
import { Facebook, Instagram, YouTube } from "@mui/icons-material"
import { Link as RouterLink } from "react-router-dom"

export default function Footer() {
  return (
    <Box sx={{ backgroundColor: "#1a2332", color: "#fff", py: 6, mt: 8 }}>
      <Container maxWidth="xl" sx={{ px: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, bgcolor: "#ef4444", color: "#fff", borderRadius: 1, display: "grid", placeItems: "center", fontWeight: 700 }}>F</Box>
            <Typography fontWeight={600}>FPT Event</Typography>
          </Box>
          <Typography sx={{ mt: 2, fontSize: "14px", color: "#aaa" }}>Nền tảng quản lý sự kiện dành cho sinh viên FPT</Typography>
        </Box>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={3}>
            <Typography align="center" sx={{ fontWeight: 600, mb: 2 }}>Sản phẩm</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: 'center' }}>
              <MUILink component={RouterLink} to="/events" underline="none" sx={{ color: "#aaa", fontSize: "14px" }}>Sự kiện tại FPT</MUILink>
              <MUILink href="#" underline="none" sx={{ color: "#aaa", fontSize: "14px" }}>Câu lạc bộ</MUILink>
              <MUILink href="#" underline="none" sx={{ color: "#aaa", fontSize: "14px" }}>Chính sách</MUILink>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography align="center" sx={{ fontWeight: 600, mb: 2 }}>Hỗ trợ</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: 'center' }}>
              <MUILink component={RouterLink} to="/about" underline="none" sx={{ color: "#aaa", fontSize: "14px" }}>Về chúng tôi</MUILink>
              <MUILink component={RouterLink} to="/contact" underline="none" sx={{ color: "#aaa", fontSize: "14px" }}>Liên hệ</MUILink>
              <MUILink href="#" underline="none" sx={{ color: "#aaa", fontSize: "14px" }}>Chính sách</MUILink>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography align="center" sx={{ fontWeight: 600, mb: 2 }}>Theo dõi chúng tôi</Typography>
            <Box sx={{ display: "flex", gap: 1, justifyContent: 'center' }}>
              <IconButton sx={{ color: "#fff", backgroundColor: "#333", "&:hover": { backgroundColor: "#444" } }}><Facebook /></IconButton>
              <IconButton sx={{ color: "#fff", backgroundColor: "#333", "&:hover": { backgroundColor: "#444" } }}><Instagram /></IconButton>
              <IconButton sx={{ color: "#fff", backgroundColor: "#333", "&:hover": { backgroundColor: "#444" } }}><YouTube /></IconButton>
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ borderTop: "1px solid #333", mt: 4, pt: 3, textAlign: "center" }}>
          <Typography sx={{ fontSize: "14px", color: "#aaa" }}>© 2025 myFEvent. All rights reserved.</Typography>
        </Box>
      </Container>
    </Box>
  )
}


