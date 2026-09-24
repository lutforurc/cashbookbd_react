import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiDownload, FiPrinter, FiRotateCcw } from 'react-icons/fi';
import { FIELD_CHECKBOX } from '../../../theme/fieldStyles';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';
import { hasPermission } from '../../utils/permissionChecker';
import httpService from '../../services/httpService';
import {
  API_COAL3_ID_BY_L4_URL,
  API_COMPANY_SCHEME_RECEIVABLES_URL,
  API_COMPANY_SCHEME_RECEIVE_URL,
  API_COMPANY_SCHEME_RECONCILE_URL,
  API_COMPANY_SCHEME_SUMMARY_URL,
  API_COMPANY_SCHEME_MARK_URL,
  API_PRINT_TEMPLATE_URL,
} from '../../services/apiRoutes';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { Input } from '../../utils/fields/FormControls';
import SearchInput from '../../utils/fields/SearchInput';
import InputElement from '../../utils/fields/InputElement';
import Table from '../../utils/others/Table';
import FilterMenuShell from '../../utils/components/FilterMenuShell';
import { isUserFeatureEnabled } from '../../utils/userFeatureSettings';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import CompanySchemeReceivablePrint from './CompanySchemeReceivablePrint';
import { useVoucherPrint } from '../vouchers';
import { VoucherPrintRegistry } from '../vouchers/VoucherPrintRegistry';
import { toReceivableDocumentData } from './companySchemeDocumentData';
import DocumentPrint from '../../utils/print-designer/DocumentPrint';
import type { DocumentData } from '../../utils/print-designer/DocumentPrint';
import { normalizeTemplate } from '../../utils/print-designer/printTemplate';
import type { PrintTemplate } from '../../utils/print-designer/printTemplate';

type Row = {
  id: number;
  main_trx_id: number;
  imei: string;
  party_name: string | null;
  invoice_no: string;
  sale_date: string;
  product_name: string | null;
  buyer_name: string | null;
  buyer_mobile: string | null;
  sale_price: number | null;
  amount: number;
  paid: number;
  balance: number;
  due_date: string;
  days_overdue: number;
  status: 'due' | 'partial' | 'paid';
};

type Totals = { count: number; amount: number; paid: number; balance: number };
type Reconcile = { ledger_balance: number; open_total: number; difference: number };
type Summary = {
  party_coa4_id: number;
  party_name: string | null;
  count: number;
  open_total: number;
  overdue_total: number;
  ledger_balance: number;
  difference: number;
};

/** Local date. toISOString() converts to UTC, which in GMT+6 slipped a day back. */
const toIsoDate = (value: any): string => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const money = (value: number) => (Number(value) ? thousandSeparator(Number(value)) : '-');
const BANK_COA3 = 2;

const STATUSES = [
  { id: 'open', name: 'Open (not fully paid)' },
  { id: 'overdue', name: 'Overdue' },
  { id: 'paid', name: 'Paid' },
  { id: 'all', name: 'All' },
];

const METHODS = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank' },
];

/**
 * Company scheme receivables: what each brand still owes, IMEI by IMEI.
 *
 * The rows come from sales saved on the Company Scheme sale form. Ticking rows and pressing Receive writes one cash or bank receipt for
 * the brand, spread over the ticked IMEIs. The brand's statement is the
 * ordinary Ledger of its scheme account.
 */
