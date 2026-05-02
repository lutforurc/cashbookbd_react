import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { FiArrowLeft, FiCheckSquare, FiHome, FiPrinter, FiRefreshCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';

import Loader from '../../../../common/Loader';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { getDdlArea } from '../../area/areaSlice';
import httpService from '../../../services/httpService';
import { API_SOMITY_COLLECTION_SHEET_URL } from '../../../services/apiRoutes';
import CollectionSheetPrint, { CollectionSheetRow } from './CollectionSheetPrint';

const statusOptions = [
  { id: '1', name: 'Opening' },
  { id: '2', name: 'Closing' },
];

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMonthForRequest = (value: string) => {
  if (!value) return '';
  const [year, month] = value.split('-');
  return month && year ? `${month}/${year}` : value;
};

const getCurrentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const CollectionSheet = (user: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const areaState = useSelector((state: any) => state.area);

  const [branchId, setBranchId] = useState<string>('');
  const [somityId, setSomityId] = useState<string>('');
  const [monthYear, setMonthYear] = useState(getCurrentMonth());
  const [typeId, setTypeId] = useState('1');
  const [rows, setRows] = useState<CollectionSheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(16);
  const [fontSize, setFontSize] = useState(11);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    dispatch(getDdlArea() as any);
    const defaultBranch = user?.user?.branch_id ? String(user.user.branch_id) : '';
    setBranchId(defaultBranch);
  }, [dispatch, user?.user?.branch_id]);

  useEffect(() => {
    if (!somityId && Array.isArray(areaState?.area) && areaState.area.length > 0) {
      setSomityId(String(areaState.area[0].id));
    }
  }, [areaState?.area, somityId]);

  const branchOptions = branchDdlData?.protectedData?.data || [];
  const somityOptions = Array.isArray(areaState?.area) ? areaState.area : [];

  const branchName = useMemo(
    () => branchOptions.find((item: any) => String(item.id) === String(branchId))?.name,
    [branchOptions, branchId],
  );

  const somityName = useMemo(
    () => somityOptions.find((item: any) => String(item.id) === String(somityId))?.name,
    [somityOptions, somityId],
  );

  const statusLabel = typeId === '1' ? 'Opening' : 'Closing';

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const balance =
            toNumber(row.sales) -
            toNumber(row.down_payment) -
            toNumber(row.previous_collection) -
            toNumber(row.this_month_collection);
          acc.sales += toNumber(row.sales);
          acc.downPayment += toNumber(row.down_payment);
          acc.previous += toNumber(row.previous_collection);
          acc.thisMonth += toNumber(row.this_month_collection);
          acc.balance += balance;
          return acc;
        },
        { sales: 0, downPayment: 0, previous: 0, thisMonth: 0, balance: 0 },
      ),
    [rows],
  );

  const handleLoad = async () => {
    if (!branchId || !somityId || !monthYear || !typeId) {
      toast.info('Please select branch, somity, month and status.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpService.post(API_SOMITY_COLLECTION_SHEET_URL, {
        branch_id: branchId,
        somity_id: somityId,
        month_year: formatMonthForRequest(monthYear),
        type_id: typeId,
      });

      setRows(Array.isArray(data) ? data : data?.data || []);
    } catch (error: any) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Collection sheet data load failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Collection Sheet',
    removeAfterPrint: true,
  });

  const handleReset = () => {
    setBranchId(user?.user?.branch_id ? String(user.user.branch_id) : '');
    setSomityId(somityOptions[0]?.id ? String(somityOptions[0].id) : '');
    setMonthYear(getCurrentMonth());
    setTypeId('1');
    setRows([]);
  };

  const labelClass = 'mb-1 block text-sm font-semibold text-slate-900 dark:text-white';
  const controlClass = 'h-10 w-full rounded-none !border !border-slate-300 !bg-white px-3 text-sm font-semibold !text-slate-900 outline-none focus:!border-slate-500 dark:!border-[#3a475b] dark:!bg-[#1c2938] dark:!text-white dark:focus:!border-[#59677c]';
  const buttonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-none bg-slate-800 px-6 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#3b4658] dark:hover:bg-[#465267]';

  return (
    <div className="min-h-screen bg-slate-100 p-3 text-slate-900 dark:bg-[#18212e] dark:text-white">
      <HelmetTitle title="Collection Sheet" />

      <div className="mb-3 grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(180px,1.1fr)_minmax(220px,1.4fr)_minmax(150px,0.7fr)_minmax(130px,0.65fr)_auto_auto_minmax(90px,0.45fr)_minmax(90px,0.45fr)_auto_auto]">
        <div>
          <label className={labelClass}>Select Branch</label>
          {branchDdlData?.isLoading && <Loader />}
          <BranchDropdown
            onChange={(event: any) => setBranchId(event.target.value)}
            value={branchId}
            className={controlClass}
            branchDdl={branchOptions}
          />
        </div>

        <div>
          <label className={labelClass}>Select Somity</label>
          <DropdownCommon
            id="somity_id"
            name="somity_id"
            value={somityId}
            onChange={(event) => setSomityId(event.target.value)}
            className={controlClass}
            data={somityOptions}
          />
        </div>

        <div>
          <label className={labelClass}>Month</label>
          <input
            type="month"
            value={monthYear}
            onChange={(event) => setMonthYear(event.target.value)}
            className={controlClass}
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <DropdownCommon
            id="type_id"
            name="type_id"
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
            className={controlClass}
            data={statusOptions}
          />
        </div>

        <button type="button" onClick={handleLoad} className={buttonClass}>
          <FiCheckSquare size={15} />
          Apply
        </button>
        <button type="button" onClick={handleReset} className={buttonClass}>
          <FiRefreshCcw size={15} />
          Reset
        </button>

        <label className="block">
          <span className={labelClass}>Rows</span>
          <input
            type="number"
            min={1}
            value={rowsPerPage}
            onChange={(event) => setRowsPerPage(Number(event.target.value) || 16)}
            className={`${controlClass} text-center`}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Font</span>
          <input
            type="number"
            min={8}
            value={fontSize}
            onChange={(event) => setFontSize(Number(event.target.value) || 11)}
            className={`${controlClass} text-center`}
          />
        </label>

        <button type="button" onClick={handlePrint} disabled={rows.length === 0} className={buttonClass}>
          <FiPrinter size={15} />
          Print
        </button>

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex h-10 w-10 items-center justify-center rounded-none bg-slate-800 text-white transition hover:bg-slate-700 dark:bg-[#2b3546] dark:hover:bg-[#3b4658]" title="Back">
            <FiArrowLeft size={16} />
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex h-10 w-10 items-center justify-center rounded-none bg-slate-800 text-white transition hover:bg-slate-700 dark:bg-[#2b3546] dark:hover:bg-[#3b4658]" title="Home">
            <FiHome size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? <Loader /> : null}
        <table className="w-full min-w-[980px] table-fixed border-collapse bg-white text-sm text-slate-900 dark:bg-[#1d2735] dark:text-[#d7deea]">
          <thead>
            <tr className="bg-slate-300 text-xs font-bold uppercase text-slate-950 dark:bg-[#3a4659] dark:text-white">
              <th className="w-20 px-3 py-4 text-center">SL. NO</th>
              <th className="px-3 py-4 text-left">MEMBER DETAILS</th>
              <th className="w-36 px-3 py-4 text-right">TOTAL SALES</th>
              <th className="w-40 px-3 py-4 text-right">DOWN PAYMENT</th>
              <th className="w-36 px-3 py-4 text-right">PRV. COLL.</th>
              <th className="w-36 px-3 py-4 text-right">INSTALLMENT</th>
              <th className="w-36 px-3 py-4 text-right">THIS MONTH</th>
              <th className="w-36 px-3 py-4 text-right">BALANCE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#2e394b]">
            {rows.length > 0 ? (
              rows.map((row, index) => {
                const balance =
                  toNumber(row.sales) -
                  toNumber(row.down_payment) -
                  toNumber(row.previous_collection) -
                  toNumber(row.this_month_collection);

                return (
                  <tr key={`${row.idfr_code ?? index}-${index}`} className={balance === 0 ? 'bg-slate-50 font-semibold dark:bg-[#243445]' : 'bg-white dark:bg-[#1d2735]'}>
                    <td className="px-3 py-4 text-center align-middle">{index + 1}</td>
                    <td className="px-3 py-4">
                      {row.bangla ? <div className="text-base font-semibold text-slate-950 dark:text-white">{row.bangla} ({row.idfr_code})</div> : null}
                      <div className="text-slate-950 dark:text-white">{row.name || '-'} ({row.idfr_code || '-'})</div>
                      {row.father_bangla ? <div className="text-slate-600 dark:text-[#b6c0cf]">পি/স্বা: {row.father_bangla}</div> : null}
                      {row.mobile ? <div>{row.mobile}</div> : null}
                    </td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.sales))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.down_payment))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.previous_collection))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.installment))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.this_month_collection))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(balance)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500 dark:text-[#b6c0cf]">
                  No data found
                </td>
              </tr>
            )}
            {rows.length > 0 ? (
              <tr className="bg-slate-300 font-bold text-slate-950 dark:bg-[#3a4659] dark:text-white">
                <td colSpan={2} className="px-3 py-3 text-right">Grand Total</td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.sales)}</td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.downPayment)}</td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.previous)}</td>
                <td className="px-3 py-3 text-right"></td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.thisMonth)}</td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.balance)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="hidden">
        <CollectionSheetPrint
          ref={printRef}
          rows={rows}
          branchName={branchName}
          somityName={somityName}
          monthYear={formatMonthForRequest(monthYear)}
          statusLabel={statusLabel}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default CollectionSheet;
