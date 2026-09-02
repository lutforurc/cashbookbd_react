import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { FiChevronRight } from 'react-icons/fi';

import InputDatePicker from '../../utils/fields/DatePicker';
import InputElement from '../../utils/fields/InputElement';
import Loader from '../../../common/Loader';

import AssetCarePanel from './AssetCarePanel';

import httpService from '../../services/httpService';
import { API_ASSET_MOVEMENTS_URL } from '../../services/apiRoutes';

/**
 * The handover register: what is out of the building, and who signed for it.
 *
 * ⚠️ ONE QUESTION, ANSWERED ONCE: what is out, and with whom. The generator that
 * has not come back, the laptop with a man who left.
 *
 * ⚠️ AND ONE ASSET'S STORY IS TOLD BY THAT ASSET'S OWN PANEL. A branch-wide list
 * of movements sat under this table and read as noise — five rows for one bike
 * interleaved with two other assets, so following one thing meant stepping over
 * the others. Clicking a row opens the panel the register already uses, rather
 * than a second history to drift from the first.
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

  /** The asset whose own panel is open, if any. */
  const [caring, setCaring] = useState<any>(null);

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
              {/* Narrow and unlabelled: the chevron is the affordance, not a
                  column of its own worth a heading. */}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {out.length ? (
              out.map((row: any) => (
                /* ⚠️ The whole row opens it, and the chevron says so. A row that
                   does something has to look like it does -- without the cursor,
                   the hover and the mark on the right, this is a table nobody
                   would think to click, and the history would be as hidden as it
                   was before. */
                <tr
                  key={row.asset_id}
                  onClick={() => setCaring(row)}
                  title={`Open ${row.name}`}
                  className="cursor-pointer border-b border-stroke transition-colors hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                >
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
                  <td className="px-3 py-2 text-right text-gray-400">
                    <FiChevronRight size={16} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                  {search.trim() ? 'Nothing out matches that.' : 'Everything is in hand.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ⚠️ The register's own panel, not a copy of it. It shows the movements,
          the counts and the upkeep for this one asset -- and it can hand the
          asset out or take it back, which is the natural next act for somebody
          looking at a register of things that are out.

          So the register is reloaded when it closes: a return taken there has
          to change the list that sent you into it, or the screen would sit
          there insisting the thing is still with somebody. */}
      {caring ? (
        <AssetCarePanel
          asset={{
            id: caring.asset_id,
            name: caring.name,
            code: caring.code,
            location: caring.location,
            cost: caring.cost,
          }}
          onClose={() => {
            setCaring(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
};

export default AssetHandoverTab;
