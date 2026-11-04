import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function PlaceInput({ label, value, onChange }) {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    api.pickupSpots()
      .then((data) => {
        if (!cancelled) setSpots(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load campus spots. Please refresh.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const groups = spots.reduce((result, spot) => {
    (result[spot.campus] ??= []).push(spot);
    return result;
  }, {});

  return (
    <label>
      {label}

      <select
        value={value?.label ?? ''}
        onChange={(event) => {
          const selected = spots.find(
            (spot) => spot.label === event.target.value
          );

          onChange(selected ?? null);
        }}
        disabled={loading || Boolean(error)}
        required
      >
        <option value="">
          {loading ? 'Loading campus spots…' : 'Choose a spot…'}
        </option>

        {Object.entries(groups).map(([campus, list]) => (
          <optgroup key={campus} label={campus}>
            {list.map((spot) => (
              <option key={spot.id} value={spot.label}>
                {spot.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {error && (
        <small className="error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}