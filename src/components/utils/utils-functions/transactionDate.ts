/**
 * The branch's current transaction date, as held in `settings.data.trx_dt`.
 *
 * Entry forms must default to this, not to today: the books stay open on the
 * transaction date until day close advances it, so a form defaulting to the
 * real calendar date posts entries into the wrong day whenever the branch is
 * behind — which is the normal state of affairs, not an edge case.
 *
 * trx_dt arrives as DD/MM/YYYY; date inputs want YYYY-MM-DD.
 */
export const trxDateToIso = (value?: string): string => {
  if (!value) return '';

  const parts = String(value).split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  return '';
};

/**
 * Same value as a Date, for pickers that want an object. Null when unknown,
 * so callers can decide their own fallback rather than silently getting today.
 */
export const trxDateToDate = (value?: string): Date | null => {
  const iso = trxDateToIso(value);
  if (!iso) return null;

  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
