import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { FiBook, FiEdit2, FiTrash2 } from 'react-icons/fi';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import SearchInput from '../../../utils/fields/SearchInput';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Link from '../../../utils/others/Link';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import ActionButtons from '../../../utils/fields/ActionButton';
import { getBranch } from '../../branch/branchSlice';
import { fetchEmployees } from './employeeSlice';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';

const Employees = ({ user }: any) => {
  const employees = useSelector((state) => state.employees);
  const branchDdlData = useSelector((state) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const navigate = useNavigate();



  console.log('====================================');
  console.log("settings", settings?.data?.branch?.branch_types_id);
  console.log('====================================');


    useEffect(() => {
      dispatch(getDdlProtectedBranch());
      setBranchId(user?.branch_id);
    }, []);

  useEffect(() => {
    dispatch(fetchEmployees({ page, per_page:perPage, search, branch_id: branchId }));
    setTotalPages(Math.ceil(employees?.employees?.data?.data?.total / perPage));
    setTableData(employees);
  }, [page, perPage, employees?.employees?.data?.data?.total, branchId]);


useEffect(() => {
  if (branchDdlData?.protectedData?.data)   if (branchDdlData?.protectedData?.data) {

    const baseData = branchDdlData.protectedData.data;

    if (settings?.data?.branch?.branch_types_id === 1) {
      setDropdownData([
        { id: "", name: 'All Projects' },
        ...baseData,
      ]);
    } else {
      setDropdownData(baseData);
    }
  }
}, [branchDdlData?.protectedData?.data]);

  const handleSearchButton = (e: any) => {
    setCurrentPage(1);
    setPage(1);
    dispatch(fetchEmployees({ page, per_page: perPage, search, branch_id: branchId }));

    if (employees?.data?.total >= 0) {
      setTotalPages(Math.ceil(employees?.employees?.data?.data?.total / perPage));
      setTableData(employees?.employees?.data?.data?.data || []);
    }
  };

  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil(employees?.employees?.data?.total / perPage));
    setTableData(employees?.employees?.data?.data?.data || []);
  };

  const handlePageChange = (page: any) => {
    setPerPage(perPage);
    setPage(page);
    setCurrentPage(page);
    setTotalPages(Math.ceil(employees?.employees?.data?.data?.last_page));
    setTableData(employees?.employees?.data?.data?.data || []);
  };


const handleBranchEdit = (row: any) => { 
  navigate(`/hrms/employee/edit/${row.id}`);
};

  const handleBranchDelete = (row: any) => {
    navigate('/branch/branch-list');
  };

  const handleToggle = (row: any) => {
    const newStatus = row.status === 1 ? 0 : 1;

    dispatch(branchStatus(row.id, newStatus)).then(() => {
      dispatch(getBranch({ page, per_page: perPage, searchValue }));
    });
  };

  useEffect(() => {
    setTableData(employees?.employees?.data?.data?.data || []);
  }, [employees]);


  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'employee_serial',
      header: 'Sal. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Employee Name',
      render: (row: any) => (
        <>
          <p className="">{row.name}</p>
        </>
      ),
    },
    {
      key: 'designation_name',
      header: 'Designation',
      render: (row: any) => (
        <>
          <p className="">{row.designation_name}</p>
        </>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      render: (row: any) => (
        <>
          <p className="">{row.mobile}</p>
        </>
      ),
    },
    {
      key: 'branch_name',
      header: 'Project Name',
      render: (row: any) => (
        <>
          <p className="">{row.branch_name}</p>
        </>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <>
          <div>
            <ActionButtons
              row={row}
              showEdit={true}
              handleEdit={handleBranchEdit}
              showDelete={false}
              handleDelete={handleBranchDelete}
              showToggle={true}
              handleToggle={() => handleToggle(row)}

            // showConfirmId={showConfirmId}
            // setShowConfirmId={setShowConfirmId}
            />
          </div>
        </>
      ),
    },
  ];

  const handleProductEdit = (row: any) => {
    navigate(`/product/edit/${row.product_id}`);
  };

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };


  return (
    <div>
      <HelmetTitle title={'Employee List'} />
      <div className="flex overflow-x-auto justify-between mb-1">
        <div className='flex'>
          <div className='mr-2'>
            <div className="w-full">
              {/* {branchDdlData.isLoading == true ? <Loader /> : ''} */}
              <BranchDropdown
                defaultValue={user?.user?.branch_id}
                onChange={handleBranchChange}
                className="w-60 font-medium text-sm p-2 "
                branchDdl={dropdownData}
              />
            </div>
          </div>
          <div className="flex">
            <SelectOption
              onChange={handleSelectChange}
              className="mr-1 md:mr-2"
            />
            <SearchInput
              search={search}
              setSearchValue={setSearchValue}
              className="text-nowrap"
            />
            <ButtonLoading
              onClick={handleSearchButton}
              buttonLoading={buttonLoading}
              label="Search"
              className="whitespace-nowrap"
            />
          </div>
        </div>


        <Link to="/hrms/employee/add" className="text-nowrap">
          New Employee
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        {employees.loading == true ? <Loader /> : ''}

        <Table columns={columns} data={tableData} className="" />

        {/* Pagination Controls */}
        {totalPages > 1 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        ) : (
          ''
        )}
      </div>
    </div>
  );
};

export default Employees;
