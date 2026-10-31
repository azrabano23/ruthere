// Campus pickup spots used by the address picker when no Google Maps key is set.
import { Router } from 'express';
import { PICKUP_SPOTS } from '../lib/pickupSpots.js';
export function pickupSpotsRouter() {
  const r = Router();
  r.get('/', (_req, res) => res.json(PICKUP_SPOTS));
  return r;
}
