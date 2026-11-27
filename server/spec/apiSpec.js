// End-to-end tests through the real HTTP routes against the in-memory store.
// Each describe block starts a fresh server on a random port.
import { createApp } from '../src/app.js';
import { createStore } from '../src/db/store.js';

async function startServer() {
  delete process.env.DATABASE_URL;
  delete process.env.BREVO_API_KEY; // codes print to console, we read them from the store instead
  const store = await createStore();
  const server = createApp(store).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { store, server, base };
}

/** Minimal client that remembers the session cookie, like a browser would. */
function client(base) {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(base + path, {
      method, headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
}

/** Sign a user in by requesting a code and reading it back out of the store. */
async function signIn(store, http, email) {
  const r1 = await http('POST', '/auth/request-code', { email });
  if (r1.status !== 200) return r1;
  // The store only keeps the hash, so set a known code directly, as the email would have told the user.
  const { hashCode, CODE_TTL_MS } = await import('../src/lib/auth.js');
  await store.codes.upsert(email, { codeHash: hashCode('123456'), expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 });
  return http('POST', '/auth/verify', { email, code: '123456' });
}

const future = () => new Date(Date.now() + 3600_000).toISOString();
const casc = { label: 'College Ave Student Center', lat: 40.503, lng: -74.4516 };
const bsc = { label: 'Busch Student Center', lat: 40.5234, lng: -74.4582 };

describe('API: sign in', () => {
  let ctx, http;
  beforeAll(async () => { ctx = await startServer(); http = client(ctx.base); });
  afterAll(() => ctx.server.close());

  it('rejects a non-Rutgers email', async () => {
    const r = await http('POST', '/auth/request-code', { email: 'me@gmail.com' });
    expect(r.status).toBe(400);
  });
  it('rejects a wrong code and counts the attempt', async () => {
    await http('POST', '/auth/request-code', { email: 'a@rutgers.edu' });
    const r = await http('POST', '/auth/verify', { email: 'a@rutgers.edu', code: '000000' });
    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('wrong');
    expect((await ctx.store.codes.get('a@rutgers.edu')).attempts).toBe(1);
  });
  it('locks after five wrong tries', async () => {
    for (let i = 0; i < 4; i++) await http('POST', '/auth/verify', { email: 'a@rutgers.edu', code: '000000' });
    const r = await http('POST', '/auth/verify', { email: 'a@rutgers.edu', code: '000000' });
    expect(r.body.reason).toBe('locked');
  });
  it('makes you wait before sending another code', async () => {
    const r = await http('POST', '/auth/request-code', { email: 'a@rutgers.edu' });
    expect(r.status).toBe(429);
    expect(r.body.retryAfterSeconds).toBeGreaterThan(0);
  });
  it('creates the account on the first correct code and sets a session', async () => {
    const r = await signIn(ctx.store, http, 'b@scarletmail.rutgers.edu');
    expect(r.status).toBe(200);
    expect(r.body.isNew).toBeTrue();
    const me = await http('GET', '/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('b@scarletmail.rutgers.edu');
  });
  it('requires a session for protected routes', async () => {
    const anon = client(ctx.base);
    expect((await anon('GET', '/trips')).status).toBe(401);
  });
});

describe('API: trips and seats', () => {
  let ctx, driver, rider1, rider2, tripId;
  beforeAll(async () => {
    ctx = await startServer();
    driver = client(ctx.base); rider1 = client(ctx.base); rider2 = client(ctx.base);
    await signIn(ctx.store, driver, 'driver@rutgers.edu');
    await signIn(ctx.store, rider1, 'r1@rutgers.edu');
    await signIn(ctx.store, rider2, 'r2@rutgers.edu');
  });
  afterAll(() => ctx.server.close());

  it('rejects an invalid trip with readable errors', async () => {
    const r = await driver('POST', '/trips', { origin: casc, destination: casc, departsAt: future(), seats: 0 });
    expect(r.status).toBe(400);
    expect(r.body.errors).toContain('Pickup and destination must be different');
  });
  it('posts a trip and lists it', async () => {
    const r = await driver('POST', '/trips', { origin: casc, destination: bsc, departsAt: future(), seats: 1, pricePerSeatCents: 600 });
    expect(r.status).toBe(201);
    tripId = r.body.id;
    const list = await rider1('GET', '/trips');
    expect(list.body.map((t) => t.id)).toContain(tripId);
    const mine = await driver('GET', '/trips/mine');
    expect(mine.body.length).toBe(1);
  });
  it('shows seats left and lets one rider take the last seat', async () => {
    expect((await rider1('GET', `/trips/${tripId}`)).body.seatsLeft).toBe(1);
    expect((await rider1('POST', `/trips/${tripId}/request`)).status).toBe(201);
    const full = await rider2('POST', `/trips/${tripId}/request`);
    expect(full.status).toBe(409);
    expect(full.body.reason).toBe('full');
    expect((await driver('POST', `/trips/${tripId}/request`)).body.reason).toBe('own_trip');
  });
  it('frees the seat when a rider gives it up', async () => {
    expect((await rider1('DELETE', `/trips/${tripId}/request`)).body.seatsLeft).toBe(1);
    expect((await rider2('POST', `/trips/${tripId}/request`)).status).toBe(201);
  });
  it('only lets the poster cancel', async () => {
    expect((await rider1('DELETE', `/trips/${tripId}`)).status).toBe(403);
    expect((await driver('DELETE', `/trips/${tripId}`)).status).toBe(200);
    expect((await rider1('GET', `/trips/${tripId}`)).status).toBe(404);
  });
});

describe('API: safety', () => {
  let ctx, http;
  beforeAll(async () => { ctx = await startServer(); http = client(ctx.base); await signIn(ctx.store, http, 's@rutgers.edu'); });
  afterAll(() => ctx.server.close());

  it('lists 911 and RUPD', async () => {
    const r = await http('GET', '/safety/resources');
    expect(r.body.map((x) => x.id)).toEqual(jasmine.arrayContaining(['911', 'rupd']));
  });
  it('refuses to alert when no emergency contact is set', async () => {
    const r = await http('POST', '/safety/alert', { location: { lat: 40.5, lng: -74.45 } });
    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('no_contact');
  });
  it('alerts the emergency contact once one is saved', async () => {
    await http('PATCH', '/auth/me', { emergencyContactName: 'Mom', emergencyContactPhone: '732-555-0100' });
    const r = await http('POST', '/safety/alert', { location: { lat: 40.5, lng: -74.45 } });
    expect(r.status).toBe(200);
    expect(r.body.notified).toBe('Mom');
  });
});

describe('API: browser origins', () => {
  let ctx;
  beforeAll(async () => { ctx = await startServer(); });
  afterAll(() => ctx.server.close());

  const ask = (origin) => fetch(ctx.base + '/health', { headers: { Origin: origin } }).then((r) => r.headers.get('access-control-allow-origin'));
  it('allows our vercel deployments', async () => {
    expect(await ask('https://ruthere-5buf.vercel.app')).toBe('https://ruthere-5buf.vercel.app');
    expect(await ask('https://ruthere-git-zen-azra-banos-projects.vercel.app')).toBe('https://ruthere-git-zen-azra-banos-projects.vercel.app');
  });
  it('allows the local dev server outside production', async () => {
    expect(await ask('http://localhost:5173')).toBe('http://localhost:5173');
  });
  it('refuses other sites', async () => {
    expect(await ask('https://evil.example.com')).toBeNull();
  });
});

describe('API: health and error messages', () => {
  it('reports the database in the health check', async () => {
    const ctx = await startServer();
    const r = await fetch(ctx.base + '/health').then((x) => x.json());
    expect(r).toEqual({ ok: true, store: 'memory', db: 'ok' });
    ctx.server.close();
  });
  it('turns an AggregateError into a readable message', async () => {
    const { describeError } = await import('../src/app.js');
    const agg = new AggregateError([new Error('connect ENETUNREACH 2600::1:5432')], '');
    expect(describeError(agg)).toBe('connect ENETUNREACH 2600::1:5432');
    expect(describeError(new Error('plain'))).toBe('plain');
    expect(describeError({})).toBe('Server error');
  });
});

describe('API: trust and safety', () => {
  let ctx, rider, driver, other, admin;
  const soon = (min) => new Date(Date.now() + min * 60_000).toISOString();
  const post = (http, min) => http('POST', '/trips', { origin: casc, destination: bsc, departsAt: soon(min), seats: 3 });

  beforeAll(async () => {
    process.env.ADMIN_EMAILS = 'boss@rutgers.edu';
    ctx = await startServer();
    [rider, driver, other, admin] = [client(ctx.base), client(ctx.base), client(ctx.base), client(ctx.base)];
    await signIn(ctx.store, rider, 'rider@rutgers.edu');
    await signIn(ctx.store, driver, 'driver@rutgers.edu');
    await signIn(ctx.store, other, 'other@rutgers.edu');
    await signIn(ctx.store, admin, 'boss@rutgers.edu');
    await driver('PATCH', '/auth/me', { displayName: 'Dee' });
  });
  afterAll(() => { ctx.server.close(); delete process.env.ADMIN_EMAILS; });

  it('gives no strike for leaving well ahead of departure', async () => {
    const trip = (await post(driver, 180)).body;
    await rider('POST', `/trips/${trip.id}/request`);
    const r = await rider('DELETE', `/trips/${trip.id}/request`);
    expect(r.status).toBe(200);
    expect(r.body.strike).toBeFalse();
  });

  it('shows the people on a trip only to people on it', async () => {
    const trip = (await post(driver, 180)).body;
    await rider('POST', `/trips/${trip.id}/request`);
    const mine = await rider('GET', `/trips/${trip.id}`);
    expect(mine.body.people).toEqual([jasmine.objectContaining({ displayName: 'Dee', role: 'driver' })]);
    expect((await other('GET', `/trips/${trip.id}`)).body.people).toEqual([]);
    await rider('DELETE', `/trips/${trip.id}/request`);
  });

  it('strikes three late cancels, then pauses ride requests for a week', async () => {
    let last;
    for (let i = 1; i <= 3; i++) {
      const trip = (await post(driver, 30)).body;
      expect((await rider('POST', `/trips/${trip.id}/request`)).status).toBe(201);
      last = await rider('DELETE', `/trips/${trip.id}/request`);
      expect(last.body.strike).toBeTrue();
      expect(last.body.strikes).toBe(i);
    }
    expect(Date.parse(last.body.suspendedUntil) - Date.now()).toBeGreaterThan(6.9 * 24 * 3600_000);
    const next = (await post(driver, 120)).body;
    const refused = await rider('POST', `/trips/${next.id}/request`);
    expect(refused.status).toBe(403);
    expect(refused.body.reason).toBe('suspended');
    const standing = await rider('GET', '/trust/me');
    expect(standing.body.strikes).toBe(3);
    expect(standing.body.suspendedUntil).toBeTruthy();
  });

  it('hides blocked people from each other and stops them joining', async () => {
    const driverId = (await driver('GET', '/auth/me')).body.user.id;
    const otherId = (await other('GET', '/auth/me')).body.user.id;
    const trip = (await post(driver, 180)).body;
    expect((await other('POST', '/trust/blocks', { userId: driverId })).status).toBe(201);
    expect((await other('GET', '/trips')).body.some((t) => t.id === trip.id)).toBeFalse();
    expect((await other('GET', `/trips/${trip.id}`)).status).toBe(404);
    const join = await other('POST', `/trips/${trip.id}/request`);
    expect(join.status).toBe(409);
    expect(join.body.reason).toBe('blocked');
    // Works both ways: the driver no longer sees trips from the person who blocked them.
    const otherTrip = (await post(other, 180)).body;
    expect((await driver('GET', '/trips')).body.some((t) => t.id === otherTrip.id)).toBeFalse();
    expect((await other('GET', '/trust/me')).body.blocked).toEqual([{ id: driverId, displayName: 'Dee' }]);
    expect((await other('DELETE', `/trust/blocks/${driverId}`)).status).toBe(200);
    expect((await other('GET', '/trips')).body.some((t) => t.id === trip.id)).toBeTrue();
    expect((await other('POST', '/trust/blocks', { userId: otherId })).status).toBe(400);
  });

  it('takes a report and lets only an admin act on it', async () => {
    const driverId = (await driver('GET', '/auth/me')).body.user.id;
    expect((await other('POST', '/trust/reports', { userId: driverId, reason: 'made-up' })).status).toBe(400);
    const made = await other('POST', '/trust/reports', { userId: driverId, reason: 'unsafe', details: 'Ran a red light' });
    expect(made.status).toBe(201);
    expect((await other('GET', '/trust/reports')).status).toBe(403);
    const queue = await admin('GET', '/trust/reports');
    expect(queue.body.reports.length).toBe(1);
    expect(queue.body.reports[0].reported.email).toBe('driver@rutgers.edu');
    const done = await admin('POST', `/trust/reports/${made.body.id}/suspend`);
    expect(done.status).toBe(200);
    expect((await driver('GET', '/auth/me')).body.user.suspendedUntil).toBeTruthy();
    expect((await admin('POST', `/trust/reports/${made.body.id}/dismiss`)).status).toBe(409);
  });

  it('returns a ready-to-send text and accepts a contact with only an email', async () => {
    expect((await other('PATCH', '/auth/me', { emergencyContactEmail: 'not an email' })).status).toBe(400);
    await other('PATCH', '/auth/me', { emergencyContactName: 'Mom', emergencyContactEmail: 'mom@example.com' });
    const emailOnly = await other('POST', '/safety/alert', { location: { lat: 40.5, lng: -74.45 } });
    expect(emailOnly.status).toBe(200);
    expect(emailOnly.body.smsTo).toBeNull();
    expect(emailOnly.body.emailed).toBeFalse(); // no Brevo key in tests, so nothing is sent
    await other('PATCH', '/auth/me', { emergencyContactPhone: '732-555-0100' });
    const both = await other('POST', '/safety/alert', { location: { lat: 40.5, lng: -74.45 } });
    expect(both.body.smsTo).toBe('732-555-0100');
    expect(both.body.message).toContain('https://maps.google.com/?q=40.5,-74.45');
  });
});
