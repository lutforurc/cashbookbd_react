import type { DocumentData } from '../../utils/print-designer/DocumentPrint';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';

/**
 * The two Company Scheme reports, reshaped into the flat {basic, products} the
 * Print Template Designer reads by key (see COMPANY_SCHEME_*_FIELDS in
 * printTemplate.ts).
 *
 * The rows are the screen's own, copied -- never re-derived -- so a designed
 * paper cannot disagree with the table it was printed from.
 */

export type ReceivableDocumentOptions = {
  rows: any[];
  totals: { count: number; amount: number; paid: number; balance: number } | null;
  companyName: string; // '' = all companies
  statusLabel: string;
  asOf: string; // dd/mm/yyyy
  branchName?: string | null;
};

export const toReceivableDocumentData = ({
  rows,
  totals,
  companyName,
  statusLabel,
  asOf,
  branchName,
}: ReceivableDocumentOptions): DocumentData => {
  const list = Array.isArray(rows) ? rows : [];

  return {
    basic: {
      company_name: companyName || 'All companies',
      status_label: statusLabel,
      as_on_date: asOf,
      imei_count: totals?.count ?? list.length,
      branch_name: branchName ?? '',
    },
    products: list.map((row, index) => {
      const saleDate = formatDayMonthYear(row?.sale_date);
      return {
        sl: index + 1,
        invoice_lines: [row?.invoice_no ?? '', saleDate],
        invoice_no: row?.invoice_no ?? '',
        sale_date: saleDate,
        imei: row?.imei ?? '',
        product_name: row?.product_name ?? '',
        buyer_lines: [row?.buyer_name ?? '', row?.buyer_mobile ?? ''],
        buyer_name: row?.buyer_name ?? '',
        buyer_mobile: row?.buyer_mobile ?? '',
        company_name: row?.party_name ?? '',
        amount: Number(row?.amount ?? 0),
        received: Number(row?.paid ?? 0),
        balance: Number(row?.balance ?? 0),
        due_date: formatDayMonthYear(row?.due_date),
        overdue_days: Number(row?.days_overdue) > 0 ? `${row.days_overdue} d` : '',
      };
    }),
  };
};

export type ReceiptsDocumentOptions = {
  /** The screen's flattened lines: one per IMEI, `first` on a voucher's first. */
  lines: any[];
  startDate: string; // dd/mm/yyyy
  endDate: string; // dd/mm/yyyy
  companyName: string; // '' = all companies
  branchName?: string | null;
};

export const toReceiptsDocumentData = ({
  lines,
  startDate,
  endDate,
  companyName,
  branchName,
}: ReceiptsDocumentOptions): DocumentData => {
  const list = Array.isArray(lines) ? lines : [];

  return {
    basic: {
      report_period: `${startDate} to ${endDate}`,
      company_name: companyName || 'All companies',
      voucher_count: list.filter((line) => line?.first).length,
      imei_count: list.length,
      branch_name: branchName ?? '',
    },
    products: list.map((line) => {
      const vrDate = formatDayMonthYear(line?.vr_date);
      const method = String(line?.method ?? '').toUpperCase();
      return {
        // The voucher's own facts on its first IMEI only, as on the screen.
        sl: line?.first ? line?.sl : '',
        voucher_lines: line?.first ? [line?.vr_no ?? '', vrDate, method] : [],
        vr_no: line?.first ? line?.vr_no ?? '' : '',
        vr_date: line?.first ? vrDate : '',
        method: line?.first ? method : '',
        company_name: line?.first ? line?.party_name ?? '' : '',
        imei: line?.imei ?? '',
        product_name: line?.product_name ?? '',
        invoice_no: line?.invoice_no ?? '',
        amount: Number(line?.amount ?? 0),
      };
    }),
  };
};
