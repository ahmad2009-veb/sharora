/**
 * Live preview of the payment schedule in the sale modal. Mirrors
 * backend/app/services/installments.py, which stays the source of truth — keep them in step.
 */

export const MAX_TERM_MONTHS = 60;

export type PreviewRow = { number: number; due_date: string; amount: number };

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Same day `months` later; the 31st becomes the last day of a shorter month. */
export function addMonths(start: string, months: number): string {
  const [y, m, d] = start.split("-").map(Number);
  const index = m - 1 + months;
  const year = y + Math.floor(index / 12);
  const month = (((index % 12) + 12) % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return iso(year, month, Math.min(d, lastDay));
}

/** Python's ROUND_HALF_UP for non-negative values. */
const roundHalfUp = (v: number) => Math.floor(v + 0.5 + 1e-9);

export function financedAmount(total: number, down: number, markupPercent: number): number {
  return roundHalfUp((total - down) * (1 + markupPercent / 100));
}

/**
 * Equal monthly payments in whole somoni, the last one absorbs the rounding difference.
 * `paid` are rows that already have money on them (kept when the terms are edited).
 * Returns null when the terms cannot produce a schedule.
 */
export function buildSchedule(
  debt: number,
  term: number,
  firstPaymentDate: string,
  paid: { due_date: string; paid_amount: number }[] = [],
): PreviewRow[] | null {
  if (!Number.isInteger(term) || term < 1 || term > MAX_TERM_MONTHS) return null;
  const rows: PreviewRow[] = paid.map((p, i) => ({
    number: i + 1,
    due_date: p.due_date,
    amount: p.paid_amount,
  }));
  const rest = debt - paid.reduce((s, p) => s + p.paid_amount, 0);
  const count = term - paid.length;
  if (rest < 0) return null;
  if (rest === 0) return rows;
  if (count < 1) return null;
  let monthly = roundHalfUp(rest / count);
  if (monthly * (count - 1) >= rest) monthly = Math.floor(rest / count);
  if (monthly <= 0) return null;
  const last = rest - monthly * (count - 1);
  for (let i = 0; i < count; i++) {
    rows.push({
      number: paid.length + i + 1,
      due_date: addMonths(firstPaymentDate, paid.length + i),
      amount: i === count - 1 ? last : monthly,
    });
  }
  return rows;
}

/** "1 месяц", "3 месяца", "12 месяцев". */
export function monthsLabel(n: number): string {
  const last2 = n % 100;
  const last = n % 10;
  const word =
    last === 1 && last2 !== 11
      ? "месяц"
      : last >= 2 && last <= 4 && (last2 < 12 || last2 > 14)
        ? "месяца"
        : "месяцев";
  return `${n} ${word}`;
}
