// A link that opens the phone's own messaging app with the number and message filled in.
// The rider taps Send, so the text costs nothing and comes from a number their contact knows.
// iPhones read the message after "&body=", Android and everything else after "?body=".

export function isApple(userAgent = globalThis.navigator?.userAgent ?? '') {
  return /iPhone|iPad|iPod|Macintosh/.test(userAgent);
}

export function smsLink(phone, message, userAgent) {
  const number = String(phone ?? '').replace(/[^\d+]/g, '');
  return `sms:${number}${isApple(userAgent) ? '&' : '?'}body=${encodeURIComponent(message)}`;
}
