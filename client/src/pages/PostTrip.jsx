import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import PlaceInput from '../components/PlaceInput.jsx';

function localTime(minutes) {
  const date = new Date(Date.now() + minutes * 60000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function displayTime(value) {
  return value
    ? new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not selected';
}

export default function PostTrip() {
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState({
    type: 'Sedan',
    make: '',
    model: '',
    color: '',
    plate: '',
    capacity: 4,
  });

  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [departure, setDeparture] = useState(() => localTime(30));
  const [pickup, setPickup] = useState(() => localTime(40));
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateVehicle(field, value) {
    setVehicle((current) => ({ ...current, [field]: value }));

    if (field === 'capacity') {
      setSeats((current) => Math.min(current, Number(value)));
    }
  }

  async function publishRide(event) {
    event.preventDefault();
    setError('');

    if (!origin || !destination) {
      setError('Choose your pickup location and destination.');
      return;
    }

    if (new Date(pickup) < new Date(departure)) {
      setError('Rider pickup must be at or after your departure time.');
      return;
    }

    if (new Date(pickup) > new Date(localTime(14 * 24 * 60))) {
      setError('Pickup must be within the next two weeks.');
      return;
    }

    const vehicleDescription = [
      vehicle.color.trim(),
      vehicle.make.trim(),
      vehicle.model.trim(),
    ].join(' ');

    const notes = [
      `${vehicle.type}: ${vehicleDescription}`,
      `Plate: ${vehicle.plate.trim()}`,
      `Rider pickup: ${displayTime(pickup)}`,
      instructions.trim(),
    ].filter(Boolean).join(' | ');

    if (notes.length > 280) {
      setError('Please shorten your pickup instructions or vehicle details.');
      return;
    }

    setBusy(true);

    try {
      await api.postTrip({
        origin,
        destination,
        departsAt: new Date(departure).toISOString(),
        seats: Number(seats),
        pricePerSeatCents:
          price === '' ? null : Math.round(Number(price) * 100),
        notes,
      });

      navigate('/my-trips');
    } catch (err) {
      setError(err.data?.errors?.join(' · ') || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="driver-page">
      <header className="driver-heading">
        <div>
          <p className="driver-eyebrow">YOUR ROUTE. YOUR SCHEDULE.</p>
          <h1>Let’s get them there.</h1>
          <p className="muted">
            Your driver dashboard. A few details, then you’re on your way.
          </p>
        </div>

        <Link to="/my-trips">My posted rides ↗</Link>
      </header>

      <form className="driver-grid" onSubmit={publishRide}>
        <div className="driver-sections">
          <section className="card driver-panel">
            <div className="driver-section-heading">
              <span>01</span>
              <div>
                <h2>Your vehicle</h2>
                <p className="muted">
                  Help your riders recognize you at pickup.
                </p>
              </div>
            </div>

            <fieldset className="driver-car-types">
              <legend>What are you driving?</legend>

              {['Sedan', 'SUV', 'Hatchback', 'Minivan', 'Other'].map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={vehicle.type === type}
                    className={vehicle.type === type ? 'selected' : ''}
                    onClick={() => updateVehicle('type', type)}
                  >
                    {type}
                  </button>
                )
              )}
            </fieldset>

            <div className="row">
              <label>
                Car make
                <input
                  required
                  maxLength={25}
                  placeholder="Toyota"
                  value={vehicle.make}
                  onChange={(e) => updateVehicle('make', e.target.value)}
                />
              </label>

              <label>
                Car model
                <input
                  required
                  maxLength={25}
                  placeholder="Corolla"
                  value={vehicle.model}
                  onChange={(e) => updateVehicle('model', e.target.value)}
                />
              </label>
            </div>

            <div className="row">
              <label>
                Car color
                <input
                  required
                  maxLength={20}
                  placeholder="Silver"
                  value={vehicle.color}
                  onChange={(e) => updateVehicle('color', e.target.value)}
                />
              </label>

              <label>
                License plate
                <input
                  required
                  maxLength={12}
                  placeholder="ABC1234"
                  value={vehicle.plate}
                  onChange={(e) =>
                    updateVehicle('plate', e.target.value.toUpperCase())
                  }
                />
              </label>
            </div>

            <div className="row">
              <label>
                Passenger capacity
                <select
                  value={vehicle.capacity}
                  onChange={(e) =>
                    updateVehicle('capacity', Number(e.target.value))
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((number) => (
                    <option key={number} value={number}>
                      {number} passenger{number > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                <small className="muted">
                  Seats with seat belts, excluding you.
                </small>
              </label>

              <label>
                Seats to offer
                <select
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                >
                  {Array.from(
                    { length: vehicle.capacity },
                    (_, index) => index + 1
                  ).map((number) => (
                    <option key={number} value={number}>
                      {number} available seat{number > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="card driver-panel">
            <div className="driver-section-heading">
              <span>02</span>
              <div>
                <h2>Your route & timing</h2>
                <p className="muted">
                  Campus, off campus, and the train home.
                </p>
              </div>
            </div>

            <div className="row">
              <PlaceInput
                label="Pickup location"
                value={origin}
                onChange={setOrigin}
              />

              <PlaceInput
                label="Destination"
                value={destination}
                onChange={setDestination}
              />
            </div>

            <div className="row">
              <label>
                You’re leaving at
                <input
                  required
                  type="datetime-local"
                  min={localTime(10)}
                  max={localTime(14 * 24 * 60)}
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                />
                <small className="muted">
                  When you start driving. Times are local.
                </small>
              </label>

              <label>
                Rider pickup at
                <input
                  required
                  type="datetime-local"
                  min={departure}
                  max={localTime(14 * 24 * 60)}
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                />
                <small className="muted">
                  When riders should meet you.
                </small>
              </label>
            </div>

            <label>
              Price per seat ($, optional)
              <input
                type="number"
                min="0"
                step="0.50"
                placeholder="Leave blank to split the fare"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>

            <label>
              Pickup instructions (optional)
              <textarea
                rows={3}
                maxLength={80}
                placeholder="Meet outside the main entrance."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </label>
          </section>
        </div>

        <aside className="card driver-summary">
          <p className="driver-eyebrow">YOUR RIDE, AT A GLANCE</p>

          <svg
            className="driver-car-art"
            viewBox="0 0 300 140"
            aria-hidden="true"
          >
            <path
              d="M35 85 65 76 89 40h105l35 36 31 10v30H35Z"
              fill="var(--wash, #eed5d2)"
              stroke="var(--red)"
              strokeWidth="3"
            />
            <path
              d="m94 49-18 28h132l-28-28Z"
              fill="var(--paper)"
              stroke="var(--red)"
              strokeWidth="2"
            />
            <path
              d="M140 49v28"
              stroke="var(--red)"
              strokeWidth="2"
            />
            <circle cx="82" cy="115" r="16" fill="var(--ink)" />
            <circle cx="217" cy="115" r="16" fill="var(--ink)" />
            <circle cx="82" cy="115" r="7" fill="var(--paper)" />
            <circle cx="217" cy="115" r="7" fill="var(--paper)" />
          </svg>

          <h2>
            {vehicle.make || vehicle.model
              ? `${vehicle.make} ${vehicle.model}`
              : 'Your next shared ride'}
          </h2>

          <p className="muted">
            {vehicle.color || 'Car color'} · {vehicle.type}
          </p>

          <div className="driver-plate">
            {vehicle.plate || 'YOUR PLATE'}
          </div>

          <div className="driver-route">
            <strong>○ {origin?.label || 'Choose pickup'}</strong>
            <span>↓</span>
            <strong>● {destination?.label || 'Choose destination'}</strong>
          </div>

          <dl className="facts">
            <dt>Leaving</dt>
            <dd>{displayTime(departure)}</dd>

            <dt>Rider pickup</dt>
            <dd>{displayTime(pickup)}</dd>

            <dt>Seats offered</dt>
            <dd>{seats}</dd>

            <dt>Per seat</dt>
            <dd>
              {price === '' ? 'Split fare' : `$${Number(price).toFixed(2)}`}
            </dd>
          </dl>

          <button
            className="driver-publish"
            disabled={busy || !origin || !destination}
          >
            {busy ? 'Publishing…' : 'Publish ride →'}
          </button>

          <p className="driver-footnote">
            Review your details before making this ride available.
          </p>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </aside>
      </form>
    </section>
  );
}
