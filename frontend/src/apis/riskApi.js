import axiosClient from './axiosClient';

export const riskApi = {
  // ========== BASIC CRUD OPERATIONS ==========
  
  // Lấy danh sách risks với pagination và filtering
  // GET /api/events/:eventId/risks
  listRisksByEvent: async (eventId, params = {}) => {
    const res = await axiosClient.get(`/api/events/${eventId}/risks`, { params });
    return res.data;
  },

  // Lấy tất cả risks (không pagination) - cho analytics
  // GET /api/events/:eventId/risks/all
  getAllRisksByEvent: async (eventId, params = {}) => {
    const res = await axiosClient.get(`/api/events/${eventId}/risks/all`, { params });
    return res.data;
  },

  // Tạo risk mới
  // POST /api/events/:eventId/risks
  createRisk: async (eventId, data) => {
    const res = await axiosClient.post(`/api/events/${eventId}/risks`, data);
    return res.data;
  },

  // Lấy chi tiết một risk
  // GET /api/events/:eventId/risks/details/:riskId
  getRiskDetail: async (eventId, riskId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/risks/details/${riskId}`);
    return res.data;
  },

  // Cập nhật risk
  // PUT /api/events/:eventId/risks/details/:riskId
  updateRisk: async (eventId, riskId, data) => {
    const res = await axiosClient.put(`/api/events/${eventId}/risks/details/${riskId}`, data);
    return res.data;
  },

  // Xóa risk
  // DELETE /api/events/:eventId/risks/details/:riskId
  deleteRisk: async (eventId, riskId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/risks/details/${riskId}`);
    return res.data;
  },

  // ========== OCCURRED RISK OPERATIONS ==========

  // Thêm occurred risk
  // POST /api/events/:eventId/risks/:riskId/occurred
  addOccurredRisk: async (eventId, riskId, data) => {
    const res = await axiosClient.post(`/api/events/${eventId}/risks/${riskId}/occurred`, data);
    return res.data;
  },

  // Cập nhật occurred risk
  // PUT /api/events/:eventId/risks/:riskId/occurred/:occurredRiskId
  updateOccurredRisk: async (eventId, riskId, occurredRiskId, data) => {
    const res = await axiosClient.put(`/api/events/${eventId}/risks/${riskId}/occurred/${occurredRiskId}`, data);
    return res.data;
  },

  // Xóa occurred risk
  // DELETE /api/events/:eventId/risks/:riskId/occurred/:occurredRiskId
  removeOccurredRisk: async (eventId, riskId, occurredRiskId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/risks/${riskId}/occurred/${occurredRiskId}`);
    return res.data;
  },

  // Lấy risks theo department
  // GET /api/events/:eventId/departments/:departmentId/risks
  getRisksByDepartment: async (eventId, departmentId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/departments/${departmentId}/risks`);
    return res.data;
  },

  

  // ========== UTILITY OPERATIONS ==========

  // Bulk update risk statuses
  // PATCH /api/events/:eventId/risks/bulk-status
  bulkUpdateRiskStatus: async (eventId, { riskIds, status }) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/risks/bulk-status`, {
      riskIds,
      status
    });
    return res.data;
  },

  // Export risk data
  // GET /api/events/:eventId/risks/export
  exportRiskData: async (eventId, params = {}) => {
    const res = await axiosClient.get(`/api/events/${eventId}/risks/export`, { 
      params,
      responseType: 'blob' // For file download
    });
    return res.data;
  },

  // ========== AUTO-STATUS UPDATE OPERATIONS ==========

  // Manual trigger risk status update
  // POST /api/events/:eventId/risks/:riskId/update-status
  updateRiskStatusManually: async (eventId, riskId) => {
    const res = await axiosClient.post(`/api/events/${eventId}/risks/${riskId}/update-status`);
    return res.data;
  },

  // Batch auto-update all risk statuses
  // POST /api/events/:eventId/risks/batch-update-status
  batchUpdateRiskStatuses: async (eventId) => {
    const res = await axiosClient.post(`/api/events/${eventId}/risks/batch-update-status`);
    return res.data;
  },


  // ========== GLOBAL OPERATIONS ==========

  // Lấy risk categories
  // GET /api/risks/categories
  getRiskCategories: async () => {
    const res = await axiosClient.get('/api/risks/categories');
    return res.data;
  },
};

// ========== HELPER FUNCTIONS ==========

export const riskApiHelpers = {
  // Format risk data for API
  formatRiskData: (riskData) => {
    return {
      ...riskData,
      // Convert any date fields to ISO string if needed
      createdAt: riskData.createdAt ? new Date(riskData.createdAt).toISOString() : undefined,
      updatedAt: riskData.updatedAt ? new Date(riskData.updatedAt).toISOString() : undefined
    };
  },

  // Format occurred risk data
  formatOccurredRiskData: (occurredData) => {
    return {
      ...occurredData,
      occurred_date: occurredData.occurred_date ? new Date(occurredData.occurred_date).toISOString() : new Date().toISOString(),
      occurred_status: occurredData.occurred_status || 'resolving'
    };
  },

  // Validate risk data before send
  validateRiskData: (riskData) => {
    const required = ['name', 'departmentId', 'risk_category', 'impact', 'likelihood', 'risk_mitigation_plan'];
    const missing = required.filter(field => !riskData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate enums
    const validCategories = [
      'infrastructure', 'mc-guests', 'communication', 'players', 'staffing',
      'communication_post', 'attendees', 'weather', 'time', 'timeline', 
      'tickets', 'collateral', 'game', 'sponsorship', 'finance', 
      'transportation', 'decor', 'others'
    ];
    
    const validImpacts = ['low', 'medium', 'high'];
    const validLikelihoods = ['very_low', 'low', 'medium', 'high', 'very_high'];
    const validStatuses = ['not_yet', 'resolved', 'cancelled'];

    if (!validCategories.includes(riskData.risk_category)) {
      throw new Error(`Invalid risk_category. Must be one of: ${validCategories.join(', ')}`);
    }

    if (!validImpacts.includes(riskData.impact)) {
      throw new Error(`Invalid impact. Must be one of: ${validImpacts.join(', ')}`);
    }

    if (!validLikelihoods.includes(riskData.likelihood)) {
      throw new Error(`Invalid likelihood. Must be one of: ${validLikelihoods.join(', ')}`);
    }

    if (riskData.risk_status && !validStatuses.includes(riskData.risk_status)) {
      throw new Error(`Invalid risk_status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return true;
  },

  // Validate occurred risk data
  validateOccurredRiskData: (occurredData) => {
    const required = ['occurred_name'];
    const missing = required.filter(field => !occurredData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields for occurred risk: ${missing.join(', ')}`);
    }

    const validOccurredStatuses = ['resolving', 'resolved'];
    if (occurredData.occurred_status && !validOccurredStatuses.includes(occurredData.occurred_status)) {
      throw new Error(`Invalid occurred_status. Must be one of: ${validOccurredStatuses.join(', ')}`);
    }

    return true;
  },

  // Build query params for filtering
  buildQueryParams: (filters = {}) => {
    const params = {};
    
    // Pagination
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    
    // Sorting
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;
    
    // Filtering
    if (filters.search) params.search = filters.search;
    if (filters.risk_category) params.risk_category = filters.risk_category;
    if (filters.impact) params.impact = filters.impact;
    if (filters.likelihood) params.likelihood = filters.likelihood;
    if (filters.risk_status) params.risk_status = filters.risk_status;
    if (filters.departmentId) params.departmentId = filters.departmentId;
    
    return params;
  },
};

// ========== ERROR HANDLING VERSION ==========

export const getFullMember = async (eventId) => {
  const res = await axiosClient.get(`/api/events/${eventId}/risks/full-members`);
  return res.data;
};

export const getAllOccurredRisksByEvent = async (eventId) => {
  const res = await axiosClient.get(`/api/events/${eventId}/risks/occurred-risks`);
  return res.data;
};

export const statisticRisk = async (eventId) => {
  const res = await axiosClient.get(`/api/events/${eventId}/risks/statistics`);
  return res.data;
};

export const riskApiWithErrorHandling = {
  // Wrapper function for error handling
  handleApiCall: async (apiCall) => {
    try {
      const response = await apiCall();
      return {
        success: true,
        data: response.data || response,
        message: response.message,
        pagination: response.pagination,
        total: response.total
      };
    } catch (error) {
      console.error('Risk API Error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'An error occurred',
        statusCode: error.response?.status,
        details: error.response?.data
      };
    }
  },

  // ===== BASIC CRUD WITH ERROR HANDLING =====
  
  listRisksByEvent: async (eventId, params = {}) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.listRisksByEvent(eventId, params)
    );
  },

  getAllRisksByEvent: async (eventId, params = {}) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.getAllRisksByEvent(eventId, params)
    );
  },

  createRisk: async (eventId, data) => {
    return riskApiWithErrorHandling.handleApiCall(() => {
      riskApiHelpers.validateRiskData(data);
      return riskApi.createRisk(eventId, riskApiHelpers.formatRiskData(data));
    });
  },

  getRiskDetail: async (eventId, riskId) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.getRiskDetail(eventId, riskId)
    );
  },

  updateRisk: async (eventId, riskId, data) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.updateRisk(eventId, riskId, riskApiHelpers.formatRiskData(data))
    );
  },

  deleteRisk: async (eventId, riskId) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.deleteRisk(eventId, riskId)
    );
  },

  statisticRisk: async (eventId, riskId) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.statisticRisk(eventId, riskId)
    );
  },

  // ===== OCCURRED RISK WITH ERROR HANDLING =====

  addOccurredRisk: async (eventId, riskId, data) => {
    return riskApiWithErrorHandling.handleApiCall(() => {
      riskApiHelpers.validateOccurredRiskData(data);
      return riskApi.addOccurredRisk(eventId, riskId, riskApiHelpers.formatOccurredRiskData(data));
    });
  },

  updateOccurredRisk: async (eventId, riskId, occurredRiskId, data) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.updateOccurredRisk(eventId, riskId, occurredRiskId, riskApiHelpers.formatOccurredRiskData(data))
    );
  },

  removeOccurredRisk: async (eventId, riskId, occurredRiskId) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.removeOccurredRisk(eventId, riskId, occurredRiskId)
    );
  },

  getRisksByDepartment: async (eventId, departmentId) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.getRisksByDepartment(eventId, departmentId)
    );
  },

  // ===== UTILITIES WITH ERROR HANDLING =====

  bulkUpdateRiskStatus: async (eventId, data) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.bulkUpdateRiskStatus(eventId, data)
    );
  },

  updateRiskStatusManually: async (eventId, riskId) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.updateRiskStatusManually(eventId, riskId)
    );
  },

  batchUpdateRiskStatuses: async (eventId) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.batchUpdateRiskStatuses(eventId)
    );
  },

  // ===== GLOBAL METHODS WITH ERROR HANDLING =====

  getRiskCategories: async () => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.getRiskCategories()
    );
  },
};

export default riskApi;