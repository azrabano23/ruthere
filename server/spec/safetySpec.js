import { buildAlertMessage, deliverAlert, isEmailish, SAFETY_RESOURCES, HOLD_MS, CANCEL_WINDOW_MS } from '../src/lib/safety.js';

describe('emergency alert message', () => {
  const user = { displayName: 'Azra B.', email: 'ab@scarletmail.rutgers.edu' };
  const trip = { origin: { label: 'Hill Center' }, destination: { label: 'NB Train Station' }, departsAt: '2026-11-06T14:40:00Z' };
  it('names the rider, the trip and a map link', () => {
    const m = buildAlertMessage({ user, trip, location: { lat: 40.5, lng: -74.45 } });
    expect(m).toContain('Azra B.');
    expect(m).toContain('Hill Center to NB Train Station');
    expect(m).toContain('https://maps.google.com/?q=40.5,-74.45');
    expect(m).toContain('732-932-7211');
  });
  it('still sends something useful without a location or trip', () => {
    const m = buildAlertMessage({ user, trip: null, location: null });
    expect(m).toContain('Location was not available');
    expect(m).not.toContain('Trip:');
  });
});

describe('safety constants', () => {
  it('has 911 and RUPD as callable resources', () => {
    expect(SAFETY_RESOURCES.find((r) => r.id === '911').tel).toBe('tel:911');
    expect(SAFETY_RESOURCES.find((r) => r.id === 'rupd').tel).toMatch(/^tel:\d+$/);
  });
  it('requires a 2 second hold and gives 5 seconds to cancel', () => {
    expect(HOLD_MS).toBe(2000);
    expect(CANCEL_WINDOW_MS).toBe(5000);
  });
});

describe('delivering the alert', () => {
  const message = 'Help';
  it('emails the contact when they have an email address', async () => {
    const sent = [];
    const r = await deliverAlert({ contact: { name: 'Mom', phone: '7325550100', email: 'mom@example.com' }, riderName: 'Azra', message }, { send: async (to, body) => { sent.push({ to, ...body }); return true; } });
    expect(r).toEqual({ emailed: true });
    expect(sent).toEqual([{ to: 'mom@example.com', riderName: 'Azra', message }]);
  });
  it('skips the email when the contact only has a phone (the rider texts from their phone)', async () => {
    const send = jasmine.createSpy('send');
    expect(await deliverAlert({ contact: { name: 'Mom', phone: '7325550100' }, riderName: 'Azra', message }, { send })).toEqual({ emailed: false });
    expect(send).not.toHaveBeenCalled();
  });
  it('never throws when the email fails, so the rider can still call and text', async () => {
    const r = await deliverAlert({ contact: { email: 'mom@example.com' }, riderName: 'Azra', message }, { send: async () => { throw new Error('Brevo down'); } });
    expect(r).toEqual({ emailed: false, emailError: true });
  });
  it('accepts a blank or real-looking contact email only', () => {
    expect(isEmailish('')).toBeTrue();
    expect(isEmailish('mom@example.com')).toBeTrue();
    expect(isEmailish('mom at example')).toBeFalse();
  });
});
