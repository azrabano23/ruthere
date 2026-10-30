import { Router } from 'express';
import { isRutgersEmail, generateCode, hashCode, checkCode, signSession, requireUser, CODE_TTL_MS } from '../lib/auth.js';
import { sendCode } from '../lib/email.js';

export function authRouter(store) {
  const r = Router();

  // Step 1: request a six-digit code
  r.post('/request-code', async (req, res, next) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      if (!isRutgersEmail(email)) return res.status(400).json({ error: 'Use your Rutgers email (…@rutgers.edu or …@scarletmail.rutgers.edu)' });
      const code = generateCode();
      await store.codes.upsert(email, { codeHash: hashCode(code), expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 });
      await sendCode(email, code);
      res.json({ ok: true, expiresInSeconds: CODE_TTL_MS / 1000 });
    } catch (e) { next(e); }
  });

  // Step 2: verify it, create the account if new, set the session cookie
  r.post('/verify', async (req, res, next) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const code = String(req.body?.code ?? '').trim();
      const record = await store.codes.get(email);
      const result = checkCode(record, code);
      if (!result.ok) {
        if (result.reason === 'wrong' && record) await store.codes.bumpAttempts(email);
        const msg = { expired: 'Code expired, request a new one', locked: 'Too many tries, request a new one', wrong: 'Wrong code' }[result.reason];
        return res.status(400).json({ error: msg, reason: result.reason });
      }
      await store.codes.delete(email);
      let user = await store.users.findByEmail(email);
      let isNew = false;
      if (!user) { user = await store.users.create({ email }); isNew = true; }
      res.cookie('session', signSession(user), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 3600 * 1000 });
      res.json({ user, isNew });
    } catch (e) { next(e); }
  });

  r.get('/me', requireUser(store), (req, res) => res.json({ user: req.user }));

  r.patch('/me', requireUser(store), async (req, res, next) => {
    try {
      const { displayName, paymentHandle, emergencyContactName, emergencyContactPhone } = req.body ?? {};
      const user = await store.users.update(req.user.id, { displayName, paymentHandle, emergencyContactName, emergencyContactPhone });
      res.json({ user });
    } catch (e) { next(e); }
  });

  r.post('/signout', (_req, res) => { res.clearCookie('session'); res.json({ ok: true }); });
  return r;
}
