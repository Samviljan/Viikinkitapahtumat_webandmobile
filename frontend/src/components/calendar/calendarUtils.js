export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function isoDay(d) {
  return d.toISOString().slice(0, 10);
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
    if (!e.start_date) continue;
    const start = new Date(e.start_date);
    const end = e.end_date ? new Date(e.end_date) : start;
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
