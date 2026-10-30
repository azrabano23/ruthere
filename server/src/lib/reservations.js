/**
 * Seat reservation rules. The store does the atomic part (one transaction per
 * reservation); this module decides the outcome from what the store saw.
 *
 * reasons: 'own_trip' | 'already_joined' | 'full' | 'departed'
 */
export function decideReservation({ trip, riderId, reservedCount, riderAlreadyIn, now = Date.now() }) {
  if (!trip) return { ok: false, reason: 'not_found' };
  if (trip.posterId === riderId) return { ok: false, reason: 'own_trip' };
  if (Date.parse(trip.departsAt) <= now) return { ok: false, reason: 'departed' };
  if (riderAlreadyIn) return { ok: false, reason: 'already_joined' };
  if (reservedCount >= trip.seats) return { ok: false, reason: 'full' };
  return { ok: true };
}

export const RESERVATION_MESSAGES = {
  not_found: 'Trip not found',
  own_trip: "You can't request a seat on your own trip",
  departed: 'This trip has already left',
  already_joined: "You're already on this trip",
  full: 'Sorry, that last seat just got taken',
};
