import React, { useEffect, useState } from 'react';
import { FaSyncAlt } from 'react-icons/fa';
import dayjs from 'dayjs';

import httpService from '../../services/httpService';
import { API_DASHBOARD_CASH_BOOK_URL } from '../../services/apiRoutes';
import { Button } from '../../../pages/UiElements/CustomButtons';
import { Select } from '../../utils/fields/FormControls';
import InputDatePicker from '../../utils/fields/DatePicker';
import { FIELD_SELECT } from '../../../theme/fieldStyles';

/**
 * The two things every dashboard wants and none of them should write twice:
 * a range for the period figures, and a refresh -- by hand, and on its own
 * while the page is left open on a screen all day.
 *
 * A dashboard keeps its own effects; it just adds `range.from`, `range.to`
 * and `tick` to their deps and reads the range where it used to work out
 * "this month". What a page does NOT window on the range (today's tiles, the
 * godown, a top list on the branch's own setting) is its own business.
 */

export type RangePreset = 'this-month' | 'last-month' | 'custom';

/** Local parts, never toISOString(): "this month" is a calendar question at the desk. */
export const asText = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

/** The other way: 'YYYY-MM-DD' to a local Date, or null for blank. */
const fromText = (text: string): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

export const useDashboardRange = () => {
  const [preset, setPreset] = useState<RangePreset>('this-month');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const now = new Date();
  const range =
    preset === 'last-month'
      ? {
          from: asText(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
          to: asText(new Date(now.getFullYear(), now.getMonth(), 0)),
        }
      : preset === 'custom' && custom.from && custom.to
        ? custom
        : // Custom with a box still empty keeps reading this month.
          { from: asText(new Date(now.getFullYear(), now.getMonth(), 1)), to: asText(now) };

  return { preset, setPreset, custom, setCustom, ...range };
};

export type DashboardRange = ReturnType<typeof useDashboardRange>;

const REFRESH_MS = 5 * 60 * 1000;

/** A counter that moves every five minutes and on demand; effects that read it re-run. */
export const useAutoRefresh = () => {
  const [tick, setTick] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return {
    tick,
    refresh: () => setTick((t) => t + 1),
    refreshedAt,
    markRefreshed: () => setRefreshedAt(new Date()),
  };
};

export type CashBand = { from: string; to: string; received: number; payment: number; balance: number };

/**
 * The Cash Book for the range, read on its own for the pages whose main
 * payload does not carry it (the trade's does). Re-read on the range and on
 * every tick; a failure leaves the card unmounted rather than drawn at nought.
 */
export const useCashBookRange = (
  branchId: number | string | null | undefined,
  from: string,
  to: string,
  tick: number,
): CashBand | null => {
  const [cash, setCash] = useState<CashBand | null>(null);

  useEffect(() => {
    if (!branchId) return undefined;
    let alive = true;

    httpService
      .get(API_DASHBOARD_CASH_BOOK_URL, { params: { from, to, branch_id: branchId } })
      .then((response) => {
        if (alive) setCash(response?.data?.data?.data ?? null);
      })
      .catch(() => {
        if (alive) setCash(null);
      });

    return () => {
      alive = false;
    };
  }, [branchId, from, to, tick]);

  return cash;
};

/** "1 Sep 2026 to 22 Sep 2026 · updated 11:32 AM", for a page's subtitle. */
export const rangeCaption = (from?: string, to?: string, refreshedAt?: Date | null) =>
  (from && to ? `${dayjs(from).format('D MMM YYYY')} to ${dayjs(to).format('D MMM YYYY')}` : '') +
  (refreshedAt ? ` · updated ${dayjs(refreshedAt).format('hh:mm A')}` : '');

/**
 * The controls: the preset, the two boxes when Custom, the refresh button.
 * Sits beside the page's Customize button; `busy` spins the arrows while a
 * read is in the air. A page with nothing to window (Construction, whose
 * reads take no dates) leaves `range` out and gets the refresh alone.
 */
export const DashboardRangeBar: React.FC<{
  range?: DashboardRange;
  onRefresh: () => void;
  busy?: boolean;
}> = ({ range, onRefresh, busy }) => (
  <div className="flex flex-wrap items-center gap-2">
    {range ? (
      <Select
        value={range.preset}
        onChange={(event) => range.setPreset(event.target.value as RangePreset)}
        className={`${FIELD_SELECT} px-2 text-xs font-medium`}
      >
        <option value="this-month">This month</option>
        <option value="last-month">Last month</option>
        <option value="custom">Custom</option>
      </Select>
    ) : null}
    {range?.preset === 'custom' ? (
      // The house date picker, as every report's date boxes use it. It deals
      // in Date objects; the range keeps 'YYYY-MM-DD' text, hence the two
      // conversions -- local parts both ways, never through UTC.
      <>
        <div className="w-36">
          <InputDatePicker
            selectedDate={fromText(range.custom.from)}
            setSelectedDate={(date) => range.setCustom((c) => ({ ...c, from: date ? asText(date) : '' }))}
            setCurrentDate={() => undefined}
            placeholder="From"
            className="text-xs"
          />
        </div>
        <div className="w-36">
          <InputDatePicker
            selectedDate={fromText(range.custom.to)}
            setSelectedDate={(date) => range.setCustom((c) => ({ ...c, to: date ? asText(date) : '' }))}
            setCurrentDate={() => undefined}
            placeholder="To"
            className="text-xs"
          />
        </div>
      </>
    ) : null}
    <Button
      type="button"
      title="Refresh now"
      onClick={onRefresh}
      className="rounded border border-[rgb(var(--c-border))] p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700"
    >
      <FaSyncAlt className={`text-[11px] ${busy ? 'animate-spin' : ''}`} />
    </Button>
  </div>
);
