import { describe, it, expect } from 'vitest';
import { smsLink } from '../lib/sms.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36';

describe('ready-to-send text link', () => {
  it('uses &body= on iPhone', () => {
    expect(smsLink('732-555-0100', 'Help', IPHONE)).toBe('sms:7325550100&body=Help');
  });
  it('uses ?body= on Android', () => {
    expect(smsLink('(732) 555-0100', 'Help', ANDROID)).toBe('sms:7325550100?body=Help');
  });
  it('encodes the message so the map link and line breaks survive', () => {
    const link = smsLink('+17325550100', 'Need help\nhttps://maps.google.com/?q=40.5,-74.45', ANDROID);
    expect(link.startsWith('sms:+17325550100?body=')).toBe(true);
    expect(decodeURIComponent(link.split('body=')[1])).toBe('Need help\nhttps://maps.google.com/?q=40.5,-74.45');
  });
});
