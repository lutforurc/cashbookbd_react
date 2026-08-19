import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { FiCheckSquare, FiRotateCcw, FiTrendingUp } from 'react-icons/fi';

import Loader from '../../../../common/Loader';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';

interface ProjectData {
  project_id: number;
  project_name: string;
  total_expense: number;
  total_income: number;
  total_purchase: number;
  total_labour: number;
  total_units: number;
  sold_units: number;
  unsold_units: number;
  received_amount: number;
  outstanding_amount: number;
}

const fmt = (value: any) => {
  const num = Number(value) || 0;
  return num === 0 ? '0' : thousandSeparator(Math.round(num));
};

const ProjectSummaryReport = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const authUser = user?.user ?? user;
  const printRef = useRef<HTMLDivElement>(null);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [projectData, setProjectData] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data && branchDdlData?.protectedData?.transactionDate) {
      setDropdownData(branchDdlData.protectedData.data);
      const [day, month, year] = branchDdlData.protectedData.transactionDate.split("/");
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(parsedDate);
      setEndDate(parsedDate);
      if (authUser?.branch_id) setBranchId(authUser.branch_id);
    }
  }, [branchDdlData?.protectedData, authUser?.branch_id]);

  const handleLoad = async () => {
    if (!branchId) {
      setError("Branch select korun");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: any = { branch_id: branchId };
      if (startDate) params.start_date = dayjs(startDate).format("YYYY-MM-DD");
      if (endDate) params.end_date = dayjs(endDate).format("YYYY-MM-DD");

      const response = await httpService.get("/real-estate/reports/project-summary-all", { params });

      if (response.data?.success) {
        const dataWrapper = response.data?.data || {};
        const projectArray = Array.isArray(dataWrapper?.data) ? dataWrapper.data : (Array.isArray(dataWrapper) ? dataWrapper : []);
        setProjectData(projectArray);
        if (!projectArray || projectArray.length === 0) {
          setError("No projects found for selected criteria");
        }
      } else {
        setError(response.data?.message || "Failed to load project summary");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Project summary load failed");
      setProjectData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProjectData([]);
    setError(null);
    if (authUser?.branch_id) setBranchId(authUser.branch_id);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Project Summary - ${dayjs(endDate).format("DD-MM-YYYY")}`,
  });

  const totals = projectData.reduce(
    (acc, p) => ({
      expense: acc.expense + (p.total_expense || 0),
      income: acc.income + (p.total_income || 0),
      purchase: acc.purchase + (p.total_purchase || 0),
      labour: acc.labour + (p.total_labour || 0),
      units: acc.units + (p.total_units || 0),
      sold: acc.sold + (p.sold_units || 0),
      received: acc.received + (p.received_amount || 0),
      outstanding: acc.outstanding + (p.outstanding_amount || 0),
    }),
    { expense: 0, income: 0, purchase: 0, labour: 0, units: 0, sold: 0, received: 0, outstanding: 0 }
  );

  return (
    <div>
      <HelmetTitle title="Project Summary Report" />

      <div className="py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Branch
            </label>
            {branchDdlData.isLoading ? <Loader /> : null}
            <BranchDropdown
              onChange={(e: any) => setBranchId(e.target.value)}
              value={branchId == null ? "" : String(branchId)}
              className="w-full font-medium text-sm p-2 h-10 min-w-[260px]"
              branchDdl={dropdownData}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Start Date
            </label>
            <InputDatePicker
              setCurrentDate={setStartDate}
              className="font-medium text-sm w-full h-10 min-w-[220px]"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              End Date
            </label>
            <InputDatePicker
              setCurrentDate={setEndDate}
              className="font-medium text-sm w-full h-10 min-w-[220px]"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>

          <div className="flex items-center gap-2">
            <ButtonLoading
              onClick={handleLoad}
              buttonLoading={loading}
              label="Apply"
              icon={<FiCheckSquare />}
              className="h-10 px-6"
            />
            <ButtonLoading
              onClick={handleReset}
              buttonLoading={false}
              label="Reset"
              icon={<FiRotateCcw />}
              className="h-10 px-4"
            />
            <PrintButton onClick={handlePrint} label="Print" className="h-10 px-6" disabled={!projectData.length} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? <Loader /> : null}
        <table className="min-w-full table-fixed border-collapse text-left text-sm text-gray-700 dark:text-gray-300">
          <thead className="bg-gray-300 text-xs uppercase text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th className="w-[200px] px-3 py-3 font-semibold">Project</th>
              <th className="w-[110px] px-3 py-3 text-right font-semibold">Expense</th>
              <th className="w-[110px] px-3 py-3 text-right font-semibold">Income</th>
              <th className="w-[110px] px-3 py-3 text-right font-semibold">Purchase</th>
              <th className="w-[110px] px-3 py-3 text-right font-semibold">Labour</th>
              <th className="w-[100px] px-3 py-3 text-center font-semibold">Units</th>
              <th className="w-[100px] px-3 py-3 text-center font-semibold">Sold</th>
              <th className="w-[110px] px-3 py-3 text-right font-semibold">Received</th>
              <th className="w-[110px] px-3 py-3 text-right font-semibold">Outstanding</th>
              <th className="w-[110px] px-3 py-3 text-right font-semibold">P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {projectData.length ? (
              projectData.map((project, idx) => {
                const pl = project.total_income - project.total_expense;
                return (
                  <tr key={project.project_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 font-medium">{project.project_name}</td>
                    <td className="px-3 py-2 text-right">{fmt(project.total_expense)}</td>
                    <td className="px-3 py-2 text-right">{fmt(project.total_income)}</td>
                    <td className="px-3 py-2 text-right">{fmt(project.total_purchase)}</td>
                    <td className="px-3 py-2 text-right">{fmt(project.total_labour)}</td>
                    <td className="px-3 py-2 text-center">{project.total_units}</td>
                    <td className="px-3 py-2 text-center">{project.sold_units}</td>
                    <td className="px-3 py-2 text-right">{fmt(project.received_amount)}</td>
                    <td className="px-3 py-2 text-right text-orange-600 dark:text-orange-400">{fmt(project.outstanding_amount)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${pl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {pl >= 0 ? '+' : ''}{fmt(pl)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="py-4 text-center text-gray-500 dark:text-gray-400">
                  No data to display
                </td>
              </tr>
            )}
          </tbody>
          {projectData.length ? (
            <tfoot className="bg-slate-50 text-sm font-semibold text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
              <tr>
                <td className="px-3 py-3">Total</td>
                <td className="px-3 py-3 text-right">{fmt(totals.expense)}</td>
                <td className="px-3 py-3 text-right">{fmt(totals.income)}</td>
                <td className="px-3 py-3 text-right">{fmt(totals.purchase)}</td>
                <td className="px-3 py-3 text-right">{fmt(totals.labour)}</td>
                <td className="px-3 py-3 text-center">{totals.units}</td>
                <td className="px-3 py-3 text-center">{totals.sold}</td>
                <td className="px-3 py-3 text-right">{fmt(totals.received)}</td>
                <td className="px-3 py-3 text-right text-orange-600 dark:text-orange-400">{fmt(totals.outstanding)}</td>
                <td className={`px-3 py-3 text-right ${(totals.income - totals.expense) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(totals.income - totals.expense) >= 0 ? '+' : ''}{fmt(totals.income - totals.expense)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div ref={printRef} className="hidden p-6 bg-white">
        <h2 className="text-lg font-bold mb-4">Project Summary Report</h2>
        <p className="mb-4 text-sm text-gray-600">
          {startDate && endDate && `Period: ${dayjs(startDate).format('DD/MM/YYYY')} to ${dayjs(endDate).format('DD/MM/YYYY')}`}
        </p>
        <table className="min-w-full border-collapse text-left text-sm border border-gray-400">
          <thead className="bg-gray-300">
            <tr>
              <th className="border border-gray-400 px-3 py-2 font-semibold">Project</th>
              <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Expense</th>
              <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Income</th>
              <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Purchase</th>
              <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Labour</th>
              <th className="border border-gray-400 px-3 py-2 text-center font-semibold">Units</th>
              <th className="border border-gray-400 px-3 py-2 text-center font-semibold">Sold</th>
              <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Received</th>
              <th className="border border-gray-400 px-3 py-2 text-right font-semibold">Outstanding</th>
              <th className="border border-gray-400 px-3 py-2 text-right font-semibold">P&L</th>
            </tr>
          </thead>
          <tbody>
            {projectData.map((project) => {
              const pl = project.total_income - project.total_expense;
              return (
                <tr key={project.project_id}>
                  <td className="border border-gray-400 px-3 py-2">{project.project_name}</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">{fmt(project.total_expense)}</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">{fmt(project.total_income)}</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">{fmt(project.total_purchase)}</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">{fmt(project.total_labour)}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{project.total_units}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{project.sold_units}</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">{fmt(project.received_amount)}</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">{fmt(project.outstanding_amount)}</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">{pl >= 0 ? '+' : ''}{fmt(pl)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectSummaryReport;
