import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../apis/authApi';
import { signInWithGoogle } from '../services/googleAuth';

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
        const token = localStorage.getItem('access_token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
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

    if (accessToken) localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    if (userData) localStorage.setItem('user', JSON.stringify(userData));
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
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
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
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
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
