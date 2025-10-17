import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { authApi } from "../../apis/authApi"

export default function EmailConfirmationPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]) 
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location?.state?.email) {
      setEmail(location.state.email)
    }
  }, [location?.state?.email])

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

  const handleSubmit = async () => {
    const joined = code.join("");
    setError("");
    setMessage("");
    if (joined.length !== 6) {
      setError("Vui lòng nhập đủ 6 số.");
      return;
    }
    try {
      setLoading(true);
      await authApi.verifyEmailCode({ email, code: joined });
      navigate('/register-complete');
    } catch (e) {
      const msg = e.response?.data?.message || "Xác minh thất bại. Hãy thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
              <div className="text-secondary" style={{ fontSize: 14 }}>Chúng tôi đã gửi mã xác nhận cho bạn trong email. Mã có hiệu lực trong 1 phút.</div>
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
                Không nhận được email?{' '}
                <button
                  className="btn btn-link p-0 align-baseline"
                  style={{ color: '#ef4444' }}
                  disabled={loading}
                  onClick={async () => {
                    setError("")
                    setMessage("")
                    try {
                      setLoading(true)
                      await authApi.resendVerification(email)
                      setMessage("Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư của bạn.")
                    } catch (e) {
                      const msg = e.response?.data?.message || "Gửi lại email thất bại. Hãy thử lại."
                      setError(msg)
                    } finally {
                      setLoading(false)
                    }
                  }}
                >Nhấp để gửi lại.</button>
              </div>
            </div>
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}
            <button onClick={handleSubmit} disabled={loading} className="btn btn-danger w-100 py-2">Xác minh</button>
            <div className="mt-2 text-center"><a href="/login">Về trang đăng nhập</a></div>
          </div>
        </div>
      </div>
    </div>
  )
}
