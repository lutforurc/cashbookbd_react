import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import httpService from '../../services/httpService';
import { API_TILES_PREVIOUS_BALANCE_URL } from '../../services/apiRoutes';
import thousandSeparator from '../utils-functions/thousandSeparator';

/**
 * Branch Edit > "Show Balance Summary in Sales Invoice". Unset is off, so a
 * branch that has never been asked sees no block and the screen makes no call.
 */
const useSummaryEnabled = () =>
  String(
    useSelector((s: any) => s.settings)?.data?.branch
      ?.show_sales_balance_summary ?? '0',
  ) === '1';

/**
 * The party's signed balance before the bill being written, for the Previous
 * Balance line. Reloads whenever the customer or the bill being edited changes,
 * and again when `refreshKey` does (a saved bill is part of the balance now).
 *
 * `exclude_mtm_id` keeps a bill being edited from counting itself. The cash head
 * (17) is the drawer, not a party, so it carries nothing; neither does an empty
 * customer, and a figure that cannot be read is not one to total up.
 */
export const usePreviousBalance = (
  account: string | number | null | undefined,
  mtmId: string | number | null | undefined = '',
  refreshKey: unknown = null,
) => {
  const enabled = useSummaryEnabled();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!enabled || !account || Number(account) === 17) {
      setBalance(0);
      return;
    }

    let cancelled = false;

    httpService
      .get(API_TILES_PREVIOUS_BALANCE_URL, {
        params: { account, exclude_mtm_id: mtmId || '', allow_negative: 1 },
      })
      .then((response: any) => {
        if (!cancelled) {
          setBalance(Number(response?.data?.data?.data?.balance ?? 0));
        }
      })
      .catch(() => {
        if (!cancelled) setBalance(0);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, account, mtmId, refreshKey]);

  return balance;
};

// thousandSeparator draws a nought as '-', which reads as a minus sign in a
// sum, so the summary spells a nought out.
const money = (value: number) => {
  const shown = thousandSeparator(value);
  return shown === '-' ? '0' : shown;
};

interface Props {
  previousBalance: number;
  billAmount: number;
  discount: number;
  received: number;
}

/**
 * Total Tk. = Previous Balance + Current Invoice − Discount − Received Amount.
 * Every term shows, nought included, so the sum can be followed term by term.
 */
const SalesBalanceSummary: React.FC<Props> = ({
  previousBalance,
  billAmount,
  discount,
  received,
}) => {
  const enabled = useSummaryEnabled();
  if (!enabled) return null;

  const total = previousBalance + billAmount - discount - received;

  return (
    <div className="mt-2 w-full max-w-xs text-sm font-semibold text-gray-800 dark:text-[rgb(var(--c-text))]">
      {(
        [
          ['Previous Balance', previousBalance],
          ['Current Invoice', billAmount],
          ['Discount', discount],
          ['Received Amount', received],
        ] as [string, number][]
      ).map(([label, amount]) => (
        <div key={label} className="flex justify-between gap-4">
          <span>{label}</span>
          <span>{money(amount)}</span>
        </div>
      ))}
      <div className="my-1 border-t border-gray-400" />
      <div className="flex justify-between gap-4 text-base font-bold">
        <span>Total Tk.</span>
        <span>{money(total)}</span>
      </div>
    </div>
  );
};

export default SalesBalanceSummary;
