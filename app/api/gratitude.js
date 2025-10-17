const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050';

async function ensureOk(res) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

// Get all gratitude entries with optional filters
export async function getGratitudeEntries(token, params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.isDraft !== undefined) queryParams.append('isDraft', params.isDraft);

  const query = queryParams.toString();
  const url = `${BASE}/api/gratitude${query ? `?${query}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  return ensureOk(response);
}

// Get single gratitude entry
export async function getGratitudeEntry(token, id) {
  const response = await fetch(`${BASE}/api/gratitude/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  return ensureOk(response);
}

// Create new gratitude entry
export async function createGratitudeEntry(token, entryData) {
  const response = await fetch(`${BASE}/api/gratitude`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entryData),
  });
  
  return ensureOk(response);
}

// Update gratitude entry
export async function updateGratitudeEntry(token, id, entryData) {
  const response = await fetch(`${BASE}/api/gratitude/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entryData),
  });
  
  return ensureOk(response);
}

// Delete gratitude entry
export async function deleteGratitudeEntry(token, id) {
  const response = await fetch(`${BASE}/api/gratitude/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  return ensureOk(response);
}

// Get gratitude entries by date
export async function getGratitudeEntriesByDate(token, date) {
  const response = await fetch(`${BASE}/api/gratitude/date/${date}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  return ensureOk(response);
}

// Get draft entries
export async function getDraftEntries(token) {
  const response = await fetch(`${BASE}/api/gratitude/drafts`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  return ensureOk(response);
}
