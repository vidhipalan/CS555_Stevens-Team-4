import { API_ENDPOINTS } from '@/constants/config';
import * as SecureStore from 'expo-secure-store';

export interface RocketChatLogin {
  serverUrl: string;
  username: string;
  userId: string;
  authToken?: string;
}

export interface Contact {
  _id: string;
  email: string;
}

export interface DirectMessageRoom {
  roomId: string;
  roomName: string;
  serverUrl: string;
}

export interface Message {
  _id: string;
  text: string;
  userId: string;
  username: string;
  name: string;
  timestamp: number;
  createdAt: string;
}

const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// Helper function to add timeout to fetch requests
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout. Please check your network connection and ensure the backend server is running at ${url.split('/api')[0]}`);
    }
    if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to server. Please check:\n1. Backend is running\n2. IP address is correct (current: ${url.split('/api')[0]})\n3. Phone and computer are on same Wi-Fi`);
    }
    throw error;
  }
};

export const getRocketChatLogin = async (): Promise<RocketChatLogin> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(API_ENDPOINTS.ROCKETCHAT.LOGIN, {
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get Rocket.Chat credentials' }));
      throw new Error(error.error || 'Failed to get Rocket.Chat credentials');
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error in getRocketChatLogin:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Failed to get Rocket.Chat credentials');
  }
};

export const createDirectMessage = async (otherUserId: string): Promise<DirectMessageRoom> => {
  try {
    if (!otherUserId) {
      throw new Error('Other user ID is required');
    }
    
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(API_ENDPOINTS.ROCKETCHAT.CREATE_DM, {
      method: 'POST',
      headers,
      body: JSON.stringify({ otherUserId }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create direct message' }));
      throw new Error(error.error || 'Failed to create direct message');
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error in createDirectMessage:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Failed to create direct message');
  }
};

export const getContacts = async (): Promise<Contact[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(API_ENDPOINTS.ROCKETCHAT.CONTACTS, {
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch contacts' }));
      throw new Error(error.error || 'Failed to fetch contacts');
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('Error in getContacts:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Failed to fetch contacts');
  }
};

export const getMessages = async (roomId: string): Promise<Message[]> => {
  try {
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(API_ENDPOINTS.ROCKETCHAT.MESSAGES(roomId), {
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch messages' }));
      throw new Error(error.error || 'Failed to fetch messages');
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('Error in getMessages:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Failed to fetch messages');
  }
};

export const sendMessage = async (roomId: string, message: string): Promise<Message> => {
  try {
    if (!roomId || !message) {
      throw new Error('Room ID and message are required');
    }
    
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(API_ENDPOINTS.ROCKETCHAT.SEND_MESSAGE, {
      method: 'POST',
      headers,
      body: JSON.stringify({ roomId, message }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(error.error || 'Failed to send message');
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Failed to send message');
  }
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(API_ENDPOINTS.ROCKETCHAT.UNREAD_COUNT, {
      headers,
    });
    
    if (!response.ok) {
      // Return 0 on error to not break UI
      return 0;
    }
    
    const data = await response.json();
    return data.unreadCount || 0;
  } catch (error: any) {
    console.error('Error in getUnreadCount:', error);
    return 0; // Return 0 on error
  }
};

