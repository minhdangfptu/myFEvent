import axiosClient from './axiosClient';

export const feedbackApi = {
  // HoOC - List all forms for an event
  listFormsByEvent: async (eventId, page = 1, limit = 10) => {
    const response = await axiosClient.get(`/api/feedback/event/${eventId}/forms`, {
      params: { page, limit }
    });
    return response.data;
  },
  // HoOC - List all forms for an event
  listFormsNameByEvent: async (eventId, page = 1, limit = 10) => {
    const response = await axiosClient.get(`/api/feedback/event/${eventId}/forms-name`, {
      params: { page, limit }
    });
    return response.data;
  },

  // HoOC - Create a new form
  createForm: async (eventId, formData) => {
    const response = await axiosClient.post(`/api/feedback/event/${eventId}/forms`, formData);
    return response.data;
  },

  // HoOC - Get form detail
  getFormDetail: async (eventId, formId) => {
    const response = await axiosClient.get(`/api/feedback/event/${eventId}/forms/${formId}`);
    return response.data;
  },

  // HoOC - Update form
  updateForm: async (eventId, formId, formData) => {
    const response = await axiosClient.patch(`/api/feedback/event/${eventId}/forms/${formId}`, formData);
    return response.data;
  },

  // HoOC - Delete form
  deleteForm: async (eventId, formId) => {
    const response = await axiosClient.delete(`/api/feedback/event/${eventId}/forms/${formId}`);
    return response.data;
  },

  // HoOC - Publish form
  publishForm: async (eventId, formId) => {
    const response = await axiosClient.post(`/api/feedback/event/${eventId}/forms/${formId}/publish`);
    return response.data;
  },

  // HoOC - Close form
  closeForm: async (eventId, formId) => {
    const response = await axiosClient.post(`/api/feedback/event/${eventId}/forms/${formId}/close`);
    return response.data;
  },

  // HoOC - Reopen form
  reopenForm: async (eventId, formId) => {
    const response = await axiosClient.post(`/api/feedback/event/${eventId}/forms/${formId}/reopen`);
    return response.data;
  },

  // HoOC - Get form summary/statistics
  getFormSummary: async (eventId, formId) => {
    const response = await axiosClient.get(`/api/feedback/event/${eventId}/forms/${formId}/summary`);
    return response.data;
  },

  // Member - Get available forms to submit
  getAvailableForms: async (eventId) => {
    const response = await axiosClient.get(`/api/feedback/event/${eventId}/available-forms`);
    return response.data;
  },

  // Member - Submit feedback response
  submitResponse: async (eventId, formId, responses) => {
    const response = await axiosClient.post(`/api/feedback/event/${eventId}/forms/${formId}/submit`, {
      responses
    });
    return response.data;
  },

  // HoOC - Export form responses
  exportFormResponses: async (eventId, formId) => {
    const response = await axiosClient.get(`/api/feedback/event/${eventId}/forms/${formId}/export`);
    return response.data;
  }
};


