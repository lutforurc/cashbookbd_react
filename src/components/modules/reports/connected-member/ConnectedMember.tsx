import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { FiCheckSquare, FiRefreshCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';

import Loader from '../../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import { API_REPORT_CONNECTED_MEMBER_DATA_URL } from '../../../services/apiRoutes';
import ConnectedMemberPrint, {
  ConnectedMemberGroup,
  ConnectedMemberRow,
  summarizeRows,
  toNumber,
} from './ConnectedMemberPrint';

const parseTransactionDate = (value?: string | null) => {
  if (!value) return new Date();
  const [day, month, year] = value.split('/').map((item) => Number(item.trim()));
  if (!day || !month || !year) return new Date();
  return new Date(year, month - 1, day);
};

const getFirstDayOfMonth = (date: Date | null) => {
  const source = date || new Date();
  return new Date(source.getFullYear(), source.getMonth(), 1);
};

const getGroupsFromResponse = (response: any): ConnectedMemberGroup[] => {
  const raw = response?.data?.data || response?.data || response;

  if (Array.isArray(raw)) {
    return raw.map((item: any, index: number) => ({
      employeeName: item?.employeeName || item?.emp_name_eng || `Employee ${index + 1}`,
      rows: Array.isArray(item?.rows) ? item.rows : [],
    }));
  }

  if (!raw || typeof raw !== 'object') return [];

  return Object.entries(raw).map(([employeeName, rows]) => ({
    employeeName,
    rows: Array.isArray(rows) ? (rows as ConnectedMemberRow[]) : [],
  }));
};

const percentage = (value: number, total: number) => {
  if (!total) return '0.00%';
  return `${((value / total) * 100).toFixed(2)}%`;
};

const ConnectedMember = (user: any) => {
  const dispatch = useDispatch();
  const printRef = useRef<HTMLDivElement>(null);
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [branchId, setBranchId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(getFirstDayOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [groups, setGroups] = useState<ConnectedMemberGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [fontSize, setFontSize] = useState(12);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    if (user?.user?.branch_id) {
      setBranchId(String(user.user.branch_id));
    }
  }, [dispatch, user?.user?.branch_id]);

  useEffect(() => {
    const transactionDate = branchDdlData?.protectedData?.transactionDate;
    if (transactionDate) {
      const parsedDate = parseTransactionDate(transactionDate);
      setStartDate(getFirstDayOfMonth(parsedDate));
      setEndDate(parsedDate);
    }
  }, [branchDdlData?.protectedData?.transactionDate]);

  const branchOptions = branchDdlData?.protectedData?.data || [];
  const branchName = useMemo(
    () => branchOptions.find((branch: any) => String(branch.id) === String(branchId))?.name || 'Selected Project',
    [branchOptions, branchId],
  );
  const grandTotal = useMemo(
    () => summarizeRows(groups.flatMap((group) => group.rows)),
    [groups],
  );

  const handleLoad = async () => {
    if (!branchId) {
      toast.info('Please select project.');
      return;
    }
    if (!startDate || !endDate) {
      toast.info('Please select start and end date.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpService.post(API_REPORT_CONNECTED_MEMBER_DATA_URL, {
        branch_id: branchId,
        startdate: dayjs(startDate).format('DD/MM/YYYY'),
        enddate: dayjs(endDate).format('DD/MM/YYYY'),
      });

      setGroups(getGroupsFromResponse(data));
      setExpandedGroups({});
    } catch (error: any) {
      setGroups([]);
      toast.error(error?.response?.data?.message || 'Connected member data load failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const parsedDate = parseTransactionDate(branchDdlData?.protectedData?.transactionDate);
    setBranchId(user?.user?.branch_id ? String(user.user.branch_id) : '');
    setStartDate(getFirstDayOfMonth(parsedDate));
    setEndDate(parsedDate);
    setGroups([]);
    setExpandedGroups({});
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Connected Member',
    removeAfterPrint: true,
  });

  const toggleGroup = (employeeName: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [employeeName]: !current[employeeName],
    }));
  };

  const controlClass =
    'h-9 w-full rounded-none border border-slate-600 bg-transparent px-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400 dark:border-[#465367] dark:bg-[#1c2735] dark:text-white dark:focus:border-slate-300';
  const labelClass = 'mb-1 block text-xs font-bold text-slate-950 dark:text-white';

  return (
    <div className="min-h-screen bg-slate-100 px-2 py-3 text-slate-900 dark:bg-[#18212e] dark:text-white">
      <HelmetTitle title="Connected Member" />
      <div className="mb-3 grid grid-cols-1 items-end gap-3 xl:grid-cols-[minmax(320px,1fr)_minmax(220px,0.45fr)_minmax(220px,0.45fr)_auto]">
          <div>
            <label className={labelClass}>Select Project</label>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={controlClass}>
              <option value="">Select Project</option>
              {branchOptions.map((branch: any) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Start Date</label>
            <InputDatePicker
              selectedDate={startDate}
              setSelectedDate={setStartDate}
              setCurrentDate={setStartDate}
              className="h-9 rounded-none !border !border-slate-600 bg-transparent px-3 text-sm font-bold dark:!border-[#465367] dark:!bg-[#1c2735]"
            />
          </div>

          <div>
            <label className={labelClass}>End Date</label>
            <InputDatePicker
              selectedDate={endDate}
              setSelectedDate={setEndDate}
              setCurrentDate={setEndDate}
              className="h-9 rounded-none !border !border-slate-600 bg-transparent px-3 text-sm font-bold dark:!border-[#465367] dark:!bg-[#1c2735]"
            />
          </div>

        <div className="grid min-w-max grid-cols-[auto_auto_72px_72px_auto] items-end gap-2 overflow-x-auto xl:ml-auto">
          <ButtonLoading onClick={handleLoad} buttonLoading={loading} label="Apply" icon={<FiCheckSquare />} className="h-9 px-5" />
          <ButtonLoading onClick={handleReset} buttonLoading={false} label="Reset" icon={<FiRefreshCcw />} className="h-9 px-4" />
          <div>
            <label htmlFor="connected-member-rows" className={labelClass}>Rows</label>
            <InputElement
              id="connected-member-rows"
              name="connected-member-rows"
              label=""
              value={String(rowsPerPage)}
              onChange={(event: any) => setRowsPerPage(Number(event.target.value) || 20)}
              type="text"
              className="h-9 !w-full rounded-none text-center text-sm font-bold"
            />
          </div>
          <div>
            <label htmlFor="connected-member-font" className={labelClass}>Font</label>
            <InputElement
              id="connected-member-font"
              name="connected-member-font"
              label=""
              value={String(fontSize)}
              onChange={(event: any) => setFontSize(Number(event.target.value) || 12)}
              type="text"
              className="h-9 !w-full rounded-none text-center text-sm font-bold"
            />
          </div>
          <PrintButton onClick={handlePrint} label="Print" className="h-9 px-6" disabled={groups.length === 0} />
        </div>
      </div>

      {loading ? (
        <div className="py-12"><Loader /></div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-[#1d2735]">
          <table className="w-full min-w-[1180px] table-fixed border-collapse text-sm" style={{ fontSize }}>
            <thead>
              <tr className="bg-slate-300 text-xs font-bold uppercase text-slate-950 dark:bg-[#3a4659] dark:text-white">
                <th className="w-16 px-3 py-3 text-center">Sl. No.</th>
                <th className="px-3 py-3 text-left">Area</th>
                <th className="w-32 px-3 py-3 text-center">Pay Member</th>
                <th className="w-28 px-3 py-3 text-center">GT Member</th>
                <th className="w-28 px-3 py-3 text-right">Collection</th>
                <th className="w-28 px-3 py-3 text-right">DP (Coll)</th>
                <th className="w-28 px-3 py-3 text-right">DP + Coll</th>
                <th className="w-28 px-3 py-3 text-right">Salary</th>
                <th className="w-32 px-3 py-3 text-right">Outstanding</th>
                <th className="w-28 px-3 py-3 text-center">Overview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 dark:divide-[#2e394b] dark:text-[#d7deea]">
              {groups.length > 0 ? (
                groups.map((group, groupIndex) => {
                  const summary = summarizeRows(group.rows);
                  const isExpanded = Boolean(expandedGroups[group.employeeName]);

                  return (
                    <Fragment key={`${group.employeeName}-${groupIndex}`}>
                      <tr
                        onClick={() => toggleGroup(group.employeeName)}
                        className="cursor-pointer bg-[#1d2735] font-bold text-[#d7deea] transition hover:bg-[#263447]"
                      >
                        <td className="px-3 py-3 text-center text-base font-bold text-slate-300">
                          {isExpanded ? '-' : '+'}
                        </td>
                        <td className="px-3 py-3 text-left">{group.employeeName}</td>
                        <td className="px-3 py-3 text-center">{summary.connectedMember} ({summary.payMemberPct})</td>
                        <td className="px-3 py-3 text-center">{summary.gtMember}</td>
                        <td className="px-3 py-3 text-right">{thousandSeparator(summary.collection)}</td>
                        <td className="px-3 py-3 text-right">{thousandSeparator(summary.downpayment)}</td>
                        <td className="px-3 py-3 text-right">{thousandSeparator(summary.collectionWithDp)}</td>
                        <td className="px-3 py-3 text-right">{thousandSeparator(summary.salary)}</td>
                        <td className="px-3 py-3 text-right">{thousandSeparator(summary.outstanding)}</td>
                        <td className="px-3 py-3 text-center">{summary.overview}</td>
                      </tr>

                      {isExpanded && group.rows.map((row, rowIndex) => {
                        const collection = toNumber(row.collection);
                        const downpayment = toNumber(row.downpayment);
                        const outstanding = toNumber(row.out_standing);
                        const collectionWithDp = collection + downpayment;

                        return (
                          <tr key={`${group.employeeName}-${row.area_code}-${rowIndex}`} className="bg-[#202b3a] text-[#d7deea]">
                            <td className="px-3 py-3 text-center">{rowIndex + 1}</td>
                            <td className="px-3 py-3 text-left">
                              <div>{row.area_name_eng} ({row.area_code})</div>
                              {row.area_name_bng ? <div className="sutonny-text text-[18px] leading-5">{row.area_name_bng} ({row.area_code})</div> : null}
                            </td>
                            <td className="px-3 py-3 text-center">{toNumber(row.connected_member)} ({percentage(toNumber(row.connected_member), toNumber(row.gt_member))})</td>
                            <td className="px-3 py-3 text-center">{toNumber(row.gt_member)}</td>
                            <td className="px-3 py-3 text-right">{thousandSeparator(collection)}</td>
                            <td className="px-3 py-3 text-right">{thousandSeparator(downpayment)}</td>
                            <td className="px-3 py-3 text-right">{thousandSeparator(collectionWithDp)}</td>
                            <td className="px-3 py-3 text-right">{thousandSeparator(collectionWithDp * 0.05)}</td>
                            <td className="px-3 py-3 text-right">{thousandSeparator(outstanding)}</td>
                            <td className="px-3 py-3 text-center">{percentage(collection, outstanding)}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-500 dark:text-slate-300">No data found</td>
                </tr>
              )}
            </tbody>
            {groups.length > 0 ? (
              <tfoot className="bg-slate-300 font-bold text-slate-950 dark:bg-[#3a4659] dark:text-white">
                <tr>
                  <td colSpan={2} className="px-3 py-3 text-right text-lg">Grand Total</td>
                  <td className="px-3 py-3 text-center">{grandTotal.connectedMember}</td>
                  <td className="px-3 py-3 text-center">{grandTotal.gtMember}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(grandTotal.collection)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(grandTotal.downpayment)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(grandTotal.collectionWithDp)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(grandTotal.salary)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(grandTotal.outstanding)}</td>
                  <td className="px-3 py-3 text-center">{grandTotal.overview}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}

      <div className="hidden">
        <ConnectedMemberPrint
          ref={printRef}
          groups={groups}
          branchName={branchName}
          startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : '-'}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default ConnectedMember;
