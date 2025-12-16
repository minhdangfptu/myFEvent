import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { eventService } from "../services/eventService";
import { useAuth } from "./AuthContext";
import { userApi } from "../apis/userApi";
import { clearOldCacheFormat } from "../utils/cacheMigration";
import { currentEventStorage } from "../utils/currentEventStorage";

const EventContext = createContext();

export function useEvents() {
  return useContext(EventContext);
}

// Cache TTL: 1 hour (in milliseconds) - Reduced from 24h to ensure role changes are reflected faster
const CACHE_TTL = 1 * 60 * 60 * 1000;

// Helper to get user-scoped cache key
const getCacheKey = (baseKey, userId) => {
  return userId ? `${baseKey}_${userId}` : baseKey;
};

// Helper to check if cache entry is expired
const isCacheExpired = (timestamp) => {
  if (!timestamp) return true;
  return Date.now() - timestamp > CACHE_TTL;
};

// Helper to load cache with TTL check
const loadCacheWithTTL = (cacheKey) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return {};

    const parsed = JSON.parse(cached);

    // Check if cache has timestamp (new format)
    if (parsed._timestamp) {
      if (isCacheExpired(parsed._timestamp)) {
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
        return {};
      }
      // Remove timestamp from returned data
      const { _timestamp, ...data } = parsed;
      return data;
    }

    // Old format without timestamp, treat as expired
    localStorage.removeItem(cacheKey);
    return {};
  } catch {
    return {};
  }
};

