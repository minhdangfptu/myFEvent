import axiosClient from './axiosClient.js';
import authStorage from '../utils/authStorage.js';

// === EXPORT APIs ===

// Export single item (team, members, timeline, agenda, tasks, risks, incidents)
export const exportItem = async (eventId, itemId, subItems = []) => {
  return await axiosClient.post(
    `/api/events/${eventId}/exports/items/${itemId}`,
    { subItems },
    { 
      responseType: 'blob',
      timeout: 120000 
    }
  );
};

// Export all items as ZIP file
export const exportAllItemsZip = async (eventId) => {
  return await axiosClient.get(
    `/api/events/${eventId}/exports/items/zip-all`,
    { 
      responseType: 'blob',
      timeout: 300000 
    }
  );
};

// Export selected items as ZIP file
export const exportSelectedItemsZip = async (eventId, itemIds) => {
  return await axiosClient.post(
    `/api/events/${eventId}/exports/items/zip-selected`,
    { itemIds },
    { 
      responseType: 'blob',
      timeout: 300000
    }
  );
};

// List exported files for a specific event
export const getExportedFiles = async (eventId) => {
  const res = await axiosClient.get(`/api/events/${eventId}/exports/items/lists`);
  return res.data;
};

// Download exported file - Updated to use fetch for blob handling
export const downloadExportedFile = async (filename) => {
  try {
    const token = authStorage.getAccessToken();
    const response = await fetch(`/api/events/exports/download/${filename}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    return response;
    
  } catch (error) {
    console.error("Download API error:", error);
    throw error;
  }
};

// Get agenda names (existing function)
export const getAgendaName = async (eventId) => {
  const res = await axiosClient.get(`/api/events/${eventId}/exports/raw/agenda/list-name`);
  return res.data;
};

// Cleanup old files (admin only)
export const cleanupOldFiles = async () => {
  const res = await axiosClient.delete('/api/events/exports/cleanup');
  return res.data;
};