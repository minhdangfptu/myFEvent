import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children, requiredRole = null, requiredEventRoles = null }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const params = useParams();
  const { fetchEventRole, getEventRole } = useEvents();
  const [eventRoleLoading, setEventRoleLoading] = useState(false);
  const [eventRoleChecked, setEventRoleChecked] = useState(false);

  // Get eventId from URL params
  const eventId = params.eventId;

  useEffect(() => {
    // If we need to check event roles and have eventId, fetch the event role
    if (requiredEventRoles && eventId && isAuthenticated && !loading) {
      setEventRoleLoading(true);
      fetchEventRole(eventId).then(() => {
        setEventRoleLoading(false);
        setEventRoleChecked(true);
      }).catch(() => {
        setEventRoleLoading(false);
        setEventRoleChecked(true);
      });
    } else if (!requiredEventRoles) {
      // No event role check needed, mark as checked
      setEventRoleChecked(true);
    } else if (requiredEventRoles && !eventId) {
      // Event role required but no eventId in URL - mark as checked (will fail validation)
      setEventRoleChecked(true);
    }
  }, [requiredEventRoles, eventId, isAuthenticated, loading, fetchEventRole]);

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
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to unauthorized page or home
    return <Navigate to="/unauthorized" replace />;
  }

  // Check event role if required
  if (requiredEventRoles && eventRoleChecked) {
    if (!eventId) {
      // Event role required but no eventId in URL - unauthorized
      return <Navigate to="/unauthorized" replace />;
    }
    const currentEventRole = getEventRole(eventId);
    if (!currentEventRole || !requiredEventRoles.includes(currentEventRole)) {
      // User doesn't have required event role - unauthorized
      return <Navigate to="/unauthorized" replace />;
    }
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