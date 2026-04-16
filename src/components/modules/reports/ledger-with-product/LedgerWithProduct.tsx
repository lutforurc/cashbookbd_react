import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import Loader from '../../../../common/Loader';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchCustomerSupplierStatement } from './ledgerWithProductSlice';
import LedgerWithProductPrint from './LedgerWithProductPrint';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import { FiFilter } from 'react-icons/fi';

const formatAmount = (value: any, precision = 0) => {
  const amount = Number(value || 0);
  const formatted = thousandSeparator(Math.abs(amount), precision);
  return amount < 0 ? `(${formatted})` : formatted;
};

const getVoucherType = (vrNo: any) => {
  const prefix = String(vrNo || '').split('-')[0]?.trim();
  const parsed = Number.parseInt(prefix, 10);
  return Number.isNaN(parsed) ? prefix : String(parsed);
};

const isOpeningRow = (row: any) =>
  String(row?.vr_no || '').toLowerCase() === 'opening' ||
  /opening balance/i.test(String(row?.remarks || ''));

const getDisplayedReceivedValue = (row: any) => {
  if (Number.isFinite(Number(row?.displayed_received))) {
    return Number(row.displayed_received);
  }

  if (isOpeningRow(row)) return 0;

  const receivedValue = Number(row?.received || 0);
  const totalValue = Number(row?.total || 0);
  const voucherType = getVoucherType(row?.vr_no);

  return voucherType === '4' && receivedValue <= 0 && totalValue > 0
    ? totalValue
    : receivedValue;
};

const getDisplayedPaymentValue = (row: any) => {
  if (Number.isFinite(Number(row?.displayed_payment))) {
    return Number(row.displayed_payment);
  }

  const balanceValue = Math.abs(Number(row?.balance || 0));
  const paymentValue = Number(row?.payment || 0);
  const totalValue = Number(row?.total || 0);
  const voucherType = getVoucherType(row?.vr_no);

  if (isOpeningRow(row) && balanceValue > 0) {
    return balanceValue;
  }

  return voucherType === '3' && paymentValue <= 0 && totalValue > 0
    ? totalValue
    : paymentValue;
};

const getCashAmount = (row: any, key: 'debit' | 'credit') => {
  const masters = Array.isArray(row?.acc_transaction_master)
    ? row.acc_transaction_master
    : row?.acc_transaction_master
      ? [row.acc_transaction_master]
      : [];

  return masters.reduce((sum: number, master: any) => {
    const details = Array.isArray(master?.acc_transaction_details)
      ? master.acc_transaction_details
      : [];

    return (
      sum +
      details
        .filter((detail: any) => Number(detail?.coa4_id) === 17)
        .reduce(
          (detailSum: number, detail: any) =>
            detailSum + Number(detail?.[key] || 0),
          0,
        )
    );
  }, 0);
};

const getPurchaseQty = (row: any) => {
  if (isOpeningRow(row)) return 0;
  return getVoucherType(row?.vr_no) === '4' ? Number(row?.quantity || 0) : 0;
};

const getSalesQty = (row: any) => {
  if (isOpeningRow(row)) return 0;
  return getVoucherType(row?.vr_no) === '3' ? Number(row?.quantity || 0) : 0;
};

