import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { FiExternalLink, FiPrinter, FiX } from 'react-icons/fi';
import httpService from '../../services/httpService';
import { API_REPORT_LEDGER_URL } from '../../services/apiRoutes';
import routes from '../../services/appRoutes';
import Table from '../../utils/others/Table';
import InputDatePicker from '../../utils/fields/DatePicker';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import formatDate from '../../utils/utils-functions/formatDate';
import { generateTableData } from '../../utils/utils-functions/generateTableData';
import { trxDateToDate } from '../../utils/utils-functions/transactionDate';
import { branchNumber } from '../../utils/userFeatureSettings';
import LedgerPrint from '../reports/ledger/LedgerPrint';
import { Button } from '../../../pages/UiElements/CustomButtons';

type Props = {
  /** The row from List Customers -- read for its `coa4_id` and its name. */
  party: any;
  onClose: () => void;
};

/**
 * One party's vouchers over a window, opened from the Action column of List
 * Customers.
 *
 * ⚠️ IT IS THE LEDGER'S OWN ENDPOINT AND ITS OWN MAPPER. `reports/api-ledger`
 * answers one account's `opening_balance` and `details` for a date range, and
 * `generateTableData` turns that into the rows -- opening first, running balance
 * and all -- that the Ledger screen draws. Building a second statement here
 * would be a second set of rules about what a party's balance is, and the two
 * would drift.
 *
 * ⚠️ AND NO `branch_id` IS SENT. `branchScope(null)` answers with every branch
 * in reach, which is the same set the Balance column on the list is summed
 * over, so the closing figure here agrees with the figure the list shows. Send
 * a branch and the two part company the moment a branch shares its parties.
 * (Send the *string* "null" and the request is refused outright -- the API
 * filters empty branch ids, but "null" survives the filter and becomes 0.)
 */
