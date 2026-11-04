import { sendCode, parseSender } from '../src/lib/email.js';

// Stand-in for fetch: records each request to Brevo and answers with the status and body we give it.
const fakeBrevo = (status, body) => {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url, ...init, body: JSON.parse(init.body) }); return { ok: status < 300, status, json: async () => body }; };
  return { calls, fetch };
};

describe('sending the sign-in code', () => {
  beforeEach(() => { process.env.BREVO_API_KEY = 'test-key'; process.env.EMAIL_FROM = 'RUThere <me@gmail.com>'; });
  afterEach(() => { delete process.env.BREVO_API_KEY; delete process.env.EMAIL_FROM; });

  it('emails the code to the user through Brevo', async () => {
    const brevo = fakeBrevo(201, { messageId: '<1@brevo>' });
    await sendCode('a@scarletmail.rutgers.edu', '123456', { fetch: brevo.fetch });
    const call = brevo.calls[0];
    expect(call.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(call.headers['api-key']).toBe('test-key');
    expect(call.body.to).toEqual([{ email: 'a@scarletmail.rutgers.edu' }]);
    expect(call.body.sender).toEqual({ name: 'RUThere', email: 'me@gmail.com' });
    expect(call.body.subject).toContain('123456');
  });
  it('fails loudly when Brevo refuses the email', async () => {
    const brevo = fakeBrevo(401, { code: 'unauthorized', message: 'Key not found' });
    await expectAsync(sendCode('a@rutgers.edu', '123456', { fetch: brevo.fetch })).toBeRejectedWith(jasmine.objectContaining({ status: 502 }));
  });
  it('fails loudly when Brevo cannot be reached', async () => {
    const fetch = async () => { throw new Error('getaddrinfo ENOTFOUND api.brevo.com'); };
    await expectAsync(sendCode('a@rutgers.edu', '123456', { fetch })).toBeRejectedWith(jasmine.objectContaining({ status: 502 }));
  });
  it('prints the code instead when there is no API key', async () => {
    delete process.env.BREVO_API_KEY;
    const brevo = fakeBrevo(201, {});
    await expectAsync(sendCode('a@rutgers.edu', '123456', { fetch: brevo.fetch })).toBeResolved();
    expect(brevo.calls.length).toBe(0);
  });
});

describe('reading the sender address', () => {
  it('splits a name and address', () => expect(parseSender('RUThere <me@gmail.com>')).toEqual({ name: 'RUThere', email: 'me@gmail.com' }));
  it('accepts a bare address', () => expect(parseSender('me@gmail.com')).toEqual({ name: 'RUThere', email: 'me@gmail.com' }));
});
