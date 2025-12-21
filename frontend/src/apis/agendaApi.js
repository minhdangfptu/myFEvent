import axiosClient from './axiosClient.js';

// === AGENDA CRUD APIs ===

// GET http://localhost:8080/api/events/68fe711d991b5b8a0d013cab/exports/raw/agenda/list-name
export const getAgendaName = async (eventId, milestoneId) => {
  const res = await axiosClient.get(`/api/events/${eventId}/exports/raw/agenda/list-name`);
  return res.data;
};
// GET /api/events/:eventId/milestones/:milestoneId/agenda - Lấy agenda theo milestone
export const getAgendaByMilestone = async (eventId, milestoneId) => {
  const res = await axiosClient.get(`/api/events/${eventId}/milestones/${milestoneId}/agenda`);
  return res.data;
};

// GET /api/events/:eventId/milestones/:milestoneId/agenda/items - Lấy flattened timeline items
export const getFlattenedAgendaItems = async (eventId, milestoneId) => {
  const res = await axiosClient.get(`/api/events/${eventId}/milestones/${milestoneId}/agenda/items`);
  return res.data;
};

// POST /api/events/:eventId/milestones/:milestoneId/agenda - Tạo agenda document mới
export const createAgenda = async (eventId, milestoneId, agendaData = {}) => {
  const res = await axiosClient.post(`/api/events/${eventId}/milestones/${milestoneId}/agenda`, agendaData);
  return res.data;
};

// === DATE MANAGEMENT APIs (ID-based) ===

// POST /api/events/:eventId/milestones/:milestoneId/agenda/dates - Thêm date mới vào agenda
export const addDateToAgenda = async (eventId, milestoneId, date) => {
  const res = await axiosClient.post(`/api/events/${eventId}/milestones/${milestoneId}/agenda/dates`, { date });
  return res.data;
};

// GET /api/events/:eventId/milestones/:milestoneId/agenda/dates/:dateId - Tìm date by ID
export const findDateById = async (eventId, milestoneId, dateId) => {
  const res = await axiosClient.get(`/api/events/${eventId}/milestones/${milestoneId}/agenda/dates/${dateId}`);
  return res.data;
};

// PATCH /api/events/:eventId/milestones/:milestoneId/agenda/dates/:dateId - Update date by ID
export const updateDateById = async (eventId, milestoneId, dateId, updates) => {
  const res = await axiosClient.patch(`/api/events/${eventId}/milestones/${milestoneId}/agenda/dates/${dateId}`, updates);
  return res.data;
};

// DELETE /api/events/:eventId/milestones/:milestoneId/agenda/dates/:dateId - Xóa date by ID
export const removeDateById = async (eventId, milestoneId, dateId) => {
  const res = await axiosClient.delete(`/api/events/${eventId}/milestones/${milestoneId}/agenda/dates/${dateId}`);
  return res.data;
};

// === ITEM MANAGEMENT APIs (ID-based) ===

// POST /api/events/:eventId/milestones/:milestoneId/agenda/dates/:dateId/items - Thêm item vào date
export const addItemToDateById = async (eventId, milestoneId, dateId, itemData) => {
  // itemData should include: startTime, endTime, duration, content
  const res = await axiosClient.post(`/api/events/${eventId}/milestones/${milestoneId}/agenda/dates/${dateId}/items`, itemData);
  return res.data;
};

// POST /api/events/:eventId/milestones/:milestoneId/agenda/dates/:dateId/items/batch - Batch tạo items cho date
export const batchCreateItemsForDateById = async (eventId, milestoneId, dateId, items) => {
  const res = await axiosClient.post(`/api/events/${eventId}/milestones/${milestoneId}/agenda/dates/${dateId}/items/batch`, { items });
  return res.data;
};

// === LEGACY ITEM MANAGEMENT APIs (Index-based) ===

// PATCH /api/events/:eventId/milestones/:milestoneId/agenda/items - Update item by index
export const updateDayItem = async (eventId, milestoneId, dateIndex, itemIndex, updates) => {
  const requestBody = {
    dateIndex,
    itemIndex,
    updates
  };
  const res = await axiosClient.patch(`/api/events/${eventId}/milestones/${milestoneId}/agenda/items`, requestBody);
  return res.data;
};

