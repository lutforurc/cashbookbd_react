import { useEffect, useMemo, useRef, useState } from 'react';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { FiCheckSquare, FiHome } from 'react-icons/fi';
import Loader from '../../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { API_REPORT_BRANCH_TRANSFER_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import Table from '../../../utils/others/Table';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type ReportRow = {
  sl_number: number;
  product_id: string | number;
  product_name: string;
  unit: string;
  opening: number;
  issued: number;
  balance: number;
};

const BranchTransferReport = ({ user }: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    setBranchId(user?.branch_id ? String(user.branch_id) : '');
  }, [dispatch, user?.branch_id]);

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

  useEffect(() => {
    const found = dropdownData.find((b: any) => String(b.id) === String(branchId));
    setBranchName(found?.name || '');
  }, [dropdownData, branchId]);

  const runReport = async () => {
    if (!branchId) {
      setError('Please select a branch.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select start date and end date.');
      return;
    }

    setButtonLoading(true);
    setError('');

    try {
      const response = await httpService.post(API_REPORT_BRANCH_TRANSFER_URL, {
        branch_id: Number(branchId),
        startdate: dayjs(startDate).format('YYYY-MM-DD'),
        enddate: dayjs(endDate).format('YYYY-MM-DD'),
        product_name: search || null,
      });

      // foundData() double-wraps: res.data.data.data holds the rows.
      const payload = response?.data;
      const data = payload?.data?.data ?? payload?.data;
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      if (list.length === 0) {
        setError('No branch transfer found for this branch and date range.');
      }
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || err?.message || 'Branch transfer report load failed.');
    } finally {
      setButtonLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Branch Transfer Report',
    removeAfterPrint: true,
  });

  const onPrint = () => {
    if (!rows.length) {
      setError('Please run the report before printing.');
      return;
    }
    handlePrint();
  };

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.opening += Number(r.opening) || 0;
          acc.issued += Number(r.issued) || 0;
          acc.balance += Number(r.balance) || 0;
          return acc;
        },
        { opening: 0, issued: 0, balance: 0 },
      ),
    [rows],
  );

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
        render: (r: ReportRow) => thousandSeparator(Number(r.opening)),
      },
      {
        key: 'issued',
        header: 'Issued',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (r: ReportRow) => (
          <span className="font-semibold text-warning">{thousandSeparator(Number(r.issued))}</span>
        ),
      },
      {
        key: 'balance',
        header: 'Available',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (r: ReportRow) => (
          <span className={Number(r.balance) < 0 ? 'font-bold text-danger' : ''}>
            {thousandSeparator(Number(r.balance))}
          </span>
        ),
      },
    ],
    [],
  );

  const footerRows = useMemo(() => {
    if (!rows.length) return undefined;
    return [
      [
        { label: 'Total', colSpan: 3, className: 'text-right' },
        { label: thousandSeparator(totals.opening), className: 'text-right' },
        { label: thousandSeparator(totals.issued), className: 'text-right' },
        { label: thousandSeparator(totals.balance), className: 'text-right' },
      ],
    ];
  }, [rows.length, totals]);

  const rangeLabel =
    startDate && endDate
      ? `${dayjs(startDate).format('DD/MM/YYYY')} — ${dayjs(endDate).format('DD/MM/YYYY')}`
      : '';

  return (
    <div>
      <HelmetTitle title="Branch Transfer Report" />

      <div className="px-0 py-3">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-white">
              Select Branch <span className="text-red-600">*</span>
            </label>
            {branchDdlData?.isLoading ? <Loader /> : null}
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className={`${FIELD_SELECT} h-10 w-full px-2 text-sm font-medium`}
            >
              <option value="">Select branch</option>
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

          <InputElement
            id="branchTransferReportSearch"
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
          <style>{`@media print { @page { size: A4 portrait; margin: 8mm; } .print-root { padding: 0 !important; } }`}</style>
          <PadPrinting />
          <h1 className="mt-3 text-center text-xl font-bold uppercase">Branch Transfer Report</h1>
          <div className="mb-3 mt-1 text-center text-sm">
            {branchName ? <span>Branch: <b>{branchName}</b></span> : null}
            {rangeLabel ? <span> &nbsp;|&nbsp; {rangeLabel}</span> : null}
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-center w-10">Sl</th>
                <th className="border border-black px-2 py-1 text-left">Product</th>
                <th className="border border-black px-2 py-1 text-center w-20">Unit</th>
                <th className="border border-black px-2 py-1 text-right w-28">Opening</th>
                <th className="border border-black px-2 py-1 text-right w-28">Issued</th>
                <th className="border border-black px-2 py-1 text-right w-28">Available</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product_id}>
                  <td className="border border-black px-2 py-1 text-center">{r.sl_number}</td>
                  <td className="border border-black px-2 py-1 text-left">{r.product_name}</td>
                  <td className="border border-black px-2 py-1 text-center">{r.unit || '-'}</td>
                  <td className="border border-black px-2 py-1 text-right">{thousandSeparator(Number(r.opening))}</td>
                  <td className="border border-black px-2 py-1 text-right">{thousandSeparator(Number(r.issued))}</td>
                  <td className="border border-black px-2 py-1 text-right">{thousandSeparator(Number(r.balance))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="border border-black px-2 py-1 text-right" colSpan={3}>Total</td>
                <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totals.opening)}</td>
                <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totals.issued)}</td>
                <td className="border border-black px-2 py-1 text-right">{thousandSeparator(totals.balance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BranchTransferReport;
