import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_ATTEMPTS = 5;

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
