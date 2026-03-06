import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../../common/Loader';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { employeeLoanBalance } from './employeeLoanSlice';

type BalanceRow = {
  employee_name: string;
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

const LoanBalance = () => {
  const dispatch = useDispatch<any>();
  const employeeLoan = useSelector((state: any) => state.employeeLoan);
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(employeeLoanBalance());
  }, [dispatch]);

  const normalizedRows: BalanceRow[] = useMemo(() => {
    const rows = Array.isArray(employeeLoan?.loanBalanceData)
      ? employeeLoan.loanBalanceData
      : [];

    return rows.map((item: any) => ({
      employee_name: String(
        firstValue(item, ['employee_name', 'employeeName', 'name', 'employee'], ''),
      ),
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
      render: (row: any) => <span>{row.employee_name}</span>,
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
      render: (row: any) => <span>{thousandSeparator(row.total_senction, 0)}</span>,
    },
    {
      key: 'total_payment',
      header: 'Total Payment',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <span>{thousandSeparator(row.total_payment, 0)}</span>,
    },
    {
      key: 'installment',
      header: 'Installment',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <span>{thousandSeparator(row.installment, 0)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <span>{thousandSeparator(row.balance, 0)}</span>,
    },
  ];

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

  return (
    <div className="w-full">
      <HelmetTitle title="Loan Balance" />

      <div className="rounded-sm border border-stroke bg-white px-4 py-4 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-center">
          <div className="flex items-center gap-2 text-sm text-black dark:text-white">
            <span>Show</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="rounded border border-stroke bg-white px-2 py-1 text-sm dark:border-strokedark dark:bg-boxdark"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>


          <div className="flex items-center justify-start gap-2 md:justify-end">
            <label className="text-sm text-black dark:text-white">Search:</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded border border-stroke bg-white px-2 text-sm focus:border-primary focus:outline-none dark:border-strokedark dark:bg-boxdark md:w-52"
            />
          </div>
        </div>

        <div className="relative no-scrollbar mt-4">
          <div className="relative h-full">
            {employeeLoan?.loanBalanceLoading === true ? <Loader /> : ''}
            <Table columns={columns} data={tableData || []} noDataMessage="No loan balance data found." />
          </div>
          {totalPages > 1 ? (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              handlePageChange={handlePageChange}
            />
          ) : (
            ''
          )}
          <div className="mt-3 text-sm text-black dark:text-white">
            Showing {totalEntries === 0 ? 0 : startIndex + 1} to {endIndex} of {totalEntries} entries
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanBalance;
