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
import { getSalesLedger } from './salesLedgerSlice';
import dayjs from 'dayjs';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import SalesLedgerCalculator from '../../../utils/calculators/SalesLedgerCalculator';
import { getRelevantCoaName } from '../utils/ledgerNameResolver';

const SalesLedger = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const ledgerData = useSelector((state: any) => state.salesLedger);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]); // Initialize as an empty array

  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
  }, []);

useEffect(() => {
  if (!ledgerData.isLoading) {
    if (Array.isArray(ledgerData?.data)) {
      setTableData(ledgerData.data);
    } else {
      setTableData([]); // 🔥 CLEAR OLD DATA
    }
  }
}, [ledgerData.isLoading, ledgerData.data]);

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
      getSalesLedger({
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
      width: '100px',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'challan_no',
      header: 'Chal. No. & Date',
      width: '120px',
      headerClass: 'text-left',
      cellClass: 'text-left',
      render: (row: any) => (
        <>
          <div>{row.challan_no}</div>
          <div>{row.challan_date}</div>
        </>
      ),
    },
    {
      key: 'product_name',
      header: 'Product & Details',
      cellClass: 'align-center',
      render: (row: any) => {
        const coaName = getRelevantCoaName(row);

        return (
          <div className="min-w-52 break-words align-center">
            {/* Product */}
            {(row?.sales_master?.details ?? []).map(
              (detail: any, index: number) => (
                <div key={index}>
                  {detail?.product?.name}
                </div>
              ),
            )}

            {/* ✅ Final COA name */}
            {coaName && (
              <div className="text-sm mt-1 font-semibold">
                {coaName}
              </div>
            )}
            {/* Remarks */}
            <div className="">
              {
                row?.acc_transaction_master?.[0]
                  ?.acc_transaction_details?.[0]
                  ?.remarks
              }
            </div>
          </div>
        );
      },
    },
    {
      key: 'vhicle',
      header: 'Vhicle No.',
      headerClass: 'text-left',
      cellClass: 'text-left align-center',
      width: '120px',
      render: (row: any) => (
        <>
          <div>{row?.sales_master?.vehicle_no}</div>
        </>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      width: '120px',
      render: (row: any) => (
        <>
          {(row?.sales_master?.details ?? []).map(
            (detail: any, index: number) => (
              <div key={index}>
                <div>
                  {thousandSeparator(detail?.quantity, 0)}{' '}
                  {detail?.product?.unit?.name}
                </div>
              </div>
            ),
          )}
        </>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      width: '120px',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      render: (row: any) => (
        <>
          {(row?.sales_master?.details ?? []).map(
            (detail: any, index: number) => (
              <div key={index}>
                <div>{thousandSeparator(detail?.sales_price, 2)}</div>
              </div>
            ),
          )}
        </>
      ),
    },
    {
      key: 'total',
      header: 'total',
      width: '130px',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      render: (row: any) => (
        <>
          {(row?.sales_master?.details ?? []).map(
            (detail: any, index: number) => (
              <div key={index}>
                <div>
                  {thousandSeparator(
                    Math.floor(detail?.quantity * detail?.sales_price),
                    0,
                  )}
                </div>
              </div>
            ),
          )}
        </>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        const masters = Array.isArray(row?.acc_transaction_master)
          ? row.acc_transaction_master
          : row?.acc_transaction_master
            ? [row.acc_transaction_master]
            : [];

        // collect all details (works without flatMap)
        const allDetails = masters.reduce((acc: any[], m: any) => {
          if (Array.isArray(m?.acc_transaction_details)) {
            acc.push(...m.acc_transaction_details);
          }
          return acc;
        }, []);

        const parseNumber = (v: any) => {
          if (v == null) return NaN;
          if (typeof v === 'number') return v;
          const cleaned = String(v).replace(/[^\d.-]/g, '');
          const n = Number(cleaned);
          return Number.isFinite(n) ? n : NaN;
        };

        const discountDetail = allDetails.find((d: any) => d?.coa4_id === 23);
        const value = parseNumber(discountDetail?.debit);

        const display = Number.isFinite(value)
          ? thousandSeparator(value, 0)
          : '-';
        return <div className="text-right">{display}</div>;
      },
      width: '120px',
    },
    {
      key: 'acc_transaction_master',
      header: 'Received',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        const transaction = row?.acc_transaction_master?.find(
          (
            tm:
              | {
                acc_transaction_details?: {
                  coa4_id?: number;
                  debit?: string;
                }[];
              }
              | undefined,
          ) => tm?.acc_transaction_details?.[0]?.coa4_id === 17,
        );
        const debitValue = transaction?.acc_transaction_details?.[0]?.debit
          ? thousandSeparator(transaction.acc_transaction_details[0].debit, 0)
          : '-';
        return <div className="text-right">{debitValue}</div>;
      },
      width: '120px',
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      width: '120px',
      render: (row: any) => {
        const masters = Array.isArray(row?.acc_transaction_master)
          ? row.acc_transaction_master
          : row?.acc_transaction_master
            ? [row.acc_transaction_master]
            : [];

        const allDetails = masters.reduce((acc: any[], m: any) => {
          if (Array.isArray(m?.acc_transaction_details)) {
            acc.push(...m.acc_transaction_details);
          }
          return acc;
        }, []);

        const parseNumber = (v: any) => {
          if (v == null) return 0;
          if (typeof v === 'number') return v;
          const cleaned = String(v).replace(/[^\d.-]/g, '');
          const n = Number(cleaned);
          return Number.isFinite(n) ? n : 0;
        };

        // payment (coa4_id = 17)
        const payment = allDetails
          .filter((d: any) => d?.coa4_id === 17)
          .reduce((s: number, d: any) => s + parseNumber(d.debit), 0);

        // discount (coa4_id = 23)
        const discount = allDetails
          .filter((d: any) => d?.coa4_id === 23)
          .reduce((s: number, d: any) => s + parseNumber(d.debit), 0);

        const total = parseNumber(row?.sales_master?.total);
        const balance = total - payment - discount;

        return (
          <div className="text-right">{thousandSeparator(balance, 0)}</div>
        );
      },
    },
  ];

  const ledgerCalc = new SalesLedgerCalculator(tableData || []);
  const totalQuantity = ledgerCalc.getTotalQuantity();
  const totalPayment = ledgerCalc.getTotalPayment();
  const grandTotal = ledgerCalc.getGrandTotal();
  const totalBalance = ledgerCalc.getTotalBalance();
  const totalDiscount = ledgerCalc.getDiscountTotal();

  return (
    <div className="">
      <HelmetTitle title={'Sales Ledger'} />
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
          <div className="">
            <label htmlFor="">Select Product</label>
            <ProductDropdown onSelect={selectedProduct} />
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

        {tableData.length > 0 && (
          <div className="mt-2 border-t font-bold">
            <div className="flex justify-end space-x-8 p-2">
              <div>Quantity: {thousandSeparator(totalQuantity, 0)}</div>
              <div>Total: {thousandSeparator(totalPayment, 0)}</div>
              <div>Received: {thousandSeparator(grandTotal, 0)}</div>
              <div>Discount: {thousandSeparator(totalDiscount, 0)}</div>
              <div>Due: {thousandSeparator(totalBalance, 0)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesLedger;
