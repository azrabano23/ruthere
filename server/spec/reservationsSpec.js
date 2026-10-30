import { decideReservation } from '../src/lib/reservations.js';
import { createStore } from '../src/db/store.js';

const now = Date.parse('2026-11-06T13:00:00Z');
const trip = { id: 't1', posterId: 'driver', seats: 1, departsAt: new Date(now + 3600_000).toISOString() };

describe('reservation rules', () => {
  const base = { trip, riderId: 'r1', reservedCount: 0, riderAlreadyIn: false, now };
  it('lets a rider take an open seat', () => expect(decideReservation(base).ok).toBeTrue());
  it('refuses when the trip is full', () => expect(decideReservation({ ...base, reservedCount: 1 }).reason).toBe('full'));
  it('refuses the poster on their own trip', () => expect(decideReservation({ ...base, riderId: 'driver' }).reason).toBe('own_trip'));
  it('refuses a second join by the same rider', () => expect(decideReservation({ ...base, riderAlreadyIn: true }).reason).toBe('already_joined'));
  it('refuses once the trip has left', () => expect(decideReservation({ ...base, now: now + 7200_000 }).reason).toBe('departed'));
});

describe('last-seat race', () => {
  it('gives the last seat to exactly one of many simultaneous riders', async () => {
    delete process.env.DATABASE_URL;
    const store = await createStore();
    const driver = await store.users.create({ email: 'driver@rutgers.edu' });
    const posted = await store.trips.create({ posterId: driver.id, origin: { label: 'CASC', lat: 0, lng: 0 }, destination: { label: 'BSC', lat: 1, lng: 1 }, departsAt: new Date(Date.now() + 3600_000).toISOString(), seats: 1, pricePerSeatCents: 600, notes: '' });

    const riders = await Promise.all(Array.from({ length: 25 }, (_, i) => store.users.create({ email: `rider${i}@rutgers.edu` })));
    const results = await Promise.all(riders.map((r) => store.reservations.reserve(posted.id, r.id)));

    const winners = results.filter((r) => r.ok);
    expect(winners.length).toBe(1);
    expect(results.filter((r) => r.reason === 'full').length).toBe(24);
    expect(await store.reservations.countForTrip(posted.id)).toBe(1);
  });
});
