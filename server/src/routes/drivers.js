// Driver applications: a student applies, an admin (emails in ADMIN_EMAILS) approves or rejects.
// Approving sets users.is_driver_approved. All routes need a signed-in user.
import { Router } from 'express';
import { requireUser } from '../lib/auth.js';
import { validateApplication, cleanApplication, isAdmin } from '../lib/drivers.js';

export function driversRouter(store) {
  const r = Router();
  const auth = requireUser(store);
  const adminOnly = (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: 'Admins only' }));

  // Apply to drive
  r.post('/apply', auth, async (req, res, next) => {
    try {
      const errors = validateApplication(req.body);
      if (errors.length) return res.status(400).json({ errors });
      const latest = await store.driverApplications.latestForUser(req.user.id);
      if (latest?.status === 'approved') return res.status(409).json({ error: 'You are already an approved driver' });
      if (latest?.status === 'pending') return res.status(409).json({ error: 'Your application is already under review' });
      const application = await store.driverApplications.create(req.user.id, cleanApplication(req.body));
      res.status(201).json({ application });
    } catch (e) {
      if (e.code === 'ALREADY_PENDING') return res.status(409).json({ error: 'Your application is already under review' });
      next(e);
    }
  });

  // My status
  r.get('/me', auth, async (req, res, next) => {
    try {
      const application = await store.driverApplications.latestForUser(req.user.id);
      res.json({ isDriverApproved: Boolean(req.user.isDriverApproved), isAdmin: isAdmin(req.user), application });
    } catch (e) { next(e); }
  });

  // Admin: the queue, so ids are easy to find
  r.get('/pending', auth, adminOnly, async (_req, res, next) => {
    try { res.json({ applications: await store.driverApplications.listByStatus('pending') }); } catch (e) { next(e); }
  });

  const review = (status) => async (req, res, next) => {
    try {
      const note = req.body?.note ? String(req.body.note).slice(0, 500) : null;
      const application = await store.driverApplications.review(req.params.id, { status, reviewerId: req.user.id, note });
      if (application) return res.json({ application });
      const existing = await store.driverApplications.findById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Application not found' });
      res.status(409).json({ error: `Application was already ${existing.status}` });
    } catch (e) { next(e); }
  };
  r.post('/:id/approve', auth, adminOnly, review('approved'));
  r.post('/:id/reject', auth, adminOnly, review('rejected'));

  return r;
}
