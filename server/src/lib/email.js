// Sends the one-time sign-in code through Brevo's email API. In dev (no BREVO_API_KEY) it prints to the console.
// Uses HTTPS rather than SMTP because Render's free tier blocks SMTP ports.
// `fetch` can be passed in so tests can fake Brevo.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/** "RUThere <me@gmail.com>" -> { name: 'RUThere', email: 'me@gmail.com' }; a bare address works too. */
export function parseSender(from) {
  const m = String(from ?? '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || 'RUThere', email: m[2].trim() } : { name: 'RUThere', email: String(from ?? '').trim() };
}

export async function sendCode(email, code, { fetch = globalThis.fetch } = {}) {
  if (!process.env.BREVO_API_KEY) {
    if (process.env.NODE_ENV !== 'test') console.log(`\n[dev email] sign-in code for ${email}: ${code}\n`);
    return;
  }
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: parseSender(process.env.EMAIL_FROM),
      to: [{ email }],
      subject: `${code} is your RUThere sign-in code`,
      textContent: `Your RUThere code is ${code}. It expires in 10 minutes.`,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch((err) => ({ ok: false, status: 0, json: async () => ({ message: err.message }) }));
  if (!res.ok) {
    const { message } = await res.json().catch(() => ({}));
    if (process.env.NODE_ENV !== 'test') console.error(`[email] Brevo refused the code for ${email} (HTTP ${res.status}): ${message ?? 'no details'}`);
    throw Object.assign(new Error("We couldn't email your code. Try again in a minute."), { status: 502 });
  }
}
