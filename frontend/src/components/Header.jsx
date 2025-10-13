import { AppBar, Toolbar, Container, Box, Button, Link as MUILink, Menu, MenuItem, Avatar, IconButton, Typography } from "@mui/material"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { AccountCircle, ExitToApp, Person } from "@mui/icons-material"

export default function Header() {
  const { user, isAuthenticated, logout, logoutAllDevices } = useAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    if (logoutLoading) return // Tránh double-click
    
    setLogoutLoading(true)
    try {
      await logout()
      handleMenuClose()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Vẫn đóng menu và redirect dù có lỗi
      handleMenuClose()
      navigate('/login')
    } finally {
      setLogoutLoading(false)
    }
  }
  const handleLogoutAllDevices = async () => {
    if (logoutLoading) return 
    
    setLogoutLoading(true)
    try {
      await logoutAllDevices()
      handleMenuClose()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Vẫn đóng menu và redirect dù có lỗi
      handleMenuClose()
      navigate('/login')
    } finally {
      setLogoutLoading(false)
    }
  }

  const handleProfile = () => {
    handleMenuClose()
    // Navigate to profile page or show profile modal
    console.log('Navigate to profile')
  }

  return (
    <AppBar position="static" sx={{ backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <Container maxWidth="xl" sx={{ px: 2 }}>
        <Toolbar sx={{ minHeight: 64, display: "flex", justifyContent: "center", gap: 2, position: 'relative' }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: '100px', minWidth: 0 }}>
            <MUILink component={RouterLink} to="/landingpage" underline="none" sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "inherit" }}>
              <Box component="img" src="/logo-03.png" alt="myFEvent" sx={{ height: 32, width: 'auto' }} />
              <Box component="span" sx={{ fontWeight: 600, color: "#111827", fontSize: '20px' }}>FPT Event</Box>
            </MUILink>
            <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: '35px' }}>
              { ["/landingpage","/events","/about","/contact"].map((path,i)=> (
                <MUILink
                  key={path}
                  component={RouterLink}
                  to={path}
                  underline="none"
                  sx={{ color: "#4b5563", fontSize: 14, "&:hover": { color: "#111827" } }}
                >
                  { ["Trang chủ","Sự kiện tới","Về chúng tôi","Liên hệ"][i] }
                </MUILink>
              )) }
            </Box>
          </Box>
          
          {/* Auth Section */}
          <Box sx={{ display: "flex", gap: 1.5, position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
            {isAuthenticated ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ color: "#374151", display: { xs: "none", sm: "block" } }}>
                    Xin chào, {user?.fullName || user?.email || 'User'}
                  </Typography>
                  <IconButton
                    onClick={handleMenuOpen}
                    sx={{ 
                      p: 0,
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)"
                      }
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: "#ef4444",
                        fontSize: "14px",
                        fontWeight: 600
                      }}
                    >
                      {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Box>
                
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  sx={{
                    '& .MuiPaper-root': {
                      mt: 1,
                      minWidth: 200,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      borderRadius: 2,
                    }
                  }}
                >
                  <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
                    <Person sx={{ mr: 1.5, fontSize: 20, color: "#6b7280" }} />
                    <Typography variant="body2">Thông tin cá nhân</Typography>
                  </MenuItem>
                  <MenuItem 
                    onClick={handleLogout} 
                    disabled={logoutLoading}
                    sx={{ 
                      py: 1.5, 
                      color: logoutLoading ? "#9ca3af" : "#ef4444",
                      "&:disabled": {
                        color: "#9ca3af"
                      }
                    }}
                  >
                    <ExitToApp sx={{ mr: 1.5, fontSize: 20, color: logoutLoading ? "#9ca3af" : "#ef4444" }} />
                    <Typography variant="body2">
                      {logoutLoading ? "Đang đăng xuất..." : "Đăng xuất"}
                    </Typography>
                  </MenuItem>
                  <MenuItem 
                    onClick={handleLogoutAllDevices} 
                    disabled={logoutLoading}
                    sx={{ 
                      py: 1.5, 
                      color: logoutLoading ? "#9ca3af" : "#ef4444",
                      "&:disabled": {
                        color: "#9ca3af"
                      }
                    }}
                  >
                    <ExitToApp sx={{ mr: 1.5, fontSize: 20, color: logoutLoading ? "#9ca3af" : "#ef4444" }} />
                    <Typography variant="body2">
                      {logoutLoading ? "Đang đăng xuất..." : "Đăng xuất tất cả các thiết bị"}
                    </Typography>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button component={RouterLink} to="/login" variant="text" sx={{ display: { xs: "none", sm: "inline-flex" }, color: "#374151" }}>Đăng nhập</Button>
                <Button component={RouterLink} to="/signup0" variant="contained" sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}>Đăng ký</Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}


