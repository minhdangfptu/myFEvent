import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { eventService } from "../services/eventService";
import { useAuth } from "./AuthContext";
import { userApi } from "../apis/userApi";

const EventContext = createContext();

export function useEvents() {
  return useContext(EventContext);
}

export function EventProvider({ children }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventRoles, setEventRoles] = useState({}); // { [eventId]: "HoOC" | "HoD" | "Member" | "" }

  const fetchEvents = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
