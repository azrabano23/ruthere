import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [meetingSpot, setMeetingSpot] = useState('');
  const [destination, setDestination] = useState('');
  const [departsAt, setDepartsAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    api.groups()
      .then(setGroups)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const created = await api.createGroup({ meetingSpot, destination, departsAt });
      navigate(`/groups/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2>Shared Uber Groups</h2>
      <p>Team up with up to 4 Rutgers students to split an Uber or Lyft fare.</p>

      <form onSubmit={handleCreate} style={{ marginBottom: '2rem' }}>
        <h3>Start a New Group</h3>
        <div>
          <label>
            Meeting Spot
            <input
              type="text"
              placeholder="e.g., College Ave Student Center"
              value={meetingSpot}
              onChange={(e) => setMeetingSpot(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Destination
            <input
              type="text"
              placeholder="e.g., Newark Airport (EWR) Terminal A"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Departure Time
            <input
              type="datetime-local"
              value={departsAt}
              onChange={(e) => setDepartsAt(e.target.value)}
              required
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Group'}
        </button>
      </form>

      <h3>Active Groups</h3>
      {loading ? (
        <p>Loading groups…</p>
      ) : groups.length === 0 ? (
        <p>No active Uber groups yet. Start one above!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {groups.map((g) => (
            <li key={g.id} style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '0.75rem', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{g.meetingSpot} → {g.destination}</strong>
                <span>{g.status.toUpperCase()} ({g.members?.length ?? 0}/{g.maxCapacity})</span>
              </div>
              <p style={{ margin: '0.4rem 0' }}>
                Departs: {new Date(g.departureTime ?? g.departsAt).toLocaleString()}
              </p>
              <Link to={`/groups/${g.id}`}>View &amp; Join →</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}