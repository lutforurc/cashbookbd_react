import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import SearchInput from '../../../utils/fields/SearchInput';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import Link from '../../../utils/others/Link';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import ActionButtons from '../../../utils/fields/ActionButton'; 
import { employeeStatus, fetchEmployees, fetchEmployeeSettings, updateEmployeeFromUI } from './employeeSlice';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { employeeGroup } from '../../../utils/fields/DataConstant';
import InputElement from '../../../utils/fields/InputElement';
import { useReactToPrint } from 'react-to-print'; 
import EmployeePrint from './EmployeePrint';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { toast } from 'react-toastify';

const Employees = ({ user }: any) => {
  const employees = useSelector((state) => state.employees);
  const branchDdlData = useSelector((state) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [designation, setDesignation] = useState<any[]>([]);

  const [fontSize, setFontSize] = useState<number>(12);
  const navigate = useNavigate();



  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchEmployeeSettings());
    setBranchId(user?.branch_id);
  }, []);

  useEffect(() => {
    setDesignation(employees?.employeeSettings?.data?.data?.designation || []);
  }, [settings]);

  useEffect(() => {
    const list = employees?.employees?.data?.data?.data || [];
    setTableData(list);

    const total = employees?.employees?.data?.data?.total || 0;
    setTotalPages(Math.ceil(total / perPage));
  }, [employees?.employees]);


  useEffect(() => {
    if (branchDdlData?.protectedData?.data) if (branchDdlData?.protectedData?.data) {

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

    dispatch(employeeStatus({ id: row.id, enabled: newStatus })).unwrap()
      .then(() => {
        dispatch(fetchEmployees({
          page,
          per_page: perPage,
          search,
          branch_id: branchId,
        }));
      })
      .catch(console.error);
  };


  const handleInputChange = (id: number, field: string, value: string) => {
    setTableData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row)
    );
  };

  const handleInputBlur = (row: any, field: string) => {
    dispatch(
      updateEmployeeFromUI({
        id: row.id,
        data: { [field]: row[field] },
      })
    )
      .unwrap()
      .then((res) => {
        if (res?.message) {
          toast.success(res.message); // ✅ SUCCESS MESSAGE
        }
      })
      .catch((err) => {
        toast.error(err?.message || 'Update failed');
      });
  };

  // const handleInputBlur = (row: any, field: string) => {
  //   dispatch(
  //     updateEmployeeFromUI({
  //       id: row.id,
  //       data: { [field]: row[field], },
  //     })
  //   ).unwrap()
  //     .then(() => {
  //       // dispatch(
  //       //   fetchEmployees({
  //       //     page,
  //       //     per_page: perPage,
  //       //     search,
  //       //     branch_id: branchId,
  //       //   })
  //       // );
  //     })
  //     .catch(console.error);
  // };


  // useEffect(() => {
  //   setTableData(employees?.employees?.data?.data?.data || []);
  // }, [employees]);

  const employeeGroupMap = Object.fromEntries(
    employeeGroup
      .filter(g => g.id !== "") // "Select All" বাদ দিন
      .map(g => [g.id.toString(), g.name])
  );

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'employee_serial',
      header: 'Sal. Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <InputElement
          type="number"
          value={row.employee_serial ?? ""}
          className="text-center w-16"
          onChange={(e) =>
            handleInputChange(
              row.id,
              "employee_serial",
              e.target.value
            )
          }
          onBlur={() =>
            handleInputBlur(
              row,
              "employee_serial"
            )
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur(); // 🔥 Enter = Save
            }
          }}
        />
      ),
    },


    // {
    //   key: 'employee_group',
    //   header: 'Employee Group',
    //   headerClass: 'text-left',
    //   cellClass: 'text-left',
    //   render: (row: any) => {
    //     const groupName = employeeGroupMap[row.employee_group?.toString()];
    //     return <span className="font-medium">{groupName || '-'}</span>;
    //   },
    // },

    
    {
      key: 'employee_group',
      header: 'Employee Group',
      render: (row: any) => (
        <DropdownCommon
          key={row.id}
          id={`employee_group-${row.id}`}
          name="employee_group"
          className="h-[2.1rem]"
          data={employeeGroup}
          value={row.employee_group?.toString() ?? ""}   // ✅ API field
          onChange={(e) =>
            handleInputChange(
              row.id,
              "employee_group",       // ✅ SAME field
              e.target.value
            )
          }
          onBlur={() =>
            handleInputBlur(
              row,
              "employee_group"        // ✅ SAME field
            )
          }
        />
      ),
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
      key: 'designation',
      header: 'Designation',
      render: (row: any) => (
        <DropdownCommon
          key={row.id}
          id={`designation-${row.id}`}
          name="designation"
          className="h-[2.1rem]"
          data={designation}
          value={row.designation?.toString() ?? ""}   // ✅ API field
          onChange={(e) =>
            handleInputChange(
              row.id,
              "designation",       // ✅ SAME field
              e.target.value
            )
          }
          onBlur={() =>
            handleInputBlur(
              row,
              "designation"        // ✅ SAME field
            )
          }
        />
      ),
    },
    // {
    //   key: 'designation_name',
    //   header: 'Designation',
    //   render: (row: any) => (

    //     <>
    //       <p className="">{row.designation_name}</p>
    //     </>
    //   ),
    // },
    {
      key: 'mobile',
      header: 'Mobile',
      render: (row: any) => (
        <>
          <InputElement
            type="number"
            value={row.mobile ?? ""}
            className="text-center w-30"
            onChange={(e) =>
              handleInputChange(
                row.id,
                "mobile",
                e.target.value
              )
            }
            onBlur={() =>
              handleInputBlur(
                row,
                "mobile"
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur(); // 🔥 Enter = Save
              }
            }}
          />
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



  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setPerPage(value);
    } else {
      setPerPage(10); // Reset if input is invalid
    }
  };
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);

    if (!isNaN(value)) {
      setFontSize(value);
    } else {
      setFontSize(10); // Reset if input is invalid
    }
  };

  const handlePrint = useReactToPrint({

    content: () => {
      if (!printRef.current) {
        // alert("Nothing to print: Ref not ready");
        return null;
      }
      return printRef.current;
    },
    documentTitle: 'Due Report',
    // onAfterPrint: () => alert('Printed successfully!'),
    removeAfterPrint: true,
  });

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


        <div className='flex'>
          <div className="mr-2">
            <InputElement
              id="perPage"
              name="perPage"
              // label="Rows"
              value={perPage.toString()}
              onChange={handlePerPageChange}
              type='text'
              className="font-medium text-sm h-9 w-12"
            />
          </div>
          <div className="mr-2">
            <InputElement
              id="fontSize"
              name="fontSize"
              // label="Font"
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type='text'
              className="font-medium text-sm h-9 w-12"
            />
          </div>
          <PrintButton
            onClick={handlePrint}
            label="Print"
            className="ml-2 mr-2"
          />
          <Link to="/hrms/employee/add" className="text-nowrap">
            New Employee
          </Link>
        </div>
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

        {/* === Hidden Print Component === */}
        <div className="hidden">
          <EmployeePrint
            ref={printRef}
            rows={tableData}
            rowsPerPage={perPage}
            fontSize={fontSize}
            branchName={dropdownData?.find(b => b.id == branchId)?.name}
          />
        </div>
      </div>
    </div>
  );
};

export default Employees;
