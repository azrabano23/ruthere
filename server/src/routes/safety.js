// Safety resources and the emergency alert sent to a rider's emergency contact.
import { Router } from 'express';
import { requireUser } from '../lib/auth.js';
import { SAFETY_RESOURCES, buildAlertMessage, deliverAlert } from '../lib/safety.js';

export function safetyRouter(store) {
  const r = Router();

  r.get('/resources', (_req, res) => res.json(SAFETY_RESOURCES));

  // Called after the rider's 5-second cancel window has passed.
  r.post('/alert', requireUser(store), async (req, res, next) => {
    try {
      const { tripId, location } = req.body ?? {};
      const trip = tripId ? await store.trips.findById(tripId) : null;
      const user = req.user;
      if (!user.emergencyContactPhone && !user.emergencyContactEmail) return res.status(400).json({ error: 'No emergency contact set', reason: 'no_contact' });
      const message = buildAlertMessage({ user, trip, location });
      const contact = { name: user.emergencyContactName, phone: user.emergencyContactPhone, email: user.emergencyContactEmail };
      const result = await deliverAlert({ contact, riderName: user.displayName || user.email, message });
      // The client uses `message` and `smsTo` to open a ready-to-send text from the rider's own phone.
      res.json({ ok: true, notified: contact.name || contact.phone || contact.email, smsTo: contact.phone ?? null, message, ...result });
    } catch (e) { next(e); }
  });

  return r;
}
