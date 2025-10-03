import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs'; 
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import { requisitionComparison } from './requisitionSlice';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import HelmetTitle from '../../utils/others/HelmetTitle';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import InputDatePicker from '../../utils/fields/DatePicker';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Table from '../../utils/others/Table';

const Requisition = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const requisition = useSelector((state) => state.requisition);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]); // Initialize as an empty array

  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [branchPad, setBranchPad] = useState<string | null>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
    setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
  }, []);

  useEffect(() => {
    if (!requisition.isLoading) {
      const flatArray = requisition.data ? Object.values(requisition.data) : [];
      setTableData(flatArray);
    }
  }, [requisition.data]);


  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleStartDate = (e: any) => {
    setStartDate(e);
  };

  const handleEndDate = (e: any) => {
    setEndDate(e);
  };

  const handleActionButtonClick = () => {
    const startD = dayjs(startDate).format('YYYY-MM-DD'); // Adjust format as needed
    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed

    dispatch(
      requisitionComparison({ branchId, startDate: startD, endDate: endD }),
    );
  };

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
    }
  }, [branchDdlData?.protectedData]);

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No',
      width: '100px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="">{row.serial_no ? row.serial_no : '-'}</div>
      ),
    },
    {
      key: 'product_name',
      header: 'Product Name',
      render: (row: any) => <div className="w-25">{row.product_name}</div>,
      width: '100px',
    },
    {
      key: 'requisition_qty',
      header: 'Requisition Qty',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="w-25">{thousandSeparator(row.requisition_qty, 0)}</div>
      ),
      width: '100px',
    },
    {
      key: 'purchase_qty',
      header: 'Purchase Qty',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="">{thousandSeparator(Number(row.purchase_qty), 0)}</div>
      ),
      width: '100px',
    },

    {
      key: 'requisition_total',
      header: 'Requisition',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="">{thousandSeparator(row.requisition_total, 0)}</div>
      ),
      width: '100px',
    },
    {
      key: 'approved_amt',
      header: 'Approved Amount',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="">{thousandSeparator(row.approved_amt, 0)}</div>
      ),
      width: '100px',
    },
    {
      key: 'purchase_total',
      header: 'Total Expense',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className="">
          {thousandSeparator(Number(row.purchase_total), 0)}
        </div>
      ),
      width: '100px',
    },
    {
      key: 'difference',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <div className="">{thousandSeparator(Math.abs(row.difference), 0)}</div>,
      width: '100px',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <div
          className={`w-25 ${
            row.requisition_total === 0
              ? 'text-red-500'
              : row.difference < 0
                ? 'text-green-500'
                : row.difference > 0
                  ? 'text-yellow-500'
                  : 'text-gray-500' // Default case when difference === 0
          }`}
        >
          {row.status}
        </div>
      ),
      width: '100px',
    },
  ];

  return (
    <div className="">
      <HelmetTitle title={'Requisition Analysis'} />
      <div className="mb-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-5 md:gap-x-4">
          <div className="">
            <div>{' '}<label htmlFor="">Select Branch</label>
            </div>
            <div>
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown onChange={handleBranchChange} className="w-full font-medium text-sm p-2" branchDdl={dropdownData} />
              
            </div>
          </div>

          <div className="w-full">
            <label htmlFor="">Start Date</label>
            <InputDatePicker
              setCurrentDate={handleStartDate}
              className="font-medium text-sm w-full h-9"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>

          <div>
            <label htmlFor="">End Date</label>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="w-full font-medium text-sm h-9"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>

          <div className="mt-2 md:mt-0">
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-full"
            />
          </div>
          <div className="mt-2 md:mt-0">
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="New Requisition"
              className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-full"
            />
          </div>
        </div>
      </div>
      <div className="overflow-y-auto">
        {requisition.isLoading && <Loader />}
        <Table columns={columns} data={tableData} />
      </div>
    </div>
  );
};

export default Requisition;
