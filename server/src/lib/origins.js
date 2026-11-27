// Which browser origins may call the API or open a socket: CLIENT_ORIGIN (comma separated),
// any of our Vercel deployments, and the local dev server outside production.
export function isAllowedOrigin(origin) {
  const listed = (process.env.CLIENT_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  return (
    listed.includes(origin) ||
    /^https:\/\/ruthere[a-z0-9-]*\.vercel\.app$/.test(origin) ||
    (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin))
  );
}
