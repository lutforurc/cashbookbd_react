import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import InputElement from '../../utils/fields/InputElement';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import routes from '../../services/appRoutes';
import { getProductionExpiry } from './productionSlice';
import { branchTodayIso } from './branchDate';

const dateFromIso = (value: string): Date | null => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const isoFromDate = (date: Date | null): string =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';

/**
 * Near Expiry -- the batches whose output has expired or is about to.
 *
 * The stock shown is the PRODUCT'S at this branch, not the batch's: the shelf
 * is one FIFO queue per product, and a sale does not say which batch it drew
 * from. So a row says what the batch made and what the branch holds of that
 * product today; a product with nothing on hand is left out by the server.
 */
const ExpiryReport = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const trxDt = useSelector((s: any) => s.settings?.data?.trx_dt);

  const [asOf, setAsOf] = useState(() => branchTodayIso(trxDt));
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const rows: any[] = Array.isArray(report?.rows) ? report.rows : [];

  const run = () => {
    setLoading(true);
    dispatch(
      getProductionExpiry({ as_of: asOf, days: Number(days) || 0 }, (response: any) => {
        setLoading(false);
        if (response?.success) setReport(response?.data?.data ?? null);
        else toast.error(response?.message || 'Could not load the expiry list');
      }) as any,
    );
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cell = 'px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]';

  return (
    <div>
      <HelmetTitle title="Near Expiry" />

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-full md:w-44">
          <InputDatePicker
            id="expiryAsOf"
            name="asOf"
            label="As of"
            selectedDate={dateFromIso(asOf)}
            setSelectedDate={(date) => setAsOf(isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-36">
          <InputElement
            id="expiryDays"
            name="days"
            label="Within (days)"
            type="number"
            value={days}
            placeholder="30"
            onChange={(e: any) => setDays(e.target.value)}
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
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2">Batch</th>
              <th className="px-2 py-2">Vr. No.</th>
              <th className="px-2 py-2">Made on</th>
              <th className="px-2 py-2">Expiry</th>
              <th className="px-2 py-2 text-right">Days left</th>
              <th className="px-2 py-2 text-right">Batch made</th>
              <th className="px-2 py-2 text-right">Product on hand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const expired = Number(row.days_left) < 0;
              return (
                <tr
                  key={`${row.production_id}-${row.product_id}-${row.expiry_date}`}
                  className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700 cursor-pointer"
                  onClick={() => navigate(routes.production_costing.replace(':id', String(row.production_id)))}
                  title="Open the batch costing"
                >
                  <td className={`${cell} text-center`}>{index + 1}</td>
                  <td className={cell}>
                    {row.product_name || ''} {row.product_code ? `(${row.product_code})` : ''}
                  </td>
                  <td className={cell}>{row.batch_ref || '-'}</td>
                  <td className={cell}>{row.vr_no || '-'}</td>
                  <td className={cell}>{String(row.production_date || '').slice(0, 10)}</td>
                  <td className={cell}>{String(row.expiry_date || '').slice(0, 10)}</td>
                  <td className={`px-2 py-2 text-right font-semibold ${expired ? 'text-red-600' : 'text-gray-900 dark:text-[rgb(var(--c-text))]'}`}>
                    {expired ? `Expired ${Math.abs(Number(row.days_left))} d ago` : Number(row.days_left)}
                  </td>
                  <td className={`${cell} text-right`}>
                    {thousandSeparator(Number(row.qty))} {row.unit || ''}
                  </td>
                  <td className={`${cell} text-right`}>
                    {thousandSeparator(Number(row.on_hand))} {row.unit || ''}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td colSpan={9} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  {loading ? 'Loading...' : 'Nothing expires in this window'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        "Product on hand" পুরো পণ্যের মজুদ, শুধু এই ব্যাচের নয় — বিক্রি কোন ব্যাচ থেকে গেছে তা আলাদা করে রাখা হয় না। যে
        পণ্যের মজুদ শূন্য, তা এখানে দেখানো হয় না। সারিতে ক্লিক করলে ব্যাচের Costing খোলে।
      </p>
    </div>
  );
};

export default ExpiryReport;
