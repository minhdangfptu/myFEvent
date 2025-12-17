import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { notificationApi } from '../apis/notificationApi'
import authStorage from '../utils/authStorage'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false) // only fetch when authenticated

  // Fetch notifications from API
  const fetchNotifications = async () => {
    // Check token before making request
    const hasToken = authStorage.hasSession()
    if (!hasToken) {
      setEnabled(false)
      setNotifications([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await notificationApi.getNotifications()
      const notificationsData = response?.data || []
      
      // Helper function to format notification title - remove one set of outer brackets if present
      const formatNotificationTitle = (title) => {
        if (!title || typeof title !== 'string') return title || '';
        // Replace all occurrences of [[...]] with [...] using regex
        // This handles cases like "[[Event]] Some text" or "[[Event]]"
        return title.replace(/\[\[([^\]]+)\]\]/g, '[$1]');
      };
      
      // Map backend format to frontend format
      const mapped = notificationsData.map(n => ({
        id: n._id || n.id,
        category: n.category || 'KHÁC',
        icon: n.icon || 'bi bi-bell',
        avatarUrl: n.avatarUrl || '/logo-03.png',
        title: formatNotificationTitle(n.title || ''),
        createdAt: n.createdAt || n.created_at || new Date().toISOString(),
        unread: n.unread !== undefined ? n.unread : true,
        color: n.color || '#ef4444',
        // Keep relational ids so we can navigate to the right place on click
        eventId: n.eventId || n.event?.id || n.event,
        relatedTaskId: n.relatedTaskId || n.taskId || n.task,
        relatedMilestoneId: n.relatedMilestoneId || n.milestoneId || n.milestone,
        relatedAgendaId: n.relatedAgendaId || n.agendaId || n.agenda,
        relatedCalendarId: n.relatedCalendarId || n.calendarId || n.calendar,
        // Optional explicit target URL from backend, if provided
        targetUrl: n.targetUrl || n.url
      }))
      setNotifications(mapped)
    } catch (error) {
      // If 401, token is invalid - disable fetching
      if (error?.response?.status === 401) {
        console.warn('Unauthorized - disabling notifications fetching')
        setEnabled(false)
        setNotifications([])
      } else {
        console.error('Error fetching notifications:', error)
        // Don't clear notifications on other errors, just log
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Enable fetching only if token exists
    const hasToken = authStorage.hasSession()
    setEnabled(hasToken)

    if (hasToken) {
      fetchNotifications()
    }

    // Listen auth events
    const onLogin = () => {
      setEnabled(true)
      fetchNotifications()
    }
    const onLogout = () => {
      setEnabled(false)
      setNotifications([])
    }
    window.addEventListener('auth:login', onLogin)
    window.addEventListener('auth:logout', onLogout)

    // Poll for new notifications every 30 seconds when enabled
    let interval = null
    if (hasToken) {
      interval = setInterval(() => {
        const stillHasToken = authStorage.hasSession()
        if (stillHasToken) {
          fetchNotifications()
        } else {
          setEnabled(false)
          setNotifications([])
        }
      }, 30000)
    }

    return () => {
      if (interval) clearInterval(interval)
      window.removeEventListener('auth:login', onLogin)
      window.removeEventListener('auth:logout', onLogout)
    }
  }, []) // Empty dependency array - only run once on mount

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


