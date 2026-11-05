import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import TripDetail from '../pages/TripDetail.jsx';

vi.mock('../lib/api.js', () => ({ api: { trip: vi.fn(), requestSeat: vi.fn(), giveUpSeat: vi.fn(), safetyResources: vi.fn().mockResolvedValue([]), updateMe: vi.fn() } }));
vi.mock('../components/PickupMap.jsx', () => ({ default: () => null }));
import { api } from '../lib/api.js';

const trip = { id: 't1', posterId: 'driver', posterName: 'Zen', origin: { label: 'Hill Center' }, destination: { label: 'NB Train Station' }, departsAt: new Date(Date.now() + 3600_000).toISOString(), seats: 1, seatsLeft: 1, joined: false, pricePerSeatCents: 600, notes: '' };
const me = { id: 'rider', email: 'r@rutgers.edu', emergencyContactPhone: null };

function renderDetail(user = me) {
  return render(
    <MemoryRouter initialEntries={['/trips/t1']}>
      <Routes><Route path="/trips/:id" element={<TripDetail user={user} onUserChange={vi.fn()} />} /></Routes>
    </MemoryRouter>,
  );
}

describe('trip detail page', () => {
  it('lets a rider request the last seat and then shows the safety panel', async () => {
    api.trip.mockResolvedValue(trip);
    api.requestSeat.mockResolvedValue({ ok: true, seatsLeft: 0 });
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: /request a seat/i }));
    expect(api.requestSeat).toHaveBeenCalledWith('t1');
    expect(await screen.findByText(/you have a seat on this trip/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /emergency/i })).toBeInTheDocument();
  });

  it('tells the rider when the last seat was just taken', async () => {
    api.trip.mockResolvedValue(trip);
    api.requestSeat.mockRejectedValue(Object.assign(new Error('Sorry, that last seat just got taken'), { data: { reason: 'full' } }));
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: /request a seat/i }));
    expect(await screen.findByText(/last seat just got taken/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trip is full/i })).toBeDisabled();
  });

  it('does not offer the poster a seat on their own trip', async () => {
    api.trip.mockResolvedValue(trip);
    renderDetail({ id: 'driver', email: 'd@rutgers.edu' });
    expect(await screen.findByText(/manage in my trips/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request a seat/i })).not.toBeInTheDocument();
  });
});
