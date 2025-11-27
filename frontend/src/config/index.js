// API Configuration
// Remove trailing slash and trim whitespace to prevent //api issues
const rawBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
export const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '');

// Google OAuth Configuration
export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

//App Version Em Minh Dang code
export const APP_VERSION = '1.4.0';

// App Configuration
export const appConfig = {
    name: 'myFEvent',
    version: '1.0.0',
    tokenRefreshBuffer: 60000, // Refresh token 1 minute before expiry
};