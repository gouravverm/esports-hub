const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-08-31' -> '31 Aug 2026'. Partly known dates ('2026-11-??') keep what is known. */
export function date(iso: string | null | undefined, withYear = true): string {
  if (!iso) return 'TBA';
  const [y, m, d] = iso.slice(0, 10).split('-');
  const month = MONTHS[Number(m) - 1];
  if (!month) return y;
  const day = /^\d+$/.test(d ?? '') ? `${Number(d)} ` : '';
  return `${day}${month}${withYear ? ` ${y}` : ''}`;
}

export function dateRange(start: string | null, end: string | null): string {
  if (!start) return 'Dates TBA';
  if (!end || end === start) return date(start);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${date(start, !sameYear)} – ${date(end)}`;
}

/** '2026-08-31 16:00' -> '31 Aug, 4:00 PM' */
export function dateTime(at: string | null | undefined): string {
  if (!at) return '';
  const time = at.slice(11, 16);
  if (!time) return date(at);
  const [h, min] = time.split(':').map(Number);
  const hour = ((h + 11) % 12) + 1;
  return `${date(at, false)}, ${hour}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Indian style amounts: ₹2.1 Cr, ₹35 L, ₹45,000; other currencies as $12,000. */
export function money(amount: number | null | undefined, currency?: string | null): string {
  if (!amount) return '';
  const cur = (currency ?? 'inr').toLowerCase();
  if (cur !== 'inr') return `${cur === 'usd' ? '$' : `${cur.toUpperCase()} `}${amount.toLocaleString('en-US')}`;
  if (amount >= 1e7) return `₹${trim(amount / 1e7)} Cr`;
  if (amount >= 1e5) return `₹${trim(amount / 1e5)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function trim(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, '');
}

/** ISO time -> '5 min ago', '3 h ago', '2 days ago', or 'in 2 h' for the future. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const future = mins < 0;
  const m = Math.abs(mins);
  const text = m < 60 ? `${m} min` : m < 60 * 24 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} days`;
  return future ? `in ${text}` : `${text} ago`;
}

/** '2002-09-21' -> 24 (age today); partly known dates -> null. */
export function age(birth: string | null | undefined): number | null {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const b = new Date(birth);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) years--;
  return years;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
}
