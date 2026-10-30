import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const fmt = (iso) => new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function Trips() {
  const [trips, setTrips] = useState(null);
  useEffect(() => { api.trips().then(setTrips).catch(() => setTrips([])); }, []);
  if (!trips) return <p>Loading trips…</p>;
  return (
    <section>
      <div className="row between">
        <h1>Upcoming trips</h1>
        <Link className="button" to="/post">Post a trip</Link>
      </div>
      {trips.length === 0 && <p className="card muted">No trips yet. Be the first to post one.</p>}
      <ul className="trip-list">
        {trips.map((t) => (
          <li key={t.id} className="card trip">
            <div className="route"><strong>{t.origin.label}</strong><span>→</span><strong>{t.destination.label}</strong></div>
            <div className="meta">
              <span>{fmt(t.departsAt)}</span>
              <span>{t.seats} seat{t.seats === 1 ? '' : 's'}</span>
              <span>{t.pricePerSeatCents == null ? 'Split the fare' : `$${(t.pricePerSeatCents / 100).toFixed(2)} / seat`}</span>
            </div>
            {t.notes && <p className="muted">{t.notes}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
