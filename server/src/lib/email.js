// Sends the one-time sign-in code. In dev (no RESEND_API_KEY) it prints to the console.
// `resend` can be passed in so tests can fake a failed send.
export async function sendCode(email, code, { resend } = {}) {
  if (!resend && !process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== 'test') console.log(`\n[dev email] sign-in code for ${email}: ${code}\n`);
    return;
  }
  if (!resend) {
    const { Resend } = await import('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  // Resend returns { error } instead of throwing, so check it or a failed send looks like success.
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'RUThere <onboarding@resend.dev>',
    to: email,
    subject: `${code} is your RUThere sign-in code`,
    text: `Your RUThere code is ${code}. It expires in 10 minutes.`,
  });
  if (error) {
    if (process.env.NODE_ENV !== 'test') console.error(`[email] Resend refused the code for ${email}: ${error.message}`);
    throw Object.assign(new Error("We couldn't email your code. Try again in a minute."), { status: 502 });
  }
}
