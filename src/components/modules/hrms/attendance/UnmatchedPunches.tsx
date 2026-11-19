import React, { useEffect, useMemo, useState } from 'react';
import { FiLink2, FiRefreshCcw } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import Loader from '../../../../common/Loader';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import EmployeeDropdownSearch from '../../../utils/utils-functions/EmployeeDropdownSearch';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import httpService from '../../../services/httpService';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import {
  API_HRMS_ATTENDANCE_UNMATCHED_ASSIGN_URL,
  API_HRMS_ATTENDANCE_UNMATCHED_URL,
} from '../../../services/apiRoutes';

/**
 * Codes the terminal knows and the software does not.
 *
 * ⚠️ THIS SCREEN IS WHY NOTHING IS THROWN AWAY. A branch enrols faces on the
 * terminal before it maps anybody in the software, so the first days arrive
 * with a code and no name. Those punches are kept -- not rejected -- and this
 * is where they are claimed. Choosing an employee here rebuilds every day that
 * code ever sent; the count is reported back so it is clear how much was
 * recovered.
 */

const listFrom = (response: any) => {
  const value = response?.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.data)) return value.data.data ?? value.data;
  if (Array.isArray(value)) return value;
  return [];
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const UnmatchedPunches = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState(userBranchId);
  const [picked, setPicked] = useState<Record<string, any>>({});
  const [savingCode, setSavingCode] = useState('');

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const loadRows = async (branch = branchId) => {
    setLoading(true);
    try {
      const response = await httpService.get(API_HRMS_ATTENDANCE_UNMATCHED_URL, {
        params: branch ? { branch_id: branch } : {},
      });
      setRows(listFrom(response));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load the unmatched punches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const rowKey = (row: any) => `${row.device_id}:${row.device_employee_code}`;

  const assign = async (row: any) => {
    const key = rowKey(row);
    const employee = picked[key];

    if (!employee?.value) {
      toast.error('Choose the employee this code belongs to');
      return;
    }

    setSavingCode(key);
    try {
      const response = await httpService.post(API_HRMS_ATTENDANCE_UNMATCHED_ASSIGN_URL, {
        device_id: row.device_id,
        device_employee_code: row.device_employee_code,
        employee_id: employee.value,
      });

      if (response?.data?.success === false) {
        toast.error(response.data.message || 'The code could not be mapped');
        return;
      }

      const rebuilt = response?.data?.data?.data?.days_rebuilt;
      toast.success(
        rebuilt
          ? `Mapped. ${rebuilt} day${rebuilt === 1 ? '' : 's'} rebuilt from the punches on file.`
          : 'Mapped',
      );

      setPicked((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      loadRows();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'The code could not be mapped');
    } finally {
      setSavingCode('');
    }
  };

  const totalPunches = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.punch_total || 0), 0),
    [rows],
  );

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index: number) => index + 1,
    },
    {
      key: 'device_employee_code',
      header: 'Device Code',
      render: (row: any) => (
        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
          {row.device_employee_code}
        </span>
      ),
    },
    { key: 'device_name', header: 'Device', render: (row: any) => row.device_name || '-' },
    {
      key: 'punch_total',
      header: 'Punches',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => Number(row.punch_total || 0),
    },
    {
      key: 'first_punch_at',
      header: 'First Punch',
      render: (row: any) => formatDateTime(row.first_punch_at),
    },
    {
      key: 'last_punch_at',
      header: 'Last Punch',
      render: (row: any) => formatDateTime(row.last_punch_at),
    },
    {
      key: 'employee',
      header: 'Match To Employee',
      render: (row: any) => (
        <div className="min-w-[220px]">
          <EmployeeDropdownSearch
            name={`employee_${rowKey(row)}`}
            value={picked[rowKey(row)] || null}
            placeholder="Search employee"
            onSelect={(option: any) =>
              setPicked((prev) => ({
                ...prev,
                [rowKey(row)]: option,
              }))
            }
            className=""
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <ButtonLoading
          onClick={() => assign(row)}
          buttonLoading={savingCode === rowKey(row)}
          disabled={savingCode === rowKey(row)}
          label="Map"
          icon={<FiLink2 />}
          className="px-3"
        />
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Unmatched Punches" />
      {loading && <Loader />}

      <div className="mb-3 border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
            <BranchDropdown
              name="branch_id"
              branchDdl={[{ id: '', name: 'All Branches' }, ...branches]}
              value={branchId}
              onChange={(event: any) => setBranchId(event.target.value)}
              className="w-full p-2 text-sm font-medium"
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button
              type="button"
              onClick={() => loadRows()}
              className="inline-flex items-center justify-center bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600"
            >
              <FiRefreshCcw className="mr-2" /> Refresh
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          These codes are on a terminal but not on any employee. The punches are kept until they are claimed — mapping
          a code rebuilds every day it ever sent.
        </p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        <div className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-4 py-3">
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Unmatched Codes</div>
          <div className="mt-1 text-xl font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">{rows.length}</div>
        </div>
        <div className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-4 py-3">
          <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Punches Waiting</div>
          <div className="mt-1 text-xl font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">{totalPunches}</div>
        </div>
      </div>

      <div className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">Unmatched Punches</h3>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {rows.length} codes
          </span>
        </div>
        <Table
          columns={columns}
          data={rows}
          perPage={20}
          noDataMessage="Every code on every terminal belongs to an employee"
        />
      </div>
    </div>
  );
};

export default UnmatchedPunches;
