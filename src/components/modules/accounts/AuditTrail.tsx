import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Loader from '../../../common/Loader';

import httpService from '../../services/httpService';
import { API_AUDIT_TRAIL_URL } from '../../services/apiRoutes';

/**
 * Who changed which voucher, and when.
 *
 * ⚠️ THE ROWS WERE ALWAYS BEING WRITTEN — there was simply no way to read them
 * except one voucher at a time, by number, if you already suspected that
 * voucher. A trail nobody can browse catches nobody, which is why this screen is
 * the whole of the work: the recording was never the missing part.
 *
 * ⚠️ A DELETION MARKED "from the voucher" IS A DELETION NOBODY RECORDED. Until
 * recently, deleting a voucher stamped who and when on the voucher itself and
 * wrote nothing to the trail — so for those, who and when is all there is, and
 * the screen says so rather than showing an empty change list as if nothing had
 * changed.
 *
 * ⚠️ ONLY WHAT CHANGED IS SHOWN. The stored documents carry timestamps and ids
 * that move on every save; a list of forty differences hides the one that
 * matters, which is nearly always the amount.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): these are calendar days.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const when = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(value ?? ''));

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]} ${parts[4]}:${parts[5]}` : String(value ?? '');
};

const ACTION_NAMES: Record<string, string> = {
  update: 'Edited',
  delete: 'Deleted',
  create: 'Written',
  restore: 'Restored',
};

const shown = (value: any): string => {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'object') return JSON.stringify(value);

  return String(value);
};

const monthAgo = () => {
  const now = new Date();

  return asText(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()));
};

const AuditTrail = () => {
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(asText(new Date()));
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_AUDIT_TRAIL_URL, {
        params: {
          from,
          to,
          user_id: userId || undefined,
          action: action || undefined,
          voucher_no: voucherNo || undefined,
        },
      });

      setData(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the trail');
    } finally {
      setLoading(false);
    }
  }, [from, to, userId, action, voucherNo]);

  useEffect(() => {
    load();
  }, [load]);

  const events: any[] = data?.events ?? [];

  if (loading && !data) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Audit Trail" />

      <h2 className="mb-3 text-center text-xl font-semibold text-black dark:text-white">
        Who Changed What
      </h2>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-40">
          <InputDatePicker
            id="trail_from"
            name="from"
            label="From"
            selectedDate={asDate(from)}
            setSelectedDate={(date: Date | null) => setFrom(asText(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        <div className="w-40">
          <InputDatePicker
            id="trail_to"
            name="to"
            label="To"
            selectedDate={asDate(to)}
            setSelectedDate={(date: Date | null) => setTo(asText(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        <div className="w-52">
          <DropdownCommon
            id="trail_user"
            name="user_id"
            label="Who"
            data={[
              { id: '', name: 'Anybody' },
              ...(data?.users ?? []).map((one: any) => ({ id: one.id, name: one.name })),
            ]}
            value={userId}
            onChange={(e: any) => setUserId(e.target.value)}
          />
        </div>

        <div className="w-40">
          <DropdownCommon
            id="trail_action"
            name="action"
            label="What"
            data={[
              { id: '', name: 'Anything' },
              { id: 'update', name: 'Edited' },
              { id: 'delete', name: 'Deleted' },
            ]}
            value={action}
            onChange={(e: any) => setAction(e.target.value)}
          />
        </div>

        <div className="w-44">
          <InputElement
            id="trail_voucher"
            name="voucher_no"
            label="Voucher no"
            value={voucherNo}
            onChange={(e: any) => setVoucherNo(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">When</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">Who</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">What</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">Voucher</th>
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">
                What changed
              </th>
            </tr>
          </thead>
          <tbody>
            {events.length ? (
              events.map((row: any) => (
                <tr key={row.id} className="border-b border-stroke dark:border-strokedark">
                  <td className="px-3 py-2 text-sm text-black dark:text-white">{when(row.at)}</td>
                  <td className="px-3 py-2 text-sm text-black dark:text-white">
                    {row.user ?? 'unknown'}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <span
                      className={
                        row.action === 'delete'
                          ? 'text-danger dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-300'
                      }
                    >
                      {ACTION_NAMES[row.action] ?? row.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {row.vr_no}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.changes?.length ? (
                      row.changes.slice(0, 8).map((change: any, index: number) => (
                        <div key={index} className="text-gray-600 dark:text-gray-300">
                          <span className="font-mono">{change.field}</span>{' '}
                          <span className="text-danger dark:text-red-400">{shown(change.old)}</span>{' '}
                          →{' '}
                          <span className="text-success dark:text-emerald-400">
                            {shown(change.new)}
                          </span>
                        </div>
                      ))
                    ) : row.source === 'voucher' ? (
                      // ⚠️ Said rather than left blank: an empty cell reads as
                      // "nothing changed", which for a deletion is the opposite
                      // of the truth.
                      <span className="text-gray-500 dark:text-gray-400">
                        Only who and when — this one was found on the voucher, not in the trail
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">nothing recorded</span>
                    )}
                    {row.changes?.length > 8 ? (
                      <div className="text-gray-400">
                        and {row.changes.length - 8} more field(s)
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                  Nothing was changed in that window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data?.note ? (
        <p className="mt-3 text-xs leading-snug text-gray-500 dark:text-gray-400">{data.note}</p>
      ) : null}
    </div>
  );
};

export default AuditTrail;
