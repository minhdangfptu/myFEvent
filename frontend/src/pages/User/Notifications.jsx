import UserLayout from '../../components/UserLayout'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../../utils/timeAgo'
import { Bell, CalendarClock, CalendarDays, ClipboardCheck, ClipboardList, Info } from 'lucide-react'

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead } = useNotifications()
  const navigate = useNavigate()

  const getNotificationTargetUrl = (n) => {
    if (n.targetUrl) return n.targetUrl

    if (n.eventId && n.relatedTaskId) {
      return `/events/${n.eventId}/tasks/${n.relatedTaskId}`
    }

    if (n.eventId && n.category === 'THÀNH VIÊN') {
      return `/home-page/events/${n.eventId}`
    }

    if (n.eventId) {
      return `/home-page/events/${n.eventId}`
    }

    return '/notifications'
  }

  const ICON_BY_CATEGORY = {
    'LỊCH HỌP': CalendarDays,
    'CÔNG VIỆC': ClipboardCheck,
    'NHẮC NHỞ': CalendarClock,
    'HỆ THỐNG': Info,
  }

  const getIconComponent = (n) => {
    if (n?.icon === 'bell') return Bell
    if (n?.icon === 'calendar') return CalendarDays
    if (n?.icon === 'task') return ClipboardList
    return ICON_BY_CATEGORY[n?.category] || Bell
  }

  const handleNotificationClick = (n) => {
    if (n.id) {
      markRead(n.id)
    }
    const url = getNotificationTargetUrl(n)
    navigate(url)
  }

  return (
    <UserLayout title="Tất cả thông báo" activePage="notifications">
      <style>{`
        .noti-card{border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
        .tag{font-size:12px;background:#fee2e2;color:#991b1b;border-radius:999px;padding:2px 8px}
        .dot{width:8px;height:8px;border-radius:50%;background:#3b82f6}
      `}</style>

      <div className="d-flex align-items-center justify-content-end mb-3">
        {/* <h5 className="mb-0" style={{ color: '#111827' }}>Tất cả thông báo</h5> */}
        <button className="btn btn-link text-decoration-none" onClick={markAllRead}>Đánh dấu tất cả đã đọc</button>
      </div>

      <div style={{backgroundColor:"white"}} className="noti-card p-0">
        {notifications.map(n => (
          <div key={n.id} className="d-flex align-items-start gap-3 px-3 py-3 border-bottom" style={{ cursor:'pointer' }} onClick={() => handleNotificationClick(n)}>
            <div className="d-flex align-items-center justify-content-center" style={{ width:32, height:32 }}>
              {(() => {
                const Icon = getIconComponent(n)
                return <Icon size={20} style={{ color: n.color || '#ef4444' }} />
              })()}
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="tag" style={{ background:n.color+'22', color:n.color }}>{n.category}</span>
              </div>
              <div className="fw-semibold" style={{ color:'#111827' }}>{n.title}</div>
              <div className="text-secondary small">{timeAgo(n.createdAt)}</div>
            </div>
            {n.unread && <div className="dot mt-2" />}
          </div>
        ))}
      </div>
    </UserLayout>
  )
}