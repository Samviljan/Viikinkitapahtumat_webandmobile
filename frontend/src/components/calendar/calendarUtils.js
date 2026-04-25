export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/**
 * Format a Date as a LOCAL `YYYY-MM-DD` string. Using local components avoids
 * the UTC drift caused by `toISOString()` in non-UTC timezones (e.g. Helsinki
 * UTC+2/+3) where local midnight maps to the previous UTC day.
 */
export function isoDay(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parse a `YYYY-MM-DD` event date string as a LOCAL Date (not UTC). Returns
 * null for unparseable input. Other formats fall back to the native parser.
 */
export function parseEventDate(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function sameDay(a, b) {
  return isoDay(a) === isoDay(b);
}

export const CAT_DOT = {
  market: "bg-viking-gold",
  training_camp: "bg-viking-ember",
  course: "bg-emerald-500/80",
  festival: "bg-amber-400",
  meetup: "bg-viking-stone",
  other: "bg-viking-stone",
};

export function buildMonthGrid(cursor) {
  const first = startOfMonth(cursor);
  // Monday=0 view: getDay() returns 0=Sun..6=Sat. Shift so Mon=0.
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function buildEventsByDay(events) {
  const map = new Map();
  for (const e of events || []) {
    const start = parseEventDate(e.start_date);
    if (!start) continue;
    const end = parseEventDate(e.end_date) || start;
    const cur = new Date(start);
    while (cur <= end) {
      const key = isoDay(cur);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return map;
}
