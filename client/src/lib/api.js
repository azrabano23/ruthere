// In production the API is reached through Vercel's /api rewrite (see vercel.json), so the
// session cookie is first-party. Calling Render directly makes it a cross-site cookie that
// browsers drop, and every request after sign-in fails with "Sign in first".
const BASE = (
  import.meta.env.VITE_API_URL?.trim() ||
  (import.meta.env.DEV ? 'http://localhost:4000' : '/api')
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
  socketToken: () => call('/auth/socket-token'),
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
  myStanding: () => call('/trust/me'),
  reportReasons: () => call('/trust/report-reasons'),
  report: (body) => call('/trust/reports', { method: 'POST', body }),
  block: (userId) => call('/trust/blocks', { method: 'POST', body: { userId } }),
  unblock: (userId) => call(`/trust/blocks/${userId}`, { method: 'DELETE' }),

  // Shared Uber Groups
  groups: () => call('/groups'),
  group: (id) => call(`/groups/${id}`),
  createGroup: (group) => call('/groups', { method: 'POST', body: group }),
  joinGroup: (id) => call(`/groups/${id}/join`, { method: 'POST' }),
  leaveGroup: (id) => call(`/groups/${id}/leave`, { method: 'DELETE' }),
  lockGroup: (id) => call(`/groups/${id}/lock`, { method: 'PATCH' }),
  updateGroupMeetingSpot: (id, meetingSpot) =>
    call(`/groups/${id}/meeting-spot`, { method: 'PATCH', body: { meetingSpot } }),
};
