// Pure matching rules for RUThere. No database calls or external maps API are needed.
// Both pickup and destination are stored by the existing app as { label, lat, lng }.

export const MAX_DEPARTURE_DIFFERENCE_MS = 15 * 60 * 1000;
export const MAX_PICKUP_DISTANCE_METERS = 200;
export const MAX_DESTINATION_DISTANCE_METERS = 400;
export const MAX_SHARED_UBER_RIDERS = 4; // Including the student who starts the group.

const EARTH_RADIUS_METERS = 6_371_000;

function validPoint(point) {
  return point &&
    Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90 &&
    Number.isFinite(point.lng) && point.lng >= -180 && point.lng <= 180;
}

/** Straight-line distance between two map locations, in meters. */
export function distanceMeters(a, b) {
  if (!validPoint(a) || !validPoint(b)) return Infinity;

  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const haversine = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

function departureTime(value) {
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : NaN;
}

function seatsAvailable(trip) {
  if (!Number.isInteger(trip?.seats) || trip.seats < 1) return 0;

  // A listUpcoming() trip currently has 'seats' but no reservation count.
  // When the caller has live data, it must pass 'seatsLeft' or 'reservedCount'.
  const reserved = trip.reservedCount ?? 0;
  if (!Number.isInteger(reserved) || reserved < 0) return 0;

  let available = trip.seats - reserved;
  if (trip.seatsLeft !== undefined) {
    if (!Number.isInteger(trip.seatsLeft) || trip.seatsLeft < 0) return 0;
    available = Math.min(available, trip.seatsLeft);
  }

  // Future shared-Uber trips include their organizer among the 4 riders,
  // so at most 3 *other* students can join the organizer's trip.
  if (trip.rideType === 'shared_uber') {
    available = Math.min(available, MAX_SHARED_UBER_RIDERS - 1 - reserved);
  }

  return Math.max(0, available);
}

/**
 * Return existing trips compatible with a student's requested trip.
 *
 * Request: { origin, destination, departsAt, seatsNeeded?: 1, requesterId?: string }
 * Trip:    { id, posterId, origin, destination, departsAt, seats,
 *            seatsLeft?, reservedCount?, rideType? }
 *
 * A match must depart in the future, start within 200m, finish within
 * 400m, leave within +/-15 minutes, and have enough seats. Return the
 * original matching trip objects, ordered by time, pickup, then destination.
 * This is a suggestion algorithm, NOT a seat reservation operation.
 */
export function findMatches(request, trips, now = Date.now()) {
  const currentTime = now instanceof Date ? now.getTime() : now;
  const requestedTime = departureTime(request?.departsAt);
  const seatsNeeded = request?.seatsNeeded ?? 1;

  if (!Number.isFinite(currentTime) || !Number.isFinite(requestedTime) ||
      requestedTime <= currentTime || !validPoint(request?.origin) ||
      !validPoint(request?.destination) || !Array.isArray(trips) ||
      !Number.isInteger(seatsNeeded) || seatsNeeded < 1) {
    return [];
  }

  const matches = [];
  for (const trip of trips) {
    if (!trip || typeof trip !== 'object') continue;
    if (request.id != null && trip.id === request.id) continue;

    const requesterId = request.requesterId ?? request.userId ?? request.posterId;
    if (requesterId != null && trip.posterId === requesterId) continue;

    const tripTime = departureTime(trip.departsAt);
    if (!Number.isFinite(tripTime) || tripTime <= currentTime) continue;

    const timeDifference = Math.abs(tripTime - requestedTime);
    if (timeDifference > MAX_DEPARTURE_DIFFERENCE_MS) continue;

    const pickupDistance = distanceMeters(request.origin, trip.origin);
    if (pickupDistance > MAX_PICKUP_DISTANCE_METERS) continue;

    const destinationDistance = distanceMeters(request.destination, trip.destination);
    if (destinationDistance > MAX_DESTINATION_DISTANCE_METERS) continue;

    if (seatsAvailable(trip) < seatsNeeded) continue;

    matches.push({ trip, timeDifference, pickupDistance, destinationDistance });
  }

  matches.sort((a, b) =>
    a.timeDifference - b.timeDifference ||
    a.pickupDistance - b.pickupDistance ||
    a.destinationDistance - b.destinationDistance ||
    String(a.trip.id ?? '').localeCompare(String(b.trip.id ?? ''))
  );

  return matches.map(({ trip }) => trip);
}
