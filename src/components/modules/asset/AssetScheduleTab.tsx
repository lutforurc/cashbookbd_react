import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter } from 'react-icons/fi';

import InputDatePicker from '../../utils/fields/DatePicker';
import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_ASSET_SCHEDULE_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';
import AssetSchedulePrint from './AssetSchedulePrint';

/**
 * The Schedule of Fixed Assets — the note the year-end accounts print.
 *
 * ⚠️ THIS IS THE PAPER AN AUDITOR ASKS FOR FIRST, and the only place the
 * register and the ledger can be seen agreeing. It reads across, per class:
 *
 *     cost at the start + bought − sold = cost at the end
 *     depreciation at the start + this year − on what was sold = at the end
 *     and the difference is what the class is worth
 *
 * ⚠️ EVERY FIGURE IS READ BACK, NEVER RECOMPUTED. The charge for a year comes
 * from the rows that year wrote, so a rate edited since cannot restate a year
 * the accounts have already closed.
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

const AssetScheduleTab = ({
  branchId,
  branchName,
}: {
  branchId?: number | null;
  branchName?: string;
}) => {
  const [asAt, setAsAt] = useState<string>(asText(new Date()));
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_ASSET_SCHEDULE_URL, {
        params: { year_ending: asAt, branch_id: branchId || undefined },
      });

      setSchedule(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not build the schedule');
    } finally {
      setLoading(false);
    }
  }, [asAt, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Schedule of Fixed Assets ${schedule?.year_ending ?? ''}`,
  });

  const columns = [
    { key: 'category', header: 'Class of asset' },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (row.rate === null ? '' : `${Number(row.rate)}%`),
    },
    {
      key: 'opening_cost',
      header: 'Cost at 1 July',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => money(row.opening_cost),
    },
    {
      key: 'additions',
      header: 'Additions',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => money(row.additions),
    },
    {
      key: 'disposals_cost',
      header: 'Disposals',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => money(row.disposals_cost),
    },
    {
      key: 'closing_cost',
      header: 'Cost at 30 June',
      headerClass: 'text-right',
      cellClass: 'text-right font-medium',
      render: (row: any) => money(row.closing_cost),
    },
    {
      key: 'opening_dep',
      header: 'Dep. at 1 July',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => money(row.opening_dep),
    },
    {
      key: 'charge',
      header: 'For the year',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => money(row.charge),
    },
    {
      key: 'closing_dep',
      header: 'Dep. at 30 June',
      headerClass: 'text-right',
      cellClass: 'text-right font-medium',
      render: (row: any) => money(row.closing_dep),
    },
    {
      key: 'closing_wdv',
      header: 'Written down',
      headerClass: 'text-right',
      cellClass: 'text-right font-semibold',
      render: (row: any) => money(row.closing_wdv),
    },
  ];

  if (loading && !schedule) return <Loader />;

  const total = schedule?.total;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <InputDatePicker
            id="schedule_as_at"
            name="as_at"
            label="Year ending on or after"
            selectedDate={asDate(asAt)}
            setSelectedDate={(date: Date | null) => setAsAt(asText(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        {schedule ? (
          <div className="text-sm">
            <div className="text-gray-500 dark:text-gray-400">For the year</div>
            <div className="text-base font-semibold text-black dark:text-white">
              {onTheDay(schedule.year_start)} — {onTheDay(schedule.year_ending)}
            </div>
          </div>
        ) : null}

        <ButtonLoading
          onClick={print}
          label="Print"
          icon={<FiPrinter size={16} />}
          disabled={!schedule?.rows?.length}
        />
      </div>

      {/* ⚠️ Said before the table, not after it. A schedule whose year has not
          been charged shows an empty depreciation column, and a reader who is
          not told why reads it as a year in which nothing wore out. */}
      {schedule && !schedule.charged ? (
        <p className="mb-3 rounded border border-amber-400 bg-amber-50 p-2.5 text-xs leading-snug text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
          This year has not been charged yet, so the <strong>For the year</strong> column is
          empty. Charge it on the Depreciation tab and this fills in.
        </p>
      ) : null}

      <Table
        columns={columns}
        data={schedule?.rows ?? []}
        noDataMessage="Nothing on the register for that year."
      />

      {total && schedule?.rows?.length ? (
        <div className="mt-3 rounded border border-stroke p-3 text-sm dark:border-strokedark">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-4">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Cost at 30 June</span>
              <span className="font-medium text-black dark:text-white">
                {money(total.closing_cost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Depreciation</span>
              <span className="font-medium text-black dark:text-white">
                {money(total.closing_dep)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Charged this year</span>
              <span className="font-medium text-black dark:text-white">{money(total.charge)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-black dark:text-white">Written down value</span>
              <span className="font-semibold text-black dark:text-white">
                {money(total.closing_wdv)}
              </span>
            </div>
          </div>

          {/* The two subtractions a reader checks first, written out so nobody
              has to do them on the corner of the page. */}
          <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
            {money(total.opening_cost)} + {money(total.additions)} − {money(total.disposals_cost)} ={' '}
            {money(total.closing_cost)} · {money(total.opening_dep)} + {money(total.charge)} −{' '}
            {money(total.disposals_dep)} = {money(total.closing_dep)}
          </p>
        </div>
      ) : null}

      {schedule?.rows?.length ? (
        <AssetSchedulePrint
          ref={printRef}
          branchName={branchName}
          yearStart={schedule.year_start}
          yearEnd={schedule.year_ending}
          rows={schedule.rows}
          total={schedule.total}
          charged={Boolean(schedule.charged)}
        />
      ) : null}
    </div>
  );
};

export default AssetScheduleTab;
