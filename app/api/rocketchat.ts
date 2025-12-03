import { API_ENDPOINTS } from '@/constants/config';
import * as SecureStore from 'expo-secure-store';

export interface RocketChatLogin {
  serverUrl: string;
  username: string;
  userId: string;
  authToken?: string;
  needsPassword?: boolean;
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

const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const getRocketChatLogin = async (): Promise<RocketChatLogin> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(API_ENDPOINTS.ROCKETCHAT.LOGIN, {
      headers,
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to get Rocket.Chat credentials';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    if (!data || !data.serverUrl) {
      throw new Error('Invalid response from Rocket.Chat server');
    }
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
    const response = await fetch(API_ENDPOINTS.ROCKETCHAT.CREATE_DM, {
      method: 'POST',
      headers,
      body: JSON.stringify({ otherUserId }),
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to create direct message';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    if (!data || (!data.roomName && !data.roomId)) {
      throw new Error('Invalid response: missing room information');
    }
    return data;
  } catch (error: any) {
    console.error('Error in createDirectMessage:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Failed to create direct message');
  }
};

export const getContacts = async (): Promise<Contact[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(API_ENDPOINTS.ROCKETCHAT.CONTACTS, {
      headers,
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to fetch contacts';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('Error in getContacts:', error);
    throw error instanceof Error ? error : new Error(error?.message || 'Failed to fetch contacts');
  }
};

