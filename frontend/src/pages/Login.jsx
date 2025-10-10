import { Box, Paper, Typography, Button, Divider, Avatar } from "@mui/material"
import { Google, PersonAdd } from "@mui/icons-material"

const mockAccounts = [
  { name: "Sarah Johnson", email: "sarah.johnson@fpt.edu.vn", avatar: "https://placeholder.svg?height=40&width=40&query=person+avatar+1" },
  { name: "Michael Chen", email: "michael.chen@fpt.edu.vn", avatar: "https://placeholder.svg?height=40&width=40&query=person+avatar+2" },
  { name: "David Rodriguez", email: "david.rodriguez@fpt.edu.vn", avatar: "https://placeholder.svg?height=40&width=40&query=person+avatar+3" }
]

export default function LoginPage() {
  return (
    <Box sx={{ minHeight: "100dvh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa" }}>
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 450, p: 5, borderRadius: 3, border: "1px solid #dadce0", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Google sx={{ color: "#4285f4", fontSize: 28 }} />
            </Box>
          </Box>
          <Typography variant="body1" sx={{ fontSize: "16px", color: "#5f6368", mb: 0.5 }}>Google</Typography>
          <Typography variant="h5" sx={{ fontWeight: 400, fontSize: "24px", color: "#202124" }}>Choose an</Typography>
          <Typography variant="h5" sx={{ fontWeight: 400, fontSize: "24px", color: "#202124" }}>
            <Box component="span" sx={{ fontWeight: 500 }}>account</Box>
          </Typography>
          <Typography sx={{ fontSize: "14px", color: "#5f6368", mt: 1.5 }}>
            to continue to <Box component="span" sx={{ fontWeight: 500 }}>myFEvent</Box>
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          {mockAccounts.map((account, index) => (
            <Button key={index} fullWidth sx={{ justifyContent: "flex-start", textTransform: "none", p: 2, mb: 1, border: "1px solid #dadce0", borderRadius: 1, backgroundColor: "#fff", "&:hover": { backgroundColor: "#f8f9fa", border: "1px solid #d2d3d4" } }}>
              <Avatar src={account.avatar} alt={account.name} sx={{ width: 36, height: 36, mr: 2 }} />
              <Box sx={{ textAlign: "left", flex: 1 }}>
                <Typography sx={{ fontSize: "14px", fontWeight: 500, color: "#3c4043" }}>{account.name}</Typography>
                <Typography sx={{ fontSize: "13px", color: "#5f6368" }}>{account.email}</Typography>
              </Box>
            </Button>
          ))}
        </Box>

        <Button fullWidth startIcon={<PersonAdd sx={{ fontSize: 20 }} />} sx={{ justifyContent: "flex-start", textTransform: "none", color: "#1a73e8", fontWeight: 500, fontSize: "14px", py: 2, px: 2, borderRadius: 1, "&:hover": { backgroundColor: "#f8f9fa" } }}>Use another account</Button>

        <Divider sx={{ my: 3 }} />

        <Typography sx={{ fontSize: "12px", color: "#5f6368", textAlign: "center", lineHeight: 1.7 }}>
          To continue, Google will share your name, email address, and profile picture with myFEvent. See myFEvent's {" "}
          <Box component="a" href="#" sx={{ color: "#1a73e8", textDecoration: "none" }}>Privacy Policy</Box> and {" "}
          <Box component="a" href="#" sx={{ color: "#1a73e8", textDecoration: "none" }}>Terms of Service</Box>.
        </Typography>
      </Paper>
    </Box>
  )
}


