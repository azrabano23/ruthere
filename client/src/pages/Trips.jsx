import { generateDemoTrips } from '../data/seedData.js';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import PickupMap from '../components/PickupMap.jsx';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const CAMPUSES = [
  'College Avenue',
  'Busch',
  'Livingston',
  'Cook',
  'Douglass',
];

const fmt = (iso) => new Date(iso).toLocaleString([], {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

// Convert a date to YYYY-MM-DD using local time.
const localDate = (iso) => {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Check if a trip's location belongs to a campus.
const matchesCampus = (place, campus) => {
  if (!place || !campus) return false;

  const location = [
    place.campus,
    place.label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return location.includes(campus.toLowerCase());
};

export default function Trips() {
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState('');

  // Filter states
  const [campusFilter, setCampusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    api.trips()
      .then(setTrips)
      .catch(() => {
        setError(
          'Could not load trips. Please refresh and try again.'
        );
      });
  }, []);

  // Filter trips by campus and departure date.
  const filteredTrips = useMemo(() => {
    if (!trips) return [];

    return trips.filter((trip) => {
      const campusMatch =
        !campusFilter ||
        matchesCampus(trip.origin, campusFilter) ||
        matchesCampus(trip.destination, campusFilter);

      const dateMatch =
        !dateFilter ||
        localDate(trip.departsAt) === dateFilter;

      return campusMatch && dateMatch;
    });
  }, [trips, campusFilter, dateFilter]);

  const clearFilters = () => {
    setCampusFilter('');
    setDateFilter('');
  };

  if (error) {
    return <p className="error" role="alert">{error}</p>;
  }

  if (!trips) {
    return <p>Loading trips…</p>;
  }

  return (
    <section>
      <div className="row between">
        <h1>Upcoming trips</h1>

        <Link className="button" to="/post">
          Post a trip
        </Link>
      </div>

      {/* Trip Filters */}
      <div className="card trip-filters">
        <h2>Find Your Ride</h2>

        <div className="filter-controls">

          {/* Campus Filter */}
          <div className="filter-group">
            <label htmlFor="campus-filter">
              Rutgers Campus
            </label>

            <select
              id="campus-filter"
              value={campusFilter}
              onChange={(e) =>
                setCampusFilter(e.target.value)
              }
            >
              <option value="">All Campuses</option>

              {CAMPUSES.map((campus) => (
                <option key={campus} value={campus}>
                  {campus}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label htmlFor="date-filter">
              Departure Date
            </label>

            <input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) =>
                setDateFilter(e.target.value)
              }
            />
          </div>

          {/* Reset Filters */}
          <button
            type="button"
            className="button clear-filters"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Trip Results */}
      <div className="trip-results">
        <h2>Available Rides</h2>

        <p className="muted">
          {filteredTrips.length} ride
          {filteredTrips.length === 1 ? '' : 's'} found
        </p>
      </div>

      {trips.length === 0 && (
        <p className="card muted">
          No trips yet. Be the first to post one.
        </p>
      )}

      {trips.length > 0 && filteredTrips.length === 0 && (
        <div className="card">
          <p>
            No rides match your selected campus and date.
          </p>

          <button
            type="button"
            className="button"
            onClick={clearFilters}
          >
            Show All Trips
          </button>
        </div>
      )}

      <ul className="trip-list">
        {filteredTrips.map((t) => (
          <li key={t.id} className="card trip">

            <Link
              to={`/trips/${t.id}`}
              className="route"
            >
              <strong>{t.origin.label}</strong>
              <span>→</span>
              <strong>{t.destination.label}</strong>
            </Link>

            <div className="meta">
              <span>{fmt(t.departsAt)}</span>

              <span>
                {t.seats} seat
                {t.seats === 1 ? '' : 's'}
              </span>

              <span>
                {t.pricePerSeatCents == null
                  ? 'Split the fare'
                  : `$${(
                      t.pricePerSeatCents / 100
                    ).toFixed(2)} / seat`}
              </span>
            </div>

            {t.notes && (
              <p className="muted">{t.notes}</p>
            )}

            <PickupMap place={t.origin} />
          </li>
        ))}
      </ul>
    </section>
  );
}
