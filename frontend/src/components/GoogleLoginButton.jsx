// src/components/GoogleLoginButton.jsx
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function GoogleLoginButton() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      window.location.href = "/user-landing-page";
    } catch (e) {
      console.error(e);
      alert(e?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className="btn btn-outline-dark" onClick={onClick} disabled={loading}>
      {loading ? "Đang xử lý Google..." : "Đăng nhập bằng Google"}
    </button>
  );
}
