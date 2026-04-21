import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../../common/Loader';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { employeeLoanBalance } from './employeeLoanSlice';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import SearchInput from '../../../utils/fields/SearchInput';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

type BalanceRow = {
  employee_name: string;
  branch: string;
  designation: string;
  total_senction: number;
  total_payment: number;
  installment: number;
  balance: number;
};

const toNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstValue = (row: any, keys: string[], fallback = ''): any => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') {
      return row[key];
    }
  }
  return fallback;
};

const LoanBalance = (user: any) => {
  const dispatch = useDispatch<any>();
  const employeeLoan = useSelector((state: any) => state.employeeLoan);
  const authMe = useSelector((state: any) => state.auth?.me);
  const branchDdlData = useSelector((state) => state.branchDdl);
  const settings = useSelector((state) => state.settings);
  const [search, setSearchValue] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | ''>('');
  const [branchInitialized, setBranchInitialized] = useState(false);


  console.log('====================================');
  console.log("settings", settings?.data?.branch?.branch_types_id);
  console.log('====================================');


  useEffect(() => {
    if (branchId === '') {
      dispatch(employeeLoanBalance());
    } else {
      dispatch(employeeLoanBalance({ branchId }));
    }
  }, [dispatch, branchId]);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      setDropdownData(branchDdlData?.protectedData?.data);
    }
  }, [branchDdlData?.protectedData?.data]);


  const normalizedRows: BalanceRow[] = useMemo(() => {
    const rows = Array.isArray(employeeLoan?.loanBalanceData)
      ? employeeLoan.loanBalanceData
      : [];

    return rows.map((item: any) => ({
      employee_name: String(
        firstValue(item, ['employee_name', 'employeeName', 'name', 'employee'], ''),
      ),
      branch: String(firstValue(item, ['branch', 'branch_name', 'branchName'], '')),
      designation: String(firstValue(item, ['designation', 'designation_name'], '')),
      total_senction: toNumber(
        firstValue(item, ['total_senction', 'total_sanction', 'total_loan', 'loan_amount'], 0),
      ),
      total_payment: toNumber(
        firstValue(item, ['total_payment', 'paid_amount', 'total_paid', 'payment'], 0),
      ),
      installment: toNumber(
        firstValue(item, ['installment', 'installment_amount', 'monthly_installment'], 0),
      ),
      balance: toNumber(
        firstValue(item, ['balance', 'loan_balance', 'due_amount', 'current_balance'], 0),
      ),
    }));
  }, [employeeLoan?.loanBalanceData]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return normalizedRows;

    return normalizedRows.filter((row) =>
      [
        row.employee_name,
        row.branch,
        row.designation,
        String(row.total_senction),
        String(row.total_payment),
        String(row.installment),
        String(row.balance),
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [normalizedRows, search]);

  const grandTotalBalance = useMemo(
    () => filteredRows.reduce((sum, row) => sum + toNumber(row.balance), 0),
    [filteredRows],
  );

  const totalEntries = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, totalEntries);
  const paginatedRows = filteredRows.slice(startIndex, endIndex);
  const tableData = useMemo(
    () =>
      paginatedRows.map((row, index) => ({
        ...row,
        sl: startIndex + index + 1,
      })),
    [paginatedRows, startIndex],
  );

  const columns = [
    {
      key: 'sl',
      header: '#',
      headerClass: 'text-center w-12',
      cellClass: 'text-center w-12',
      render: (row: any) => <span>{row.sl}</span>,
    },
    {
      key: 'employee_name',
      header: 'Employee Name',
      render: (row: any) =>
        <span>
          <div className='text-black-2 dark:text-white'>{row.employee_name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">{row.branch}</div>
        </span>,
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (row: any) => <span>{row.designation}</span>,
    },
    {
      key: 'total_senction',
      header: 'Total Senction',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <span>{thousandSeparator(row.total_senction)}</span>,
    },
    {
      key: 'total_payment',
      header: 'Total Payment',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <span>{thousandSeparator(row.total_payment)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <span>{thousandSeparator(row.balance)}</span>,
    },
  ];


  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    if (!branchInitialized && authMe?.branch_id) {
      setBranchId(Number(authMe.branch_id));
      setBranchInitialized(true);
    }
  }, [authMe?.branch_id, branchInitialized]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, perPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchButton = async () => {
    setButtonLoading(true);
    setCurrentPage(1);
    const searchName = search.trim();
    try {
      if (branchId === '') {
        await dispatch(employeeLoanBalance({ searchName })).unwrap();
      } else {
        await dispatch(employeeLoanBalance({ branchId, searchName })).unwrap();
      }
    } finally {
      setButtonLoading(false);
    }
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setBranchId(value === '' ? '' : Number(value));
    setBranchInitialized(true);
    setCurrentPage(1);
  };

  const branchOptions = settings?.data?.branch?.branch_types_id == 1 ? [{ id: "", name: "Select All Branch" }, ...(dropdownData ?? [])] : [...(dropdownData ?? [])];

  return (
    <div className="w-full">
      <HelmetTitle title="Loan Balance" />
      <div className="rounded-sm px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-black dark:text-white">
            <SelectOption onChange={(e) => setPerPage(Number(e.target.value))} />
            <BranchDropdown
              defaultValue={(branchId ?? '').toString()}
              onChange={handleBranchChange}
              className="!w-64 font-medium text-sm h-9"
              branchDdl={branchOptions}
            />
          </div>
          <div className="flex items-center md:justify-end">
            <SearchInput
              search={search}
              setSearchValue={setSearchValue}
              className="text-nowrap h-8.5"
            />

            <ButtonLoading
              onClick={handleSearchButton}
              buttonLoading={buttonLoading}
              label="Search"
              className="whitespace-nowrap h-8.5 w-25"
            />
          </div>
        </div>

        <div className="relative no-scrollbar mt-2">
          <div className="relative h-full">
            {employeeLoan?.loanBalanceLoading === true ? <Loader /> : ''}
            <Table columns={columns} data={tableData || []} noDataMessage="No loan balance data found." />
          </div>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="rounded-xs border border-stroke px-3 py-1.5 text-sm font-semibold text-black dark:border-strokedark dark:text-white">
                Total Balance: {thousandSeparator(grandTotalBalance)}
              </div>
            </div>
            <div>
              {totalPages > 1 ? (
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  handlePageChange={handlePageChange}
                />
              ) : (
                ''
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanBalance;
