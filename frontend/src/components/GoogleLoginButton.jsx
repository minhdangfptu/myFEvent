// src/components/GoogleLoginButton.jsx
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import ConfirmModal from "./ConfirmModal";

export default function GoogleLoginButton() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, message: "", onConfirm: null });

  const onClick = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      window.location.href = "/home-page";
    } catch (e) {
      console.error(e);
      setModal({
        show: true,
        message: e?.message || "Đăng nhập thất bại",
        onConfirm: () => setModal({ show: false, message: "", onConfirm: null })
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn-outline-dark" onClick={onClick} disabled={loading}>
        {loading ? "Đang xử lý Google..." : "Đăng nhập bằng Google"}
      </button>
      <ConfirmModal
        show={modal.show}
        message={modal.message}
        onClose={() => setModal({ show: false, message: "", onConfirm: null })}
        onConfirm={() => {
          if (modal.onConfirm) modal.onConfirm();
        }}
      />
    </>
  );
}
