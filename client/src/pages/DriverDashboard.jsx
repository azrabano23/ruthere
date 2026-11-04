import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const fmt = (date) =>
  new Date(date).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function DriverDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.myTrips()
      .then(setTrips)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();

  const upcoming = trips.filter(
    (trip) => new Date(trip.departsAt).getTime() >= now
  );

  const past = trips.filter(
    (trip) => new Date(trip.departsAt).getTime() < now
  );

  const totalSeats = upcoming.reduce(
    (sum, trip) => sum + Number(trip.seats || 0),
    0
  );

  async function cancelTrip(id) {
    if (!window.confirm('Are you sure you want to cancel this trip?')) {
      return;
    }

    try {
      await api.cancelTrip(id);
      setTrips((previous) =>
        previous.filter((trip) => trip.id !== id)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function TripList({ items, canCancel }) {
    if (items.length === 0) {
      return <p className="muted">No trips to display.</p>;
    }

    return (
      <ul className="trip-list">
        {items.map((trip) => (
          <li key={trip.id} className="card trip">
            <Link to={`/trips/${trip.id}`} className="route">
              <strong>{trip.origin.label}</strong>
              <span>→</span>
              <strong>{trip.destination.label}</strong>
            </Link>

            <div className="meta">
              <span>{fmt(trip.departsAt)}</span>
              <span>{trip.seats} seats offered</span>
            </div>

            <div className="row">
              <Link to={`/trips/${trip.id}`}>
                View trip
              </Link>

              {canCancel && (
                <button
                  className="danger"
                  onClick={() => cancelTrip(trip.id)}
                >
                  Cancel trip
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <section>
      <div className="row between">
        <div>
          <h1>Driver Dashboard</h1>
          <p className="muted">
            Manage your trips with RUThere.
          </p>
        </div>

        <Link className="button" to="/post">
          Post a trip
        </Link>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="row">
        <div className="card">
          <h2>{upcoming.length}</h2>
          <p>Upcoming trips</p>
        </div>

        <div className="card">
          <h2>{totalSeats}</h2>
          <p>Seats offered</p>
        </div>

        <div className="card">
          <h2>{past.length}</h2>
          <p>Past trips</p>
        </div>
      </div>

      <h2>Upcoming Trips</h2>
      <TripList items={upcoming} canCancel={true} />

      <h2>Past Trips</h2>
      <TripList items={past} canCancel={false} />
    </section>
  );
}
