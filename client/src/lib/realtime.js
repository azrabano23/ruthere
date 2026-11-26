// Live updates. One socket for the whole app, opened straight to the API host (the Vercel
// proxy can't carry websockets) with a short-lived token from /auth/socket-token.
// Render's free server sleeps, so we reconnect quietly and tell listeners when we're back,
// so pages can reload what they might have missed.
import { io } from 'socket.io-client';
import { api } from './api.js';

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL?.trim() ||
  import.meta.env.VITE_API_URL?.trim() ||
  (import.meta.env.DEV ? 'http://localhost:4000' : 'https://ruthere-wew4.onrender.com')
).replace(/\/$/, '');

let socket = null;
const listeners = new Set(); // (event) => void, event.channel is 'trip' | 'group' | 'notice' | 'reconnected'

function emit(event) { for (const fn of listeners) { try { fn(event); } catch { /* one bad listener must not break the rest */ } } }

/** Opens the socket once. Safe to call many times. */
export function connect() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    auth: async (cb) => {
      try { cb({ token: (await api.socketToken()).token }); } catch { cb({}); }
    },
  });
  let wasConnected = false;
  socket.on('connect', () => { if (wasConnected) emit({ channel: 'reconnected' }); wasConnected = true; });
  socket.on('trip', (e) => emit({ channel: 'trip', ...e }));
  socket.on('group', (e) => emit({ channel: 'group', ...e }));
  socket.on('notice', (e) => emit({ channel: 'notice', ...e }));
  socket.connect();
  return socket;
}

export function disconnect() { socket?.disconnect(); socket = null; }

/** Hear every live event. Returns an unsubscribe function. */
export function onEvent(fn) { connect(); listeners.add(fn); return () => listeners.delete(fn); }

/** Ask to watch one trip (poster or rider only). Re-asks after a reconnect. */
export function watchTrip(tripId) {
  const s = connect();
  const ask = () => s.emit('watch', { tripId });
  if (s.connected) ask();
  s.on('connect', ask);
  return () => { s.off('connect', ask); s.emit('unwatch', { tripId }); };
}

/** Same for a shared-Uber group. */
export function watchGroup(groupId) {
  const s = connect();
  const ask = () => s.emit('watch', { groupId });
  if (s.connected) ask();
  s.on('connect', ask);
  return () => { s.off('connect', ask); s.emit('unwatch', { groupId }); };
}

/** One line a person can read for an event, or null if it needs no toast. */
export function describeEvent(e) {
  switch (e.type) {
    case 'seat_taken': return `${e.by ?? 'A rider'} took a seat. ${e.seatsLeft} left.`;
    case 'seat_released': return `${e.by ?? 'A rider'} gave up a seat. ${e.seatsLeft} open.`;
    case 'trip_cancelled': return `The driver cancelled ${e.route ?? 'your trip'}.`;
    case 'group_joined': return `${e.by ?? 'Someone'} joined your group.`;
    case 'group_left': return `${e.by ?? 'Someone'} left your group.`;
    case 'group_locked': return 'Your group is locked. Check the meeting spot.';
    case 'fare_entered': return 'The fare is in. See what you owe.';
    case 'group_cancelled': return 'Your group was cancelled.';
    default: return null;
  }
}