const PartyLedgerModal: React.FC<Props> = ({ party, onClose }) => {
  const settings = useSelector((state: any) => state.settings);
  const navigate = useNavigate();

  /**
   * The window opens on the branch's transaction date and runs back the number
   * of days Branch Setup asks for. Not today's date: the books stay open on the
   * transaction date until day close advances it, so a report anchored to the
   * wall clock would disagree with the Ledger screen for every branch that is
   * behind -- which is the usual state of affairs, not an edge case.
   */
  const days = branchNumber(settings, 'default_report_days', 30);
  const [endDate, setEndDate] = useState<Date>(
    () => trxDateToDate(settings?.data?.trx_dt) ?? new Date(),
  );
  const [startDate, setStartDate] = useState<Date>(() =>
    dayjs(endDate).subtract(days - 1, 'day').toDate(),
  );

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!party?.coa4_id) return;

    // A second date picked while the first is still in flight would otherwise
    // let the slower answer land last, and the table would then show one window
    // under another window's dates.
    let cancelled = false;

    setLoading(true);
    setError('');

    httpService
      .get(API_REPORT_LEDGER_URL, {
        params: {
          ledger_id: party.coa4_id,
          start_date: dayjs(startDate).format('YYYY-MM-DD'),
          end_date: dayjs(endDate).format('YYYY-MM-DD'),
        },
      })
      .then((res) => {
        if (cancelled) return;
        setRows(generateTableData(res.data?.data?.data));
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setError('Could not load the transactions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [party?.coa4_id, startDate, endDate]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Ledger',
  });

  const openFullLedger = () =>
    navigate(routes.report_ledger, {
      state: {
        ledgerAccount: {
          ledgerId: party.coa4_id,
          label: party.name,
          // Carried across so the bigger screen opens on the window being read
          // here rather than on whatever it last remembered.
          startDate: dayjs(startDate).format('YYYY-MM-DD'),
          endDate: dayjs(endDate).format('YYYY-MM-DD'),
        },
      },
    });

  // The same seven columns, in the same order and with the same wording, as the
  // Ledger screen -- a row read here has to be findable there.
  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      width: '70px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => row.sl_number || '',
    },
    {
      key: 'vr_date',
      header: 'Vr Date',
      width: '95px',
      render: (row: any) => (row.vr_date ? formatDate(row.vr_date) : ''),
    },
    {
      key: 'vr_no',
      header: 'Vr No',
      width: '95px',
      render: (row: any) => row.vr_no || '',
    },
    {
      key: 'name',
      header: 'Description',
      render: (row: any) => (
        <>
          {/* Opening, Range Total, Total and Balance carry no voucher number;
              they are the sheet's own arithmetic and read as such. */}
          <p className={row.vr_no ? '' : 'font-semibold'}>{row.name}</p>
          {row.remarks && row.remarks !== '-' && (
            <div className="block text-sm whitespace-normal wrap-break-word text-gray-500">
              {row.remarks}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'debit',
      header: 'Debit',
      width: '120px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        row.debit > 0 ? thousandSeparator(Number(row.debit)) : '-',
    },
    {
      key: 'credit',
      header: 'Credit',
      width: '120px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        row.credit > 0 ? thousandSeparator(Number(row.credit)) : '-',
    },
    {
      key: 'running_balance',
      header: 'Balance',
      width: '130px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) =>
        row.running_balance === '' || row.running_balance === undefined
          ? '-'
          : thousandSeparator(Number(row.running_balance)),
    },
  ];

  const range = `${dayjs(startDate).format('DD/MM/YYYY')} — ${dayjs(endDate).format('DD/MM/YYYY')}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-3 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[1000px] flex-col rounded-lg border border-[rgb(var(--c-border))] bg-white shadow-xl dark:bg-graydark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--c-border))] px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold uppercase">
              {party?.name || 'Transactions'}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {range} · last {days} days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              title="Print"
              onClick={handlePrint}
              disabled={loading || !!error || rows.length === 0}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:text-white"
            >
              <FiPrinter size={15} />
            </Button>
            <Button
              title="Open the full ledger"
              onClick={openFullLedger}
              className="flex items-center gap-1.5 text-teal-600 hover:text-teal-800"
            >
              <FiExternalLink size={15} />
            </Button>
            <Button
              title="Close"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              <FiX size={16} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-[rgb(var(--c-border))] px-4 py-2 sm:grid-cols-4">
          <InputDatePicker
            id="party_ledger_start"
            label="From"
            selectedDate={startDate}
            setSelectedDate={setStartDate}
            setCurrentDate={setStartDate}
          />
          <InputDatePicker
            id="party_ledger_end"
            label="To"
            selectedDate={endDate}
            setSelectedDate={setEndDate}
            setCurrentDate={setEndDate}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {loading && (
            <p className="py-8 text-center text-gray-500">Loading…</p>
          )}
          {!loading && error && (
            <p className="py-8 text-center text-red-600">{error}</p>
          )}
          {!loading && !error && (
            /* No perPage: a popup wants the whole window on one sheet, not a
               second paginator to page through. */
            <Table columns={columns} data={rows} />
          )}
        </div>

        <div className="border-t border-[rgb(var(--c-border))] px-4 py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The closing Balance is the state at the To date. Pull the To date
            back and it will differ from the Balance on the list, which counts
            every voucher up to the branch's transaction date.
          </p>
        </div>

        {/* Printed through the Ledger's own sheet, so a party's paper is the
            same paper whichever screen it was asked for from. Hidden on screen;
            react-to-print clones it into a frame of its own. */}
        <div className="hidden">
          <LedgerPrint
            ref={printRef}
            rows={rows}
            startDate={dayjs(startDate).format('DD/MM/YYYY')}
            endDate={dayjs(endDate).format('DD/MM/YYYY')}
            title="Ledger"
            coal4={party}
          />
        </div>
      </div>
    </div>
  );
};

export default PartyLedgerModal;
