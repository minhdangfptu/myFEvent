import { useState } from "react"
import { Box, Button, Container, Typography } from "@mui/material"

export default function EmailConfirmationPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""])

  const handleCodeChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code]
      newCode[index] = value
      setCode(newCode)

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      prevInput?.focus()
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Title */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827", mb: 1 }}>
                Nhập mã xác nhận
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7280" }}>
                Chúng tôi đã gửi mã xác nhận cho bạn trong email. Hãy nhập để tiếp tục.
              </Typography>
            </Box>

            {/* Code Input */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1.5 }}>
                Mã xác nhận
              </Typography>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between" }}>
                {code.map((digit, index) => (
                  <Box
                    key={index}
                    component="input"
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    sx={{
                      width: 48,
                      height: 56,
                      textAlign: "center",
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      border: "1px solid #d1d5db",
                      borderRadius: 1,
                      outline: "none",
                      "&:focus": {
                        borderColor: "#ef4444",
                        borderWidth: 2,
                      },
                    }}
                  />
                ))}
              </Box>
              <Typography variant="body2" sx={{ color: "#6b7280", mt: 1.5 }}>
                Không nhận được mã?{" "}
                <Box
                  component="button"
                  sx={{
                    color: "#ef4444",
                    fontWeight: 500,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                    p: 0,
                  }}
                >
                  Nhấp để gửi lại.
                </Box>
              </Typography>
            </Box>

            {/* Continue Button */}
            <Button
              type="submit"
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
              Tiếp tục
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
