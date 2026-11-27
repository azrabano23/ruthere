import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import TripDetail from '../pages/TripDetail.jsx';
import LiveNotices from '../components/LiveNotices.jsx';
import { describeEvent } from '../lib/realtime.js';

// Fake the socket layer: capture listeners so a test can push events in.
const listeners = new Set();
const watchTrip = vi.fn(() => () => {});
vi.mock('../lib/realtime.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    connect: vi.fn(),
    onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    watchTrip: (...a) => watchTrip(...a),
    watchGroup: vi.fn(() => () => {}),
  };
});
vi.mock('../lib/api.js', () => ({ api: { trip: vi.fn(), requestSeat: vi.fn(), giveUpSeat: vi.fn(), safetyResources: vi.fn().mockResolvedValue([]), updateMe: vi.fn(), reportReasons: vi.fn().mockResolvedValue({}), report: vi.fn(), block: vi.fn(), socketToken: vi.fn() } }));
vi.mock('../components/PickupMap.jsx', () => ({ default: () => null }));
import { api } from '../lib/api.js';

const push = (e) => act(async () => { for (const fn of listeners) fn(e); });
const trip = { id: 't1', posterId: 'driver', origin: { label: 'Hill Center' }, destination: { label: 'NB Train Station' }, departsAt: new Date(Date.now() + 3600_000).toISOString(), seats: 2, seatsLeft: 2, joined: false, pricePerSeatCents: 600, notes: '', people: [] };

function renderDetail() {
  return render(<MemoryRouter initialEntries={['/trips/t1']}><Routes><Route path="/trips/:id" element={<TripDetail user={{ id: 'rider', email: 'r@rutgers.edu' }} onUserChange={() => {}} />} /></Routes></MemoryRouter>);
}

describe('live updates on the trip page', () => {
  beforeEach(() => { listeners.clear(); watchTrip.mockClear(); api.trip.mockReset(); });

  it('watches the trip and refreshes when a seat is taken', async () => {
    api.trip.mockResolvedValueOnce(trip).mockResolvedValueOnce({ ...trip, seatsLeft: 1 });
    renderDetail();
    expect(await screen.findByText('2 of 2')).toBeInTheDocument();
    expect(watchTrip).toHaveBeenCalledWith('t1');
    await push({ channel: 'trip', type: 'seat_taken', tripId: 't1', seatsLeft: 1, by: 'Zen' });
    expect(await screen.findByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Zen took a seat. 1 left.');
  });

  it('ignores events for other trips', async () => {
    api.trip.mockResolvedValue(trip);
    renderDetail();
    await screen.findByText('2 of 2');
    await push({ channel: 'trip', type: 'seat_taken', tripId: 'someone-else', seatsLeft: 0 });
    expect(api.trip).toHaveBeenCalledTimes(1);
  });

  it('reloads after the socket reconnects, since Render may have slept', async () => {
    api.trip.mockResolvedValue(trip);
    renderDetail();
    await screen.findByText('2 of 2');
    await push({ channel: 'reconnected' });
    expect(api.trip).toHaveBeenCalledTimes(2);
  });
});

describe('live notices anywhere in the app', () => {
  it('shows a toast when the driver cancels', async () => {
    listeners.clear();
    render(<LiveNotices />);
    await push({ channel: 'notice', type: 'trip_cancelled', route: 'Hill Center → NB Train Station', at: '1' });
    expect(screen.getByRole('status')).toHaveTextContent('The driver cancelled Hill Center → NB Train Station.');
  });
});

describe('describeEvent', () => {
  it('turns events into one readable line', () => {
    expect(describeEvent({ type: 'seat_taken', by: 'Zen', seatsLeft: 1 })).toBe('Zen took a seat. 1 left.');
    expect(describeEvent({ type: 'group_locked' })).toMatch(/locked/);
    expect(describeEvent({ type: 'something_else' })).toBeNull();
  });
});
