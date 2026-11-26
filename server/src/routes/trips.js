// Trips: post, list, detail, request and give up a seat, cancel. All routes need a signed-in user.
import { Router } from 'express';
import { requireUser } from '../lib/auth.js';
import { validateTrip, canCancel } from '../lib/trips.js';
import { RESERVATION_MESSAGES } from '../lib/reservations.js';
import { hideBlocked, isSuspended, suspendedMessage } from '../lib/trust.js';
import { hiddenIdsFor, recordLeave } from './trust.js';
import { publish } from '../lib/events.js';

export function tripsRouter(store) {
  const r = Router();

  // Upcoming trips, soonest first, minus trips from anyone you blocked or who blocked you
  r.get('/', requireUser(store), async (req, res, next) => {
    try { res.json(hideBlocked(await store.trips.listUpcoming(), await hiddenIdsFor(store, req.user.id))); } catch (e) { next(e); }
  });

  // Post a trip (midterm scope: any signed-in student can post; driver approval comes with matching phase)
  r.post('/', requireUser(store), async (req, res, next) => {
    try {
      const errors = validateTrip(req.body);
      if (errors.length) return res.status(400).json({ errors });
      const { origin, destination, departsAt, seats, pricePerSeatCents = null, notes = '' } = req.body;
      const trip = await store.trips.create({
        posterId: req.user.id, origin, destination,
        departsAt: new Date(departsAt).toISOString(), seats, pricePerSeatCents, notes: String(notes).slice(0, 280),
      });
      res.status(201).json(trip);
    } catch (e) { next(e); }
  });

  // Trips I posted
  r.get('/mine', requireUser(store), async (req, res, next) => {
    try { res.json(await store.trips.listByPoster(req.user.id)); } catch (e) { next(e); }
  });

  r.get('/:id', requireUser(store), async (req, res, next) => {
    try {
      const trip = await store.trips.findById(req.params.id);
      if (!trip) return res.status(404).json({ error: 'Not found' });
      const [poster, riderIds, hidden] = await Promise.all([
        store.users.findById(trip.posterId),
        store.reservations.listRiders(trip.id),
        hiddenIdsFor(store, req.user.id),
      ]);
      const joined = riderIds.includes(req.user.id);
      const onTrip = joined || trip.posterId === req.user.id;
      // Blocked either way: the trip is hidden, unless you're already on it (you still need the safety panel).
      if (hidden.has(trip.posterId) && !onTrip) return res.status(404).json({ error: 'Not found' });
      // Only people on the trip see who else is on it, so they can report or block someone.
      const people = onTrip
        ? await Promise.all([trip.posterId, ...riderIds].filter((id) => id !== req.user.id).map(async (id) => ({
            id, displayName: (id === trip.posterId ? poster : await store.users.findById(id))?.displayName || 'A Rutgers student', role: id === trip.posterId ? 'driver' : 'rider',
          })))
        : [];
      res.json({ ...trip, posterName: poster?.displayName ?? null, seatsLeft: trip.seats - riderIds.length, joined, people });
    } catch (e) { next(e); }
  });

  // Request a seat. Exactly one rider can win the last seat, even if many click at once.
  r.post('/:id/request', requireUser(store), async (req, res, next) => {
    try {
      if (isSuspended(req.user)) return res.status(403).json({ error: suspendedMessage(req.user.suspendedUntil), reason: 'suspended' });
      const trip = await store.trips.findById(req.params.id);
      if (trip) {
        const hidden = await hiddenIdsFor(store, req.user.id);
        const others = [trip.posterId, ...(await store.reservations.listRiders(trip.id))];
        if (others.some((id) => hidden.has(id))) return res.status(409).json({ error: "You can't join this trip", reason: 'blocked' });
      }
      const verdict = await store.reservations.reserve(req.params.id, req.user.id);
      if (!verdict.ok) {
        const status = verdict.reason === 'not_found' ? 404 : 409;
        return res.status(status).json({ error: RESERVATION_MESSAGES[verdict.reason], reason: verdict.reason });
      }
      const seatsLeft = (await store.trips.findById(req.params.id)).seats - (await store.reservations.countForTrip(req.params.id));
      publish('seat_taken', { tripId: req.params.id, seatsLeft, by: req.user.displayName || 'A rider' });
      res.status(201).json({ ok: true, seatsLeft });
    } catch (e) { next(e); }
  });

  // Give up my seat. Frees it for the next rider.
  r.delete('/:id/request', requireUser(store), async (req, res, next) => {
    try {
      const trip = await store.trips.findById(req.params.id);
      if (!trip) return res.status(404).json({ error: 'Not found' });
      const released = await store.reservations.release(trip.id, req.user.id);
      if (!released) return res.status(404).json({ error: "You don't have a seat on this trip" });
      const seatsLeft = trip.seats - (await store.reservations.countForTrip(trip.id));
      // Less than an hour before departure counts as a late cancel (use case 6).
      const standing = await recordLeave(store, req.user.id, trip.departsAt, { tripId: trip.id });
      publish('seat_released', { tripId: trip.id, seatsLeft, by: req.user.displayName || 'A rider' });
      res.json({ ok: true, seatsLeft, ...standing });
    } catch (e) { next(e); }
  });

  // Cancel a trip I posted
  r.delete('/:id', requireUser(store), async (req, res, next) => {
    try {
      const trip = await store.trips.findById(req.params.id);
      if (!trip) return res.status(404).json({ error: 'Not found' });
      if (!canCancel(trip, req.user)) return res.status(403).json({ error: 'Only the poster can cancel this trip' });
      // Tell every rider before the trip disappears (use case 3).
      const riderIds = await store.reservations.listRiders(trip.id);
      await store.trips.delete(trip.id);
      publish('trip_cancelled', { tripId: trip.id, userIds: riderIds, route: `${trip.origin.label} → ${trip.destination.label}`, departsAt: trip.departsAt });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return r;
}
