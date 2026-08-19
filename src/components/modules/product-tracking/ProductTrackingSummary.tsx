import { useEffect, useMemo, useRef, useState } from 'react';
import { FIELD_CHECKBOX } from '../../../theme/fieldStyles';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { FiPrinter, FiSearch } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import { API_PRODUCT_TRACKING_SUMMARY_URL } from '../../services/apiRoutes';
import routes from '../../services/appRoutes';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { Input } from '../../utils/fields/FormControls';

type SummaryRow = {
  product_id: number;
  product_name: string;
  opening_receivable: number;
  sales_bill: number;
  sales_return: number;
  cash_received: number;
  closing_receivable: number;
  opening_payable: number;
  purchase_bill: number;
  purchase_return: number;
  cash_payment: number;
  closing_payable: number;
};

type SummaryData = {
  branch: { id: number; name: string | null };
  party: { id: number; name: string | null };
  start_date: string;
  end_date: string;
  notice: string;
  rows: SummaryRow[];
  totals: Omit<SummaryRow, 'product_id' | 'product_name'> | null;
  unmapped: { received: number; payment: number; rows_count: number };
};

const money = (value: number) => (value ? thousandSeparator(Number(value)) : '-');

/** Local date. toISOString() converts to UTC, which in GMT+6 slipped a day back. */
const toIsoDate = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

/**
 * Every tracked product in one list -- what is receivable on each, what is payable.
 *
 * The Product Statement shows one product at a time; this is the other way
 * round. Clicking a row opens that product's full statement.
 */
