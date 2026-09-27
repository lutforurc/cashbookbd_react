import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiList, FiRotateCcw } from 'react-icons/fi';
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
  API_REPORT_REFERRER_BILLS_URL,
  API_REPORT_REFERRER_SALES_URL,
} from '../../../services/apiRoutes';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import SalesReferrerPrint from './SalesReferrerPrint';
import ReferrerMasterModal from './ReferrerMasterModal';

/**
 * Who recommended a sale, and what that came to -- one screen with both halves:
 * the referrers and their totals on top, and the bills behind whichever one the
 * reader opens underneath.
 *
 * ⚠️ AN ACCOUNT ONLY. Nothing was posted to the ledger for this and nothing
 * changed on the bill; the owner keeps the list, and settles the commission
 * himself, later, on his own rate. There is no rate and no amount on this
 * screen beyond the bills' own value.
 *
 * ⚠️ THIS PAPER IS THE SHOP'S OWN. The invoice must not carry the name, and it
 * does not -- this is the sheet the commission is worked out from.
 *
 * The boxes open on the branch's transaction date: the first day of the
 * financial year it falls in to the date itself, the same as the Voucher
 * Register. Dates are filtered on `vr_date` -- the date the voucher posts on --
 * never on the manual voucher date, which is only recorded and printed.
 */

const asText = (date: any) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

/** The branch's 'DD/MM/YYYY' transaction date as a local Date, or null. */
const parseTrxDate = (said: any): Date | null => {
  const [day, month, year] = String(said ?? '').split('/');
  return day && month && year ? new Date(Number(year), Number(month) - 1, Number(day)) : null;
};

/** First day of the financial year $date falls in; startMonth is 1-12 (7 = July). */
const yearStart = (date: Date, startMonth: number) => {
  const first = startMonth - 1;
  return new Date(date.getMonth() >= first ? date.getFullYear() : date.getFullYear() - 1, first, 1);
};

/** 'YYYY-MM-DD' read by hand: handed to Date it is UTC midnight, the day before east of Greenwich. */
const parseApiDate = (said: any): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(said ?? ''));
  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

// ⚠️ THERE IS NO "No referrer" ROW any more. The report carries only the bills
// somebody brought -- the server inner-joins the referral -- so nothing here
// has to name a row that names nobody.

