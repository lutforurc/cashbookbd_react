import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiRotateCcw } from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';
import httpService from '../../services/httpService';
import { API_COMPANY_SCHEME_RECEIPTS_URL, API_PRINT_TEMPLATE_URL } from '../../services/apiRoutes';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import Table from '../../utils/others/Table';
import FilterMenuShell from '../../utils/components/FilterMenuShell';
import { isUserFeatureEnabled } from '../../utils/userFeatureSettings';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import CompanySchemeReceiptsPrint from './CompanySchemeReceiptsPrint';
import { useVoucherPrint } from '../vouchers';
import { VoucherPrintRegistry } from '../vouchers/VoucherPrintRegistry';
import { toReceiptsDocumentData } from './companySchemeDocumentData';
import DocumentPrint from '../../utils/print-designer/DocumentPrint';
import type { DocumentData } from '../../utils/print-designer/DocumentPrint';
import { normalizeTemplate } from '../../utils/print-designer/printTemplate';
import type { PrintTemplate } from '../../utils/print-designer/printTemplate';

type Receipt = {
  voucher_id: number;
  vr_no: string;
  vr_date: string;
  method: 'cash' | 'bank';
  party_name: string | null;
  note: string | null;
  amount: number;
  lines: { imei: string; product_name: string | null; invoice_no: string; amount: number }[];
};

/** Local date. toISOString() converts to UTC, which in GMT+6 slipped a day back. */
const toIsoDate = (value: any): string => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * What the brands paid, day by day: each receipt voucher and the IMEIs it
 * paid for. Deleted receipts are not shown.
 */
