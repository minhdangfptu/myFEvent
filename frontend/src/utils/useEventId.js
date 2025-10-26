import { useLocation, useParams } from 'react-router-dom';

/**
 * Hook để lấy eventId từ URL
 * Ưu tiên: 1. Query parameter (?eventId=...) 2. Path parameter (/.../:eventId)
 */
export const useEventId = () => {
  const location = useLocation();
  const params = useParams();
  
  // Lấy từ query parameter
  const queryParams = new URLSearchParams(location.search);
  const eventIdFromQuery = queryParams.get('eventId');
  
  // Lấy từ path parameter (ví dụ: /member-event-detail/abc123)
  let eventIdFromPath = params.eventId;
  
  // Nếu không có trong params.eventId, thử parse từ pathname
  if (!eventIdFromPath && location.pathname) {
    const pathParts = location.pathname.split('/').filter(p => p);
    // Tìm các pattern như: /member-event-detail/:id, /hooc-event-detail/:id
    const detailIndex = pathParts.findIndex(p => p.includes('-event-detail'));
    if (detailIndex !== -1 && pathParts[detailIndex + 1]) {
      eventIdFromPath = pathParts[detailIndex + 1];
    }
  }
  
  return eventIdFromQuery || eventIdFromPath || null;
};

/**
 * Utility function để tạo URL với eventId trong query
 */
export const withEventId = (path, eventId) => {
  if (!eventId) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}eventId=${eventId}`;
};

/**
 * Utility function để cập nhật eventId trong query mà không mất các query khác
 */
export const updateEventId = (pathname, search, eventId) => {
  const params = new URLSearchParams(search);
  if (eventId) {
    params.set('eventId', eventId);
  } else {
    params.delete('eventId');
  }
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
};