const SalesReferrer = ({ user }: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const fyStartMonth = Number(settings?.data?.company?.fy_start_month) || 7;

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // The referrer opened, and the bills read for it. One at a time: two open
  // lists of bills is not a screen anyone reads.
  const [openId, setOpenId] = useState<number | null>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [openLabel, setOpenLabel] = useState('');
  const [loadingBills, setLoadingBills] = useState(false);

  const [showMaster, setShowMaster] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    const payload = branchDdlData?.protectedData;

    if (!payload?.data) return;

    setDropdownData(payload.data);
    setBranchId((current) => current ?? user?.user?.branch_id ?? settings?.data?.branch?.id ?? null);

    // Year start to the transaction date, unless a date is already in the box.
    const trxDate = parseTrxDate(payload.transactionDate);
    if (trxDate) {
      setStartDate((current) => current ?? yearStart(trxDate, fyStartMonth));
      setEndDate((current) => current ?? trxDate);
    }
  }, [branchDdlData, user, settings, fyStartMonth]);

  const load = async () => {
    if (!branchId) {
      toast.info('Choose a branch first.');
      return;
    }

    setLoading(true);
    setOpenId(null);
    setBills([]);

    try {
      const response = await httpService.get(API_REPORT_REFERRER_SALES_URL, {
        params: {
          branch_id: branchId,
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
      if (!error?.toastReported) toast.error(error?.response?.data?.message || 'Could not read the referrer report.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const openBills = async (row: any) => {
    const id = Number(row?.referrer_id) || 0;

    if (openId === id) {
      setOpenId(null);
      setBills([]);
      return;
    }

    setOpenId(id);
    setBills([]);
    setOpenLabel([row?.name, row?.mobile].filter(Boolean).join(' — '));
    setLoadingBills(true);

    try {
      const response = await httpService.get(API_REPORT_REFERRER_BILLS_URL, {
        params: {
          branch_id: branchId,
          referrer_id: id,
          start_date: asText(startDate) || undefined,
          end_date: asText(endDate) || undefined,
        },
      });

      setBills(response?.data?.data?.data?.rows ?? response?.data?.data?.rows ?? []);
    } catch (error: any) {
      if (!error?.toastReported) toast.error(error?.response?.data?.message || 'Could not read those bills.');
      setOpenId(null);
    } finally {
      setLoadingBills(false);
    }
  };

  const handleReset = () => {
    const trxDate = parseTrxDate(branchDdlData?.protectedData?.transactionDate);
    setStartDate(trxDate ? yearStart(trxDate, fyStartMonth) : null);
    setEndDate(trxDate);
    setReport(null);
    setOpenId(null);
    setBills([]);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Referer',
  });

  const rows: any[] = report?.rows ?? [];

  const money = (n: any) => (Number(n) ? thousandSeparator(Number(n)) : '');
  const count = (n: any) => (Number(n) ? Number(n).toLocaleString('en-IN') : '');

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
      render: (_row: any, index: number) => index + 1,
    },
    {
      key: 'name',
      header: 'Referrer',
      render: (row: any) => (
        <span className="cursor-pointer hover:underline">
          {row.name || `#${row.referrer_id}`}
        </span>
      ),
    },
    { key: 'mobile', header: 'Mobile', cellClass: 'w-36' },
    right('bills', 'Bills', (row) => count(row.bills), 'w-24'),
    // The bill's value before discount, and the discount apart -- the Sales
    // Ledger's own reading, so the two papers tie out against each other.
    right('total', 'Bill Value', (row) => money(row.total), 'w-40'),
    right('discount', 'Discount', (row) => money(row.discount), 'w-36'),
  ];

  const billColumns = [
    {
      key: 'vr_date',
      header: 'Date',
      cellClass: 'w-28 whitespace-nowrap',
      render: (row: any) => dayjs(row.vr_date).format('DD/MM/YYYY'),
    },
    { key: 'vr_no', header: 'Voucher#', cellClass: 'w-32 whitespace-nowrap' },
    { key: 'customer', header: 'Customer' },
    right('total', 'Bill Value', (row: any) => money(row.total), 'w-40'),
    right('discount', 'Discount', (row: any) => money(row.discount), 'w-36'),
  ];

  // The grand total is summed from the rows on screen rather than asked of the
  // API: a second query could only disagree with the list above it.
  const grand = rows.reduce(
    (sum: any, row: any) => ({
      bills: Number(sum.bills) + Number(row.bills || 0),
      total: Number(sum.total) + Number(row.total || 0),
      discount: Number(sum.discount) + Number(row.discount || 0),
    }),
    { bills: 0, total: 0, discount: 0 },
  );

  // The "Who recommended a sale" caption and the date range used to ride above
  // the headings as a row of their own; the owner read them as a line of the
  // report and had them taken off. The range is not lost -- the two date boxes
  // above the table say it -- and the paper says it on its own sheet.
  const headerRows = report
    ? [
        // headerRows REPLACES the column headings, so they are named here.
        columns.map((c) => ({ label: c.header, className: c.headerClass })),
      ]
    : [];

  const footerRows = report
    ? [
        [
          { label: 'Total', className: 'text-right font-semibold', colSpan: 3 },
          ...columns.slice(3).map((c) => ({
            label: c.render(grand),
            className: 'text-right font-semibold',
          })),
        ],
      ]
    : [];

  if (!dropdownData.length) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Referer" />

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
          {/* The list itself: the owner asked for it here rather than on a
              screen of its own. */}
          <ButtonLoading
            onClick={() => setShowMaster(true)}
            buttonLoading={false}
            label="Referrers"
            icon={<FiList />}
            className="px-4"
          />
          <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!report} />
        </div>
      </div>

      <div className="overflow-y-auto">
        {loading ? <Loader /> : null}

        <Table
          columns={columns}
          data={rows}
          headerRows={headerRows}
          footerRows={footerRows}
          getRowKey={(row: any) => row.referrer_id}
          onRowClick={openBills}
          rowClassName={(row: any) => (Number(row.referrer_id) === openId ? 'font-semibold' : '')}
          noDataMessage="Choose a branch, then press Apply."
          renderRowExpansion={(row: any) =>
            Number(row.referrer_id) === openId ? (
              <div className="px-2 py-2">
                {loadingBills ? (
                  <Loader />
                ) : (
                  <Table
                    columns={billColumns}
                    data={bills}
                    getRowKey={(b: any) => b.id}
                    noDataMessage="No bills under this referrer."
                  />
                )}
              </div>
            ) : null
          }
        />
      </div>

      <div className="hidden">
        <SalesReferrerPrint
          ref={printRef}
          report={{ ...report, grand }}
          columns={columns}
          bills={bills}
          billColumns={billColumns}
          openLabel={openLabel}
        />
      </div>

      <ReferrerMasterModal
        isOpen={showMaster}
        onClose={() => setShowMaster(false)}
        onChanged={load}
      />
    </div>
  );
};

export default SalesReferrer;
