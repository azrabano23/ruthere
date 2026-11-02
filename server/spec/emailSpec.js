import { sendCode } from '../src/lib/email.js';

// Stand-in for the Resend client: records what was sent and returns whatever result we give it.
const fakeResend = (result) => {
  const sent = [];
  return { sent, emails: { send: async (msg) => { sent.push(msg); return result; } } };
};

describe('sending the sign-in code', () => {
  it('emails the code to the user', async () => {
    const resend = fakeResend({ data: { id: '1' }, error: null });
    await sendCode('a@rutgers.edu', '123456', { resend });
    expect(resend.sent[0].to).toBe('a@rutgers.edu');
    expect(resend.sent[0].subject).toContain('123456');
  });
  it('fails loudly when Resend refuses the email', async () => {
    const resend = fakeResend({ data: null, error: { message: 'You can only send testing emails to your own email address' } });
    await expectAsync(sendCode('a@rutgers.edu', '123456', { resend })).toBeRejectedWith(jasmine.objectContaining({ status: 502 }));
  });
  it('prints the code instead when there is no API key', async () => {
    delete process.env.RESEND_API_KEY;
    await expectAsync(sendCode('a@rutgers.edu', '123456')).toBeResolved();
  });
});
