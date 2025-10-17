// Use environment variable or fallback to local IP
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.165:5000';

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: `${API_URL}/api/auth/signup`,
    LOGIN: `${API_URL}/api/auth/login`,
    ME: `${API_URL}/api/auth/me`,
  },
  MOODS: {
    ALL_PATIENTS: `${API_URL}/api/moods/all-patients`,
  },
  GRATITUDE: {
    ENTRIES: `${API_URL}/api/gratitude`,
    DRAFTS: `${API_URL}/api/gratitude/drafts`,
  },
};
