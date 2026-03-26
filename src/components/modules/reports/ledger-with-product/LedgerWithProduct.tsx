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
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchCustomerSupplierStatement } from './ledgerWithProductSlice';
import LedgerWithProductPrint from './LedgerWithProductPrint';

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
                  className="w-full font-medium text-sm h-8.5"
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
            <div className="overflow-x-auto">
              <table
                className="min-w-full table-fixed text-sm text-slate-700 dark:text-slate-100"
                style={{ fontSize: `${fontSize}px` }}
              >
                <thead className="bg-slate-100 text-xs uppercase text-slate-700 dark:bg-[#3a475c] dark:text-slate-100">
                  <tr>
                    <th className="px-3 py-3 text-center">Sl. No</th>
                    <th className="px-3 py-3 text-center">Vr Date</th>
                    <th className="px-3 py-3 text-left">Vr No</th>
                    <th className="px-3 py-3 text-left">Description</th>
                    <th className="px-3 py-3 text-left">Truck No</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Rate</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-right">Received</th>
                    <th className="px-3 py-3 text-right">Payment</th>
                    <th className="px-3 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((row: any, index: number) => (
                      <tr
                        key={`${row.vr_no}-${index}`}
                        className="border-t border-slate-200 bg-white transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#243040] dark:hover:bg-[#2b394b]"
                      >
                        <td className="px-3 py-3 text-center">{row.sl_number || ''}</td>
                        <td className="px-3 py-3 text-center">
                          {row.vr_date ? row.vr_date : ''}
                        </td>
                        <td className="px-3 py-3">{row.vr_no || ''}</td>
                        <td className="px-3 py-3">
                          <div className="whitespace-normal">{row.product_name || row.trx_type || '-'}</div>
                          {row.remarks ? (
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{row.remarks}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">{row.truck_no || ''}</td>
                        <td className="px-3 py-3 text-right">
                          {Number(row.quantity || 0)
                            ? thousandSeparator(Number(row.quantity || 0), 2)
                            : '-'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {Number(row.rate || 0) ? thousandSeparator(Number(row.rate || 0), 2) : '-'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {Number(row.total || 0) ? formatAmount(row.total) : '-'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {Number(row.received || 0) ? formatAmount(row.received) : '-'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {Number(row.payment || 0) ? formatAmount(row.payment) : '-'}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {formatAmount(row.balance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-3 py-8 text-center text-slate-500 dark:text-slate-300">
                        {hasTransactions ? 'No statement rows found' : 'No transactions found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-[#243040]">
              <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm">
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400">Opening:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {formatAmount(summary?.opening_balance || 0)}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400">Received:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {formatAmount(summary?.total_received || 0)}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400">Payment:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {formatAmount(summary?.total_payment || 0)}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500 dark:text-slate-400">Closing:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatAmount(summary?.closing_balance || 0)}
                  </span>
                </div>
              </div>
            </div>
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

