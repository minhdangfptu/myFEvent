export function ensureGisLoaded() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      return resolve();
    }
    
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => {
      resolve();
    };
    s.onerror = () => {
      reject(new Error("Load GIS failed"));
    };
    document.head.appendChild(s);
  });
}
  
  function getCookie(name){
    return document.cookie.split("; ").find(r => r.startsWith(name+"="))?.split("=")[1];
  }
  
export async function signInWithGoogle() {
  await ensureGisLoaded();

  return new Promise((resolve, reject) => {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId || clientId === 'your-google-client-id-here') {
        reject(new Error("Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in .env file"));
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          if (!resp?.credential) {
            return reject(new Error("No credential from Google"));
          }
          resolve({
            credential: resp.credential,
            g_csrf_token: getCookie("g_csrf_token") || undefined
          });
        },
        error_callback: (error) => {
          reject(new Error(error.message || "Google authentication failed"));
        }
      });


      window.google.accounts.id.prompt((notif) => {

        if (notif.isNotDisplayed()) {
          reject(new Error("Google One Tap not displayed. Please check your Google Console settings."));
        } else if (notif.isSkippedMoment()) {
          reject(new Error("Google One Tap was skipped"));
        } else if (notif.isDismissedMoment()) {
          reject(new Error("Google One Tap was dismissed"));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}
  