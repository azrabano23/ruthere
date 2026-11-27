import { isLateCancel, activeStrikes, suspensionAfter, isSuspended, validateReport, hideBlocked, suspendedMessage, LATE_CANCEL_MS, STRIKE_WINDOW_MS, SUSPENSION_MS } from '../src/lib/trust.js';

const NOW = Date.parse('2026-11-25T15:00:00Z');
const at = (msFromNow) => new Date(NOW + msFromNow).toISOString();
const MIN = 60_000, DAY = 24 * 60 * MIN;

describe('late cancellations', () => {
  it('counts leaving less than an hour before departure', () => {
    expect(isLateCancel(at(59 * MIN), NOW)).toBeTrue();
    expect(isLateCancel(at(1 * MIN), NOW)).toBeTrue();
  });
  it('does not count leaving an hour or more ahead', () => {
    expect(isLateCancel(at(LATE_CANCEL_MS), NOW)).toBeFalse();
    expect(isLateCancel(at(3 * 60 * MIN), NOW)).toBeFalse();
  });
  it('does not count a trip that already left', () => {
    expect(isLateCancel(at(-5 * MIN), NOW)).toBeFalse();
  });
});

describe('strikes and suspension', () => {
  const strike = (msAgo) => ({ createdAt: at(-msAgo) });
  it('only counts strikes from the last 30 days', () => {
    expect(activeStrikes([strike(1 * DAY), strike(29 * DAY), strike(STRIKE_WINDOW_MS + MIN)], NOW).length).toBe(2);
  });
  it('suspends for a week at the third strike in 30 days', () => {
    expect(suspensionAfter([strike(DAY), strike(2 * DAY), strike(0)], NOW)).toBe(at(SUSPENSION_MS));
  });
  it('does not suspend at two strikes, or when the old ones expired', () => {
    expect(suspensionAfter([strike(DAY), strike(0)], NOW)).toBeNull();
    expect(suspensionAfter([strike(40 * DAY), strike(35 * DAY), strike(0)], NOW)).toBeNull();
  });
  it('knows when a suspension is over', () => {
    expect(isSuspended({ suspendedUntil: at(DAY) }, NOW)).toBeTrue();
    expect(isSuspended({ suspendedUntil: at(-MIN) }, NOW)).toBeFalse();
    expect(isSuspended({ suspendedUntil: null }, NOW)).toBeFalse();
  });
  it('tells a suspended user when they can ride again', () => {
    expect(suspendedMessage('2026-12-02T15:00:00Z')).toContain('Dec 2');
  });
});

describe('reports', () => {
  it('accepts a report with a known reason', () => {
    const { report } = validateReport({ userId: 'u2', reason: 'unsafe', tripId: 't1' }, 'u1');
    expect(report).toEqual({ reportedId: 'u2', reason: 'unsafe', details: '', tripId: 't1' });
  });
  it('rejects reporting yourself, a made-up reason, and "other" with no details', () => {
    expect(validateReport({ userId: 'u1', reason: 'unsafe' }, 'u1').errors).toContain("You can't report yourself");
    expect(validateReport({ userId: 'u2', reason: 'rude' }, 'u1').errors).toContain('Choose a reason');
    expect(validateReport({ userId: 'u2', reason: 'other' }, 'u1').errors).toContain('Tell us what happened');
  });
  it('caps details at 1000 characters', () => {
    expect(validateReport({ userId: 'u2', reason: 'other', details: 'x'.repeat(2000) }, 'u1').report.details.length).toBe(1000);
  });
});

describe('blocking', () => {
  const trips = [{ id: 't1', posterId: 'a' }, { id: 't2', posterId: 'b' }];
  it('hides trips posted by blocked people', () => {
    expect(hideBlocked(trips, new Set(['b'])).map((t) => t.id)).toEqual(['t1']);
  });
  it('changes nothing when nobody is blocked', () => {
    expect(hideBlocked(trips, new Set())).toBe(trips);
  });
});
