export const MIN_LEAD_MS = 10 * 60 * 1000;            // departure at least 10 minutes out
export const MAX_LEAD_MS = 14 * 24 * 60 * 60 * 1000;  // and at most two weeks out
export const MAX_SEATS = 7;

/** Validates a trip post. Returns an array of error strings (empty when valid). */
export function validateTrip(input, now = Date.now()) {
  const errors = [];
  const { origin, destination, departsAt, seats } = input ?? {};
  if (!origin?.label || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') errors.push('Pickup location is required');
  if (!destination?.label || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') errors.push('Destination is required');
  if (origin?.label && destination?.label && origin.label === destination.label) errors.push('Pickup and destination must be different');
  const t = Date.parse(departsAt);
  if (Number.isNaN(t)) errors.push('Departure time is required');
  else if (t - now < MIN_LEAD_MS) errors.push('Departure must be at least 10 minutes from now');
  else if (t - now > MAX_LEAD_MS) errors.push('Departure must be within two weeks');
  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS) errors.push(`Seats must be a whole number from 1 to ${MAX_SEATS}`);
  return errors;
}

/** Even split of a fare in cents across n riders; remainder cents go to the first riders. */
export function splitFareCents(totalCents, n) {
  if (!Number.isInteger(totalCents) || totalCents < 0 || !Number.isInteger(n) || n < 1) throw new Error('bad split');
  const base = Math.floor(totalCents / n);
  const rem = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Only the student who posted a trip may cancel it. */
export function canCancel(trip, user) {
  return Boolean(trip && user && trip.posterId === user.id);
}
