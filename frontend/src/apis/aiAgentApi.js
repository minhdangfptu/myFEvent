import axios from 'axios';
import { baseUrl } from '../config/index.js';
import authStorage from '../utils/authStorage.js';

// Tạo axios instance riêng cho AI với timeout dài hơn (180s)
// vì AI cần thời gian để gọi nhiều tool, RAG, và LLM
const aiAxiosClient = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 180000, // 180 giây (3 phút) cho AI xử lý
});

// Interceptor để thêm token
aiAxiosClient.interceptors.request.use(
  (config) => {
    const token = authStorage.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor để handle 401 và refresh token (giống axiosClient)
aiAxiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = authStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token available');

        const response = await axios.post(
          `${baseUrl}/api/auth/refresh-token`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const data = response?.data ?? {};
        const newAccessToken = data.accessToken || data.access_token;
        const newRefreshToken = data.refreshToken || data.refresh_token;
        if (!newAccessToken) throw new Error('No access token in refresh response');

        authStorage.setAccessToken(newAccessToken);
        if (newRefreshToken) {
          authStorage.setRefreshToken(newRefreshToken);
        }
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return aiAxiosClient(originalRequest);
      } catch (refreshError) {
        authStorage.clearAll();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        const path = (window.location.pathname || '').toLowerCase();
        if (!path.includes('/login') && !path.includes('/signup')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const aiAgentApi = {
  // historyMessages: [{ role, content }], options: { eventId?, sessionId? }
  runTurn: async (historyMessages = [], options = {}) => {
    const { eventId = null, sessionId = null } = options || {};
    const payload = {
      history_messages: historyMessages,
      eventId,
      sessionId,
    };
    const response = await aiAxiosClient.post(
      '/api/agent/event-planner/turn',
      payload
    );
    return response?.data;
  },

  // Apply kế hoạch EPIC/TASK mà agent đã sinh ra (preview → apply)
  applyPlan: async (plans = [], options = {}) => {
    const { eventId = null, sessionId = null } = options || {};
    const payload = {
      eventId,
      sessionId,
      plans,
    };
    const response = await aiAxiosClient.post(
      '/api/agent/event-planner/apply-plan',
      payload
    );
    return response?.data;
  },

  listSessions: async (eventId = null) => {
    const response = await aiAxiosClient.get(
      '/api/agent/event-planner/sessions',
      {
        params: { eventId },
      }
    );
    return response?.data;
  },

  getSession: async (sessionId, eventId = null) => {
    const response = await aiAxiosClient.get(
      `/api/agent/event-planner/sessions/${sessionId}`,
      {
        params: { eventId },
      }
    );
    return response?.data;
  },
};

