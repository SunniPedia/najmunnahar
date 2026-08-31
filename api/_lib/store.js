// api/_lib/store.js
// Shared data-access layer. Uses Vercel KV (Upstash Redis under the hood) so
// that data persists across requests — Vercel's filesystem is read-only /
// ephemeral, so we can't write to a data.json file like the old PHP version did.
//
// Setup (one time, in the Vercel dashboard):
//   1. Open your project -> Storage tab -> Create Database -> KV (Upstash).
//   2. Click "Connect Project" to link it to this project.
//      This automatically adds the KV_REST_API_URL / KV_REST_API_TOKEN
//      environment variables that @vercel/kv reads — no manual .env needed.
//   3. Redeploy. The very first request auto-seeds the store with the data
//      that used to live in data.json.

import { kv } from '@vercel/kv';
import seedData from './seed-data.js';

const KEY = 'worktracker:data';

export async function readData() {
  let data = await kv.get(KEY);
  if (!data || !Array.isArray(data.workers)) {
    data = seedData;
    await kv.set(KEY, data);
  }
  return data;
}

export async function writeData(data) {
  await kv.set(KEY, data);
}