const CompanySchemeReceipts = () => {
  const dispatch = useDispatch();
  const branchDdl = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  // The user's own choice (Cash Book honours it too): filters in a menu, or inline.
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');
  const [filterOpen, setFilterOpen] = useState(false);

  const [rows, setRows] = useState<Receipt[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [branchId, setBranchId] = useState(0);
  const [partyId, setPartyId] = useState(0);
  const [partyName, setPartyName] = useState('');
  const [startDate, setStartDate] = useState<any>(new Date());
  const [endDate, setEndDate] = useState<any>(new Date());

  const printRef = useRef<HTMLDivElement>(null);
  // Print settings, as the Cash Book has them. Rows 0 = everything on one sheet.
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(10);
  const printBespoke = useReactToPrint({ contentRef: printRef, documentTitle: 'Company Scheme Receipts' });
  // One receipt voucher on its own paper, from its number in the table.
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  // The branch's own layout from the Print Designer, when one is saved. Set at
  // the click, printed once it is on the page, cleared after -- DueList's shape.
  const [designDoc, setDesignDoc] = useState<{ template: PrintTemplate; data: DocumentData } | null>(null);
  const designDocRef = useRef<HTMLDivElement>(null);
  const printDesignDoc = useReactToPrint({
    contentRef: designDocRef,
    documentTitle: 'Company Scheme Receipts',
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
    const from = toIsoDate(startDate);
    const to = toIsoDate(endDate);
    if (!from || !to) return toast.error('Give a date range.');
    if (from > to) return toast.error('The start date cannot be after the end date.');

    setLoading(true);
    httpService
      .post(API_COMPANY_SCHEME_RECEIPTS_URL, {
        from_date: from,
        to_date: to,
        party_coa4_id: partyId || undefined,
        branch_id: branchId || undefined,
      })
      .then((res) => {
        if (res?.data?.success === false) {
          toast.error(res.data.message || 'The list could not be loaded.');
          setRows(null);
          return;
        }
        setRows(res?.data?.data?.data?.rows ?? []);
        setTotal(Number(res?.data?.data?.data?.total ?? 0));
      })
      .catch(() => {
        setRows(null);
        toast.error('The list could not be loaded.');
      })
      .finally(() => setLoading(false));
  };

  const reset = () => {
    setPartyId(0);
    setPartyName('');
    setBranchId(0);
    setStartDate(new Date());
    setEndDate(new Date());
    setRows(null);
    setTotal(0);
    setFilterOpen(false);
  };

  // One row per IMEI. The Table cannot merge cells, so a voucher's date,
  // number and company stand on its first IMEI only -- the lines under it read
  // as belonging to it, the way the merged cells used to show.
  const lines = (rows ?? []).flatMap((receipt, voucherIndex) =>
    receipt.lines.map((line, index) => ({
      ...line,
      key: `${receipt.vr_no}-${index}`,
      first: index === 0,
      sl: voucherIndex + 1,
      voucher_id: receipt.voucher_id,
      vr_no: receipt.vr_no,
      vr_date: receipt.vr_date,
      method: receipt.method,
      party_name: receipt.party_name,
      voucher_amount: receipt.amount,
    })),
  );

  /**
   * Print: the branch's own layout where it has saved one (Settings -> Print
   * Designer -> Company Scheme Receipts), and this screen's own paper where it has not.
   * Every failure -- none saved, server behind, connection dropped -- falls
   * through to the screen's paper. Rows and Font are the screen's, over the
   * layout; everything else is the layout's.
   */
  const handlePrint = async () => {
    let layout: any = null;
    try {
      const response = await httpService.get(`${API_PRINT_TEMPLATE_URL}/company_scheme_receipts`, {
        params: { branch_id: branchId || settings?.data?.branch?.id },
      });
      layout = response?.data?.data?.data?.layout ?? null;
    } catch {
      layout = null;
    }

    if (!layout || !lines.length) {
      printBespoke();
      return;
    }

    const template = normalizeTemplate(layout, 'company_scheme_receipts');
    const branchName = branchId ? branchOptions.find((b) => b.id === String(branchId))?.name ?? '' : '';
    setDesignDoc({
      template: { ...template, rowsPerPage: Number(perPage), fontSize: Number(fontSize) },
      data: toReceiptsDocumentData({
        lines,
        startDate: formatDayMonthYear(toIsoDate(startDate)),
        endDate: formatDayMonthYear(toIsoDate(endDate)),
        companyName: partyId ? partyName : '',
        branchName,
      }),
    });
  };

  const columns = [
    {
      key: 'vr_date',
      header: 'Date',
      headerClass: 'text-center',
      cellClass: 'text-center whitespace-nowrap',
      render: (row: any) => (row.first ? formatDayMonthYear(row.vr_date) : ''),
    },
    {
      key: 'vr_no',
      header: 'Voucher',
      cellClass: 'whitespace-nowrap',
      render: (row: any) =>
        row.first ? (
          <>
            <div
              className="cursor-pointer hover:underline print:no-underline"
              title="Print this voucher"
              onClick={() => handleVoucherPrint({ mtm_id: row.voucher_id, vr_no: row.vr_no })}
            >
              {row.vr_no}
            </div>
            <div className="text-xs uppercase text-gray-500">
              {row.method} · {thousandSeparator(row.voucher_amount)}
            </div>
          </>
        ) : null,
    },
    {
      key: 'party_name',
      header: 'Company',
      render: (row: any) => (row.first ? row.party_name : ''),
    },
    { key: 'imei', header: 'IMEI', cellClass: 'whitespace-nowrap font-medium' },
    { key: 'product_name', header: 'Product' },
    { key: 'invoice_no', header: 'Invoice', cellClass: 'whitespace-nowrap' },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right',
      cellClass: 'text-right tabular-nums',
      render: (row: any) => thousandSeparator(row.amount),
    },
  ];

  const footerRows =
    lines.length > 0
      ? [[{ label: 'Total', colSpan: columns.length - 1 }, { label: thousandSeparator(total), className: 'text-right tabular-nums' }]]
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
      <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={lines.length === 0} />
    </>
  );

  return (
    <div className="">
      <HelmetTitle title="Company Scheme Receipts" />
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

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
              <InputDatePicker
                setCurrentDate={setStartDate}
                className="font-medium text-sm w-full "
                selectedDate={startDate}
                setSelectedDate={setStartDate}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
              <InputDatePicker
                setCurrentDate={setEndDate}
                className="font-medium text-sm w-full "
                selectedDate={endDate}
                setSelectedDate={setEndDate}
              />
            </div>

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

      <div className="overflow-y-auto">
        {loading ? <Loader /> : ''}
        {rows ? (
          <p className="mb-2 text-center text-sm">
            {formatDayMonthYear(toIsoDate(startDate))} — {formatDayMonthYear(toIsoDate(endDate))}
          </p>
        ) : null}
        <Table
          columns={columns}
          data={lines}
          footerRows={footerRows}
          getRowKey={(row: any) => row.key}
          noDataMessage={rows ? 'No receipt in this range.' : 'Choose a date range, then press Apply.'}
        />

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <CompanySchemeReceiptsPrint
            ref={printRef}
            lines={lines}
            total={total}
            startDate={formatDayMonthYear(toIsoDate(startDate))}
            endDate={formatDayMonthYear(toIsoDate(endDate))}
            rowsPerPage={Number(perPage)}
            fontSize={Number(fontSize)}
          />
          {designDoc ? <DocumentPrint ref={designDocRef} template={designDoc.template} data={designDoc.data} /> : null}
          <VoucherPrintRegistry ref={voucherRegistryRef} rowsPerPage={Number(perPage)} fontSize={Number(fontSize)} />
        </div>
      </div>
    </div>
  );
};

export default CompanySchemeReceipts;
