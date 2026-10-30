import { Router } from 'express';
import { requireUser } from '../lib/auth.js';
import { validateTrip } from '../lib/trips.js';

export function tripsRouter(store) {
  const r = Router();

  // Upcoming trips, soonest first
  r.get('/', requireUser(store), async (_req, res, next) => {
    try { res.json(await store.trips.listUpcoming()); } catch (e) { next(e); }
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

  r.get('/:id', requireUser(store), async (req, res, next) => {
    try {
      const trip = await store.trips.findById(req.params.id);
      if (!trip) return res.status(404).json({ error: 'Not found' });
      res.json(trip);
    } catch (e) { next(e); }
  });

  return r;
}
