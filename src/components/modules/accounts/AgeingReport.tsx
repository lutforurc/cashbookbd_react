import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPrinter } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_AGEING_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

import AgeingPrint from './AgeingPrint';

/**
 * Who owes what, and for how long.
 *
 * ⚠️ THE AGE IS COUNTED FROM THE DAY A BILL FELL DUE, not the day it was raised.
 * A bill with thirty days to run is not overdue in its third week, and a chasing
 * list that says it is turns into noise nobody reads. Where a customer has no
 * terms set, their bills are due the day they are raised — so the terms box sits
 * in the row itself, because this is the screen on which somebody discovers the
 * terms are missing.
 *
 * ⚠️ NOTHING SAYS WHICH RECEIPT PAID WHICH BILL, because no receipt in this
 * system does — accounts are kept as a running total. A payment is therefore
 * applied to the oldest bill still standing, then the next. That is not an
 * approximation of something better; it is what the age of a debt means when
 * accounts are kept this way, and the screen says so where it can be read.
 *
 * ⚠️ WHAT IS NOT YET DUE HAS ITS OWN COLUMN and is never folded into the first
 * bucket. Money nobody has been asked for yet is not a nought-to-thirty-day
 * debt, and hiding it there would put people who owe nothing at the top of the
 * chasing list.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a report is made up to a calendar day.
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

const AgeingReport = () => {
  const [asOn, setAsOn] = useState(asText(new Date()));
  const [side, setSide] = useState('receivable');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: printRef, documentTitle: 'Ageing' });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_AGEING_URL, { params: { as_on: asOn, side } });

      setData(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not work the ageing out');
    } finally {
      setLoading(false);
    }
  }, [asOn, side]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Set one party's terms, from the row.
   *
   * ⚠️ Every one of their bills re-ages the moment this is saved — which is the
   * point, and why the server says so in the message rather than leaving
   * somebody to notice the columns moved.
   */
  const setTerms = async (row: any, days: string) => {
    try {
      const res = await httpService.post(`${API_AGEING_URL}/terms`, {
        coa4_id: row.coa4_id,
        credit_days: days === '' ? null : Number(days),
      });

      toast.success(res?.data?.message || 'Saved', { autoClose: 8000 });
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save the terms', { autoClose: 10000 });
    }
  };

  const buckets: string[] = data?.buckets ?? [];
  const rows: any[] = data?.rows ?? [];
  const totals = data?.totals ?? {};

  if (loading && !data) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Ageing" />

      <h2 className="mb-3 text-center text-xl font-semibold text-black dark:text-white">
        {side === 'payable' ? 'What We Owe' : 'What Is Owed To Us'}
      </h2>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-52">
          <DropdownCommon
            id="ageing_side"
            name="side"
            label="Which way"
            data={[
              { id: 'receivable', name: 'Customers owe us' },
              { id: 'payable', name: 'We owe suppliers' },
            ]}
            value={side}
            onChange={(e: any) => setSide(e.target.value)}
          />
        </div>

        <div className="w-44">
          <InputDatePicker
            id="ageing_as_on"
            name="as_on"
            label="As on"
            selectedDate={asDate(asOn)}
            setSelectedDate={(date: Date | null) => setAsOn(asText(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        <ButtonLoading onClick={print} label="Print" icon={<FiPrinter size={16} />} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">
                {side === 'payable' ? 'Supplier' : 'Customer'}
              </th>
              <th className="px-3 py-2 text-center text-sm font-medium text-black dark:text-white">
                Terms
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                Not yet due
              </th>
              {buckets.map((one) => (
                <th
                  key={one}
                  className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white"
                >
                  {one}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                Owed
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row: any) => (
                <tr key={row.coa4_id} className="border-b border-stroke dark:border-strokedark">
                  <td className="px-3 py-2">
                    <div className="text-black dark:text-white">{row.party_name || row.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {row.mobile ? `${row.mobile} · ` : ''}
                      {row.oldest_due
                        ? `oldest fell due ${onTheDay(row.oldest_due)} — ${row.oldest_days} day(s) ago`
                        : 'nothing overdue'}
                    </div>
                  </td>

                  {/* ⚠️ Editable in the row. A report that shows wrong ages and
                      makes somebody leave the page to fix them stays wrong. */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      max={365}
                      defaultValue={row.credit_days ?? ''}
                      placeholder="cash"
                      onBlur={(e) => {
                        const next = e.target.value;

                        if (String(row.credit_days ?? '') !== next) setTerms(row, next);
                      }}
                      className="w-20 rounded border border-stroke bg-transparent px-2 py-1 text-center text-sm text-black dark:border-strokedark dark:text-white"
                      title="How many days this party gets to pay. Empty means due at once."
                    />
                  </td>

                  <td className="px-3 py-2 text-right text-sm text-gray-500 dark:text-gray-400">
                    {Number(row.not_due) ? money(row.not_due) : ''}
                  </td>

                  {buckets.map((one, index) => (
                    <td
                      key={one}
                      className={`px-3 py-2 text-right text-sm ${
                        // The last bucket is the one somebody has to do
                        // something about, so it is the one that is coloured.
                        index === buckets.length - 1 && Number(row.buckets[one])
                          ? 'font-medium text-danger dark:text-red-400'
                          : 'text-black dark:text-white'
                      }`}
                    >
                      {Number(row.buckets[one]) ? money(row.buckets[one]) : ''}
                    </td>
                  ))}

                  <td className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                    {money(row.outstanding)}
                    {Number(row.advance) ? (
                      <div className="text-xs font-normal text-success dark:text-emerald-400">
                        {money(row.advance)} on account
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={buckets.length + 4} className="px-3 py-4 text-center text-sm text-gray-500">
                  Nobody owes anything on that date.
                </td>
              </tr>
            )}
          </tbody>

          {rows.length ? (
            <tfoot>
              <tr className="border-t-2 border-stroke font-semibold dark:border-strokedark">
                <td className="px-3 py-2 text-sm text-black dark:text-white">Total</td>
                <td />
                <td className="px-3 py-2 text-right text-sm text-black dark:text-white">
                  {money(totals.not_due ?? 0)}
                </td>
                {buckets.map((one) => (
                  <td key={one} className="px-3 py-2 text-right text-sm text-black dark:text-white">
                    {money(totals[one] ?? 0)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right text-sm text-black dark:text-white">
                  {money(totals.outstanding ?? 0)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {/* ⚠️ The sentence that stops the report being misread. It comes from the
          server, so it cannot drift from what the arithmetic actually does. */}
      {data?.note ? (
        <p className="mt-3 text-xs leading-snug text-gray-500 dark:text-gray-400">{data.note}</p>
      ) : null}

      <AgeingPrint
        ref={printRef}
        side={side}
        asOn={onTheDay(asOn)}
        buckets={buckets}
        rows={rows}
        totals={totals}
        note={data?.note}
      />
    </div>
  );
};

export default AgeingReport;
