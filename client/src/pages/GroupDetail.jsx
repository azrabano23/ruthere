import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function GroupDetail({ user }) {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [spotInput, setSpotInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.group(id)
      .then((g) => {
        setGroup(g);
        setSpotInput(g.meetingSpot);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error && !group) return <p className="error">{error}</p>;
  if (!group) return <p>Loading group…</p>;

  const members = group.members ?? [];
  const isMember = members.some((m) => m.userId === user.id);
  const isLeader = members.some((m) => m.userId === user.id && m.role === 'leader');
  const isOpen = group.status === 'open';

  async function runAction(fn) {
    setError('');
    setBusy(true);
    try {
      const res = await fn();
      setGroup(res.group);
      setSpotInput(res.group.meetingSpot);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link to="/groups">← Back to Uber Groups</Link>
      <h2>{group.meetingSpot} → {group.destination}</h2>
      <p>
        <strong>Status:</strong> {group.status.toUpperCase()} &bull;{' '}
        <strong>Riders:</strong> {members.length} / {group.maxCapacity} &bull;{' '}
        <strong>Departs:</strong> {new Date(group.departureTime ?? group.departsAt).toLocaleString()}
      </p>

      {error && <p className="error">{error}</p>}

      <div style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem' }}>
        {!isMember && isOpen && (
          <button disabled={busy} onClick={() => runAction(() => api.joinGroup(group.id))}>
            Join Group
          </button>
        )}
        {isMember && group.status !== 'cancelled' && (
          <button disabled={busy} onClick={() => runAction(() => api.leaveGroup(group.id))}>
            Leave Group
          </button>
        )}
        {isLeader && isOpen && (
          <button disabled={busy} onClick={() => runAction(() => api.lockGroup(group.id))}>
            Lock Group (Ready to Book Uber)
          </button>
        )}
      </div>

      {isLeader && isOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAction(() => api.updateGroupMeetingSpot(group.id, spotInput));
          }}
          style={{ marginBottom: '1.5rem' }}
        >
          <label>
            Update Meeting Spot
            <input
              type="text"
              value={spotInput}
              onChange={(e) => setSpotInput(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={busy}>Save Spot</button>
        </form>
      )}

      <h3>Riders ({members.length}/{group.maxCapacity})</h3>
      <ul>
        {members.map((m) => (
          <li key={m.userId}>
            {m.displayName ?? m.email ?? m.userId} {m.role === 'leader' ? '(Leader)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}