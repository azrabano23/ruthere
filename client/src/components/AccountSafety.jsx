import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const fmt = (iso) => new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Profile card: late-cancel strikes, any suspension, the emergency contact, and people you've blocked. */
export default function AccountSafety({ user, onUserChange }) {
  const [standing, setStanding] = useState(null);
  const [contact, setContact] = useState({ emergencyContactName: '', emergencyContactPhone: '', emergencyContactEmail: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.myStanding().then(setStanding).catch(() => setStanding(null)); }, []);
  useEffect(() => {
    setContact({
      emergencyContactName: user?.emergencyContactName ?? '',
      emergencyContactPhone: user?.emergencyContactPhone ?? '',
      emergencyContactEmail: user?.emergencyContactEmail ?? '',
    });
  }, [user]);

  async function saveContact(e) {
    e.preventDefault(); setMsg('');
    if (!contact.emergencyContactPhone.trim() && !contact.emergencyContactEmail.trim()) { setMsg('Add a phone number or an email for your contact.'); return; }
    setBusy(true);
    try {
      const { user: updated } = await api.updateMe(contact);
      onUserChange?.(updated);
      setMsg('Emergency contact saved.');
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }

  async function unblock(person) {
    setBusy(true); setMsg('');
    try {
      await api.unblock(person.id);
      setStanding({ ...standing, blocked: standing.blocked.filter((p) => p.id !== person.id) });
      setMsg(`You unblocked ${person.displayName}.`);
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }

  return (
    <section className="profile-card account-safety">
      <h2>Safety and standing</h2>

      {standing && (
        <div className="profile-field">
          <label>Late cancellations</label>
          {standing.suspendedUntil
            ? <p className="profile-error">You can't request rides until {fmt(standing.suspendedUntil)}.</p>
            : <p>{standing.strikes} of {standing.strikeLimit} strikes in the last 30 days.</p>}
          <p className="muted">Giving up a seat less than an hour before departure is a strike. Three in 30 days pause ride requests for a week.</p>
        </div>
      )}

      <form className="profile-form" onSubmit={saveContact}>
        <div className="profile-field">
          <label htmlFor="ec-name">Emergency contact name</label>
          <input id="ec-name" value={contact.emergencyContactName} onChange={(e) => setContact({ ...contact, emergencyContactName: e.target.value })} placeholder="Mom" maxLength={80} />
        </div>
        <div className="profile-field">
          <label htmlFor="ec-phone">Their phone (for the text you send)</label>
          <input id="ec-phone" type="tel" value={contact.emergencyContactPhone} onChange={(e) => setContact({ ...contact, emergencyContactPhone: e.target.value })} placeholder="732-555-0100" maxLength={30} />
        </div>
        <div className="profile-field">
          <label htmlFor="ec-email">Their email (we email them automatically)</label>
          <input id="ec-email" type="email" value={contact.emergencyContactEmail} onChange={(e) => setContact({ ...contact, emergencyContactEmail: e.target.value })} placeholder="mom@example.com" maxLength={120} />
        </div>
        <button type="submit" className="save-profile-button" disabled={busy}>Save emergency contact</button>
      </form>

      {standing?.blocked?.length > 0 && (
        <div className="profile-field">
          <label>People you blocked</label>
          <ul className="people">
            {standing.blocked.map((p) => (
              <li key={p.id} className="person-row">
                <span>{p.displayName}</span>
                <button type="button" className="linkish" disabled={busy} onClick={() => unblock(p)}>Unblock</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {msg && <p className="muted" role="status">{msg}</p>}
    </section>
  );
}
