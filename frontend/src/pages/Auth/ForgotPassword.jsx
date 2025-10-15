import { useState } from 'react'
import { authApi } from '../../apis/authApi'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setMessage('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn!')
    } catch (err) {
      setError(err.response?.data?.message || 'Gửi email thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-white px-2">
      <img src="/logo-03.png" alt="myFEvent" style={{ height: 96, width: 'auto' }} className="mb-4" />
      <div className="card shadow-sm border-0" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4">
          <label className="form-label">Email</label>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              className="form-control mb-3"
              placeholder="Nhập địa chỉ email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <button type="submit" className="btn btn-danger w-100" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi yêu cầu lấy lại mật khẩu'}
            </button>
          </form>
          {message && <div className="alert alert-success mt-3" role="alert">{message}</div>}
          {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
        </div>
      </div>
    </div>
  )
}



