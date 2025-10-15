import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../apis/authApi'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('access_token')
        const userData = localStorage.getItem('user')
        
        if (token && userData) {
          setUser(JSON.parse(userData))
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth events
    const handleLogout = () => {
      setUser(null)
    }

    const handleLogin = (event) => {
      setUser(event.detail.user)
    }

    window.addEventListener('auth:logout', handleLogout)
    window.addEventListener('auth:login', handleLogin)
    
    return () => {
      window.removeEventListener('auth:logout', handleLogout)
      window.removeEventListener('auth:login', handleLogin)
    }
  }, [])

  const logout = async () => {
    try {
      // Debug: Kiểm tra tất cả tokens trong localStorage
      const accessToken = localStorage.getItem('access_token')
      const refreshToken = localStorage.getItem('refresh_token')
      const user = localStorage.getItem('user')
      
      console.log('Current localStorage state:', {
        accessToken: accessToken ? 'Present' : 'Missing',
        refreshToken: refreshToken ? 'Present' : 'Missing', 
        user: user ? 'Present' : 'Missing'
      })
      
      if (refreshToken) {
        console.log('Calling logout API with refresh token:', refreshToken.substring(0, 20) + '...')
        await authApi.logout(refreshToken)
        console.log('Logout API called successfully')
      } else {
        console.log('No refresh token found, skipping API call')
      }
    } catch (error) {
      console.error('Logout API error:', error)
      // Vẫn tiếp tục logout local dù API có lỗi
    } finally {
      // Luôn xóa tokens và user data khỏi localStorage
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
      
      // Dispatch logout event
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
  }
  const logoutAllDevices = async () => {
    try {
      await authApi.logoutAllDevices()
    } catch (error) {
      console.error('Logout all devices API error:', error)
    }
  }

  const value = {
    user,
    loading,
    logout,
    logoutAllDevices,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
