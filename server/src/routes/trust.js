// Trust and safety (use case 6): your strikes, blocking, and reporting, plus the admin report queue.
// All routes need a signed-in user. Admins are the emails in ADMIN_EMAILS, same as driver approval.
import { Router } from 'express';
import { requireUser } from '../lib/auth.js';
import { isAdmin } from '../lib/drivers.js';
import { activeStrikes, isLateCancel, suspensionAfter, validateReport, REPORT_REASONS, STRIKE_LIMIT, STRIKE_WINDOW_MS, SUSPENSION_MS } from '../lib/trust.js';

/**
 * Call whenever someone leaves a trip or a group. Adds a strike when they leave less than an hour
 * before departure, and suspends them for a week at the third strike in 30 days.
 * Returns { strike: false } or { strike: true, strikes, suspendedUntil }.
 */
export async function recordLeave(store, userId, departsAt, { tripId = null, now = Date.now() } = {}) {
  if (!isLateCancel(departsAt, now)) return { strike: false };
  await store.strikes.add(userId, { tripId });
  const recent = await store.strikes.listSince(userId, new Date(now - STRIKE_WINDOW_MS).toISOString());
  const suspendedUntil = suspensionAfter(recent, now);
  if (suspendedUntil) await store.users.setSuspendedUntil(userId, suspendedUntil);
  return { strike: true, strikes: activeStrikes(recent, now).length, suspendedUntil };
}

/** The ids hidden from this user: people they blocked and people who blocked them. A Set. */
export function hiddenIdsFor(store, userId) {
  return store.blocks.hiddenFor(userId);
}

const publicName = (u) => u?.displayName || 'A Rutgers student';

export function trustRouter(store) {
  const r = Router();
  const auth = requireUser(store);
  const adminOnly = (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: 'Admins only' }));

  // My standing: strikes in the last 30 days, any suspension, and who I've blocked.
  r.get('/me', auth, async (req, res, next) => {
    try {
      const now = Date.now();
      const recent = await store.strikes.listSince(req.user.id, new Date(now - STRIKE_WINDOW_MS).toISOString());
      const blockedIds = await store.blocks.listBlockedBy(req.user.id);
      const blocked = await Promise.all(blockedIds.map(async (id) => ({ id, displayName: publicName(await store.users.findById(id)) })));
      const suspendedUntil = req.user.suspendedUntil && Date.parse(req.user.suspendedUntil) > now ? req.user.suspendedUntil : null;
      res.json({ strikes: activeStrikes(recent, now).length, strikeLimit: STRIKE_LIMIT, suspendedUntil, blocked });
    } catch (e) { next(e); }
  });

  r.get('/report-reasons', (_req, res) => res.json(REPORT_REASONS));

  // Block someone. Neither of you will see the other's trips, and neither can join the other's.
  r.post('/blocks', auth, async (req, res, next) => {
    try {
      const userId = String(req.body?.userId ?? '');
      if (!userId || userId === req.user.id) return res.status(400).json({ error: "You can't block that person" });
      if (!(await store.users.findById(userId))) return res.status(404).json({ error: 'User not found' });
      await store.blocks.add(req.user.id, userId);
      res.status(201).json({ ok: true });
    } catch (e) { next(e); }
  });

  r.delete('/blocks/:userId', auth, async (req, res, next) => {
    try {
      const removed = await store.blocks.remove(req.user.id, req.params.userId);
      res.status(removed ? 200 : 404).json(removed ? { ok: true } : { error: "You haven't blocked this person" });
    } catch (e) { next(e); }
  });

  // Report someone. An admin reviews it.
  r.post('/reports', auth, async (req, res, next) => {
    try {
      const { report, errors } = validateReport(req.body, req.user.id);
      if (errors) return res.status(400).json({ errors });
      if (!(await store.users.findById(report.reportedId))) return res.status(404).json({ error: 'User not found' });
      const saved = await store.reports.create(req.user.id, report);
      res.status(201).json({ ok: true, id: saved.id });
    } catch (e) { next(e); }
  });

  // Admin: open reports, oldest first, with both people's names and emails.
  r.get('/reports', auth, adminOnly, async (_req, res, next) => {
    try {
      const open = await store.reports.listByStatus('open');
      const withNames = await Promise.all(open.map(async (rep) => {
        const [reporter, reported] = await Promise.all([store.users.findById(rep.reporterId), store.users.findById(rep.reportedId)]);
        return { ...rep, reasonLabel: REPORT_REASONS[rep.reason], reporter: { name: publicName(reporter), email: reporter?.email }, reported: { name: publicName(reported), email: reported?.email } };
      }));
      res.json({ reports: withNames });
    } catch (e) { next(e); }
  });

  const review = (status) => async (req, res, next) => {
    try {
      const rep = await store.reports.review(req.params.id, { status, reviewerId: req.user.id });
      if (!rep) return res.status(409).json({ error: 'Report not found or already reviewed' });
      let suspendedUntil = null;
      if (status === 'suspended') {
        suspendedUntil = new Date(Date.now() + SUSPENSION_MS).toISOString();
        await store.users.setSuspendedUntil(rep.reportedId, suspendedUntil);
      }
      res.json({ report: rep, suspendedUntil });
    } catch (e) { next(e); }
  };
  r.post('/reports/:id/dismiss', auth, adminOnly, review('dismissed'));
  r.post('/reports/:id/suspend', auth, adminOnly, review('suspended'));

  return r;
}
