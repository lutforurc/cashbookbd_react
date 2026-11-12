import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getProductionFreeGoods } from './productionSlice';
import { branchTodayIso, monthStartIso } from './branchDate';

const dateFromIso = (value: string): Date | null => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const isoFromDate = (date: Date | null): string =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';

/**
 * Free Goods -- what was given away in the period, at what it cost
 * (v4 খ-৯). The goods left stock like any other line, so their cost already
 * sits in cost of goods sold; this sheet is the separate line that says how
 * much of it went out for nothing.
 *
 * The cost is the sale's own FIFO cost (the same figure the return brings the
 * goods back at), read from the invoice the free row was written on.
 */
const FreeGoodsReport = () => {
  const dispatch = useDispatch<any>();
  const trxDt = useSelector((s: any) => s.settings?.data?.trx_dt);

  const [to, setTo] = useState(() => branchTodayIso(trxDt));
  const [from, setFrom] = useState(() => monthStartIso(to));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const rows: any[] = Array.isArray(report?.rows) ? report.rows : [];

  const run = () => {
    setLoading(true);
    dispatch(
      getProductionFreeGoods({ from_date: from, to_date: to }, (response: any) => {
        setLoading(false);
        if (response?.success) setReport(response?.data?.data ?? null);
        else toast.error(response?.message || 'Could not load the free goods');
      }) as any,
    );
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <HelmetTitle title="Free Goods" />

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-full md:w-44">
          <InputDatePicker
            id="freeGoodsFrom"
            name="from"
            label="From"
            selectedDate={dateFromIso(from)}
            setSelectedDate={(date) => setFrom(isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-44">
          <InputDatePicker
            id="freeGoodsTo"
            name="to"
            label="To"
            selectedDate={dateFromIso(to)}
            setSelectedDate={(date) => setTo(isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>
        <ButtonLoading
          onClick={run}
          buttonLoading={loading}
          label={loading ? 'Loading...' : 'Show'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSearch className="text-lg" />}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
            <tr>
              <th className="px-2 py-2 text-center">Sl</th>
              <th className="px-2 py-2">Vr. No.</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2">Scheme</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Unit cost</th>
              <th className="px-2 py-2 text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">{index + 1}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.vr_no}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{String(row.vr_date).slice(0, 10)}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.product_name || ''} {row.product_code ? `(${row.product_code})` : ''}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.scheme_name || '-'}</td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.qty))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.unit_cost))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.value))}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td colSpan={8} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  {loading ? 'Loading...' : 'No free goods in this period'}
                </td>
              </tr>
            )}
            {!!rows.length && (
              <tr className="bg-[rgb(var(--c-table-head))] font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                <td colSpan={5} className="px-2 py-2 text-right">
                  Total
                </td>
                <td className="px-2 py-2 text-right">{thousandSeparator(Number(report?.total_qty))}</td>
                <td />
                <td className="px-2 py-2 text-right">{thousandSeparator(Number(report?.total_cost))}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        ফ্রি মালের খরচ আলাদা করে দেখানো হয়েছে — হিসাবের খাতায় এটি বিক্রিত মালের খরচেই ধরা আছে, তাই এখানে আলাদা করে
        ধরলে দুইবার হবে।
      </p>
    </div>
  );
};

export default FreeGoodsReport;
