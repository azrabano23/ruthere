import { isRutgersEmail, checkCode, hashCode, resendWaitSeconds, MAX_ATTEMPTS, CODE_TTL_MS, RESEND_COOLDOWN_MS } from '../src/lib/auth.js';

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

describe('resend cooldown', () => {
  const sentAt = 1_000_000;
  const rec = { codeHash: 'x', expiresAt: sentAt + CODE_TTL_MS, attempts: 0 };
  it('allows a first code when there is none', () => expect(resendWaitSeconds(null, sentAt)).toBe(0));
  it('makes you wait right after a send', () => expect(resendWaitSeconds(rec, sentAt + 1000)).toBe(29));
  it('rounds part of a second up', () => expect(resendWaitSeconds(rec, sentAt + RESEND_COOLDOWN_MS - 1)).toBe(1));
  it('allows a resend once the cooldown is over', () => expect(resendWaitSeconds(rec, sentAt + RESEND_COOLDOWN_MS)).toBe(0));
});