const CompanySchemeReceivable = () => {
  const dispatch = useDispatch();
  const branchDdl = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const canReceive = hasPermission(settings?.data?.permissions, 'company.scheme.receive');
  // Due date / claim date on ticked rows: its own key, no voucher behind it.
  const canMark = hasPermission(settings?.data?.permissions, 'company.scheme.mark');
  // The user's own choice (Cash Book honours it too): filters in a menu, or inline.
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');
  const [filterOpen, setFilterOpen] = useState(false);

  const [rows, setRows] = useState<Row[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [reconcile, setReconcile] = useState<Reconcile | null>(null);
  // Every brand on one line, shown while no company is chosen.
  const [summary, setSummary] = useState<Summary[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [branchId, setBranchId] = useState(0);
  const [partyId, setPartyId] = useState(0);
  const [partyName, setPartyName] = useState('');
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');

  // receivable id -> amount typed against it
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [method, setMethod] = useState('cash');
  const [bankId, setBankId] = useState('');
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
  const [remarks, setRemarks] = useState('');
  const [receiving, setReceiving] = useState(false);
  // A lump sum to spread over the open IMEIs, oldest due first.
  const [fillAmount, setFillAmount] = useState('');
  // The last receipt taken on this screen, for its voucher print.
  const [lastReceipt, setLastReceipt] = useState<{ id: number; vr_no: string } | null>(null);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  // The date a Set Due Date / Mark Claimed puts on the ticked rows.
  const [markDate, setMarkDate] = useState<any>(new Date());
  const [marking, setMarking] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  // Print settings, as the Cash Book has them. Rows 0 = everything on one sheet.
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(10);
  const printBespoke = useReactToPrint({ contentRef: printRef, documentTitle: 'Company Scheme Receivable' });
  // The branch's own layout from the Print Designer, when one is saved. Set at
  // the click, printed once it is on the page, cleared after -- DueList's shape.
  const [designDoc, setDesignDoc] = useState<{ template: PrintTemplate; data: DocumentData } | null>(null);
  const designDocRef = useRef<HTMLDivElement>(null);
  const printDesignDoc = useReactToPrint({
    contentRef: designDocRef,
    documentTitle: 'Company Scheme Receivable',
    onAfterPrint: () => setDesignDoc(null),
  });
  useEffect(() => {
    if (!designDoc) return undefined;
    // The short wait is for the letterhead image PadPrinting loads.
    const timer = setTimeout(() => printDesignDoc(), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designDoc]);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    httpService
      .get(`${API_COAL3_ID_BY_L4_URL}${BANK_COA3}`)
      .then((res) => {
        // foundData($coaLevel3->coal4s): the ledgers are the payload itself.
        const coal4 = res?.data?.data?.data;
        const list = Array.isArray(coal4) ? coal4 : [];
        setBanks(list.map((b: any) => ({ id: String(b.id), name: b.name })));
      })
      .catch(() => setBanks([]));
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

  const load = () => {
    setLoading(true);
    setPicked({});

    httpService
      .post(API_COMPANY_SCHEME_RECEIVABLES_URL, {
        party_coa4_id: partyId || undefined,
        branch_id: branchId || undefined,
        status,
        search: search.trim() || undefined,
      })
      .then((res) => {
        if (res?.data?.success === false) {
          toast.error(res.data.message || 'The list could not be loaded.');
          setRows(null);
          return;
        }
        setRows(res?.data?.data?.data?.rows ?? []);
        setTotals(res?.data?.data?.data?.totals ?? null);
      })
      .catch(() => {
        setRows(null);
        toast.error('The list could not be loaded.');
      })
      .finally(() => setLoading(false));

    // The brand's ledger against its open IMEIs: they should agree to the paisa.
    // Both follow the branch filter, as the Ledger report reads a branch.
    const scope = { params: { branch_id: branchId || undefined } };
    if (partyId) {
      httpService
        .get(`${API_COMPANY_SCHEME_RECONCILE_URL}/${partyId}`, scope)
        .then((res) => setReconcile(res?.data?.data?.data ?? null))
        .catch(() => setReconcile(null));
    } else {
      setReconcile(null);
      httpService
        .get(API_COMPANY_SCHEME_SUMMARY_URL, scope)
        .then((res) => setSummary(res?.data?.data?.data?.rows ?? []))
        .catch(() => setSummary(null));
    }
  };

  const togglePick = (row: Row, checked: boolean) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (checked) next[row.id] = String(row.balance);
      else delete next[row.id];
      return next;
    });
  };

  /**
   * Spread a lump sum over the listed IMEIs in the order they stand -- the
   * API sorts by due date, so the oldest due fills first -- and stop when it
   * runs out. The clerk then corrects any row the brand's statement disagrees on.
   */
  const fill = () => {
    let left = Math.round((Number(fillAmount) || 0) * 100) / 100;
    if (left <= 0) return toast.info('Enter the amount the brand paid.');
    const next: Record<number, string> = {};
    for (const row of rows ?? []) {
      if (left <= 0) break;
      if (row.balance <= 0) continue;
      const take = Math.min(row.balance, left);
      next[row.id] = String(take);
      left = Math.round((left - take) * 100) / 100;
    }
    setPicked(next);
    if (left > 0) toast.info(`${thousandSeparator(left)} is more than what is open here.`);
  };

  /** Change the due date on the ticked rows. No posting moves. */
  const mark = () => {
    const ids = Object.keys(picked).map(Number);
    if (!ids.length) return toast.info('Tick at least one IMEI.');
    const date = toIsoDate(markDate);
    if (!date) return toast.info('Pick a date.');

    setMarking(true);
    httpService
      .post(API_COMPANY_SCHEME_MARK_URL, { receivable_ids: ids, due_date: date })
      .then((res) => {
        if (res?.data?.success) {
          toast.success(res.data.message || 'Updated.');
          load();
        } else {
          toast.info(res?.data?.message || res?.data?.error?.message || 'Not updated.');
        }
      })
      .catch((e) => toast.error(e?.response?.data?.message ?? 'Not updated.'))
      .finally(() => setMarking(false));
  };

  const pickedTotal = Object.values(picked).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const pickedCount = Object.keys(picked).length;

  const receive = () => {
    if (!partyId) return toast.info("Select the brand's scheme account first.");
    if (!pickedCount) return toast.info('Tick at least one IMEI.');
    if (method === 'bank' && !bankId) return toast.info('Select the bank account.');

    const allocations = Object.entries(picked).map(([id, amount]) => ({
      receivable_id: Number(id),
      amount: Number(amount) || 0,
    }));
    if (allocations.some((a) => a.amount <= 0)) return toast.info('Every ticked IMEI needs an amount above 0.');

    setReceiving(true);
    httpService
      .post(API_COMPANY_SCHEME_RECEIVE_URL, {
        party_coa4_id: partyId,
        method,
        bank_coa4_id: method === 'bank' ? Number(bankId) : undefined,
        remarks,
        allocations,
      })
      .then((res) => {
        if (res?.data?.success) {
          toast.success(res.data.message || 'Received.');
          const saved = res?.data?.data?.data;
          if (saved?.id && saved?.vr_no) setLastReceipt({ id: Number(saved.id), vr_no: String(saved.vr_no) });
          setRemarks('');
          setFillAmount('');
          load();
        } else {
          toast.info(res?.data?.message || res?.data?.error?.message || 'Not received.');
        }
      })
      .catch((e) => toast.error(e?.response?.data?.message ?? 'Not received.'))
      .finally(() => setReceiving(false));
  };

  const showPick = canReceive && Boolean(partyId) && status !== 'paid';

  const statusLabel = STATUSES.find((st) => st.id === status)?.name ?? status;
  const todayDdMmYyyy = formatDayMonthYear(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
  );

  /**
   * Print: the branch's own layout where it has saved one (Settings -> Print
   * Designer -> Company Scheme Receivable), and this screen's own paper where it has not.
   * Every failure -- none saved, server behind, connection dropped -- falls
   * through to the screen's paper. Rows and Font are the screen's, over the
   * layout; everything else is the layout's.
   */
  const handlePrint = async () => {
    let layout: any = null;
    try {
      const response = await httpService.get(`${API_PRINT_TEMPLATE_URL}/company_scheme_receivable`, {
        params: { branch_id: branchId || settings?.data?.branch?.id },
      });
      layout = response?.data?.data?.data?.layout ?? null;
    } catch {
      layout = null;
    }

    if (!layout || !(rows ?? []).length) {
      printBespoke();
      return;
    }

    const template = normalizeTemplate(layout, 'company_scheme_receivable');
    const branchName = branchId ? branchOptions.find((b) => b.id === String(branchId))?.name ?? '' : '';
    setDesignDoc({
      template: { ...template, rowsPerPage: Number(perPage), fontSize: Number(fontSize) },
      data: toReceivableDocumentData({
        rows: rows ?? [],
        totals,
        companyName: partyId ? partyName : '',
        statusLabel,
        asOf: todayDdMmYyyy,
        branchName,
      }),
    });
  };

  const reset = () => {
    setPartyId(0);
    setPartyName('');
    setBranchId(0);
    setStatus('open');
    setSearch('');
    setRows(null);
    setTotals(null);
    setReconcile(null);
    setSummary(null);
    setPicked({});
    setFillAmount('');
    setFilterOpen(false);
  };

  // `action_*` keys: the Table never lets a reader hide a column whose key
  // starts with "action", and these two hold the receive controls.
  const columns = [
    ...(showPick
      ? [
          {
            key: 'action_pick',
            header: '',
            headerClass: 'text-center w-10 print:hidden',
            cellClass: 'text-center print:hidden',
            render: (row: Row) =>
              row.balance > 0 ? (
                <Input
                  type="checkbox"
                  checked={picked[row.id] !== undefined}
                  onChange={(e: any) => togglePick(row, e.target.checked)}
                  className={FIELD_CHECKBOX}
                />
              ) : null,
          },
        ]
      : []),
    {
      key: 'invoice_no',
      header: 'Invoice',
      cellClass: 'whitespace-nowrap',
      render: (row: Row) => (
        <>
          <button
            type="button"
            className="cursor-pointer text-left hover:underline focus-visible:underline"
            title="View invoice"
            onClick={() =>
              handleVoucherPrint({ mtm_id: row.main_trx_id, vr_no: row.invoice_no })
            }
          >
            {row.invoice_no}
          </button>
          <div className="text-xs text-gray-500">{formatDayMonthYear(row.sale_date)}</div>
        </>
      ),
    },
    { key: 'imei', header: 'IMEI', cellClass: 'whitespace-nowrap font-medium' },
    { key: 'product_name', header: 'Product' },
    {
      key: 'buyer_name',
      header: 'Buyer',
      render: (row: Row) => (
        <>
          <div>{row.buyer_name}</div>
          <div className="text-xs text-gray-500">{row.buyer_mobile}</div>
        </>
      ),
    },
    ...(!partyId ? [{ key: 'party_name', header: 'Company' }] : []),
    {
      key: 'sale_price',
      header: 'Sale Price',
      headerClass: 'text-right',
      cellClass: 'text-right tabular-nums',
      render: (row: Row) => (row.sale_price === null ? '-' : money(row.sale_price)),
    },
    {
      key: 'amount',
      header: 'Receivable',
      headerClass: 'text-right',
      cellClass: 'text-right tabular-nums',
      render: (row: Row) => money(row.amount),
    },
    {
      key: 'paid',
      header: 'Received',
      headerClass: 'text-right',
      cellClass: 'text-right tabular-nums',
      render: (row: Row) => money(row.paid),
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right tabular-nums font-semibold',
      render: (row: Row) => money(row.balance),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      headerClass: 'text-center',
      cellClass: 'text-center whitespace-nowrap',
      render: (row: Row) => formatDayMonthYear(row.due_date),
    },
    {
      key: 'days_overdue',
      header: 'Overdue',
      headerClass: 'text-right',
      cellClass: 'text-right tabular-nums',
      render: (row: Row) =>
        row.days_overdue ? <span className="text-red-600">{row.days_overdue} d</span> : '-',
    },
    ...(showPick
      ? [
          {
            key: 'action_receive',
            header: 'Receive Now',
            headerClass: 'text-right print:hidden',
            cellClass: 'text-right print:hidden',
            render: (row: Row) =>
              picked[row.id] !== undefined ? (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={picked[row.id]}
                  onChange={(e: any) => setPicked((p) => ({ ...p, [row.id]: e.target.value }))}
                  className="w-28 text-right"
                />
              ) : null,
          },
        ]
      : []),
  ];

  // Totals under Receivable / Received / Balance, whatever sits to their left.
  const amountAt = columns.findIndex((c) => c.key === 'amount');
  const trailing = columns.length - amountAt - 3;
  const footerRows =
    totals && rows && rows.length > 0
      ? [
          [
            { label: `Total (${totals.count})`, colSpan: amountAt },
            { label: money(totals.amount), className: 'text-right tabular-nums' },
            { label: money(totals.paid), className: 'text-right tabular-nums' },
            { label: money(totals.balance), className: 'text-right tabular-nums' },
            ...(showPick
              ? [
                  ...(trailing > 1 ? [{ label: '', colSpan: trailing - 1 }] : []),
                  { label: money(pickedTotal), className: 'text-right tabular-nums print:hidden' },
                ]
              : trailing > 0
                ? [{ label: '', colSpan: trailing }]
                : []),
          ],
        ]
      : undefined;

  // A cleared box is "All" -- the word the Rows box shows when empty.
  const onRows = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPerPage(Number.isNaN(value) ? 0 : value);
  };
  const onFont = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(Number.isNaN(value) ? 10 : value);
  };

  // The Cash Book's toolbar: Apply, Reset, Rows, Font, Print. With the filter
  // menu on, Rows and Font carry their words above them, as there.
  const printBox = (id: string, word: string, input: React.ReactNode) =>
    useFilterMenuEnabled ? (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700 dark:text-bodydark1">
          {word}
        </label>
        {input}
      </div>
    ) : (
      <div>{input}</div>
    );
  const boxWidth = useFilterMenuEnabled ? 'w-full!' : 'w-20!';

  const buttons = (
    <>
      <ButtonLoading onClick={load} buttonLoading={loading} label="Apply" icon={<FiCheckSquare />} className="px-6" />
      <ButtonLoading onClick={reset} buttonLoading={false} label="Reset" icon={<FiRotateCcw />} className="px-4" />
      {printBox(
        'perPage',
        'Rows',
        <PrintRowsInput
          id="perPage"
          name="perPage"
          label=""
          value={perPage ? perPage.toString() : ''}
          onChange={onRows}
          type="text"
          className={`font-medium text-sm ${boxWidth} text-center`}
        />,
      )}
      {printBox(
        'fontSize',
        'Font',
        <PrintFontInput
          id="fontSize"
          name="fontSize"
          label=""
          value={fontSize.toString()}
          onChange={onFont}
          type="text"
          className={`font-medium text-sm ${boxWidth} text-center`}
        />,
      )}
      <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!rows || rows.length === 0} />
    </>
  );

  return (
    <div className="">
      <HelmetTitle title="Company Scheme Receivable" />
      <div className="py-3">
        <div className="flex flex-wrap items-end gap-3">
          <FilterMenuShell
            enabled={useFilterMenuEnabled}
            isOpen={filterOpen}
            onToggle={() => setFilterOpen((prev) => !prev)}
            menuWidthClassName="w-[min(92vw,320px)]"
            inlineClassName="grid grid-cols-1 items-end gap-3 md:grid-cols-3 xl:grid-cols-4 min-[1881px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Company (scheme account)
              </label>
              <DdlMultiline
                id="party_coa4_id"
                name="party_coa4_id"
                className=""
                placeholder="All companies"
                acType={'3'}
                value={partyId ? { value: String(partyId), label: partyName } : null}
                onSelect={(selected: any) => {
                  setPartyId(selected ? Number(selected.value) : 0);
                  setPartyName(selected?.label ?? '');
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
              <BranchDropdown
                id="branch_id"
                name="branch_id"
                className="w-full font-medium text-sm p-2 "
                branchDdl={branchOptions}
                value={String(branchId)}
                onChange={(e: any) => setBranchId(Number(e.target.value))}
              />
            </div>

            <DropdownCommon
              id="status"
              name="status"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              data={STATUSES}
            />

            {/* w-full! -- SearchInput carries its own w-50, and the two would
                otherwise fight over the width of this grid cell. */}
            <SearchInput
              id="scheme_search"
              label="IMEI / Mobile / Invoice"
              search={search}
              setSearchValue={setSearch}
              className="w-full!"
            />

            <div className={`flex gap-2 pt-1 ${useFilterMenuEnabled ? 'justify-end md:col-span-2 xl:col-span-4' : 'hidden'}`}>
              <ButtonLoading onClick={load} buttonLoading={loading} label="Apply" icon={<FiCheckSquare />} className="px-6" />
              <ButtonLoading onClick={reset} buttonLoading={false} label="Reset" icon={<FiRotateCcw />} className="px-4" />
            </div>
          </FilterMenuShell>

          <div
            className={
              useFilterMenuEnabled
                ? 'ml-auto grid grid-cols-[auto_auto_minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto] items-end gap-2'
                : 'grid min-w-max grid-cols-[auto_auto_minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto] items-end gap-2 overflow-x-auto max-md:ml-0 max-md:w-full xl:ml-auto'
            }
          >
            {buttons}
          </div>
        </div>
      </div>

      {!partyId && summary && summary.length > 0 ? (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stroke text-left dark:border-strokedark">
                <th className="py-1 pr-2">Company</th>
                <th className="py-1 pr-2 text-right">IMEIs</th>
                <th className="py-1 pr-2 text-right">Open</th>
                <th className="py-1 pr-2 text-right">Overdue</th>
                <th className="py-1 pr-2 text-right">Ledger</th>
                <th className="py-1 text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr
                  key={s.party_coa4_id}
                  className="cursor-pointer border-b border-stroke hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
                  title="Open this company"
                  onClick={() => {
                    setPartyId(s.party_coa4_id);
                    setPartyName(s.party_name ?? '');
                  }}
                >
                  <td className="py-1 pr-2">{s.party_name}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{s.count}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{money(s.open_total)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums text-red-600">{money(s.overdue_total)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{money(s.ledger_balance)}</td>
                  <td className={`py-1 text-right tabular-nums ${Math.abs(s.difference) >= 0.01 ? 'font-semibold text-amber-700' : ''}`}>
                    {Math.abs(s.difference) >= 0.01 ? money(s.difference) : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-gray-500">
            {branchId ? `${branchOptions.find((b) => b.id === String(branchId))?.name ?? 'This branch'} only` : 'All branches'}. Click a
            company to open it, then press Apply.
          </p>
        </div>
      ) : null}

      {reconcile ? (
        <p
          className={`mb-3 rounded-sm p-2 text-xs ${
            Math.abs(reconcile.difference) < 0.01
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
          }`}
        >
          Ledger balance <b>{thousandSeparator(reconcile.ledger_balance)}</b> · Open IMEIs{' '}
          <b>{thousandSeparator(reconcile.open_total)}</b> · Difference{' '}
          <b>{thousandSeparator(reconcile.difference)}</b>
          {Math.abs(reconcile.difference) >= 0.01
            ? ' -- something reached this account outside Company Scheme (an ordinary voucher, a scheme invoice edited from Electronics Sales, or a paid scheme sale deleted).'
            : ''}
        </p>
      ) : null}

      <div className="overflow-y-auto">
        {loading ? <Loader /> : ''}
        <Table
          columns={columns}
          data={rows || []}
          footerRows={footerRows}
          getRowKey={(row: Row) => row.id}
          noDataMessage={rows ? 'Nothing here.' : 'Choose a company, then press Apply.'}
        />

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <CompanySchemeReceivablePrint
            ref={printRef}
            rows={rows || []}
            totals={totals}
            companyName={partyId ? partyName : ''}
            statusLabel={statusLabel}
            asOf={todayDdMmYyyy}
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
          />
          {designDoc ? <DocumentPrint ref={designDocRef} template={designDoc.template} data={designDoc.data} /> : null}
        </div>
      </div>

      {showPick && rows && rows.length > 0 ? (
        <>
          {/* A lump sum: fill the ticks oldest-due first, then correct by hand. */}
          <div className="mt-4 grid grid-cols-1 items-end gap-3 md:grid-cols-5">
            <InputElement
              id="fill_amount"
              name="fill_amount"
              type="number"
              min={0}
              step="0.01"
              value={fillAmount}
              label="Amount the brand paid"
              placeholder="Total, to spread oldest due first"
              className="w-full"
              onChange={(e: any) => setFillAmount(e.target.value)}
            />
            <ButtonLoading onClick={fill} buttonLoading={false} label="Fill oldest first" className="whitespace-nowrap" />
          </div>

          <div className="mt-3 grid grid-cols-1 items-end gap-3 md:grid-cols-5">
            <DropdownCommon
              id="method"
              name="method"
              label="Received In"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              data={METHODS}
            />
            {method === 'bank' ? (
              <DropdownCommon
                id="bank"
                name="bank"
                label="Bank Account"
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                data={[{ id: '', name: 'Select Bank Account' }, ...banks]}
              />
            ) : (
              <div />
            )}
            <div className="md:col-span-2">
              <InputElement
                id="remarks"
                name="remarks"
                value={remarks}
                label="Remarks"
                placeholder="Cheque no, reference..."
                className="w-full"
                onChange={(e: any) => setRemarks(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <ButtonLoading
                onClick={receive}
                buttonLoading={receiving}
                label={`Receive ${pickedCount ? thousandSeparator(pickedTotal) : ''}`}
                className="whitespace-nowrap"
                icon={<FiDownload className="text-lg ml-2 mr-2" />}
              />
              {lastReceipt ? (
                <ButtonLoading
                  onClick={() => handleVoucherPrint({ mtm_id: lastReceipt.id, vr_no: lastReceipt.vr_no })}
                  buttonLoading={false}
                  label={`Print ${lastReceipt.vr_no}`}
                  className="whitespace-nowrap"
                  icon={<FiPrinter className="text-lg ml-2 mr-2" />}
                />
              ) : null}
            </div>
          </div>

          {/* Extend the ticked rows' due dates without editing the invoice. */}
          {canMark ? (
          <div className="mt-3 grid grid-cols-1 items-end gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Date for ticked IMEIs</label>
              <InputDatePicker
                setCurrentDate={setMarkDate}
                className="font-medium text-sm w-full "
                selectedDate={markDate}
                setSelectedDate={setMarkDate}
              />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-4">
              <ButtonLoading onClick={mark} buttonLoading={marking} label="Set Due Date" className="whitespace-nowrap" />
            </div>
          </div>
          ) : null}
        </>
      ) : null}

      <div className="hidden">
        <VoucherPrintRegistry ref={voucherRegistryRef} rowsPerPage={Number(perPage)} fontSize={Number(fontSize)} />
      </div>
    </div>
  );
};

export default CompanySchemeReceivable;
