// Builds the Express app separately so tests can use it without opening a port.
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.js';
import { tripsRouter } from './routes/trips.js';
import { pickupSpotsRouter } from './routes/pickupSpots.js';
import { safetyRouter } from './routes/safety.js';
import { driversRouter } from './routes/drivers.js';

export function createApp(store) {
  const app = express();

  // Who may call the API from a browser: anything in CLIENT_ORIGIN (comma separated),
  // our Vercel deployments, and the local dev server. Cookies need credentials: true.
  const listed = (process.env.CLIENT_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  const isAllowedOrigin = (origin) =>
    listed.includes(origin) ||
    /^https:\/\/ruthere[a-z0-9-]*\.vercel\.app$/.test(origin) ||
    (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin));

  app.use(cors({
    origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)),
    credentials: true,
  }));

  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, store: store.kind });
  });

  app.use('/auth', authRouter(store));
  app.use('/trips', tripsRouter(store));
  app.use('/pickup-spots', pickupSpotsRouter());
  app.use('/safety', safetyRouter(store));
  app.use('/drivers', driversRouter(store));

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status ?? 500).json({
      error: err.message ?? 'Server error',
    });
  });

  return app;
}
