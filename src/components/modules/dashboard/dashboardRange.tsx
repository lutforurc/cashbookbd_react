import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaSyncAlt } from 'react-icons/fa';
import dayjs from 'dayjs';

import httpService from '../../services/httpService';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { API_DASHBOARD_CASH_BOOK_URL, API_USER_CURRENT_BRANCH_URL } from '../../services/apiRoutes';
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

/**
 * The branch a dashboard is ABOUT.
 *
 * For everybody it is their own branch. For a head office (branch_types_id
 * 1) it is whichever branch the dropdown says, every branch to choose from
 * -- and the page becomes THAT branch's page, the one its own clerk opens:
 * a site gets the construction page, a shop the shop's. DashboardIndex reads
 * `viewBranch` to pick the page, and every page hands `viewBranchId` to its
 * reads.
 *
 * ⚠️ Held in a context above the pages, not in each page: choosing a branch
 * can swap the page component out from under the dropdown, and state kept
 * inside the page would go with it.
 */
export type ViewBranch = {
  /** The viewed branch's record, with the same flags user/current-branch gives the user's own. */
  viewBranch: any;
  viewBranchId: number | undefined;
  viewBranchName: string;
  isHeadOffice: boolean;
  branches: any[];
  chosen: string;
  setChosen: (id: string) => void;
  /** True while the chosen branch's record is on its way. */
  loading: boolean;
  /**
   * False when a head office is looking at ANOTHER branch. Looking is all it
   * may do there: a button that changes that branch's books (receiving a
   * remittance, say) is drawn but not offered.
   */
  viewingOwn: boolean;
};

const ViewBranchContext = createContext<ViewBranch | null>(null);

export const ViewBranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<any>();
  const currentBranch = useSelector((state: any) => state.branchList?.currentBranch);
  const branches: any[] = useSelector((state: any) => state.branchDdl?.protectedData?.data) ?? [];
  const isHeadOffice = Number(currentBranch?.branch_types_id) === 1;
  const [chosen, setChosen] = useState<string>('');
  const [fetched, setFetched] = useState<{ id: number; branch: any } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isHeadOffice && !branches.length) dispatch(getDdlProtectedBranch());
  }, [dispatch, isHeadOffice, branches.length]);

  const viewBranchId: number | undefined =
    isHeadOffice && chosen ? Number(chosen) : currentBranch?.id;
  const viewingOwn = !viewBranchId || String(viewBranchId) === String(currentBranch?.id);

  // The chosen branch's record -- its business type flags decide the page.
  useEffect(() => {
    if (viewingOwn || !viewBranchId) return undefined;
    let alive = true;
    setLoading(true);
    httpService
      .get(API_USER_CURRENT_BRANCH_URL, { params: { branch_id: viewBranchId } })
      .then((response) => {
        if (alive) setFetched({ id: viewBranchId, branch: response?.data?.data?.data ?? null });
      })
      .catch(() => {
        if (alive) setFetched({ id: viewBranchId, branch: null });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [viewBranchId, viewingOwn]);

  // While the next branch's record is on its way the LAST one stays: the
  // page keeps standing on it, and swaps -- if the type differs -- only once
  // the new record has landed. Dropping to nothing in between unmounted the
  // page to a spinner and every card jumped.
  const viewBranch = viewingOwn ? currentBranch : (fetched?.branch ?? currentBranch);
  const viewBranchName: string =
    viewBranch?.name ??
    branches.find((b: any) => String(b?.id) === String(viewBranchId))?.name ??
    currentBranch?.name ??
    '';

  return (
    <ViewBranchContext.Provider
      value={{ viewBranch, viewBranchId, viewBranchName, isHeadOffice, branches, chosen, setChosen, loading, viewingOwn }}
    >
      {children}
    </ViewBranchContext.Provider>
  );
};

/** The view above, or -- outside DashboardIndex -- the user's own branch and nothing to choose. */
export const useViewBranch = (): ViewBranch => {
  const context = useContext(ViewBranchContext);
  const currentBranch = useSelector((state: any) => state.branchList?.currentBranch);
  return (
    context ?? {
      viewBranch: currentBranch,
      viewBranchId: currentBranch?.id,
      viewBranchName: currentBranch?.name ?? '',
      isHeadOffice: false,
      branches: [],
      chosen: '',
      setChosen: () => undefined,
      loading: false,
      viewingOwn: true,
    }
  );
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
  /** The head office's branch picker; anyone else sees nothing here. */
  view?: ViewBranch;
  onRefresh: () => void;
  busy?: boolean;
}> = ({ range, view, onRefresh, busy }) => (
  <div className="flex flex-wrap items-center gap-2">
    {view?.isHeadOffice && view.branches.length ? (
      <div className="w-44">
        <BranchDropdown
          branchDdl={view.branches}
          value={view.viewBranchId == null ? '' : String(view.viewBranchId)}
          onChange={(event) => view.setChosen(event.target.value)}
          className="px-2 text-xs font-medium"
        />
      </div>
    ) : null}
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
