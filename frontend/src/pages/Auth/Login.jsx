import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { authApi } from "../../apis/authApi";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, user, isAuthenticated, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("verified") === "1") {
      setInfo("Tài khoản của bạn đã được xác minh. Hãy đăng nhập.");
    }
  }, [location.search]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const from = location.state?.from?.pathname || "/home-page";
      if (user?.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, authLoading, navigate, location.state, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      if (user?.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/home-page", { replace: true, state: { loginSuccess: true } });
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorCode = error?.response?.data?.code;
      if (error?.response?.status === 403 && errorCode === "ACCOUNT_PENDING") {
        navigate("/email-confirmation", { state: { email } });
        return;
      }
      setError(
        error?.response?.data?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      // Decode the JWT token to get user info
      const decoded = jwtDecode(credentialResponse.credential);

      // Send the credential to backend
      const response = await authApi.googleLogin({
        credential: credentialResponse.credential,
        g_csrf_token:
          document.cookie
            .split("; ")
            .find((r) => r.startsWith("g_csrf_token="))
            ?.split("=")[1] || undefined,
      });

      // Persist auth data
      const accessToken = response.accessToken || response.tokens?.accessToken;
      const refreshToken =
        response.refreshToken || response.tokens?.refreshToken;
      const userData = response.user || null;

      if (accessToken) localStorage.setItem("access_token", accessToken);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
      if (userData) localStorage.setItem("user", JSON.stringify(userData));

      if (userData) {
        window.dispatchEvent(
          new CustomEvent("auth:login", { detail: { user: userData } })
        );
      }

      // Navigate based on user role
      // if (userData?.role === 'HoOC') {
      //   navigate('/hooc-landing-page', { replace: true });
      // } else {
      //   navigate('/user-landing-page', { replace: true });
      // }
      navigate("/home-page", { replace: true, state: { loginSuccess: true } });
    } catch (err) {
      console.error("Google login error:", err);
      const errorCode = err?.response?.data?.code;
      if (err?.response?.status === 403 && errorCode === "ACCOUNT_PENDING") {
        navigate("/email-confirmation", { state: { email } });
        return;
      }
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Đăng nhập Google thất bại."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Đăng nhập Google thất bại. Vui lòng thử lại.");
  };

  return (
    <div className="login-page d-flex align-items-center justify-content-center">
      <style>{`
        /* page */
        .login-page { min-height: 100vh; background-color: #f5f5f5; }

        /* inputs: high specificity + !important to beat bootstrap/autofill */
        .login-page .card .form-control.login-input,
        .login-page input.form-control.login-input,
        .login-page textarea.form-control.login-input {
          background-color: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #d1d5db !important;
          box-shadow: none !important;
          background-clip: padding-box !important;
          transition: background-color 0s !important; /* prevent autofill animation */
        }
        .login-page .card .form-control.login-input::placeholder,
        .login-page input.form-control.login-input::placeholder {
          color: #9ca3af !important;
          opacity: 1 !important;
        }

        .login-page input.form-control.login-input:disabled {
          background-color: #ffffff !important;
          color: #6b7280 !important;
          opacity: 1 !important;
        }

        /* Chrome / Edge autofill override */
        .login-page input.form-control.login-input:-webkit-autofill,
        .login-page input.form-control.login-input:-webkit-autofill:hover,
        .login-page input.form-control.login-input:-webkit-autofill:focus,
        .login-page input.form-control.login-input:-webkit-autofill:active {
          -webkit-text-fill-color: #111827 !important;
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
                  box-shadow: 0 0 0px 1000px #ffffff inset !important;
          background-clip: padding-box !important;
        }
      `}</style>
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="d-flex justify-content-center mb-4">
              <img
                src="/logo-03.png"
                alt="myFEvent Logo"
                style={{ width: 200, height: "auto" }}
              />
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
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-control login-input"
                  autoComplete="email"
                  placeholder="Nhập địa chỉ email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label">
                  Mật khẩu
                </label>
                <div className="position-relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="form-control login-input"
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
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
                <div className="mt-2">
                  <a href="/forgot-password" className="text-decoration-none">
                    Quên mật khẩu?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-danger w-100 mb-3"
                disabled={loading}
              >
                {loading ? (
                  <span className="d-inline-flex align-items-center gap-2">
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Đang đăng nhập...
                  </span>
                ) : (
                  "Đăng nhập"
                )}
              </button>

              <div className="text-center text-secondary mb-3">Hoặc</div>

              <div className="d-flex justify-content-center mb-3">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  width={350}
                  text="signin_with"
                  shape="rectangular"
                  theme="outline"
                  size="large"
                  logo_alignment="left"
                />
              </div>

              <div className="text-center">
                <span className="text-secondary">Bạn chưa có tài khoản? </span>
                <a href="/signup" className="fw-medium">
                  Đăng ký
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
