const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY?.trim();

export default function PickupMap({ place, preview = false }) {
    if (!place) return null;

    const hasCoordinates =
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng) &&
    Math.abs(place.lat) <= 90 &&
    Math.abs(place.lng) <= 180;

    const location = hasCoordinates
    ? `${place.lat},${place.lng}`
    : place.label;

    if (!location) return null;

    const query = encodeURIComponent(location);
    const mapsLink =
    `https://www.google.com/maps/search/?api=1&query=${query}`;

    return (
    <div className="pickup-map">
    <div className="pickup-map-heading">
        <strong>Pickup location</strong>
        <a
        href={mapsLink}
        target="_blank"
        rel="noopener noreferrer"
        >
        Open in Google Maps ↗
        </a>
    </div>

    <p className="muted">{place.label}</p>

    {preview && (
        MAPS_KEY ? (
        <iframe
            title={`Pickup location: ${place.label}`}
            src={
            'https://www.google.com/maps/embed/v1/place' +
            `?key=${encodeURIComponent(MAPS_KEY)}&q=${query}&zoom=16`
            }
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
        />
        ) : (
        <p className="muted">
            Map preview is unavailable. Use the link above.
        </p>
        )
    )}
    </div>
);
}
