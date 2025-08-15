// POST /api/audit
// Logs a single structured audit line to provider logs; returns {ok:true}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }
  try {
    const { service, event, entityId, meta } = req.body || {};
    const timestamp = new Date().toISOString();
    const record = {
      ts: timestamp,
      service: service || 'unknown',
      event: event || 'unknown',
      entityId: entityId ?? null,
      meta: meta || {}
    };
    // provider logs (visible in Vercel dashboard)
    console.log('[AUDIT]', JSON.stringify(record));
    return res.status(200).json({ ok: true, timestamp });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
}