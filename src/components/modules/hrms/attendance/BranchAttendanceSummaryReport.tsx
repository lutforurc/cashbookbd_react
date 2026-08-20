import React, { useEffect, useMemo, useState } from 'react';
import { FiRefreshCcw } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';

import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchMonthlyAttendanceSummary } from './attendanceSlice';
import { Button } from '../../../../pages/UiElements/CustomButtons';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const commandButtonClass = 'min-w-25 rounded-none bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600 focus:bg-slate-600';
const numberValue = (value: any) => Number(value || 0);
const summaryNumber = (value: any) => {
  const numericValue = numberValue(value);
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1);
};

const cardTone = (label: string) => {
  const map: Record<string, { bar: string; value: string; dot: string }> = {
    Branches: { bar: 'bg-cyan-500', value: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500' },
    Employees: { bar: 'bg-indigo-500', value: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
    Present: { bar: 'bg-emerald-500', value: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
    Absent: { bar: 'bg-rose-500', value: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
    Leave: { bar: 'bg-violet-500', value: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
    Late: { bar: 'bg-amber-500', value: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
    'Early Out': { bar: 'bg-orange-500', value: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    Deduction: { bar: 'bg-rose-500', value: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  };
  return map[label] || { bar: 'bg-slate-400', value: 'text-slate-900 dark:text-[rgb(var(--c-text))]', dot: 'bg-slate-400' };
};

const BranchAttendanceSummaryReport = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const summaryRows = Array.isArray(attendance.monthlySummary?.rows) ? attendance.monthlySummary.rows : [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';
  const now = new Date();

  const [filters, setFilters] = useState({
    branch_id: userBranchId,
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  });

  const monthOptions = monthNames.map((name, index) => ({ id: String(index + 1), name }));
  const yearOptions = Array.from({ length: 5 }, (_, index) => {
    const optionYear = now.getFullYear() - index;
    return { id: String(optionYear), name: String(optionYear) };
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const loadReport = (currentFilters = filters) => {
    dispatch(fetchMonthlyAttendanceSummary(currentFilters));
  };

  useEffect(() => {
    const nextFilters = {
      branch_id: userBranchId,
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
    };

    setFilters((prev) => ({
      ...prev,
      branch_id: prev.branch_id || userBranchId,
    }));
    loadReport(nextFilters);
  }, [dispatch, userBranchId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const branchRows = useMemo(() => {
    const grouped = new Map<string, any>();

    summaryRows.forEach((row: any) => {
      const branchId = String(row.branch_id || filters.branch_id || 'all');
      if (!grouped.has(branchId)) {
        grouped.set(branchId, {
          branch_id: branchId,
          branch_name: row.branch_name || branches.find((branch: any) => String(branch.id) === branchId)?.name || 'All Branches',
          employee_count: 0,
          working_days: 0,
          present_days: 0,
          paid_leave_days: 0,
          unpaid_leave_days: 0,
          absent_days: 0,
          late_count: 0,
          early_out_count: 0,
          half_days: 0,
          payable_days: 0,
          deduction_days: 0,
        });
      }

      const branch = grouped.get(branchId);
      branch.employee_count += 1;
      branch.working_days += numberValue(row.working_days);
      branch.present_days += numberValue(row.present_days);
      branch.paid_leave_days += numberValue(row.paid_leave_days);
      branch.unpaid_leave_days += numberValue(row.unpaid_leave_days);
      branch.absent_days += numberValue(row.absent_days);
      branch.late_count += numberValue(row.late_count);
      branch.early_out_count += numberValue(row.early_out_count);
      branch.half_days += numberValue(row.half_days);
      branch.payable_days += numberValue(row.payable_days);
      branch.deduction_days += numberValue(row.deduction_days);
    });

    return Array.from(grouped.values()).sort((a, b) => String(a.branch_name || '').localeCompare(String(b.branch_name || '')));
  }, [branches, filters.branch_id, summaryRows]);

  const totalRow = useMemo(() => branchRows.reduce((total: any, row: any) => {
    Object.keys(total).forEach((key) => {
      total[key] += numberValue(row[key]);
    });
    return total;
  }, {
    employee_count: 0,
    working_days: 0,
    present_days: 0,
    paid_leave_days: 0,
    unpaid_leave_days: 0,
    absent_days: 0,
    late_count: 0,
    early_out_count: 0,
    half_days: 0,
    payable_days: 0,
    deduction_days: 0,
  }), [branchRows]);

  const cards = [
    { label: 'Branches', value: branchRows.length },
    { label: 'Employees', value: totalRow.employee_count },
    { label: 'Present', value: summaryNumber(totalRow.present_days) },
    { label: 'Absent', value: summaryNumber(totalRow.absent_days) },
    { label: 'Leave', value: summaryNumber(totalRow.paid_leave_days + totalRow.unpaid_leave_days) },
    { label: 'Late', value: summaryNumber(totalRow.late_count) },
    { label: 'Early Out', value: summaryNumber(totalRow.early_out_count) },
    { label: 'Deduction', value: summaryNumber(totalRow.deduction_days) },
  ];

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index: number) => index + 1,
    },
    { key: 'branch_name', header: 'Branch/Project' },
    { key: 'employee_count', header: 'Employees', render: (row: any) => summaryNumber(row.employee_count) },
    { key: 'working_days', header: 'Working', render: (row: any) => summaryNumber(row.working_days) },
    { key: 'present_days', header: 'Present', render: (row: any) => summaryNumber(row.present_days) },
    { key: 'paid_leave_days', header: 'Paid Leave', render: (row: any) => summaryNumber(row.paid_leave_days) },
    { key: 'unpaid_leave_days', header: 'Unpaid Leave', render: (row: any) => summaryNumber(row.unpaid_leave_days) },
    { key: 'absent_days', header: 'Absent', render: (row: any) => summaryNumber(row.absent_days) },
    { key: 'late_count', header: 'Late', render: (row: any) => summaryNumber(row.late_count) },
    { key: 'early_out_count', header: 'Early Out', render: (row: any) => summaryNumber(row.early_out_count) },
    { key: 'half_days', header: 'Half Day', render: (row: any) => summaryNumber(row.half_days) },
    { key: 'payable_days', header: 'Payable', render: (row: any) => summaryNumber(row.payable_days) },
    { key: 'deduction_days', header: 'Deduction', render: (row: any) => summaryNumber(row.deduction_days) },
  ];

  return (
    <div>
      <HelmetTitle title="Branch Attendance Summary" />
      {attendance.loading && <Loader />}

      <div className="mb-3 border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch/Project</label>
          <BranchDropdown
 name="branch_id"
 defaultValue={userBranchId}
 branchDdl={[{ id: '', name: 'All Branches' }, ...branches]}
 value={filters.branch_id?.toString() ?? ''}
 onChange={handleChange}
 className="w-full font-medium text-sm p-2"
          />
        </div>
        <DropdownCommon id="month" name="month" label="Month" value={filters.month} data={monthOptions} onChange={handleChange} className="font-medium" />
        <DropdownCommon id="year" name="year" label="Year" value={filters.year} data={yearOptions} onChange={handleChange} className="font-medium" />
        <div className="flex items-end">
          <Button type="button" onClick={() => loadReport()} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
            <FiRefreshCcw className="mr-2" />
            Load
          </Button>
        </div>
      </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {cards.map((card) => {
          const tone = cardTone(card.label);
          return (
            <div key={card.label} className="relative overflow-hidden border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-3 pl-4">
              <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300">
                <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                {card.label}
              </div>
              <div className={`mt-1 text-xl font-bold ${tone.value}`}>{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
        <Table columns={columns} data={branchRows} />
      </div>
    </div>
  );
};

export default BranchAttendanceSummaryReport;
