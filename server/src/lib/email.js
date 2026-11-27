// Sends the one-time sign-in code through Brevo's email API. In dev (no BREVO_API_KEY) it prints to the console.
// Uses HTTPS rather than SMTP because Render's free tier blocks SMTP ports.
// `fetch` can be passed in so tests can fake Brevo.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/** "RUThere <me@gmail.com>" -> { name: 'RUThere', email: 'me@gmail.com' }; a bare address works too. */
export function parseSender(from) {
  const m = String(from ?? '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || 'RUThere', email: m[2].trim() } : { name: 'RUThere', email: String(from ?? '').trim() };
}

/**
 * Sends one plain-text email through Brevo. Returns true when Brevo accepted it, false when no
 * BREVO_API_KEY is set (dev and tests: nothing is sent). Throws when Brevo refuses or can't be reached.
 */
export async function sendEmail({ to, subject, text }, { fetch = globalThis.fetch } = {}) {
  if (!process.env.BREVO_API_KEY) return false;
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: parseSender(process.env.EMAIL_FROM), to: [{ email: to }], subject, textContent: text }),
    signal: AbortSignal.timeout(10_000),
  }).catch((err) => ({ ok: false, status: 0, json: async () => ({ message: err.message }) }));
  if (!res.ok) {
    const { message } = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`Brevo refused the email (HTTP ${res.status}): ${message ?? 'no details'}`), { status: 502 });
  }
  return true;
}

export async function sendCode(email, code, { fetch = globalThis.fetch } = {}) {
  try {
    const sent = await sendEmail({
      to: email,
      subject: `${code} is your RUThere sign-in code`,
      text: `Your RUThere code is ${code}. It expires in 10 minutes.`,
    }, { fetch });
    if (!sent && process.env.NODE_ENV !== 'test') console.log(`\n[dev email] sign-in code for ${email}: ${code}\n`);
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(`[email] code for ${email}: ${err.message}`);
    throw Object.assign(new Error("We couldn't email your code. Try again in a minute."), { status: 502 });
  }
}

/** Emails an emergency alert to the rider's emergency contact. Same return and errors as sendEmail. */
export function sendAlertEmail(to, { riderName, message }, { fetch = globalThis.fetch } = {}) {
  return sendEmail({ to, subject: `Emergency alert from ${riderName} on RUThere`, text: message }, { fetch });
}
