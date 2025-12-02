// Utility to manage current event in localStorage

const CURRENT_EVENT_KEY = 'currentEvent';

export const currentEventStorage = {
  // Save current event to localStorage
  set: (event) => {
    if (!event) return;
    try {
      const eventData = {
        _id: event._id || event.id,
        id: event.id || event._id,
        name: event.name,
        status: event.status,
        description: event.description,
        location: event.location,
        eventStartDate: event.eventStartDate,
        eventEndDate: event.eventEndDate,
        image: event.image,
        eventMember: event.eventMember,
        savedAt: Date.now()
      };
      localStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(eventData));
    } catch (error) {
      console.error('Failed to save current event:', error);
    }
  },

  // Get current event from localStorage
  get: () => {
    try {
      const cached = localStorage.getItem(CURRENT_EVENT_KEY);
      if (!cached) return null;

      const event = JSON.parse(cached);

      // Optional: Check if cache is too old (e.g., 24 hours)
      const cacheAge = Date.now() - (event.savedAt || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge > maxAge) {
        // Cache expired, clear it
        currentEventStorage.clear();
        return null;
      }

      return event;
    } catch (error) {
      console.error('Failed to get current event:', error);
      return null;
    }
  },

  // Clear current event from localStorage
  clear: () => {
    try {
      localStorage.removeItem(CURRENT_EVENT_KEY);
    } catch (error) {
      console.error('Failed to clear current event:', error);
    }
  },

  // Check if there's a current event
  has: () => {
    try {
      return !!localStorage.getItem(CURRENT_EVENT_KEY);
    } catch {
      return false;
    }
  }
};
