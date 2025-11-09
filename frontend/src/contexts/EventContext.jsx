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
  const [eventRoles, setEventRoles] = useState({});
  const fetchingRef = useRef(false); // Track if we're currently fetching

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

  const fetchEvents = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setEvents([]);
      setLoading(false);
      fetchingRef.current = false;
      return;
    }

    // Skip if already fetching to prevent duplicate requests
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const res = await eventService.listMyEvents();
      const list = extractEventArray(res);
      setEvents(list);
    } catch (err) {
      setEvents([]);
      setError("Lỗi lấy dữ liệu sự kiện");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user, authLoading, extractEventArray]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]); // fetchEvents is memoized with user and authLoading dependencies

  // Fetch role for a specific eventId with simple caching
  const fetchEventRole = useCallback(async (eventId) => {
    if (!eventId) return "";
    // Return cached role if available
    if (eventRoles[eventId]) return eventRoles[eventId];
    try {
      const res = await userApi.getUserRoleByEvent(eventId);
      const role = res?.role || res?.data?.role || "";
      setEventRoles((prev) => ({ ...prev, [eventId]: role }));
      return role;
    } catch (e) {
      return "";
    }
  }, [eventRoles]);

  // Utility to get role synchronously from cache (may be empty string if not fetched yet)
  const getEventRole = useCallback((eventId) => {
    return eventRoles[eventId] || "";
  }, [eventRoles]);

  return (
    <EventContext.Provider value={{ events, loading, error, refetchEvents: fetchEvents, eventRoles, fetchEventRole, getEventRole }}>
      {children}
    </EventContext.Provider>
  );
}
