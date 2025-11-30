import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { eventService } from "../services/eventService";
import { useAuth } from "./AuthContext";
import { userApi } from "../apis/userApi";

const EventContext = createContext();

export function useEvents() {
  return useContext(EventContext);
}

export function EventProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Initialize eventRoles from localStorage
  const [eventRoles, setEventRoles] = useState(() => {
    try {
      const cached = localStorage.getItem('eventRoles');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  // Store full member info (role + departmentId) for each event
  const [eventMembers, setEventMembers] = useState(() => {
    try {
      const cached = localStorage.getItem('eventMembers');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 0
  });
  const fetchingRef = useRef(false); // Track if we're currently fetching
  const hasFetchedRef = useRef(false); // Track if we've fetched at least once

  // Persist eventRoles to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('eventRoles', JSON.stringify(eventRoles));
    } catch (err) {
      console.error('Failed to persist eventRoles:', err);
    }
  }, [eventRoles]);

  // Persist eventMembers to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('eventMembers', JSON.stringify(eventMembers));
    } catch (err) {
      console.error('Failed to persist eventMembers:', err);
    }
  }, [eventMembers]);

  // Clear eventRoles and eventMembers cache when user logs out or changes
  const userIdRef = useRef(null);
  useEffect(() => {
    const currentUserId = user?._id || user?.id;

    if (!authLoading) {
      if (!user) {
        // User logged out, clear the cache
        setEventRoles({});
        setEventMembers({});
        userIdRef.current = null;
        try {
          localStorage.removeItem('eventRoles');
          localStorage.removeItem('eventMembers');
        } catch (err) {
          console.error('Failed to clear cache:', err);
        }
      } else if (userIdRef.current && userIdRef.current !== currentUserId) {
        // Different user logged in, clear old cache
        setEventRoles({});
        setEventMembers({});
        try {
          localStorage.removeItem('eventRoles');
          localStorage.removeItem('eventMembers');
        } catch (err) {
          console.error('Failed to clear cache:', err);
        }
      }

      // Update current user ID
      if (currentUserId) {
        userIdRef.current = currentUserId;
      }
    }
  }, [user, authLoading]);

  const extractEventArray = useCallback((payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.events)) return payload.events;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.data)) return payload.data;
    if (typeof payload === "object") {
      for (const value of Object.values(payload)) {
        if (Array.isArray(value)) return value;
      }
    }
    return [];
  }, []);

  const fetchEvents = useCallback(async (page = 1, limit = 8, search = '') => {
    // Skip if auth is still loading
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Skip if no user
    if (!user) {
      setEvents([]);
      setLoading(false);
      fetchingRef.current = false;
      return;
    }

    // Skip if already fetching to prevent duplicate requests
    if (fetchingRef.current?.fetching) {
      return;
    }

    fetchingRef.current = { fetching: true, lastUserId: user?._id || user?.id };
    setLoading(true);
    setError("");
    try {
      const res = await eventService.listMyEvents({ page, limit, search });
      const list = extractEventArray(res);
      setEvents(list);
      // Update pagination if available
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      setEvents([]);
      setError("Lỗi lấy dữ liệu sự kiện");
    } finally {
      setLoading(false);
      fetchingRef.current = { fetching: false, lastUserId: user?._id || user?.id };
    }
  }, [user, authLoading, extractEventArray]);

  // Fetch events when auth completes or user changes
  useEffect(() => {
    // Wait for auth to complete before fetching
    if (authLoading) {
      return; // Still loading auth, don't do anything yet
    }

    // Auth is done loading
    if (user) {
      // User is authenticated, fetch their events
      // Only fetch if we haven't fetched yet, or if user changed
      const currentUserId = user._id || user.id;
      const lastUserId = fetchingRef.current?.lastUserId;
      
      if (!hasFetchedRef.current || lastUserId !== currentUserId) {
        hasFetchedRef.current = true;
        fetchEvents();
      }
    } else {
      // No user after auth loads, clear events
      setEvents([]);
      setLoading(false);
      fetchingRef.current = { fetching: false, lastUserId: null };
      hasFetchedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?._id || user?.id]); // Only depend on authLoading and user ID, not fetchEvents

  // Fetch role for a specific eventId with simple caching
  const fetchEventRole = useCallback(async (eventId) => {
    if (!eventId) return "";
    // Return cached role if available (check with 'in' to handle empty string)
    if (eventId in eventRoles) return eventRoles[eventId];
    try {
      const res = await userApi.getUserRoleByEvent(eventId);
      const role = res?.role || res?.data?.role || "";
      const departmentId = res?.departmentId || res?.data?.departmentId || null;

      // Cache both role and full member info
      setEventRoles((prev) => ({ ...prev, [eventId]: role }));
      setEventMembers((prev) => ({
        ...prev,
        [eventId]: {
          role,
          departmentId,
          eventMemberId: res?.eventMemberId || res?._id || null
        }
      }));

      return role;
    } catch (e) {
      // Cache the error as empty string to prevent repeated API calls
      setEventRoles((prev) => ({ ...prev, [eventId]: "" }));
      setEventMembers((prev) => ({ ...prev, [eventId]: { role: "", departmentId: null } }));
      return "";
    }
  }, [eventRoles]);

  // Utility to get role synchronously from cache (may be empty string if not fetched yet)
  const getEventRole = useCallback((eventId) => {
    return eventRoles[eventId] || "";
  }, [eventRoles]);

  // Utility to get member info synchronously from cache
  const getEventMember = useCallback((eventId) => {
    return eventMembers[eventId] || { role: "", departmentId: null };
  }, [eventMembers]);

  // Function to change page with search
  const changePage = useCallback((newPage, search = '') => {
    fetchEvents(newPage, pagination.limit, search);
  }, [fetchEvents, pagination.limit]);

  return (
    <EventContext.Provider value={{
      events,
      loading,
      error,
      refetchEvents: fetchEvents,
      eventRoles,
      eventMembers,
      fetchEventRole,
      getEventRole,
      getEventMember,
      pagination,
      changePage
    }}>
      {children}
    </EventContext.Provider>
  );
}