const LedgerWithProduct = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const statementState: any = useSelector((state: any) => state.customerSupplierStatement);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled =
    String(settings?.data?.branch?.use_filter_parameter ?? '') === '1';

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partyLabel, setPartyLabel] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(11);
  const [fontSize, setFontSize] = useState<number>(12);
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

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    setBranchId(Number(user?.user?.branch_id) || null);
  }, []);

  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;

    if (Array.isArray(protectedData?.data)) {
      setDropdownData(protectedData.data);
    }

    if (protectedData?.transactionDate) {
      const [day, month, year] = protectedData.transactionDate.split('/');
      const parsedEndDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(new Date(Number(year), 0, 1));
      setEndDate(parsedEndDate);
    }
  }, [branchDdlData?.protectedData]);

  const reportData = statementState?.data || {};
  const rawRows = Array.isArray(reportData?.rows) ? reportData.rows : [];
  const rawSummary = reportData?.summary || {};
  const party = reportData?.party || {};

  const rows = useMemo(
    () => {
      let runningBalance = 0;

      return rawRows.map((row: any) => {
        const voucherType = getVoucherType(row?.vr_no);
        const total = Number(row?.total || 0);
        const rawReceived = Number(row?.received || 0);
        const rawPayment = Number(row?.payment || 0);
        const cashReceived = getCashAmount(row, 'debit');
        const cashPayment = getCashAmount(row, 'credit');
        const received = cashReceived > 0 ? cashReceived : rawReceived;
        const payment = cashPayment > 0 ? cashPayment : rawPayment;

        const normalizedRow = {
          ...row,
          received: voucherType === '4' && received === total ? 0 : received,
          payment: voucherType === '3' && payment === total ? 0 : payment,
        };
        const displayedReceived = getDisplayedReceivedValue(normalizedRow);
        const displayedPayment = getDisplayedPaymentValue(normalizedRow);
        runningBalance += displayedReceived - displayedPayment;

        return {
          ...normalizedRow,
          displayed_received: displayedReceived,
          displayed_payment: displayedPayment,
          running_balance: runningBalance,
        };
      });
    },
    [rawRows],
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
  const footerReceivedValue = rows.reduce(
    (sum: number, row: any) => sum + getDisplayedReceivedValue(row),
    0,
  );
  const footerPaymentValue = rows.reduce(
    (sum: number, row: any) => sum + getDisplayedPaymentValue(row),
    0,
  );
  const footerClosingValue = rows.length
    ? Number(rows[rows.length - 1]?.running_balance || 0)
    : Number(summary?.closing_balance || 0);

  const hasLoaded = !!statementState?.data;
  const hasTransactions = rows.length > 1;

  const branchName = useMemo(() => {
    const selected = dropdownData.find((branch: any) => Number(branch.id) === Number(branchId));
    return selected?.name || 'Selected Branch';
  }, [dropdownData, branchId]);

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
        startDate: dayjs(startDate).format('YYYY-MM-DD'),
        endDate: dayjs(endDate).format('YYYY-MM-DD'),
      }) as any,
    );

    if (action?.meta?.requestStatus !== 'fulfilled') {
      openMessageModal('Report Load Failed', action?.payload || 'Statement load failed');
      return;
    }

    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Customer Supplier Statement',
    removeAfterPrint: true,
  });

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
      header: 'Vr Date',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <div>{row.vr_date || ''}</div>,
    },
    {
      key: 'vr_no',
      header: 'Vr No',
      render: (row: any) => {
        const isOpening = String(row?.vr_no || '').toLowerCase() === 'opening';

        return (
          <div
            className={isOpening ? '' : 'cursor-pointer hover:underline'}
            onClick={() => {
              if (isOpening) return;
              handleVoucherPrint({
                ...row,
                mtm_id: row?.mtm_id ?? row?.mtmid ?? row?.mtmId ?? row?.mid ?? row?.id,
              });
            }}
          >
            {row.vr_no || ''}
          </div>
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
          <div className="whitespace-normal">{row.product_name || row.trx_type || '-'}</div>
          {row.remarks ? (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{row.remarks}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'truck_no',
      header: 'Truck No',
      headerClass: 'w-[9%]',
      cellClass: 'w-[9%]',
      render: (row: any) => <div>{row.truck_no || ''}</div>,
    },
    {
      key: 'purchase_qty',
      header: 'Pur. Qty.',
      headerClass: 'w-[10.5%] text-right',
      cellClass: 'w-[10.5%] text-right',
      render: (row: any) => (
        <div>{getPurchaseQty(row) ? thousandSeparator(getPurchaseQty(row), 2) : '-'}</div>
      ),
    },
    {
      key: 'sales_qty',
      header: 'Sal. Qty.',
      headerClass: 'w-[10.5%] text-right',
      cellClass: 'w-[10.5%] text-right',
      render: (row: any) => (
        <div>{getSalesQty(row) ? thousandSeparator(getSalesQty(row), 2) : '-'}</div>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'w-[7%] text-right',
      cellClass: 'w-[7%] text-right',
      render: (row: any) => (
        <div>
          {Number(row.rate || 0) ? thousandSeparator(Number(row.rate || 0), 2) : '-'}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      headerClass: 'w-[7.5%] text-right',
      cellClass: 'w-[7.5%] text-right',
      render: (row: any) => (
        <div>{Number(row.total || 0) ? formatAmount(row.total) : '-'}</div>
      ),
    },
    {
      key: 'received',
      header: 'Received',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        const displayValue = getDisplayedReceivedValue(row);

        return <div>{displayValue ? formatAmount(displayValue) : '-'}</div>;
      },
    },
    {
      key: 'payment',
      header: 'Payment',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        const displayValue = getDisplayedPaymentValue(row);

        return <div>{displayValue ? formatAmount(displayValue) : '-'}</div>;
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right font-semibold',
      render: (row: any) => <div>{formatAmount(row.running_balance ?? row.balance)}</div>,
    },
  ];

  const footerRows = [
    [
      {
        label: (
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Opening:</span>{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {Number(summary?.opening_balance || 0)
                ? formatAmount(summary?.opening_balance || 0)
                : '-'}
            </span>
          </div>
        ),
        colSpan: 5,
        className: 'text-right',
      },
      {
        label: (
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Pur. Qty:</span>{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {thousandSeparator(Number(summary?.purchase_qty || 0), 2)}
            </span>
          </div>
        ),
        className: 'text-right',
      },
      {
        label: (
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Sal. Qty:</span>{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {thousandSeparator(Number(summary?.sales_qty || 0), 2)}
            </span>
          </div>
        ),
        className: 'text-right',
      },
      {
        label: (
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Received:</span>{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {formatAmount(footerReceivedValue)}
            </span>
          </div>
        ),
        className: 'text-right',
      },
      {
        label: (
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Pur. Qty:</span>{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {thousandSeparator(Number(summary?.purchase_qty || 0), 2)}
            </span>
          </div>
        ),
        className: 'text-right',
      },
      {
        label: (
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Sal. Qty:</span>{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {thousandSeparator(Number(summary?.sales_qty || 0), 2)}
            </span>
          </div>
        ),
        className: 'text-right',
      },
      {
        label: (
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Payment:</span>{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {formatAmount(footerPaymentValue)}
            </span>
          </div>
        ),
        className: 'text-right',
      },
      {
        label: (
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">Closing:</span>{' '}
            <span className="font-bold text-slate-900 dark:text-white">
              {formatAmount(footerClosingValue)}
            </span>
          </div>
        ),
        colSpan: 2,
        className: 'text-right',
      },
    ],
  ];

  return (
    <>
      <HelmetTitle title="Ledger with Product" />
      <div className="mx-auto space-y-4 ">
        <div className="py-3">
          <div className={`gap-3 ${useFilterMenuEnabled ? 'flex flex-wrap items-center gap-3' : 'flex flex-col xl:flex-row xl:items-end'}`}>
            <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'min-w-[320px] flex-1'}>
              {useFilterMenuEnabled && (
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${filterOpen
                      ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'
                    }`}
                  title="Open filters"
                  aria-label="Open filters"
                >
                  <FiFilter size={16} />
                </button>
              )}

              {(useFilterMenuEnabled ? filterOpen : true) && (
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                      : 'w-full'
                  }
                >
                  <div
                    className={
                      useFilterMenuEnabled
                        ? 'space-y-3'
                        : 'grid grid-cols-4 items-end gap-3'
                    }
                  >
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                      <BranchDropdown
                        branchDdl={dropdownData}
                        onChange={(e: any) => setBranchId(Number(e.target.value) || null)}
                        value={branchId ? String(branchId) : ''}
                        defaultValue={branchId ? String(branchId) : ''}
                        className="w-full font-medium text-sm h-10 pl-1"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Ledger</label>
                      <DdlMultiline
                        onSelect={(option: any) => {
                          setPartyId(option?.value ? Number(option.value) : null);
                          setPartyLabel(option?.label || '');
                        }}
                        className="h-10"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                      <InputDatePicker
                        selectedDate={startDate}
                        setSelectedDate={setStartDate}
                        setCurrentDate={setStartDate}
                        className="font-medium text-sm w-full h-10"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                      <InputDatePicker
                        selectedDate={endDate}
                        setSelectedDate={setEndDate}
                        setCurrentDate={setEndDate}
                        className="font-medium text-sm w-full h-10"
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
                        buttonLoading={statementState?.loading}
                        className="h-10 px-6"
                      />
                      <ButtonLoading
                        label="Reset"
                        onClick={handleResetFilters}
                        buttonLoading={false}
                        className="h-10 px-4"
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
                <InputElement
                  type="number"
                  id="cs-statement-rows"
                  label=""
                  value={rowsPerPage}
                  onChange={(e: any) => setRowsPerPage(Number(e.target.value) || 16)}
                  className="font-medium text-sm h-10 !w-20 text-center"
                />
                <InputElement
                  type="number"
                  id="cs-statement-font"
                  label=""
                  value={fontSize}
                  onChange={(e: any) => setFontSize(Number(e.target.value) || 10)}
                  className="font-medium text-sm h-10 !w-20 text-center"
                />
                <PrintButton
                  label="Print"
                  onClick={handlePrint}
                  className="h-10 px-6"
                  disabled={!rows.length}
                />
              </div>
            ) : (
              <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto xl:ml-auto">
                <div className="flex flex-nowrap items-end gap-2">
                  <ButtonLoading
                    label="Apply"
                    onClick={handleRun}
                    buttonLoading={statementState?.loading}
                    className="h-10 px-6"
                  />
                  <ButtonLoading
                    label="Reset"
                    onClick={handleResetFilters}
                    buttonLoading={false}
                    className="h-10 px-4"
                  />
                </div>
                <div className="flex flex-nowrap items-end gap-2">
                  <InputElement
                    type="number"
                    id="cs-statement-rows"
                    label=""
                    value={rowsPerPage}
                    onChange={(e: any) => setRowsPerPage(Number(e.target.value) || 16)}
                    className="font-medium text-sm h-10 !w-20 text-center"
                  />
                  <InputElement
                    type="number"
                    id="cs-statement-font"
                    label=""
                    value={fontSize}
                    onChange={(e: any) => setFontSize(Number(e.target.value) || 10)}
                    className="font-medium text-sm h-10 !w-20 text-center"
                  />
                  <PrintButton
                    label="Print"
                    onClick={handlePrint}
                    className="h-10 px-6"
                    disabled={!rows.length}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {statementState?.loading ? (
          <div className="rounded-sm border border-slate-200 bg-white p-8 shadow-default dark:border-slate-700 dark:bg-[#1f2733]">
            <Loader />
          </div>
        ) : null}

        {!statementState?.loading && !hasLoaded ? (
          <div className="rounded-sm border border-slate-200 bg-white px-6 py-12 text-center shadow-default dark:border-slate-700 dark:bg-[#1f2733]">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              No statement loaded yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Select branch, customer/supplier and date range, then click Load Report.
            </p>
          </div>
        ) : null}

        {!statementState?.loading && hasLoaded ? (
          <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-default dark:border-slate-700 dark:bg-[#1f2733]">
            <Table
              columns={columns}
              data={rows}
              noDataMessage={hasTransactions ? 'No statement rows found' : 'No transactions found'}
              // tableClassName="min-w-full table-fixed text-sm text-slate-700 dark:text-slate-100"
              // theadClassName="bg-slate-100 text-xs uppercase text-slate-700 dark:bg-[#3a475c] dark:text-slate-100"
              // tbodyClassName="divide-y-0 bg-transparent dark:bg-transparent"
              // rowClassName="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-[#243040]"
              getRowKey={(row: any, index: number) => `${row?.vr_no || 'row'}-${index}`}
              tableStyle={{ fontSize: `${fontSize}px` }}
              footerRows={footerRows}
              className="[&_table]:shadow-none [&_tbody_tr:hover]:bg-slate-50 dark:[&_tbody_tr:hover]:bg-[#2b394b]"
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
            startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : '-'}
            endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'}
            rowsPerPage={rowsPerPage}
            fontSize={fontSize}
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
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
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

