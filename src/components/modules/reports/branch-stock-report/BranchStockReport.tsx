import { useEffect, useMemo, useRef, useState } from 'react';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { FiCheckSquare, FiHome } from 'react-icons/fi';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { getCategoryDdl } from '../../category/categorySlice';
import { fetchBrandDdl } from '../../product/brand/brandSlice';
import { API_REPORT_BRANCH_STOCK_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import Table from '../../../utils/others/Table';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

type BranchColumn = { id: number | string; name: string };

type ReportRow = {
  sl_number: number;
  product_id: number | string;
  product_name: string;
  cat_name: string;
  brand_name: string;
  unit: string;
  opening: number;
  branches: Record<string, number>;
  total: number;
  damaged: number;
  shortage: number;
};

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Blank instead of 0 keeps a wide branch matrix readable. */
const qtyCell = (value: any) => (num(value) === 0 ? '-' : thousandSeparator(num(value)));

const BranchStockReport = ({ user }: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const categoryData: any = useSelector((state: any) => state.category);
  const brand: any = useSelector((state: any) => state.brand);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>('');
  const [brandId, setBrandId] = useState<string | null>('');
  const [search, setSearch] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [branchColumns, setBranchColumns] = useState<BranchColumn[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    dispatch(getCategoryDdl() as any);
    dispatch(fetchBrandDdl() as any);
  }, [dispatch]);

  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;

    if (Array.isArray(protectedData?.data)) {
      setDropdownData(protectedData.data);
    }

    // Seed the range to the current month up to the transaction date.
    if (protectedData?.transactionDate) {
      const [day, month, year] = protectedData.transactionDate.split('/');
      setStartDate(new Date(Number(year), Number(month) - 1, 1));
      setEndDate(new Date(Number(year), Number(month) - 1, Number(day)));
    }
  }, [branchDdlData?.protectedData]);

  const branchName = useMemo(
    () => dropdownData.find((b: any) => String(b.id) === String(branchId))?.name || '',
    [dropdownData, branchId],
  );

  const categoryOptions = useMemo(
    () => [
      { id: '', name: 'All Categories' },
      ...(categoryData?.ddlData?.data?.category || []),
    ],
    [categoryData],
  );

  const brandOptions = useMemo(
    () => [{ id: '', name: 'All Brand' }, ...(brand?.brandDdl?.data || [])],
    [brand],
  );

  const runReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select start date and end date.');
      return;
    }

    setButtonLoading(true);
    setError('');

    try {
      const response = await httpService.post(API_REPORT_BRANCH_STOCK_URL, {
        startdate: dayjs(startDate).format('YYYY-MM-DD'),
        enddate: dayjs(endDate).format('YYYY-MM-DD'),
        branch_id: branchId || null,
        category_id: categoryId || null,
        brand_id: brandId || null,
        product_name: search || null,
      });

      // foundData() double-wraps: res.data.data.data holds the payload.
      const payload = response?.data;
      const data = payload?.data?.data ?? payload?.data;

      const list = Array.isArray(data?.rows) ? data.rows : [];
      setBranchColumns(Array.isArray(data?.branches) ? data.branches : []);
      setRows(list);

      if (list.length === 0) {
        setError('No stock found for this date range.');
      }
    } catch (err: any) {
      setRows([]);
      setBranchColumns([]);
      setError(err?.response?.data?.message || err?.message || 'Branch stock report load failed.');
    } finally {
      setButtonLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Branch Stock Report',
  });

  const onPrint = () => {
    if (!rows.length) {
      setError('Please run the report before printing.');
      return;
    }
    handlePrint();
  };

  const totals = useMemo(() => {
    const branchTotals: Record<string, number> = {};
    branchColumns.forEach((b) => {
      branchTotals[String(b.id)] = 0;
    });

    const base = { opening: 0, total: 0, damaged: 0, shortage: 0 };

    rows.forEach((r) => {
      base.opening += num(r.opening);
      base.total += num(r.total);
      base.damaged += num(r.damaged);
      base.shortage += num(r.shortage);
      branchColumns.forEach((b) => {
        branchTotals[String(b.id)] += num(r.branches?.[String(b.id)]);
      });
    });

    return { ...base, branchTotals };
  }, [rows, branchColumns]);

  const columns = useMemo(
    () => [
      { key: 'sl_number', header: 'Sl', headerClass: 'text-center', cellClass: 'text-center' },
      { key: 'product_name', header: 'Product' },
      { key: 'unit', header: 'Unit', headerClass: 'text-center', cellClass: 'text-center' },
      {
        key: 'opening',
        header: 'Opening',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (r: ReportRow) => qtyCell(r.opening),
      },
      ...branchColumns.map((b) => ({
        key: `branch_${b.id}`,
        header: b.name,
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (r: ReportRow) => qtyCell(r.branches?.[String(b.id)]),
      })),
      {
        key: 'total',
        header: 'Total',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (r: ReportRow) => (
          <span className={num(r.total) < 0 ? 'font-bold text-danger' : 'font-semibold'}>
            {thousandSeparator(num(r.total))}
          </span>
        ),
      },
      {
        key: 'damaged',
        header: 'Damaged',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (r: ReportRow) => (
          <span className={num(r.damaged) > 0 ? 'font-semibold text-danger' : ''}>
            {qtyCell(r.damaged)}
          </span>
        ),
      },
      {
        key: 'shortage',
        header: 'Short',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (r: ReportRow) => (
          <span className={num(r.shortage) > 0 ? 'font-semibold text-warning' : ''}>
            {qtyCell(r.shortage)}
          </span>
        ),
      },
    ],
    [branchColumns],
  );

  const footerRows = useMemo(() => {
    if (!rows.length) return undefined;

    return [
      [
        { label: 'Total', colSpan: 3, className: 'text-right' },
        { label: thousandSeparator(totals.opening), className: 'text-right' },
        ...branchColumns.map((b) => ({
          label: thousandSeparator(totals.branchTotals[String(b.id)] || 0),
          className: 'text-right',
        })),
        { label: thousandSeparator(totals.total), className: 'text-right' },
        { label: thousandSeparator(totals.damaged), className: 'text-right' },
        { label: thousandSeparator(totals.shortage), className: 'text-right' },
      ],
    ];
  }, [rows.length, totals, branchColumns]);

  const rangeLabel =
    startDate && endDate
      ? `${dayjs(startDate).format('DD/MM/YYYY')} â€” ${dayjs(endDate).format('DD/MM/YYYY')}`
      : '';

  return (
    <div>
      <HelmetTitle title="Branch Stock Report" />

      <div className="px-0 py-3">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-white">
              Select Branch
            </label>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className={`${FIELD_SELECT} h-10 w-full px-2 text-sm font-medium`}
            >
              <option value="">All Branch</option>
              {dropdownData.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <InputDatePicker
            label="Start Date"
            selectedDate={startDate}
            setSelectedDate={setStartDate}
            setCurrentDate={setStartDate}
            className="h-10 w-full text-sm font-medium"
          />

          <InputDatePicker
            label="End Date"
            selectedDate={endDate}
            setSelectedDate={setEndDate}
            setCurrentDate={setEndDate}
            className="h-10 w-full text-sm font-medium"
          />

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-white">
              Brand
            </label>
            <CategoryDropdown
              onChange={(option: any) => setBrandId(option?.value ?? '')}
              className="w-full text-sm h-9.5"
              categoryDdl={brandOptions}
              value={brandId}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-white">
              Category
            </label>
            <CategoryDropdown
              onChange={(option: any) => setCategoryId(option?.value ?? '')}
              className="w-full text-sm h-9.5"
              categoryDdl={categoryOptions}
              placeholder="All Categories"
              value={categoryId}
            />
          </div>

          <InputElement
            id="branchStockReportSearch"
            name="search"
            label="Product"
            placeholder="Filter by product"
            value={search}
            onChange={(event: any) => setSearch(event.target.value)}
            className="h-10 text-sm font-medium"
          />

          <div className="flex items-end gap-2">
            <ButtonLoading
              onClick={runReport}
              buttonLoading={buttonLoading}
              label="OK"
              icon={<FiCheckSquare />}
              className="h-10 px-6"
            />
            <PrintButton onClick={onPrint} label="Print" className="h-10 px-5" />
            <ButtonLoading
              onClick={() => navigate('/')}
              buttonLoading={false}
              label="Home"
              icon={<FiHome />}
              className="h-10 px-5"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-5">
          <Table
            columns={columns as any}
            data={rows}
            className="rounded-none"
            tableClassName="table-auto text-sm"
            footerRows={footerRows as any}
            noDataMessage="No data found"
          />
        </div>
      </div>

      {/* Print view */}
      <div className="hidden">
        <div ref={printRef} className="print-root p-6 text-gray-900">
          <PrintStyles orientation="landscape" />
          <style>{`@media print {.print-root { padding: 0 !important; } }`}</style>
          <PadPrinting />
          <h1 className="mt-3 text-center text-xl font-bold uppercase">Branch Stock Report</h1>
          <div className="mb-3 mt-1 text-center text-sm">
            <span>Branch: <b>{branchName || 'All Branch'}</b></span>
            {rangeLabel ? <span> &nbsp;|&nbsp; {rangeLabel}</span> : null}
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-center w-8">Sl</th>
                <th className="border border-black px-2 py-1 text-left">Product</th>
                <th className="border border-black px-2 py-1 text-center w-16">Unit</th>
                <th className="border border-black px-2 py-1 text-right w-20">Opening</th>
                {branchColumns.map((b) => (
                  <th key={b.id} className="border border-black px-2 py-1 text-right">
                    {b.name}
                  </th>
                ))}
                <th className="border border-black px-2 py-1 text-right w-20">Total</th>
                <th className="border border-black px-2 py-1 text-right w-20">Damaged</th>
                <th className="border border-black px-2 py-1 text-right w-20">Short</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product_id}>
                  <td className="border border-black px-2 py-1 text-center">{r.sl_number}</td>
                  <td className="border border-black px-2 py-1 text-left">{r.product_name}</td>
                  <td className="border border-black px-2 py-1 text-center">{r.unit || '-'}</td>
                  <td className="border border-black px-2 py-1 text-right">{qtyCell(r.opening)}</td>
                  {branchColumns.map((b) => (
                    <td key={b.id} className="border border-black px-2 py-1 text-right">
                      {qtyCell(r.branches?.[String(b.id)])}
                    </td>
                  ))}
                  <td className="border border-black px-2 py-1 text-right">{thousandSeparator(num(r.total))}</td>
                  <td className="border border-black px-2 py-1 text-right">{qtyCell(r.damaged)}</td>
                  <td className="border border-black px-2 py-1 text-right">{qtyCell(r.shortage)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="border border-black px-2 py-1 text-right" colSpan={3}>Total</td>
                <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totals.opening)}</td>
                {branchColumns.map((b) => (
                  <td key={b.id} className="border border-black px-2 py-1 text-right">
                    {thousandSeparator(totals.branchTotals[String(b.id)] || 0)}
                  </td>
                ))}
                <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totals.total)}</td>
                <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totals.damaged)}</td>
                <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totals.shortage)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BranchStockReport;
