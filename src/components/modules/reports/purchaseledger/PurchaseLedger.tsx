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
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import { getPurchaseLedger } from './purchaseLedgerSlice';
import dayjs from 'dayjs';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import ImagePopup from '../../../utils/others/ImagePopup';
import { FaRotateRight } from 'react-icons/fa6';

const PurchaseLedger = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const ledgerData = useSelector((state) => state.purchaseLedger);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]); // Initialize as an empty array

  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hideIcon, setHideIcon] = useState<boolean>(true);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
  }, []);

  useEffect(() => {
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
    dispatch(
      getPurchaseLedger({
        branchId,
        ledgerId,
        productId,
        startDate: startD,
        endDate: endD,
      }),
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
      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(parsedDate);
      setEndDate(parsedDate);
      setBranchId(user.user.branch_id);
    }
  }, [branchDdlData?.protectedData]);

  const selectedLedgerOptionHandler = (option: any) => {
    setLedgerAccount(option.value);
  };
  const selectedProduct = (option: any) => {
    setProductId(option.value);
  };

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      headerClass: 'text-center',
      cellClass: 'text-center',
      width: '100px',
    },
    {
      key: 'challan_no',
      header: 'Chal. No. & Date',
      width: '120px',
      render: (row: any) => (
        <div>
          <div>{row?.challan_no}</div>
          <div>{row?.challan_date}</div>
        </div>
      ),
    },

    {
      key: 'vehicle_no',
      header: 'Vehicle Number',
      width: '120px',
      render: (row: any) => {
        const transaction = row?.acc_transaction_master?.find(
          (
            tm:
              | {
                  acc_transaction_details?: {
                    coa4_id?: number;
                    credit?: string;
                  }[];
                }
              | undefined,
          ) => tm?.acc_transaction_details?.[0]?.coa4_id === 17,
        );
        const creditValue = transaction?.acc_transaction_details?.[0]?.credit
          ? thousandSeparator(transaction.acc_transaction_details[0].credit, 0)
          : '-';
        return (
          <div className="text-left">
            <div>{row?.purchase_master?.[0]?.vehicle_no}</div>
          </div>
        );
      },
    },
    {
      key: 'product_name',
      header: 'Description',
      width: '100px',
      cellClass: 'align-center',
      render: (row: any) => {
        return (
          <div className="min-w-52 break-words align-top">
            {row?.purchase_master?.[0]?.details?.map(
              (detail: any, index: number) => (
                <div key={index}>
                  <div>{detail?.product?.name}</div>
                </div>
              ),
            )}
            <div className="font-semibold">
              {row?.purchase_master?.[0]?.notes}
            </div>
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Quantity',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      render: (row: any) => {
        return (
          <div>
            {row?.purchase_master?.[0]?.details?.map(
              (detail: any, index: number) => (
                <div key={index}>
                  <span>
                    {thousandSeparator(detail?.quantity, 0)}{' '}
                    {detail?.product?.unit?.name}
                  </span>
                </div>
              ),
            )}
          </div>
        );
      },
      width: '120px',
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      render: (row: any) => (
        <div>
          {row?.purchase_master?.[0]?.details.map(
            (detail: any, index: number) => (
              <div key={index}>
                <span>{thousandSeparator(detail?.purchase_price, 2)}</span>
              </div>
            ),
          )}
        </div>
      ),
      width: '100px',
    },
    {
      key: 'total',
      header: 'Total',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      render: (row: any) => (
        <div>
          {row?.purchase_master?.[0]?.details.map(
            (detail: any, index: number) => (
              <div key={index}>
                <span>
                  {thousandSeparator(
                    detail?.purchase_price * detail?.quantity,
                    0,
                  )}
                </span>
              </div>
            ),
          )}
        </div>
      ),
      width: '100px',
    },
    {
      key: 'acc_transaction_master',
      header: 'Payment',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      render: (row: any) => {
        const transaction = row?.acc_transaction_master?.find(
          (
            tm:
              | {
                  acc_transaction_details?: {
                    coa4_id?: number;
                    credit?: string;
                  }[];
                }
              | undefined,
          ) => tm?.acc_transaction_details?.[0]?.coa4_id === 17,
        );
        const creditValue = transaction?.acc_transaction_details?.[0]?.credit
          ? thousandSeparator(transaction.acc_transaction_details[0].credit, 0)
          : '-';
        return <div className="text-right">{creditValue}</div>;
      },
      width: '120px',
    },
    {
      key: 'voucher_image',
      header: 'Voucher',
      width: '120px',
      headerClass: 'text-center',
      cellClass: 'flex justify-center',
      render: (row: any) => {
        console.log( row )
        return (
          <ImagePopup
            title={ row?.remarks || ''}
            branchPad={row?.branch_id?.toString().padStart(4, '0') || ''} // 👈 here
            voucher_image={row?.voucher_image || ''}
          />
        );
      },
    },
  ];

  return (
    <div className="">
      <HelmetTitle title={'Purchase Ledger'} />
      <div className="">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4 gap-y-2 mb-2">
          <div className="">
            <div>
              {' '}
              <label htmlFor="">Select Branch</label>
            </div>
            <div>
              {branchDdlData.isLoading == true ? <Loader /> : ''}
              <BranchDropdown
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-1.5"
                branchDdl={dropdownData}
              />
            </div>
          </div>
          <div className="">
            <label htmlFor="">Select Account</label>
            <DdlMultiline acType={''} onSelect={selectedLedgerOptionHandler} />
          </div>
          <div className="relative">
            <label htmlFor="">Select Product</label>
            <div className={`w-[37.6px] h-[37.5px] border-t-[0.5px] border-r-[0.5px] border-b-[0.5px] border-l-[0.5px] absolute top-6 right-0 dark:text-white text-black flex items-center justify-center text-xs z-99 cursor-pointer bg-[#fff] dark:bg-[#24303F]`}
            onClick={ () =>  setProductId(null)}
            
            >
              <FaRotateRight size={20} className="absolute dark:text-white  cursor-pointer" />
            </div>
            <ProductDropdown  onSelect={selectedProduct} className='appearance-none'  />
          </div>
          <div className="sm:grid md:flex gap-x-3 ">
            <div className="w-full">
              <label htmlFor="">Start Date</label>
              <InputDatePicker
                setCurrentDate={handleStartDate}
                className="w-full font-medium text-sm h-9"
                selectedDate={startDate}
                setSelectedDate={setStartDate}
              />
            </div>
            <div className="w-full">
              <label htmlFor="">End Date</label>
              <InputDatePicker
                setCurrentDate={handleEndDate}
                className="font-medium text-sm w-full h-9"
                selectedDate={endDate}
                setSelectedDate={setEndDate}
              />
            </div>
            <div className="mt-1 md:mt-6 w-full">
              <ButtonLoading
                onClick={handleActionButtonClick}
                buttonLoading={buttonLoading}
                label="Run"
                className="pt-[0.45rem] pb-[0.45rem] w-full"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-y-auto">
        {ledgerData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />
      </div>
    </div>
  );
};

export default PurchaseLedger;
