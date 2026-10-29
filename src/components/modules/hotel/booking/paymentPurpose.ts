/**
 * What a payment is FOR, decided from the figure the desk has typed.
 *
 * ⚠️ LIFTED OUT OF FolioScreen ON PURPOSE, so the rule can be tested as
 * arithmetic rather than as a screen. It is the one part of the payment form
 * that can be wrong in a way nobody sees: a part payment recorded as a
 * settlement, or a settlement recorded as an advance, reconciles to the same
 * till and reads wrong on the booking for ever.
 *
 * The two rules, and they are the whole of it:
 *
 *   1. A figure equal to what is owed SETTLES the bill -- chosen for the clerk,
 *      never imposed.
 *   2. Anything else does not: an empty box, a nought, a negative, an
 *      overpayment, or any part payment the guest chooses to make.
 */

/** The purpose a fresh payment starts on, and the one to fall back to. */
export const PURPOSE_ADVANCE = 'advance';

/**
 * "Settlement" -- the desk saying these coins clear the bill.
 *
 * Nine receipts in ten are this one, which is why it is picked for the clerk;
 * but a part payment, a round-up or an empty box is not a settlement and must
 * not be recorded as one.
 */
export const PURPOSE_SETTLEMENT = 'settlement';

/**
 * Money in MINOR UNITS -- poisha, at the two places this currency is kept in.
 *
 * ⚠️ COMPARE MONEY HERE, NEVER AS FLOATS. A 6,400 typed by hand and a 6,400
 * worked out from a bill are not always the same binary number, and `===` on the
 * two would leave a full settlement reading as a part payment on some bills and
 * not others. Rounding to the currency's own precision first is what makes "the
 * same amount" mean what a person means by it.
 */
export const asMinorUnits = (value: number | string | null | undefined): number =>
  Math.round((Number(value) || 0) * 100);

/**
 * What a payment of `amount` is for.
 *
 * Settlement only where the bill is really owed AND the figure really clears it.
 * The `owed > 0` guard is on the outside for a reason: an empty box, a nought
 * and a negative all fail it, and so does an overpayment -- which is a different
 * act (money held in hand) and not what Settlement says.
 */
export const purposeForAmount = (
  amount: number | string | null | undefined,
  owed: number,
  fallback: string,
): string => (owed > 0 && asMinorUnits(amount) === asMinorUnits(owed) ? PURPOSE_SETTLEMENT : fallback);

/** What the desk is told when the figure is more than the bill still owes. */
export const AMOUNT_EXCEEDS_BALANCE = 'Amount cannot exceed the outstanding balance.';

/**
 * Does this figure pay MORE than is owed?
 *
 * ⚠️ THE CAP IS THE OUTSTANDING BALANCE, and it is the same figure the Owed
 * column shows -- a payment above it leaves the guest in credit, which is money
 * nobody is owed held against a stay. Compared in minor units like everything
 * else here, so a poisha of binary noise is not an overpayment. A bill owing
 * nothing (or in credit) owes less than any positive figure, so this is true of
 * every amount on it -- which is the point.
 */
export const exceedsBalance = (amount: number | string | null | undefined, owed: number): boolean =>
  asMinorUnits(amount) > asMinorUnits(owed);
