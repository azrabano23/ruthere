// Store abstraction: Postgres when DATABASE_URL is set, in-memory otherwise.
import crypto from 'node:crypto';

export async function createStore() {
  if (process.env.DATABASE_URL) return pgStore(process.env.DATABASE_URL);
  console.warn('DATABASE_URL not set: using in-memory store (data resets on restart)');
  return memoryStore();
}

function memoryStore() {
  const users = new Map(), codes = new Map(), trips = new Map();
  const driverApps = new Map();
  return {
    kind: 'memory',
        driverApplications: {
      async create(userId, { carMakeModel, carColor, licensePlate, seatsAvailable }) {
        if ([...driverApps.values()].some((a) => a.userId === userId && a.status === 'pending')) throw Object.assign(new Error('Already pending'), { code: 'ALREADY_PENDING' });
        const a = { id: crypto.randomUUID(), userId, carMakeModel, carColor, licensePlate, seatsAvailable, status: 'pending', reviewedBy: null, reviewedAt: null, reviewNote: null, createdAt: new Date().toISOString() };
        driverApps.set(a.id, a); return { ...a };
      },
      async findById(id) { const a = driverApps.get(id); return a ? { ...a } : null; },
      async latestForUser(userId) { const mine = [...driverApps.values()].filter((a) => a.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); return mine[0] ? { ...mine[0] } : null; },
      async listByStatus(status) { return [...driverApps.values()].filter((a) => a.status === status).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((a) => ({ ...a })); },
      // Returns the updated application, or null if it doesn't exist or was already reviewed. Approving also approves the user.
      async review(id, { status, reviewerId, note = null }) {
        const a = driverApps.get(id);
        if (!a || a.status !== 'pending') return null;
        Object.assign(a, { status, reviewedBy: reviewerId, reviewedAt: new Date().toISOString(), reviewNote: note });
        if (status === 'approved' && users.has(a.userId)) users.set(a.userId, { ...users.get(a.userId), isDriverApproved: true });
        return { ...a };
      },
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
    },
  };
}

async function pgStore(connectionString) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false } });
  const userRow = (r) => r && { id: r.id, email: r.email, displayName: r.display_name, paymentHandle: r.payment_handle, isDriverApproved: r.is_driver_approved, createdAt: r.created_at };
  const appRow = (r) => r && { id: r.id, userId: r.user_id, carMakeModel: r.car_make_model, carColor: r.car_color, licensePlate: r.license_plate, seatsAvailable: r.seats_available, status: r.status, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at, reviewNote: r.review_note, createdAt: r.created_at };
  const tripRow = (r) => r && ({
    id: r.id, posterId: r.poster_id,
    origin: { label: r.origin_label, lat: r.origin_lat, lng: r.origin_lng },
    destination: { label: r.dest_label, lat: r.dest_lat, lng: r.dest_lng },
    departsAt: r.departs_at, seats: r.seats, pricePerSeatCents: r.price_per_seat_cents, notes: r.notes, createdAt: r.created_at,
  });
  return {
    kind: 'postgres',
        driverApplications: {
      async create(userId, { carMakeModel, carColor, licensePlate, seatsAvailable }) {
        try {
          return appRow((await pool.query(
            'insert into driver_applications(user_id,car_make_model,car_color,license_plate,seats_available) values($1,$2,$3,$4,$5) returning *',
            [userId, carMakeModel, carColor, licensePlate, seatsAvailable])).rows[0]);
        } catch (e) {
          if (e.code === '23505') throw Object.assign(new Error('Already pending'), { code: 'ALREADY_PENDING' }); // one pending per user (unique index)
          throw e;
        }
      },
      async findById(id) { return appRow((await pool.query('select * from driver_applications where id=$1', [id])).rows[0]) ?? null; },
      async latestForUser(userId) { return appRow((await pool.query('select * from driver_applications where user_id=$1 order by created_at desc limit 1', [userId])).rows[0]) ?? null; },
      async listByStatus(status) { return (await pool.query('select * from driver_applications where status=$1 order by created_at', [status])).rows.map(appRow); },
      // One transaction: mark the application reviewed and, if approved, set users.is_driver_approved.
      // "status = 'pending'" means two admins clicking at once can't both win.
      async review(id, { status, reviewerId, note = null }) {
        const client = await pool.connect();
        try {
          await client.query('begin');
          const row = (await client.query(
            "update driver_applications set status=$2, reviewed_by=$3, reviewed_at=now(), review_note=$4 where id=$1 and status='pending' returning *",
            [id, status, reviewerId, note])).rows[0];
          if (!row) { await client.query('rollback'); return null; }
          if (status === 'approved') await client.query('update users set is_driver_approved=true where id=$1', [row.user_id]);
          await client.query('commit');
          return appRow(row);
        } catch (e) {
          await client.query('rollback');
          throw e;
        } finally { client.release(); }
      },
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
    },
  };
}
