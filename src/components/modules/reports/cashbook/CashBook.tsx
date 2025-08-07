import { useEffect, useState } from 'react';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { getCashBook } from './cashBookSlice';
import { FiBook, FiCheckCircle, FiEdit, FiTrash2, FiX } from 'react-icons/fi';
import Table from '../../../utils/others/Table';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import dayjs from 'dayjs';
import ImagePopup from '../../../utils/others/ImagePopup';
import thousandSeparator from './../../../utils/utils-functions/thousandSeparator';

const CashBook = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const cashBookData = useSelector((state) => state.cashBook);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [endDate, setEndDate] = useState<Date | null>(null); // Define state with type
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);
  const [branchPad, setBranchPad] = useState<string | null>(null);

  interface OptionType {
    value: string;
    label: string;
    additionalDetails: string;
  }

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setIsSelected(user.user.branch_id);
    setBranchId(user.user.branch_id);
    setBranchPad(user?.user?.branch_id.toString().padStart(4, '0'));
  }, []);

  useEffect(() => {
    setTableData(cashBookData?.data);
  }, [cashBookData]);

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };
  const handleStartDate = (e: any) => {
    setStartDate(e);
  };
  const handleEndDate = (e: any) => {
    setEndDate(e);
  };
  const handleActionButtonClick = (e: any) => {
    console.log(user.user.branch_id);

    const startD = dayjs(startDate).format('YYYY-MM-DD'); // Adjust format as needed
    const endD = dayjs(endDate).format('YYYY-MM-DD'); // Adjust format as needed

    dispatch(getCashBook({ branchId, startDate: startD, endDate: endD }));
    setTableData(cashBookData?.data);
  };

  useEffect(() => {
    if (
      branchDdlData?.protectedData?.data &&
      branchDdlData?.protectedData?.transactionDate
    ) {
      setDropdownData(branchDdlData?.protectedData?.data);
      const [day, month, year] =
        branchDdlData?.protectedData?.transactionDate.split('/');
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(parsedDate);
      setEndDate(parsedDate);
      setBranchId(user.user.branch_id);
    } else {
    }
  }, [branchDdlData?.protectedData?.data]);

  const handleCheckBtnClick = () => {};

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      width: '80px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <div>{row?.sl_number ? row.sl_number : '-'}</div>,
    },
    {
      key: 'vr_date',
      header: 'Vr Date',
      width: '80px',
      headerClass: 'text-center',
      cellClass: 'text-center !px-1',
    },
    {
      key: 'vr_no',
      header: 'Vr No',
      width: '80px',
      headerClass: 'text-center',
      cellClass: 'text-center !px-2',
    },
    {
      key: 'nam',
      header: 'Description',
      render: (row: any) => (
        <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
          <div className="truncate">
            <a href="http://localhost:5173/reports/ledger" target="_blank">
              <span dangerouslySetInnerHTML={{ __html: row.nam }}></span>
              {row.somity ? (
                <span className="text-sm"> ({row?.somity?.idfr_code})</span>
              ) : (
                ''
              )}
              {row.somity && (
                <>
                  <p className="text-sm text-gray-500">
                    {row?.somity?.somity_name && row?.somity?.somity_id
                      ? `${row.somity.somity_name} (${row.somity.somity_id})`
                      : ''}
                  </p>
                  <p className="text-sm text-gray-500">{row?.somity?.mobile}</p>
                </>
              )}
            </a>
          </div>
          <div className="text-sm text-gray-500 break-words whitespace-normal">
            {row?.remarks}
          </div>
        </div>
      ),
    },
    {
      key: 'credit',
      header: 'Received',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p className="">
            {row.credit > 0 ? thousandSeparator(row.credit, 0) : '-'}
          </p>
        </>
      ),
    },
    {
      key: 'debit',
      header: 'Payment',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <>
          <p className="">
            {row.debit > 0 ? thousandSeparator(row.debit, 0) : '-'}
          </p>
        </>
      ),
    },
    {
      key: 'voucher_image',
      header: 'Voucher',
      render: (row: any) => {
        return (
          <ImagePopup
            title={row?.remarks || ''}
            branchPad={row?.branchPad || ''}
            voucher_image={row?.voucher_image || ''}
          />
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => {
        const isNumber =
          row?.sl_number &&
          !isNaN(Number(row.sl_number)) &&
          Number(row.sl_number) > 0;
        return (
          <>
            {row?.vr_no ? (
              <>
                <button
                  onClick={() => handleCheckBtnClick()}
                  className="cursor-pointer"
                >
                  {row?.is_approved ? (
                    <FiCheckCircle className="text-green-500 font-bold" />
                  ) : (
                    <FiTrash2 className="text-red-500" />
                  )}
                </button>
                <button
                  onClick={() => handleCheckBtnClick()}
                  className="text-blue-500 ml-2"
                >
                  <FiBook className="cursor-pointer" />
                </button>
                <button
                  onClick={() => handleCheckBtnClick()}
                  className="text-blue-500 ml-2"
                >
                  <FiEdit className="cursor-pointer" />
                </button>
              </>
            ) : (
              ''
            )}
          </>
        );
      },
    },
  ];

  return (
    <div className="">
      <HelmetTitle title={'Cash Book'} />
      <div className="flex justify-between mb-1">
        {selectedOption && (
          <div className="mt-4">
            <p>Selected:</p>
            <p className="font-bold">{selectedOption.label}</p>
          </div>
        )}
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full  gap-2">
          <div>
            <div>
              {' '}
              <label htmlFor="">Select Branch</label>
            </div>
            <div className="w-full">
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown
                defaultValue={user?.user?.branch_id}
                onChange={handleBranchChange}
                className="w-60 font-medium text-sm p-1.5 "
                branchDdl={dropdownData}
              />
            </div>
          </div>
          <div className="w-full">
            <label htmlFor="">Start Date</label>
            <InputDatePicker
              setCurrentDate={handleStartDate}
              className="font-medium text-sm w-full h-8"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>
          <div className="w-full">
            <label htmlFor="">End Date</label>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="font-medium text-sm w-full h-8"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>
          <div className="w-full">
            <ButtonLoading
              onClick={handleActionButtonClick}
              buttonLoading={buttonLoading}
              label="Run"
              className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-full"
            />
          </div>
        </div>
      </div>
      <div className="overflow-y-auto">
        {cashBookData.isLoading ? <Loader /> : ''}
        <Table columns={columns} data={tableData || []} />
      </div>
    </div>
  );
};

export default CashBook;
