import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const RESEND_COOLDOWN_S = 30; // matches RESEND_COOLDOWN_MS on the server, which has the final say
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email'); // email -> code -> profile
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({ displayName: '', paymentHandle: '' });
  const [expiresAt, setExpiresAt] = useState(0); // when the current code dies, ms
  const [resendAt, setResendAt] = useState(0); // when "Resend code" unlocks, ms
  const [now, setNow] = useState(Date.now());

  // Tick once a second while the code step is on screen.
  useEffect(() => {
    if (step !== 'code') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = step === 'code' && secondsLeft === 0;

  function codeSent({ expiresInSeconds }) {
    const t = Date.now();
    setNow(t); setExpiresAt(t + expiresInSeconds * 1000); setResendAt(t + RESEND_COOLDOWN_S * 1000);
    setCode('');
  }
  function waitBeforeResend(err) {
    if (err.status !== 429) return;
    const t = Date.now();
    setNow(t); setResendAt(t + (err.data?.retryAfterSeconds ?? RESEND_COOLDOWN_S) * 1000);
  }

  async function requestCode(e) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try { codeSent(await api.requestCode(email)); setStep('code'); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function resendCode() {
    setError(''); setNotice(''); setBusy(true);
    try { codeSent(await api.requestCode(email)); setNotice(`New code sent to ${email}.`); }
    catch (err) { waitBeforeResend(err); setError(err.message); }
    finally { setBusy(false); }
  }
  async function verify(e) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      const { user, isNew } = await api.verify(email, code);
      if (isNew) setStep('profile'); else onSignedIn(user);
    } catch (err) {
      setError(err.message);
      // A dead code can't be retried, so end the countdown and point at "Resend code".
      if (err.data?.reason === 'expired' || err.data?.reason === 'locked') { setExpiresAt(0); setCode(''); }
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
          <p>We sent a six-digit code to <strong>{email}</strong>. Not in your inbox? Check spam.</p>
          <p className={expired ? 'error' : 'muted'} aria-live="polite">
            {expired ? 'This code has expired. Send a new one below.' : `Code expires in ${mmss(secondsLeft)}`}
          </p>
          <label>Code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} disabled={expired} /></label>
          <button disabled={busy || expired}>Verify</button>
          <button type="button" className="linkish" onClick={resendCode} disabled={busy || resendIn > 0}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </button>
          <button type="button" className="linkish" onClick={() => { setStep('email'); setError(''); setNotice(''); }}>Use a different email</button>
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
      {notice && <p className="muted">{notice}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
