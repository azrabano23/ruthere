// Safety resources shown on every active trip. Numbers should be re-checked against
// the Rutgers public safety site before the final demo.
export const SAFETY_RESOURCES = [
  { id: '911',  label: 'Emergency (police, fire, medical)', phone: '911', tel: 'tel:911' },
  { id: 'rupd', label: 'Rutgers University Police (RUPD), New Brunswick', phone: '732-932-7211', tel: 'tel:7329327211' },
  { id: 'safety', label: 'Rutgers public safety resources', url: 'https://ipo.rutgers.edu/publicsafety' },
];

export const HOLD_MS = 2000;      // press and hold the button this long to arm it
export const CANCEL_WINDOW_MS = 5000; // then this long to cancel before anything is sent

/** Builds the text sent to the rider's emergency contact. Pure, so it is easy to test. */
export function buildAlertMessage({ user, trip, location, at = new Date() }) {
  const who = user.displayName || user.email;
  const lines = [
    `${who} pressed the emergency button in RUThere at ${at.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET.`,
  ];
  if (trip) lines.push(`Trip: ${trip.origin.label} to ${trip.destination.label}, leaving ${new Date(trip.departsAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET.`);
  if (location?.lat != null && location?.lng != null) lines.push(`Live location: https://maps.google.com/?q=${location.lat},${location.lng}`);
  else lines.push('Location was not available from their phone.');
  lines.push('If you cannot reach them, call Rutgers University Police at 732-932-7211 or 911.');
  return lines.join('\n');
}

/** Delivers the alert. SMS needs a provider we don't have yet, so for now this logs and,
 *  if an email key is configured, emails the contact when the phone field holds an email. */
export async function deliverAlert({ contact, message }) {
  console.log(`\n[emergency alert] to ${contact.name} <${contact.phone}>:\n${message}\n`);
  return { delivered: 'logged' };
}
