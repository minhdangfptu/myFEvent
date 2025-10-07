import * as React from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  Divider,
  Link,
} from "@mui/material";
import offlineImage from "~/assets/errors/lost_connect.png";

export default function ErrorPageOffline() {
  const handleReload = () => window.location.reload();

  return (
    <Box
      sx={{
        minHeight: "90vh",
        minWidth: "100vw",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 6, md: 8 },
      }}
    >
      <Container disableGutters>
        <Stack
          direction="column"
          alignItems="center"
          textAlign="center"
          spacing={3}
        >
          <Typography
            variant="h0"
            sx={{
              fontSize: { xs: "60px", md: "80px" },
              fontWeight: 800,
              color: "text.primary",
              lineHeight: 1.1,
            }}
          >
            OOPSIE!
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: 20, md: 22 },
              fontWeight: 700,
              color: "text.primary",
            }}
          >
            ERROR - Bạn đang ngoại tuyến!
          </Typography>

          <Box
            sx={{
              mt: 1,
              mb: 2,
              width: "100%",
              maxWidth: 420,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src={offlineImage}
              alt="Offline illustration"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                marginBottom: "12px",
              }}
            />
          </Box>

          {/* Gợi ý */}
          <Divider sx={{ width: 120, my: 1, borderColor: "text.primary" }} />
          <Typography variant="body1" sx={{ color: "text.primary" }}>
            Vui Lòng Chờ Hoặc Làm Mới Lại Trang
          </Typography>

          <Button
            variant="contained"
            color="primary"
            onClick={handleReload}
            sx={{
              mt: 1,
              px: 3,
              py: 1,
              textTransform: "none",
              border: "none",
              fontWeight: 500,
              boxShadow: "none",
              "&:hover": {
                boxShadow: "none",
                transition: "all 0.3s ease-in-out",
              },
              "&:active": {
                transition: "all 0.3s ease-in-out",
                border: "none",
              },
              "&:focus": {
                outline: "none",
                border: "none",
              },
              "&:focus-visible": {
                outline: "none",
                border: "none",
              },
            }}
          >
            Làm mới trang
          </Button>

          <Typography
            variant="body2"
            sx={{ mt: 2, color: "text.secondary", fontSize: 15 }}
          >
            Nếu Sự Cố Vẫn Tiếp Diễn, Vui Lòng Liên Hệ{" "}
            <Link
              href="#"
              underline="hover"
              sx={{
                color: "primary.main",
                fontWeight: 600,
              }}
            >
              Trung Tâm Hỗ Trợ
            </Link>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
