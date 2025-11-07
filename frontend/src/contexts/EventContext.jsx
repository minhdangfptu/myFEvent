import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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

  const fetchEvents = useCallback(async () => {
    // Đợi AuthContext load xong trước khi fetch events
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await eventService.listMyEvents();
      setEvents(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setEvents([]);
      setError("Lỗi lấy dữ liệu sự kiện");
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch role for a specific eventId with simple caching
  const fetchEventRole = useCallback(async (eventId) => {
    if (!eventId) return "";
    // Return cached role if available
    if (eventRoles[eventId]) return eventRoles[eventId];
    try {
      const res = await userApi.getUserRoleByEvent(eventId);
      const role = res?.role || "";
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
