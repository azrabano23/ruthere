import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Use case 6: report or block someone you're sharing a trip with.
 * Reports go to an admin. Blocking hides you from each other's trips for good.
 */
export default function ReportBlock({ people, tripId, onBlocked }) {
  const [reasons, setReasons] = useState({});
  const [open, setOpen] = useState(null); // id of the person being reported
  const [form, setForm] = useState({ reason: '', details: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.reportReasons().then(setReasons).catch(() => setReasons({})); }, []);

  // Nobody else on the trip yet: show nothing, but keep a "You blocked…" message on screen after the list empties.
  if (!people?.length && !msg) return null;

  async function sendReport(e, person) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      await api.report({ userId: person.id, tripId, ...form });
      setOpen(null); setForm({ reason: '', details: '' });
      setMsg(`Thanks. An admin will review your report about ${person.displayName}.`);
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }

  async function block(person) {
    if (!confirm(`Block ${person.displayName}? You won't see each other's trips, and neither of you can join the other's.`)) return;
    setBusy(true); setMsg('');
    try {
      await api.block(person.id);
      setMsg(`You blocked ${person.displayName}. You can undo this from your profile.`);
      onBlocked?.(person);
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }

  return (
    <section className="card report-block">
      <h2>People on this trip</h2>
      <ul className="people">
        {(people ?? []).map((p) => (
          <li key={p.id}>
            <div className="person-row">
              <span>{p.displayName} <span className="muted">· {p.role}</span></span>
              <span className="person-actions">
                <button type="button" className="linkish" disabled={busy} onClick={() => { setOpen(open === p.id ? null : p.id); setMsg(''); }}>Report</button>
                <button type="button" className="linkish" disabled={busy} onClick={() => block(p)}>Block</button>
              </span>
            </div>
            {open === p.id && (
              <form className="report-form" onSubmit={(e) => sendReport(e, p)}>
                <label>What happened?
                  <select required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                    <option value="" disabled>Choose a reason</option>
                    {Object.entries(reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>Details {form.reason !== 'other' && <span className="muted">(optional)</span>}
                  <textarea rows={3} maxLength={1000} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
                </label>
                <button disabled={busy}>Send report</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {msg && <p className="muted" role="status">{msg}</p>}
    </section>
  );
}
