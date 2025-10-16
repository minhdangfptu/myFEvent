// Debug script để kiểm tra Google OAuth
console.log("=== GOOGLE OAUTH DEBUG ===");

// 1. Kiểm tra environment variables
console.log("VITE_GOOGLE_CLIENT_ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
console.log("VITE_BACKEND_URL:", import.meta.env.VITE_BACKEND_URL);

// 2. Kiểm tra Google script
console.log("window.google:", window.google);
console.log("window.google?.accounts:", window.google?.accounts);
console.log("window.google?.accounts?.id:", window.google?.accounts?.id);

// 3. Kiểm tra cookies
console.log("g_csrf_token:", document.cookie.split("; ").find(r => r.startsWith("g_csrf_token="))?.split("=")[1]);

// 4. Test Google initialization
if (window.google?.accounts?.id) {
  try {
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (resp) => {
        console.log("✅ Google callback triggered!");
        console.log("Credential:", resp.credential ? "Present" : "Missing");
      },
      error_callback: (error) => {
        console.log("❌ Google error:", error);
      }
    });
    console.log("✅ Google initialized successfully");
  } catch (e) {
    console.log("❌ Google initialization failed:", e);
  }
} else {
  console.log("❌ Google Identity Services not loaded");
}
