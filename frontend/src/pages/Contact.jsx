import { Container, Box, Typography, TextField, Button, Grid, Paper } from "@mui/material"
import { LocationOn, Email, Phone, AccessTime } from "@mui/icons-material"
import Header from "../components/Header"
import Footer from "../components/Footer"

export default function ContactPage() {
  return (
    <>
      <Header />

      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box sx={{ textAlign: "center", mb: 7 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, fontSize: "32px" }}>Liên hệ với chúng tôi</Typography>
          <Typography sx={{ color: "#666", fontSize: "15px", lineHeight: 1.7 }}>Nếu bạn có thắc mắc hoặc muốn hợp tác, hãy gửi tin nhắn cho chúng tôi nhé!</Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontSize: "18px" }}>Gửi tin nhắn cho chúng tôi</Typography>
              <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box>
                  <Typography sx={{ fontSize: "14px", mb: 1, fontWeight: 500, color: "#333" }}>Tên của bạn *</Typography>
                  <TextField fullWidth placeholder="Nhập tên của bạn" variant="outlined" size="small" sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "#ff5757" }, "&.Mui-focused fieldset": { borderColor: "#ff5757" } } }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "14px", mb: 1, fontWeight: 500, color: "#333" }}>Email *</Typography>
                  <TextField fullWidth placeholder="example@gmail.com" variant="outlined" size="small" type="email" sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "#ff5757" }, "&.Mui-focused fieldset": { borderColor: "#ff5757" } } }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "14px", mb: 1, fontWeight: 500, color: "#333" }}>Chủ đề</Typography>
                  <TextField fullWidth placeholder="Nhập chủ đề tin nhắn" variant="outlined" size="small" sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "#ff5757" }, "&.Mui-focused fieldset": { borderColor: "#ff5757" } } }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "14px", mb: 1, fontWeight: 500, color: "#333" }}>Nội dung tin nhắn *</Typography>
                  <TextField fullWidth placeholder="Nhập nội dung tin nhắn của bạn..." variant="outlined" multiline rows={4} sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "#ff5757" }, "&.Mui-focused fieldset": { borderColor: "#ff5757" } } }} />
                </Box>
                <Button variant="contained" fullWidth sx={{ backgroundColor: "#ff5757", textTransform: "none", py: 1.5, fontSize: "15px", fontWeight: 600, borderRadius: 1, boxShadow: "none", "&:hover": { backgroundColor: "#ff3333", boxShadow: "none" } }}>📧 Gửi ngay</Button>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontSize: "18px" }}>Thông tin liên hệ</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#fff3e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <LocationOn sx={{ color: "#ff9800", fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: "15px", mb: 0.5, color: "#333" }}>Địa chỉ</Typography>
                    <Typography sx={{ fontSize: "14px", color: "#666", lineHeight: 1.6 }}>Đường 30m, Đại học FPT, Hà Nội</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#ffe0e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Email sx={{ color: "#ff5757", fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: "15px", mb: 0.5, color: "#333" }}>Email</Typography>
                    <Typography sx={{ fontSize: "14px", color: "#666" }}>myfevent@gmail.com</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#e3f2fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Phone sx={{ color: "#2196f3", fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: "15px", mb: 0.5, color: "#333" }}>Số điện thoại</Typography>
                    <Typography sx={{ fontSize: "14px", color: "#666" }}>0123 7456 5689</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#f3e5f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <AccessTime sx={{ color: "#9c27b0", fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: "15px", mb: 0.5, color: "#333" }}>Thời gian làm việc</Typography>
                    <Typography sx={{ fontSize: "14px", color: "#666" }}>Thứ 2 - Thứ 6: 8h00 - 17h00</Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mt: 4, height: 220, backgroundColor: "#f5f5f5", borderRadius: 2, overflow: "hidden", border: "1px solid #e0e0e0" }}>
                <Box component="iframe" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.4967707743644!2d105.52488631540255!3d21.012372793840447!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345b465a4e65fb%3A0xaae6040cfabe8fe!2sFPT%20University!5e0!3m2!1sen!2s!4v1234567890123!5m2!1sen!2s" sx={{ width: "100%", height: "100%", border: 0 }} allowFullScreen loading="lazy" />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Footer />
    </>
  )
}


