import { API_ENDPOINTS } from '@/constants/config';
import * as SecureStore from 'expo-secure-store';

export interface MeetingRequest {
  _id: string;
  patientId: {
    _id: string;
    email: string;
  };
  clinicianId: {
    _id: string;
    email: string;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  requestedDate: string;
  preferredTime?: string;
  message?: string;
  rejectionReason?: string;
  meetingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  _id: string;
  patientId: {
    _id: string;
    email: string;
  };
  clinicianId: {
    _id: string;
    email: string;
  };
  meetingId: string;
  meetingLink: string;
  scheduledTime: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface Clinician {
  _id: string;
  email: string;
  createdAt: string;
}

const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const getClinicians = async (): Promise<Clinician[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.MEETINGS.CLINICIANS, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to fetch clinicians');
  }
  return response.json();
};

export const createMeetingRequest = async (
  clinicianId: string,
  preferredTime?: string,
  message?: string
): Promise<MeetingRequest> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.MEETINGS.REQUEST, {
    method: 'POST',
    headers,
    body: JSON.stringify({ clinicianId, preferredTime, message }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create meeting request');
  }
  return response.json();
};

export const getMeetingRequests = async (): Promise<MeetingRequest[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.MEETINGS.REQUESTS, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to fetch meeting requests');
  }
  return response.json();
};

export const getMyMeetingRequests = async (): Promise<MeetingRequest[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.MEETINGS.MY_REQUESTS, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to fetch my meeting requests');
  }
  return response.json();
};

export const acceptMeetingRequest = async (
  requestId: string,
  scheduledTime: string
): Promise<{ meeting: Meeting; meetingRequest: MeetingRequest }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.MEETINGS.ACCEPT(requestId), {
    method: 'POST',
    headers,
    body: JSON.stringify({ scheduledTime }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to accept meeting request');
  }
  return response.json();
};

export const rejectMeetingRequest = async (requestId: string, reason?: string): Promise<MeetingRequest> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.MEETINGS.REJECT(requestId), {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason: reason || '' }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reject meeting request');
  }
  return response.json();
};

export const getMeetings = async (): Promise<Meeting[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.MEETINGS.BASE, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to fetch meetings');
  }
  return response.json();
};

export const getMeeting = async (meetingId: string): Promise<Meeting> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_ENDPOINTS.MEETINGS.BASE}/${meetingId}`, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to fetch meeting');
  }
  return response.json();
};

export const cancelMeetingRequest = async (requestId: string): Promise<MeetingRequest> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.MEETINGS.CANCEL_REQUEST(requestId), {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel meeting request');
  }
  return response.json();
};

export const cancelMeeting = async (meetingId: string): Promise<Meeting> => {
  const headers = await getAuthHeaders();
  const response = await fetch(API_ENDPOINTS.MEETINGS.CANCEL(meetingId), {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel meeting');
  }
  return response.json();
};

