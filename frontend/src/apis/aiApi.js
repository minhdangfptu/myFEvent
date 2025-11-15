import axiosClient from './axiosClient';

export const aiApi = {
  // Generate WBS using JSON input
  generateWBS: async (eventId, data) => {
    const res = await axiosClient.post(`/api/events/${eventId}/ai/generate-wbs`, data);
    return res.data;
  },

  // Chat with AI to generate WBS
  chat: async (eventId, message, sessionId = null) => {
    const payload = { message };
    if (sessionId != null) {
      payload.session_id = sessionId;
      payload.sessionId = sessionId;
    }
    const res = await axiosClient.post(`/api/events/${eventId}/ai/chat`, payload);
    return res.data;
  },

  // Apply generated WBS to event
  applyWBS: async (eventId, wbsData, sessionId = null) => {
    const payload = {
      epics: wbsData.epics || wbsData.epics_task || [],
      tasks: wbsData.tasks || [],
      risks: wbsData.risks || {},
    };
    if (sessionId != null) {
      payload.session_id = sessionId;
      payload.sessionId = sessionId;
    }
    const res = await axiosClient.post(`/api/events/${eventId}/ai/apply-wbs`, payload);
    return res.data;
  },

  // Get conversation history
  getConversationHistory: async (eventId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/ai/conversations`);
    return res.data;
  },

  // Get specific conversation by session ID
  getConversationBySession: async (eventId, sessionId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/ai/conversations/${sessionId}`);
    return res.data;
  },
};



