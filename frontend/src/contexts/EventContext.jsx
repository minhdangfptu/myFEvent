import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { eventService } from "../services/eventService";
import { useAuth } from "./AuthContext";

const EventContext = createContext();

export function useEvents() {
  return useContext(EventContext);
}

export function EventProvider({ children }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <EventContext.Provider value={{ events, loading, error, refetchEvents: fetchEvents }}>
      {children}
    </EventContext.Provider>
  );
}
