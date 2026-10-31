// Builds the Express app. Kept separate from index.js so tests can run the
// real routes against an in-memory store without opening a port.
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.js';
import { tripsRouter } from './routes/trips.js';
import { pickupSpotsRouter } from './routes/pickupSpots.js';
import { safetyRouter } from './routes/safety.js';

export function createApp(store) {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ ok: true, store: store.kind }));
  app.use('/auth', authRouter(store));
  app.use('/trips', tripsRouter(store));
  app.use('/pickup-spots', pickupSpotsRouter());
  app.use('/safety', safetyRouter(store));

  // Last resort: anything a route didn't handle becomes a JSON error, never an HTML stack trace.
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status ?? 500).json({ error: err.message ?? 'Server error' });
  });
  return app;
}
