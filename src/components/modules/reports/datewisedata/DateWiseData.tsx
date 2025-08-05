import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDateWiseTotal } from './dateWiseDataSlice';

import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import Loader from '../../../../common/Loader';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiTrash2, FiList, FiBook } from 'react-icons/fi';
import dayjs from 'dayjs';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

const DateWiseData = (user: any) => {
  const dateWiseTotal = useSelector((state) => state.dateWiseTotal);
  const branchDdlData = useSelector((state) => state.branchDdl);

  const dispatch = useDispatch();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isSelected, setIsSelected] = useState<number | string>('');

  const [cumulativeDebit, setCumulativeDebit] = useState<number>(0); // Opening Balance for debit
  const [cumulativeCredit, setCumulativeCredit] = useState<number>(0); // Opening Balance for credit
  const [tableData, setTableData] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setIsSelected(user.user.branch_id);
    setBranchId(user.user.branch_id);
  }, []);

  useEffect(() => {
    let currentDebit = cumulativeDebit;
    let currentCredit = cumulativeCredit;

    if (dateWiseTotal?.data.length > 0) {
      const computedData = dateWiseTotal?.data.map(
        (item: any, index: number) => {
          currentDebit += parseFloat(item.debit);
          currentCredit += parseFloat(item.credit);
          const balance = currentDebit - currentCredit;

          return {
            ...item,
            rowNumber: index + 1,
            cumulativeDebit: currentDebit,
            cumulativeCredit: currentCredit,
            balance: balance,
          };
        },
      );
      setTableData(computedData);
    }
  }, [dateWiseTotal]);

  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split('/');
      const startDate = new Date(Number(year), Number(month) - 1, Number('01'));
      const endDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(startDate);
      setEndDate(endDate);
      setBranchId(user.user.branch_id);
    } else {
      // console.warn('branchDdlData is not ready yet or missing required fields.');
    }
  }, [branchDdlData?.protectedData?.data]);

  const handleActionButtonClick = (e: any) => {
    const startD = dayjs(startDate).format('YYYY-MM-DD'); // Adjust format as needed
    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed
    dispatch(getDateWiseTotal({ branchId, startDate: startD, endDate: endD }));
  };
  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);

  };
  const handleStartDate = (e: any) => {
    setStartDate(e);
  };
  const handleEndDate = (e: any) => {
    setEndDate(e);
  };

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center', 
      width: '80px',
    },
    {
      key: 'vr_date',
      header: 'Vr Date',  
      headerClass: 'text-center',
      cellClass: 'text-center',
      width: '120px',
    },
    {
      key: 'debit',
      header: 'debit', 
      render: (row: any) => (
        <div>
          <span>{ row?.debit > 0 ? thousandSeparator (row?.debit,2) : '-'}</span>
        </div>
      ),
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
    {
      key: 'credit',
      header: 'credit', 
      render: (row: any) => (
        <div>
          <span>{ row?.credit > 0 ? thousandSeparator (row?.credit,2) : '-'}</span>
        </div>
      ),
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
    {
      key: 'cumulative_debit',
      header: 'Cum. Received', 
      render: (row: any) => (
        <div>
          <span>{ row?.cumulative_debit > 0 ? thousandSeparator (row?.cumulative_debit,2) : '-'}</span>
        </div>
      ),
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
    {
      key: 'cumulative_credit',
      header: 'Cum. Payment', 
      render: (row: any) => (
        <div>
          <span>{ row?.cumulative_credit > 0 ? thousandSeparator (row?.cumulative_credit,2) : '-'}</span>
        </div>
      ),
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
    {
      key: 'balance',
      header: 'Balance', 
      render: (row: any) => (
        <div>
          <span>{ thousandSeparator (row?.balance,2)}</span>
        </div>
      ),
      headerClass: 'text-right',
      cellClass: 'text-right',
    },
  ];
  return (
    <div className="">
      <HelmetTitle title={'Datewise Total'} />
      <div className="flex justify-between mb-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-1 md:gap-x-2 w-full">
          <div className='w-full'>
            <div>
              {' '}
              <label htmlFor="">Select Branch</label>
            </div>
            <div className='w-full'>
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-1.5 "
                branchDdl={dropdownData}
              />
            </div>
          </div>
          <div className='w-full'>
            <label htmlFor="">Start Date</label>
            <InputDatePicker
              setCurrentDate={handleStartDate}
              className="w-full font-medium text-sm h-8.5"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>
          <div>
            <label htmlFor="">End Date</label>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="w-full font-medium text-sm h-8.5"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>
          <div className='md:mt-6'>
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              className="pt-[0.45rem] pb-[0.45rem] w-full "
            />


          </div>
        </div>
      </div>
      <div className='overflow-y-auto'>
        {dateWiseTotal.isLoading ? <Loader /> : ''}
        <Table columns={columns} data={tableData} className="" />
      </div>
    </div>
  );
};

export default DateWiseData;
