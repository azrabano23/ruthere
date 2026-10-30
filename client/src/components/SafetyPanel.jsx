import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const HOLD_MS = 2000;
const CANCEL_WINDOW_MS = 5000;

/**
 * Emergency button for an active trip (use case 7):
 *  - press and hold 2 seconds to arm
 *  - 5 second countdown to cancel an accidental press
 *  - then: send live location + trip details to the emergency contact, and open the dialer with 911
 * The app never calls 911 itself; the rider taps the call button in their phone's dialer.
 */
export default function SafetyPanel({ trip, user, onUserChange }) {
  const [resources, setResources] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | holding | countdown | sent
  const [secondsLeft, setSecondsLeft] = useState(CANCEL_WINDOW_MS / 1000);
  const [status, setStatus] = useState('');
  const [contact, setContact] = useState({ emergencyContactName: user?.emergencyContactName ?? '', emergencyContactPhone: user?.emergencyContactPhone ?? '' });
  const holdTimer = useRef(null);
  const tick = useRef(null);

  useEffect(() => { api.safetyResources().then(setResources).catch(() => setResources([])); }, []);
  useEffect(() => () => { clearTimeout(holdTimer.current); clearInterval(tick.current); }, []);

  const hasContact = Boolean(user?.emergencyContactPhone);

  function startHold() {
    if (phase !== 'idle') return;
    setPhase('holding');
    holdTimer.current = setTimeout(startCountdown, HOLD_MS);
  }
  function endHold() {
    if (phase === 'holding') { clearTimeout(holdTimer.current); setPhase('idle'); }
  }
  function startCountdown() {
    setPhase('countdown'); setSecondsLeft(CANCEL_WINDOW_MS / 1000);
    let left = CANCEL_WINDOW_MS / 1000;
    tick.current = setInterval(() => {
      left -= 1; setSecondsLeft(left);
      if (left <= 0) { clearInterval(tick.current); fire(); }
    }, 1000);
  }
  function cancel() { clearInterval(tick.current); setPhase('idle'); setStatus('Cancelled. Nothing was sent.'); }

  async function fire() {
    setPhase('sent');
    const location = await getLocation();
    try {
      if (hasContact) {
        const r = await api.safetyAlert({ tripId: trip?.id, location });
        setStatus(`Your location and trip details were sent to ${r.notified}. Tap Call in your dialer to reach 911.`);
      } else {
        setStatus('No emergency contact is set, so nobody was notified. Tap Call in your dialer to reach 911.');
      }
    } catch (err) { setStatus(`Could not notify your contact (${err.message}). Tap Call in your dialer to reach 911.`); }
    window.location.href = 'tel:911';
  }

  async function saveContact(e) {
    e.preventDefault();
    const { user: updated } = await api.updateMe(contact);
    onUserChange?.(updated);
    setStatus('Emergency contact saved.');
  }

  return (
    <section className="card safety">
      <h2>Safety</h2>
      <ul className="resources">
        {resources.map((r) => (
          <li key={r.id}>{r.tel ? <a href={r.tel}>{r.label}: <strong>{r.phone}</strong></a> : <a href={r.url} target="_blank" rel="noreferrer">{r.label}</a>}</li>
        ))}
      </ul>

      {phase === 'idle' || phase === 'holding' ? (
        <button
          className={`emergency ${phase === 'holding' ? 'arming' : ''}`}
          onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          {phase === 'holding' ? 'Keep holding…' : 'Emergency: press and hold 2 seconds'}
        </button>
      ) : phase === 'countdown' ? (
        <div className="countdown">
          <p>Sending your location to your emergency contact and opening 911 in <strong>{secondsLeft}</strong>…</p>
          <button className="danger" onClick={cancel}>Cancel, I'm OK</button>
        </div>
      ) : (
        <p><strong>Emergency started.</strong> You must tap Call yourself; pressing this button does not contact 911 on its own.</p>
      )}

      {!hasContact && (
        <form onSubmit={saveContact} className="contact-form">
          <p className="muted">No emergency contact yet. Add one so the button can notify someone you trust.</p>
          <div className="row">
            <label>Name<input required value={contact.emergencyContactName} onChange={(e) => setContact({ ...contact, emergencyContactName: e.target.value })} placeholder="Mom" /></label>
            <label>Phone<input required value={contact.emergencyContactPhone} onChange={(e) => setContact({ ...contact, emergencyContactPhone: e.target.value })} placeholder="732-555-0100" /></label>
          </div>
          <button className="linkish" type="submit">Save contact</button>
        </form>
      )}
      {hasContact && <p className="muted">Emergency contact: {user.emergencyContactName} ({user.emergencyContactPhone})</p>}
      {status && <p className="muted">{status}</p>}
    </section>
  );
}

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 4000 },
    );
  });
}
