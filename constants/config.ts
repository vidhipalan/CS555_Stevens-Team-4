export const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: `${API_URL}/api/auth/signup`,
    LOGIN: `${API_URL}/api/auth/login`,
    ME: `${API_URL}/api/auth/me`,
  },
};
