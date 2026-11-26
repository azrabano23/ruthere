import { sendAlertEmail } from './email.js';

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

/**
 * Delivers the alert for free. Automatic texts need a paid SMS service, so:
 *  - the server emails the contact through Brevo when they have an email address (automatic), and
 *  - the rider's own phone sends the text (the client opens a ready-to-send `sms:` link with `message`).
 * Never throws: a failed email must not stop the rider from texting or calling.
 */
export async function deliverAlert({ contact, riderName, message }, { send = sendAlertEmail } = {}) {
  if (process.env.NODE_ENV !== 'test') console.log(`\n[emergency alert] to ${contact.name} <${contact.phone ?? ''} ${contact.email ?? ''}>:\n${message}\n`);
  if (!contact.email) return { emailed: false };
  try {
    return { emailed: await send(contact.email, { riderName, message }) };
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(`[emergency alert] email to the contact failed: ${err.message}`);
    return { emailed: false, emailError: true };
  }
}

/** Loose check for the emergency contact's email field (empty is allowed: email is optional). */
export const isEmailish = (s) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
