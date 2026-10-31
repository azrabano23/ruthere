// Sends the one-time sign-in code. In dev (no RESEND_API_KEY) it prints to the console.
export async function sendCode(email, code) {
  if (!process.env.RESEND_API_KEY) {
  if (process.env.NODE_ENV !== 'test') console.log(`\n[dev email] sign-in code for ${email}: ${code}\n`);
    return;
  }
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'RUThere <noreply@ruthere.app>',
    to: email,
    subject: `${code} is your RUThere sign-in code`,
    text: `Your RUThere code is ${code}. It expires in 10 minutes.`,
  });
}
