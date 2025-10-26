import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { authApi } from '../../apis/authApi';
import { toast } from "react-toastify";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === '1') {
      setInfo('Tài khoản của bạn đã được xác minh. Hãy đăng nhập.');
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate('/user-landing-page', { replace: true, state: { toast: { type: 'success', message: 'Đăng nhập thành công' } } });
    } catch (error) {
      console.error('Login error:', error);
      if (error?.response?.status === 403) {
        navigate('/email-confirmation', { state: { email } });
        return;
      }
      setError(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      // Luôn redirect đến user-landing-page sau khi đăng nhập Google thành công
      navigate('/user-landing-page', { replace: true });
      // Decode the JWT token to get user info
      const decoded = jwtDecode(credentialResponse.credential);
      
      // Send the credential to backend
      const response = await authApi.googleLogin({
        credential: credentialResponse.credential,
        g_csrf_token: document.cookie.split("; ").find(r => r.startsWith("g_csrf_token="))?.split("=")[1] || undefined
      });
      
      // Persist auth data
      const accessToken = response.accessToken || response.tokens?.accessToken;
      const refreshToken = response.refreshToken || response.tokens?.refreshToken;
      const userData = response.user || null;

      if (accessToken) localStorage.setItem('access_token', accessToken);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
      if (userData) localStorage.setItem('user', JSON.stringify(userData));

      if (userData) {
        window.dispatchEvent(new CustomEvent('auth:login', { detail: { user: userData } }));
      }

      // Navigate based on user role
      if (userData?.role === 'HoOC') {
        navigate('/hooc-landing-page', { replace: true });
      } else {
        navigate('/user-landing-page', { replace: true });
      }
      toast.success('Đăng nhập thành công');
    } catch (err) {
      console.error("Google login error:", err);
      setError(err?.response?.data?.message || err?.message || "Đăng nhập Google thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Đăng nhập Google thất bại. Vui lòng thử lại.");
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div  className="container" style={{ maxWidth: 480 }}>
        <div  className="card shadow-sm border-0">
          <div  className="card-body p-4">
            <div className="d-flex justify-content-center mb-4">
              <img src="/logo-03.png" alt="myFEvent Logo" style={{ width: 200, height: 'auto' }} />
            </div>

            {info && (
              <div className="alert alert-success" role="alert">
                {info}
              </div>
            )}
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
                <div className="mt-2">
                  <a href="/forgot-password" className="text-decoration-none">Quên mật khẩu?</a>
                </div>
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
                  useOneTap={false}
                  width="100%"
                  text="signin_with"
                  shape="rectangular"
                  theme="outline"
                  size="large"
                  logo_alignment="left"
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
