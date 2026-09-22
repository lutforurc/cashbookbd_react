import { useSearchParams } from 'react-router-dom';

/**
 * The range and branch a report was OPENED WITH, out of the address bar:
 * `?from=YYYY-MM-DD&to=YYYY-MM-DD&branch=ID`. A dashboard card links here
 * with the dates and branch it was showing, and the report runs itself on
 * them rather than opening on its own defaults above "No data found".
 *
 * The Cash Book has read this shape for a while; this is the same reading,
 * made shareable. Dates are read by hand: 'YYYY-MM-DD' handed to `new Date`
 * is UTC midnight, the day before east of Greenwich.
 */
export type ReportQuery = {
  from: Date | null;
  to: Date | null;
  branch: number | null;
  /** The product a product-wise report was opened on, and what to call it in the box. */
  product: number | null;
  productName: string;
  /** True where the address bar carried a date at all -- the signal to run. */
  asked: boolean;
};

const readDate = (text: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

export const useReportQuery = (): ReportQuery => {
  const [params] = useSearchParams();
  const from = readDate(params.get('from'));
  const to = readDate(params.get('to'));
  return {
    from,
    to,
    branch: Number(params.get('branch')) || null,
    product: Number(params.get('product')) || null,
    productName: params.get('product_name') ?? '',
    asked: Boolean(from || to),
  };
};

/** The address a card links to: the report, with the dates and branch it was showing. */
export const reportUrl = (
  path: string,
  query: {
    from?: string | null;
    to?: string | null;
    branch?: number | string | null;
    product?: number | string | null;
    productName?: string | null;
  },
) => {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.branch) params.set('branch', String(query.branch));
  if (query.product) params.set('product', String(query.product));
  if (query.productName) params.set('product_name', query.productName);
  const text = params.toString();
  return text ? `${path}?${text}` : path;
};
