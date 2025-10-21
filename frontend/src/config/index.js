// API Configuration
export const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8017';

// Google OAuth Configuration
export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// App Configuration
export const appConfig = {
    name: 'myFEvent',
    version: '1.0.0',
    tokenRefreshBuffer: 60000, // Refresh token 1 minute before expiry
};