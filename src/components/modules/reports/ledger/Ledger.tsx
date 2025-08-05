import React, { useEffect, useState } from 'react';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import { getLedger } from './ledgerSlice';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { API_REMOTE_URL } from '../../../services/apiRoutes';
import ImagePopup from '../../../utils/others/ImagePopup';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

const Ledger = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const ledgerData = useSelector((state) => state.ledger);
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
    // Update table data only when ledgerData is valid
    if (!ledgerData.isLoading && Array.isArray(ledgerData?.data)) {
      setTableData(ledgerData?.data);
    }
  }, [ledgerData]);

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
    if (!ledgerId) {
      toast.info('Please select ledger account.');
      return;
    }
    dispatch(getLedger({ branchId, ledgerId, startDate: startD, endDate: endD }))
  };

  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      const [day, month, year] = branchDdlData?.protectedData?.transactionDate.split('/');
      const startDate = new Date(Number(year), Number(month) - 1, Number('01'));
      const endDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(startDate);
      setEndDate(endDate);

      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData]);

  const selectedLedgerOptionHandler = (option: any) => {
    setLedgerAccount(option.value);
  };

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No', 
      width: '100px',
      hederClass: 'text-center',
      cellClass: 'text-center',
      render: (row:any) => <div className="w-25">{ row.sl_number ? row.sl_number : '-'}</div>,
    },
    {
      key: 'vr_date',
      header: 'Vr Date',
      render: (row:any) => <div className="w-25">{row.vr_date}</div>,
      width: '100px',
    },
    {
      key: 'vr_no',
      header: 'Vr No',
      render: (row:any) => <div className="w-25">{row.vr_no}</div>,
      width: '100px',
    },
    {
      key: 'name',
      header: 'Description',
      render: (row:any) => (
        <>
           <p>{row.name}</p> 
          <div className="text-sm text-gray-500">{row.remarks}</div>
        </>
    ), 
    },
    {
      key: 'credit',
      header: 'Debit',
      width: '120px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row:any) => {
        return (
          <span>{row.credit > 0 ? thousandSeparator(row.credit, 2) : '-'}</span>
        );
      }
    },
    {
      key: 'debit',
      header: 'Credit',
      width: '120px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row:any) => {
        return (
          <span>{row.debit > 0 ? thousandSeparator(row.debit, 2) : '-'}</span>
        );
      }
    },
    {
      key: 'voucher_image',
      header: 'Voucher',
      render: (row:any) => {
        return (
          <ImagePopup
            branchPad={row?.branchPad || ''} // Ensure row is defined before accessing branchPad
            voucher_image={row?.voucher_image || ''} // Ensure voucher_image is defined
            title={row?.remarks || ''} // Ensure title is defined
          />
        );  
      },
    },
  ];

  return (
    <div className="">
      <HelmetTitle title={'Ledger'} />
      <div className="mb-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-5 md:gap-x-4">
          <div className=''>
            <div>
              {' '}
              <label htmlFor="">Select Branch</label>
            </div>
            <div>
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-2"
                branchDdl={dropdownData}
              />
            </div>
          </div>

          <div className=''>
            <label htmlFor="">Select Account</label>
            <DdlMultiline onSelect={selectedLedgerOptionHandler} acType={''} />
          </div>

          <div className='w-full'>
            <label htmlFor="">Start Date</label>
            <InputDatePicker
              setCurrentDate={handleStartDate}
              className="font-medium text-sm w-full h-9"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>

          <div >
            <label htmlFor="">End Date</label>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="w-full font-medium text-sm h-9"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>

          <div className='mt-2 md:mt-0'>
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-full"
            />
          </div>
        </div>
      </div>
      <div className='overflow-y-auto'>
        {ledgerData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} /> {/* Ensure data is always an array */}
      </div>
    </div>
  );
};

export default Ledger;