// Store abstraction: Postgres when DATABASE_URL is set, in-memory otherwise.
import crypto from 'node:crypto';
import { decideReservation } from '../lib/reservations.js';

export async function createStore() {
  if (process.env.DATABASE_URL) return pgStore(process.env.DATABASE_URL);
  console.warn('DATABASE_URL not set: using in-memory store (data resets on restart)');
  return memoryStore();
}

function memoryStore() {
  const users = new Map(), codes = new Map(), trips = new Map(), reservations = new Map(); // tripId -> Set(riderId)
  return {
    kind: 'memory',
    reservations: {
      // No `await` between the check and the insert: Node runs this block without
      // interruption, so concurrent callers are serialized and only one can take the last seat.
      async reserve(tripId, riderId) {
        const trip = trips.get(tripId) ?? null;
        const set = reservations.get(tripId) ?? new Set();
        const verdict = decideReservation({ trip, riderId, reservedCount: set.size, riderAlreadyIn: set.has(riderId) });
        if (verdict.ok) { set.add(riderId); reservations.set(tripId, set); }
        return verdict;
      },
      async countForTrip(tripId) { return reservations.get(tripId)?.size ?? 0; },
      async has(tripId, riderId) { return reservations.get(tripId)?.has(riderId) ?? false; },
    },
    users: {
      async findById(id) { return users.get(id) ?? null; },
      async findByEmail(email) { return [...users.values()].find((u) => u.email === email) ?? null; },
      async create({ email }) { const u = { id: crypto.randomUUID(), email, displayName: null, paymentHandle: null, isDriverApproved: false, createdAt: new Date().toISOString() }; users.set(u.id, u); return u; },
      async update(id, patch) { const u = { ...users.get(id) }; for (const k of ['displayName', 'paymentHandle']) if (patch[k] !== undefined) u[k] = patch[k]; users.set(id, u); return u; },
    },
    codes: {
      async upsert(email, rec) { codes.set(email, { ...rec }); },
      async get(email) { return codes.get(email) ?? null; },
      async bumpAttempts(email) { const c = codes.get(email); if (c) c.attempts += 1; },
      async delete(email) { codes.delete(email); },
    },
    trips: {
      async create(t) { const trip = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...t }; trips.set(trip.id, trip); return trip; },
      async findById(id) { return trips.get(id) ?? null; },
      async listUpcoming() { const now = Date.now(); return [...trips.values()].filter((t) => Date.parse(t.departsAt) > now).sort((a, b) => Date.parse(a.departsAt) - Date.parse(b.departsAt)); },
      async listByPoster(posterId) { return [...trips.values()].filter((t) => t.posterId === posterId).sort((a, b) => Date.parse(a.departsAt) - Date.parse(b.departsAt)); },
      async delete(id) { return trips.delete(id); },
    },
  };
}

async function pgStore(connectionString) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false } });
  const userRow = (r) => r && { id: r.id, email: r.email, displayName: r.display_name, paymentHandle: r.payment_handle, isDriverApproved: r.is_driver_approved, createdAt: r.created_at };
  const tripRow = (r) => r && ({
    id: r.id, posterId: r.poster_id,
    origin: { label: r.origin_label, lat: r.origin_lat, lng: r.origin_lng },
    destination: { label: r.dest_label, lat: r.dest_lat, lng: r.dest_lng },
    departsAt: r.departs_at, seats: r.seats, pricePerSeatCents: r.price_per_seat_cents, notes: r.notes, createdAt: r.created_at,
  });
  return {
    kind: 'postgres',
    reservations: {
      // One transaction per reservation. `FOR UPDATE` locks the trip row, so two riders
      // racing for the last seat are forced to run one after the other; the second one
      // sees the first's row and gets 'full'. unique(trip_id, rider_id) blocks double-joins.
      async reserve(tripId, riderId) {
        const client = await pool.connect();
        try {
          await client.query('begin');
          const trip = tripRow((await client.query('select * from trips where id=$1 for update', [tripId])).rows[0]);
          const reservedCount = Number((await client.query('select count(*)::int as n from seat_reservations where trip_id=$1', [tripId])).rows[0]?.n ?? 0);
          const riderAlreadyIn = (await client.query('select 1 from seat_reservations where trip_id=$1 and rider_id=$2', [tripId, riderId])).rowCount > 0;
          const verdict = decideReservation({ trip, riderId, reservedCount, riderAlreadyIn });
          if (verdict.ok) await client.query('insert into seat_reservations(trip_id, rider_id) values($1,$2)', [tripId, riderId]);
          await client.query('commit');
          return verdict;
        } catch (e) {
          await client.query('rollback');
          throw e;
        } finally { client.release(); }
      },
      async countForTrip(tripId) { return Number((await pool.query('select count(*)::int as n from seat_reservations where trip_id=$1', [tripId])).rows[0].n); },
      async has(tripId, riderId) { return (await pool.query('select 1 from seat_reservations where trip_id=$1 and rider_id=$2', [tripId, riderId])).rowCount > 0; },
    },
    users: {
      async findById(id) { return userRow((await pool.query('select * from users where id=$1', [id])).rows[0]); },
      async findByEmail(email) { return userRow((await pool.query('select * from users where email=$1', [email])).rows[0]); },
      async create({ email }) { return userRow((await pool.query('insert into users(email) values($1) returning *', [email])).rows[0]); },
      async update(id, { displayName, paymentHandle }) {
        return userRow((await pool.query('update users set display_name=coalesce($2,display_name), payment_handle=coalesce($3,payment_handle) where id=$1 returning *', [id, displayName ?? null, paymentHandle ?? null])).rows[0]);
      },
    },
    codes: {
      async upsert(email, { codeHash, expiresAt, attempts }) {
        await pool.query('insert into signin_codes(email,code_hash,expires_at,attempts) values($1,$2,to_timestamp($3/1000.0),$4) on conflict(email) do update set code_hash=excluded.code_hash, expires_at=excluded.expires_at, attempts=0', [email, codeHash, expiresAt, attempts]);
      },
      async get(email) { const r = (await pool.query('select * from signin_codes where email=$1', [email])).rows[0]; return r && { codeHash: r.code_hash, expiresAt: new Date(r.expires_at).getTime(), attempts: r.attempts }; },
      async bumpAttempts(email) { await pool.query('update signin_codes set attempts=attempts+1 where email=$1', [email]); },
      async delete(email) { await pool.query('delete from signin_codes where email=$1', [email]); },
    },
    trips: {
      async create(t) {
        const r = (await pool.query(
          `insert into trips(poster_id,origin_label,origin_lat,origin_lng,dest_label,dest_lat,dest_lng,departs_at,seats,price_per_seat_cents,notes)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
          [t.posterId, t.origin.label, t.origin.lat, t.origin.lng, t.destination.label, t.destination.lat, t.destination.lng, t.departsAt, t.seats, t.pricePerSeatCents, t.notes])).rows[0];
        return tripRow(r);
      },
      async findById(id) { return tripRow((await pool.query('select * from trips where id=$1', [id])).rows[0]); },
      async listUpcoming() { return (await pool.query('select * from trips where departs_at > now() order by departs_at asc limit 100')).rows.map(tripRow); },
      async listByPoster(posterId) { return (await pool.query('select * from trips where poster_id=$1 order by departs_at asc', [posterId])).rows.map(tripRow); },
      async delete(id) { return (await pool.query('delete from trips where id=$1', [id])).rowCount > 0; },
    },
  };
}
