import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useEffect, useState, useRef, useMemo } from 'react';

export default function ProtectedRoute({ children, requiredRole = null, requiredEventRoles = null }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const params = useParams();
  const { fetchEventRole, getEventRole, eventRoles } = useEvents();
  const [eventRoleLoading, setEventRoleLoading] = useState(false);
  const [eventRoleChecked, setEventRoleChecked] = useState(false);
  const [currentEventRole, setCurrentEventRole] = useState(null);
  
  // Use ref to prevent multiple simultaneous fetches
  const fetchingRef = useRef(false);
  const eventIdRef = useRef(null);

  // Get eventId from URL params
  const eventId = params.eventId;

  // Memoize role check to prevent unnecessary re-renders
  // Only use currentEventRole from state, don't call getEventRole in render
  // MUST be called before any early returns to follow Rules of Hooks
  const roleToCheck = useMemo(() => {
    if (!requiredEventRoles || !eventRoleChecked || !eventId) {
      return null;
    }
    // Chỉ sử dụng currentEventRole đã được set trong useEffect
    // Không gọi getEventRole trong render để tránh re-render
    return currentEventRole;
  }, [requiredEventRoles, eventRoleChecked, eventId, currentEventRole]);

  // Check event role if required - only log once
  // MUST be called before any early returns to follow Rules of Hooks
  const hasAccess = useMemo(() => {
    if (!requiredEventRoles || !eventRoleChecked) {
      return null;
    }
    
    if (!eventId) {
      return false;
    }
    
    if (!roleToCheck || roleToCheck === '') {
      return true; // Allow render, let child component handle it
    }
    
    return requiredEventRoles.includes(roleToCheck);
  }, [requiredEventRoles, eventRoleChecked, eventId, roleToCheck]);

  useEffect(() => {
    // Reset if eventId changes
    if (eventIdRef.current !== eventId) {
      eventIdRef.current = eventId;
      fetchingRef.current = false;
      setEventRoleChecked(false);
      setCurrentEventRole(null);
    }

    // If we need to check event roles and have eventId, fetch the event role
    if (requiredEventRoles && eventId && isAuthenticated && !loading && !fetchingRef.current) {
      // Check cache first - if eventId exists in eventRoles, we have cached data
      const cachedRole = getEventRole(eventId);
      if (cachedRole !== undefined && eventId in (eventRoles || {})) {
        // We have cached data (even if empty string)
        setCurrentEventRole(cachedRole);
        setEventRoleChecked(true);
        return;
      }
      
      // Only fetch if not already fetching and not in cache
      if (!fetchingRef.current) {
        fetchingRef.current = true;
        setEventRoleLoading(true);
        
        // Simple fetch - no retry loops, fetchEventRole will handle caching
        fetchEventRole(eventId)
          .then((role) => {
            setCurrentEventRole(role || '');
            setEventRoleLoading(false);
            setEventRoleChecked(true);
            fetchingRef.current = false;
          })
          .catch((error) => {
            console.error('[ProtectedRoute] Error fetching event role:', error);
            setCurrentEventRole('');
            setEventRoleLoading(false);
            setEventRoleChecked(true);
            fetchingRef.current = false;
          });
      }
    } else if (!requiredEventRoles) {
      // No event role check needed, mark as checked
      setEventRoleChecked(true);
    } else if (requiredEventRoles && !eventId) {
      // Event role required but no eventId in URL - mark as checked (will fail validation)
      setEventRoleChecked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredEventRoles, eventId, isAuthenticated, loading]);

  // Log only once when role is checked
  // MUST be called before any early returns to follow Rules of Hooks
  // Role check logic handled in hasAccess calculation

  // Now we can do early returns after all hooks are called
  if (loading || (requiredEventRoles && eventRoleLoading)) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border" role="status" aria-hidden="true"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for user data to be loaded before checking role
  // This prevents race condition when user just logged in
  if (requiredRole && !user) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border" role="status" aria-hidden="true"></div>
      </div>
    );
  }

  // Check user role if required
  // Admin can access all routes, including user-only routes
  if (requiredRole) {
    const isAdmin = user?.role === 'admin';
    const hasRequiredRole = user?.role === requiredRole;
    
    if (!isAdmin && !hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check event role if required
  if (requiredEventRoles && eventRoleChecked) {
    if (!eventId) {
      // Event role required but no eventId in URL - unauthorized
      return <Navigate to="/unauthorized" replace />;
    }
    
    // Nếu role là empty string, null, hoặc undefined, cho phép render
    // Component con (như ListBudgetsPage) sẽ tự kiểm tra và redirect nếu cần
    if (!roleToCheck || roleToCheck === '') {
      // Cho phép render, component con sẽ tự kiểm tra
      return children;
    }
    
    // Chỉ redirect nếu role có giá trị và không nằm trong danh sách required
    if (hasAccess === false) {
      // User doesn't have required event role - unauthorized
      return <Navigate to="/unauthorized" replace />;
    }
    
    // Role hợp lệ và nằm trong danh sách required, cho phép render
  }

  // If we're still waiting for event role check, show loading
  if (requiredEventRoles && !eventRoleChecked) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border" role="status" aria-hidden="true"></div>
      </div>
    );
  }

  return children;
}