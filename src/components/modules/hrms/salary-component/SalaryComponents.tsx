import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiEdit2, FiPlus, FiSearch, FiSlash } from 'react-icons/fi';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import ROUTES from '../../../services/appRoutes';
import SearchInput from '../../../utils/fields/SearchInput';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import { fetchSalaryComponents, setSalaryComponentStatus } from './salaryComponentSlice';

const typeLabel = (type?: string) =>
  type === 'deduction'
    ? 'Deduction'
    : type === 'employer_contribution'
      ? 'Employer'
      : 'Earning';

const calculationLabel = (row: any) => {
  const type = String(row?.calculation_type || 'fixed');

  if (type === 'percent') {
    return `${row?.default_percent ?? 0}% of ${row?.percent_base === 'gross' ? 'Gross' : 'Basic'}`;
  }

  if (type === 'per_day') return `Per day (${Number(row?.default_amount) || 0}/day)`;
  if (type === 'formula') return 'Formula';
  if (type === 'system') return 'System';

  return 'Fixed';
};

const SalaryComponents = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();
  const componentState = useSelector((state: any) => state.salaryComponent);

  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearchValue] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchSalaryComponents({ search, page, per_page: perPage }));
  }, [dispatch, page, perPage]);

  useEffect(() => {
    const paginated = componentState?.components;

    if (Array.isArray(paginated)) {
      setTableData(paginated);
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }

    setTableData(paginated?.data || []);
    setTotalPages(paginated?.last_page || 1);

    if (paginated?.current_page) {
      setCurrentPage(paginated.current_page);
      setPage(paginated.current_page);
    }
  }, [componentState?.components]);

  const handleSearchButton = async () => {
    setButtonLoading(true);
    try {
      setCurrentPage(1);
      setPage(1);
      await dispatch(fetchSalaryComponents({ search, page: 1, per_page: perPage })).unwrap();
    } finally {
      setButtonLoading(false);
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPerPage = Number(e.target.value);
    setPerPage(nextPerPage);
    setPage(1);
    setCurrentPage(1);
  };

  const handleToggleStatus = async (row: any) => {
    const nextStatus = Number(row.status) === 1 ? 0 : 1;

    try {
      await dispatch(setSalaryComponentStatus({ id: row.id, status: nextStatus })).unwrap();
      toast.success(nextStatus ? 'Pay head enabled' : 'Pay head disabled');
      await dispatch(fetchSalaryComponents({ search, page: currentPage, per_page: perPage })).unwrap();
    } catch (err: any) {
      toast.error(err || 'Failed to change status');
    }
  };

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Pay Head',
      render: (row: any) => (
        <>
          <div className="font-semibold">{row.name}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {row.short_name || row.code}
          </div>
        </>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (row: any) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{row.code}</span>
      ),
    },
    {
      key: 'component_type',
      header: 'Type',
      render: (row: any) => typeLabel(row.component_type),
    },
    {
      key: 'calculation_type',
      header: 'Calculation',
      render: (row: any) => calculationLabel(row),
    },
    {
      key: 'prorate',
      header: 'Prorate',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (Number(row.prorate) === 1 ? 'Yes' : '-'),
    },
    {
      key: 'sort_order',
      header: 'Order',
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            Number(row.status) === 1 ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {Number(row.status) === 1 ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          <ButtonLoading
            onClick={() => navigate(`${ROUTES.hrms_salary_component_edit_base}/${row.id}`)}
            buttonLoading={false}
            label="Edit"
            size="sm"
            className="h-7! whitespace-nowrap text-center mr-0"
            icon={<FiEdit2 className="text-lg mr-2" />}
          />
          <ButtonLoading
            onClick={() => handleToggleStatus(row)}
            buttonLoading={false}
            label={Number(row.status) === 1 ? 'Disable' : 'Enable'}
            size="sm"
            className="h-7! whitespace-nowrap text-center mr-0"
            icon={Number(row.status) === 1
              ? <FiSlash className="text-lg mr-2" />
              : <FiCheckCircle className="text-lg mr-2" />}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Salary Components" />

      <div className="mb-1 flex justify-between gap-2 overflow-x-auto">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-1 md:mr-2" />
          <SearchInput search={search} setSearchValue={setSearchValue} className="text-nowrap" />
          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={buttonLoading}
            label="Search"
            className="whitespace-nowrap"
            icon={<FiSearch size={15} />}
          />
        </div>

        <ButtonLoading
          onClick={() => navigate(ROUTES.hrms_salary_component_create)}
          buttonLoading={false}
          label="New Pay Head"
          className="whitespace-nowrap text-center mr-0"
          icon={<FiPlus className="text-lg mr-2" />}
        />
      </div>

      <div className="relative overflow-x-auto">
        {componentState?.isLoading && <Loader />}
        <Table columns={columns} data={tableData} />
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};

export default SalaryComponents;
