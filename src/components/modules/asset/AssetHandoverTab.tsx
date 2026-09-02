import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import InputDatePicker from '../../utils/fields/DatePicker';
import InputElement from '../../utils/fields/InputElement';
import FormToggleField from '../../utils/utils-functions/FormToggleField';
import Loader from '../../../common/Loader';

import httpService from '../../services/httpService';
import { API_ASSET_MOVEMENTS_URL } from '../../services/apiRoutes';

/**
 * The handover register: what is out of the building, and who signed for it.
 *
 * ⚠️ THE TOP HALF IS THE REGISTER; THE BOTTOM HALF IS THE EVIDENCE. What is out
 * now is the question somebody actually opens this for — the generator that has
 * not come back, the laptop with a man who left. The log underneath is what that
 * claim rests on, and it is worth nothing on its own: nobody reads forty rows to
 * work out which four things are missing.
 *
 * ⚠️ WHAT IS OUT IS WORKED OUT ON THE SERVER, from each asset's latest movement.
 * Not counted again here. Two ways of deciding who is holding something is two
 * answers to give an auditor, and the panel that hands assets out already uses
 * the server's.
 *
 * ⚠️ AND IT IS A RECORD, NOT AN INSTRUCTION. A thing out for two hundred days is
 * shown as out for two hundred days; nothing here chases anybody, writes
 * anything off, or decides that a holder has kept it too long. Somebody reads
 * the register and decides.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): these are calendar days, and going
  // through UTC moves them a day for half the world.
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

const today = () => asText(new Date());

const AssetHandoverTab = ({ branchId }: { branchId: number | string }) => {
  const [asOf, setAsOf] = useState<string>(today());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyOut, setOnlyOut] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_ASSET_MOVEMENTS_URL, {
        params: { branch_id: branchId, as_of: asOf },
      });

      setData(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the register');
    } finally {
      setLoading(false);
    }
  }, [branchId, asOf]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Loader />;

  const summary = data?.summary ?? { assets: 0, out: 0, in_hand: 0, movements: 0 };

  const matches = (row: any) =>
    !search.trim() ||
    [row.name, row.code, row.with, row.at]
      .filter(Boolean)
      .some((one: string) => String(one).toLowerCase().includes(search.trim().toLowerCase()));

  const out = (data?.out ?? []).filter(matches);
  const rows = (data?.rows ?? []).filter(matches);

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-44">
          <InputDatePicker
            id="handover_as_of"
            name="as_of"
            label="As it stood on"
            selectedDate={asDate(asOf)}
            setSelectedDate={(date: Date | null) => setAsOf(asText(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        <div className="w-60">
          <InputElement
            id="handover_search"
            name="search"
            label="Find"
            placeholder="An asset, a person, a branch"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
          />
        </div>

        {/* Matches the count's own switch, and sits the same way: h-8.5 rather
            than a margin, because this bar aligns on items-end and a switch
            hung off a taller box lands on a different line from the date. */}
        <div className="flex h-8.5 items-center whitespace-nowrap">
          <FormToggleField label="Only what is out" checked={onlyOut} onChange={setOnlyOut} className="" />
        </div>
      </div>

      {/* ⚠️ What is out comes first and in words. It is the number the register
          is opened for; how many movements were recorded is background. */}
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 rounded border border-stroke p-2 text-sm dark:border-strokedark">
        <span className="text-black dark:text-white">
          <strong>{summary.out}</strong> of {summary.assets} out with somebody
        </span>
        <span className="text-success dark:text-emerald-400">In hand {summary.in_hand}</span>
        <span className="text-gray-500 dark:text-gray-400">{summary.movements} movements recorded</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">Asset</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">With</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">At</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">Since</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                Days out
              </th>
            </tr>
          </thead>
          <tbody>
            {out.length ? (
              out.map((row: any) => (
                <tr key={row.asset_id} className="border-b border-stroke dark:border-strokedark">
                  <td className="px-3 py-2">
                    <p className="text-black dark:text-white">{row.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{row.code}</p>
                  </td>
                  <td className="px-3 py-2 text-black dark:text-white">{row.with || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.at || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{onTheDay(row.since)}</td>
                  {/* Plain, however long it has been. A register that shouted at
                      ninety days would be reporting a rule nobody has set. */}
                  <td className="px-3 py-2 text-right text-black dark:text-white">{row.days_out}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                  {search.trim() ? 'Nothing out matches that.' : 'Everything is in hand.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!onlyOut ? (
        <>
          <h4 className="mb-2 mt-6 text-sm font-medium text-black dark:text-white">
            Every movement, newest first
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">On</th>
                  <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">Asset</th>
                  <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">With</th>
                  <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">At</th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                    What happened
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row: any) => (
                    <tr key={row.id} className="border-b border-stroke dark:border-strokedark">
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{onTheDay(row.on_date)}</td>
                      <td className="px-3 py-2">
                        <p className="text-black dark:text-white">{row.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.code}</p>
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.with || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.at || '—'}</td>
                      <td
                        className={`px-3 py-2 text-right ${
                          row.action === 'issued'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-success dark:text-emerald-400'
                        }`}
                      >
                        {row.action === 'issued' ? 'Issued' : 'Returned'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                      Nothing has been handed out yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AssetHandoverTab;
