import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const fmt = (iso) => new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function MyTrips() {
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.myTrips().then(setTrips).catch(() => setTrips([])); }, []);

  async function cancel(id) {
    if (!confirm('Cancel this trip? Anyone who joined will be notified.')) return;
    try { await api.cancelTrip(id); setTrips(trips.filter((t) => t.id !== id)); }
    catch (err) { setError(err.message); }
  }

  if (!trips) return <p>Loading…</p>;
  return (
    <section>
      <div className="row between">
        <h1>My trips</h1>
        <Link className="button" to="/post">Post a trip</Link>
      </div>
      {trips.length === 0 && <p className="card muted">You haven't posted any trips yet.</p>}
      <ul className="trip-list">
        {trips.map((t) => (
          <li key={t.id} className="card trip">
            <Link to={`/trips/${t.id}`} className="route"><strong>{t.origin.label}</strong><span>→</span><strong>{t.destination.label}</strong></Link>
            <div className="meta"><span>{fmt(t.departsAt)}</span><span>{t.seats} seat{t.seats === 1 ? '' : 's'}</span></div>
            <button className="danger" onClick={() => cancel(t.id)}>Cancel trip</button>
          </li>
        ))}
      </ul>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
