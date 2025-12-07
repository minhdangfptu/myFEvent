import { useLocation } from 'react-router-dom';

/**
 * Utility function để lấy eventId từ URL
 * Hỗ trợ các pattern:
 * - Query parameter: ?eventId=...
 * - Pattern mới: /events/{eventId}/...
 * - Pattern cũ: /hooc-event-detail/{eventId}
 * 
 * @param {string} pathname - URL pathname
 * @param {string} search - URL search params
 * @returns {string|null} - eventId hoặc null nếu không tìm thấy
 */
export const getEventIdFromUrl = (pathname, search) => {
  // 1. Kiểm tra query parameter trước
  const params = new URLSearchParams(search);
  let eventId = params.get("eventId");
  
  if (eventId) {
    return eventId;
  }
  
  // 2. Kiểm tra pattern chung: /events/{eventId}/...
  if (pathname.startsWith('/events/')) {
    const pathParts = pathname.split('/');
    // pathParts[0] = '', pathParts[1] = 'events', pathParts[2] = eventId
    if (pathParts.length >= 3 && pathParts[1] === 'events') {
      return pathParts[2];
    }
  }
  
  // 3. Fallback cho pattern cũ: /hooc-event-detail/{eventId}
  if (pathname.includes('/hooc-event-detail/')) {
    const pathParts = pathname.split('/');
    const index = pathParts.findIndex(part => part === 'hooc-event-detail');
    if (index !== -1 && pathParts[index + 1]) {
      return pathParts[index + 1];
    }
  }
  
  return null;
};

/**
 * Hook để lấy eventId từ URL hiện tại
 * @returns {string|null} - eventId hoặc null nếu không tìm thấy
 */
export const useEventIdFromUrl = () => {
  const location = useLocation();
  return getEventIdFromUrl(location.pathname, location.search);
};