export function EventProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get current userId for cache keys
  const currentUserId = user?._id || user?.id;

  // Initialize eventRoles from user-scoped localStorage with TTL
  const [eventRoles, setEventRoles] = useState(() => {
    if (!currentUserId) {
      console.log('[EventContext Init] No userId, starting with empty eventRoles');
      return {};
    }
    const cacheKey = getCacheKey('eventRoles', currentUserId);
    const cached = loadCacheWithTTL(cacheKey);
    console.log(`[EventContext Init] 📦 Loaded eventRoles cache for user ${currentUserId}:`, cached);
    return cached;
  });

  // Store full member info (role + departmentId) for each event
  const [eventMembers, setEventMembers] = useState(() => {
    if (!currentUserId) {
      console.log('[EventContext Init] No userId, starting with empty eventMembers');
      return {};
    }
    const cacheKey = getCacheKey('eventMembers', currentUserId);
    const cached = loadCacheWithTTL(cacheKey);
    console.log(`[EventContext Init] 📦 Loaded eventMembers cache for user ${currentUserId}:`, cached);
    return cached;
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8, // Luôn hiển thị 8 sự kiện mỗi trang
    total: 0,
    totalPages: 0
  });
  const fetchingRef = useRef(false); // Track if we're currently fetching
  const hasFetchedRef = useRef(false); // Track if we've fetched at least once
  const userIdRef = useRef(null); // Track current user ID

  // Function to clear ALL user data on logout (comprehensive cleanup)
  // Defined early so it can be used in useEffect hooks
  const clearAllUserData = useCallback((userId) => {
    console.log('[EventContext] Clearing all user data for logout...');

    try {
      // 1. Clear state
      setEventRoles({});
      setEventMembers({});
      setEvents([]);
      setError("");
      setLoading(false);

      // 2. Clear refs
      fetchingRef.current = { fetching: false, lastUserId: null };
      hasFetchedRef.current = false;
      userIdRef.current = null;

      // 3. Clear localStorage - Event cache
      if (userId) {
        const rolesKey = getCacheKey('eventRoles', userId);
        const membersKey = getCacheKey('eventMembers', userId);
        localStorage.removeItem(rolesKey);
        localStorage.removeItem(membersKey);
      }

      // 4. Clear old format cache
      localStorage.removeItem('eventRoles');
      localStorage.removeItem('eventMembers');

      // 5. Clear current event cache
      currentEventStorage.clear();

      // 6. Clear sidebar states
      localStorage.removeItem('sidebar_state_member');
      localStorage.removeItem('sidebar_state_hooc');
      localStorage.removeItem('sidebar_state_hod');

      // 7. Clear any other event-related cache
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Remove any key that might contain event data
        if (key && (
          key.includes('eventRoles') ||
          key.includes('eventMembers') ||
          key.includes('sidebar_state')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log(`[EventContext] ✅ All user data cleared (${keysToRemove.length + 6} items)`);
    } catch (err) {
      console.error('[EventContext] ❌ Error clearing user data:', err);
    }
  }, []);

  // One-time cleanup of old cache format on mount
  useEffect(() => {
    clearOldCacheFormat();
  }, []);

  // Listen for auth:logout event to clear all user data immediately
  useEffect(() => {
    const handleLogout = () => {
      const userId = userIdRef.current;
      console.log('[EventContext] Logout event detected, clearing all data...');
      clearAllUserData(userId);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [clearAllUserData]);

  // Persist eventRoles to user-scoped localStorage with TTL
  useEffect(() => {
    if (!currentUserId) return;

    try {
      const cacheKey = getCacheKey('eventRoles', currentUserId);
      // Add timestamp to cache for TTL checking
      const cacheData = {
        ...eventRoles,
        _timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // Broadcast change to other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: cacheKey,
        newValue: JSON.stringify(cacheData),
        storageArea: localStorage
      }));
    } catch (err) {
      console.error('Failed to persist eventRoles:', err);
    }
  }, [eventRoles, currentUserId]);

  // Persist eventMembers to user-scoped localStorage with TTL
  useEffect(() => {
    if (!currentUserId) return;

    try {
      const cacheKey = getCacheKey('eventMembers', currentUserId);
      // Add timestamp to cache for TTL checking
      const cacheData = {
        ...eventMembers,
        _timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // Broadcast change to other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: cacheKey,
        newValue: JSON.stringify(cacheData),
        storageArea: localStorage
      }));
    } catch (err) {
      console.error('Failed to persist eventMembers:', err);
    }
  }, [eventMembers, currentUserId]);

  // Listen for storage changes from other tabs to sync roles (user-scoped)
  useEffect(() => {
    if (!currentUserId) return;

    const rolesKey = getCacheKey('eventRoles', currentUserId);
    const membersKey = getCacheKey('eventMembers', currentUserId);

    const handleStorageChange = (e) => {
      // Check for user-scoped eventRoles changes
      if (e.key === rolesKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          // Remove timestamp before comparing/setting
          const { _timestamp, ...newRoles } = parsed;

          // Only update if the data is actually different to avoid infinite loops
          const currentRolesStr = JSON.stringify(eventRoles);
          const newRolesStr = JSON.stringify(newRoles);
          if (currentRolesStr !== newRolesStr) {
            setEventRoles(newRoles);
          }
        } catch (err) {
          console.error('Failed to parse eventRoles from storage event:', err);
        }
      }

      // Check for user-scoped eventMembers changes
      if (e.key === membersKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          // Remove timestamp before comparing/setting
          const { _timestamp, ...newMembers } = parsed;

          // Only update if the data is actually different to avoid infinite loops
          const currentMembersStr = JSON.stringify(eventMembers);
          const newMembersStr = JSON.stringify(newMembers);
          if (currentMembersStr !== newMembersStr) {
            setEventMembers(newMembers);
          }
        } catch (err) {
          console.error('Failed to parse eventMembers from storage event:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [eventRoles, eventMembers, currentUserId]);

  // Clear eventRoles and eventMembers cache when user logs out or changes
  useEffect(() => {
    const currentUserId = user?._id || user?.id;

    if (!authLoading) {
      if (!user) {
        // User logged out - clear ALL user data (comprehensive cleanup)
        // Note: This also happens via 'auth:logout' event listener, but we double-check here
        if (userIdRef.current) {
          clearAllUserData(userIdRef.current);
        }
      } else if (userIdRef.current && userIdRef.current !== currentUserId) {
        // Different user logged in, clear old user's cache and load new user's cache
        console.log('[EventContext] User switch detected, clearing old cache...');

        // Clear old user's data
        clearAllUserData(userIdRef.current);

        try {
          // Load new user's cache
          const newRolesKey = getCacheKey('eventRoles', currentUserId);
          const newMembersKey = getCacheKey('eventMembers', currentUserId);
          setEventRoles(loadCacheWithTTL(newRolesKey));
          setEventMembers(loadCacheWithTTL(newMembersKey));

          console.log('[EventContext] New user cache loaded');
        } catch (err) {
          console.error('[EventContext] Failed to load new user cache:', err);
        }
      }

      // Update current user ID
      if (currentUserId) {
        userIdRef.current = currentUserId;
      }
    }
  }, [user, authLoading, clearAllUserData]);

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

  const fetchEvents = useCallback(async (page = 1, _limit = 8, search = '', status = '') => {
    // Skip if auth is still loading - DON'T set loading state here
    // It will be set by the useEffect that triggers this
    if (authLoading) {
      return;
    }

    // Skip if no user
    if (!user) {
      setEvents([]);
      setLoading(false);
      setError("");
      fetchingRef.current = { fetching: false, lastUserId: null };
      return;
    }

    // Skip if already fetching to prevent duplicate requests
    const currentFetchState = fetchingRef.current;
    if (currentFetchState?.fetching) {
      console.warn('[EventContext] Already fetching events, skipping duplicate request');
      return;
    }

    const userId = user?._id || user?.id;
    fetchingRef.current = { fetching: true, lastUserId: userId };
    setLoading(true);
    setError("");

    try {
      // Ép backend luôn trả về 8 sự kiện mỗi trang
      const res = await eventService.listMyEvents({ page, limit: 8, search, status });
      const list = extractEventArray(res);
      setEvents(list);
      // Update pagination if available
      if (res?.pagination) {
        setPagination({
          ...res.pagination,
          limit: 8, // Đảm bảo state phân trang phía client cũng cố định 8
        });
      } else {
        // Fallback nếu backend không trả pagination
        setPagination((prev) => ({
          ...prev,
          page,
          limit: 8,
        }));
      }
    } catch (err) {
      console.error('[EventContext] Error fetching events:', err);
      setEvents([]);
      setError(err?.response?.data?.message || err?.message || "Lỗi lấy dữ liệu sự kiện");
    } finally {
      setLoading(false);
      fetchingRef.current = { fetching: false, lastUserId: userId };
    }
  }, [user, authLoading, extractEventArray]);

  // Fetch events when auth completes or user changes
  useEffect(() => {
    // Wait for auth to complete before fetching
    if (authLoading) {
      setLoading(true); // Show loading while auth is loading
      return; // Still loading auth, don't do anything yet
    }

    // Auth is done loading
    if (user) {
      // User is authenticated, fetch their events
      const currentUserId = user._id || user.id;
      const lastUserId = fetchingRef.current?.lastUserId;

      // Fetch if:
      // 1. Haven't fetched yet (hasFetchedRef.current = false)
      // 2. User changed (lastUserId !== currentUserId)
      // 3. No events and no error (possible failed state that needs retry)
      const shouldFetch = !hasFetchedRef.current ||
                         lastUserId !== currentUserId ||
                         (events.length === 0 && !error && !fetchingRef.current?.fetching);

      if (shouldFetch) {
        hasFetchedRef.current = true;
        fetchEvents();
      }
    } else {
      // No user after auth loads, clear events
      setEvents([]);
      setLoading(false);
      setError("");
      fetchingRef.current = { fetching: false, lastUserId: null };
      hasFetchedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?._id || user?.id]); // Only depend on authLoading and user ID, not fetchEvents

  // Fetch role for a specific eventId with simple caching
  const fetchEventRole = useCallback(async (eventId) => {
    if (!eventId) {
      console.log('[fetchEventRole] No eventId provided');
      return "";
    }

    // Return cached role if available (check with 'in' to handle empty string)
    if (eventId in eventRoles) {
      const cachedRole = eventRoles[eventId];
      console.log(`[fetchEventRole] 📦 Cache HIT for event ${eventId}: role="${cachedRole}"`);
      return cachedRole;
    }

    console.log(`[fetchEventRole] 🌐 Cache MISS for event ${eventId}, calling API...`);

    try {
      const res = await userApi.getUserRoleByEvent(eventId);
      console.log(`[fetchEventRole] API response for event ${eventId}:`, res);

      const role = res?.role || res?.data?.role || "";
      const departmentId = res?.departmentId || res?.data?.departmentId || null;

      console.log(`[fetchEventRole] ✅ Parsed role="${role}", departmentId="${departmentId}" for event ${eventId}`);

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

      console.log(`[fetchEventRole] 💾 Cached role for event ${eventId}`);
      return role;
    } catch (e) {
      console.error(`[fetchEventRole] ❌ Error fetching role for event ${eventId}:`, e);
      // Cache the error as empty string to prevent repeated API calls
      setEventRoles((prev) => ({ ...prev, [eventId]: "" }));
      setEventMembers((prev) => ({ ...prev, [eventId]: { role: "", departmentId: null } }));
      return "";
    }
  }, [eventRoles]);

  // Force check access without using cache - for critical access checks (e.g., notifications)
  const forceCheckEventAccess = useCallback(async (eventId) => {
    if (!eventId) return "";
    try {
      // Clear cache for this eventId first to force fresh check
      setEventRoles((prev) => {
        const newRoles = { ...prev };
        delete newRoles[eventId];
        return newRoles;
      });
      setEventMembers((prev) => {
        const newMembers = { ...prev };
        delete newMembers[eventId];
        return newMembers;
      });

      // Now fetch fresh role - CRITICAL: Add skipGlobal404 and skipGlobal403 flags
      // to prevent interceptor from redirecting before modal can show
      const res = await userApi.getUserRoleByEvent(eventId, {
        skipGlobal404: true,
        skipGlobal403: true
      });
      const role = res?.role || res?.data?.role || "";
      const departmentId = res?.departmentId || res?.data?.departmentId || null;

      // Update cache with fresh data
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
      // Cache the error as empty string
      setEventRoles((prev) => ({ ...prev, [eventId]: "" }));
      setEventMembers((prev) => ({ ...prev, [eventId]: { role: "", departmentId: null } }));
      return "";
    }
  }, []);

  // Utility to get role synchronously from cache (may be empty string if not fetched yet)
  const getEventRole = useCallback((eventId) => {
    if (!eventId) {
      console.log('[getEventRole] No eventId provided');
      return "";
    }
    const role = eventRoles[eventId] || "";
    console.log(`[getEventRole] 🔍 Reading role for event ${eventId}: "${role}" (from cache)`);
    return role;
  }, [eventRoles]);

  // Utility to get member info synchronously from cache
  const getEventMember = useCallback((eventId) => {
    return eventMembers[eventId] || { role: "", departmentId: null };
  }, [eventMembers]);

  // Function to manually invalidate cache for specific event (useful when role changes)
  const invalidateEventCache = useCallback((eventId) => {
    if (!eventId) return;

    // Remove from state
    setEventRoles((prev) => {
      const newRoles = { ...prev };
      delete newRoles[eventId];
      return newRoles;
    });
    setEventMembers((prev) => {
      const newMembers = { ...prev };
      delete newMembers[eventId];
      return newMembers;
    });

    console.log(`[EventContext] Cache invalidated for event: ${eventId}`);
  }, []);

  // Function to clear all cache (useful for debugging or force refresh)
  const clearAllCache = useCallback(() => {
    setEventRoles({});
    setEventMembers({});

    try {
      // Clear all possible cache keys
      const userId = user?._id || user?.id;
      if (userId) {
        const rolesKey = getCacheKey('eventRoles', userId);
        const membersKey = getCacheKey('eventMembers', userId);
        localStorage.removeItem(rolesKey);
        localStorage.removeItem(membersKey);
      }
      // Also clear old format keys
      localStorage.removeItem('eventRoles');
      localStorage.removeItem('eventMembers');

      console.log('[EventContext] All cache cleared');
    } catch (err) {
      console.error('Failed to clear all cache:', err);
    }
  }, [user]);

  // Function to change page with search & status
  const changePage = useCallback((newPage, search = '', status = '') => {
    // Luôn dùng limit = 8 cho mọi lần chuyển trang
    fetchEvents(newPage, 8, search, status);
  }, [fetchEvents]);

  return (
    <EventContext.Provider value={{
      events,
      loading,
      error,
      refetchEvents: fetchEvents,
      eventRoles,
      eventMembers,
      fetchEventRole,
      forceCheckEventAccess,
      getEventRole,
      getEventMember,
      invalidateEventCache,
      clearAllCache,
      clearAllUserData,
      pagination,
      changePage
    }}>
      {children}
    </EventContext.Provider>
  );
}
