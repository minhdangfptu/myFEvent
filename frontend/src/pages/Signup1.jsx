import { Link as RouterLink } from "react-router-dom"
import { Box, Button, Container, TextField, Typography, Divider, Link as MUILink } from "@mui/material"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"

export default function Signup1Page() {
  return (
    <Box sx={{ minHeight: "100dvh", width: "100%", bgcolor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
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
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Email Field */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1 }}>
                Email
              </Typography>
              <TextField
                fullWidth
                type="email"
                placeholder="Nhập địa chỉ email của bạn"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "#d1d5db",
                    },
                    "&:hover fieldset": {
                      borderColor: "#9ca3af",
                    },
                  },
                }}
              />
            </Box>

            {/* Username Field */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1 }}>
                Tên người dùng
              </Typography>
              <TextField
                fullWidth
                type="text"
                placeholder="Nhập tên người dùng của bạn"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "#d1d5db",
                    },
                    "&:hover fieldset": {
                      borderColor: "#9ca3af",
                    },
                  },
                }}
              />
            </Box>

            {/* Full Name Field */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1 }}>
                Tên đầy đủ
              </Typography>
              <TextField
                fullWidth
                type="text"
                placeholder="Nhập tên đầy đủ của bạn"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "#d1d5db",
                    },
                    "&:hover fieldset": {
                      borderColor: "#9ca3af",
                    },
                  },
                }}
              />
            </Box>

            {/* Password Field */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1 }}>
                Mật khẩu
              </Typography>
              <TextField
                fullWidth
                type="password"
                placeholder="Nhập mật khẩu của bạn"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "#d1d5db",
                    },
                    "&:hover fieldset": {
                      borderColor: "#9ca3af",
                    },
                  },
                }}
              />
            </Box>

            {/* Register Button */}
            <Button
              component={RouterLink}
              to="/email-confirmation"
              variant="contained"
              fullWidth
              sx={{
                bgcolor: "#ef4444",
                color: "white",
                textTransform: "none",
                py: 1.5,
                fontSize: "1rem",
                "&:hover": {
                  bgcolor: "#dc2626",
                },
              }}
            >
              Đăng ký
            </Button>

            {/* Divider */}
            <Divider sx={{ color: "#6b7280" }}>Hoặc</Divider>

            {/* Google Sign In */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                p: 1.5,
                border: "1px solid #d1d5db",
                borderRadius: 1,
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "#f9fafb",
                },
              }}
            >
              <img src="/google-logo.png" alt="Google" style={{ width: "20px", height: "20px" }} />
              <Typography variant="body2" sx={{ color: "#374151", flex: 1 }}>
                Sign in with Google
              </Typography>
              <KeyboardArrowDownIcon sx={{ fontSize: 20, color: "#9ca3af" }} />
            </Box>
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
