// src/GoogleLoginButton.jsx
import { useEffect, useRef } from "react";

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(r => r.startsWith(name + "="))
    ?.split("=")[1];
}

export default function GoogleLoginButton() {
  const btnRef = useRef(null);

  useEffect(() => {
    if (!window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (resp) => {
        try {
          const r = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              credential: resp.credential,               
              g_csrf_token: getCookie("g_csrf_token"),   
            }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.message || "Login failed");

          
          localStorage.setItem("access_token", data.accessToken);
          localStorage.setItem("refresh_token", data.refreshToken);
          
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "/landingpage"; 
        } catch (e) {
          console.error(e);
          alert("Đăng nhập thất bại");
        }
      },
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      width: 300,
      text: "signup_with", 
    });

  }, []);

  return <div ref={btnRef} />;
}
