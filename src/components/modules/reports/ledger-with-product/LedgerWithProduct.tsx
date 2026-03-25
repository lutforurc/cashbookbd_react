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
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider'; 
import { fetchCustomerSupplierStatement } from './ledgerWithProductSlice';
import LedgerWithProductPrint from './LedgerWithProductPrint';

const formatAmount = (value: any, precision = 0) => {
  const amount = Number(value || 0);
  const formatted = thousandSeparator(Math.abs(amount), precision);
  return amount < 0 ? `(${formatted})` : formatted;
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

  const printRef = useRef<HTMLDivElement>(null);

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
  const rows = Array.isArray(reportData?.rows) ? reportData.rows : [];
  const summary = reportData?.summary || {};
  const party = reportData?.party || {};

  const hasLoaded = !!statementState?.data;
  const hasTransactions = rows.length > 1;

  const branchName = useMemo(() => {
    const selected = dropdownData.find((branch: any) => Number(branch.id) === Number(branchId));
    return selected?.name || 'Selected Branch';
  }, [dropdownData, branchId]);

  const handleRun = async () => {
    if (!branchId) return alert('Branch select করুন');
    if (!partyId) return alert('Customer / Supplier select করুন');
    if (!startDate || !endDate) return alert('Start/End Date দিন');

    const action = await dispatch(
      fetchCustomerSupplierStatement({
        branchId: Number(branchId),
        partyId: Number(partyId),
        startDate: dayjs(startDate).format('YYYY-MM-DD'),
        endDate: dayjs(endDate).format('YYYY-MM-DD'),
      }) as any,
    );

    if (action?.meta?.requestStatus !== 'fulfilled') {
      alert(action?.payload || 'Statement load failed');
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
        <div className="rounded-sm  ">
          <div className="px-3 py-3 ">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[1.15fr_1.15fr_1.15fr_1.15fr_52px_52px_70px_56px] xl:items-end xl:gap-3">
              <div className="xl:min-w-0">
                <label className="mb-1 block text-sm text-slate-100">Select Branch</label>
                <BranchDropdown
                  branchDdl={dropdownData}
                  onChange={(e: any) => setBranchId(Number(e.target.value) || null)}
                  defaultValue={branchId ? String(branchId) : ''}
                  className="h-10 rounded-sm border border-slate-600 bg-[#243040] px-3 text-white"
                />
              </div>

              <div className="xl:min-w-0">
                <label className="mb-1 block text-sm text-slate-100">
                  Select Ledger
                </label>
                <DdlMultiline
                  onSelect={(option: any) => {
                    setPartyId(option?.value ? Number(option.value) : null);
                    setPartyLabel(option?.label || '');
                  }}
                  className="dark:bg-[#243040]"
                />
              </div>

              <div className="xl:min-w-0">
                <InputDatePicker
                  label="Start Date"
                  selectedDate={startDate}
                  setSelectedDate={setStartDate}
                  setCurrentDate={setStartDate}
                  className="h-10 w-full rounded-sm border border-slate-600 bg-[#243040] text-white"
                />
              </div>

              <div className="xl:min-w-0">
                <InputDatePicker
                  label="End Date"
                  selectedDate={endDate}
                  setSelectedDate={setEndDate}
                  setCurrentDate={setEndDate}
                  className="h-10 w-full rounded-sm border border-slate-600 bg-[#243040] text-white"
                />
              </div>

              <div className="xl:min-w-0">
                <InputElement
                  type="number"
                  id="cs-statement-rows"
                  label="Rows"
                  value={rowsPerPage}
                  onChange={(e: any) => setRowsPerPage(Number(e.target.value) || 16)}
                  className="h-10 border border-slate-600 bg-[#243040] text-center text-white"
                />
              </div>

              <div className="xl:min-w-0">
                <InputElement
                  type="number"
                  id="cs-statement-font"
                  label="Font"
                  value={fontSize}
                  onChange={(e: any) => setFontSize(Number(e.target.value) || 10)}
                  className="h-10 border border-slate-600 bg-[#243040] text-center text-white"
                />
              </div>

              <div className="xl:min-w-0">
                <ButtonLoading
                  label="Run"
                  onClick={handleRun}
                  buttonLoading={statementState?.loading}
                  className="mt-6 h-10 w-full border-0 bg-slate-600 px-4 text-white hover:bg-slate-500 xl:mt-0"
                />
              </div>

              <div className="xl:min-w-0">
                <PrintButton
                  label=""
                  onClick={handlePrint}
                  className="mt-6 h-10 w-full border-0 bg-slate-600 px-3 text-white hover:bg-slate-500 xl:mt-0"
                  disabled={!rows.length}
                />
              </div>
            </div>
          </div>
        </div>

        {statementState?.loading ? (
          <div className="rounded-sm border border-stroke bg-white p-8 shadow-default dark:border-strokedark dark:bg-boxdark">
            <Loader />
          </div>
        ) : null}

        {!statementState?.loading && !hasLoaded ? (
          <div className="rounded-sm border border-slate-700 bg-[#1f2733] px-6 py-12 text-center shadow-default">
            <h3 className="text-lg font-semibold text-white">
              No statement loaded yet
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Select branch, customer/supplier and date range, then click Load Report.
            </p>
          </div>
        ) : null}

        {!statementState?.loading && hasLoaded ? (
          <div className="overflow-hidden rounded-sm border border-slate-700 bg-[#1f2733] shadow-default">
              <div className="overflow-x-auto">
                <table
                  className="min-w-full table-fixed text-sm text-slate-100"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  <thead className="bg-[#3a475c] text-xs uppercase text-slate-100">
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
                          className="border-t border-slate-700 bg-[#243040] transition-colors hover:bg-[#2b394b]"
                        >
                          <td className="px-3 py-3 text-center">{row.sl_number || ''}</td>
                          <td className="px-3 py-3 text-center">
                            {row.vr_date ? row.vr_date : ''}
                          </td>
                          <td className="px-3 py-3">{row.vr_no || ''}</td>
                          <td className="px-3 py-3">
                            <div className="whitespace-normal">{row.product_name || row.trx_type || '-'}</div>
                            {row.remarks ? (
                              <div className="mt-1 text-xs text-slate-300">{row.remarks}</div>
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
                        <td colSpan={11} className="px-3 py-8 text-center text-slate-300">
                          {hasTransactions ? 'No statement rows found' : 'No transactions found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
    </>
  );
};

export default LedgerWithProduct;
