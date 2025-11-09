import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { notificationApi } from '../apis/notificationApi'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await notificationApi.getNotifications()
      const notificationsData = response?.data || []
      // Map backend format to frontend format
      const mapped = notificationsData.map(n => ({
        id: n._id || n.id,
        category: n.category || 'KHÁC',
        icon: n.icon || 'bi bi-bell',
        avatarUrl: n.avatarUrl || '/logo-03.png',
        title: n.title || '',
        createdAt: n.createdAt || n.created_at || new Date().toISOString(),
        unread: n.unread !== undefined ? n.unread : true,
        color: n.color || '#ef4444'
      }))
      setNotifications(mapped)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications])

  const addNotification = (n) => {
    // This is now handled by backend, but we can optimistically update UI
    setNotifications(prev => [{ ...n, id: String(Date.now()), unread: true, createdAt: new Date().toISOString() }, ...prev])
    // Refresh from API to get the real notification
    setTimeout(fetchNotifications, 500)
  }

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
    } catch (error) {
      console.error('Error marking all read:', error)
    }
  }

  const markRead = async (id) => {
    try {
      await notificationApi.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n))
    } catch (error) {
      console.error('Error marking read:', error)
    }
  }

  const value = useMemo(() => ({ 
    notifications, 
    setNotifications, 
    unreadCount, 
    addNotification, 
    markAllRead, 
    markRead,
    loading,
    refreshNotifications: fetchNotifications
  }), [notifications, unreadCount, loading])

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}