// DELETE /api/events/:eventId/milestones/:milestoneId/agenda/items - Xóa item by index (with itemId for verification)
export const removeDayItem = async (eventId, milestoneId, dateIndex, itemIndex, itemId = null) => {
  const requestBody = {
    dateIndex,
    itemIndex
  };
  // Include itemId if provided for more reliable deletion
  if (itemId) {
    requestBody.itemId = itemId;
  }
  const res = await axiosClient.delete(`/api/events/${eventId}/milestones/${milestoneId}/agenda/items`, {
    data: requestBody
  });
  return res.data;
};

// === LEGACY BATCH OPERATION APIs (Index-based) ===

// PATCH /api/events/:eventId/milestones/:milestoneId/agenda/items/batch - Batch update items
export const batchUpdateItems = async (eventId, milestoneId, itemUpdates) => {
  // itemUpdates: [{ dateIndex, itemIndex, updates }]
  const res = await axiosClient.patch(`/api/events/${eventId}/milestones/${milestoneId}/agenda/items/batch`, {
    itemUpdates
  });
  return res.data;
};

// DELETE /api/events/:eventId/milestones/:milestoneId/agenda/items/batch - Batch xóa items
export const batchRemoveItems = async (eventId, milestoneId, itemsToRemove) => {
  // itemsToRemove: [{ dateIndex, itemIndex }]
  const res = await axiosClient.delete(`/api/events/${eventId}/milestones/${milestoneId}/agenda/items/batch`, {
    data: { itemsToRemove }
  });
  return res.data;
};

// === HELPER/COMPOSITE APIs ===

// Tạo agenda với items cho một date cụ thể (ID-based approach)
export const createAgendaWithItemsForDate = async (eventId, milestoneId, agendaData, targetDate, items = []) => {
  try {
    // 1. Tạo agenda trước
    const agendaResult = await createAgenda(eventId, milestoneId, agendaData);
    
    // 2. Thêm date vào agenda
    const dateResult = await addDateToAgenda(eventId, milestoneId, targetDate);
    
    // 3. Nếu có items, batch create cho date đó
    if (items.length > 0 && dateResult.success && dateResult.data?.agenda) {
      // Tìm dateId của date vừa tạo
      const newDate = dateResult.data.agenda.find(d => 
        new Date(d.date).toDateString() === new Date(targetDate).toDateString()
      );
      
      if (newDate?._id) {
        const itemsResult = await batchCreateItemsForDateById(eventId, milestoneId, newDate._id, items);
        return itemsResult;
      }
    }
    
    return agendaResult;
  } catch (error) {
    console.error('Error creating agenda with items:', error);
    throw error;
  }
};

// Helper để tạo một ngày agenda với nhiều items (ID-based)
export const createDateWithItems = async (eventId, milestoneId, date, items = []) => {
  try {
    // 1. Add date to agenda
    const dateResult = await addDateToAgenda(eventId, milestoneId, date);
    
    // 2. Add items to that date
    if (items.length > 0 && dateResult.success && dateResult.data?.agenda) {
      // Tìm dateId của date vừa tạo
      const newDate = dateResult.data.agenda.find(d => 
        new Date(d.date).toDateString() === new Date(date).toDateString()
      );
      
      if (newDate?._id) {
        return await batchCreateItemsForDateById(eventId, milestoneId, newDate._id, items);
      }
    }
    
    return dateResult;
  } catch (error) {
    console.error('Error creating date with items:', error);
    throw error;
  }
};

// Helper để lấy items theo date cụ thể
export const getItemsByDate = async (eventId, milestoneId, targetDate) => {
  try {
    const flattenedItems = await getFlattenedAgendaItems(eventId, milestoneId);
    
    if (!flattenedItems.success || !flattenedItems.data) {
      return { success: false, data: [] };
    }
    
    const targetDateStr = new Date(targetDate).toDateString();
    const itemsForDate = flattenedItems.data.filter(item => 
      new Date(item.date).toDateString() === targetDateStr
    );
    
    return {
      success: true,
      data: itemsForDate,
      count: itemsForDate.length
    };
  } catch (error) {
    console.error('Error getting items by date:', error);
    throw error;
  }
};

