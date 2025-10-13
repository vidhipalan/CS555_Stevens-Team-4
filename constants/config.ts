// API Configuration
// Use your local IP address instead of localhost for mobile testing
// To find your IP: Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) in terminal
export const API_URL = 'http://192.168.1.165:5000';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: `${API_URL}/api/auth/signup`,
    LOGIN: `${API_URL}/api/auth/login`,
    ME: `${API_URL}/api/auth/me`,
  },
};
