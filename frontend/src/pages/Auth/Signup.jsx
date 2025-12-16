import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { authApi } from '../../apis/authApi';
import authStorage from '../../utils/authStorage';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // FE password validation
  const validatePassword = (password) => {
    const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{8,50}$/;
    return regex.test(password);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === "password") {
      if (!validatePassword(value)) {
        setPasswordError("Mật khẩu phải 8–50 ký tự, chứa ít nhất 1 số và 1 ký tự đặc biệt.");
      } else {
        setPasswordError("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      setLoading(false);
      return;
    }

    // Password rule validation
    if (!validatePassword(formData.password)) {
      setError("Mật khẩu phải từ 8–50 ký tự, chứa ít nhất 1 số và 1 ký tự đặc biệt!");
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      await signup(registerData);

      setSuccess(true);

      navigate('/email-confirmation', { 
        state: { email: registerData.email } 
      });
    } catch (error) {
      console.error('Signup error:', error);
      const msg = error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const decoded = jwtDecode(credentialResponse.credential);

      const response = await authApi.googleLogin({
        credential: credentialResponse.credential,
        g_csrf_token: document.cookie.split("; ").find(r => r.startsWith("g_csrf_token="))?.split("=")[1] || undefined
      });

      const accessToken = response.accessToken || response.tokens?.accessToken;
      const refreshToken = response.refreshToken || response.tokens?.refreshToken;
      const userData = response.user || null;

      if (accessToken) authStorage.setAccessToken(accessToken);
      if (refreshToken) authStorage.setRefreshToken(refreshToken);
      if (userData) authStorage.setUser(userData);

      if (userData) {
        window.dispatchEvent(new CustomEvent('auth:login', { detail: { user: userData } }));
      }

      navigate('/home-page', { replace: true });
    } catch (error) {
      console.error('Google signup error:', error);
      setError(error.response?.data?.message || error?.message || 'Đăng ký Google thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Đăng ký Google thất bại. Vui lòng thử lại.');
  };

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="d-flex justify-content-center mb-4">
          <img src="/logo-03.png" alt="myFEvent Logo" style={{ height: 96 }} />
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <h5 className="text-center fw-semibold mb-3" style={{ color: '#111827' }}>Đăng ký tài khoản</h5>

            {error && (
              <div className="alert alert-danger" role="alert">{error}</div>
            )}
            {success && (
              <div className="alert alert-success" role="alert">Đăng ký thành công! Đang chuyển trang...</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Nhập email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Tên đầy đủ</label>
                <input
                  className="form-control"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Nhập tên đầy đủ"
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Mật khẩu</label>
                <div className="position-relative">
                  <input
                    className="form-control"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Nhập mật khẩu"
                    required
                    disabled={loading}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    className="btn position-absolute top-50 translate-middle-y border-0 bg-transparent"
                    style={{ right: '8px', zIndex: 10 }}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ color: '#6b7280' }}></i>
                  </button>
                </div>
                {passwordError && (
                  <small className="text-danger">{passwordError}</small>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Xác nhận mật khẩu</label>
                <div className="position-relative">
                  <input
                    className="form-control"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Nhập lại mật khẩu"
                    required
                    disabled={loading}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    className="btn position-absolute top-50 translate-middle-y border-0 bg-transparent"
                    style={{ right: '8px', zIndex: 10 }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ color: '#6b7280' }}></i>
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-danger w-100 mb-3" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Đang đăng ký...
                  </>
                ) : (
                  'Đăng ký'
                )}
              </button>

              <div className="text-center text-secondary mb-3">Hoặc</div>

              <div className="d-flex justify-content-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signup_with"
                />
              </div>
            </form>
          </div>
        </div>

        <div className="text-center mt-3">
          <span className="text-secondary">Bạn đã có tài khoản? </span>
          <a href="/login" className="text-dark fw-medium">Đăng nhập</a>
        </div>
      </div>
    </div>
  );
}