// Helper để update multiple items của một date (using index-based approach)
export const updateItemsForDate = async (eventId, milestoneId, targetDate, itemUpdates) => {
  try {
    // Get current items to find dateIndex
    const flattenedItems = await getFlattenedAgendaItems(eventId, milestoneId);
    
    if (!flattenedItems.success || !flattenedItems.data) {
      throw new Error('Could not fetch current items');
    }
    
    const targetDateStr = new Date(targetDate).toDateString();
    const itemsForDate = flattenedItems.data.filter(item => 
      new Date(item.date).toDateString() === targetDateStr
    );
    
    if (itemsForDate.length === 0) {
      throw new Error('No items found for specified date');
    }
    
    // Convert to batch update format
    const batchUpdates = itemUpdates.map(update => ({
      dateIndex: itemsForDate[0].dateIndex, // Same date index for all items
      itemIndex: update.itemIndex,
      updates: update.updates
    }));
    
    return await batchUpdateItems(eventId, milestoneId, batchUpdates);
    
  } catch (error) {
    console.error('Error updating items for date:', error);
    throw error;
  }
};

// Helper để thêm items vào date hiện có (by dateId)
export const addItemsToExistingDate = async (eventId, milestoneId, dateId, items) => {
  try {
    if (items.length === 1) {
      return await addItemToDateById(eventId, milestoneId, dateId, items[0]);
    } else {
      return await batchCreateItemsForDateById(eventId, milestoneId, dateId, items);
    }
  } catch (error) {
    console.error('Error adding items to existing date:', error);
    throw error;
  }
};

// Helper để lấy thông tin date với items
export const getDateWithItems = async (eventId, milestoneId, dateId) => {
  try {
    const dateInfo = await findDateById(eventId, milestoneId, dateId);
    
    if (!dateInfo.success) {
      return dateInfo;
    }
    
    // Get all items for this date
    const items = await getItemsByDate(eventId, milestoneId, dateInfo.data.dateAgenda.date);
    
    return {
      success: true,
      data: {
        ...dateInfo.data,
        items: items.data || []
      }
    };
  } catch (error) {
    console.error('Error getting date with items:', error);
    throw error;
  }
};

// === BACKWARD COMPATIBILITY (DEPRECATED) ===

// Deprecated: Use new ID-based approach
export const batchCreateItemsForDate = async (eventId, milestoneId, agendaId, targetDate, items) => {
  console.warn('batchCreateItemsForDate with agendaId is deprecated. Use createDateWithItems or batchCreateItemsForDateById instead.');
  return await createDateWithItems(eventId, milestoneId, targetDate, items);
};

// Deprecated: Use new structure
export const addDayItem = async (eventId, milestoneId, agendaId, itemData) => {
  console.warn('addDayItem with agendaId is deprecated. Use addItemToDateById instead.');
  
  // Try to extract targetDate from itemData
  if (itemData.targetDate) {
    // Need to find dateId first
    const agenda = await getAgendaByMilestone(eventId, milestoneId);
    if (agenda.success && agenda.data?.agenda) {
      const targetDateStr = new Date(itemData.targetDate).toDateString();
      const targetDateAgenda = agenda.data.agenda.find(d => 
        new Date(d.date).toDateString() === targetDateStr
      );
      
      if (targetDateAgenda?._id) {
        const { targetDate, ...cleanItemData } = itemData;
        return await addItemToDateById(eventId, milestoneId, targetDateAgenda._id, cleanItemData);
      }
    }
  }
  
  throw new Error('Could not determine target date for item. Please use addItemToDateById with explicit dateId.');
};

export default {
  // Main APIs
  getAgendaByMilestone,
  getFlattenedAgendaItems,
  createAgenda,
  
  // Date management (ID-based)
  addDateToAgenda,
  findDateById,
  updateDateById,
  removeDateById,
  
  // Item management (ID-based)
  addItemToDateById,
  batchCreateItemsForDateById,
  
  // Legacy item management (Index-based)
  updateDayItem,
  removeDayItem,
  
  // Legacy batch operations (Index-based)
  batchUpdateItems,
  batchRemoveItems,
  
  // Helpers
  createAgendaWithItemsForDate,
  createDateWithItems,
  getItemsByDate,
  updateItemsForDate,
  addItemsToExistingDate,
  getDateWithItems,
  
  // Backward compatibility (deprecated)
  batchCreateItemsForDate,
  addDayItem
};