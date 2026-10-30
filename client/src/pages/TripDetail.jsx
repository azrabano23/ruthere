import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const fmt = (iso) => new Date(iso).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function TripDetail({ user }) {
  const { id } = useParams();
  const [trip, setTrip] = useState(undefined);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.trip(id).then(setTrip).catch(() => setTrip(null)); }, [id]);

  if (trip === undefined) return <p>Loading…</p>;
  if (trip === null) return <section className="card"><p>Trip not found.</p><Link to="/trips">Back to trips</Link></section>;

  const mine = trip.posterId === user?.id;

  return (
    <section className="card narrow">
      <Link to="/trips" className="muted">← All trips</Link>
      <h1>{trip.origin.label} → {trip.destination.label}</h1>
      <dl className="facts">
        <dt>Leaving</dt><dd>{fmt(trip.departsAt)}</dd>
        <dt>Open seats</dt><dd>{trip.seats}</dd>
        <dt>Price</dt><dd>{trip.pricePerSeatCents == null ? 'Split the fare evenly' : `$${(trip.pricePerSeatCents / 100).toFixed(2)} per seat`}</dd>
        <dt>Posted by</dt><dd>{mine ? 'You' : (trip.posterName ?? 'A verified Rutgers student')}</dd>
        {trip.notes && <><dt>Notes</dt><dd>{trip.notes}</dd></>}
      </dl>
      {!mine && <button onClick={() => setMsg('Seat requests open Nov 9.')}>Request a seat</button>}
      {mine && <Link className="button" to="/my-trips">Manage in My trips</Link>}
      {msg && <p className="muted">{msg}</p>}
    </section>
  );
}
