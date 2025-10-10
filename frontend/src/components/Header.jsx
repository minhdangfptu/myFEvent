import { AppBar, Toolbar, Container, Box, Button, Link as MUILink } from "@mui/material"
import { Link as RouterLink } from "react-router-dom"

export default function Header() {
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
          <Box sx={{ display: "flex", gap: 1.5, position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
            <Button component={RouterLink} to="/login" variant="text" sx={{ display: { xs: "none", sm: "inline-flex" }, color: "#374151" }}>Đăng nhập</Button>
            <Button component={RouterLink} to="/signup0" variant="contained" sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}>Đăng ký</Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}


