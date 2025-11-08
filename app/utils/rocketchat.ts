import { API_ENDPOINTS } from '@/constants/config';
import * as SecureStore from 'expo-secure-store';

export interface RocketChatToken {
  authToken: string;
  userId: string;
  serverUrl: string;
  username: string;
}

export interface RocketChatMessage {
  _id: string;
  msg: string;
  ts: string;
  u: {
    _id: string;
    username: string;
    name?: string;
  };
  rid: string;
}

export interface RocketChatRoom {
  _id: string;
  name: string;
  t: string; // room type: 'd' (direct), 'c' (channel), 'p' (private)
  lastMessage?: RocketChatMessage;
  unread?: number;
}

/**
 * Get Rocket.Chat authentication token from backend
 */
export const getRocketChatToken = async (): Promise<RocketChatToken> => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(API_ENDPOINTS.ROCKETCHAT.LOGIN, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get chat token');
  }

  const data = await response.json();
  
  // Store Rocket.Chat credentials securely
  await SecureStore.setItemAsync('rocketchat_token', data.authToken);
  await SecureStore.setItemAsync('rocketchat_userId', data.userId);
  await SecureStore.setItemAsync('rocketchat_serverUrl', data.serverUrl);
  await SecureStore.setItemAsync('rocketchat_username', data.username);

  return data;
};

/**
 * Get stored Rocket.Chat token
 */
export const getStoredRocketChatToken = async (): Promise<RocketChatToken | null> => {
  try {
    const authToken = await SecureStore.getItemAsync('rocketchat_token');
    const userId = await SecureStore.getItemAsync('rocketchat_userId');
    const serverUrl = await SecureStore.getItemAsync('rocketchat_serverUrl');
    const username = await SecureStore.getItemAsync('rocketchat_username');

    if (!authToken || !userId || !serverUrl) {
      return null;
    }

    return {
      authToken,
      userId,
      serverUrl,
      username: username || '',
    };
  } catch (error) {
    console.error('Error getting stored Rocket.Chat token:', error);
    return null;
  }
};

/**
 * Make authenticated request to Rocket.Chat API
 */
export const rocketChatAPI = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = await getStoredRocketChatToken();
  if (!token) {
    throw new Error('Rocket.Chat not authenticated');
  }

  const url = `${token.serverUrl}/api/v1/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Auth-Token': token.authToken,
      'X-User-Id': token.userId,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Rocket.Chat API error');
  }

  return response.json();
};

/**
 * Get user's rooms/channels
 */
export const getRooms = async (): Promise<RocketChatRoom[]> => {
  const response = await rocketChatAPI('rooms.get');
  // Rocket.Chat returns rooms in update array
  if (response.update && Array.isArray(response.update)) {
    return response.update.map((room: any) => ({
      _id: room._id,
      name: room.name || room.fname || 'Unnamed',
      t: room.t,
      lastMessage: room.lastMessage,
      unread: room.unread,
    }));
  }
  return [];
};

/**
 * Get room messages
 */
export const getRoomMessages = async (
  roomId: string,
  count: number = 50
): Promise<RocketChatMessage[]> => {
  const response = await rocketChatAPI(
    `chat.getMessages?rid=${roomId}&count=${count}`
  );
  return response.messages || [];
};

/**
 * Send message to room
 */
export const sendMessage = async (
  roomId: string,
  message: string
): Promise<RocketChatMessage> => {
  const response = await rocketChatAPI('chat.postMessage', {
    method: 'POST',
    body: JSON.stringify({
      roomId,
      text: message,
    }),
  });
  return response.message;
};

/**
 * Create or get direct message room with another user
 */
export const createDirectMessage = async (
  username: string
): Promise<RocketChatRoom> => {
  const response = await rocketChatAPI('im.create', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  return response.room;
};

/**
 * Clear Rocket.Chat credentials
 */
export const clearRocketChatCredentials = async (): Promise<void> => {
  await SecureStore.deleteItemAsync('rocketchat_token');
  await SecureStore.deleteItemAsync('rocketchat_userId');
  await SecureStore.deleteItemAsync('rocketchat_serverUrl');
  await SecureStore.deleteItemAsync('rocketchat_username');
};

