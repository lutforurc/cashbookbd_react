import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { FiPrinter, FiSearch } from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { useTrackedProducts } from './useTrackedProducts';
import { StatementRow, useProductStatement } from './productStatementSlice';

const LINE_LABELS: Record<string, string> = {
  sales_bill: 'Sales Bill',
  sales_return: 'Sales Return',
  purchase_bill: 'Purchase Bill',
  purchase_return: 'Purchase Return',
  cash_received: 'Cash Received',
  cash_payment: 'Cash Payment',
  bank_received: 'Bank Received',
  bank_payment: 'Bank Payment',
  journal_received: 'Journal (Received)',
  journal_payment: 'Journal (Payment)',
};

const money = (value: number) => (value ? thousandSeparator(Number(value)) : '-');

/**
 * Date picker যা দেয় তা থেকে YYYY-MM-DD.
 *
 * toISOString() ব্যবহার করা যাবে না — সেটি UTC-তে নেয়, আর GMT+6-এ স্থানীয়
 * মধ্যরাত UTC-তে আগের দিন সন্ধ্যা। ফলে ২৮/০৭ বাছলে report চাইত ২৭/০৭-এর,
 * অর্থাৎ পুরো পরিসর এক দিন পিছিয়ে যেত।
 */
const toIsoDate = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * Product Financial Statement.
 *
 * ⚠ এটি memo statement — General Ledger-এর সঙ্গে মিলবে না, কারণ কোন টাকা কোন
 *   পণ্যের বিপরীতে তা ব্যবহারকারী নিজে বেছে দেন (opt-in)। যেসব লেনদেনে
 *   Product দেওয়া হয়নি সেগুলো এখানে আসে না, তাই সেই ফাঁকটা আলাদা করে দেখানো হয়।
 */
