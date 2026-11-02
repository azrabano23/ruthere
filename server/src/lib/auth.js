// Sign-in rules: which emails count as Rutgers, code generation and checking, session cookies.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 30 * 1000; // wait between "Resend code" clicks

/**
 * Seconds until a new code may be sent for this record, 0 if allowed now.
 * The send time isn't stored, so it's worked out from the expiry.
 */
export function resendWaitSeconds(record, now = Date.now()) {
  if (!record) return 0;
  const sentAt = record.expiresAt - CODE_TTL_MS;
  return Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_MS - now) / 1000));
}

export function allowedDomains() {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? 'rutgers.edu,scarletmail.rutgers.edu')
    .split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
}

export function isRutgersEmail(email, domains = allowedDomains()) {
  if (typeof email !== 'string') return false;
  const m = email.trim().toLowerCase().match(/^[^\s@]+@([^\s@]+)$/);
  if (!m) return false;
  const domain = m[1];
  return domains.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Pure check of a stored code record against a submitted code.
 * Returns { ok: true } or { ok: false, reason: 'expired' | 'locked' | 'wrong' }.
 */
export function checkCode(record, submitted, now = Date.now()) {
  if (!record) return { ok: false, reason: 'wrong' };
  if (now > record.expiresAt) return { ok: false, reason: 'expired' };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' };
  if (hashCode(String(submitted)) !== record.codeHash) return { ok: false, reason: 'wrong' };
  return { ok: true };
}

export function signSession(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.SESSION_SECRET ?? 'dev-secret', { expiresIn: '30d' });
}

export function requireUser(store) {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.session;
      if (!token) return res.status(401).json({ error: 'Sign in first' });
      const payload = jwt.verify(token, process.env.SESSION_SECRET ?? 'dev-secret');
      const user = await store.users.findById(payload.sub);
      if (!user) return res.status(401).json({ error: 'Sign in first' });
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Sign in first' });
    }
  };
}
