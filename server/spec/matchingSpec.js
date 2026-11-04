import {
  findMatches,
  distanceMeters,
  MAX_DEPARTURE_DIFFERENCE_MS,
} from '../src/lib/matching.js';

// Fixed time makes all specs deterministic, regardless of when tests run.
const now = Date.parse('2026-11-06T13:00:00.000Z');
const at = (minutes) => new Date(now + minutes * 60_000).toISOString();

const casc = { label: 'College Ave Student Center', lat: 40.503, lng: -74.4516 };
const busch = { label: 'Busch Student Center', lat: 40.5234, lng: -74.4582 };
const farAway = { label: 'Livingston Student Center', lat: 40.5214, lng: -74.4368 };

const request = () => ({
  requesterId: 'rider-1', origin: casc, destination: busch, departsAt: at(60),
});
const trip = (overrides = {}) => ({
  id: 'trip-1', posterId: 'driver-1', origin: casc, destination: busch,
  departsAt: at(65), seats: 3, ...overrides,
});

// 0.001 degree latitude is about 111m around Rutgers.
const offsetLat = (point, delta) => ({ ...point, lat: point.lat + delta });

describe('ride matching', () => {
  it('matches a trip with the same pickup, destination, and a close departure', () => {
    expect(findMatches(request(), [trip()], now).map((x) => x.id)).toEqual(['trip-1']);
  });

  it('includes departures exactly 15 minutes earlier or later', () => {
    const matches = [
      trip({ id: 'early', departsAt: at(45) }),
      trip({ id: 'late', departsAt: at(75) }),
    ];
    expect(findMatches(request(), matches, now).map((x) => x.id)).toEqual(['early', 'late']);
    expect(MAX_DEPARTURE_DIFFERENCE_MS).toBe(900000);
  });

  it('rejects trips departing more than 15 minutes apart', () => {
    expect(findMatches(request(), [trip({ departsAt: at(75.01) })], now)).toEqual([]);
  });

  it('matches pickup spots within 200 meters', () => {
    const nearby = trip({ origin: offsetLat(casc, 0.001) });
    expect(distanceMeters(casc, nearby.origin)).toBeLessThan(200);
    expect(findMatches(request(), [nearby], now).length).toBe(1);
  });

  it('rejects pickup spots beyond 200 meters', () => {
    expect(findMatches(request(), [trip({ origin: offsetLat(casc, 0.002) })], now)).toEqual([]);
  });

  it('matches nearby destinations within 400 meters', () => {
    expect(findMatches(request(), [trip({ destination: offsetLat(busch, 0.002) })], now).length).toBe(1);
  });

  it('rejects destinations that are too far apart', () => {
    expect(findMatches(request(), [trip({ destination: farAway })], now)).toEqual([]);
  });

  it('does not suggest departed trips or an expired request', () => {
    expect(findMatches(request(), [trip({ departsAt: at(-1) })], now)).toEqual([]);
    expect(findMatches({ ...request(), departsAt: at(-1) }, [trip()], now)).toEqual([]);
  });

  it('does not suggest trips with zero remaining seats', () => {
    expect(findMatches(request(), [trip({ seatsLeft: 0 })], now)).toEqual([]);
    expect(findMatches(request(), [trip({ reservedCount: 3 })], now)).toEqual([]);
  });

  it('requires enough seats for a request with multiple riders', () => {
    expect(findMatches({ ...request(), seatsNeeded: 2 }, [trip({ seatsLeft: 1 })], now)).toEqual([]);
    expect(findMatches({ ...request(), seatsNeeded: 2 }, [trip({ seatsLeft: 2 })], now).length).toBe(1);
  });

  it('does not match the requester with their own trip or the same trip ID', () => {
    expect(findMatches(request(), [trip({ posterId: 'rider-1' })], now)).toEqual([]);
    expect(findMatches({ ...request(), id: 'trip-1' }, [trip()], now)).toEqual([]);
  });

  it('limits shared-Uber groups to 4 riders total (organizer plus 3 guests)', () => {
    expect(findMatches(request(), [trip({ rideType: 'shared_uber', seats: 7, reservedCount: 3 })], now)).toEqual([]);
    expect(findMatches(request(), [trip({ rideType: 'shared_uber', seats: 7, reservedCount: 2 })], now).length).toBe(1);
  });

  it('sorts by closest departure time, then pickup distance', () => {
    const trips = [
      trip({ id: 'far-time', departsAt: at(70) }),
      trip({ id: 'near-pickup', departsAt: at(61) }),
      trip({ id: 'far-pickup', departsAt: at(61), origin: offsetLat(casc, 0.001) }),
    ];
    expect(findMatches(request(), trips, now).map((x) => x.id)).toEqual([
      'near-pickup', 'far-pickup', 'far-time',
    ]);
  });

  it('ignores malformed trips and never modifies the input list', () => {
    const valid = trip();
    const input = [null, { id: 'bad', departsAt: 'not-a-date' }, valid];
    expect(findMatches(request(), input, now)).toEqual([valid]);
    expect(input).toEqual([null, { id: 'bad', departsAt: 'not-a-date' }, valid]);
  });

  it('rejects bad requests without throwing an exception', () => {
    expect(findMatches(null, [trip()], now)).toEqual([]);
    expect(findMatches({ ...request(), origin: null }, [trip()], now)).toEqual([]);
    expect(findMatches(request(), null, now)).toEqual([]);
    expect(findMatches({ ...request(), seatsNeeded: 0 }, [trip()], now)).toEqual([]);
  });
});
