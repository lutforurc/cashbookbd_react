import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import { formatMobile } from '../../../utils/utils-functions/mobileFormat';
import formatAge from '../../../utils/utils-functions/formatAge';

/**
 * The Due List in the shape the print designer draws.
 *
 * The bespoke paper (DueListPrint.tsx) knows these columns by hard-coded name;
 * this hands the same facts over as data so a tenant can arrange them. One
 * entry per party. `party_lines` and `last_paid_lines` are the two cells the
 * bespoke paper stacks -- name over mobile over address, date over age -- and
 * their scalar twins sit beside them for a column of one fact.
 *
 * ⚠️ EVERY FIGURE IS THE ROW'S OWN, read off the server's ageing rather than
 * re-derived: the four buckets add up to Debit and the server checks that per
 * row (ageing_check.php). DocumentPrint foots the table from these rows.
 */
export type DueListDocumentOptions = {
  rows: any[];
  endDate?: Date | string | null;
  /** The branch switch due_list_with_address, as the screen read it. */
  showAddress: boolean;
  /** The screen's Ageing switch: off, the paper says nothing about ages. */
  showAgeing: boolean;
  mobileFormat?: string | null;
  branchName?: string | null;
};

/** A row's own figure for one bucket. Absent means nothing owed, not unknown. */
const aged = (row: any, label: string) =>
  Number((row?.ageing ?? []).find((b: any) => b.label === label)?.amount ?? 0);

export const toDueListDocumentData = ({
  rows,
  endDate,
  showAddress,
  showAgeing,
  mobileFormat,
  branchName,
}: DueListDocumentOptions): DocumentData => {
  const list = Array.isArray(rows) ? rows : [];

  const products = list.map((row) => {
    const name = String(row?.coa4_name ?? '').trim();
    // The bespoke paper prints the mobile only past ten characters -- a
    // shorter value is a placeholder, not a number -- and only with the switch on.
    const mobile = showAddress && (row?.mobile?.length ?? 0) > 10 ? formatMobile(row.mobile, mobileFormat) : '';
    const address = showAddress ? String(row?.manual_address ?? '').trim() : '';

    const lastPaid = row?.last_paid ? dayjs(row.last_paid).format('DD/MM/YYYY') : '';
    const lastPaidAge = row?.last_paid ? formatAge(row?.last_paid_age) : 'never';

    // Only against the oldest bucket, and only once it is past ninety days:
    // below that the column heading already says the age closely enough.
    const oldest =
      aged(row, '90+') > 0 && Number(row?.oldest_days) > 90 ? formatAge(row?.oldest_age) : '';

    return {
      sl: row?.sl_number,
      party_lines: [name, mobile, address],
      party_name: name,
      mobile,
      manual_address: address,
      ledger_page: row?.ledger_page ?? '',
      area_code: row?.area_id ?? '',
      debit: Number(row?.debit ?? 0),
      credit: Number(row?.credit ?? 0),
      ...(showAgeing
        ? {
            last_paid_lines: [lastPaid, lastPaidAge],
            last_paid: lastPaid,
            last_paid_age: lastPaidAge,
            age_0_30: aged(row, '0-30'),
            age_31_60: aged(row, '31-60'),
            age_61_90: aged(row, '61-90'),
            age_90_plus: aged(row, '90+'),
            oldest_age: oldest,
          }
        : {}),
    };
  });

  return {
    basic: {
      as_on_date: endDate ? dayjs(endDate).format('DD/MM/YYYY') : '',
      ageing_rule: showAgeing ? 'From voucher date, oldest unpaid amount settled first.' : '',
      party_count: list.length,
      branch_name: branchName ?? '',
    },
    products,
  };
};
