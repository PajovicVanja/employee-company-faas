// POST /api/availability-check
// Validates weekly availability slots for overlaps and (optionally) business hours bounds.
// All time strings are "HH:MM:SS". Days use your convention: 1=Mon .. 7=Sun.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const { slots, businessHours } = req.body || {};
    if (!Array.isArray(slots)) {
      return res.status(400).json({ ok: false, error: '`slots` must be an array' });
    }

    // BH map: dayNumber -> {from,to}
    const bhMap = new Map();
    if (Array.isArray(businessHours)) {
      for (const bh of businessHours) {
        const dn = toInt(bh.dayNumber);
        if (!dn) continue;
        bhMap.set(dn, {
          from: toMinutes(bh.fromTime),
          to: toMinutes(bh.toTime)
        });
      }
    }

    const normalized = slots.map((s, idx) => {
      const d = toInt(s.day_of_week);
      const from = toMinutes(s.time_from);
      const to = toMinutes(s.time_to);
      if (!d || Number.isNaN(from) || Number.isNaN(to) || from >= to) {
        throw new Error(`Invalid slot at index ${idx}`);
      }
      return { day: d, from, to, location_id: s.location_id ?? null };
    });

    // detect overlaps (same day)
    const overlaps = [];
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const a = normalized[i], b = normalized[j];
        if (a.day !== b.day) continue;
        const overlap = !(a.to <= b.from || b.to <= a.from);
        if (overlap) overlaps.push({ a: i, b: j });
      }
    }

    // out-of-bounds vs BH
    const outOfBounds = [];
    for (let i = 0; i < normalized.length; i++) {
      const s = normalized[i];
      const bh = bhMap.get(s.day);
      if (bh) {
        if (s.from < bh.from || s.to > bh.to) outOfBounds.push(i);
      }
    }

    return res.status(200).json({
      ok: overlaps.length === 0 && outOfBounds.length === 0,
      overlaps,
      outOfBounds
    });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
}

function toInt(x) {
  const n = Number.parseInt(x, 10);
  return Number.isFinite(n) ? n : 0;
}
function toMinutes(hms) {
  if (typeof hms !== 'string') return NaN;
  const [h, m, s] = hms.split(':').map(v => Number.parseInt(v, 10));
  if ([h, m].some(v => !Number.isFinite(v))) return NaN;
  return h * 60 + (Number.isFinite(m) ? m : 0) + (Number.isFinite(s) ? s : 0) / 60;
}