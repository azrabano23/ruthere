import { isRutgersEmail, checkCode, hashCode, MAX_ATTEMPTS, CODE_TTL_MS } from '../src/lib/auth.js';

describe('Rutgers email check', () => {
  it('accepts rutgers.edu and scarletmail.rutgers.edu', () => {
    expect(isRutgersEmail('ab2895@scarletmail.rutgers.edu')).toBeTrue();
    expect(isRutgersEmail('someone@rutgers.edu')).toBeTrue();
    expect(isRutgersEmail('Someone@ECE.Rutgers.EDU')).toBeTrue();
  });
  it('rejects non-Rutgers emails', () => {
    expect(isRutgersEmail('me@gmail.com')).toBeFalse();
    expect(isRutgersEmail('me@rutgers.edu.evil.com')).toBeFalse();
    expect(isRutgersEmail('not an email')).toBeFalse();
    expect(isRutgersEmail(undefined)).toBeFalse();
  });
});

describe('one-time code check', () => {
  const now = 1_000_000;
  const rec = () => ({ codeHash: hashCode('123456'), expiresAt: now + CODE_TTL_MS, attempts: 0 });
  it('accepts the right code before expiry', () => expect(checkCode(rec(), '123456', now).ok).toBeTrue());
  it('rejects a wrong code', () => expect(checkCode(rec(), '000000', now)).toEqual({ ok: false, reason: 'wrong' }));
  it('expires after ten minutes', () => expect(checkCode(rec(), '123456', now + CODE_TTL_MS + 1).reason).toBe('expired'));
  it('locks after five wrong tries', () => expect(checkCode({ ...rec(), attempts: MAX_ATTEMPTS }, '123456', now).reason).toBe('locked'));
});
