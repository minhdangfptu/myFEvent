import axios from 'axios';
import { aiApiUrl } from '../config/index.js';

// Use Vite dev proxy to bypass CORS in development
const computedBaseURL = import.meta.env?.DEV ? '/ai' : aiApiUrl;

const aiAxiosClient = axios.create({
  baseURL: computedBaseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Retry once by swapping between localhost and 127.0.0.1 on network errors
aiAxiosClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config || {};
    const isNetworkError = !error.response;
    if (isNetworkError && !config._retryFallback) {
      const base = config.baseURL || computedBaseURL || '';
      const path = (config.url || '');
      const current = base.startsWith('/')
        ? (window?.location?.origin || '') + base + path
        : base + path;
      try {
        const url = new URL(current);
        let swapped = null;
        if (url.hostname === 'localhost') {
          swapped = current.replace('localhost', '127.0.0.1');
        } else if (url.hostname === '127.0.0.1') {
          swapped = current.replace('127.0.0.1', 'localhost');
        }
        if (swapped) {
          config._retryFallback = true;
          // Build absolute request using axios
          const method = (config.method || 'get').toLowerCase();
          return axios({
            method,
            url: swapped,
            headers: config.headers,
            data: config.data,
            timeout: config.timeout || 15000,
          });
        }
      } catch (_) {
        // ignore parsing errors
      }
    }
    return Promise.reject(error);
  }
);

export default aiAxiosClient;


