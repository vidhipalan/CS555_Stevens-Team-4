// Use environment variable or fallback to local IP
// Note: Backend runs on port 5050 by default (see backend/src/server.js)
// IMPORTANT: 
// - For physical devices: Use your network IP (e.g., http://10.214.87.72:5050)
// - For iOS Simulator/Android Emulator: Use localhost (http://localhost:5050)
// - Set EXPO_PUBLIC_API_URL when starting Expo: EXPO_PUBLIC_API_URL="http://YOUR_IP:5050" npx expo start -c
// Find your IP with: ifconfig | grep "inet " | grep -v 127.0.0.1
// Current network IP: 10.214.87.72 (Wi-Fi interface - use this for mobile!)
// NOTE: 192.168.217.29 is a VPN interface and won't work for mobile devices
// Default to localhost for simulators, but you MUST set EXPO_PUBLIC_API_URL for physical devices
// NOTE: .env files don't work with Expo - use command line: EXPO_PUBLIC_API_URL="http://10.214.87.72:5050" npx expo start -c
// IMPORTANT: 192.168.217.29 is a VPN interface (utun5) - use 10.214.87.72 (en0 Wi-Fi) instead!
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050';

// Debug: Log the API URL being used (remove in production)
if (__DEV__) {
  console.log('═══════════════════════════════════════');
  console.log('🔗 API Configuration:');
  console.log('   API_URL:', API_URL);
  console.log('   EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL || '❌ NOT SET (using localhost)');
  console.log('   ⚠️  If you see localhost above, the env var is not set!');
  console.log('   Run: EXPO_PUBLIC_API_URL="http://10.214.87.72:5050" npx expo start -c');
  console.log('═══════════════════════════════════════');
}

export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: `${API_URL}/api/auth/signup`,
    LOGIN: `${API_URL}/api/auth/login`,
    ME: `${API_URL}/api/auth/me`,
    PATIENTS: `${API_URL}/api/auth/patients`,
    ALL_PATIENTS: `${API_URL}/api/auth/all-patients`,
    ASSIGN_PATIENT: `${API_URL}/api/auth/assign-patient`,
    UNASSIGN_PATIENT: `${API_URL}/api/auth/unassign-patient`,
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
    MESSAGES: (roomId: string) => `${API_URL}/api/rocketchat/messages/${roomId}`,
    SEND_MESSAGE: `${API_URL}/api/rocketchat/send-message`,
    UNREAD_COUNT: `${API_URL}/api/rocketchat/unread-count`,
  },
};
