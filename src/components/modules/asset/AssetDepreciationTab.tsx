import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlay, FiRotateCcw } from 'react-icons/fi';

import InputDatePicker from '../../utils/fields/DatePicker';
import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_ASSET_DEPRECIATION_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

/**
 * The yearly charge — shown first, then posted.
 *
 * ⚠️ SHOWN FIRST, ALWAYS. Pressing Run writes a voucher into the books, so what
 * it would do is put in front of a person before it does it. The figures below
 * come from the server's own arithmetic, not from a second sum here: the number
 * somebody agrees to on screen has to be the number in the ledger.
 *
 * ⚠️ ONE PROPERTY, ONE YEAR, ONE VOUCHER, with a line per category. Four hundred
 * assets would make an eight-hundred-line voucher nobody reads; the asset-level
 * working is kept in the register and shown in the table below.
 *
 * ⚠️ A YEAR ALREADY CHARGED IS DRAWN AS IT WAS CHARGED — the rate, the days and
 * the amount that were stored, never recomputed at today's rate. A rate edited
 * since must not restate a year the accounts have already closed.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '—';
};

const AssetDepreciationTab = ({ branchId }: { branchId?: number | null }) => {
  // The date the year is asked about. The server turns it into the 30th of June
  // it falls on or before, and answers with that — so this box is "as at", not
  // "the year ending", and nobody has to work out which June a date belongs to.
  const [asAt, setAsAt] = useState<string>(asText(new Date()));

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState<any>(null);

  // The tab lives in the address, so the banner below can send somebody to the
  // one that fixes the blockage rather than telling them to find it.
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(`${API_ASSET_DEPRECIATION_URL}/plan`, {
        params: { year_ending: asAt, branch_id: branchId || undefined },
      });

      setPlan(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not work the year out');
    } finally {
      setLoading(false);
    }
  }, [asAt, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const charge = async () => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_DEPRECIATION_URL}/run`, {
        year_ending: plan?.year_ending ?? asAt,
        branch_id: branchId || null,
      });

      // Held on screen for longer than a toast usually is: it carries the
      // voucher number, which is the thing somebody types into the accounts.
      toast.success(res?.data?.message || 'Charged', { autoClose: 8000 });
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not charge the year');
    } finally {
      setSaving(false);
    }
  };

  const undo = async () => {
    setSaving(true);

    try {
      const res = await httpService.post(
        `${API_ASSET_DEPRECIATION_URL}/reverse/${undoing.id}`,
        {},
      );

      toast.success(res?.data?.message || 'Reversed', { autoClose: 8000 });
      setUndoing(null);
      load();
    } catch (error: any) {
      // Usually the refusal: the voucher has been approved, so it is somebody's
      // signed decision. The server's sentence says exactly that.
      toast.error(error?.response?.data?.message || 'Could not reverse it');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Asset',
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">{row.name}</div>
          <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
            {row.code} · {row.category_name}
          </div>
        </div>
      ),
    },
    {
      key: 'opening_wdv',
      header: 'Worth at 1 July',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => money(row.opening_wdv),
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => `${Number(row.rate)}%`,
    },
    {
      key: 'days',
      header: 'Days',
      headerClass: 'text-right',
      cellClass: 'text-right',
      /**
       * ⚠️ Short years are called out. 61 days beside 365 is the difference
       * between an asset bought in May and one owned all year — the first
       * question anybody asks of a figure that looks too small.
       */
      render: (row: any) =>
        Number(row.days) === 365 ? (
          <span className="text-gray-500 dark:text-gray-400">365</span>
        ) : (
          <span className="font-medium text-primary dark:text-secondary" title="Owned for part of the year only — charged by the day.">
            {row.days}
          </span>
        ),
    },
    {
      key: 'amount',
      header: 'Depreciation',
      headerClass: 'text-right',
      cellClass: 'text-right font-medium',
      render: (row: any) =>
        Number(row.amount) ? (
          money(row.amount)
        ) : (
          <span
            className="text-xs text-gray-400"
            title="Nothing to charge — either it is already at its floor, or it was not owned during this year."
          >
            —
          </span>
        ),
    },
    {
      key: 'closing_wdv',
      header: 'Worth after',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => money(row.closing_wdv),
    },
    {
      key: 'charged',
      header: '',
      headerClass: 'w-24 text-center',
      cellClass: 'text-center',
      render: (row: any) =>
        row.charged ? (
          <span className="inline-flex h-5.5 items-center rounded border border-teal-400 bg-teal-100 px-2 text-[0.65rem] font-semibold leading-none text-teal-900 dark:border-teal-400/60 dark:bg-teal-500/25 dark:text-teal-50">
            charged
          </span>
        ) : null,
    },
  ];

  if (loading && !plan) return <Loader />;

  const done = Boolean(plan?.run);
  const total = (plan?.totals ?? []).reduce((sum: number, one: any) => sum + Number(one.amount), 0);

  /**
   * The foot of the table: what the page in front of somebody adds up to.
   *
   * ⚠️ THIS IS NOT THE SAME FIGURE AS THE BUTTON'S, and it must not pretend
   * to be. The table lists every asset in the register -- including the ones
   * already charged this year and the ones held up by a category with no ledger
   * heads -- while the button charges only what is left to charge. Two totals
   * that quietly disagree is the worst thing a page like this can do, so the
   * difference is said in words underneath rather than hidden by leaving rows
   * out of the sum.
   */
  const rows: any[] = plan?.rows ?? [];

  const sumOf = (key: string) =>
    rows.reduce((sum: number, one: any) => sum + Number(one[key] ?? 0), 0);

  const shownDepreciation = sumOf('amount');

  /**
   * ⚠️ A DEAD BUTTON HAS TO SAY WHY IT IS DEAD. "Nothing to charge" over a
   * register full of assets reads as "no depreciation is due" — which is the
   * one thing it does not mean when every category is waiting for its ledger
   * heads. The two states are told apart here and the words follow.
   */
  const blocked = (plan?.blocked ?? []).length;
  const stuck = !total && blocked > 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <InputDatePicker
            id="dep_as_at"
            name="as_at"
            label="Year ending on or after"
            selectedDate={asDate(asAt)}
            setSelectedDate={(date: Date | null) => setAsAt(asText(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        {plan ? (
          <div className="text-sm">
            <div className="text-gray-500 dark:text-gray-400">Charging the year ending</div>
            <div className="text-base font-semibold text-black dark:text-white">
              {onTheDay(plan.year_ending)}
            </div>
          </div>
        ) : null}

        {/* ⚠️ Drawn as done rather than hidden. A year already charged is the
            answer to "did we do this?", and a missing button is not an answer. */}
        {done ? (
          <div className="flex items-center gap-3">
            <span className="rounded border border-teal-400 bg-teal-100 px-3 py-1.5 text-xs font-semibold text-teal-900 dark:border-teal-400/60 dark:bg-teal-500/25 dark:text-teal-50">
              Already charged — {plan.run.asset_count} asset(s), {money(plan.run.total_amount)}
            </span>
            <ButtonLoading
              onClick={() => setUndoing(plan.run)}
              label="Undo this year"
              icon={<FiRotateCcw size={16} />}
            />
          </div>
        ) : (
          <ButtonLoading
            onClick={charge}
            buttonLoading={saving}
            label={
              total
                ? `Charge ${money(total)}`
                : stuck
                  ? 'Waiting for the ledger heads'
                  : 'Nothing to charge'
            }
            icon={<FiPlay size={16} />}
            variant={total ? 'primary' : 'default'}
            disabled={!total}
          />
        )}
      </div>

      {/* ⚠️ The blockage is named, with the category that caused it. A run that
          quietly skipped those assets would leave a schedule short by exactly
          the assets nobody was told about. */}
      {plan?.blocked?.length ? (
        <p className="mb-3 rounded border border-amber-400 bg-amber-50 p-2.5 text-xs leading-snug text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
          <strong>Left out:</strong> {plan.blocked.join(', ')} — these categories have no ledger
          heads yet, so their assets cannot be charged.{' '}
          <button
            type="button"
            onClick={() => {
              const at = new URLSearchParams(params);
              at.set('tab', 'categories');
              setParams(at, { replace: true });
            }}
            className="font-semibold underline"
          >
            Choose them on the Categories tab
          </button>
          , then come back.
        </p>
      ) : null}

      {plan?.totals?.length ? (
        <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">
            What the voucher will say
          </div>

          {/* One line per category, which is one pair of legs on the voucher. */}
          {plan.totals.map((one: any) => (
            <div
              key={one.category_name}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-sm last:border-0 dark:border-strokedark"
            >
              <span className="text-gray-600 dark:text-gray-300">
                {one.category_name}{' '}
                <span className="text-xs text-gray-400">({one.assets} asset(s))</span>
              </span>
              <span className="font-medium text-black dark:text-white">{money(one.amount)}</span>
            </div>
          ))}

          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold text-black dark:text-white">Total</span>
            <span className="font-semibold text-black dark:text-white">{money(total)}</span>
          </div>

          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            Debit each category’s depreciation head, credit its accumulated depreciation — one
            journal for this property, dated {onTheDay(plan.year_ending)}.
          </p>
        </div>
      ) : null}

      <Table
        columns={columns}
        data={rows}
        noDataMessage="No assets in this property’s register for that year."
        footerRows={
          rows.length
            ? [
                [
                  {
                    label: `Total — ${rows.length} asset(s)`,
                    className: 'text-black dark:text-white',
                  },
                  { label: money(sumOf('opening_wdv')), className: 'text-right' },
                  // Rate and days are not things that add up. A column of
                  // percentages with a total under it is a column somebody will
                  // one day try to read.
                  { label: '', className: 'text-right' },
                  { label: '', className: 'text-right' },
                  {
                    label: (
                      <div className="text-right">
                        <div>{money(shownDepreciation)}</div>
                        {/* ⚠️ Said only when the two figures differ, and then
                            plainly: the rest is already in the books, or is
                            waiting for its category's ledger heads. */}
                        {Math.abs(shownDepreciation - total) > 0.005 ? (
                          <div className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            {money(total)} of it left to charge
                          </div>
                        ) : null}
                      </div>
                    ),
                    className: 'text-right',
                  },
                  { label: money(sumOf('closing_wdv')), className: 'text-right' },
                  { label: '' },
                ],
              ]
            : undefined
        }
      />

      {/* The years already charged here, so somebody can look one up rather
          than guessing which Junes have been done. */}
      {plan?.history?.length ? (
        <div className="mt-4">
          <div className="mb-2 text-sm font-medium text-black dark:text-white">
            Years already charged
          </div>
          <ul className="text-sm">
            {plan.history.map((one: any) => (
              <li
                key={one.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 last:border-0 dark:border-strokedark"
              >
                <span className="text-gray-600 dark:text-gray-300">
                  {onTheDay(one.year_ending)} · {one.asset_count} asset(s)
                </span>
                <span className="text-black dark:text-white">{money(one.total_amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ConfirmModal
        show={Boolean(undoing)}
        title="Undo this year’s depreciation?"
        message={
          undoing
            ? `A second journal will be written, reversing every line of the first — the books keep both, so what happened can be shown. The ${undoing.asset_count} asset(s) go back to what they were worth before, and the year can be charged again.`
            : ''
        }
        confirmLabel="Undo it"
        cancelLabel="Leave it"
        onConfirm={undo}
        onCancel={() => setUndoing(null)}
        loading={saving}
      />
    </div>
  );
};

export default AssetDepreciationTab;
