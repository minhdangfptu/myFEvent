import axiosClient from './axiosClient';

export const riskApi = {
  // ========== BASIC CRUD OPERATIONS ==========
  
  // Lấy danh sách tất cả risks của một event
  // GET /:eventId/risk
  listRisksByEvent: async (eventId, params = {}) => {
    const res = await axiosClient.get(`/api/events/${eventId}/risks`, { params });
    return res.data;
  },

  // Tạo risk mới
  // POST /:eventId/risk
  createRisk: async (eventId, data) => {
    const res = await axiosClient.post(`/api/events/${eventId}/risks`, data);
    return res.data;
  },

  // ========== STATISTICS OPERATIONS ==========

  // Lấy thống kê risks
  // GET /:eventId/risk/stats
  getRiskStatistics: async (eventId, params = {}) => {
    const res = await axiosClient.get(`/api/events/${eventId}/risks/stats`, { params });
    return res.data;
  },

  // Lấy thống kê theo category
  // GET /:eventId/risk/stats/categories
  getRisksByCategoryStats: async (eventId, params = {}) => {
    const res = await axiosClient.get(`/api/events/${eventId}/risks/stats/categories`, { params });
    return res.data;
  },

  // ========== INDIVIDUAL RISK OPERATIONS ==========

  // Lấy chi tiết một risk
  // GET /:eventId/risk/:riskId
  getRiskDetail: async (eventId, riskId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/risks/${riskId}`);
    return res.data;
  },

  // Cập nhật risk
  // PATCH /:eventId/risk/:riskId
  updateRisk: async (eventId, riskId, data) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/risks/${riskId}`, data);
    return res.data;
  },

  // Xóa risk
  // DELETE /:eventId/risk/:riskId
  deleteRisk: async (eventId, riskId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/risks/${riskId}`);
    return res.data;
  }
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

  // Validate risk data before send
  validateRiskData: (riskData) => {
    const required = ['departmentId', 'name', 'risk_category', 'impact', 'risk_mitigation_plan', 'risk_response_plan'];
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
    const validStatuses = ['pending', 'resolved', 'cancelled'];

    if (!validCategories.includes(riskData.risk_category)) {
      throw new Error(`Invalid risk_category. Must be one of: ${validCategories.join(', ')}`);
    }

    if (!validImpacts.includes(riskData.impact)) {
      throw new Error(`Invalid impact. Must be one of: ${validImpacts.join(', ')}`);
    }

    if (riskData.risk_status && !validStatuses.includes(riskData.risk_status)) {
      throw new Error(`Invalid risk_status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return true;
  }
};

// ========== ERROR HANDLING VERSION ==========

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
        count: response.count
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'An error occurred',
        statusCode: error.response?.status
      };
    }
  },

  // Wrapped methods with error handling
  listRisksByEvent: async (eventId, params = {}) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.listRisksByEvent(eventId, params)
    );
  },

  createRisk: async (eventId, data) => {
    return riskApiWithErrorHandling.handleApiCall(() => {
      riskApiHelpers.validateRiskData(data);
      return riskApi.createRisk(eventId, data);
    });
  },

  getRiskDetail: async (eventId, riskId) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.getRiskDetail(eventId, riskId)
    );
  },

  updateRisk: async (eventId, riskId, data) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.updateRisk(eventId, riskId, data)
    );
  },

  deleteRisk: async (eventId, riskId) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.deleteRisk(eventId, riskId)
    );
  },

  getRiskStatistics: async (eventId, params = {}) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.getRiskStatistics(eventId, params)
    );
  },

  getRisksByCategoryStats: async (eventId, params = {}) => {
    return riskApiWithErrorHandling.handleApiCall(() => 
      riskApi.getRisksByCategoryStats(eventId, params)
    );
  }
};

export default riskApi;