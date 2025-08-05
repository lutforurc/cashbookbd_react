import React, { useEffect, useState } from 'react';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { getDueList } from './dueListSlice';
import { FiBook, FiEdit, FiTrash2 } from 'react-icons/fi';
import dayjs from 'dayjs';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import Table from '../../../utils/others/Table';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';


const DueList = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const branchList = useSelector((state) => state.branchList);
  const dueList = useSelector((state) => state.dueList);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);


  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setIsSelected(user.user.branch_id);
    setBranchId(user.user.branch_id);
  }, []);

  useEffect(() => {
    setTableData(dueList?.data?.data?.data);
  }, [dueList]);


  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };
  const handleActionButtonClick = (e: any) => {

    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed
    dispatch(getDueList({ branchId, endDate: endD }));
    setTableData(dueList?.data?.data?.data);
  };


  // console.log( branchList?.currentBranch?.branch_types_id  )

  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setEndDate(parsedDate);
      setBranchId(user.user.branch_id);
    } else {
    }
  }, [branchDdlData?.protectedData?.data]);

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',  
      headerClass: 'text-center', 
      cellClass: 'text-center',
    },
    {
      key: 'coa4_name',
      header: 'coa4_name',
      render: (row:any) => (
        <>
          <p>{row.coa4_name}</p>
          <p className="text-sm text-gray-500">{row.mobile}</p>
          <p className="text-sm text-gray-500">{row.manual_address}</p>
        </>
      ),
    },
    {
      key: 'ledger_page',
      header: 'Page', 
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'area_id',
      header: 'Area Code', 
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row:any) => (
        <>
          <p>{row.area_id ? row.area_id : '-'}</p>
        </>
      )
    },
    { 
      key: 'debit',
      header: 'Debit', 
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row:any) => (
        <>
          <p>{ row.debit>0?thousandSeparator (row.debit, 0):'-'}</p> 
        </>
      )
    },
    {
      key: 'credit',
      header: 'Credit', 
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row:any) => (
        <>
          <p>{ row.credit > 0 ? thousandSeparator (row.credit, 0) : '-'}</p> 
        </>
      )
    }
  ];

  return (
    <div className="">
      <HelmetTitle title={'Due List'} />
      <div className="grid grid-cols-1 mb-1">
        {selectedOption && (
          <div className="mt-4">
            <p>Selected:</p>
            <p className="font-bold">{selectedOption.label}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 md:gap-x-2">
          <div>
            <div>
              {' '}
              <label htmlFor="">Select Branch</label>
            </div>
            <div>
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-1.5 "
                branchDdl={dropdownData}
              />
            </div>
          </div>
          <div>
            <label htmlFor="">End Date</label>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="w-full font-medium text-sm h-8"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>
          <div className='mt-0 md:mt-6'>
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              className="pt-[0.45rem] pb-[0.45rem] w-full"
            />
          </div>
        </div>
      </div>
      <div className='overflow-y-auto overflow-x-auto'>
        {dueList.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} /> {/* Ensure data is always an array */}
      </div>
    </div>
  );
};

export default DueList;
