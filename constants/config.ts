// Use environment variable or fallback to local IP
// Note: Backend runs on port 5050 by default (see backend/src/server.js)
// IMPORTANT: 
// - For physical devices: Use your network IP (e.g., http://192.168.69.72:5050)
// - For iOS Simulator/Android Emulator: Use localhost (http://localhost:5050)
// - Set EXPO_PUBLIC_API_URL when starting Expo: EXPO_PUBLIC_API_URL="http://YOUR_IP:5050" npx expo start -c
// Find your IP with: ifconfig | grep "inet " | grep -v 127.0.0.1
// Current network IP: 192.168.69.72 (update if changed)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050';

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: `${API_URL}/api/auth/signup`,
    LOGIN: `${API_URL}/api/auth/login`,
    ME: `${API_URL}/api/auth/me`,
    PATIENTS: `${API_URL}/api/auth/patients`,
  },
  MOODS: {
    ALL_PATIENTS: `${API_URL}/api/moods/all-patients`,
  },
  GRATITUDE: {
    ENTRIES: `${API_URL}/api/gratitude`,
    DRAFTS: `${API_URL}/api/gratitude/drafts`,
    ALL_PATIENTS: `${API_URL}/api/gratitude/all-patients`,
  },
  MEETINGS: {
    BASE: `${API_URL}/api/meetings`,
    REQUEST: `${API_URL}/api/meetings/request`,
    REQUESTS: `${API_URL}/api/meetings/requests`,
    MY_REQUESTS: `${API_URL}/api/meetings/my-requests`,
    CLINICIANS: `${API_URL}/api/meetings/clinicians`,
    ACCEPT: (requestId: string) => `${API_URL}/api/meetings/accept/${requestId}`,
    REJECT: (requestId: string) => `${API_URL}/api/meetings/reject/${requestId}`,
    CANCEL_REQUEST: (requestId: string) => `${API_URL}/api/meetings/cancel-request/${requestId}`,
    CANCEL: (meetingId: string) => `${API_URL}/api/meetings/cancel/${meetingId}`,
  },
  ROCKETCHAT: {
    LOGIN: `${API_URL}/api/rocketchat/login`,
    CREATE_DM: `${API_URL}/api/rocketchat/create-dm`,
    CONTACTS: `${API_URL}/api/rocketchat/contacts`,
  },
};
