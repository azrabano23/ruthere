import { buildAlertMessage, SAFETY_RESOURCES, HOLD_MS, CANCEL_WINDOW_MS } from '../src/lib/safety.js';

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
