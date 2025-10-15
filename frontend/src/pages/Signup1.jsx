import { useState } from "react"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import { Box, Button, Container, TextField, Typography, Divider, Link as MUILink, Alert, CircularProgress, Snackbar } from "@mui/material"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import { authApi } from "../apis/authApi"

export default function Signup1Page() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    phone: "",
    password: "",
    confirmPassword: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!")
      setLoading(false)
      return
    }

    try {
      // Remove confirmPassword from data sent to API
      const { confirmPassword, ...registerData } = formData
      const response = await authApi.signup(registerData)
      console.log('Signup response:', response)
      
      // Show success toast
      setSuccess(true)
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      console.error('Signup error:', error)
      setError(error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

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
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Email Field */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1 }}>
                Email
              </Typography>
              <TextField
                fullWidth
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Nhập địa chỉ email của bạn"
                variant="outlined"
                required
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

            {/* Phone Field */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1 }}>
                Số điện thoại
              </Typography>
              <TextField
                fullWidth
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Nhập số điện thoại của bạn"
                variant="outlined"
                required
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
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Nhập tên đầy đủ của bạn"
                variant="outlined"
                required
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
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Nhập mật khẩu của bạn"
                variant="outlined"
                required
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

            {/* Confirm Password Field */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1 }}>
                Xác nhận mật khẩu
              </Typography>
              <TextField
                fullWidth
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Nhập lại mật khẩu của bạn"
                variant="outlined"
                required
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
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                bgcolor: "#ef4444",
                color: "white",
                textTransform: "none",
                py: 1.5,
                fontSize: "1rem",
                "&:hover": {
                  bgcolor: "#dc2626",
                },
                "&:disabled": {
                  backgroundColor: "#ccc",
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Đang đăng ký...
                </Box>
              ) : (
                "Đăng ký"
              )}
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

      {/* Success Toast */}
      <Snackbar
        open={success}
        autoHideDuration={2000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccess(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Đăng ký thành công! Đang chuyển về trang đăng nhập...
        </Alert>
      </Snackbar>
    </Box>
  )
}
