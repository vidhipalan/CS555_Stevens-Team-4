const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050';

async function ensureOk(res) {
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

export async function getToday(token, date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const r = await fetch(`${BASE}/api/moods/today${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json(); // may be null
}

export async function saveToday(token, mood, note, date) {
  const r = await fetch(`${BASE}/api/moods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mood, note, date }),
  });
  return ensureOk(r);
}

export async function getHistory(token, limit = 60) {
  const r = await fetch(`${BASE}/api/moods?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return ensureOk(r);
}

