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
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.ROCKETCHAT.LOGIN, {
    headers,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get Rocket.Chat credentials');
  }
  return response.json();
};

export const createDirectMessage = async (otherUserId: string): Promise<DirectMessageRoom> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.ROCKETCHAT.CREATE_DM, {
    method: 'POST',
    headers,
    body: JSON.stringify({ otherUserId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create direct message');
  }
  return response.json();
};

export const getContacts = async (): Promise<Contact[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.ROCKETCHAT.CONTACTS, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to fetch contacts');
  }
  return response.json();
};

