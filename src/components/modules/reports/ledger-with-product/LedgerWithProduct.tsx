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

const LedgerWithProduct = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const statementState: any = useSelector((state: any) => state.customerSupplierStatement);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partyLabel, setPartyLabel] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(16);
  const [fontSize, setFontSize] = useState<number>(10);
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
    () =>
      rawRows.map((row: any) => {
        const voucherType = getVoucherType(row?.vr_no);
        const total = Number(row?.total || 0);
        const rawReceived = Number(row?.received || 0);
        const rawPayment = Number(row?.payment || 0);
        const cashReceived = getCashAmount(row, 'debit');
        const cashPayment = getCashAmount(row, 'credit');
        const received = cashReceived > 0 ? cashReceived : rawReceived;
        const payment = cashPayment > 0 ? cashPayment : rawPayment;

        return {
          ...row,
          received: voucherType === '4' && received === total ? 0 : received,
          payment: voucherType === '3' && payment === total ? 0 : payment,
        };
      }),
    [rawRows],
  );

  const summary = useMemo(
    () => ({
      ...rawSummary,
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
    }
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
      render: (row: any) => <div>{row.truck_no || ''}</div>,
    },
    {
      key: 'quantity',
      header: 'Qty',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div>
          {Number(row.quantity || 0)
            ? thousandSeparator(Number(row.quantity || 0), 2)
            : '-'}
        </div>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div>
          {Number(row.rate || 0) ? thousandSeparator(Number(row.rate || 0), 2) : '-'}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div>{Number(row.total || 0) ? formatAmount(row.total) : '-'}</div>
      ),
    },
    {
      key: 'received',
      header: 'Received',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div>{Number(row.received || 0) ? formatAmount(row.received) : '-'}</div>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div>{Number(row.payment || 0) ? formatAmount(row.payment) : '-'}</div>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right font-semibold',
      render: (row: any) => <div>{formatAmount(row.balance)}</div>,
    },
  ];

  const footerRows = [
    [
      {
        label: 'Opening:',
        colSpan: 2,
        className: 'text-right text-slate-500 dark:text-slate-400',
      },
      {
        label: formatAmount(summary?.opening_balance || 0),
        className: 'text-left font-semibold text-slate-800 dark:text-slate-100',
      },
      {
        label: 'Received:',
        colSpan: 2,
        className: 'text-right text-slate-500 dark:text-slate-400',
      },
      {
        label: formatAmount(summary?.total_received || 0),
        className: 'text-left font-semibold text-slate-800 dark:text-slate-100',
      },
      {
        label: 'Payment:',
        colSpan: 2,
        className: 'text-right text-slate-500 dark:text-slate-400',
      },
      {
        label: formatAmount(summary?.total_payment || 0),
        className: 'text-left font-semibold text-slate-800 dark:text-slate-100',
      },
      {
        label: 'Closing:',
        className: 'text-right text-slate-500 dark:text-slate-400',
      },
      {
        label: formatAmount(summary?.closing_balance || 0),
        className: 'text-right font-bold text-slate-900 dark:text-white',
      },
    ],
  ];

  return (
    <>
      <HelmetTitle title="Ledger with Product" />

      <div className="mx-auto space-y-4 ">
        <div className="  ">
          <div className="">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[1.15fr_1.15fr_1.15fr_1.15fr_52px_52px_70px_56px] xl:items-end xl:gap-3">
              <div className="xl:min-w-0">
                <div>
                  {' '}
                  <label htmlFor="">Select Branch</label>
                </div>
                <BranchDropdown
                  branchDdl={dropdownData}
                  onChange={(e: any) => setBranchId(Number(e.target.value) || null)}
                  defaultValue={branchId ? String(branchId) : ''}
                  className="w-full font-medium text-sm h-8.5 pl-1"
                />
              </div>

              <div className="xl:min-w-0">
                <label htmlFor="">Select Ledger</label>
                <DdlMultiline
                  onSelect={(option: any) => {
                    setPartyId(option?.value ? Number(option.value) : null);
                    setPartyLabel(option?.label || '');
                  }}
                  className='h-8.5'
                />
              </div>

              <div className="xl:min-w-0">
                <InputDatePicker
                  label="Start Date"
                  selectedDate={startDate}
                  setSelectedDate={setStartDate}
                  setCurrentDate={setStartDate}
                  className="font-medium text-sm w-full h-8.5"
                />
              </div>

              <div className="xl:min-w-0">
                <InputDatePicker
                  label="End Date"
                  selectedDate={endDate}
                  setSelectedDate={setEndDate}
                  setCurrentDate={setEndDate}
                  className="font-medium text-sm w-full h-8.5"
                />
              </div>

              <div className="xl:min-w-0">
                <InputElement
                  type="number"
                  id="cs-statement-rows"
                  label="Rows"
                  value={rowsPerPage}
                  onChange={(e: any) => setRowsPerPage(Number(e.target.value) || 16)}
                  className="font-medium text-sm w-full h-8.5"
                />
              </div>

              <div className="xl:min-w-0">
                <InputElement
                  type="number"
                  id="cs-statement-font"
                  label="Font"
                  value={fontSize}
                  onChange={(e: any) => setFontSize(Number(e.target.value) || 10)}
                  className="font-medium text-sm w-full h-8.5"
                />
              </div>

              <div className="xl:min-w-0">
                <ButtonLoading
                  label="Run"
                  onClick={handleRun}
                  buttonLoading={statementState?.loading}
                  className="mt-6 h-8.5 w-full border-0 bg-slate-600 px-4 text-white hover:bg-slate-500 xl:mt-0"
                />
              </div>

              <div className="xl:min-w-0">
                <PrintButton
                  label=""
                  onClick={handlePrint}
                  className="mt-6 h-8.5 w-full border-0 bg-slate-600 px-3 text-white hover:bg-slate-500 xl:mt-0"
                  disabled={!rows.length}
                />
              </div>
            </div>
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
              tableClassName="min-w-full table-fixed text-sm text-slate-700 dark:text-slate-100"
              theadClassName="bg-slate-100 text-xs uppercase text-slate-700 dark:bg-[#3a475c] dark:text-slate-100"
              tbodyClassName="divide-y-0 bg-transparent dark:bg-transparent"
              rowClassName="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-[#243040]"
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
            summary={summary}
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

