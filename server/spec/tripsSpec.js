import { validateTrip, splitFareCents } from '../src/lib/trips.js';

const now = Date.parse('2026-11-06T13:00:00Z');
const casc = { label: 'College Ave Student Center', lat: 40.503, lng: -74.4516 };
const bsc = { label: 'Busch Student Center', lat: 40.5234, lng: -74.4582 };
const inMin = (m) => new Date(now + m * 60_000).toISOString();

describe('trip validation', () => {
  it('accepts a valid trip', () => expect(validateTrip({ origin: casc, destination: bsc, departsAt: inMin(40), seats: 3 }, now)).toEqual([]));
  it('rejects same pickup and destination', () => expect(validateTrip({ origin: casc, destination: casc, departsAt: inMin(40), seats: 3 }, now)).toContain('Pickup and destination must be different'));
  it('rejects departures under 10 minutes away', () => expect(validateTrip({ origin: casc, destination: bsc, departsAt: inMin(5), seats: 3 }, now)).toContain('Departure must be at least 10 minutes from now'));
  it('rejects departures over two weeks away', () => expect(validateTrip({ origin: casc, destination: bsc, departsAt: inMin(15 * 24 * 60), seats: 3 }, now)).toContain('Departure must be within two weeks'));
  it('rejects bad seat counts', () => {
    expect(validateTrip({ origin: casc, destination: bsc, departsAt: inMin(40), seats: 0 }, now).length).toBe(1);
    expect(validateTrip({ origin: casc, destination: bsc, departsAt: inMin(40), seats: 2.5 }, now).length).toBe(1);
  });
});

describe('fare split', () => {
  it('splits $24 four ways into $6 each', () => expect(splitFareCents(2400, 4)).toEqual([600, 600, 600, 600]));
  it('never loses a cent on uneven splits', () => {
    const shares = splitFareCents(1000, 3);
    expect(shares).toEqual([334, 333, 333]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
  });
});
