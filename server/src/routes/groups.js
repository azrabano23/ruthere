// Shared Uber Groups: list, detail, create, join, leave, lock, and update meeting spot.
import { Router } from 'express';
import { requireUser } from '../lib/auth.js';
import { validateGroup, GROUP_MESSAGES } from '../lib/groups.js';

const STATUS_BY_REASON = {
  not_found: 404,
  not_leader: 403,
  not_member: 403,
  locked: 409,
  cancelled: 409,
  departed: 409,
  already_joined: 409,
  full: 409,
  not_open: 409,
  invalid_spot: 400,
};

function sendVerdictError(res, reason) {
  const status = STATUS_BY_REASON[reason] ?? 400;
  const error = GROUP_MESSAGES[reason] ?? 'Unable to complete group action';
  return res.status(status).json({ error, reason });
}

export function groupsRouter(store) {
  const r = Router();

  // Active upcoming groups (open or locked), soonest first
  r.get('/', requireUser(store), async (_req, res, next) => {
    try {
      res.json(await store.groups.listActive());
    } catch (e) {
      next(e);
    }
  });

  // Group detail with full member list
  r.get('/:id', requireUser(store), async (req, res, next) => {
    try {
      const group = await store.groups.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Not found' });
      res.json(group);
    } catch (e) {
      next(e);
    }
  });

  // Create a new Shared Uber Group (creator becomes leader)
  r.post('/', requireUser(store), async (req, res, next) => {
    try {
      const errors = validateGroup(req.body);
      if (errors.length) return res.status(400).json({ errors });

      const { meetingSpot, destination, departsAt, maxCapacity = 4 } = req.body;
      const group = await store.groups.create({
        creatorId: req.user.id,
        meetingSpot,
        destination,
        departsAt: new Date(departsAt).toISOString(),
        maxCapacity,
      });
      res.status(201).json(group);
    } catch (e) {
      next(e);
    }
  });

  // Join an open group (auto-locks at maxCapacity)
  r.post('/:id/join', requireUser(store), async (req, res, next) => {
    try {
      const verdict = await store.groups.join(req.params.id, req.user.id);
      if (!verdict.ok) return sendVerdictError(res, verdict.reason);
      res.status(201).json({ ok: true, group: verdict.group });
    } catch (e) {
      next(e);
    }
  });

  // Leave a group (promotes next leader or cancels if empty)
  r.delete('/:id/leave', requireUser(store), async (req, res, next) => {
    try {
      const verdict = await store.groups.leave(req.params.id, req.user.id);
      if (!verdict.ok) return sendVerdictError(res, verdict.reason);
      res.json({ ok: true, group: verdict.group });
    } catch (e) {
      next(e);
    }
  });

  // Leader locks the group before ordering the Uber
  r.patch('/:id/lock', requireUser(store), async (req, res, next) => {
    try {
      const verdict = await store.groups.lock(req.params.id, req.user.id);
      if (!verdict.ok) return sendVerdictError(res, verdict.reason);
      res.json({ ok: true, group: verdict.group });
    } catch (e) {
      next(e);
    }
  });

  // Leader updates the meeting spot while the group is still open
  r.patch('/:id/meeting-spot', requireUser(store), async (req, res, next) => {
    try {
      const { meetingSpot } = req.body ?? {};
      const verdict = await store.groups.updateMeetingSpot(
        req.params.id,
        req.user.id,
        meetingSpot
      );
      if (!verdict.ok) return sendVerdictError(res, verdict.reason);
      res.json({ ok: true, group: verdict.group });
    } catch (e) {
      next(e);
    }
  });

  return r;
}