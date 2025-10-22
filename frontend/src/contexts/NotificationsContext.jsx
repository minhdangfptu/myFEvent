import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const NotificationsContext = createContext(null)

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'n1',
    category: 'CÔNG VIỆC',
    icon: 'bi bi-asterisk',
    avatarUrl: '/logo-03.png',
    title: 'Đặng Đình Minh đã giao cho bạn 1 công việc',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unread: true,
    color: '#ef4444'
  },
  {
    id: 'n2',
    category: 'CÔNG VIỆC',
    icon: 'bi bi-asterisk',
    avatarUrl: '/logo-03.png',
    title: 'Đặng Đình Minh đã giao cho bạn 1 công việc',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unread: true,
    color: '#ef4444'
  },
  {
    id: 'n3',
    category: 'LỊCH HỌP',
    icon: 'bi bi-asterisk',
    avatarUrl: '/logo-03.png',
    title: 'Bạn có 1 lịch họp vào ngày mai',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unread: true,
    color: '#3b82f6'
  }
]

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    try {
      const raw = localStorage.getItem('notifications')
      if (raw) return JSON.parse(raw)
    } catch {}
    return DEFAULT_NOTIFICATIONS
  })

  useEffect(() => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications))
    } catch {}
  }, [notifications])

  const unreadCount = useMemo(() => notifications.filter(n => n.unread).length, [notifications])

  const addNotification = (n) => {
    setNotifications(prev => [{ ...n, id: String(Date.now()), unread: true, createdAt: new Date().toISOString() }, ...prev])
  }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n))
  }

  const value = useMemo(() => ({ notifications, setNotifications, unreadCount, addNotification, markAllRead, markRead }), [notifications, unreadCount])

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}


