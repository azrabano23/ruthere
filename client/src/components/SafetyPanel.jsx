import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { smsLink } from '../lib/sms.js';

const HOLD_MS = 2000;
const CANCEL_WINDOW_MS = 5000;

/**
 * Emergency button for an active trip (use case 7):
 *  - press and hold 2 seconds to arm
 *  - 5 second countdown to cancel an accidental press
 *  - then: the server emails the emergency contact (if they have an email), the phone's dialer opens
 *    with 911 ready, and when the rider comes back a button opens a ready-to-send text to the contact.
 * The app never calls or texts anyone by itself: the rider taps Call and Send. That keeps it free.
 */
export default function SafetyPanel({ trip, user, onUserChange }) {
  const [resources, setResources] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | holding | countdown | sent
  const [secondsLeft, setSecondsLeft] = useState(CANCEL_WINDOW_MS / 1000);
  const [status, setStatus] = useState('');
  const [textLink, setTextLink] = useState(null);
  const [contact, setContact] = useState({
    emergencyContactName: user?.emergencyContactName ?? '',
    emergencyContactPhone: user?.emergencyContactPhone ?? '',
    emergencyContactEmail: user?.emergencyContactEmail ?? '',
  });
  const holdTimer = useRef(null);
  const tick = useRef(null);

  useEffect(() => { api.safetyResources().then(setResources).catch(() => setResources([])); }, []);
  useEffect(() => () => { clearTimeout(holdTimer.current); clearInterval(tick.current); }, []);

  const hasContact = Boolean(user?.emergencyContactPhone || user?.emergencyContactEmail);
  const contactName = user?.emergencyContactName || 'your contact';

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
    if (!hasContact) {
      setStatus('No emergency contact is set, so nobody was notified. Tap Call in your dialer to reach 911.');
    } else {
      try {
        const r = await api.safetyAlert({ tripId: trip?.id, location });
        if (r.smsTo) setTextLink(smsLink(r.smsTo, r.message));
        setStatus(r.emailed
          ? `We emailed your location and trip to ${r.notified}. Tap Call in your dialer to reach 911.`
          : 'Tap Call in your dialer to reach 911.');
      } catch (err) {
        // The server couldn't be reached: still let the rider text their contact from their own phone.
        if (user.emergencyContactPhone) setTextLink(smsLink(user.emergencyContactPhone, fallbackMessage(location)));
        setStatus(`We couldn't reach the server (${err.message}). Tap Call in your dialer to reach 911.`);
      }
    }
    window.location.href = 'tel:911';
  }

  async function saveContact(e) {
    e.preventDefault();
    if (!contact.emergencyContactPhone.trim() && !contact.emergencyContactEmail.trim()) { setStatus('Add a phone number or an email for your contact.'); return; }
    try {
      const { user: updated } = await api.updateMe(contact);
      onUserChange?.(updated);
      setStatus('Emergency contact saved.');
    } catch (err) { setStatus(err.message); }
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
          <p>Alerting your emergency contact and opening 911 in <strong>{secondsLeft}</strong>…</p>
          <button className="danger" onClick={cancel}>Cancel, I'm OK</button>
        </div>
      ) : (
        <div className="emergency-sent">
          <p><strong>Emergency started.</strong> RUThere doesn't call or text anyone for you. You have to tap Call, and Send for the text.</p>
          {textLink && <a className="button emergency-text" href={textLink}>Text {contactName} my location</a>}
        </div>
      )}

      {!hasContact && (
        <form onSubmit={saveContact} className="contact-form">
          <p className="muted">No emergency contact yet. Add one so the button can reach someone you trust.</p>
          <div className="row">
            <label>Name<input required value={contact.emergencyContactName} onChange={(e) => setContact({ ...contact, emergencyContactName: e.target.value })} placeholder="Mom" /></label>
            <label>Phone<input type="tel" value={contact.emergencyContactPhone} onChange={(e) => setContact({ ...contact, emergencyContactPhone: e.target.value })} placeholder="732-555-0100" /></label>
            <label>Email (optional)<input type="email" value={contact.emergencyContactEmail} onChange={(e) => setContact({ ...contact, emergencyContactEmail: e.target.value })} placeholder="mom@example.com" /></label>
          </div>
          <button className="linkish" type="submit">Save contact</button>
        </form>
      )}
      {hasContact && <p className="muted">Emergency contact: {[user.emergencyContactName, user.emergencyContactPhone, user.emergencyContactEmail].filter(Boolean).join(' · ')}</p>}
      {status && <p className="muted" role="status">{status}</p>}
    </section>
  );
}

function fallbackMessage(location) {
  const where = location ? `My location: https://maps.google.com/?q=${location.lat},${location.lng}` : 'My location was not available.';
  return `I pressed the emergency button in RUThere and need help. ${where}`;
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
