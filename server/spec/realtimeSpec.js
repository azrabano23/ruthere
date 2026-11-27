// Live updates: two people on one trip, each with a real Socket.IO connection to a real server.
import http from 'node:http';
import { io as connectClient } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { createStore } from '../src/db/store.js';
import { createRealtime } from '../src/lib/realtime.js';
import { signSocketToken, verifySocketToken, hashCode, CODE_TTL_MS } from '../src/lib/auth.js';
import { publish } from '../src/lib/events.js';

async function startServer() {
  delete process.env.DATABASE_URL;
  delete process.env.BREVO_API_KEY;
  const store = await createStore();
  const server = http.createServer(createApp(store));
  const io = createRealtime(server, store);
  server.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { store, server, io, base };
}

function httpClient(base) {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
}

async function signIn(store, http, email) {
  await http('POST', '/auth/request-code', { email });
  await store.codes.upsert(email, { codeHash: hashCode('123456'), expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 });
  return (await http('POST', '/auth/verify', { email, code: '123456' })).body.user;
}

const socketFor = (base, token) => connectClient(base, { auth: { token }, transports: ['websocket'], reconnection: false });
const once = (socket, event, ms = 2000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`no '${event}' within ${ms}ms`)), ms);
  socket.once(event, (payload) => { clearTimeout(t); resolve(payload); });
});
const connected = (socket) => new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
const watch = (socket, what) => new Promise((resolve) => socket.emit('watch', what, resolve));

const future = () => new Date(Date.now() + 3600_000).toISOString();
const casc = { label: 'College Ave Student Center', lat: 40.503, lng: -74.4516 };
const bsc = { label: 'Busch Student Center', lat: 40.5234, lng: -74.4582 };

describe('socket tokens', () => {
  it('round-trip and reject anything else', () => {
    const t = signSocketToken({ id: 'u1' });
    expect(verifySocketToken(t).sub).toBe('u1');
    expect(verifySocketToken('nonsense')).toBeNull();
    expect(verifySocketToken('')).toBeNull();
  });
});

describe('live updates', () => {
  let ctx, driver, rider, driverUser, riderUser, tripId;
  const sockets = [];

  beforeAll(async () => {
    ctx = await startServer();
    driver = httpClient(ctx.base); rider = httpClient(ctx.base);
    driverUser = await signIn(ctx.store, driver, 'driver@rutgers.edu');
    riderUser = await signIn(ctx.store, rider, 'rider@rutgers.edu');
    tripId = (await driver('POST', '/trips', { origin: casc, destination: bsc, departsAt: future(), seats: 2, pricePerSeatCents: 600 })).body.id;
  });
  afterAll(async () => { for (const s of sockets) s.disconnect(); ctx.io.close(); ctx.server.close(); });

  it('hands out a socket token only to a signed-in user', async () => {
    expect((await httpClient(ctx.base)('GET', '/auth/socket-token')).status).toBe(401);
    const r = await driver('GET', '/auth/socket-token');
    expect(r.status).toBe(200);
    expect(verifySocketToken(r.body.token).sub).toBe(driverUser.id);
  });

  it('refuses a socket with no token', async () => {
    const s = socketFor(ctx.base, undefined); sockets.push(s);
    await expectAsync(connected(s)).toBeRejected();
  });

  it('lets the driver see a rider take a seat within two seconds', async () => {
    const driverSocket = socketFor(ctx.base, (await driver('GET', '/auth/socket-token')).body.token); sockets.push(driverSocket);
    await connected(driverSocket);
    expect(await watch(driverSocket, { tripId })).toEqual({ ok: true });

    const seen = once(driverSocket, 'trip', 2000);
    expect((await rider('POST', `/trips/${tripId}/request`)).status).toBe(201);
    const event = await seen;
    expect(event.type).toBe('seat_taken');
    expect(event.tripId).toBe(tripId);
    expect(event.seatsLeft).toBe(1);
  });

  it('does not let a stranger watch a trip they are not on', async () => {
    const stranger = httpClient(ctx.base);
    await signIn(ctx.store, stranger, 'stranger@rutgers.edu');
    const s = socketFor(ctx.base, (await stranger('GET', '/auth/socket-token')).body.token); sockets.push(s);
    await connected(s);
    expect((await watch(s, { tripId })).ok).toBeFalse();
    let heard = false;
    s.on('trip', () => { heard = true; });
    await rider('DELETE', `/trips/${tripId}/request`); // seat_released goes to the trip room
    await new Promise((r) => setTimeout(r, 300));
    expect(heard).toBeFalse();
  });

  it('tells every rider personally when the driver cancels', async () => {
    await rider('POST', `/trips/${tripId}/request`);
    const riderSocket = socketFor(ctx.base, (await rider('GET', '/auth/socket-token')).body.token); sockets.push(riderSocket);
    await connected(riderSocket);
    const seen = once(riderSocket, 'notice', 2000); // no watch needed: notices go to the person
    expect((await driver('DELETE', `/trips/${tripId}`)).status).toBe(200);
    const event = await seen;
    expect(event.type).toBe('trip_cancelled');
    expect(event.route).toContain('College Ave Student Center');
  });

  it('forwards group events to a group room once groups exist', async () => {
    // Joshua's groups are not built yet; the realtime layer is ready for them.
    const s = socketFor(ctx.base, (await driver('GET', '/auth/socket-token')).body.token); sockets.push(s);
    await connected(s);
    expect((await watch(s, { groupId: 'g1' })).ok).toBeFalse(); // no group store yet, so refused
    ctx.store.groups = { isMember: async () => true };
    expect((await watch(s, { groupId: 'g1' })).ok).toBeTrue();
    const seen = once(s, 'group', 2000);
    publish('group_joined', { groupId: 'g1', by: 'Zen' });
    expect((await seen).type).toBe('group_joined');
  });
});
