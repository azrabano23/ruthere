import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const RESEND_COOLDOWN_S = 30; // matches RESEND_COOLDOWN_MS on the server, which has the final say
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function SignIn({ onSignedIn }) {
  const [role, setRole] = useState(() => sessionStorage.getItem('ruthere-role') || 'rider');
  function chooseRole(next) { setRole(next); sessionStorage.setItem('ruthere-role', next); }
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
    <div className="welcome">
      <section className="hero-copy">
        <div className="eyebrow"><span className="status-dot" /> THE RUTGERS WAY TO GET THERE</div>
        <h1>Students,<br /><em>driven by<br />students.</em></h1>
        <p className="hero-description">Campus, off campus, and everything in between.<br className="desktop-break" /> Share the journey with your Rutgers community.</p>
        <div className="campus-art" aria-label="Destinations include Busch, Livingston, College Ave, Cook/Douglass, Off campus, and New Brunswick Train Station">
          <svg className="route-art" viewBox="0 0 640 230" aria-hidden="true"><path className="route-shadow" d="M30 95 C100 20 110 220 210 155 S300 10 370 85 S470 230 600 110"/><path className="route-line" d="M30 95 C100 20 110 220 210 155 S300 10 370 85 S470 230 600 110"/>{[[30,95],[145,154],[270,92],[370,85],[470,159],[600,110]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="8" />)}</svg>
          <span className="stop stop-1">Busch</span><span className="stop stop-2">Livingston</span><span className="stop stop-3">College Ave</span><span className="stop stop-4">Cook/Douglass</span><span className="stop stop-5">Off campus</span><span className="stop stop-6">New Brunswick<br />Train Station</span>
          <div className="art-caption">YOUR CAMPUS. YOUR PEOPLE. YOUR NEXT STOP.</div>
        </div>
      </section>
      <section className="card auth-card" id="signin" aria-labelledby="signin-heading">
        <div className="role-tabs" role="group" aria-label="Choose your travel role">
          <button type="button" aria-pressed={role === 'rider'} className={role === 'rider' ? 'active' : ''} onClick={() => chooseRole('rider')}>Rider</button>
          <button type="button" aria-pressed={role === 'driver'} className={role === 'driver' ? 'active' : ''} onClick={() => chooseRole('driver')}>Driver</button>
        </div>
        <span className="card-kicker">{role === 'rider' ? 'A SEAT IN THE RIGHT DIRECTION' : 'GOOD COMPANY. SHARED JOURNEYS.'}</span>
        <h2 id="signin-heading">{role === 'rider' ? 'Find your next ride.' : 'Take someone along.'}</h2>
        <p className="muted">{role === 'rider' ? 'Meet students already headed your way.' : 'Post your trip and share your available seats.'} Sign in with your Rutgers email to get started.</p>
      {step === 'email' && (
        <form onSubmit={requestCode}>
          <label>Rutgers email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="netid@scarletmail.rutgers.edu" /></label>
          <button disabled={busy}>{busy ? 'Sending your code…' : 'Send me a code →'}</button>
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
      {error && (
        <p className="error" role="alert">
          {error === 'Failed to fetch'
            ? 'We couldn’t connect to the sign-in service. Please try again shortly.'
            : error}
        </p>
      )}

      <div className="verification-note">
        <span aria-hidden="true">◇</span>
        <span>
          Rutgers email verification
          <br />
          <small>No passwords. Just a one-time code.</small>
        </span>
      </div>

      <button
        className="switch-role"
        type="button"
        onClick={() => chooseRole(role === 'rider' ? 'driver' : 'rider')}
      >
        {role === 'rider'
          ? 'Want to drive? Become a driver ↗'
          : 'Need a ride? Find a ride ↗'}
      </button>
    </section>
    </div>
  );
}
