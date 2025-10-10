import { Container, Box, TextField, Typography, Grid, Card, CardMedia, CardContent, Chip, IconButton, Link as MUILink } from "@mui/material"
import { Search, Facebook, Instagram, YouTube } from "@mui/icons-material"
import { Link as RouterLink } from "react-router-dom"
import Header from "../components/Header"
import Footer from "../components/Footer"

const events = [
  { id: 1, title: "Halloween 2025", date: "12/12/2025", location: "Hà Nội", image: "https://placeholder.svg?height=200&width=350&query=Halloween+event", description: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit. Exercitation veniam consequat sunt nostrud amet." },
  { id: 2, title: "International Day 2025", date: "15/01/2026", location: "Hà Nội", image: "https://placeholder.svg?height=200&width=350&query=International+Day+event", description: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit. Exercitation veniam consequat sunt nostrud amet." },
  { id: 3, title: "Halloween 2024", date: "31/10/2024", location: "Hà Nội", image: "https://placeholder.svg?height=200&width=350&query=Halloween+2024+event", description: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit. Exercitation veniam consequat sunt nostrud amet." },
  { id: 4, title: "Title Blog", date: "01/01/2025", location: "Hà Nội", image: "https://placeholder.svg?height=200&width=350&query=Blog+event", description: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit." },
  { id: 5, title: "Title Blog", date: "05/02/2025", location: "Hà Nội", image: "https://placeholder.svg?height=200&width=350&query=Blog+event+2", description: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit." },
  { id: 6, title: "Title Blog", date: "10/03/2025", location: "Hà Nội", image: "https://placeholder.svg?height=200&width=350&query=Blog+event+3", description: "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit." }
]

export default function EventsPage() {
  return (
    <>
      <Header />

      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Box sx={{ mb: 4, maxWidth: 700, mx: "auto" }}>
          <TextField fullWidth placeholder="Search sự kiện..." variant="outlined" InputProps={{ startAdornment: <Search sx={{ color: "#999", mr: 1 }} /> }} sx={{ backgroundColor: "#f5f5f5", borderRadius: 1, "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: "transparent" }, "&:hover fieldset": { borderColor: "#e0e0e0" }, "&.Mui-focused fieldset": { borderColor: "#ff5757" } } }} />
        </Box>

        <Box sx={{ border: "2px solid #ff5757", borderRadius: 2, p: 4 }}>
          <Typography variant="h5" sx={{ color: "#ff5757", fontWeight: 700, mb: 4, fontSize: "22px" }}>Tất cả sự kiện</Typography>

          <Grid container spacing={3}>
            {events.map((event) => (
              <Grid item xs={12} md={4} key={event.id}>
                <Card component={RouterLink} to={`/events/${event.id}`} sx={{ textDecoration: "none", height: "100%", cursor: "pointer", borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", transition: "all 0.3s ease", "&:hover": { transform: "translateY(-6px)", boxShadow: "0 8px 16px rgba(0,0,0,0.15)" } }}>
                  <CardMedia component="img" height="200" image={event.image} alt={event.title} sx={{ backgroundColor: "#e0e0e0" }} />
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, fontSize: "18px" }}>{event.title}</Typography>
                    <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                      <Chip label={event.date} size="small" sx={{ backgroundColor: "#f0f0f0", fontSize: "12px", height: "24px", fontWeight: 500 }} />
                      <Chip label={event.location} size="small" sx={{ backgroundColor: "#f0f0f0", fontSize: "12px", height: "24px", fontWeight: 500 }} />
                    </Box>
                    <Typography variant="body2" sx={{ color: "#666", fontSize: "14px", lineHeight: 1.6 }}>{event.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      <Footer />
    </>
  )
}


