// Store abstraction: Postgres when DATABASE_URL is set, in-memory otherwise.
import crypto from 'node:crypto';
import { decideReservation } from '../lib/reservations.js';

import {
  decideJoinGroup,
  decideLeaveGroup,
  decideLockGroup,
  decideUpdateMeetingSpot,
} from '../lib/groups.js';

export async function createStore() {
  if (process.env.DATABASE_URL) return pgStore(process.env.DATABASE_URL);
  console.warn('DATABASE_URL not set: using in-memory store (data resets on restart)');
  return memoryStore();
}

function memoryStore() {
  const users = new Map(), codes = new Map(), trips = new Map(), reservations = new Map(); // tripId -> Set(riderId)
  const driverApps = new Map();
  const strikes = [], reports = new Map(), blocks = new Set(); // blocks holds "blockerId:blockedId"
  const uberGroups = new Map(), uberGroupMembers = new Map();
  return {
    kind: 'memory',
    strikes: {
      async add(userId, { tripId = null, reason = 'late_cancel' } = {}) { const s = { id: crypto.randomUUID(), userId, tripId, reason, createdAt: new Date().toISOString() }; strikes.push(s); return { ...s }; },
      async listSince(userId, sinceIso) { return strikes.filter((s) => s.userId === userId && s.createdAt >= sinceIso).map((s) => ({ ...s })); },
    },
    reports: {
      async create(reporterId, { reportedId, tripId = null, reason, details = '' }) {
        const r = { id: crypto.randomUUID(), reporterId, reportedId, tripId, reason, details, status: 'open', reviewedBy: null, reviewedAt: null, createdAt: new Date().toISOString() };
        reports.set(r.id, r); return { ...r };
      },
      async listByStatus(status) { return [...reports.values()].filter((r) => r.status === status).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((r) => ({ ...r })); },
      // Returns the updated report, or null if it doesn't exist or was already reviewed.
      async review(id, { status, reviewerId }) {
        const r = reports.get(id);
        if (!r || r.status !== 'open') return null;
        Object.assign(r, { status, reviewedBy: reviewerId, reviewedAt: new Date().toISOString() });
        return { ...r };
      },
    },
    blocks: {
      async add(blockerId, blockedId) { blocks.add(`${blockerId}:${blockedId}`); },
      async remove(blockerId, blockedId) { return blocks.delete(`${blockerId}:${blockedId}`); },
      async listBlockedBy(blockerId) { return [...blocks].filter((k) => k.startsWith(`${blockerId}:`)).map((k) => k.split(':')[1]); },
      // Everyone hidden from this user: people they blocked and people who blocked them.
      async hiddenFor(userId) {
        const out = new Set();
        for (const k of blocks) { const [a, b] = k.split(':'); if (a === userId) out.add(b); if (b === userId) out.add(a); }
        return out;
      },
    },
    async ping() { return true; },
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
      async release(tripId, riderId) { return reservations.get(tripId)?.delete(riderId) ?? false; },
      async countForTrip(tripId) { return reservations.get(tripId)?.size ?? 0; },
      async has(tripId, riderId) { return reservations.get(tripId)?.has(riderId) ?? false; },
      async listRiders(tripId) { return [...(reservations.get(tripId) ?? [])]; },
    },
    users: {
      async findById(id) { return users.get(id) ?? null; },
      async findByEmail(email) { return [...users.values()].find((u) => u.email === email) ?? null; },
      async create({ email }) { const u = { id: crypto.randomUUID(), email, displayName: null, paymentHandle: null, isDriverApproved: false, emergencyContactName: null, emergencyContactPhone: null, emergencyContactEmail: null, suspendedUntil: null, createdAt: new Date().toISOString() }; users.set(u.id, u); return u; },
      async update(id, patch) { const u = { ...users.get(id) }; for (const k of ['displayName', 'paymentHandle', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactEmail']) if (patch[k] !== undefined) u[k] = patch[k]; users.set(id, u); return u; },
      async setSuspendedUntil(id, until) { const u = users.get(id); if (!u) return null; users.set(id, { ...u, suspendedUntil: until }); return users.get(id); },
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
    groups: {
      async create({ creatorId, meetingSpot, destination, departsAt, maxCapacity = 4 }) {
        const now = new Date().toISOString();
        const group = {
          id: crypto.randomUUID(),
          creatorId,
          meetingSpot: meetingSpot.trim(),
          destination: destination.trim(),
          departureTime: departsAt,
          maxCapacity,
          status: 'open',
          createdAt: now,
        };
        uberGroups.set(group.id, group);
        uberGroupMembers.set(group.id, [{ userId: creatorId, role: 'leader', joinedAt: now }]);
        return this.findById(group.id);
      },

      async findById(id) {
        const g = uberGroups.get(id);
        if (!g) return null;
        const rawMembers = uberGroupMembers.get(id) ?? [];
        const members = rawMembers.map((m) => {
          const u = users.get(m.userId);
          return {
            userId: m.userId,
            email: u?.email ?? null,
            displayName: u?.displayName ?? null,
            role: m.role,
            joinedAt: m.joinedAt,
          };
        });
        return { ...g, members };
      },

      async listActive() {
        const out = [];
        for (const g of uberGroups.values()) {
          if (g.status === 'open' || g.status === 'locked') {
            out.push(await this.findById(g.id));
          }
        }
        return out.sort((a, b) => Date.parse(a.departureTime) - Date.parse(b.departureTime));
      },

      async join(groupId, userId) {
        const group = uberGroups.get(groupId) ?? null;
        const members = uberGroupMembers.get(groupId) ?? [];
        const verdict = decideJoinGroup({
          group,
          userId,
          memberIds: members.map((m) => m.userId),
        });
        if (!verdict.ok) return verdict;

        members.push({ userId, role: 'member', joinedAt: new Date().toISOString() });
        uberGroupMembers.set(groupId, members);
        if (verdict.willAutoLock) group.status = 'locked';
        return { ok: true, group: await this.findById(groupId) };
      },

      async leave(groupId, userId) {
        const group = uberGroups.get(groupId) ?? null;
        const members = uberGroupMembers.get(groupId) ?? [];
        const verdict = decideLeaveGroup({ group, userId, members });
        if (!verdict.ok) return verdict;

        const remaining = members.filter((m) => m.userId !== userId);
        if (verdict.nextLeaderId) {
          const next = remaining.find((m) => m.userId === verdict.nextLeaderId);
          if (next) next.role = 'leader';
        }
        group.status = verdict.nextStatus;
        uberGroupMembers.set(groupId, remaining);
        return { ok: true, group: await this.findById(groupId) };
      },

      async lock(groupId, userId) {
        const group = uberGroups.get(groupId) ?? null;
        const members = uberGroupMembers.get(groupId) ?? [];
        const verdict = decideLockGroup({ group, userId, members });
        if (!verdict.ok) return verdict;

        group.status = 'locked';
        return { ok: true, group: await this.findById(groupId) };
      },

      async updateMeetingSpot(groupId, userId, meetingSpot) {
        const group = uberGroups.get(groupId) ?? null;
        const members = uberGroupMembers.get(groupId) ?? [];
        const verdict = decideUpdateMeetingSpot({ group, userId, members, meetingSpot });
        if (!verdict.ok) return verdict;

        group.meetingSpot = meetingSpot.trim();
        return { ok: true, group: await this.findById(groupId) };
      },
    },
  };
}

async function pgStore(connectionString) {
  const { default: pg } = await import('pg');
  // connectionTimeoutMillis: a database we can't reach (wrong URL, IPv6-only host) errors in 5s
  // instead of hanging the request forever.
  const pool = new pg.Pool({ connectionString, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
  pool.on('error', (err) => console.error('[db] idle client error', err.message));
  pool.query('select 1').then(
    () => console.log('[db] connected'),
    (err) => {
      const detail = err.message || (err.errors ?? []).map((e) => e.message).join('; ');
      console.error(`[db] cannot reach the database: ${detail}`);
      if (/ENETUNREACH|EHOSTUNREACH|ETIMEDOUT|timeout/i.test(detail)) console.error('[db] hint: on Supabase use the "Session pooler" connection string (IPv4), not the direct one; Render has no IPv6.');
    },
  );
  const userRow = (r) => r && { id: r.id, email: r.email, displayName: r.display_name, paymentHandle: r.payment_handle, isDriverApproved: r.is_driver_approved, emergencyContactName: r.emergency_contact_name, emergencyContactPhone: r.emergency_contact_phone, emergencyContactEmail: r.emergency_contact_email ?? null, suspendedUntil: r.suspended_until ? new Date(r.suspended_until).toISOString() : null, createdAt: r.created_at };
  const iso = (d) => (d ? new Date(d).toISOString() : null);
  const strikeRow = (r) => r && { id: r.id, userId: r.user_id, tripId: r.trip_id, reason: r.reason, createdAt: iso(r.created_at) };
  const reportRow = (r) => r && { id: r.id, reporterId: r.reporter_id, reportedId: r.reported_id, tripId: r.trip_id, reason: r.reason, details: r.details, status: r.status, reviewedBy: r.reviewed_by, reviewedAt: iso(r.reviewed_at), createdAt: iso(r.created_at) };
  const appRow = (r) => r && { id: r.id, userId: r.user_id, carMakeModel: r.car_make_model, carColor: r.car_color, licensePlate: r.license_plate, seatsAvailable: r.seats_available, status: r.status, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at, reviewNote: r.review_note, createdAt: r.created_at };
  const tripRow = (r) => r && ({
    id: r.id, posterId: r.poster_id,
    origin: { label: r.origin_label, lat: r.origin_lat, lng: r.origin_lng },
    destination: { label: r.dest_label, lat: r.dest_lat, lng: r.dest_lng },
    departsAt: r.departs_at, seats: r.seats, pricePerSeatCents: r.price_per_seat_cents, notes: r.notes, createdAt: r.created_at,
  });
  const groupRow = (r) => r && ({
    id: r.id,
    creatorId: r.creator_id,
    meetingSpot: r.meeting_spot,
    destination: r.destination,
    departureTime: r.departure_time,
    maxCapacity: r.max_capacity,
    status: r.status,
    createdAt: r.created_at,
    members: r.members ?? [],
  });
  return {
    kind: 'postgres',
    async ping() { await pool.query('select 1'); return true; },
    strikes: {
      async add(userId, { tripId = null, reason = 'late_cancel' } = {}) {
        return strikeRow((await pool.query('insert into strikes(user_id,trip_id,reason) values($1,$2,$3) returning *', [userId, tripId, reason])).rows[0]);
      },
      async listSince(userId, sinceIso) { return (await pool.query('select * from strikes where user_id=$1 and created_at >= $2 order by created_at', [userId, sinceIso])).rows.map(strikeRow); },
    },
    reports: {
      async create(reporterId, { reportedId, tripId = null, reason, details = '' }) {
        return reportRow((await pool.query('insert into reports(reporter_id,reported_id,trip_id,reason,details) values($1,$2,$3,$4,$5) returning *', [reporterId, reportedId, tripId, reason, details])).rows[0]);
      },
      async listByStatus(status) { return (await pool.query('select * from reports where status=$1 order by created_at', [status])).rows.map(reportRow); },
      // "status = 'open'" means two admins clicking at once can't both review it.
      async review(id, { status, reviewerId }) {
        return reportRow((await pool.query("update reports set status=$2, reviewed_by=$3, reviewed_at=now() where id=$1 and status='open' returning *", [id, status, reviewerId])).rows[0]) ?? null;
      },
    },
    blocks: {
      async add(blockerId, blockedId) { await pool.query('insert into blocks(blocker_id,blocked_id) values($1,$2) on conflict do nothing', [blockerId, blockedId]); },
      async remove(blockerId, blockedId) { return (await pool.query('delete from blocks where blocker_id=$1 and blocked_id=$2', [blockerId, blockedId])).rowCount > 0; },
      async listBlockedBy(blockerId) { return (await pool.query('select blocked_id from blocks where blocker_id=$1 order by created_at', [blockerId])).rows.map((r) => r.blocked_id); },
      async hiddenFor(userId) {
        const rows = (await pool.query('select blocked_id as id from blocks where blocker_id=$1 union select blocker_id from blocks where blocked_id=$1', [userId])).rows;
        return new Set(rows.map((r) => r.id));
      },
    },
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
      async release(tripId, riderId) { return (await pool.query('delete from seat_reservations where trip_id=$1 and rider_id=$2', [tripId, riderId])).rowCount > 0; },
      async countForTrip(tripId) { return Number((await pool.query('select count(*)::int as n from seat_reservations where trip_id=$1', [tripId])).rows[0].n); },
      async has(tripId, riderId) { return (await pool.query('select 1 from seat_reservations where trip_id=$1 and rider_id=$2', [tripId, riderId])).rowCount > 0; },
      async listRiders(tripId) { return (await pool.query('select rider_id from seat_reservations where trip_id=$1 order by created_at', [tripId])).rows.map((r) => r.rider_id); },
    },
    users: {
      async findById(id) { return userRow((await pool.query('select * from users where id=$1', [id])).rows[0]); },
      async findByEmail(email) { return userRow((await pool.query('select * from users where email=$1', [email])).rows[0]); },
      async create({ email }) { return userRow((await pool.query('insert into users(email) values($1) returning *', [email])).rows[0]); },
      async update(id, { displayName, paymentHandle, emergencyContactName, emergencyContactPhone, emergencyContactEmail }) {
        return userRow((await pool.query(
          'update users set display_name=coalesce($2,display_name), payment_handle=coalesce($3,payment_handle), emergency_contact_name=coalesce($4,emergency_contact_name), emergency_contact_phone=coalesce($5,emergency_contact_phone), emergency_contact_email=coalesce($6,emergency_contact_email) where id=$1 returning *',
          [id, displayName ?? null, paymentHandle ?? null, emergencyContactName ?? null, emergencyContactPhone ?? null, emergencyContactEmail ?? null])).rows[0]);
      },
      async setSuspendedUntil(id, until) { return userRow((await pool.query('update users set suspended_until=$2 where id=$1 returning *', [id, until])).rows[0]); },
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
    groups: {
      async create({ creatorId, meetingSpot, destination, departsAt, maxCapacity = 4 }) {
        const client = await pool.connect();
        try {
          await client.query('begin');
          const g = (await client.query(
            `insert into uber_groups(creator_id, meeting_spot, destination, departure_time, max_capacity)
             values($1, $2, $3, $4, $5) returning id`,
            [creatorId, meetingSpot.trim(), destination.trim(), departsAt, maxCapacity]
          )).rows[0];

          await client.query(
            `insert into uber_group_members(group_id, user_id, role) values($1, $2, 'leader')`,
            [g.id, creatorId]
          );
          await client.query('commit');
          return this.findById(g.id);
        } catch (e) {
          await client.query('rollback');
          throw e;
        } finally {
          client.release();
        }
      },

      async findById(id) {
        const r = (await pool.query(
          `select g.*,
            coalesce(
              json_agg(
                json_build_object(
                  'userId', u.id,
                  'email', u.email,
                  'displayName', u.display_name,
                  'role', m.role,
                  'joinedAt', m.joined_at
                ) order by m.joined_at asc
              ) filter (where u.id is not null),
              '[]'
            ) as members
           from uber_groups g
           left join uber_group_members m on g.id = m.group_id
           left join users u on m.user_id = u.id
           where g.id = $1
           group by g.id`,
          [id]
        )).rows[0];
        return groupRow(r) ?? null;
      },

      async listActive() {
        const { rows } = await pool.query(
          `select g.*,
            coalesce(
              json_agg(
                json_build_object(
                  'userId', u.id,
                  'email', u.email,
                  'displayName', u.display_name,
                  'role', m.role,
                  'joinedAt', m.joined_at
                ) order by m.joined_at asc
              ) filter (where u.id is not null),
              '[]'
            ) as members
           from uber_groups g
           left join uber_group_members m on g.id = m.group_id
           left join users u on m.user_id = u.id
           where g.status in ('open', 'locked') and g.departure_time > now()
           group by g.id
           order by g.departure_time asc
           limit 100`
        );
        return rows.map(groupRow);
      },

      async join(groupId, userId) {
        const client = await pool.connect();
        try {
          await client.query('begin');
          const g = groupRow((await client.query('select * from uber_groups where id=$1 for update', [groupId])).rows[0]);
          const memberRows = (await client.query('select user_id from uber_group_members where group_id=$1', [groupId])).rows;
          const verdict = decideJoinGroup({
            group: g,
            userId,
            memberIds: memberRows.map((m) => m.user_id),
          });

          if (!verdict.ok) {
            await client.query('rollback');
            return verdict;
          }

          await client.query(
            `insert into uber_group_members(group_id, user_id, role) values($1, $2, 'member')`,
            [groupId, userId]
          );
          if (verdict.willAutoLock) {
            await client.query(`update uber_groups set status='locked' where id=$1`, [groupId]);
          }
          await client.query('commit');
          return { ok: true, group: await this.findById(groupId) };
        } catch (e) {
          await client.query('rollback');
          throw e;
        } finally {
          client.release();
        }
      },

      async leave(groupId, userId) {
        const client = await pool.connect();
        try {
          await client.query('begin');
          const g = groupRow((await client.query('select * from uber_groups where id=$1 for update', [groupId])).rows[0]);
          const memberRows = (await client.query(
            `select user_id as "userId", role, joined_at as "joinedAt"
             from uber_group_members where group_id=$1 order by joined_at asc`,
            [groupId]
          )).rows;

          const verdict = decideLeaveGroup({ group: g, userId, members: memberRows });
          if (!verdict.ok) {
            await client.query('rollback');
            return verdict;
          }

          await client.query('delete from uber_group_members where group_id=$1 and user_id=$2', [groupId, userId]);
          if (verdict.nextLeaderId) {
            await client.query(
              `update uber_group_members set role='leader' where group_id=$1 and user_id=$2`,
              [groupId, verdict.nextLeaderId]
            );
          }
          if (g.status !== verdict.nextStatus) {
            await client.query('update uber_groups set status=$2 where id=$1', [groupId, verdict.nextStatus]);
          }
          await client.query('commit');
          return { ok: true, group: await this.findById(groupId) };
        } catch (e) {
          await client.query('rollback');
          throw e;
        } finally {
          client.release();
        }
      },

      async lock(groupId, userId) {
        const client = await pool.connect();
        try {
          await client.query('begin');
          const g = groupRow((await client.query('select * from uber_groups where id=$1 for update', [groupId])).rows[0]);
          const memberRows = (await client.query(
            `select user_id as "userId", role from uber_group_members where group_id=$1`,
            [groupId]
          )).rows;

          const verdict = decideLockGroup({ group: g, userId, members: memberRows });
          if (!verdict.ok) {
            await client.query('rollback');
            return verdict;
          }

          await client.query(`update uber_groups set status='locked' where id=$1`, [groupId]);
          await client.query('commit');
          return { ok: true, group: await this.findById(groupId) };
        } catch (e) {
          await client.query('rollback');
          throw e;
        } finally {
          client.release();
        }
      },

      async updateMeetingSpot(groupId, userId, meetingSpot) {
        const client = await pool.connect();
        try {
          await client.query('begin');
          const g = groupRow((await client.query('select * from uber_groups where id=$1 for update', [groupId])).rows[0]);
          const memberRows = (await client.query(
            `select user_id as "userId", role from uber_group_members where group_id=$1`,
            [groupId]
          )).rows;

          const verdict = decideUpdateMeetingSpot({ group: g, userId, members: memberRows, meetingSpot });
          if (!verdict.ok) {
            await client.query('rollback');
            return verdict;
          }

          await client.query('update uber_groups set meeting_spot=$2 where id=$1', [groupId, meetingSpot.trim()]);
          await client.query('commit');
          return { ok: true, group: await this.findById(groupId) };
        } catch (e) {
          await client.query('rollback');
          throw e;
        } finally {
          client.release();
        }
      },
    },
  };
}
