/**
 * How long a debt has stood, worded the way somebody says it out loud.
 *
 *     { y: 1, m: 1, d: 10 }  ->  "1y 1m 10d"
 *     { y: 0, m: 7, d: 29 }  ->  "7m 29d"
 *     { y: 2, m: 0, d: 0 }   ->  "2y"
 *
 * ⚠️ The parts are worked out on the server, from the two dates. They are not
 * derived from a number of days here, and must not be: months run 28 to 31 days
 * and years 365 or 366, so any division would drift -- by days over a long debt,
 * and a long debt is the one this figure is read for.
 *
 * Empty parts are dropped rather than printed as zero. "2y" is what a person
 * says; "2y 0m 0d" reads like a machine that could not decide.
 */
export type Age = { y?: number; m?: number; d?: number } | null | undefined;

const formatAge = (age: Age): string => {
  if (!age) return '';

  const parts = [
    [Number(age.y ?? 0), 'y'],
    [Number(age.m ?? 0), 'm'],
    [Number(age.d ?? 0), 'd'],
  ] as const;

  const said = parts
    .filter(([value]) => Number.isFinite(value) && value > 0)
    .map(([value, unit]) => `${value}${unit}`);

  // Nothing to say means the debt is same-day, which is a real answer and needs
  // a word of its own -- an empty string would read as "not calculated".
  return said.length ? said.join(' ') : 'today';
};

export default formatAge;
