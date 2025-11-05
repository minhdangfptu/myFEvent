import aiAxiosClient from './aiAxiosClient.js';

export const aiChatApi = {
  sendMessage: (payload) => aiAxiosClient.post('/api/chat/message', payload),
  getHistory: (sessionId) => aiAxiosClient.get(`/api/chat/sessions/${sessionId}/history`),
  listSessions: () => aiAxiosClient.get('/api/chat/sessions'),
  getSessionMeta: (sessionId) => aiAxiosClient.get(`/api/chat/sessions/${sessionId}`),
  clearSession: (sessionId) => aiAxiosClient.delete(`/api/chat/sessions/${sessionId}`),
  health: () => aiAxiosClient.get('/api/chat/health'),
};






