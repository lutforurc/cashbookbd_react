/**
 * The two pure rules behind the four top-product cards.
 *
 * ⚠️ RANKED ON THE CARD'S OWN METRIC, and the value cards are not the quantity
 * list printed in another order. The server sends each window a list ranked by
 * value of its own -- it may hold products the unit list does not -- and this
 * is what orders the card by the figure it is titled for.
 */
export type TopProductMetric = 'qty' | 'amount';

export const rankProducts = (rows: any[], metric: TopProductMetric): any[] =>
  [...rows].sort((a, b) => Number(b?.[metric] || 0) - Number(a?.[metric] || 0));

/**
 * What a list of rows is worth together.
 *
 * ⚠️ The rows the server sent, not all the rows there are. The dead list is cut
 * to five, so this is the total of the five on screen and the footer beside it
 * says which five -- a subtotal presented as a whole is the error the footer
 * exists to prevent.
 */
export const listedValue = (rows: any[], key: string) =>
  rows.reduce((sum, row) => sum + Number(row?.[key] || 0), 0);
