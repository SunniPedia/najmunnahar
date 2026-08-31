// api/data.js — single file handling get / save / delete
// Uses the Vercel KV REST API directly via fetch (no @vercel/kv package,
// so there is nothing extra to install or fail to resolve).
//
// Needs these two env vars (auto-added when you connect a Vercel KV/Upstash
// database to this project in the Storage tab):
//   KV_REST_API_URL
//   KV_REST_API_TOKEN

import seedData from './seed-data.js';

const KEY = 'worktracker:data';
// Vercel's built-in KV is deprecated — the replacement is the Upstash
// marketplace integration, which names its env vars differently depending
// on how it was connected. We check all known variants so this works
// either way.
const KV_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_URL;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

async function kvGet(key) {
  const r = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!r.ok) throw new Error('KV GET failed: ' + r.status);
  const j = await r.json();
  if (j.result == null) return null;
  try { return JSON.parse(j.result); } catch { return j.result; }
}

async function kvSet(key, value) {
  const r = await fetch(`${KV_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  });
  if (!r.ok) throw new Error('KV SET failed: ' + r.status);
}

async function readData() {
  if (!KV_URL || !KV_TOKEN) {
    // No database connected yet — fall back to seed data so the app still
    // works (read-only) instead of throwing a 500.
    return seedData;
  }
  let data = await kvGet(KEY);
  if (!data || !Array.isArray(data.workers)) {
    data = seedData;
    await kvSet(KEY, data);
  }
  return data;
}

async function writeData(data) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error('KV database not connected — cannot save. See README.');
  }
  await kvSet(KEY, data);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');

  // /api/data?action=get_data | save_work | delete_work
  const action = req.query.action;

  try {
    if (action === 'get_data') {
      const data = await readData();
      res.status(200).json(data);
      return;
    }

    if (action === 'save_work') {
      if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return; }
      const input = req.body || {};
      const worker_id = parseInt(input.worker_id, 10) || 0;
      const id = input.id !== undefined && input.id !== '' ? parseInt(input.id, 10) : null;
      const book_name = String(input.book_name || '').trim();
      const author_name = String(input.author_name || '').trim();
      const start_time = String(input.start_time || '').trim();
      const end_time = String(input.end_time || '').trim();

      if (worker_id <= 0) { res.status(200).json({ success: false, error: 'সহযোগী নির্বাচিত হয়নি' }); return; }
      if (book_name === '') { res.status(200).json({ success: false, error: 'কিতাবের নাম আবশ্যক' }); return; }
      if (author_name === '') { res.status(200).json({ success: false, error: 'লেখকের নাম আবশ্যক' }); return; }
      if (start_time === '') { res.status(200).json({ success: false, error: 'কাজ শুরুর সময় আবশ্যক' }); return; }
      if (end_time !== '') {
        const s = new Date(start_time).getTime();
        const e = new Date(end_time).getTime();
        if (!Number.isNaN(s) && !Number.isNaN(e) && e < s) {
          res.status(200).json({ success: false, error: 'শেষের সময় শুরুর সময়ের আগে হতে পারে না' });
          return;
        }
      }

      const data = await readData();
      const worker = (data.workers || []).find(w => parseInt(w.id, 10) === worker_id);
      if (!worker) { res.status(200).json({ success: false, error: 'সহযোগী খুঁজে পাওয়া যায়নি' }); return; }
      if (!Array.isArray(worker.works)) worker.works = [];

      if (id) {
        const work = worker.works.find(w => parseInt(w.id, 10) === id);
        if (!work) { res.status(200).json({ success: false, error: 'কাজটি খুঁজে পাওয়া যায়নি' }); return; }
        work.book_name = book_name;
        work.author_name = author_name;
        work.start_time = start_time;
        work.end_time = end_time;
      } else {
        const max = worker.works.reduce((m, w) => Math.max(m, parseInt(w.id, 10) || 0), 0);
        worker.works.push({ id: max + 1, book_name, author_name, start_time, end_time });
      }

      await writeData(data);
      res.status(200).json({ success: true });
      return;
    }

    if (action === 'delete_work') {
      if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return; }
      const input = req.body || {};
      const worker_id = parseInt(input.worker_id, 10) || 0;
      const id = parseInt(input.id, 10) || 0;
      if (worker_id <= 0 || id <= 0) { res.status(200).json({ success: false, error: 'অবৈধ তথ্য' }); return; }

      const data = await readData();
      const worker = (data.workers || []).find(w => parseInt(w.id, 10) === worker_id);
      if (!worker) { res.status(200).json({ success: false, error: 'সহযোগী খুঁজে পাওয়া যায়নি' }); return; }
      if (!Array.isArray(worker.works)) worker.works = [];

      const before = worker.works.length;
      worker.works = worker.works.filter(w => parseInt(w.id, 10) !== id);
      if (worker.works.length === before) { res.status(200).json({ success: false, error: 'কাজটি খুঁজে পাওয়া যায়নি' }); return; }

      await writeData(data);
      res.status(200).json({ success: true });
      return;
    }

    res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, workers: [], error: err.message || 'Server error' });
  }
}
