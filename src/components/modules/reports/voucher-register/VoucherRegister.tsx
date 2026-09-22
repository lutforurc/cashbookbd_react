import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiRotateCcw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';

import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import httpService from '../../../services/httpService';
import {
  API_REPORT_VOUCHER_REGISTER_URL,
  API_REPORT_VOUCHER_REGISTER_VOUCHERS_URL,
  API_VOUCHER_TYPE_URL,
} from '../../../services/apiRoutes';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { Select } from '../../../utils/fields/FormControls';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import { useVoucherPrint } from '../../vouchers';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';

/**
 * Tally's Voucher Monthly Register: every voucher type together, or one, month
 * by month, how many were written and how many of those were cancelled. A
 * month opens to the vouchers behind its count; a voucher number opens the
 * voucher.
 *
 * The boxes open on the branch's transaction date: the 1st of its month to
 * the date itself, the way every other report here opens. Cleared by hand,
 * the API answers with the year that date falls in and the boxes are filled
 * from what it answered, so what is on screen is always the range counted.
 */

/** Empty type id: the API counts every type together. */
const ALL_TYPES = '';

const asText = (date: any) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

/** The branch's 'DD/MM/YYYY' transaction date as a local Date, or null. */
const parseTrxDate = (said: any): Date | null => {
  const [day, month, year] = String(said ?? '').split('/');
  return day && month && year ? new Date(Number(year), Number(month) - 1, Number(day)) : null;
};

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

