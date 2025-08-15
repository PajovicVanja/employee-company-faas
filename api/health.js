// GET /api/health
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET' });
  }
  return res.status(200).json({ status: 'ok' });
}