import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createStore } from './db/store.js';
import { authRouter } from './routes/auth.js';
import { tripsRouter } from './routes/trips.js';
import { pickupSpotsRouter } from './routes/pickupSpots.js';

const app = express();
const store = await createStore();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true, store: store.kind }));
app.use('/auth', authRouter(store));
app.use('/trips', tripsRouter(store));
app.use('/pickup-spots', pickupSpotsRouter());

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? 'Server error' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`RUThere server on http://localhost:${port} (store: ${store.kind})`));
