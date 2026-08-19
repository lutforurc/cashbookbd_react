import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { FiSearch } from 'react-icons/fi';

import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { formatDate } from '../../../utils/utils-functions/formatDate';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import { API_REPORT_HRM_MISMATCH_PAYMENT_DELETE_URL } from '../../../services/apiRoutes';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { getHrmMismatchPayment } from './hrmMismatchPaymentSlice';

const HrmMismatchPayment = (user: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const hrmMismatchPayment = useSelector((state: any) => state.hrmMismatchPayment);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [pendingRow, setPendingRow] = useState<any | null>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user?.user?.branch_id ?? null);
  }, []);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      setDropdownData(branchDdlData.protectedData.data);
      setBranchId(user?.user?.branch_id ?? null);
    }
  }, [branchDdlData?.protectedData]);

  useEffect(() => {
    if (!hrmMismatchPayment.isLoading && Array.isArray(hrmMismatchPayment?.data)) {
      setTableData(hrmMismatchPayment.data);
    }
  }, [hrmMismatchPayment]);

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const runReport = () => {
    dispatch(
      getHrmMismatchPayment({
        branchId,
        startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
        endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
      }),
    );
  };

  const handleRun = () => {
    runReport();
  };

  const handleDelete = (row: any) => {
    setPendingRow(row);
  };

  const handleDeleteConfirmed = async () => {
    const row = pendingRow;
    if (!row) return;

    const key = `${row.main_trx_id}-${row.emp_id}`;
    setDeletingKey(key);
    try {
      const res = await httpService.post(API_REPORT_HRM_MISMATCH_PAYMENT_DELETE_URL, {
        main_trx_id: row.main_trx_id,
        emp_id: row.emp_id,
        remarks: row.remarks,
      });
      toast.success(res?.data?.message || 'Duplicate deductions removed.');
      setPendingRow(null);
      runReport();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          'Unable to remove duplicate deductions.',
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const columns = [
    {
      key: 'serial_number',
      header: 'Sl',
      headerClass: 'text-center',
      cellClass: 'text-center',
      width: '40px',
      render: (row: any) => <div className="text-center">{row.serial_number}</div>,
    },
    {
      key: 'vr_no',
      header: 'Vr No.',
      width: '110px',
      render: (row: any) => <div>{row.vr_no}</div>,
    },
    {
      key: 'vr_date',
      header: 'Vr Date',
      width: '100px',
      render: (row: any) => <div className="text-left">{formatDate(row.vr_date)}</div>,
    },
    {
      key: 'employee_name',
      header: 'Employee',
      render: (row: any) => <div>{row.employee_name ?? `#${row.emp_id}`}</div>,
    },
    {
      key: 'remarks',
      header: 'Month',
      render: (row: any) => (
        <div>{String(row.remarks || '').replace('Loan deduction for the month of ', '')}</div>
      ),
    },
    {
      key: 'dup_count',
      header: 'Times',
      headerClass: 'text-center',
      cellClass: 'text-center',
      width: '70px',
      render: (row: any) => (
        <div className="text-center font-semibold text-red-600">{row.dup_count}</div>
      ),
    },
    {
      key: 'amounts',
      header: 'Amounts',
      render: (row: any) => <div>{row.amounts}</div>,
    },
    {
      key: 'total_deducted',
      header: 'Total Deducted (Tk)',
      is_number: true,
      headerClass: 'text-right',
      cellClass: 'text-right',
      width: '140px',
      render: (row: any) => (
        <div className="text-right">{thousandSeparator(row.total_deducted)}</div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      width: '110px',
      render: (row: any) => {
        const key = `${row.main_trx_id}-${row.emp_id}`;
        const isDeleting = deletingKey === key;
        return (
          <div className="text-center">
            <Button
              type="button"
              onClick={() => handleDelete(row)}
              disabled={isDeleting || deletingKey !== null}
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              title="Keep one, remove duplicate deductions"
            >
              {isDeleting ? 'Clearing...' : 'Clear'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <HelmetTitle title={'Salary Mismatch Report'} />

      <div className="mb-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-5 md:gap-x-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Select Branch</label>
            {branchDdlData?.isLoading ? <Loader /> : ''}
            <BranchDropdown
              onChange={handleBranchChange}
              className="w-full font-medium text-sm p-2"
              branchDdl={dropdownData}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Start Date</label>
            <InputDatePicker
              setCurrentDate={setStartDate}
              className="font-medium text-sm w-full h-10"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">End Date</label>
            <InputDatePicker
              setCurrentDate={setEndDate}
              className="font-medium text-sm w-full h-10"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>

          <div className="mt-2 md:mt-0">
            <ButtonLoading
              onClick={handleRun}
              buttonLoading={hrmMismatchPayment?.isLoading}
              label="Search"
              className="mt-0 md:mt-6 h-10 whitespace-nowrap"
              icon={<FiSearch size={15} />}
            />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto">
        {hrmMismatchPayment?.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />
      </div>

      <ConfirmModal
        show={!!pendingRow}
        title="Confirm Deletion"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        loading={deletingKey !== null}
        message={
          pendingRow ? (
            <div className="text-sm">
              <p>
                Voucher <span className="font-semibold">{pendingRow.vr_no}</span> —{' '}
                <span className="font-semibold">
                  {pendingRow.employee_name ?? `#${pendingRow.emp_id}`}
                </span>{' '}
                ({pendingRow.remarks})
              </p>
              <p className="mt-2">
                <span className="font-semibold text-red-600">{pendingRow.dup_count}</span> deductions
                found. One will be kept and the rest removed.
              </p>
              <p className="mt-2">Are you sure?</p>
            </div>
          ) : null
        }
        onCancel={() => setPendingRow(null)}
        onConfirm={handleDeleteConfirmed}
        className="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default HrmMismatchPayment;
