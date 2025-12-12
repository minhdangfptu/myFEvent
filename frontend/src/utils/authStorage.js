import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'myfe_access';
const REFRESH_TOKEN_KEY = 'myfe_refresh';
const USER_KEY = 'myfe_user';

const isBrowser = typeof window !== 'undefined';

const getStorage = () => {
  if (!isBrowser) return null;
  try {
    // Prefer localStorage so all tabs in the profile share the same session.
    return window.localStorage;
  } catch {
    return null;
  }
};

const defaultCookieOptions = () => ({
  path: '/',
  sameSite: 'Lax',
  secure: isBrowser ? window.location.protocol === 'https:' : false,
  expires: 7,
});

const authStorage = {
  getAccessToken: () => {
    if (!isBrowser) return null;
    return Cookies.get(ACCESS_TOKEN_KEY) || null;
  },
  setAccessToken: (token, options = {}) => {
    if (!isBrowser) return;
    if (!token) {
      Cookies.remove(ACCESS_TOKEN_KEY, { path: '/' });
      return;
    }
    Cookies.set(ACCESS_TOKEN_KEY, token, { ...defaultCookieOptions(), ...options });
  },
  getRefreshToken: () => {
    if (!isBrowser) return null;
    return Cookies.get(REFRESH_TOKEN_KEY) || null;
  },
  setRefreshToken: (token, options = {}) => {
    if (!isBrowser) return;
    if (!token) {
      Cookies.remove(REFRESH_TOKEN_KEY, { path: '/' });
      return;
    }
    Cookies.set(REFRESH_TOKEN_KEY, token, { ...defaultCookieOptions(), expires: 30, ...options });
  },
  getUser: () => {
    const storage = getStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Error parsing user session data:', error);
      storage.removeItem(USER_KEY);
      return null;
    }
  },
  setUser: (user) => {
    const storage = getStorage();
    if (!storage) return;
    if (!user) {
      storage.removeItem(USER_KEY);
      return;
    }
    storage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearAll: () => {
    if (isBrowser) {
      Cookies.remove(ACCESS_TOKEN_KEY, { path: '/' });
      Cookies.remove(REFRESH_TOKEN_KEY, { path: '/' });
    }
    const storage = getStorage();
    if (storage) {
      storage.removeItem(USER_KEY);
    }
  },
  hasSession: () => {
    if (!isBrowser) return false;
    return !!Cookies.get(ACCESS_TOKEN_KEY);
  },
};

export default authStorage;
