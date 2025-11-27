import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../apis/authApi'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8 || password.length > 50) {
      setError('Mật khẩu phải có từ 8 đến 50 ký tự')
      return
    }
    if (!/(?=.*[0-9])(?=.*[!@#$%^&*])/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất 1 số và 1 ký tự đặc biệt')
      return
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({ token, newPassword: password })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-white px-2">
      <img src="/logo-03.png" alt="myFEvent" style={{ height: 96, width: 'auto' }} className="mb-4" />
      <div className="card shadow-sm border-0" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4">
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style={{ width: 32, height: 32, backgroundColor: '#fee2e2', color: '#ef4444' }}>
            <i className="bi bi-shield-lock" />
          </div>
          <div className="fw-semibold mb-2" style={{ color: '#111827' }}>Nhập mật khẩu mới</div>
          <div className="text-secondary mb-3" style={{ fontSize: 12 }}>Hãy nhập mật khẩu mới để thay đổi mật khẩu.</div>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Mật khẩu</label>
              <input 
                type="password" 
                className="form-control" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Nhập mật khẩu mới"
                required 
                disabled={loading} 
              />
              <small className="form-text text-muted" style={{ fontSize: '0.875rem' }}>
                Mật khẩu phải có từ 8-50 ký tự, bao gồm ít nhất 1 số và 1 ký tự đặc biệt 
              </small>
            </div>
            <div className="mb-3">
              <label className="form-label">Nhập lại mật khẩu</label>
              <input 
                type="password" 
                className="form-control" 
                value={confirm} 
                onChange={(e) => setConfirm(e.target.value)} 
                placeholder="Nhập lại mật khẩu để xác nhận"
                required 
                disabled={loading} 
              />
            </div>
            {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light flex-fill" onClick={() => navigate('/login')} disabled={loading}>Hủy</button>
              <button type="submit" className="btn btn-danger flex-fill" disabled={loading}>{loading ? 'Đang xác nhận...' : 'Xác nhận'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}



