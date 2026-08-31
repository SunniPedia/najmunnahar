// api/save_work.js  (replaces save_work.php)
import { readData, writeData } from './_lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const input = req.body || {};

  const worker_id = parseInt(input.worker_id, 10) || 0;
  const id = input.id !== undefined && input.id !== '' ? parseInt(input.id, 10) : null;
  const book_name = String(input.book_name || '').trim();
  const author_name = String(input.author_name || '').trim();
  const start_time = String(input.start_time || '').trim();
  const end_time = String(input.end_time || '').trim();

  if (worker_id <= 0) {
    res.status(200).json({ success: false, error: 'সহযোগী নির্বাচিত হয়নি' });
    return;
  }
  if (book_name === '') {
    res.status(200).json({ success: false, error: 'কিতাবের নাম আবশ্যক' });
    return;
  }
  if (author_name === '') {
    res.status(200).json({ success: false, error: 'লেখকের নাম আবশ্যক' });
    return;
  }
  if (start_time === '') {
    res.status(200).json({ success: false, error: 'কাজ শুরুর সময় আবশ্যক' });
    return;
  }
  if (end_time !== '') {
    const s = new Date(start_time).getTime();
    const e = new Date(end_time).getTime();
    if (!Number.isNaN(s) && !Number.isNaN(e) && e < s) {
      res.status(200).json({ success: false, error: 'শেষের সময় শুরুর সময়ের আগে হতে পারে না' });
      return;
    }
  }

  try {
    const data = await readData();
    const worker = (data.workers || []).find(w => parseInt(w.id, 10) === worker_id);

    if (!worker) {
      res.status(200).json({ success: false, error: 'সহযোগী খুঁজে পাওয়া যায়নি' });
      return;
    }
    if (!Array.isArray(worker.works)) worker.works = [];

    if (id) {
      const work = worker.works.find(w => parseInt(w.id, 10) === id);
      if (!work) {
        res.status(200).json({ success: false, error: 'কাজটি খুঁজে পাওয়া যায়নি' });
        return;
      }
      work.book_name = book_name;
      work.author_name = author_name;
      work.start_time = start_time;
      work.end_time = end_time;
    } else {
      const max = worker.works.reduce((m, w) => Math.max(m, parseInt(w.id, 10) || 0), 0);
      worker.works.push({
        id: max + 1,
        book_name,
        author_name,
        start_time,
        end_time,
      });
    }

    await writeData(data);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি' });
  }
}
