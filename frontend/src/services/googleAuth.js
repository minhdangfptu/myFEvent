// Load script 1 lần + prompt để lấy credential, không gọi API ở đây
export function ensureGisLoaded() {
  return new Promise((resolve, reject) => {
    console.log("🔍 ensureGisLoaded: Checking if Google script is loaded...");
    if (window.google?.accounts?.id) {
      console.log("✅ Google script already loaded");
      return resolve();
    }
    
    console.log("🔍 Loading Google script...");
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => {
      console.log("✅ Google script loaded successfully");
      resolve();
    };
    s.onerror = () => {
      console.log("❌ Failed to load Google script");
      reject(new Error("Load GIS failed"));
    };
    document.head.appendChild(s);
  });
}
  
  function getCookie(name){
    return document.cookie.split("; ").find(r => r.startsWith(name+"="))?.split("=")[1];
  }
  
// Trả về Promise<{ credential, g_csrf_token }>
export async function signInWithGoogle() {
  console.log("🔍 signInWithGoogle: Starting...");
  await ensureGisLoaded();

  return new Promise((resolve, reject) => {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      console.log("🔍 Google Client ID:", clientId);
      
      if (!clientId || clientId === 'your-google-client-id-here') {
        reject(new Error("Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in .env file"));
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          console.log("🔍 Google callback triggered:", resp);
          if (!resp?.credential) {
            console.log("❌ No credential from Google");
            return reject(new Error("No credential from Google"));
          }
          console.log("✅ Got credential from Google");
          resolve({
            credential: resp.credential,
            g_csrf_token: getCookie("g_csrf_token") || undefined
          });
        },
        error_callback: (error) => {
          console.log("❌ Google error callback:", error);
          reject(new Error(error.message || "Google authentication failed"));
        }
      });

      console.log("🔍 Showing Google One Tap prompt...");
      // Hiển thị One Tap/Account chooser. Nếu user đóng → reject cho caller xử lý
      window.google.accounts.id.prompt((notif) => {
        console.log("🔍 Google prompt notification:", notif);
        if (notif.isNotDisplayed()) {
          console.log("❌ One Tap not displayed");
          reject(new Error("Google One Tap not displayed. Please check your Google Console settings."));
        } else if (notif.isSkippedMoment()) {
          console.log("❌ One Tap skipped");
          reject(new Error("Google One Tap was skipped"));
        } else if (notif.isDismissedMoment()) {
          console.log("❌ One Tap dismissed");
          reject(new Error("Google One Tap was dismissed"));
        }
      });
    } catch (e) {
      console.log("❌ Error in signInWithGoogle:", e);
      reject(e);
    }
  });
}
  