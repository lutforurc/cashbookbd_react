/**
 * One product line of a ledger's Product & Details column.
 *
 * The branch may ask for the category to lead each line (stock_report_type).
 * That prefix is only drawn when the product's own name does not already say
 * it: a product called "Carrying (Cement)" sits under a category called
 * "Carrying", and prefixing the category printed the word twice -- "Carrying
 * Carrying (Cement)". Nothing is stripped from either the category or the
 * product; only a prefix the name already carries is left off.
 *
 * No word is special-cased here. The rule is about the two names, whatever
 * they happen to be.
 */
export const ledgerProductLabel = (
  detail: any,
  showCategory: boolean,
): string => {
  const category = String(detail?.product?.category?.name ?? '').trim();
  const product = String(detail?.product?.name ?? '').trim();

  if (!showCategory || !category) {
    return product;
  }

  const alreadyCarried = product.toLowerCase().includes(category.toLowerCase());

  return `${alreadyCarried ? '' : `${category} `}${product}`.trim();
};
