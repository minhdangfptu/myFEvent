// components/AxiosInterceptor.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../apis/axiosClient";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

const AxiosInterceptor = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const resInterceptor = axiosClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error.config;

        // Kiểm tra lỗi mạng (Network Error)
        if (error.message === "Network Error" && !error.response) {
          // Trigger sự kiện để App.js hiện popup offline
          window.dispatchEvent(new Event("network:offline"));
          return Promise.reject(error);
        }

        if (error.response) {
          switch (error.response.status) {
            case 401:
              toast.error("Phiên đăng nhập hết hạn.");
              await logout();
              navigate("/login");
              break;
            case 403:
              if (error.config?.skipGlobal403) {
                // Cho phép component tự xử lý toast/message
                return Promise.reject(error);
              }
              // Log để debug
              console.log('403 Error:', error.config.url, error.response.data);
              // Không redirect nếu đang ở các trang user để tránh loop
              const currentPath = window.location.pathname;
              if (!currentPath.includes('/user/')) {
                toast.error(error.response?.data?.message || "Bạn không có quyền truy cập.");
                navigate("/unauthorized");
              } else {
                console.warn('403 error on user page, not redirecting to avoid loop');
              }
              break;
            case 404:
              // Don't redirect to 404 page for auth endpoints or join event endpoint (let component handle it)
              const isAuthEndpoint = error.config?.url?.includes('/auth/');
              const isJoinEventEndpoint = error.config?.url?.includes('/events/join');
              const skip404Redirect = error.config?.skipGlobal404;
              if (!isAuthEndpoint && !isJoinEventEndpoint && !skip404Redirect) {
                navigate("/404");
              }
              break;
            case 502:
              navigate("/502");
              break;
            case 503:
              navigate("/503");
              break;
            case 504:
              navigate("/504");
              break;
            case 500:
              navigate("/500");
              break;
            default:
              // Các lỗi 500 khác
              if (error.response.status > 500) {
                toast.error("Lỗi máy chủ. Vui lòng thử lại sau.");
              }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosClient.interceptors.response.eject(resInterceptor);
    };
  }, [navigate, logout]);

  return children;
};

export default AxiosInterceptor;
