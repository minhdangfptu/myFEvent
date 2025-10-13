import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../apis/authApi';

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

    // Listen for auth events
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

  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      
      const accessToken = response.accessToken;
      const refreshToken = response.refreshToken;
      const userData = response.user;
      
      // Save to localStorage
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('auth:login', { 
        detail: { user: userData } 
      }));
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async (googleToken) => {
    try {
      const response = await authApi.loginWithGoogle(googleToken);
      
      const accessToken = response.accessToken;
      const refreshToken = response.refreshToken;
      const userData = response.user;
      
      // Save to localStorage
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('auth:login', { 
        detail: { user: userData } 
      }));
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authApi.signup(userData);
      return response;
    } catch (error) {
      throw error;
    }
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
      // Always clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
      
      // Dispatch logout event
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  };

  const logoutAllDevices = async () => {
    try {
      await authApi.logoutAllDevices();
      
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
      
      // Dispatch logout event
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } catch (error) {
      console.error('Logout all devices API error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    logoutAllDevices,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};