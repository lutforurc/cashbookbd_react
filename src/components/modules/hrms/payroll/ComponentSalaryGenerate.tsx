import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiSearch, FiTrash2 } from 'react-icons/fi';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import MultiSelectDropdown from '../../../utils/utils-functions/MultiSelectDropdown';
import MonthDropdown from '../../../utils/components/MonthDropdown';
import Table from '../../../utils/others/Table';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchEmployeeSettings } from '../employee/employeeSlice';
import { fetchPayrollPreview, generatePayroll } from './payrollSlice';

/**
 * Salary Generate, priced by the component engine.
 *
 * ⚠️ THE FIGURES COME FROM THE SERVER. Every amount in this table is what
 * POST /salary/preview answered; the screen only sends adjustments (loan, other
 * deduction, a removed employee) back. Recomputing a figure here would give two
 * formulas again, which is exactly what the component engine exists to end.
 *
 * ⚠️ IT IS ONLY RENDERED ON A BRANCH THAT OPTED IN. SalarySheetGenerate hands
 * over to this only when the branch's payroll_engine flag says 'components';
 * otherwise the old screen runs, unchanged.
 */
interface ComponentSalaryGenerateProps {
  user: any;
  branchId: string | number;
  monthId: string;
  monthText: string;
  salarySheetType: string;
  branchDropdown: any[];
  designationLevels: any[];
  designationLevelOptions: any[];
  onBranchChange: (value: string | number) => void;
  onMonthChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onSheetTypeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onLevelsChange: (levels: any[]) => void;
  onGenerated: () => void;
}

interface RowDraft {
  employee_id: number;
  loan_deduction: string;
  others_deduction: string;
  removed: boolean;
}

