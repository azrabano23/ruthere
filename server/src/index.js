// Server entry point: load .env, pick a store, start listening.
import 'dotenv/config';
import { createStore } from './db/store.js';
import { createApp } from './app.js';

const store = await createStore();
const app = createApp(store);
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`RUThere server on http://localhost:${port} (store: ${store.kind})`));
