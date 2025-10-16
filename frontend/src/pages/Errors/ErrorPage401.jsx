// src/pages/ErrorPage401.jsx
import * as React from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Link as MUILink,
  useTheme,
  Stack,
} from "@mui/material";
import KeyboardReturnOutlinedIcon from "@mui/icons-material/KeyboardReturnOutlined";
import error401 from "~/assets/errors/401_new.png";
import { useNavigate } from "react-router-dom";

export default function ErrorPage401() {
  const theme = useTheme();
  const navigate = useNavigate();
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
            variant="h1"
            sx={{
              fontSize: { xs: "100px", md: "96px" },
              lineHeight: 1.05,
              fontWeight: 800,
            }}
          >
            401
          </Typography>

          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: 24, md: 22 },
              fontWeight: 700,
              color: "text.primary",
            }}
          >
            ERROR - Unauthorized Page
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
              src={error401}
              alt="404 illustration"
              style={{
                width: "130%",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </Box>

          <Button
            component={MUILink}
            onClick={() => navigate(-1)}
            color="primary.main"
            variant="text"
            startIcon={<KeyboardReturnOutlinedIcon />}
             sx={{
              fontWeight: 700,
              fontSize: (theme) => theme.typography.h3.fontSize,
              color: 'text.primary',
              textUnderlineOffset: "6px",
              textTransform:"none",
              textDecoration:"none",
              "&:hover": {
                bgcolor: "transparent",
                textDecoration: "underline",
                fontWeight: 800,
                textDecorationThickness: "3px",
                color: 'text.primary',
                backgroundColor: "transparent",
                transition: "all 0.3s ease-in-out",
              },
            }}
          >
            Về Trang trước
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