const ProductTrackingSummary = () => {
  const dispatch = useDispatch();
  const branchDdl = useSelector((state: any) => state.branchDdl);

  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState(0);
  const [coa4Id, setCoa4Id] = useState(0);
  const [partyName, setPartyName] = useState('');
  const [startDate, setStartDate] = useState<any>(null);
  const [endDate, setEndDate] = useState<any>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Product-wise Receivable & Payable',
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
  }, [dispatch]);

  const branchOptions = useMemo(
    () => [
      { id: '0', name: 'All Branch' },
      ...((branchDdl?.protectedData?.data ?? []) as Array<{ id: any; name: string }>).map((b) => ({
        id: String(b.id),
        name: b.name,
      })),
    ],
    [branchDdl?.protectedData?.data],
  );

  const apply = () => {
    const start = toIsoDate(startDate);
    const end = toIsoDate(endDate);

    if (!start || !end) return toast.error('Give a date range.');
    if (start > end) return toast.error('The start date cannot be after the end date.');

    setLoading(true);
    setError(null);

    httpService
      .get(API_PRODUCT_TRACKING_SUMMARY_URL, {
        params: {
          branch_id: branchId,
          coa4_id: coa4Id,
          start_date: start,
          end_date: end,
          include_inactive: includeInactive ? 1 : undefined,
        },
      })
      .then((response) => setData(response?.data?.data?.data ?? null))
      .catch((e) => {
        setData(null);
        setError(
          e?.response?.status === 403
            ? 'You are not allowed to view this report (product.tracking.report.view).'
            : e?.response?.data?.message ?? 'The report could not be loaded.',
        );
      })
      .finally(() => setLoading(false));
  };

  const statementLink = (productId: number) =>
    `${routes.product_financial_statement}?product_id=${productId}`;

  return (
    <div className="p-2">
      <HelmetTitle title="Product-wise Receivable & Payable" />

      <div className="mb-4 grid grid-cols-1 items-end gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
          <BranchDropdown
            id="branch_id"
            name="branch_id"
            className="w-full p-1 text-sm h-10"
            branchDdl={branchOptions}
            value={String(branchId)}
            onChange={(e) => setBranchId(Number(e.target.value))}
          />
        </div>

        <div className="xl:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Customer / Supplier
          </label>
          <DdlMultiline
            id="coa4_id"
            name="coa4_id"
            className="h-10"
            placeholder="All parties"
            value={coa4Id ? { value: String(coa4Id), label: partyName } : null}
            onSelect={(selected) => {
              setCoa4Id(selected ? Number(selected.value) : 0);
              setPartyName(selected?.label ?? '');
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
          <InputDatePicker
            setCurrentDate={setStartDate}
            className="font-medium text-sm w-full h-10"
            selectedDate={startDate}
            setSelectedDate={setStartDate}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
          <InputDatePicker
            setCurrentDate={setEndDate}
            className="font-medium text-sm w-full h-10"
            selectedDate={endDate}
            setSelectedDate={setEndDate}
          />
        </div>

        {/* h-10 keeps the buttons level with the input and dropdown beside them;
            without it they sat short in the filter row. */}
        <div className="flex items-end gap-2 xl:col-span-2">
          <ButtonLoading
            onClick={apply}
            buttonLoading={loading}
            label="Apply"
            className="h-10 whitespace-nowrap"
            icon={<FiSearch className="text-lg ml-2 mr-2" />}
          />
          {data ? (
            <ButtonLoading
              onClick={handlePrint}
              buttonLoading={false}
              label="Print"
              className="h-10 whitespace-nowrap"
              icon={<FiPrinter className="text-lg ml-2 mr-2" />}
            />
          ) : null}
        </div>
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm">
        <Input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
          className={FIELD_CHECKBOX}
        />
        <span className="text-gray-600 dark:text-gray-300">
          Show deactivated products too (to reconcile older figures)
        </span>
      </label>

      {error ? (
        <p className="rounded-sm bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? <Loader /> : null}

      {!loading && !data && !error ? (
        <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
          Choose a date range, then press <b>Apply</b>.
        </p>
      ) : null}

      {data ? (
        <div
          ref={printRef}
          className="rounded-sm border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark"
        >
          <div className="mb-3 text-center">
            <h2 className="text-lg font-bold text-black dark:text-white">
              Product-wise Receivable &amp; Payable
            </h2>
            <p className="text-sm">
              {data.party.name} Â· {data.branch.name}
            </p>
            <p className="text-sm">
              {data.start_date} â€” {data.end_date}
            </p>
          </div>

          <p className="mb-3 rounded-sm bg-amber-50 p-2 text-xs leading-snug text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {data.notice}
            {data.unmapped.rows_count > 0 ? (
              <>
                {' '}This range holds <b>{data.unmapped.rows_count}</b> entries with no product --
                Received {thousandSeparator(data.unmapped.received)} and Payment{' '}
                {thousandSeparator(data.unmapped.payment)}.
              </>
            ) : null}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-300 uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                <tr>
                  <th rowSpan={2} className="px-2 py-2 align-bottom">Product</th>
                  <th colSpan={5} className="border-l px-2 py-1 text-center">Receivable (Sales)</th>
                  <th colSpan={5} className="border-l px-2 py-1 text-center">Payable (Purchase)</th>
                </tr>
                <tr>
                  <th className="border-l px-2 py-1 text-right">Opening</th>
                  <th className="px-2 py-1 text-right">Sales Bill</th>
                  <th className="px-2 py-1 text-right">Return</th>
                  <th className="px-2 py-1 text-right">Received</th>
                  <th className="px-2 py-1 text-right">Closing</th>
                  <th className="border-l px-2 py-1 text-right">Opening</th>
                  <th className="px-2 py-1 text-right">Purchase Bill</th>
                  <th className="px-2 py-1 text-right">Return</th>
                  <th className="px-2 py-1 text-right">Payment</th>
                  <th className="px-2 py-1 text-right">Closing</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-2 py-4 text-center text-gray-500">
                      No product is configured. Add one from Settings â†’ Product Tracking.
                    </td>
                  </tr>
                ) : null}

                {data.rows.map((row) => (
                  <tr
                    key={row.product_id}
                    className="border-b bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <td className="whitespace-nowrap px-2 py-1 font-medium text-gray-900 dark:text-white">
                      <Link to={statementLink(row.product_id)} className="hover:underline">
                        {row.product_name}
                      </Link>
                    </td>
                    <td className="border-l px-2 py-1 text-right tabular-nums">{money(row.opening_receivable)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(row.sales_bill)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(row.sales_return)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(row.cash_received)}</td>
                    <td className="px-2 py-1 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                      {money(row.closing_receivable)}
                    </td>
                    <td className="border-l px-2 py-1 text-right tabular-nums">{money(row.opening_payable)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(row.purchase_bill)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(row.purchase_return)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(row.cash_payment)}</td>
                    <td className="px-2 py-1 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                      {money(row.closing_payable)}
                    </td>
                  </tr>
                ))}
              </tbody>

              {data.totals ? (
                <tfoot>
                  <tr className="bg-gray-200 font-semibold text-gray-900 dark:bg-gray-700 dark:text-white">
                    <td className="px-2 py-2">Total</td>
                    <td className="border-l px-2 py-2 text-right tabular-nums">{money(data.totals.opening_receivable)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(data.totals.sales_bill)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(data.totals.sales_return)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(data.totals.cash_received)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(data.totals.closing_receivable)}</td>
                    <td className="border-l px-2 py-2 text-right tabular-nums">{money(data.totals.opening_payable)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(data.totals.purchase_bill)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(data.totals.purchase_return)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(data.totals.cash_payment)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{money(data.totals.closing_payable)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProductTrackingSummary;
