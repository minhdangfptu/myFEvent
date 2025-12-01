import { useState } from 'react'
import UserLayout from '../../components/UserLayout'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../../utils/timeAgo'
import { Bell, CalendarClock, CalendarDays, ClipboardCheck, ClipboardList, Info, Search } from 'lucide-react'

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead } = useNotifications()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [displayCount, setDisplayCount] = useState(10)
  const [selectedCategory, setSelectedCategory] = useState('all')

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

  // Lấy danh sách các category duy nhất
  const categories = ['all', ...new Set(notifications.map(n => n.category).filter(Boolean))]

  // Lọc thông báo theo category và từ khóa tìm kiếm
  const filteredNotifications = notifications.filter(n => {
    // Lọc theo category
    const categoryMatch = selectedCategory === 'all' || n.category === selectedCategory

    // Lọc theo search term
    if (!searchTerm.trim()) return categoryMatch

    const term = searchTerm.toLowerCase()
    const searchMatch = (
      n.title?.toLowerCase().includes(term) ||
      n.content?.toLowerCase().includes(term) ||
      n.category?.toLowerCase().includes(term)
    )

    return categoryMatch && searchMatch
  })

  // Lấy danh sách thông báo hiển thị (pagination)
  const displayedNotifications = filteredNotifications.slice(0, displayCount)
  const hasMore = filteredNotifications.length > displayCount

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 10)
  }

  return (
    <UserLayout title="Tất cả thông báo" activePage="notifications">
      <style>{`
        .noti-card{border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
        .tag{font-size:12px;background:#fee2e2;color:#991b1b;border-radius:999px;padding:2px 8px}
        .dot{width:8px;height:8px;border-radius:50%;background:#3b82f6}
      `}</style>

      {/* Search Bar, Filter and Mark All Read */}
      <div className="d-flex align-items-center gap-3 mb-3">
        {/* Category Filter */}
        <select
          className="form-select"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            setDisplayCount(10) // Reset về 10 khi đổi filter
          }}
          style={{
            borderRadius: 8,
            fontSize: 14,
            borderColor: '#e5e7eb',
            backgroundColor: '#ffffff',
            minWidth: 180,
            maxWidth: 200
          }}
        >
          <option value="all">Tất cả loại</option>
          {categories.filter(c => c !== 'all').map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        {/* Search Bar */}
        <div className="position-relative flex-grow-1">
          <Search
            size={18}
            className="position-absolute"
            style={{
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }}
          />
          <input
            type="text"
            className="form-control"
            placeholder="Tìm kiếm thông báo theo tiêu đề hoặc nội dung..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setDisplayCount(10) // Reset về 10 khi search
            }}
            style={{
              paddingLeft: 40,
              borderRadius: 8,
              fontSize: 14,
              borderColor: '#e5e7eb',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        {/* Mark All Read Button */}
        <button
          className="btn btn-link text-decoration-none text-nowrap"
          onClick={markAllRead}
          style={{ fontSize: 14 }}
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div style={{backgroundColor:"white"}} className="noti-card p-0">
        {displayedNotifications.length === 0 ? (
          <div className="text-center py-5" style={{ color: '#6b7280' }}>
            <Bell size={48} style={{ color: '#d1d5db', marginBottom: 16 }} />
            <div style={{ fontSize: 16 }}>
              {searchTerm ? 'Không tìm thấy thông báo phù hợp' : 'Chưa có thông báo nào'}
            </div>
          </div>
        ) : (
          <>
            {displayedNotifications.map(n => (
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
          </>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-4">
          <button
            className="btn"
            onClick={handleLoadMore}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              color: '#374151',
              fontWeight: 500
            }}
          >
            Xem thêm ({filteredNotifications.length - displayCount} thông báo)
          </button>
        </div>
      )}
    </UserLayout>
  )
}