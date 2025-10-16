import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Container, TextField, Button, Typography, Divider, Link, Paper, Avatar, Alert, CircularProgress } from "@mui/material"
import GoogleIcon from "@mui/icons-material/Google"
import { authApi } from "../apis/authApi"
import { signInWithGoogle } from "../services/googleAuth"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    console.log('Attempting login with:', { email, password })

    try {
      const response = await authApi.login(email, password)
      console.log('Login response:', response)
      
      if (response.access_token || response.accessToken) {
        const accessToken = response.access_token || response.accessToken
        const refreshToken = response.refresh_token || response.refreshToken
        const user = response.user
        
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        localStorage.setItem('user', JSON.stringify(user))
        
        console.log('Tokens saved:', { accessToken, refreshToken, user })
        
        // Dispatch event để AuthContext cập nhật state
        window.dispatchEvent(new CustomEvent('auth:login', { 
          detail: { user: response.user } 
        }))
        
        console.log('Login successful, redirecting to landing page...')
        navigate('/landingpage')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    console.log("🔍 DEBUG: Google sign in clicked");
    console.log("🔍 VITE_GOOGLE_CLIENT_ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
    console.log("🔍 window.google:", window.google);
    
    setError(""); 
    setGoogleLoading(true);
    
    try {
      console.log("🔍 Calling signInWithGoogle...");
      const { credential, g_csrf_token } = await signInWithGoogle();
      console.log("🔍 Got credential:", credential ? "Present" : "Missing");
      console.log("🔍 Got CSRF token:", g_csrf_token);

      console.log("🔍 Calling authApi.googleLogin...");
      const data = await authApi.googleLogin({ credential, g_csrf_token });
      console.log("🔍 API response:", data);

      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken || "");
      localStorage.setItem("user", JSON.stringify(data.user || {}));
      window.dispatchEvent(new CustomEvent("auth:login", { detail: { user: data.user } }));
      navigate("/landingpage");
    } catch (e) {
      console.error("❌ Google login error:", e);
      setError(e.message || "Google login thất bại");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        padding: 2,
      }}
    >
      <Container 
        maxWidth="sm" 
        sx={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          width: "100%"
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "white",
            borderRadius: 2,
            width: "100%",
            maxWidth: 450,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Logo */}
          <Box
            component="img"
            src="../logo-03.png"
            alt="myFEvent Logo"
            sx={{
              width: 200,
              height: "auto",
              marginBottom: 4,
            }}
          />

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%", maxWidth: 400 }}>
            {error && (
              <Alert severity="error" sx={{ marginBottom: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="Email"
              placeholder="Nhập địa chỉ email của bạn"
              variant="outlined"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ marginBottom: 2 }}
            />

            <TextField
              fullWidth
              label="Mật khẩu"
              placeholder="Nhập mật khẩu của bạn"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ marginBottom: 3 }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                backgroundColor: "#f44336",
                color: "white",
                textTransform: "none",
                fontSize: "16px",
                padding: "12px",
                marginBottom: 3,
                "&:hover": {
                  backgroundColor: "#d32f2f",
                },
                "&:disabled": {
                  backgroundColor: "#ccc",
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Đang đăng nhập...
                </Box>
              ) : (
                "Đăng nhập"
              )}
            </Button>

            {/* Divider with "Hoặc" */}
            <Divider sx={{ marginBottom: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Hoặc
              </Typography>
            </Divider>

            {/* Google Sign In */}
            <Button fullWidth variant="outlined" size="large" disabled={googleLoading}
              startIcon={googleLoading ? <CircularProgress size={20} /> : (
                <Avatar sx={{ width:20, height:20, bgcolor:"transparent" }}>
                  <GoogleIcon sx={{ color:"#4285f4", fontSize:20 }} />
                </Avatar>
              )}
              onClick={handleGoogleSignIn}
              sx={{ textTransform:"none", fontSize:"14px", p:"10px", mb:3, borderColor:"#ddd", color:"#666",
                    "&:hover":{ borderColor:"#999", bgcolor:"#f9f9f9" },
                    "&:disabled":{ borderColor:"#ccc", color:"#999" }}}>
              {googleLoading ? "Đang đăng nhập..." : "Sign in with Google"}
            </Button>

            {/* Register Link */}
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Bạn chưa có tài khoản?{" "}
                <Link
                  href="/signup0"
                  underline="hover"
                  sx={{
                    color: "#1976d2",
                    fontWeight: 500,
                  }}
                >
                  Đăng kí
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
