// api/get_data.js  (replaces get_data.php)
import { readData } from './_lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  try {
    const data = await readData();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ workers: [], error: 'Cannot load data' });
  }
}
