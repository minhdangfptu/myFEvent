import { useState } from "react"
import { Link as RouterLink } from "react-router-dom"

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
    <div className="d-flex align-items-center justify-content-center px-2" style={{ minHeight: '100dvh', backgroundColor: '#f9fafb' }}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="d-flex justify-content-center mb-4">
          <img src="/logo-03.png" alt="myFEvent Logo" style={{ height: 96 }} />
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="mb-3">
              <div className="fw-semibold mb-1" style={{ color: '#111827' }}>Nhập mã xác nhận</div>
              <div className="text-secondary" style={{ fontSize: 14 }}>Chúng tôi đã gửi mã xác nhận cho bạn trong email. Hãy nhập để tiếp tục.</div>
            </div>
            <div className="mb-3">
              <div className="fw-medium mb-2" style={{ fontSize: 14, color: '#111827' }}>Mã xác nhận</div>
              <div className="d-flex gap-2 justify-content-between">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="form-control text-center fw-semibold"
                    style={{ width: 48, height: 56, fontSize: '1.5rem' }}
                  />
                ))}
              </div>
              <div className="text-secondary mt-2" style={{ fontSize: 14 }}>
                Không nhận được mã? <button className="btn btn-link p-0 align-baseline" style={{ color: '#ef4444' }}>Nhấp để gửi lại.</button>
              </div>
            </div>

            <button className="btn btn-danger w-100 py-2">Tiếp tục</button>
          </div>
        </div>
      </div>
    </div>
  )
}
