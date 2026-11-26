// Server entry point: load .env, pick a store, start the HTTP server and the live-update socket.
import 'dotenv/config';
import http from 'node:http';
import { createStore } from './db/store.js';
import { createApp } from './app.js';
import { createRealtime } from './lib/realtime.js';

const store = await createStore();
const app = createApp(store);
const server = http.createServer(app);
createRealtime(server, store);
const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => console.log(`RUThere server on http://localhost:${port} (store: ${store.kind}, live updates on)`));
