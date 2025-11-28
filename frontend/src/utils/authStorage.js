import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'myfe_access';
const REFRESH_TOKEN_KEY = 'myfe_refresh';
const USER_KEY = 'myfe_user';
const TAB_ID_KEY = 'myfe_tab_id';

const isBrowser = typeof window !== 'undefined';

const getSessionStorage = () => {
  if (!isBrowser) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const ensureTabId = () => {
  const storage = getSessionStorage();
  if (!storage) return 'default';

  const existing = storage.getItem(TAB_ID_KEY);
  if (existing) return existing;

  const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  storage.setItem(TAB_ID_KEY, newId);
  return newId;
};

const scopedKey = (base) => `${base}_${ensureTabId()}`;

const defaultCookieOptions = () => ({
  path: '/',
  sameSite: 'Lax',
  secure: isBrowser ? window.location.protocol === 'https:' : false,
  expires: 7,
});

const authStorage = {
  getAccessToken: () => {
    if (!isBrowser) return null;
    return Cookies.get(scopedKey(ACCESS_TOKEN_KEY)) || null;
  },
  setAccessToken: (token, options = {}) => {
    if (!isBrowser) return;
    const key = scopedKey(ACCESS_TOKEN_KEY);
    if (!token) {
      Cookies.remove(key, { path: '/' });
      return;
    }
    Cookies.set(key, token, { ...defaultCookieOptions(), ...options });
  },
  getRefreshToken: () => {
    if (!isBrowser) return null;
    return Cookies.get(scopedKey(REFRESH_TOKEN_KEY)) || null;
  },
  setRefreshToken: (token, options = {}) => {
    if (!isBrowser) return;
    const key = scopedKey(REFRESH_TOKEN_KEY);
    if (!token) {
      Cookies.remove(key, { path: '/' });
      return;
    }
    Cookies.set(key, token, { ...defaultCookieOptions(), expires: 30, ...options });
  },
  getUser: () => {
    const storage = getSessionStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(scopedKey(USER_KEY));
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('Error parsing user session data:', error);
      storage.removeItem(scopedKey(USER_KEY));
      return null;
    }
  },
  setUser: (user) => {
    const storage = getSessionStorage();
    if (!storage) return;
    if (!user) {
      storage.removeItem(scopedKey(USER_KEY));
      return;
    }
    storage.setItem(scopedKey(USER_KEY), JSON.stringify(user));
  },
  clearAll: () => {
    if (isBrowser) {
      Cookies.remove(scopedKey(ACCESS_TOKEN_KEY), { path: '/' });
      Cookies.remove(scopedKey(REFRESH_TOKEN_KEY), { path: '/' });
    }
    const storage = getSessionStorage();
    if (storage) {
      storage.removeItem(scopedKey(USER_KEY));
    }
  },
  hasSession: () => {
    if (!isBrowser) return false;
    return !!Cookies.get(scopedKey(ACCESS_TOKEN_KEY));
  },
};

export default authStorage;
