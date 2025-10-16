import * as React from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  Link as MUILink,
  useTheme,
  Avatar,
} from "@mui/material";
import KeyboardReturnOutlinedIcon from "@mui/icons-material/KeyboardReturnOutlined";
import { useNavigate } from "react-router-dom";
import error502 from "/logo-03.png";
import FacebookIcon from "@mui/icons-material/Facebook";
import CircleIcon from "@mui/icons-material/Circle";
import TwitterIcon from "@mui/icons-material/Twitter";
import EmailIcon from "@mui/icons-material/Email";
import YouTubeIcon from "@mui/icons-material/YouTube";
import InstagramIcon from "@mui/icons-material/Instagram";
export default function ErrorPage503() {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        paddingTop: 0,
        paddingBottom: 40,
        minHeight: "100vh",
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
          {/* Logo */}
          {/* Image */}
          <Box
            sx={{
              pt: 0,
              mt: 0,
              mb: 2,
              width: "80%",
              maxWidth: 420,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src={error502}
              alt="502 illustration"
              style={{
                width: "80%",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </Box>

          {/* Error code */}
          <Typography
            variant="h0"
            sx={{
              fontSize: { xs: "90px", md: "96px" },
              fontWeight: 800,
              lineHeight: 1,
              color: "text.primary",
            }}
          >
            503
          </Typography>

          {/* Error type */}
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              fontSize: { xs: 22, md: 20 },
              color: "text.primary",
            }}
          >
            ERROR - Service Unavailable
          </Typography>

          {/* Message */}
          <Typography
            variant="body1"
            sx={{
              maxWidth: 600,
              color: "text.secondary",
              fontSize: 16,
              lineHeight: 1.6,
            }}
          >
            Xin Lỗi Vì Sự Bất Tiện Này. <br />
            Đội Ngũ Của Chúng Tôi Đang Nỗ Lực Giải Quyết Vấn Đề Nhanh Nhất Có
            Thể. <br />
            Xin Chân Thành Cảm Ơn Vì Đã Tin Tưởng MyFEvent.
          </Typography>

          {/* Info block */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              <strong>URL:</strong> https://xx
              <br />
              <strong>Error ID:</strong> 033001233211
              <br />
              <strong>Date:</strong> 2024/12/21 21:30:04
            </Typography>
          </Box>

          {/* Button back */}
          <Button
            component={MUILink}
            onClick={() => navigate(-1)}
            startIcon={<KeyboardReturnOutlinedIcon />}
            sx={{
              mt: 3,
              fontWeight: 700,
              fontSize: 16,
              color: "text.primary",
              textTransform: "none",
              textDecoration: "none",
              "&:hover": {
                bgcolor: "transparent",
                textDecoration: "underline",
                textDecorationThickness: "2px",
                transition: "all 0.3s ease-in-out",
              },
            }}
          >
            Về Trang Trước
          </Button>

          {/* Contact */}
          <Typography variant="body2" sx={{ mt: 3, color: "text.secondary" }}>
            Gửi <MUILink href="mailto:support@myfevent.com">email</MUILink> hoặc kết
            nối qua Mạng Xã Hội với chúng tôi.
          </Typography>

          {/* Social icons */}
          <Stack
            direction="row"
            spacing={3}
            sx={{
              mt: 1,
            }}
          >
            <MUILink href="#">
              {/* <img src="/icons/instagram.svg" alt="Instagram" width="24" /> */}
            </MUILink>

            <MUILink href="#">
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: 36,
                  height: 36,
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.primary.light,
                    transition: "all 0.3s ease-in-out",
                  },
                }}
              >
                <EmailIcon sx={{ color: "constrastText", fontSize: 20 }} />
              </Avatar>
            </MUILink>
            <MUILink href="#">
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: 36,
                  height: 36,
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.primary.light,
                    transition: "all 0.3s ease-in-out",
                  },
                }}
              >
                <FacebookIcon sx={{ color: "constrastText", fontSize: 20 }} />
              </Avatar>
            </MUILink>
            <MUILink href="#">
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: 36,
                  height: 36,
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.primary.light,
                    transition: "all 0.3s ease-in-out",
                  },
                }}
              >
                <InstagramIcon sx={{ color: "constrastText", fontSize: 20 }} />
              </Avatar>
            </MUILink>
            <MUILink href="#">
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: 36,
                  height: 36,
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.primary.light,
                    transition: "all 0.3s ease-in-out",
                  },
                }}
              >
                <TwitterIcon sx={{ color: "constrastText", fontSize: 20 }} />
              </Avatar>
            </MUILink>
            <MUILink href="#">
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: 36,
                  height: 36,
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.primary.light,
                    transition: "all 0.3s ease-in-out",
                  },
                }}
              >
                <YouTubeIcon sx={{ color: "constrastText", fontSize: 20 }} />
              </Avatar>
            </MUILink>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
