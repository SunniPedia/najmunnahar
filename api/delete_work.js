// api/delete_work.js  (replaces delete_work.php)
import { readData, writeData } from './_lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const input = req.body || {};
  const worker_id = parseInt(input.worker_id, 10) || 0;
  const id = parseInt(input.id, 10) || 0;

  if (worker_id <= 0 || id <= 0) {
    res.status(200).json({ success: false, error: 'অবৈধ তথ্য' });
    return;
  }

  try {
    const data = await readData();
    const worker = (data.workers || []).find(w => parseInt(w.id, 10) === worker_id);

    if (!worker) {
      res.status(200).json({ success: false, error: 'সহযোগী খুঁজে পাওয়া যায়নি' });
      return;
    }
    if (!Array.isArray(worker.works)) worker.works = [];

    const before = worker.works.length;
    worker.works = worker.works.filter(w => parseInt(w.id, 10) !== id);

    if (worker.works.length === before) {
      res.status(200).json({ success: false, error: 'কাজটি খুঁজে পাওয়া যায়নি' });
      return;
    }

    await writeData(data);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি' });
  }
}