const ComponentSalaryGenerate: React.FC<ComponentSalaryGenerateProps> = ({
  branchId,
  monthId,
  monthText,
  salarySheetType,
  branchDropdown,
  designationLevels,
  designationLevelOptions,
  onBranchChange,
  onMonthChange,
  onSheetTypeChange,
  onLevelsChange,
  onGenerated,
}) => {
  const dispatch = useDispatch<any>();
  const preview = useSelector((state: any) => state.payroll?.preview) as any;
  const isLoading = useSelector((state: any) => state.payroll?.isLoading) as boolean;

  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchEmployeeSettings());
  }, [dispatch]);

  const rows: any[] = preview?.rows || [];

  /**
   * The earning columns, in the order the server priced them.
   *
   * Built from what the rows actually contain rather than from the pay-head
   * master: a pay head nobody on this sheet has should not take a column.
   */
  const earningColumns = useMemo(() => {
    const seen = new Map<string, string>();

    rows.forEach((row: any) => {
      (row.components || []).forEach((line: any) => {
        if (line.component_type === 'earning' && !seen.has(line.component_code)) {
          seen.set(line.component_code, line.component_name);
        }
      });
    });

    return Array.from(seen.entries()).map(([code, name]) => ({ code, name }));
  }, [rows]);

  const amountOf = (row: any, code: string) => {
    const line = (row.components || []).find((item: any) => item.component_code === code);

    return Number(line?.amount ?? 0);
  };

  const draftOf = (row: any): RowDraft =>
    drafts[row.employee_id] || {
      employee_id: row.employee_id,
      loan_deduction: String(row.loan_deduction ?? 0),
      others_deduction: String(row.others_deduction ?? 0),
      removed: false,
    };

  const updateDraft = (employeeId: number, patch: Partial<RowDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] || draftOf({ employee_id: employeeId })), ...patch },
    }));
  };

  /**
   * The row as it will be paid: the server's figures with this screen's typed
   * adjustments applied. Totals are shown from here so the footer moves as a
   * loan is edited, but nothing is recalculated that the server priced.
   */
  const payableRows = useMemo(() => {
    return rows
      .filter((row: any) => !draftOf(row).removed)
      .map((row: any) => {
        const draft = draftOf(row);
        const loan = Number(draft.loan_deduction || 0);
        const others = Number(draft.others_deduction || 0);

        const totalDeduction = Number(row.total_deduction || 0)
          - Number(row.loan_deduction || 0)
          - Number(row.others_deduction || 0)
          + loan
          + others;

        return {
          ...row,
          loan_deduction: loan,
          others_deduction: others,
          total_deduction: totalDeduction,
          net: Number(row.gross || 0) - totalDeduction,
        };
      });
  }, [rows, drafts]);

  const totals = useMemo(
    () =>
      payableRows.reduce(
        (acc: any, row: any) => {
          acc.gross += Number(row.gross || 0);
          acc.deduction += Number(row.total_deduction || 0);
          acc.net += Number(row.net || 0);
          acc.attendance_deduction += Number(row.attendance_deduction || 0);
          return acc;
        },
        { gross: 0, deduction: 0, net: 0, attendance_deduction: 0 },
      ),
    [payableRows],
  );

  const handleSearch = async () => {
    if (!monthId) {
      toast.info('Please select month');
      return;
    }

    setSearchLoading(true);
    setDrafts({});

    try {
      await dispatch(
        fetchPayrollPreview({
          branch_id: Number(branchId),
          level_ids: designationLevels.map((level: any) => level.value),
          month_id: monthId,
          salary_sheet_type: salarySheetType,
        }),
      ).unwrap();
    } catch (error: any) {
      toast.error(error || 'Failed to preview the salary sheet');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!branchId || !monthId) return;

    const removed = Object.values(drafts)
      .filter((draft) => draft.removed)
      .map((draft) => draft.employee_id);

    const adjustments = Object.values(drafts)
      .filter((draft) => !draft.removed)
      .flatMap((draft) => {
        const changes = [];
        const source = rows.find((row: any) => row.employee_id === draft.employee_id);

        if (source && Number(draft.loan_deduction || 0) !== Number(source.loan_deduction || 0)) {
          changes.push({
            employee_id: draft.employee_id,
            component_code: 'loan_deduction',
            amount: Number(draft.loan_deduction || 0),
          });
        }

        if (source && Number(draft.others_deduction || 0) !== Number(source.others_deduction || 0)) {
          changes.push({
            employee_id: draft.employee_id,
            component_code: 'other_deduction',
            amount: Number(draft.others_deduction || 0),
          });
        }

        return changes;
      });

    setSaveLoading(true);

    try {
      const response = await dispatch(
        generatePayroll({
          branch_id: Number(branchId),
          level_ids: designationLevels.map((level: any) => level.value),
          month_id: monthId,
          salary_sheet_type: salarySheetType,
          employee_ids: payableRows.map((row: any) => row.employee_id),
          adjustments,
          excluded_employee_ids: removed,
        }),
      ).unwrap();

      toast.success(response?.message || 'Salary generated successfully');
      setDrafts({});
      onGenerated();
    } catch (error: any) {
      toast.error(error || 'Failed to generate the salary sheet');
    } finally {
      setSaveLoading(false);
      setShowConfirm(false);
    }
  };

  const columns = [
    {
      key: 'employee_serial',
      header: 'Sl',
      headerClass: 'text-center w-16',
      cellClass: 'text-center',
    },
    {
      key: 'employee_name',
      header: 'Name of Employee',
      render: (row: any) => (
        <>
          <div className="font-semibold">{row.employee_name}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{row.designation_name}</div>
        </>
      ),
    },
    {
      key: 'month_days',
      header: 'Month Days',
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
    {
      key: 'payable_days',
      header: 'Working Day',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => Number(row.payable_days || 0).toFixed(2).replace(/\.00$/, ''),
    },
    ...earningColumns.map((column) => ({
      key: `earning_${column.code}`,
      header: column.name,
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => thousandSeparator(amountOf(row, column.code)),
    })),
    {
      key: 'gross',
      header: 'Total',
      headerClass: 'text-right',
      cellClass: 'text-right font-semibold text-green-700 dark:text-green-400',
      render: (row: any) => thousandSeparator(row.gross),
    },
    {
      key: 'loan_deduction',
      header: 'Loan Ded.',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <input
          type="text"
          inputMode="numeric"
          value={draftOf(row).loan_deduction}
          onChange={(event) =>
            updateDraft(row.employee_id, {
              loan_deduction: event.target.value.replace(/[^\d.]/g, ''),
            })
          }
          className="w-24 rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-right"
        />
      ),
    },
    {
      key: 'attendance_deduction',
      header: 'Att. Ded',
      headerClass: 'text-right',
      cellClass: 'text-right font-semibold text-red-700 dark:text-red-400',
      render: (row: any) =>
        row.is_daily_labour ? '-' : thousandSeparator(row.attendance_deduction),
    },
    {
      key: 'others_deduction',
      header: 'Other Ded.',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <input
          type="text"
          inputMode="numeric"
          value={draftOf(row).others_deduction}
          onChange={(event) =>
            updateDraft(row.employee_id, {
              others_deduction: event.target.value.replace(/[^\d.]/g, ''),
            })
          }
          className="w-24 rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-right"
        />
      ),
    },
    {
      key: 'net',
      header: 'Net Salary',
      headerClass: 'text-right',
      cellClass: 'text-right font-bold text-green-700 dark:text-green-400',
      render: (row: any) => {
        const draft = draftOf(row);
        const loan = Number(draft.loan_deduction || 0);
        const others = Number(draft.others_deduction || 0);
        const total =
          Number(row.total_deduction || 0)
          - Number(row.loan_deduction || 0)
          - Number(row.others_deduction || 0)
          + loan
          + others;

        return thousandSeparator(Number(row.gross || 0) - total);
      },
    },
    {
      key: 'actions',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <button
          type="button"
          title={`Remove ${row.employee_name} from this sheet`}
          onClick={() => updateDraft(row.employee_id, { removed: true })}
          className="text-red-600 hover:text-red-800"
        >
          <FiTrash2 className="block h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex max-w-280 flex-wrap">
            <BranchDropdown
              defaultValue={branchId?.toString()}
              onChange={(event: any) => onBranchChange(event.target.value === '' ? '' : Number(event.target.value))}
              className="mr-2 w-60 p-2 text-sm font-medium"
              branchDdl={branchDropdown}
            />

            <div className="mr-2 w-full">
              <MultiSelectDropdown
                options={designationLevelOptions}
                value={designationLevels}
                onChange={onLevelsChange}
                className="w-60"
              />
            </div>

            <div className="mr-2">
              <DropdownCommon
                id="salary_sheet_type"
                name="salary_sheet_type"
                value={salarySheetType}
                data={[
                  { id: 'monthly', name: 'Monthly Salary' },
                  { id: 'overtime', name: 'Overtime Salary' },
                ]}
                onChange={onSheetTypeChange}
                className="h-[2.3rem] min-w-40 bg-transparent"
              />
            </div>

            <div className="mr-2">
              <MonthDropdown
                id="month_id"
                name="month_id"
                value={monthId}
                className="ml-2 mr-2 h-[2.3rem] min-w-35 bg-transparent"
                onChange={onMonthChange}
              />
            </div>

            <ButtonLoading
              onClick={handleSearch}
              buttonLoading={searchLoading}
              disabled={searchLoading}
              label="Search"
              icon={<FiSearch className="mr-2" />}
              className="mr-2 ml-2 whitespace-nowrap p-2"
            />
          </div>

          <div className="flex gap-2">
            {branchId && rows.length > 0 ? (
              <ButtonLoading
                onClick={() => setShowConfirm(true)}
                buttonLoading={saveLoading}
                label="Salary Generate"
                className="whitespace-nowrap"
                icon={<FiCheckSquare className="mr-2" />}
              />
            ) : null}
          </div>
        </div>
      </div>

      {isLoading && <Loader />}

      <div className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
        <Table columns={columns} data={payableRows} getRowKey={(row: any) => row.employee_id} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--c-border))] bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <div>
            Total Employees:{' '}
            <span className="font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
              {payableRows.length}
            </span>
          </div>

          <div className="flex flex-wrap justify-end gap-x-6 gap-y-1">
            <div>
              Total Salary:{' '}
              <span className="font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {thousandSeparator(totals.gross)}
              </span>
            </div>
            <div>
              Att. Deduction:{' '}
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {thousandSeparator(totals.attendance_deduction)}
              </span>
            </div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">
              Net Total: {thousandSeparator(totals.net)}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        show={showConfirm}
        title="Confirm Salary Generation"
        message={
          <>
            Proceed with salary for{' '}
            <span className="mt-1 font-bold">{monthText}</span>
            <span className="mt-2 block text-sm">
              {payableRows.length} employee(s) will be paid from the component engine.
            </span>
          </>
        }
        loading={saveLoading}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleGenerate}
        className="bg-blue-400 hover:bg-blue-500"
      />
    </div>
  );
};

export default ComponentSalaryGenerate;
