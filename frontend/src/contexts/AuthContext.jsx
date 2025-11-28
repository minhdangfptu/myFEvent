import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../apis/authApi';
import { signInWithGoogle } from '../services/googleAuth';
import authStorage from '../utils/authStorage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = authStorage.getAccessToken();
        const userData = authStorage.getUser();
        if (token && userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        authStorage.clearAll();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const handleLogout = () => {
      setUser(null);
    };
    const handleLogin = (event) => {
      setUser(event.detail.user);
    };

    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:login', handleLogin);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:login', handleLogin);
    };
  }, []);

  const persistAuth = (response) => {
    // Backend may return tokens at top-level or nested under tokens
    const accessToken = response.accessToken || response.tokens?.accessToken;
    const refreshToken = response.refreshToken || response.tokens?.refreshToken;
    const userData = response.user || null;

    if (accessToken) authStorage.setAccessToken(accessToken);
    if (refreshToken) authStorage.setRefreshToken(refreshToken);
    if (userData) authStorage.setUser(userData);
    if (userData) setUser(userData);

    if (userData) {
      window.dispatchEvent(new CustomEvent('auth:login', { detail: { user: userData } }));
    }
    return { accessToken, refreshToken, user: userData };
  };

  const login = async (email, password) => {
    const response = await authApi.login(email, password);
    return persistAuth(response);
  };

  const loginWithGoogle = async () => {
    const payload = await signInWithGoogle();
    const response = await authApi.googleLogin(payload);
    return persistAuth(response);
  };

  const signup = async (userData) => {
    const response = await authApi.signup(userData);
    return response;
  };

  const logout = async () => {
    try {
      const refreshToken = authStorage.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      authStorage.clearAll();
      setUser(null);
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  };

  const logoutAllDevices = async () => {
    try {
      await authApi.logoutAllDevices();
    } catch (error) {
      console.error('Logout all devices API error:', error);
      throw error;
    } finally {
      authStorage.clearAll();
      setUser(null);
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  };

  const value = {
    user,
    setUser, // Expose setUser for profile update
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    logoutAllDevices,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
