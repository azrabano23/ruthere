// Trust and safety rules (use case 6): late-cancel strikes, suspension, reports and blocks.
// Pure functions, no database, so they are easy to test. The routes and the store do the saving.

export const LATE_CANCEL_MS = 60 * 60 * 1000;            // leaving within 1 hour of departure is "late"
export const STRIKE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;  // strikes count for 30 days
export const STRIKE_LIMIT = 3;                             // this many strikes in the window...
export const SUSPENSION_MS = 7 * 24 * 60 * 60 * 1000;      // ...blocks requesting rides for a week

/** True when someone leaves a trip less than an hour before it departs (and it hasn't left yet). */
export function isLateCancel(departsAt, now = Date.now()) {
  const left = Date.parse(departsAt) - now;
  return left > 0 && left < LATE_CANCEL_MS;
}

/** The strikes that still count: the ones from the last 30 days. */
export function activeStrikes(strikes, now = Date.now()) {
  return strikes.filter((s) => now - Date.parse(s.createdAt) < STRIKE_WINDOW_MS);
}

/** After a new strike: the suspension end time if the user has reached the limit, otherwise null. */
export function suspensionAfter(strikes, now = Date.now()) {
  return activeStrikes(strikes, now).length >= STRIKE_LIMIT ? new Date(now + SUSPENSION_MS).toISOString() : null;
}

/** True while a user is suspended from requesting rides. */
export function isSuspended(user, now = Date.now()) {
  return Boolean(user?.suspendedUntil && Date.parse(user.suspendedUntil) > now);
}

/** What a suspended user sees when they try to request a ride. */
export function suspendedMessage(until) {
  const when = new Date(until).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return `Your account can't request rides until ${when} ET. This happens after three late cancellations in 30 days, or after an admin reviews a report.`;
}

export const REPORT_REASONS = {
  unsafe: 'Unsafe driving or behavior',
  harassment: 'Harassment or threats',
  no_show: 'Did not show up',
  payment: 'Payment problem',
  other: 'Something else',
};

/** Cleans a report body. Returns { report } or { errors }. */
export function validateReport(input = {}, reporterId) {
  const reportedId = String(input.userId ?? '').trim();
  const reason = String(input.reason ?? '');
  const details = String(input.details ?? '').trim().slice(0, 1000);
  const errors = [];
  if (!reportedId) errors.push('Choose who you are reporting');
  if (reportedId && reportedId === reporterId) errors.push("You can't report yourself");
  if (!REPORT_REASONS[reason]) errors.push('Choose a reason');
  if (reason === 'other' && details.length < 5) errors.push('Tell us what happened');
  return errors.length ? { errors } : { report: { reportedId, reason, details, tripId: input.tripId ? String(input.tripId) : null } };
}

/** Removes trips posted by anyone in `hiddenIds` (people the viewer blocked or who blocked the viewer). */
export function hideBlocked(trips, hiddenIds) {
  return hiddenIds.size ? trips.filter((t) => !hiddenIds.has(t.posterId)) : trips;
}
