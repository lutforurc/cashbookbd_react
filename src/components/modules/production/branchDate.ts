const pad = (n: number | string) => String(n).padStart(2, '0');

/**
 * The branch's working day as ISO yyyy-mm-dd.
 *
 * Every other entry screen dates its voucher on the branch's transaction date
 * (settings trx_dt, dd/mm/yyyy), not the computer's clock. A production screen
 * that used the clock dated a batch a day after a sale of its own output.
 * Falls back to the LOCAL day -- never toISOString(), which is UTC and turns a
 * Dhaka morning into yesterday.
 */
export const branchTodayIso = (trxDt?: string | null): string => {
  const [d, m, y] = String(trxDt || '').split('/');
  if (y && m && d) return `${y}-${pad(m)}-${pad(d)}`;
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** The first of the month the ISO date falls in. */
export const monthStartIso = (iso: string): string => `${iso.slice(0, 8)}01`;
