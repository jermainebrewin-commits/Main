/**
 * fiscal.ts — Fiscal Period Utilities
 *
 * THE FISCAL CYCLE COMMANDMENT:
 *   A standard fiscal month runs from the 20th of Month N
 *   through the 19th of Month N+1, inclusive on both ends.
 *
 *   e.g.  Jan 20 00:00:00 UTC  →  Feb 19 23:59:59.999 UTC
 *         Feb 20 00:00:00 UTC  →  Mar 19 23:59:59.999 UTC
 *
 * All dates are computed in UTC to prevent timezone drift from
 * silently shifting the 20th boundary.
 */

export interface FiscalPeriod {
  startDate: Date; // Day 20 of period-start month at 00:00:00.000 UTC
  endDate: Date;   // Day 19 of period-end month   at 23:59:59.999 UTC
  /** Human-readable label, e.g. "Jan 20 – Feb 19 2026" */
  label: string;
}

// ─── Core helper ─────────────────────────────────────────────────────────────

/**
 * Returns the fiscal period that contains the given referenceDate.
 *
 * Decision rule:
 *   day >= 20  →  period starts THIS month on the 20th
 *   day <= 19  →  period started LAST month on the 20th
 */
export function getFiscalPeriod(referenceDate: Date): FiscalPeriod {
  const d = new Date(referenceDate); // defensive copy
  const day = d.getUTCDate();
  const month = d.getUTCMonth(); // 0-indexed
  const year = d.getUTCFullYear();

  let startYear: number;
  let startMonth: number; // 0-indexed

  if (day >= 20) {
    // The 20th has arrived — new period starts this month
    startYear = year;
    startMonth = month;
  } else {
    // Still in the tail of last month's period
    if (month === 0) {
      // January → period started December of previous year
      startYear = year - 1;
      startMonth = 11;
    } else {
      startYear = year;
      startMonth = month - 1;
    }
  }

  // End is always the 19th of the month AFTER the start month
  let endYear: number;
  let endMonth: number; // 0-indexed

  if (startMonth === 11) {
    // December start → end in January of next year
    endYear = startYear + 1;
    endMonth = 0;
  } else {
    endYear = startYear;
    endMonth = startMonth + 1;
  }

  const startDate = new Date(Date.UTC(startYear, startMonth, 20, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(endYear, endMonth, 19, 23, 59, 59, 999));

  return { startDate, endDate, label: buildLabel(startDate, endDate) };
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Returns the fiscal period immediately before the one containing referenceDate.
 */
export function getPreviousFiscalPeriod(referenceDate: Date): FiscalPeriod {
  const current = getFiscalPeriod(referenceDate);
  // Step back one day from the current period's startDate to land in the prior period
  const dayBefore = new Date(current.startDate.getTime() - 1);
  return getFiscalPeriod(dayBefore);
}

/**
 * Returns the last N completed fiscal periods, newest first.
 *
 * "Completed" means the period's endDate is before referenceDate.
 * Used by Phase 4 (Optimization Engine) for the 6-month lookback.
 *
 * @param referenceDate  Anchor date (typically today)
 * @param n              Number of completed periods to return
 */
export function getNFiscalPeriodsBack(
  referenceDate: Date,
  n: number
): FiscalPeriod[] {
  const periods: FiscalPeriod[] = [];
  // Start from the period before the current one (which may be mid-flight)
  let cursor = getPreviousFiscalPeriod(referenceDate);

  for (let i = 0; i < n; i++) {
    periods.push(cursor);
    // Step back one more period
    const dayBefore = new Date(cursor.startDate.getTime() - 1);
    cursor = getFiscalPeriod(dayBefore);
  }

  return periods; // newest first
}

/**
 * Returns an array of all fiscal periods between two dates, inclusive.
 * Ordered chronologically (oldest first).
 */
export function getFiscalPeriodsInRange(
  from: Date,
  to: Date
): FiscalPeriod[] {
  const periods: FiscalPeriod[] = [];
  let cursor = getFiscalPeriod(from);

  while (cursor.startDate <= to) {
    periods.push(cursor);
    // Advance: jump to the day after this period ends
    const nextDay = new Date(cursor.endDate.getTime() + 1);
    cursor = getFiscalPeriod(nextDay);
  }

  return periods;
}

// ─── Label builder ────────────────────────────────────────────────────────────

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function buildLabel(start: Date, end: Date): string {
  const sm = MONTH_SHORT[start.getUTCMonth()];
  const em = MONTH_SHORT[end.getUTCMonth()];
  const sy = start.getUTCFullYear();
  const ey = end.getUTCFullYear();

  if (sy === ey) {
    return `${sm} 20 – ${em} 19 ${sy}`;
  }
  return `${sm} 20 ${sy} – ${em} 19 ${ey}`;
}
