import UserLayout from '../../components/UserLayout'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../../utils/timeAgo'
import { Bell, CalendarClock, CalendarDays, ClipboardCheck, ClipboardList, Info } from 'lucide-react'

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead } = useNotifications()
  const navigate = useNavigate()

  const getNotificationTargetUrl = (n) => {
    // Backend can optionally send a direct URL (ưu tiên cao nhất)
    if (n.targetUrl) {
      // Validate targetUrl - nếu không bắt đầu bằng / thì có thể là relative path
      let url = n.targetUrl.startsWith('/') ? n.targetUrl : `/${n.targetUrl}`;
      
      // Fix URL cũ có budgetId trong path review: /budget/{budgetId}/review -> /budget/review
      // Pattern: /events/.../departments/.../budget/{budgetId}/review
      url = url.replace(
        /\/events\/([^/]+)\/departments\/([^/]+)\/budget\/([^/]+)\/review$/,
        '/events/$1/departments/$2/budget/review'
      );
      
      console.log('Notification targetUrl:', url, 'Original:', n.targetUrl, 'Full notification:', n);
      return url;
    }

    // TÀI CHÍNH notifications
    if (n.eventId && n.category === 'TÀI CHÍNH') {
      // Budget notifications - backend đã set targetUrl, nếu không có thì fallback về trang home
      if (n.relatedBudgetId) {
        // Nếu có targetUrl từ backend thì dùng (đã được xử lý ở trên)
        // Nếu không có targetUrl, fallback về trang home của event để tránh 404
        return `/home-page/events/${n.eventId}`;
      }
      // Expense notifications
      if (n.relatedExpenseId) {
        // Nếu có targetUrl từ backend thì dùng (đã được xử lý ở trên)
        // Nếu không có targetUrl, fallback về trang home của event
        return `/home-page/events/${n.eventId}`;
      }
    }

    // PHẢN HỒI notifications
    if (n.eventId && n.category === 'PHẢN HỒI') {
      if (n.relatedFeedbackId) {
        return `/events/${n.eventId}/feedback/member`;
      }
    }

    // RỦI RO notifications
    if (n.eventId && n.category === 'RỦI RO') {
      if (n.relatedRiskId) {
        return `/events/${n.eventId}/risks/detail/${n.relatedRiskId}`;
      }
      return `/events/${n.eventId}/risks`;
    }

    // LỊCH HỌP notifications
    if (n.eventId && n.category === 'LỊCH HỌP') {
      if (n.relatedCalendarId) {
        return `/events/${n.eventId}/my-calendar`;
      }
      if (n.relatedAgendaId && n.relatedMilestoneId) {
        return `/events/${n.eventId}/milestones/${n.relatedMilestoneId}/agenda/${n.relatedAgendaId}`;
      }
      return `/events/${n.eventId}/my-calendar`;
    }

    // CÔNG VIỆC notifications - điều hướng đến trang task
    if (n.eventId && n.category === 'CÔNG VIỆC') {
      // Nếu có relatedTaskId thì đi đến task detail
      if (n.relatedTaskId) {
        return `/events/${n.eventId}/tasks/${n.relatedTaskId}`;
      }
      // Nếu không có relatedTaskId thì đi đến trang danh sách tasks
      return `/events/${n.eventId}/tasks`;
    }

    // THÀNH VIÊN notifications - điều hướng đến trang thành viên
    if (n.eventId && n.category === 'THÀNH VIÊN') {
      return `/events/${n.eventId}/members`;
    }

    // Mặc định nếu có eventId thì đưa về trang chi tiết sự kiện
    if (n.eventId) {
      return `/home-page/events/${n.eventId}`;
    }

    // Fallback: về trang danh sách thông báo
    return '/notifications';
  }

  const ICON_BY_CATEGORY = {
    'LỊCH HỌP': CalendarDays,
    'CÔNG VIỆC': ClipboardCheck,
    'NHẮC NHỞ': CalendarClock,
    'HỆ THỐNG': Info,
    'TÀI CHÍNH': ClipboardList,
    'PHẢN HỒI': ClipboardCheck,
    'RỦI RO': Info,
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