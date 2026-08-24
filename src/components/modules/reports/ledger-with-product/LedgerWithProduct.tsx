import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import Loader from '../../../../common/Loader';
import InputDatePicker from '../../../utils/fields/DatePicker';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatMobile, useMobileFormat } from '../../../utils/utils-functions/mobileFormat';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import Table from '../../../utils/others/Table';
import { useHighlightRules } from '../../../utils/highlight/useHighlightRules';
import { matchHighlightRule, highlightLineClass } from '../../../utils/highlight/highlightRules';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import {
  clearCustomerSupplierStatement,
  fetchCustomerSupplierStatement,
} from './ledgerWithProductSlice';
import LedgerWithProductPrint from './LedgerWithProductPrint';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import { FiCheckSquare, FiDownload, FiFilter, FiRotateCcw } from 'react-icons/fi';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';
import TransactionTypes from '../../../utils/utils-functions/TransactionTypes';
import type {
  LedgerWithProductReportData,
  LedgerWithProductRow,
  LedgerWithProductSummary,
} from './ledgerWithProductTypes';
import {
  buildRowsWithRunningBalance,
  getBalanceCreditValue,
  getBalanceDebitValue,
  getPurchaseAmount,
  getPurchaseQty,
  getSalesAmount,
  getSalesQty,
  parseAmount,
  shouldShowZeroProductAmountMark,
  isZeroAmount,
} from './ledgerWithProductUtils';

const formatAmountOrZeroMark = (value: unknown) =>
  isZeroAmount(value) ? '-' : thousandSeparator(value);

const joinedZeroMarkClass =
  'block -mx-3 border-red-600 px-3 leading-5 text-red-600';

const numberControlClass =
  'font-medium text-sm h-10 w-20! text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const escapeExcelHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const excelCell = (
  value: unknown,
  tag: 'td' | 'th' = 'td',
  align: 'left' | 'right' | 'center' = 'left',
  extraStyle = '',
) =>
  `<${tag} style="border:.5pt solid rgb(var(--c-gray-300));padding:3px;text-align:${align};vertical-align:top;${extraStyle}">${escapeExcelHtml(
    value,
  )}</${tag}>`;