/** 'YYYY-MM-DD' read by hand: handed to Date it is UTC midnight, the day before east of Greenwich. */
const parseApiDate = (said: any): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(said ?? ''));
  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const VoucherRegister = ({ user }: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [voucherTypeId, setVoucherTypeId] = useState<string>(ALL_TYPES);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // The month opened, and the vouchers read for it. One at a time: the paper
  // register drills into one month, and two open lists of 400 rows each is
  // not a register anyone reads.
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());

    httpService
      .post(API_VOUCHER_TYPE_URL, {})
      .then((res) => setVoucherTypes(res?.data?.data?.data ?? res?.data?.data ?? []))
      .catch(() => toast.error('Could not read the voucher types.'));
  }, [dispatch]);

  useEffect(() => {
    const payload = branchDdlData?.protectedData;

    if (!payload?.data) return;

    setDropdownData(payload.data);
    setBranchId((current) => current ?? user?.user?.branch_id ?? settings?.data?.branch?.id ?? null);

    // First of the month to the transaction date, unless a date is already in
    // the box — the branch list can arrive again after the user has typed.
    const trxDate = parseTrxDate(payload.transactionDate);
    if (trxDate) {
      setStartDate((current) => current ?? monthStart(trxDate));
      setEndDate((current) => current ?? trxDate);
    }
  }, [branchDdlData, user, settings]);

  const load = async () => {
    if (!branchId) {
      toast.info('Choose a branch first.');
      return;
    }

    setLoading(true);
    setOpenMonth(null);
    setVouchers([]);

    try {
      const response = await httpService.get(API_REPORT_VOUCHER_REGISTER_URL, {
        params: {
          branch_id: branchId,
          voucher_type_id: voucherTypeId,
          start_date: asText(startDate) || undefined,
          end_date: asText(endDate) || undefined,
        },
      });

      const data = response?.data?.data?.data ?? response?.data?.data ?? null;

      setReport(data);

      // The range actually counted, back into the boxes.
      if (data?.from && !startDate) setStartDate(parseApiDate(data.from));
      if (data?.to && !endDate) setEndDate(parseApiDate(data.to));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the voucher register.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const openMonthRows = async (month: string) => {
    if (openMonth === month) {
      setOpenMonth(null);
      setVouchers([]);
      return;
    }

    setOpenMonth(month);
    setVouchers([]);
    setLoadingMonth(true);

    try {
      const response = await httpService.get(API_REPORT_VOUCHER_REGISTER_VOUCHERS_URL, {
        params: { branch_id: branchId, voucher_type_id: voucherTypeId, month },
      });

      setVouchers(response?.data?.data?.data?.rows ?? []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read that month.');
      setOpenMonth(null);
    } finally {
      setLoadingMonth(false);
    }
  };

  const handleReset = () => {
    const trxDate = parseTrxDate(branchDdlData?.protectedData?.transactionDate);
    setStartDate(trxDate ? monthStart(trxDate) : null);
    setEndDate(trxDate);
    setVoucherTypeId(ALL_TYPES);
    setReport(null);
    setOpenMonth(null);
    setVouchers([]);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Voucher Register',
  });

  const months: any[] = report?.months ?? [];

  // A cash register has no quantities; the qty columns only appear when one
  // month moved stock.
  const hasQty = months.some((m: any) => Number(m.purchase_qty) || Number(m.sales_qty));

  const count = (n: any) => (Number(n) ? String(n) : '');
  const money = (n: any) => (Number(n) ? thousandSeparator(Number(n)) : '');

  const right = (key: string, header: string, cell: (row: any) => any, width = 'w-32') => ({
    key,
    header,
    headerClass: 'text-right',
    cellClass: `${width} text-right`,
    render: cell,
  });

  const columns = [
    {
      key: 'sl',
      header: 'Sl No.',
      cellClass: 'w-20 whitespace-nowrap',
      render: (row: any) => row.sl,
    },
    {
      key: 'label',
      header: 'Particulars',
      render: (row: any) => (
        <span className={row.total || row.cancelled ? 'cursor-pointer hover:underline' : ''}>
          {row.label}
        </span>
      ),
    },
    right('total', 'Total Vouchers', (row) => count(row.total), 'w-36'),
    ...(hasQty
      ? [
          right('purchase_qty', 'Total Purchase Qty', (row) => money(row.purchase_qty), 'w-40'),
          right('sales_qty', 'Total Sales Qty', (row) => money(row.sales_qty), 'w-36'),
        ]
      : []),
    right('amount', 'Total Amount', (row) => money(row.amount), 'w-40'),
    right('cancelled', '(cancelled)', (row) => count(row.cancelled)),
  ];

  const voucherColumns = [
    {
      key: 'vr_date',
      header: 'Date',
      cellClass: 'w-28 whitespace-nowrap',
      render: (row: any) => dayjs(row.vr_date).format('DD/MM/YYYY'),
    },
    {
      key: 'vr_no',
      header: 'Voucher#',
      cellClass: 'w-32 whitespace-nowrap',
      render: (row: any) => (
        <span
          className="cursor-pointer hover:underline"
          onClick={() => handleVoucherPrint({ ...row, mtm_id: row.mtm_id })}
        >
          {row.vr_no}
        </span>
      ),
    },
    { key: 'particulars', header: 'Particulars' },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right',
      cellClass: 'w-32 text-right',
      render: (row: any) => (Number(row.amount) ? thousandSeparator(Number(row.amount)) : ''),
    },
    {
      key: 'status',
      header: '',
      cellClass: 'w-24',
      render: (row: any) => (Number(row.status) === 1 ? '' : <span className="text-red-500">Cancelled</span>),
    },
  ];

  // headerRows REPLACES the column headings, so the title block is followed
  // by a row that names the columns. The branch is not in the title: the
  // page is already headed with it.
  const headerRows = report
    ? [
        [
          {
            label: (
              <div className="text-center font-normal">
                <div className="italic">{report.voucher_type?.name}</div>
                <div>
                  {dayjs(report.from).format('D-MMM-YYYY')} to {dayjs(report.to).format('D-MMM-YYYY')}
                </div>
              </div>
            ),
            colSpan: columns.length,
          },
        ],
        // The column headings, in the columns' own order.
        columns.map((c) => ({ label: c.header, className: c.headerClass })),
      ]
    : [];

  const footerRows = report
    ? [
        [
          { label: 'Total', className: 'text-right font-semibold', colSpan: 2 },
          // One cell per counted column, in the columns' own order.
          ...columns.slice(2).map((c) => ({
            label: c.render(report.grand ?? {}),
            className: 'text-right font-semibold',
          })),
        ],
      ]
    : [];

  if (!dropdownData.length) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Voucher Register" />

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Branch
            </label>
            <BranchDropdown
              defaultValue={user?.user?.branch_id}
              value={branchId == null ? '' : String(branchId)}
              onChange={(e: any) => setBranchId(e.target.value)}
              className="w-full p-2 text-sm font-medium"
              branchDdl={dropdownData}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Voucher Type
            </label>
            <Select
              className={`${FIELD_SELECT} w-full px-2 text-sm font-medium`}
              value={voucherTypeId}
              onChange={(event) => setVoucherTypeId(event.target.value)}
            >
              <option value={ALL_TYPES}>All Voucher Types</option>
              {voucherTypes.map((type: any) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Start Date
            </label>
            <InputDatePicker
              className="w-full text-sm font-medium"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
              setCurrentDate={setStartDate}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              End Date
            </label>
            <InputDatePicker
              className="w-full text-sm font-medium"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
              setCurrentDate={setEndDate}
            />
          </div>
        </div>

        <div className="flex items-end gap-2 xl:ml-auto">
          <ButtonLoading
            onClick={load}
            buttonLoading={loading}
            label="Apply"
            icon={<FiCheckSquare />}
            className="px-6"
          />
          <ButtonLoading
            onClick={handleReset}
            buttonLoading={false}
            label="Reset"
            icon={<FiRotateCcw />}
            className="px-4"
          />
          <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!report} />
        </div>
      </div>

      <div ref={printRef} className="overflow-y-auto">
        {loading ? <Loader /> : null}

        <Table
          columns={columns}
          data={months}
          headerRows={headerRows}
          footerRows={footerRows}
          getRowKey={(row: any) => row.month}
          onRowClick={(row: any) => (row.total || row.cancelled) && openMonthRows(row.month)}
          rowClassName={(row: any) => (row.month === openMonth ? 'font-semibold' : '')}
          noDataMessage="Choose a branch, then press Apply."
          renderRowExpansion={(row: any) =>
            row.month === openMonth ? (
              <div className="px-2 py-2">
                {loadingMonth ? (
                  <Loader />
                ) : (
                  <Table
                    columns={voucherColumns}
                    data={vouchers}
                    getRowKey={(v: any) => v.mtm_id}
                    rowClassName={(v: any) => (Number(v.status) === 1 ? '' : 'line-through opacity-60')}
                    noDataMessage="No vouchers in this month."
                  />
                )}
              </div>
            ) : null
          }
        />
      </div>

      <div className="hidden">
        <VoucherPrintRegistry ref={voucherRegistryRef} rowsPerPage={0} fontSize={10} />
      </div>
    </div>
  );
};

export default VoucherRegister;
