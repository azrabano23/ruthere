import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import SignIn from '../pages/SignIn.jsx';

vi.mock('../lib/api.js', () => ({ api: { requestCode: vi.fn(), verify: vi.fn(), updateMe: vi.fn() } }));
import { api } from '../lib/api.js';

const renderSignIn = () => render(<MemoryRouter><SignIn onSignedIn={vi.fn()} /></MemoryRouter>);

describe('sign-in page', () => {
  it('shows the rider view by default and switches to driver', async () => {
    renderSignIn();
    expect(screen.getByRole('button', { name: 'Rider' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Driver' }));
    expect(screen.getByRole('button', { name: 'Driver' })).toHaveAttribute('aria-pressed', 'true');
    expect(sessionStorage.getItem('ruthere-role')).toBe('driver');
  });

  it('asks for a code and moves to the code step', async () => {
    api.requestCode.mockResolvedValue({ ok: true });
    renderSignIn();
    await userEvent.type(screen.getByLabelText(/rutgers email/i), 'ab2895@scarletmail.rutgers.edu');
    await userEvent.click(screen.getByRole('button', { name: /send me a code/i }));
    expect(api.requestCode).toHaveBeenCalledWith('ab2895@scarletmail.rutgers.edu');
    expect(await screen.findByLabelText(/code/i)).toBeInTheDocument();
  });

  it('shows a friendly message when the server rejects the email', async () => {
    api.requestCode.mockRejectedValue(new Error('Use your Rutgers email'));
    renderSignIn();
    await userEvent.type(screen.getByLabelText(/rutgers email/i), 'me@gmail.com');
    await userEvent.click(screen.getByRole('button', { name: /send me a code/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use your Rutgers email');
  });
});
