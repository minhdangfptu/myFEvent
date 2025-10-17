import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { GoogleLogin } from '@react-oauth/google';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      await signup(registerData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
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
      console.error('Google signup error:', error);
      setError(error.response?.data?.message || 'Đăng ký Google thất bại.');
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
              <div className="alert alert-success" role="alert">Đăng ký thành công! Đang chuyển về trang đăng nhập...</div>
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
                  placeholder="Nhập địa chỉ email của bạn"
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
                  placeholder="Nhập tên đầy đủ của bạn"
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Số điện thoại</label>
                <input
                  className="form-control"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Nhập số điện thoại của bạn"
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Mật khẩu</label>
                <input
                  className="form-control"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Nhập mật khẩu của bạn"
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Xác nhận mật khẩu</label>
                <input
                  className="form-control"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Nhập lại mật khẩu của bạn"
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-danger w-100 mb-3" disabled={loading}>
                {loading ? (
                  <span className="d-inline-flex align-items-center gap-2">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Đang đăng ký...
                  </span>
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
                  shape="rectangular"
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


