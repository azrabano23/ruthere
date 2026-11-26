// Live updates over Socket.IO.
//
// The site on Vercel reaches the API through a proxy that can't carry websockets, so the
// browser opens the socket straight to Render. The session cookie doesn't travel that way,
// so the client first asks GET /auth/socket-token (through the proxy, signed in) and hands
// that short-lived token to the socket. Each socket then joins a private room per user, and
// may ask to watch a trip or group it belongs to. Events published on the bus are forwarded
// to those rooms, so nobody hears about a trip they are not on.
import { Server } from 'socket.io';
import { verifySocketToken } from './auth.js';
import { bus } from './events.js';
import { isAllowedOrigin } from './origins.js';

export const userRoom = (userId) => `user:${userId}`;
export const tripRoom = (tripId) => `trip:${tripId}`;
export const groupRoom = (groupId) => `group:${groupId}`;

/** May this user watch this trip? Poster or someone with a seat. */
export async function canWatchTrip(store, userId, tripId) {
  const trip = await store.trips.findById(tripId);
  if (!trip) return false;
  if (trip.posterId === userId) return true;
  return store.reservations.has(tripId, userId);
}

/** May this user watch this group? Only once Joshua's group store exists; refuse until then. */
export async function canWatchGroup(store, userId, groupId) {
  if (!store.groups?.isMember) return false;
  return store.groups.isMember(groupId, userId);
}

export function createRealtime(httpServer, store) {
  const io = new Server(httpServer, {
    cors: { origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)), credentials: true },
  });

  // Handshake: no valid token, no socket.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const payload = token ? verifySocketToken(token) : null;
    if (!payload) return next(new Error('Sign in first'));
    socket.data.userId = payload.sub;
    next();
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data;
    socket.join(userRoom(userId));

    socket.on('watch', async ({ tripId, groupId } = {}, ack) => {
      try {
        if (tripId && (await canWatchTrip(store, userId, tripId))) { socket.join(tripRoom(tripId)); return ack?.({ ok: true }); }
        if (groupId && (await canWatchGroup(store, userId, groupId))) { socket.join(groupRoom(groupId)); return ack?.({ ok: true }); }
        ack?.({ ok: false, error: "You're not on that trip" });
      } catch (e) { ack?.({ ok: false, error: e.message }); }
    });

    socket.on('unwatch', ({ tripId, groupId } = {}) => {
      if (tripId) socket.leave(tripRoom(tripId));
      if (groupId) socket.leave(groupRoom(groupId));
    });
  });

  // Fan out every published event to the rooms it names.
  const forward = (event) => {
    if (event.tripId) io.to(tripRoom(event.tripId)).emit('trip', event);
    if (event.groupId) io.to(groupRoom(event.groupId)).emit('group', event);
    for (const id of event.userIds ?? []) io.to(userRoom(id)).emit('notice', event);
  };
  bus.on('event', forward);
  io.on('close', () => bus.off('event', forward));

  return io;
}
