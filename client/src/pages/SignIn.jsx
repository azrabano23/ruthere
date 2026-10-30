import { useState } from 'react';
import { api } from '../lib/api.js';

export default function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email'); // email -> code -> profile
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({ displayName: '', paymentHandle: '' });

  async function requestCode(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await api.requestCode(email); setStep('code'); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function verify(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { user, isNew } = await api.verify(email, code);
      if (isNew) setStep('profile'); else onSignedIn(user);
      if (isNew) window.__pendingUser = user;
    } catch (err) {
      setError(err.message);
      if (err.data?.reason === 'expired' || err.data?.reason === 'locked') { setStep('email'); setCode(''); }
    } finally { setBusy(false); }
  }
  async function saveProfile(e) {
    e.preventDefault(); setBusy(true);
    try { const { user } = await api.updateMe(profile); onSignedIn(user); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <section className="card narrow">
      <h1>Sign in with your Rutgers email</h1>
      <p className="muted">Only verified Rutgers students can ride or drive. No passwords, just a one-time code.</p>
      {step === 'email' && (
        <form onSubmit={requestCode}>
          <label>Rutgers email<input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="netid@scarletmail.rutgers.edu" /></label>
          <button disabled={busy}>Send me a code</button>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={verify}>
          <p>We sent a six-digit code to <strong>{email}</strong>. It expires in 10 minutes.</p>
          <label>Code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} /></label>
          <button disabled={busy}>Verify</button>
          <button type="button" className="linkish" onClick={() => setStep('email')}>Use a different email</button>
        </form>
      )}
      {step === 'profile' && (
        <form onSubmit={saveProfile}>
          <p>Welcome! Two quick things so riders know who they're meeting and how to pay you.</p>
          <label>Display name<input required value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} placeholder="Azra B." /></label>
          <label>Venmo / Zelle handle<input value={profile.paymentHandle} onChange={(e) => setProfile({ ...profile, paymentHandle: e.target.value })} placeholder="@azra-bano" /></label>
          <button disabled={busy}>Finish</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
