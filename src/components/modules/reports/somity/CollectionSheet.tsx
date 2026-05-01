import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { FiArrowLeft, FiHome, FiPrinter, FiRefreshCw } from 'react-icons/fi';
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

  return (
    <div>
      <HelmetTitle title="Collection Sheet" />

      <div className="mb-4 text-center text-lg font-medium text-slate-900 dark:text-white">Collection Sheet</div>

      <div className="mb-5 grid grid-cols-1 items-end gap-4 md:grid-cols-12">
        <div className="md:col-span-3">
          <label className="mb-1 block text-sm font-semibold text-slate-900 dark:text-white">Select Branch <span className="text-red-500">*</span></label>
          {branchDdlData?.isLoading && <Loader />}
          <BranchDropdown
            onChange={(event: any) => setBranchId(event.target.value)}
            value={branchId}
            className="h-10 w-full bg-transparent text-sm font-medium"
            branchDdl={branchOptions}
          />
        </div>

        <div className="md:col-span-4">
          <DropdownCommon
            id="somity_id"
            name="somity_id"
            label="Select Somity *"
            value={somityId}
            onChange={(event) => setSomityId(event.target.value)}
            className="h-10 bg-transparent"
            data={somityOptions}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-slate-900 dark:text-white">Start Month <span className="text-red-500">*</span></label>
          <input
            type="month"
            value={monthYear}
            onChange={(event) => setMonthYear(event.target.value)}
            className="h-10 w-full rounded-xs border border-gray-300 bg-transparent px-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-form-strokedark dark:text-white"
          />
        </div>

        <div className="md:col-span-2">
          <DropdownCommon
            id="type_id"
            name="type_id"
            label="Status *"
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
            className="h-10 bg-transparent"
            data={statusOptions}
          />
        </div>

        <div className="flex items-center justify-end gap-3 md:col-span-1">
          <button type="button" onClick={handleLoad} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-800 shadow hover:bg-slate-300 dark:bg-slate-700 dark:text-white" title="Load data">
            <FiRefreshCw size={18} />
          </button>
          <button type="button" onClick={handlePrint} disabled={rows.length === 0} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-800 shadow hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-white" title="Print">
            <FiPrinter size={18} />
          </button>
          <button type="button" onClick={() => navigate(-1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800 shadow hover:bg-slate-200 dark:bg-slate-700 dark:text-white" title="Back">
            <FiArrowLeft size={18} />
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow hover:bg-slate-100 dark:bg-slate-700 dark:text-white" title="Home">
            <FiHome size={18} />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap justify-end gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          Rows
          <input type="number" min={1} value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value) || 16)} className="h-8 w-20 rounded-xs border border-gray-300 bg-transparent px-2 text-center dark:border-form-strokedark" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          Font
          <input type="number" min={8} value={fontSize} onChange={(event) => setFontSize(Number(event.target.value) || 11)} className="h-8 w-20 rounded-xs border border-gray-300 bg-transparent px-2 text-center dark:border-form-strokedark" />
        </label>
      </div>

      <div className="overflow-x-auto">
        {loading ? <Loader /> : null}
        <table className="w-full min-w-[980px] table-fixed border-collapse bg-white dark:bg-boxdark">
          <thead>
            <tr className="bg-green-700 text-white">
              <th className="w-20 border border-slate-200 px-3 py-4 text-center">Sl. No.</th>
              <th className="border border-slate-200 px-3 py-4 text-left">Member Details</th>
              <th className="w-36 border border-slate-200 px-3 py-4 text-left">Total Sales</th>
              <th className="w-40 border border-slate-200 px-3 py-4 text-left">Down Payment</th>
              <th className="w-36 border border-slate-200 px-3 py-4 text-left">Prv. Coll.</th>
              <th className="w-36 border border-slate-200 px-3 py-4 text-left">Installment</th>
              <th className="w-36 border border-slate-200 px-3 py-4 text-left">This Month</th>
              <th className="w-36 border border-slate-200 px-3 py-4 text-left">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => {
                const balance =
                  toNumber(row.sales) -
                  toNumber(row.down_payment) -
                  toNumber(row.previous_collection) -
                  toNumber(row.this_month_collection);

                return (
                  <tr key={`${row.idfr_code ?? index}-${index}`} className={balance === 0 ? 'bg-green-50 font-semibold dark:bg-green-900/20' : ''}>
                    <td className="border border-slate-200 px-3 py-4 text-center align-middle dark:border-slate-700">{index + 1}</td>
                    <td className="border border-slate-200 px-3 py-4 dark:border-slate-700">
                      {row.bangla ? <div className="text-base font-medium">{row.bangla} ({row.idfr_code})</div> : null}
                      <div>{row.name || '-'} ({row.idfr_code || '-'})</div>
                      {row.father_bangla ? <div>পি/স্বা: {row.father_bangla}</div> : null}
                      {row.mobile ? <div>{row.mobile}</div> : null}
                    </td>
                    <td className="border border-slate-200 px-3 py-4 text-right align-middle dark:border-slate-700">{thousandSeparator(toNumber(row.sales))}</td>
                    <td className="border border-slate-200 px-3 py-4 text-right align-middle dark:border-slate-700">{thousandSeparator(toNumber(row.down_payment))}</td>
                    <td className="border border-slate-200 px-3 py-4 text-right align-middle dark:border-slate-700">{thousandSeparator(toNumber(row.previous_collection))}</td>
                    <td className="border border-slate-200 px-3 py-4 text-right align-middle dark:border-slate-700">{thousandSeparator(toNumber(row.installment))}</td>
                    <td className="border border-slate-200 px-3 py-4 text-right align-middle dark:border-slate-700">{thousandSeparator(toNumber(row.this_month_collection))}</td>
                    <td className="border border-slate-200 px-3 py-4 text-right align-middle dark:border-slate-700">{thousandSeparator(balance)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="border border-slate-200 px-3 py-8 text-center text-slate-500 dark:border-slate-700">
                  No data found
                </td>
              </tr>
            )}
            {rows.length > 0 ? (
              <tr className="font-bold">
                <td colSpan={2} className="border border-slate-200 px-3 py-3 text-right dark:border-slate-700">Grand Total</td>
                <td className="border border-slate-200 px-3 py-3 text-right dark:border-slate-700">{thousandSeparator(totals.sales)}</td>
                <td className="border border-slate-200 px-3 py-3 text-right dark:border-slate-700">{thousandSeparator(totals.downPayment)}</td>
                <td className="border border-slate-200 px-3 py-3 text-right dark:border-slate-700">{thousandSeparator(totals.previous)}</td>
                <td className="border border-slate-200 px-3 py-3 text-right dark:border-slate-700"></td>
                <td className="border border-slate-200 px-3 py-3 text-right dark:border-slate-700">{thousandSeparator(totals.thisMonth)}</td>
                <td className="border border-slate-200 px-3 py-3 text-right dark:border-slate-700">{thousandSeparator(totals.balance)}</td>
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
