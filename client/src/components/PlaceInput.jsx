import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

/**
 * Address input. With VITE_GOOGLE_MAPS_KEY set it uses Google Places Autocomplete;
 * without it, it offers the campus pickup spots from the proposal so the app runs with no keys.
 * onChange receives { label, lat, lng } or null.
 */
export default function PlaceInput({ label, value, onChange, placeholder }) {
  return MAPS_KEY ? <GooglePlaceInput label={label} value={value} onChange={onChange} placeholder={placeholder} />
                  : <SpotPicker label={label} value={value} onChange={onChange} />;
}

function SpotPicker({ label, value, onChange }) {
  const [spots, setSpots] = useState([]);
  useEffect(() => { api.pickupSpots().then(setSpots).catch(() => setSpots([])); }, []);
  const groups = spots.reduce((acc, s) => ((acc[s.campus] ??= []).push(s), acc), {});
  return (
    <label>{label}
      <select value={value?.label ?? ''} onChange={(e) => onChange(spots.find((s) => s.label === e.target.value) ?? null)} required>
        <option value="">Choose a spot…</option>
        {Object.entries(groups).map(([campus, list]) => (
          <optgroup key={campus} label={campus}>{list.map((s) => <option key={s.id} value={s.label}>{s.label}</option>)}</optgroup>
        ))}
      </select>
      <small className="muted">Campus spots only until a Google Maps key is added (see .env.example).</small>
    </label>
  );
}

let mapsLoader;
function loadMaps() {
  if (!mapsLoader) {
    mapsLoader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&loading=async`;
      s.async = true; s.onload = () => resolve(window.google); s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return mapsLoader;
}

function GooglePlaceInput({ label, value, onChange, placeholder }) {
  const ref = useRef(null);
  const [text, setText] = useState(value?.label ?? '');
  useEffect(() => {
    let ac;
    loadMaps().then((google) => {
      ac = new google.maps.places.Autocomplete(ref.current, {
        fields: ['formatted_address', 'geometry', 'name'],
        componentRestrictions: { country: 'us' },
        bounds: new google.maps.LatLngBounds({ lat: 40.44, lng: -74.52 }, { lat: 40.56, lng: -74.38 }), // New Brunswick area
        strictBounds: false,
      });
      ac.addListener('place_changed', () => {
        const p = ac.getPlace();
        if (!p.geometry) return onChange(null);
        const place = { label: p.name || p.formatted_address, lat: p.geometry.location.lat(), lng: p.geometry.location.lng() };
        setText(place.label); onChange(place);
      });
    });
    return () => ac && window.google?.maps.event.clearInstanceListeners(ac);
  }, []);
  return (
    <label>{label}
      <input ref={ref} value={text} onChange={(e) => { setText(e.target.value); onChange(null); }} placeholder={placeholder ?? 'Search an address or place'} required />
    </label>
  );
}
