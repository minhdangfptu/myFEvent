import { Link as RouterLink } from "react-router-dom"
import { Box, Button, Container, Typography, Divider, Link as MUILink } from "@mui/material"
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard"
import EmailIcon from "@mui/icons-material/Email"

export default function Signup0Page() {
  return (
    <Box sx={{ minHeight: "100dvh",minWidth: "100vw", width: "100%", bgcolor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Container maxWidth="sm">
        {/* Logo */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <img src="/logo-03.png" alt="myFEvent Logo" style={{ height: "96px" }} />
        </Box>

        {/* Main Card */}
        <Box
          sx={{
            bgcolor: "white",
            borderRadius: 2,
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            p: 4,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 3 }}>
            {/* Icon */}
            <Box
              sx={{
                width: 64,
                height: 64,
                bgcolor: "#fef2f2",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CardGiftcardIcon sx={{ fontSize: 32, color: "#ef4444" }} />
            </Box>

            {/* Title */}
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
              Cùng myFEvent tổ chức sự kiện một cách dễ dàng
            </Typography>

            {/* Description */}
            <Typography variant="body2" sx={{ color: "#6b7280" }}>
              myFEvent giúp bạn quản lý thành viên, kết nối mọi người trong sự kiện và theo dõi hoạt động một cách dễ
              dàng.
            </Typography>

            {/* Email Login Button */}
            <Button
              component={RouterLink}
              to="/signup1"
              variant="outlined"
              fullWidth
              startIcon={<EmailIcon />}
              sx={{
                borderColor: "#d1d5db",
                color: "#374151",
                textTransform: "none",
                py: 1.5,
                "&:hover": {
                  borderColor: "#9ca3af",
                  bgcolor: "#f9fafb",
                },
              }}
            >
              Đăng kí với Email
            </Button>

            {/* Divider */}
            <Divider sx={{ width: "100%", color: "#6b7280" }}>Hoặc</Divider>

            {/* Google Login Button */}
            <Button
              variant="outlined"
              fullWidth
              startIcon={
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              }
              sx={{
                borderColor: "#d1d5db",
                color: "#374151",
                textTransform: "none",
                py: 1.5,
                "&:hover": {
                  borderColor: "#9ca3af",
                  bgcolor: "#f9fafb",
                },
              }}
            >
              Đăng nhập bằng Google
            </Button>

            {/* Terms */}
            <Typography variant="caption" sx={{ color: "#6b7280" }}>
              Bằng cách tiếp tục, bạn đồng ý với{" "}
              <MUILink component={RouterLink} to="#" underline="none" sx={{ color: "#ef4444" }}>
                Điều khoản sử dụng
              </MUILink>{" "}
              của myFEvent.
            </Typography>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "#6b7280" }}>
            Bạn có tài khoản?{" "}
            <MUILink component={RouterLink} to="/login" underline="none" sx={{ color: "#111827", fontWeight: 500 }}>
              Đăng nhập
            </MUILink>
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
