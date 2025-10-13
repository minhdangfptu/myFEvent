import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      await loginWithGoogle(credentialResponse.credential);
      navigate('/');
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.response?.data?.message || 'Đăng nhập Google thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="d-flex justify-content-center mb-4">
              <img src="/logo-03.png" alt="myFEvent Logo" style={{ width: 200, height: 'auto' }} />
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="Nhập địa chỉ email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label">Mật khẩu</label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button type="submit" className="btn btn-danger w-100 mb-3" disabled={loading}>
                {loading ? (
                  <span className="d-inline-flex align-items-center gap-2">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Đang đăng nhập...
                  </span>
                ) : (
                  'Đăng nhập'
                )}
              </button>

              <div className="text-center text-secondary mb-3">Hoặc</div>

              <div className="d-flex justify-content-center mb-3">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="100%"
                />
              </div>

              <div className="text-center">
                <span className="text-secondary">Bạn chưa có tài khoản? </span>
                <a href="/signup" className="fw-medium">Đăng ký</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