const ProductFinancialStatement = () => {
  const dispatch = useDispatch();
  const branchDdl = useSelector((state: any) => state.branchDdl);
  const { data, loading, error, load } = useProductStatement();

  const [branchId, setBranchId] = useState(0);
  const [coa4Id, setCoa4Id] = useState(0);
  const [partyName, setPartyName] = useState('');
  const [productId, setProductId] = useState(0);
  const [startDate, setStartDate] = useState<any>(null);
  const [endDate, setEndDate] = useState<any>(null);

  // ledger context — নিষ্ক্রিয় Product-ও আসে, যাতে পুরোনো hisab দেখা যায়
  const { products } = useTrackedProducts('ledger', branchId || undefined, true, coa4Id || undefined);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Product Financial Statement',
    removeAfterPrint: true,
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

  const productOptions = useMemo(
    () => [
      { id: 0, name: '-- Select Product --' },
      ...products.map((p) => ({ id: p.id, name: p.is_active ? p.name : `${p.name} (inactive)` })),
    ],
    [products],
  );

  const apply = () => {
    const start = toIsoDate(startDate);
    const end = toIsoDate(endDate);

    if (!productId) return toast.error('একটি Product বাছুন।');
    if (!start || !end) return toast.error('তারিখ পরিসর দিন।');
    if (start > end) return toast.error('শুরুর তারিখ শেষ তারিখের পরে হতে পারে না।');

    load({ product_id: productId, branch_id: branchId, coa4_id: coa4Id, start_date: start, end_date: end });
  };

  const s = data?.summary;

  const cell = (label: string, value: number, strong = false) => (
    <div className="flex justify-between gap-4 py-1">
      <span className={strong ? 'font-semibold text-black dark:text-white' : ''}>{label}</span>
      <span className={`text-right tabular-nums ${strong ? 'font-semibold text-black dark:text-white' : ''}`}>
        {thousandSeparator(Number(value ?? 0))}
      </span>
    </div>
  );

  return (
    <div className="p-2">
      <HelmetTitle title="Product Financial Statement" />

      {/* ------------------ filters ------------------ */}
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
            placeholder="সব পার্টি"
            value={coa4Id ? { value: String(coa4Id), label: partyName } : null}
            onSelect={(selected) => {
              setCoa4Id(selected ? Number(selected.value) : 0);
              setPartyName(selected?.label ?? '');
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Product</label>
          <DropdownCommon
            id="product_id"
            name="product_id"
            className="h-10"
            value={String(productId)}
            data={productOptions}
            onChange={(e) => setProductId(Number(e.target.value))}
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

        <div className="flex gap-2">
          <ButtonLoading
            onClick={apply}
            buttonLoading={loading}
            label="Apply"
            className="whitespace-nowrap"
            icon={<FiSearch className="text-white text-lg ml-2 mr-2" />}
          />
          {data ? (
            <ButtonLoading
              onClick={handlePrint}
              buttonLoading={false}
              label="Print"
              className="whitespace-nowrap"
              icon={<FiPrinter className="text-white text-lg ml-2 mr-2" />}
            />
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-sm bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? <Loader /> : null}

      {!loading && !data && !error ? (
        <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
          Product ও তারিখ পরিসর বেছে <b>Apply</b> চাপুন।
        </p>
      ) : null}

      {/* ------------------ report ------------------ */}
      {data ? (
        <div ref={printRef} className="rounded-sm border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 text-center">
            <h2 className="text-lg font-bold text-black dark:text-white">Product Financial Statement</h2>
            <p className="text-sm">
              {data.product.name}
              {data.product.barcode ? ` (${data.product.barcode})` : ''}
            </p>
            <p className="text-sm">
              {data.party.name} · {data.branch.name}
            </p>
            <p className="text-sm">
              {data.start_date} — {data.end_date}
            </p>
          </div>

          <p className="mb-3 rounded-sm bg-amber-50 p-2 text-xs leading-snug text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {data.notice}
            {data.unmapped.rows_count > 0 ? (
              <>
                {' '}এই পরিসরে Product ছাড়া <b>{data.unmapped.rows_count}</b> টি লেনদেন আছে —
                Received {thousandSeparator(data.unmapped.received)} ও Payment{' '}
                {thousandSeparator(data.unmapped.payment)} — যা নিচের হিসাবে ধরা হয়নি।
              </>
            ) : null}
          </p>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-sm border border-stroke p-3 text-sm dark:border-strokedark">
              <h3 className="mb-2 font-semibold text-black dark:text-white">Receivable (বিক্রয়)</h3>
              {cell('Opening Receivable', s!.opening_receivable)}
              {cell('Sales Bill', s!.sales_bill)}
              {cell('Sales Return', -s!.sales_return)}
              {cell('Cash Received', -s!.cash_received)}
              <hr className="my-1 border-stroke dark:border-strokedark" />
              {cell('Closing Receivable', s!.closing_receivable, true)}
            </div>

            <div className="rounded-sm border border-stroke p-3 text-sm dark:border-strokedark">
              <h3 className="mb-2 font-semibold text-black dark:text-white">Payable (ক্রয়)</h3>
              {cell('Opening Payable', s!.opening_payable)}
              {cell('Purchase Bill', s!.purchase_bill)}
              {cell('Purchase Return', -s!.purchase_return)}
              {cell('Cash Payment', -s!.cash_payment)}
              <hr className="my-1 border-stroke dark:border-strokedark" />
              {cell('Closing Payable', s!.closing_payable, true)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-300 uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Voucher</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Party</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Rate</th>
                  <th className="px-2 py-2 text-right">Sales Bill</th>
                  <th className="px-2 py-2 text-right">Purchase Bill</th>
                  <th className="px-2 py-2 text-right">Received</th>
                  <th className="px-2 py-2 text-right">Payment</th>
                  <th className="px-2 py-2 text-right">Receivable</th>
                  <th className="px-2 py-2 text-right">Payable</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-2 py-4 text-center text-gray-500">
                      এই পরিসরে কোনো লেনদেন নেই।
                    </td>
                  </tr>
                ) : null}

                {data.rows.map((row: StatementRow, index: number) => (
                  <tr
                    key={`${row.main_trx_id}-${row.line_type}-${index}`}
                    className="border-b bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <td className="whitespace-nowrap px-2 py-1">{row.vr_date}</td>
                    <td className="whitespace-nowrap px-2 py-1">{row.vr_no}</td>
                    <td className="whitespace-nowrap px-2 py-1">
                      {LINE_LABELS[row.line_type] ?? row.line_type}
                    </td>
                    <td className="px-2 py-1">{row.party_name}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {row.quantity ? thousandSeparator(row.quantity) : '-'}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {row.rate ? thousandSeparator(row.rate) : '-'}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {money(row.sales_bill - row.sales_return)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {money(row.purchase_bill - row.purchase_return)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(row.cash_received)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(row.cash_payment)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {thousandSeparator(row.receivable_balance)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {thousandSeparator(row.payable_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProductFinancialStatement;
