import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import PlaceInput from '../components/PlaceInput.jsx';

function defaultDeparture() {
  const d = new Date(Date.now() + 30 * 60_000); d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostTrip() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [departsAt, setDepartsAt] = useState(defaultDeparture());
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErrors([]); setBusy(true);
    try {
      await api.postTrip({
        origin, destination, departsAt: new Date(departsAt).toISOString(), seats: Number(seats),
        pricePerSeatCents: price === '' ? null : Math.round(Number(price) * 100), notes,
      });
      navigate('/trips');
    } catch (err) { setErrors(err.data?.errors ?? [err.message]); } finally { setBusy(false); }
  }

  return (
    <section className="card narrow">
      <h1>Post a trip</h1>
      <p className="muted">Where you're leaving from, where you're going, and when. Others headed the same way can join.</p>
      <form onSubmit={submit}>
        <PlaceInput label="Pickup" value={origin} onChange={setOrigin} placeholder="College Ave Student Center" />
        <PlaceInput label="Destination" value={destination} onChange={setDestination} placeholder="Busch Student Center" />
        <label>Leaving at<input type="datetime-local" required value={departsAt} onChange={(e) => setDepartsAt(e.target.value)} /></label>
        <div className="row">
          <label>Open seats<input type="number" min={1} max={7} required value={seats} onChange={(e) => setSeats(e.target.value)} /></label>
          <label>Price per seat ($, optional)<input type="number" min={0} step="0.50" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="6.00" /></label>
        </div>
        <label>Notes<input maxLength={280} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Meeting by the bus stop, blue Civic" /></label>
        <button disabled={busy || !origin || !destination}>Post trip</button>
      </form>
      {errors.length > 0 && <ul className="error">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    </section>
  );
}
