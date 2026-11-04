# RUThere ride-matching rules

Owner: Abuchi Okpara (`abuchi` branch). Implementation: `server/src/lib/matching.js`. Tests: `server/spec/matchingSpec.js`.

## Goal

When a Rutgers student wants a ride, show compatible upcoming trips rather than trips that only share a broad campus name. The function `findMatches(request, trips, now)` is pure JavaScript. It suggests trips; it **does not reserve seats, form Uber groups, charge money, or call Google Maps**.

## Rules

1. **Pickup:** locations must be within **200 meters** of each other, using their saved latitude/longitude. Same coordinates always qualify; having the same text label does *not* override distant coordinates.
2. **Departure:** the time difference must be **15 minutes or less**, before or after the requested departure (the endpoints are inclusive). The requested time and candidate trip must both be in the future relative to `now`.
3. **Destination:** locations must be within **400 meters** of each other. This is an approximate short walking distance; it is **not** a guaranteed few-minute drive or walk. Actual street routing would require a maps routing service.
4. **Capacity:** a trip must have at least one available seat by default, or `request.seatsNeeded` seats for a request from several riders. If present, `trip.seatsLeft` or `trip.reservedCount` is used to account for already-reserved seats. A zero-seat or malformed trip is excluded.
5. **Shared Uber:** when a trip has `rideType: 'shared_uber'`, its organizer counts as the first rider. At most **three guests** can join for **four riders total**, even if a larger `seats` count appears on the trip. Existing ordinary driver trips are allowed their posted `seats` (1 to 7), consistent with current trip validation.
6. **Self-matches:** a rider never matches their own posted trip (when `requesterId`, `userId`, or `posterId` is supplied), nor the same trip `id`.
7. **Ranking:** return compatible original trip objects sorted by absolute time difference, then pickup distance, then destination distance, then trip ID as a stable tiebreaker. Do not mutate input trips.

The distance calculation uses the Haversine formula (great-circle distance on Earth), which is a lightweight geographic approximation and works with the app's existing `{ label, lat, lng }` shape.

## Function contract

```js
import { findMatches } from './server/src/lib/matching.js';

const request = {
  requesterId: 'rider-id',
  origin: { label: 'College Ave Student Center', lat: 40.503, lng: -74.4516 },
  destination: { label: 'Busch Student Center', lat: 40.5234, lng: -74.4582 },
  departsAt: '2026-11-06T14:00:00.000Z',
  seatsNeeded: 1, // optional; default 1
};

const matches = findMatches(request, trips, Date.parse('2026-11-06T13:00:00Z'));
// matches is an array of original trip objects (no DB writes).
```

`trips` should be an array of objects from `store.trips.listUpcoming()` or another store method. The current store supplies `id`, `posterId`, `origin`, `destination`, `departsAt`, and `seats`. The trip detail route may also supply `seatsLeft`. The database stores `departsAt` as a date and `origin`/`destination` as points; the JavaScript matching function accepts both ISO date strings and `Date` objects for departure times. `now` should be epoch milliseconds (`Date.now()`) or a `Date`.

**Important capacity integration:** `listUpcoming()` currently does **not** include reservation counts. For accurate results after riders start joining, the code that calls `findMatches` must add authoritative `seatsLeft` or `reservedCount` values, as obtained from the reservations store. Without these fields, matching assumes none of the posted seats has been reserved. The existing reservation transaction remains the final authority when someone clicks to join, so the function does not promise a seat.

## Test coverage

`server/spec/matchingSpec.js` contains 15 Jasmine test cases, including normal matches, exact 15-minute boundary, nearby pickups/destinations, different destinations, departed trips, full trips, multi-rider capacity, self-match prevention, shared-Uber group limit, ranking, malformed inputs, and input immutability.

Run from repository root:

```bash
npm install
npm test
```

## Integration boundary and next phase

This contribution implements the **matching engine and unit tests only**. It deliberately does not change `server/src/routes/trips.js`, another teammate's file, or the frontend. To show results in the UI later, an API route can call `store.trips.listUpcoming()`, add authoritative seat availability for each trip, call `findMatches()`, and return the result to a new matching view. A final seat claim must still be handled through `store.reservations.reserve()` to prevent double-booking. Shared-Uber group persistence, live updates, and fare-splitting UI belong to the later project phase.
