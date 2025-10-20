import UserLayout from '../../components/UserLayout'
import { useNotifications } from '../../contexts/NotificationsContext'

function timeAgo(iso) {
  try {
    const d = new Date(iso)
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return 'Vừa xong'
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`
    return `${Math.floor(diff/86400)} ngày trước`
  } catch { return '' }
}

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead } = useNotifications()

  return (
    <UserLayout title="Tất cả thông báo" activePage="notifications">
      <style>{`
        .noti-card{border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
        .tag{font-size:12px;background:#fee2e2;color:#991b1b;border-radius:999px;padding:2px 8px}
        .dot{width:8px;height:8px;border-radius:50%;background:#3b82f6}
      `}</style>

      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0" style={{ color: '#111827' }}>Tất cả thông báo</h5>
        <button className="btn btn-link text-decoration-none" onClick={markAllRead}>Đánh dấu tất cả đã đọc</button>
      </div>

      <div className="noti-card p-0">
        {notifications.map(n => (
          <div key={n.id} className="d-flex align-items-start gap-3 px-3 py-3 border-bottom" style={{ cursor:'pointer' }} onClick={() => markRead(n.id)}>
            <div className="d-flex align-items-center justify-content-center" style={{ width:32, height:32 }}>
              <i className={n.icon} style={{ color:'#ef4444' }} />
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


