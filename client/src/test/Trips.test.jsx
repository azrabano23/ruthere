import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Trips from '../pages/Trips.jsx';

vi.mock('../lib/api.js', () => ({ api: { trips: vi.fn(), pickupSpots: vi.fn().mockResolvedValue([]) } }));
vi.mock('../components/PickupMap.jsx', () => ({ default: () => null }));
import { api } from '../lib/api.js';

const soon = (h) => new Date(Date.now() + h * 3600_000).toISOString();
const trips = [
  { id: 'a', origin: { label: 'College Ave Student Center', campus: 'College Ave' }, destination: { label: 'Busch Student Center', campus: 'Busch' }, departsAt: soon(2), seats: 2, pricePerSeatCents: 600, notes: '' },
  { id: 'b', origin: { label: 'Livingston Student Center', campus: 'Livingston' }, destination: { label: 'New Brunswick Train Station', campus: 'Off campus' }, departsAt: soon(3), seats: 1, pricePerSeatCents: null, notes: '' },
];

describe('trips page', () => {
  it('lists upcoming trips with price and seats', async () => {
    api.trips.mockResolvedValue(trips);
    render(<MemoryRouter><Trips /></MemoryRouter>);
    expect(await screen.findByText('College Ave Student Center')).toBeInTheDocument();
    expect(screen.getByText('$6.00 / seat')).toBeInTheDocument();
    expect(screen.getByText('Split the fare')).toBeInTheDocument();
    expect(screen.getByText(/2 rides found/)).toBeInTheDocument();
  });

  it('filters by campus and can clear the filter', async () => {
    api.trips.mockResolvedValue(trips);
    render(<MemoryRouter><Trips /></MemoryRouter>);
    await screen.findByText('College Ave Student Center');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /campus/i }), 'Livingston');
    expect(screen.queryByText('College Ave Student Center')).not.toBeInTheDocument();
    expect(screen.getByText('Livingston Student Center')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getByText('College Ave Student Center')).toBeInTheDocument();
  });

  it('shows an empty state when there are no trips', async () => {
    api.trips.mockResolvedValue([]);
    render(<MemoryRouter><Trips /></MemoryRouter>);
    expect(await screen.findByText(/no trips yet/i)).toBeInTheDocument();
  });
});
