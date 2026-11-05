const BASE = (
  import.meta.env.VITE_API_URL?.trim() ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://ruthere-wew4.onrender.com')
).replace(/\/$/, '');

async function call(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000), // never leave a button spinning forever
    });
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw Object.assign(new Error(timedOut ? 'The server took too long to answer. Please try again.' : 'Failed to fetch'), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? (data.errors ?? []).join(', ') ?? 'Request failed'), { data, status: res.status });
  return data;
}

export const api = {
  requestCode: (email) => call('/auth/request-code', { method: 'POST', body: { email } }),
  verify: (email, code) => call('/auth/verify', { method: 'POST', body: { email, code } }),
  me: () => call('/auth/me'),
  updateMe: (patch) => call('/auth/me', { method: 'PATCH', body: patch }),
  signOut: () => call('/auth/signout', { method: 'POST' }),
  pickupSpots: () => call('/pickup-spots'),
  trips: () => call('/trips'),
  postTrip: (trip) => call('/trips', { method: 'POST', body: trip }),
  trip: (id) => call(`/trips/${id}`),
  myTrips: () => call('/trips/mine'),
  requestSeat: (id) => call(`/trips/${id}/request`, { method: 'POST' }),
  giveUpSeat: (id) => call(`/trips/${id}/request`, { method: 'DELETE' }),
  safetyResources: () => call('/safety/resources'),
  safetyAlert: (body) => call('/safety/alert', { method: 'POST', body }),
  cancelTrip: (id) => call(`/trips/${id}`, { method: 'DELETE' }),
};
