import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPrinter } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';

import InputDatePicker from '../../utils/fields/DatePicker';
import InputElement from '../../utils/fields/InputElement';
import FormToggleField from '../../utils/utils-functions/FormToggleField';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_ASSET_VERIFICATION_ROUND_URL, API_ASSET_VERIFY_URL } from '../../services/apiRoutes';

import AssetVerificationPrint from './AssetVerificationPrint';

/**
 * The count: walking round the building and ticking off what is actually there.
 *
 * ⚠️ THE COLUMN THAT MATTERS IS THE EMPTY ONE. A count is not finished when
 * everything ticked was found — it is finished when nothing is left unlooked at.
 * So the round lists every asset in the branch, not only the ones somebody has
 * already reached, and says how many are still untouched at the top where it
 * cannot be missed.
 *
 * ⚠️ A ROUND IS NAMED BY ITS DATE. Change the date and this is a different
 * round: last year's answers stay where they are, and one asset can be counted
 * once in each. Ticking the same asset twice in one round corrects the first
 * answer instead of adding a second one.
 *
 * ⚠️ NOTHING HERE WRITES ANYTHING OFF. "Not there" is a finding, not a decision:
 * somebody takes the list of missing things and decides, and writing one off is
 * its own act with its own entries, done from the register. A count that quietly
 * wrote assets out of the books would be a count nobody dared run.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a count happens on a calendar day, and
  // going through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '';
};

const CHOICES: { id: string; label: string; on: string }[] = [
  { id: 'found', label: 'There', on: 'bg-success text-white border-success' },
  { id: 'damaged', label: 'Damaged', on: 'bg-amber-500 text-white border-amber-500' },
  { id: 'missing', label: 'Not there', on: 'bg-danger text-white border-danger' },
];

const AssetVerificationTab = ({
  branchId,
  branchName,
}: {
  branchId?: number | null;
  branchName?: string;
}) => {
  const [countedOn, setCountedOn] = useState(asText(new Date()));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /** Only what is still to be looked at — the way the round is actually walked. */
  const [onlyLeft, setOnlyLeft] = useState(false);

  /** Typed against one row, so the store room's name is not lost on the way. */
  const [seenAt, setSeenAt] = useState<Record<number, string>>({});

  const printRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: printRef, documentTitle: 'Asset verification' });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_ASSET_VERIFICATION_ROUND_URL, {
        params: { counted_on: countedOn, branch_id: branchId || undefined },
      });

      setData(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the round');
    } finally {
      setLoading(false);
    }
  }, [countedOn, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Tick one asset.
   *
   * ⚠️ The row is changed on the screen before the server answers, and put back
   * if it refuses. A count is walked at walking pace — a spinner between every
   * chair and the next would make the screen slower than the paper it replaces.
   */
  const tick = async (row: any, found: string) => {
    const was = data.rows;

    setData({
      ...data,
      rows: data.rows.map((one: any) =>
        one.asset_id === row.asset_id ? { ...one, found, seen_at: seenAt[row.asset_id] ?? one.seen_at } : one,
      ),
    });

    try {
      await httpService.post(`${API_ASSET_VERIFY_URL}/${row.asset_id}`, {
        counted_on: countedOn,
        found,
        location: seenAt[row.asset_id] || null,
      });

      // The summary at the top has to move with the ticks, so it is re-read
      // rather than counted twice in two places.
      load();
    } catch (error: any) {
      setData({ ...data, rows: was });
      toast.error(error?.response?.data?.message || 'Could not record it');
    }
  };

  if (loading && !data) return <Loader />;

  const summary = data?.summary ?? { total: 0, found: 0, missing: 0, damaged: 0, not_looked: 0 };

  const rows = (data?.rows ?? []).filter((one: any) => (onlyLeft ? !one.found : true));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-44">
          <InputDatePicker
            id="round_counted_on"
            name="counted_on"
            label="The count of"
            selectedDate={asDate(countedOn)}
            setSelectedDate={(date: Date | null) => setCountedOn(asText(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        {/* The app's own switch, so it matches every other toggle in the
            product. h-8.5 rather than a margin: this bar aligns on items-end,
            and a switch hung off the bottom of a taller box sits at a
            different line from the date field and the button beside it. */}
        <div className="flex h-8.5 items-center whitespace-nowrap">
          <FormToggleField
            label="Only what is left"
            checked={onlyLeft}
            onChange={setOnlyLeft}
            className=""
          />
        </div>

        <ButtonLoading onClick={print} label="Print the list" icon={<FiPrinter size={16} />} />
      </div>

      {/* ⚠️ Untouched first and in words, because it is the number that says
          whether the count is finished. */}
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 rounded border border-stroke p-2 text-sm dark:border-strokedark">
        <span className="text-black dark:text-white">
          <strong>{summary.not_looked}</strong> of {summary.total} not looked at yet
        </span>
        <span className="text-success dark:text-emerald-400">There {summary.found}</span>
        <span className="text-amber-600 dark:text-amber-400">Damaged {summary.damaged}</span>
        <span className="text-danger dark:text-red-400">Not there {summary.missing}</span>
        {summary.missing ? (
          <span className="text-gray-500 dark:text-gray-400">
            Nothing is written off from here — take the missing ones to whoever decides.
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">Asset</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">
                Register says
              </th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">
                Actually at
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-black dark:text-white">
                What the count found
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row: any) => (
                <tr key={row.asset_id} className="border-b border-stroke dark:border-strokedark">
                  <td className="px-3 py-2">
                    <div className="text-black dark:text-white">{row.name}</div>
                    <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {row.code}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                    {row.register_says || '—'}
                  </td>
                  <td className="px-3 py-2">
                    {/* Filled in only where it differs — which is the finding
                        that quietly matters most, and the one a tick alone
                        loses. */}
                    <InputElement
                      id={`seen_at_${row.asset_id}`}
                      name="seen_at"
                      placeholder={row.register_says || 'Where it was'}
                      value={seenAt[row.asset_id] ?? row.seen_at ?? ''}
                      onChange={(e: any) =>
                        setSeenAt({ ...seenAt, [row.asset_id]: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {CHOICES.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => tick(row, choice.id)}
                          className={`rounded border px-2 py-1 text-xs transition ${
                            row.found === choice.id
                              ? choice.on
                              : 'border-stroke text-gray-500 hover:text-black dark:border-strokedark dark:text-gray-400 dark:hover:text-white'
                          }`}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                  {onlyLeft
                    ? 'Nothing left — everything in this branch has been looked at.'
                    : 'Nothing in the register for this branch yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AssetVerificationPrint
        ref={printRef}
        branchName={branchName}
        countedOn={onTheDay(countedOn)}
        rows={data?.rows ?? []}
        summary={summary}
      />
    </div>
  );
};

export default AssetVerificationTab;