const downloadExcelHtml = (html: string, filename: string) => {
  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const LedgerWithProduct = (user: any) => {
  const dispatch = useDispatch();
  const highlightRules = useHighlightRules();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const statementState: any = useSelector(
    (state: any) => state.customerSupplierStatement,
  );
  const settings = useSelector((state: any) => state.settings);
  const mobileFormat = useMobileFormat();
  const useFilterMenuEnabled = isUserFeatureEnabled(
    settings,
    'use_filter_parameter',
  );

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [defaultBranchId, setDefaultBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [defaultStartDate, setDefaultStartDate] = useState<Date | null>(null);
  const [defaultEndDate, setDefaultEndDate] = useState<Date | null>(null);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partyLabel, setPartyLabel] = useState<string>('');
  const [ledgerSelectKey, setLedgerSelectKey] = useState(0);
  const [productId, setProductId] = useState<number | null>(null);
  const [selectedProductOption, setSelectedProductOption] = useState<any>(null);
  const [transactionType, setTransactionType] = useState('');
  // Empty by default, which now means the sheet decides how many rows it
  // holds. Ten was set for the tallest row a ledger can carry -- three
  // lines of description -- so a statement of one-line entries printed a
  // third of a page and ran to twenty-four sheets.
  const [rowsPerPage, setRowsPerPage] = useState<string>('');
  const [fontSize, setFontSize] = useState<string>('10');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('Notice');
  const [modalMessage, setModalMessage] = useState<React.ReactNode>('');

  const printRef = useRef<HTMLDivElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);

  const openMessageModal = (title: string, message: React.ReactNode) => {
    setModalTitle(title);
    setModalMessage(message);
    setShowMessageModal(true);
  };

  const focusNextField = (nextFieldId: string) => {
    setTimeout(() => {
      document.getElementById(nextFieldId)?.focus();
    }, 0);
  };

  const handleSelectChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setTransactionType(event.target.value);
  };

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    const userBranchId = Number(user?.user?.branch_id) || null;
    setBranchId(userBranchId);
    setDefaultBranchId(userBranchId);
  }, []);

  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;

    if (Array.isArray(protectedData?.data)) {
      setDropdownData(protectedData.data);
    }

    if (protectedData?.transactionDate) {
      const [day, month, year] = protectedData.transactionDate.split('/');
      const parsedEndDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
      );
      const parsedStartDate = new Date(Number(year), Number(month) - 1, 1);
      setStartDate(parsedStartDate);
      setEndDate(parsedEndDate);
      setDefaultStartDate(parsedStartDate);
      setDefaultEndDate(parsedEndDate);
    }
  }, [branchDdlData?.protectedData]);

  const reportData: LedgerWithProductReportData = statementState?.data || {};
  const rawRows: LedgerWithProductRow[] = Array.isArray(reportData?.rows) ? reportData.rows : [];
  const rawSummary: LedgerWithProductSummary = reportData?.summary || {};
  const party = reportData?.party || {};

  const rows = useMemo(
    () => buildRowsWithRunningBalance(rawRows, rawSummary),
    [rawRows, rawSummary],
  );

  const summary = useMemo(
    () => ({
      ...rawSummary,
      qty: rows.reduce(
        (sum: number, row: any) => sum + Number(row?.quantity || 0),
        0,
      ),
      purchase_qty: rows.reduce(
        (sum: number, row: any) => sum + getPurchaseQty(row),
        0,
      ),
      sales_qty: rows.reduce(
        (sum: number, row: any) => sum + getSalesQty(row),
        0,
      ),
      purchase_amt: rows.reduce(
        (sum: number, row: any) => sum + getPurchaseAmount(row),
        0,
      ),
      sales_amt: rows.reduce(
        (sum: number, row: any) => sum + getSalesAmount(row),
        0,
      ),
      total_amount: rows.reduce(
        (sum: number, row: any) => sum + Number(row?.total || 0),
        0,
      ),
      total_received: rows.reduce(
        (sum: number, row: any) => sum + Number(row?.received || 0),
        0,
      ),
      total_payment: rows.reduce(
        (sum: number, row: any) => sum + Number(row?.payment || 0),
        0,
      ),
    }),
    [rawSummary, rows],
  );
  const footerReceivedValue = Number.isFinite(Number(summary?.debit))
    ? Number(summary.debit)
    : rows.reduce(
        (sum: number, row: any) => sum + getBalanceDebitValue(row),
        0,
      );
  const footerPaymentValue = Number.isFinite(Number(summary?.credit))
    ? Number(summary.credit)
    : rows.reduce(
        (sum: number, row: any) => sum + getBalanceCreditValue(row),
        0,
      );
  const footerClosingValue = rows.length
    ? parseAmount(
        rows[rows.length - 1]?.running_balance ??
          rows[rows.length - 1]?.balance,
      )
    : parseAmount(summary?.closing_balance);

  const hasLoaded = !!statementState?.data;
  const hasTransactions = rows.length > 1;

  const branchName = useMemo(() => {
    const selected = dropdownData.find(
      (branch: any) => Number(branch.id) === Number(branchId),
    );
    return selected?.name || 'Selected Branch';
  }, [dropdownData, branchId]);

  const transactionTypeLabel =
    transactionType === '2'
      ? 'Purchase'
      : transactionType === '1'
        ? 'Sales'
        : 'All';
  /**
   * How many rows a printed page carries, or 0 for "do not split at all".
   *
   * Left empty, the statement prints as one continuous run and the browser
   * breaks it across sheets wherever it lands -- which is what somebody wants
   * when they are reading the whole ledger rather than filing a fixed-size
   * page. The print component already treats a size of 0 as one page of
   * everything, so nothing downstream needed teaching.
   */
  const effectiveRowsPerPage = Math.max(Number(rowsPerPage.trim() || 0) || 0, 0);
  const effectiveFontSize = Math.max(Number(fontSize) || 10, 1);

  const handleRun = async () => {
    if (!branchId) {
      openMessageModal('Validation', 'Please select branch.');
      return;
    }
    if (!partyId) {
      openMessageModal('Validation', 'Please select customer or supplier.');
      return;
    }
    if (!startDate || !endDate) {
      openMessageModal('Validation', 'Please select start date and end date.');
      return;
    }

    const action = await dispatch(
      fetchCustomerSupplierStatement({
        branchId: Number(branchId),
        partyId: Number(partyId),
        productId,
        itemId: productId,
        transactionType,
        startDate: dayjs(startDate).format('YYYY-MM-DD'),
        endDate: dayjs(endDate).format('YYYY-MM-DD'),
      }) as any,
    );

    if (action?.meta?.requestStatus !== 'fulfilled') {
      openMessageModal(
        'Report Load Failed',
        action?.payload || 'Statement load failed',
      );
      return;
    }

    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setBranchId(defaultBranchId);
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setPartyId(null);
    setPartyLabel('');
    setLedgerSelectKey((prev) => prev + 1);
    setProductId(null);
    setSelectedProductOption(null);
    setTransactionType('');
    dispatch(clearCustomerSupplierStatement());
    setFilterOpen(false);
  };

  const selectedProduct = (option: any) => {
    if (!option) {
      setProductId(null);
      setSelectedProductOption(null);
      return;
    }

    setProductId(Number(option.value));
    setSelectedProductOption({
      value: option.value,
      label: option.label,
    });
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Customer Supplier Statement',
  });

  const handleExcelExport = () => {
    if (!rows.length) {
      openMessageModal('Export', 'No report data found to export.');
      return;
    }

    const dateRange = `${startDate ? dayjs(startDate).format('DD/MM/YYYY') : '-'} to ${
      endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'
    }`;
    const tableRows = rows
      .map((row) => {
        const description = [
          row.transaction_name,
          row.sales_item_name ? `(${row.sales_item_name})` : '',
          row.remarks,
          row.order_number,
        ]
          .filter(Boolean)
          .join(' ');

        return `<tr>
          ${excelCell(row.sl_number || '', 'td', 'right')}
          ${excelCell(row.vr_no || '')}
          ${excelCell(row.vr_date || '')}
          ${excelCell(description)}
          ${excelCell(formatTransportationNumber(row.truck_no || ''))}
          ${excelCell(getPurchaseQty(row) || '', 'td', 'right')}
          ${excelCell(getSalesQty(row) || '', 'td', 'right')}
          ${excelCell(Number(row.rate || 0) || '', 'td', 'right')}
          ${excelCell(getPurchaseAmount(row) || '', 'td', 'right')}
          ${excelCell(getSalesAmount(row) || '', 'td', 'right')}
          ${excelCell(getBalanceDebitValue(row) || '', 'td', 'right')}
          ${excelCell(getBalanceCreditValue(row) || '', 'td', 'right')}
          ${excelCell(parseAmount(row.running_balance ?? row.balance), 'td', 'right')}
        </tr>`;
      })
      .join('');

    const summaryRow = `<tr>
      ${excelCell('Opening', 'th')}
      ${excelCell(Number(summary?.opening_balance || 0), 'td', 'right')}
      ${excelCell('Pur. Qty', 'th')}
      ${excelCell(Number(summary?.purchase_qty || 0), 'td', 'right')}
      ${excelCell('Sal. Qty', 'th')}
      ${excelCell(Number(summary?.sales_qty || 0), 'td', 'right')}
      ${excelCell('Pur. Amt', 'th')}
      ${excelCell(Number(summary?.purchase_amt || 0), 'td', 'right')}
      ${excelCell('Sal. Amt', 'th')}
      ${excelCell(Number(summary?.sales_amt || 0), 'td', 'right')}
      ${excelCell('Debit', 'th')}
      ${excelCell(footerReceivedValue, 'td', 'right')}
      ${excelCell('Credit', 'th')}
      ${excelCell(footerPaymentValue, 'td', 'right')}
      ${excelCell('Closing', 'th')}
      ${excelCell(footerClosingValue, 'td', 'right')}
    </tr>`;

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
            .sheet th { background: rgb(var(--c-gray-100)); font-weight: 700; }
            .title { font-size: 16px; font-weight: 700; text-align: center; }
          </style>
        </head>
        <body>
          <table class="sheet">
            <colgroup>
              <col style="width:55px" />
              <col style="width:130px" />
              <col style="width:95px" />
              <col style="width:430px" />
              <col style="width:120px" />
              <col style="width:90px" />
              <col style="width:90px" />
              <col style="width:90px" />
              <col style="width:105px" />
              <col style="width:105px" />
              <col style="width:105px" />
              <col style="width:105px" />
              <col style="width:105px" />
            </colgroup>
            <tr>
              <th colspan="13" style="border:.5pt solid rgb(var(--c-gray-300));padding:5px;text-align:center;font-size:16px;font-weight:700;">
                Ledger Details
              </th>
            </tr>
            <tr>
              ${excelCell('Branch', 'th')}
              ${excelCell(branchName)}
              ${excelCell('Ledger', 'th')}
              ${excelCell(party?.name || partyLabel || '-', 'td', 'left', 'font-weight:700;')}
            </tr>
            <tr>
              ${excelCell('Ledger Page', 'th')}
              ${excelCell(party?.ledger_page || '-')}
              ${excelCell('Mobile', 'th')}
              ${excelCell(formatMobile(party?.mobile, mobileFormat) || '-')}
            </tr>
            <tr>
              ${excelCell('Product', 'th')}
              ${excelCell(selectedProductOption?.label || 'All')}
              ${excelCell('Transaction Type', 'th')}
              ${excelCell(transactionTypeLabel)}
            </tr>
            <tr>
              ${excelCell('Date Range', 'th')}
              ${excelCell(dateRange, 'td', 'left', 'font-weight:700;')}
            </tr>
            <tr></tr>
            <tr>
              ${excelCell('Sl. No', 'th')}
              ${excelCell('Voucher No', 'th')}
              ${excelCell('Date', 'th')}
              ${excelCell('Description', 'th')}
              ${excelCell('Vehicle No', 'th')}
              ${excelCell('Pur. Qty', 'th')}
              ${excelCell('Sal. Qty', 'th')}
              ${excelCell('Rate', 'th')}
              ${excelCell('Pur. Total', 'th')}
              ${excelCell('Sal. Total', 'th')}
              ${excelCell('Debit', 'th')}
              ${excelCell('Credit', 'th')}
              ${excelCell('Balance', 'th')}
            </tr>
            ${tableRows}
          </table>
          <br />
          <table class="sheet">
            ${summaryRow}
          </table>
        </body>
      </html>`;

    const stamp = dayjs().format('YYYYMMDD-HHmmss');
    downloadExcelHtml(html, `ledger-with-product-${stamp}.xls`);
  };

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <div>{row.sl_number || ''}</div>,
    },
    {
      key: 'vr_date',
      header: 'Vr No. & Date',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        const isOpening = String(row?.vr_no || '').toLowerCase() === 'opening';

        return (
          <>
            <div
              className={isOpening ? '' : 'cursor-pointer hover:underline'}
              onClick={() => {
                if (isOpening) return;
                handleVoucherPrint({
                  ...row,
                  mtm_id:
                    row?.mtm_id ??
                    row?.mtmid ??
                    row?.mtmId ??
                    row?.mid ??
                    row?.id,
                });
              }}
            >
              {row.vr_no || ''}
            </div>
            <div>{row.vr_date || ''}</div>
          </>
        );
      },
    },
    {
      key: 'description',
      header: 'Description',
      headerClass: 'w-[13%]',
      cellClass: 'w-[13%]',
      render: (row: any) => (
        <div>
          <div className="whitespace-normal">
            {row.transaction_name}
            { row.sales_item_name && (
            <span className="mt-1 text-xs text-slate-500 dark:text-yellow-300"> &nbsp;({row.sales_item_name})</span>
          )}
          </div>
          {row.remarks ? (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              <span className={highlightLineClass(matchHighlightRule(row.remarks, highlightRules))}>
                {row.remarks}
              </span>
            </div>
          ) : null}
          { row.order_number && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{row.order_number}</div>
          )}
          
        </div>
      ),
    },
    {
      key: 'truck_no',
      header: 'Vehicle No',
      headerClass: 'w-[9%]',
      cellClass: 'w-[9%]',
      render: (row: any) => <div>{ formatTransportationNumber(row.truck_no || '')}</div>,
    },
    {
      key: 'purchase_qty',
      header: 'Pur. Qty.',
      headerClass: 'w-[10.5%] text-right',
      cellClass: 'w-[10.5%] text-right',
      render: (row: any) => {
        const purchaseQty = getPurchaseQty(row);

        return (
          <div>
            {purchaseQty > 0 ? thousandSeparator(purchaseQty) : ''}
          </div>
        );
      },
    },
    {
      key: 'sales_qty',
      header: 'Sal. Qty.',
      headerClass: 'w-[10.5%] text-right',
      cellClass: 'w-[10.5%] text-right',
      render: (row: any) => {
        const salesQty = getSalesQty(row);

        return (
          <div>
            {salesQty > 0 ? thousandSeparator(salesQty) : ''}
          </div>
        );
      },
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'w-[7%] text-right',
      cellClass: 'w-[7%] text-right',
      render: (row: any) => {
        const rate = Number(row.rate || 0);
        const purchaseTotal = Number(row.purchase_total || 0);
        const salesTotal = Number(row.sales_total || 0);
        const shouldJoinZeroMark = shouldShowZeroProductAmountMark(
          row,
          rate,
          purchaseTotal,
          salesTotal,
        );

        return (
          <div>
            <span
              className={
                shouldJoinZeroMark
                  ? `${joinedZeroMarkClass} border-y border-l`
                  : undefined
              }
            >
              {formatAmountOrZeroMark(rate)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'purchase_total',
      header: 'Pur. Total',
      headerClass: 'w-[7.5%] text-right',
      cellClass: 'w-[7.5%] text-right',
      render: (row: any) => {
        const rate = Number(row.rate || 0);
        const purchaseTotal = Number(row.purchase_total || 0);
        const salesTotal = Number(row.sales_total || 0);
        const shouldJoinZeroMark = shouldShowZeroProductAmountMark(
          row,
          rate,
          purchaseTotal,
          salesTotal,
        );

        return (
          <div>
            <span
              className={
                shouldJoinZeroMark
                  ? `${joinedZeroMarkClass} border-y`
                  : undefined
              }
            >
              {formatAmountOrZeroMark(purchaseTotal)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'sales_total',
      header: 'Sal. Total',
      headerClass: 'w-[7.5%] text-right',
      cellClass: 'w-[7.5%] text-right',
      render: (row: any) => {
        const rate = Number(row.rate || 0);
        const purchaseTotal = Number(row.purchase_total || 0);
        const salesTotal = Number(row.sales_total || 0);
        const shouldJoinZeroMark = shouldShowZeroProductAmountMark(
          row,
          rate,
          purchaseTotal,
          salesTotal,
        );

        return (
          <div>
            <span
              className={
                shouldJoinZeroMark
                  ? `${joinedZeroMarkClass} border-y border-r`
                  : undefined
              }
            >
              {formatAmountOrZeroMark(salesTotal)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'debit',
      header: 'Debit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        const debitValue = getBalanceDebitValue(row);

        return <div>{debitValue ? thousandSeparator(debitValue) : '-'}</div>;
      },
    },
    {
      key: 'credit',
      header: 'Credit',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        const creditValue = getBalanceCreditValue(row);

        return <div>{creditValue ? thousandSeparator(creditValue) : '-'}</div>;
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right font-semibold',
      render: (row: any) => (
        <div>{thousandSeparator(row.running_balance ?? row.balance)}</div>
      ),
    },
  ];

  const footerRows = [
    [
      {
        label: (
          <div className="flex flex-wrap items-center justify-end gap-x-8 gap-y-1">
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Opening:
              </span>{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {Number(summary?.opening_balance || 0)
                  ? thousandSeparator(summary?.opening_balance || 0)
                  : '-'}
              </span>
            </div>
            {Number(summary?.purchase_qty || 0) > 0 ? (
              <div>
                <span className="text-slate-500 dark:text-slate-400">
                  Pur. Qty:
                </span>{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {thousandSeparator(Number(summary?.purchase_qty || 0))}
                </span>
              </div>
            ) : null}
            {Number(summary?.sales_qty || 0) > 0 ? (
              <div>
                <span className="text-slate-500 dark:text-slate-400">
                  Sal. Qty:
                </span>{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {thousandSeparator(Number(summary?.sales_qty || 0))}
                </span>
              </div>
            ) : null}
            {Number(summary?.purchase_amt || 0) > 0 ? (
              <div>
                <span className="text-slate-500 dark:text-slate-400">
                  Pur. Amt:
                </span>{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {thousandSeparator(Number(summary?.purchase_amt || 0))}
                </span>
              </div>
            ) : null}
            {Number(summary?.sales_amt || 0) > 0 ? (
              <div>
                <span className="text-slate-500 dark:text-slate-400">
                  Sal. Amt:
                </span>{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {thousandSeparator(Number(summary?.sales_amt || 0))}
                </span>
              </div>
            ) : null}
            <div>
              <span className="text-slate-500 dark:text-slate-400">Debit:</span>{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {thousandSeparator(footerReceivedValue)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Credit:
              </span>{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {thousandSeparator(footerPaymentValue)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Closing:
              </span>{' '}
              <span className="font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {thousandSeparator(footerClosingValue)}
              </span>
            </div>
          </div>
        ),
        colSpan: columns.length,
        className: 'text-right',
      },
    ],
  ];

  return (
    <>
      <HelmetTitle title="Ledger Details" />
      <div className="mx-auto space-y-2 ">
        <div className="py-3">
          <div
            className={`gap-3 ${useFilterMenuEnabled ? 'flex flex-wrap items-center gap-3' : 'flex flex-wrap items-end'}`}
          >
            <div
              className={
                useFilterMenuEnabled
                  ? 'relative shrink-0'
                  : 'min-w-[320px] flex-1 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none'
              }
            >
              {useFilterMenuEnabled && (
                <Button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className={`inline-flex w-10 items-center justify-center rounded border text-sm transition ${filterOpen
 ?'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300':'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'}`}
                  title="Open filters"
                  aria-label="Open filters"
                >
                  <FiFilter size={16} />
                </Button>
              )}

              {(useFilterMenuEnabled ? filterOpen : true) && (
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'absolute left-0 top-full z-1000 mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                      : 'w-full'
                  }
                >
                  <div
                    className={
                      useFilterMenuEnabled
                        ? 'space-y-3'
                        : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-6'
                      }
                    >
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Select Branch
                      </label>
                      <BranchDropdown
                        branchDdl={dropdownData}
                        onChange={(e: any) =>
                          setBranchId(Number(e.target.value) || null)
                        }
                        value={branchId ? String(branchId) : ''}
                        defaultValue={branchId ? String(branchId) : ''}
                        className="w-full font-medium text-sm h-10 pl-1"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Select Ledger
                      </label>
                      <DdlMultiline
                        key={ledgerSelectKey}
                        onSelect={(option: any) => {
                          setPartyId(
                            option?.value ? Number(option.value) : null,
                          );
                          setPartyLabel(option?.label || '');
                        }}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Transaction Type
                      </label>
                      <TransactionTypes
                        onChange={handleSelectChange}
                        className="h-10 w-full"
                        value={transactionType}
                        id="transaction_type"
                        name="transaction_type"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.blur();
                            focusNextField('product');
                          }
                        }}
                      />
                    </div>

                    <div className="relative">
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Select Product
                      </label>
                      <div
                        onClick={() => selectedProduct(null)}
                        className="absolute right-2 top-9 z-10 cursor-pointer"
                        title="Clear selected product"
                      ></div>
                      <ProductDropdown
 id="product"
 name="product"
 onSelect={selectedProduct}
 value={selectedProductOption}
 className="appearance-none "
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Start Date
                      </label>
                      <InputDatePicker
 selectedDate={startDate}
 setSelectedDate={setStartDate}
 setCurrentDate={setStartDate}
 className="font-medium text-sm w-full "
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        End Date
                      </label>
                      <InputDatePicker
 selectedDate={endDate}
 setSelectedDate={setEndDate}
 setCurrentDate={setEndDate}
 className="font-medium text-sm w-full "
                      />
                    </div>

                    <div
                      className={`flex gap-2 pt-1 ${useFilterMenuEnabled
                          ? 'justify-end'
                          : 'hidden'
                        } ${useFilterMenuEnabled ? '' : 'md:col-span-2 xl:col-span-1'}`}
                    >
                      <ButtonLoading
                        label="Apply"
                        onClick={handleRun}
                        icon={<FiCheckSquare />}
                        buttonLoading={statementState?.loading}
                        className="px-6"
                      />
                      <ButtonLoading
                        label="Reset"
                        onClick={handleResetFilters}
                        buttonLoading={false}
                        className="px-4"
                        icon={<FiRotateCcw />}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`${useFilterMenuEnabled
                  ? 'hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300'
                  : 'hidden'
                }`}
            >
              Use the filter
            </div>

            {useFilterMenuEnabled ? (
              <div className="ml-auto flex items-end gap-2">
                {partyLabel ? (
                  <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-[rgb(var(--c-border))] bg-white px-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <span className="truncate" title={partyLabel}>
                      {partyLabel}
                    </span>
                  </div>
                ) : null}
                {selectedProductOption?.label ? (
                  <div className="flex h-10 min-w-[180px] max-w-[280px] items-center rounded border border-[rgb(var(--c-border))] bg-white px-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <span
                      className="truncate"
                      title={selectedProductOption.label}
                    >
                      {selectedProductOption.label}
                    </span>
                  </div>
                ) : null}
                {/* No onBlur clamp: it used to rewrite an emptied box back to
                    1, so there was no way to ask for an unbroken statement. */}
                <PrintRowsInput
                  type="number"
                  id="cs-statement-rows"
                  label=""
                  title="Rows per print page — leave empty to let each sheet hold as many as it fits"
                  placeholder="All"
                  value={rowsPerPage}
                  onChange={(e: any) => setRowsPerPage(e.target.value)}
                  min={0}
                  className={numberControlClass}
                />
                <PrintFontInput
                  type="number"
                  id="cs-statement-font"
                  label=""
                  title="Report font size"
                  placeholder="Font"
                  value={fontSize}
                  onChange={(e: any) => setFontSize(e.target.value)}
                  onBlur={() =>
                    setFontSize(String(Math.max(Number(fontSize) || 10, 1)))
                  }
                  min={1}
                  className={numberControlClass}
                />
                <PrintButton
                  label="Print"
                  onClick={handlePrint}
                  className="px-6"
                  disabled={!rows.length}
                />
                <ButtonLoading
                  label="Excel"
                  onClick={handleExcelExport}
                  buttonLoading={false}
                  className="px-5"
                  icon={<FiDownload />}
                  disabled={!rows.length}
                />
              </div>
            ) : (
              <div className="flex w-full flex-wrap items-end justify-end gap-3">
                <div className="flex flex-wrap items-end gap-2">
                  <ButtonLoading
                    label="Apply"
                    onClick={handleRun}
                    buttonLoading={statementState?.loading}
                    className="px-6"
                    icon={<FiCheckSquare />}
                  />

                  <ButtonLoading
                    label="Reset"
                    onClick={handleResetFilters}
                    buttonLoading={false}
                    className="px-4"
                    icon={<FiRotateCcw />}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  {/* The narrow-screen copy of the same control. */}
                  <PrintRowsInput
                    type="number"
                    id="cs-statement-rows"
                    label=""
                    title="Rows per print page — leave empty to let each sheet hold as many as it fits"
                    placeholder="All"
                    value={rowsPerPage}
                    onChange={(e: any) => setRowsPerPage(e.target.value)}
                    min={0}
                    className={numberControlClass}
                  />
                  <PrintFontInput
                    type="number"
                    id="cs-statement-font"
                    label=""
                    title="Report font size"
                    placeholder="Font"
                    value={fontSize}
                    onChange={(e: any) => setFontSize(e.target.value)}
                    onBlur={() =>
                      setFontSize(String(Math.max(Number(fontSize) || 10, 1)))
                    }
                    min={1}
                    className={numberControlClass}
                  />
                  <PrintButton
                    label="Print"
                    onClick={handlePrint}
                    className="px-6"
                    disabled={!rows.length}
                  />
                  <ButtonLoading
                    label="Excel"
                    onClick={handleExcelExport}
                    buttonLoading={false}
                    className="px-5"
                    icon={<FiDownload />}
                    disabled={!rows.length}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {statementState?.loading ? (
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-white p-8 shadow-default dark:bg-[rgb(var(--c-boxdark))]">
            <Loader />
          </div>
        ) : null}

        {!statementState?.loading && !hasLoaded ? (
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-white px-6 py-12 text-center shadow-default dark:bg-[rgb(var(--c-boxdark))]">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-[rgb(var(--c-text))]">
              No statement loaded yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Select branch, customer/supplier and date range, then click Load
              Report.
            </p>
          </div>
        ) : null}

        {!statementState?.loading && hasLoaded ? (
          <div className="overflow-hidden rounded-sm border border-[rgb(var(--c-border))] bg-white shadow-default dark:bg-[rgb(var(--c-boxdark))]">
            <Table
              columns={columns}
              data={rows}
              noDataMessage={
                hasTransactions
                  ? 'No statement rows found'
                  : 'No transactions found'
              }
              // tableClassName="min-w-full table-fixed text-sm text-slate-700 dark:text-slate-100"
              // theadClassName="bg-slate-100 text-xs uppercase text-slate-700 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-slate-100"
              // tbodyClassName="divide-y-0 bg-transparent dark:bg-transparent"
              // rowClassName="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-[rgb(var(--c-strokedark))]"
              getRowKey={(row: any, index: number) =>
                `${row?.vr_no || 'row'}-${index}`
              }
              tableStyle={{ fontSize: `${effectiveFontSize}px` }}
              footerRows={footerRows}
              className="[&_table]:shadow-none [&_tbody_tr:hover]:bg-slate-50 dark:[&_tbody_tr:hover]:bg-[rgb(var(--c-strokedark))]"
            />
          </div>
        ) : null}
      </div>

      <div className="hidden">
        <div ref={printRef}>
          <LedgerWithProductPrint
            rows={rows}
            branchName={branchName}
            partyName={party?.name || partyLabel}
            ledgerPage={party?.ledger_page}
            mobile={party?.mobile}
            address={party?.manual_address}
            productName={selectedProductOption?.label || 'All'}
            transactionTypeLabel={transactionTypeLabel}
            startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : '-'}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'}
            rowsPerPage={effectiveRowsPerPage}
            fontSize={effectiveFontSize}
            summary={{
              ...summary,
              total_received: footerReceivedValue,
              total_payment: footerPaymentValue,
              closing_balance: footerClosingValue,
            }}
          />
        </div>
        <VoucherPrintRegistry
          ref={voucherRegistryRef}
          rowsPerPage={effectiveRowsPerPage}
          fontSize={effectiveFontSize}
        />
      </div>

      <ConfirmModal
        show={showMessageModal}
        title={modalTitle}
        message={modalMessage}
        confirmLabel="OK"
        cancelLabel="Close"
        loading={false}
        onCancel={() => setShowMessageModal(false)}
        onConfirm={() => setShowMessageModal(false)}
        showCancelButton={false}
        className="bg-primary hover:bg-primary/90"
      />
    </>
  );
};

export default LedgerWithProduct;
