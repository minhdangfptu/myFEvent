import { useState, useEffect, useRef } from 'react'
import UserLayout from '../../components/UserLayout'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '../../contexts/EventContext'
import { eventService } from '../../services/eventService'
import { toast } from 'react-toastify'
import { timeAgo } from '../../utils/timeAgo'
import { Bell, CalendarClock, CalendarDays, ClipboardCheck, ClipboardList, Info, Search, X } from 'lucide-react'

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead } = useNotifications()
  const navigate = useNavigate()
  const { fetchEventRole, forceCheckEventAccess } = useEvents()
  const [searchTerm, setSearchTerm] = useState('')
  const [displayCount, setDisplayCount] = useState(10)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false)
  const [accessDeniedEventName, setAccessDeniedEventName] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const getNotificationTargetUrl = (n) => {
    if (n.targetUrl) {
      let url = n.targetUrl.startsWith('/') ? n.targetUrl : `/${n.targetUrl}`;
      
      url = url.replace(
        /\/events\/([^/]+)\/departments\/([^/]+)\/budget\/([^/]+)\/review$/,
        '/events/$1/departments/$2/budget/review'
      );
      
      return url;
    }

    if (n.eventId && n.category === 'TÀI CHÍNH') {
      if (n.relatedBudgetId) {
        return `/home-page/events/${n.eventId}`;
      }
      if (n.relatedExpenseId) {
        return `/home-page/events/${n.eventId}`;
      }
    }

    if (n.eventId && n.category === 'PHẢN HỒI') {
      if (n.relatedFeedbackId) {
        return `/events/${n.eventId}/feedback/member`;
      }
    }

    if (n.eventId && n.category === 'RỦI RO') {
      if (n.relatedRiskId) {
        return `/events/${n.eventId}/risks/detail/${n.relatedRiskId}`;
      }
      return `/events/${n.eventId}/risks`;
    }

    if (n.eventId && n.category === 'LỊCH HỌP') {
      if (n.relatedCalendarId) {
        return `/events/${n.eventId}/my-calendar`;
      }
      if (n.relatedAgendaId && n.relatedMilestoneId) {
        return `/events/${n.eventId}/milestones/${n.relatedMilestoneId}/agenda/${n.relatedAgendaId}`;
      }
      return `/events/${n.eventId}/my-calendar`;
    }

    if (n.eventId && n.category === 'CÔNG VIỆC') {
      if (n.relatedTaskId) {
        return `/events/${n.eventId}/tasks/${n.relatedTaskId}`;
      }
      return `/events/${n.eventId}/tasks`;
    }

    if (n.eventId && n.category === 'THÀNH VIÊN') {
      return `/events/${n.eventId}/members`;
    }

    if (n.eventId) {
      return `/home-page/events/${n.eventId}`;
    }

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

  const extractEventIdFromUrl = (url) => {
    if (!url) return null
    const patterns = [
      /\/events\/([^/?]+)/,
      /\/home-page\/events\/([^/?]+)/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    return null
  }

  const handleNotificationClick = async (n) => {
    if (n.id) {
      markRead(n.id)
    }
    
    const url = getNotificationTargetUrl(n)
    
    let eventIdToCheck = n.eventId
    
    if (!eventIdToCheck && n.targetUrl) {
      eventIdToCheck = extractEventIdFromUrl(n.targetUrl)
    }
    
    if (!eventIdToCheck && url) {
      eventIdToCheck = extractEventIdFromUrl(url)
    }
    
    if (eventIdToCheck) {
      try {
        const role = await forceCheckEventAccess(eventIdToCheck)
        
        const hasAccess = role && typeof role === 'string' && role.trim() !== ''
        
        if (!hasAccess) {
          setAccessDeniedEventName('sự kiện này')
          setShowAccessDeniedModal(true)
          
          eventService.fetchEventById(eventIdToCheck, { skipGlobal404: true, skipGlobal403: true })
            .then(event => {
              if (mountedRef.current) {
                const eventName = event?.name || event?.title || 'sự kiện này'
                setAccessDeniedEventName(eventName)
              }
            })
            .catch(() => {
            })
          
          return
        }
      } catch (error) {
        setAccessDeniedEventName('sự kiện này')
        setShowAccessDeniedModal(true)
        
        eventService.fetchEventById(eventIdToCheck, { skipGlobal404: true, skipGlobal403: true })
          .then(event => {
            if (mountedRef.current) {
              const eventName = event?.name || event?.title || 'sự kiện này'
              setAccessDeniedEventName(eventName)
            }
          })
          .catch(() => {
          })
        
        return
      }
    }
    
    navigate(url)
  }

  const categories = ['all', ...new Set(notifications.map(n => n.category).filter(Boolean))]

  const filteredNotifications = notifications.filter(n => {
    const categoryMatch = selectedCategory === 'all' || n.category === selectedCategory

    if (!searchTerm.trim()) return categoryMatch

    const term = searchTerm.toLowerCase()
    const searchMatch = (
      n.title?.toLowerCase().includes(term) ||
      n.content?.toLowerCase().includes(term) ||
      n.category?.toLowerCase().includes(term)
    )

    return categoryMatch && searchMatch
  })

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
            setDisplayCount(10)
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
              setDisplayCount(10)
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
              <div key={n.id} className="d-flex align-items-start gap-3 px-3 py-3 border-bottom" style={{ cursor:'pointer' }} onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                await handleNotificationClick(n)
              }}>
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

      {/* Access Denied Modal */}
      {showAccessDeniedModal && (
        <div
          className="modal show d-block"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            zIndex: 99999, 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            setShowAccessDeniedModal(false)
          }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <h5 className="modal-title fw-bold" style={{ color: '#111827' }}>
                  Không có quyền truy cập
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAccessDeniedModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div className="d-flex align-items-start gap-3">
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Info size={24} style={{ color: '#EF4444' }} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="mb-0" style={{ fontSize: '16px', color: '#374151', lineHeight: '1.6' }}>
                      Xin lỗi nhưng bạn hiện đang không ở trong sự kiện <strong>{accessDeniedEventName}</strong> nữa, vui lòng liên hệ đến trưởng ban tổ chức sự kiện để được tham gia.
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowAccessDeniedModal(false)
                    navigate('/home-page')
                  }}
                  style={{ borderRadius: '8px' }}
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  )
}