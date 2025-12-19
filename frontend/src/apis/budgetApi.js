import axiosClient from './axiosClient';

// Helper để unwrap response
const unwrapResponse = (payload) => {
  let current = payload;
  while (
    current &&
    typeof current === 'object' &&
    !Array.isArray(current) &&
    (current.data !== undefined || current.result !== undefined)
  ) {
    current = current.data ?? current.result;
  }
  return current;
};

export const budgetApi = {
  // Lấy budget của department
  getDepartmentBudget: async (eventId, departmentId, forReview = false) => {
    const url = `/api/events/${eventId}/departments/${departmentId}/budget${forReview ? '?forReview=true' : ''}`;
    const res = await axiosClient.get(url);
    return unwrapResponse(res.data);
  },

  // Lấy budget của department theo budgetId
  getDepartmentBudgetById: async (eventId, departmentId, budgetId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}`);
    return unwrapResponse(res.data);
  },

  // Tạo budget mới
  createBudget: async (eventId, departmentId, data) => {
    const res = await axiosClient.post(`/api/events/${eventId}/departments/${departmentId}/budget`, data);
    return unwrapResponse(res.data);
  },

  // Cập nhật budget (draft)
  updateBudget: async (eventId, departmentId, budgetId, data) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}`, data);
    return unwrapResponse(res.data);
  },

  // Gửi duyệt
  submitBudget: async (eventId, departmentId, budgetId) => {
    const res = await axiosClient.post(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/submit`);
    return unwrapResponse(res.data);
  },

  // Thu hồi bản gửi
  recallBudget: async (eventId, departmentId, budgetId) => {
    const res = await axiosClient.post(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/recall`);
    return unwrapResponse(res.data);
  },

  // Xóa draft
  deleteDraft: async (eventId, departmentId, budgetId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}`);
    return unwrapResponse(res.data);
  },

  // HoD: Lấy tất cả budgets của department
  getAllBudgetsForDepartment: async (eventId, departmentId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.includeItems === false) queryParams.append('includeItems', 'false');
    
    const res = await axiosClient.get(`/api/events/${eventId}/departments/${departmentId}/budget/budgets?${queryParams.toString()}`);
    return unwrapResponse(res.data);
  },

  // HoOC: Lấy tất cả budgets của event
  getAllBudgetsForEvent: async (eventId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.includeItems === false) queryParams.append('includeItems', 'false');
    
    const res = await axiosClient.get(`/api/events/${eventId}/budgets?${queryParams.toString()}`);
    return unwrapResponse(res.data);
  },

  // HoOC: Lưu review
  saveReviewDraft: async (eventId, departmentId, budgetId, data) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/review/draft`, data);
    return unwrapResponse(res.data);
  },

  // HoOC: Hoàn tất review
  completeReview: async (eventId, departmentId, budgetId, data) => {
    const res = await axiosClient.post(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/review/complete`, data);
    return unwrapResponse(res.data);
  },

  // HoD: Cập nhật categories
  updateCategories: async (eventId, departmentId, budgetId, categories) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/categories`, { categories });
    return unwrapResponse(res.data);
  },

  // Lấy Thống kê chi tiêu
  getBudgetStatistics: async (eventId, departmentId = null) => {
    const params = departmentId ? { departmentId } : {};
    const res = await axiosClient.get(`/api/events/${eventId}/budgets/statistics`, { params });
    return unwrapResponse(res.data);
  },

  // HoOC: Cập nhật trạng thái công khai của budget
  updateBudgetVisibility: async (eventId, departmentId, budgetId, isPublic) => {
    const res = await axiosClient.patch(
      `/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/visibility`,
      { isPublic }
    );
    return unwrapResponse(res.data);
  },

  // HoD: Gửi budget xuống member
  sendBudgetToMembers: async (eventId, departmentId, budgetId) => {
    const res = await axiosClient.post(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/send-to-members`);
    return unwrapResponse(res.data);
  },

  // Member: Báo cáo chi tiêu
  reportExpense: async (eventId, departmentId, budgetId, itemId, data) => {
    const res = await axiosClient.post(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/items/${itemId}/report-expense`, data);
    return unwrapResponse(res.data);
  },

  // Toggle paid status
  togglePaidStatus: async (eventId, departmentId, budgetId, itemId) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/items/${itemId}/toggle-paid`);
    return unwrapResponse(res.data);
  },

  // Assign item to member
  assignItem: async (eventId, departmentId, budgetId, itemId, memberId) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/items/${itemId}/assign`, { memberId });
    return unwrapResponse(res.data);
  },

  // Submit expense
  submitExpense: async (eventId, departmentId, budgetId, itemId) => {
    const res = await axiosClient.post(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/items/${itemId}/submit-expense`);
    return unwrapResponse(res.data);
  },

  // Undo submit expense
  undoSubmitExpense: async (eventId, departmentId, budgetId, itemId) => {
    const res = await axiosClient.post(`/api/events/${eventId}/departments/${departmentId}/budget/${budgetId}/items/${itemId}/undo-submit`);
    return unwrapResponse(res.data);
  },
};

