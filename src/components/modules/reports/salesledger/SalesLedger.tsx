import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
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
import { useReactToPrint } from 'react-to-print';
import SalesLedgerPrint from './SalesLedgerPrint';
import InputElement from '../../../utils/fields/InputElement';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import { FaRotateRight } from 'react-icons/fa6';

const SalesLedger = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const ledgerData = useSelector((state: any) => state.salesLedger);
  const settings = useSelector((state: any) => state.settings);
  const stockReportType = settings?.data?.branch?.stock_report_type;

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);

  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [selectedLedgerOption, setSelectedLedgerOption] = useState<any>(null);
  const [selectedProductOption, setSelectedProductOption] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // ✅ Rows + Font controls (like your screenshot)
  const [rowsPerPage, setRowsPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);

  // ✅ Print
  const printRef = useRef<HTMLDivElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Sales Ledger',
  });

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
    const startD = dayjs(startDate).format('YYYY-MM-DD');
    const endD = dayjs(endDate).format('YYYY-MM-DD');

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
    if (!option) {
      setLedgerAccount(null);
      setSelectedLedgerOption(null);
      return;
    }

    setLedgerAccount(option.value);
    setSelectedLedgerOption({
      value: option.value,
      label: option.label,
    });
  };

  const selectedProduct = (option: any) => {
    if (!option) {
      setProductId(null);
      setSelectedProductOption(null);
      return;
    }

    setProductId(option.value);
    setSelectedProductOption({
      value: option.value,
      label: option.label,
    });
  };

  const handleResetFilters = () => {
    setLedgerAccount(null);
    setProductId(null);
    setSelectedLedgerOption(null);
    setSelectedProductOption(null);
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
        <div
          className="cursor-pointer hover:underline"
          onClick={() =>
            handleVoucherPrint({
              ...row,
              vr_no: row?.vr_no ?? row?.challan_no,
              mtm_id:
                row?.mtm_id ??
                row?.mtmid ??
                row?.mtmId ??
                row?.smtm_id ??
                row?.mid ??
                row?.id,
            })
          }
        >
          <div>{row.challan_no}</div>
          <div>{row.challan_date}</div>
        </div>
      ),
    },
    {
      key: 'product_name',
      header: 'Product & Details',
      cellClass: 'align-center',
      render: (row: any) => {
        const coaName = getRelevantCoaName(row);
        const details = row?.sales_master?.details ?? [];
        const notes = row?.sales_master?.notes ?? row?.notes ?? '';
        const remarks =
          row?.acc_transaction_master?.[0]?.acc_transaction_details?.[0]
            ?.remarks ?? '';
        const detailText = notes || remarks;

        return (
          <div className="min-w-52 break-words align-top">
            {/* ✅ Product list (safe + category like Purchase print) */}
            {Array.isArray(details) &&
              details.length > 0 &&
              details.map((detail: any, i: number) => {
                const categoryName = detail?.product?.category?.name ?? '';
                const productName = detail?.product?.name ?? '';
                return (
                  <div key={detail?.id ?? i} className="leading-normal">
                    {String(stockReportType) === '1' && categoryName
                      ? `${categoryName} `
                      : ''}
                    {productName}
                  </div>
                );
              })}

            {coaName && (
              <div className="text-sm mt-1 font-semibold">{coaName}</div>
            )}

            {detailText ? <div className="mt-1">{detailText}</div> : null}
          </div>
        );
      },
    },
    {
      key: 'vhicle',
      header: 'Vehicle Number',
      headerClass: 'text-left',
      cellClass: 'text-left align-top',
      width: '120px',
      render: (row: any) => <div>{row?.sales_master?.vehicle_no}</div>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      headerClass: 'text-right',
      cellClass: 'text-right align-top',
      width: '120px',
      render: (row: any) => (
        <>
          {(row?.sales_master?.details ?? []).map((detail: any, index: number) => (
            <div key={detail?.id ?? index}>
              {thousandSeparator(detail?.quantity, 0)} {detail?.product?.unit?.name}
            </div>
          ))}
        </>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      width: '120px',
      headerClass: 'text-right',
      cellClass: 'text-right align-top',
      render: (row: any) => (
        <>
          {(row?.sales_master?.details ?? []).map((detail: any, index: number) => (
            <div key={detail?.id ?? index}>
              {thousandSeparator(detail?.sales_price, 2)}
            </div>
          ))}
        </>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      width: '130px',
      headerClass: 'text-right',
      cellClass: 'text-right align-top',
      render: (row: any) => (
        <>
          {(row?.sales_master?.details ?? []).map((detail: any, index: number) => (
            <div key={detail?.id ?? index}>
              {thousandSeparator(
                Math.floor((detail?.quantity || 0) * (detail?.sales_price || 0)),
                0,
              )}
            </div>
          ))}
        </>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      headerClass: 'text-right',
      cellClass: 'text-right',
      width: '120px',
      render: (row: any) => {
        const masters = Array.isArray(row?.acc_transaction_master)
          ? row.acc_transaction_master
          : row?.acc_transaction_master
            ? [row.acc_transaction_master]
            : [];

        const allDetails = masters.reduce((acc: any[], m: any) => {
          if (Array.isArray(m?.acc_transaction_details)) acc.push(...m.acc_transaction_details);
          return acc;
        }, []);

        const parseNumber = (v: any) => {
          if (v == null) return NaN;
          if (typeof v === 'number') return v;
          const cleaned = String(v).replace(/[^\d.-]/g, '');
          const n = Number(cleaned);
          return Number.isFinite(n) ? n : NaN;
        };

        const totalDiscount = allDetails
          .filter((d: any) => d?.coa4_id === 23)
          .reduce((s: number, d: any) => {
            const n = parseNumber(d?.debit);
            return s + (Number.isFinite(n) ? n : 0);
          }, 0);

        return <div className="text-right">{totalDiscount ? thousandSeparator(totalDiscount, 0) : '-'}</div>;
      },
    },
    {
      key: 'received',
      header: 'Received',
      headerClass: 'text-right',
      cellClass: 'text-right',
      width: '120px',
      render: (row: any) => {
        const masters = Array.isArray(row?.acc_transaction_master)
          ? row.acc_transaction_master
          : row?.acc_transaction_master
            ? [row.acc_transaction_master]
            : [];

        const allDetails = masters.reduce((acc: any[], m: any) => {
          if (Array.isArray(m?.acc_transaction_details)) acc.push(...m.acc_transaction_details);
          return acc;
        }, []);

        const parseNumber = (v: any) => {
          if (v == null) return NaN;
          if (typeof v === 'number') return v;
          const cleaned = String(v).replace(/[^\d.-]/g, '');
          const n = Number(cleaned);
          return Number.isFinite(n) ? n : NaN;
        };

        const totalReceived = allDetails
          .filter((d: any) => d?.coa4_id === 17)
          .reduce((s: number, d: any) => {
            const n = parseNumber(d?.debit);
            return s + (Number.isFinite(n) ? n : 0);
          }, 0);

        return <div className="text-right">{totalReceived ? thousandSeparator(totalReceived, 0) : '-'}</div>;
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right align-top',
      width: '120px',
      render: (row: any) => {
        const masters = Array.isArray(row?.acc_transaction_master)
          ? row.acc_transaction_master
          : row?.acc_transaction_master
            ? [row.acc_transaction_master]
            : [];

        const allDetails = masters.reduce((acc: any[], m: any) => {
          if (Array.isArray(m?.acc_transaction_details)) acc.push(...m.acc_transaction_details);
          return acc;
        }, []);

        const parseNumber = (v: any) => {
          if (v == null) return 0;
          if (typeof v === 'number') return v;
          const cleaned = String(v).replace(/[^\d.-]/g, '');
          const n = Number(cleaned);
          return Number.isFinite(n) ? n : 0;
        };

        const payment = allDetails
          .filter((d: any) => d?.coa4_id === 17)
          .reduce((s: number, d: any) => s + parseNumber(d.debit), 0);

        const discount = allDetails
          .filter((d: any) => d?.coa4_id === 23)
          .reduce((s: number, d: any) => s + parseNumber(d.debit), 0);

        const total = parseNumber(row?.sales_master?.total);
        const balance = total - payment - discount;

        return <div className="text-right">{thousandSeparator(balance, 0)}</div>;
      },
    },
  ];

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;

    // optional: min/max guard
    const safe = Math.max(1, Math.min(100, v));
    setFontSize(safe);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;

    const safe = Math.max(1, Math.min(100, v));
    setRowsPerPage(safe);
  };

  const ledgerCalc = useMemo(() => new SalesLedgerCalculator(tableData || []), [tableData]);
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

          <div className="">
            <label htmlFor="">Select Account</label>
            <DdlMultiline
              acType={''}
              onSelect={selectedLedgerOptionHandler}
              value={selectedLedgerOption}
              className="h-9"
            />
          </div>

          <div className="relative">
            <label htmlFor="">Select Product</label>
            <div onClick={() => selectedProduct(null)}>
              <FaRotateRight
                size={20}
                className="absolute dark:text-white cursor-pointer"
              />
            </div>
            <ProductDropdown
              onSelect={selectedProduct}
              value={selectedProductOption}
              className="appearance-none"
            />
          </div>

          <div className="sm:grid md:flex gap-x-3 ">
            <div className="w-full md:max-w-40">
              <label htmlFor="">Start Date</label>
              <InputDatePicker
                setCurrentDate={handleStartDate}
                className="w-full font-medium text-xs h-9.5"
                selectedDate={startDate}
                setSelectedDate={setStartDate}
              />
            </div>

            <div className="w-full md:max-w-40">
              <label htmlFor="">End Date</label>
              <InputDatePicker
                setCurrentDate={handleEndDate}
                className="font-medium text-xs w-full h-9.5"
                selectedDate={endDate}
                setSelectedDate={setEndDate}
              />
            </div>

            {/* ✅ Rows + Font + Run + Print (like your screenshot) */}
            <div className="grid grid-cols-5 md:flex items-end gap-x-3">
              <InputElement
                id="perPage"
                name="perPage"
                label="Rows"
                value={rowsPerPage.toString()}
                onChange={handleRowsPerPageChange}
                type="text"
                className="font-medium text-sm h-9 w-full md:w-12"
              />

              <InputElement
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={handleFontSizeChange}
                type="text"
                className="font-medium text-sm h-9 w-full md:w-12"
              />

              <div className="mt-6 md:mt-6 w-full">
                <ButtonLoading
                  onClick={handleActionButtonClick}
                  buttonLoading={buttonLoading}
                  label="Run"
                  icon=""
                  className="pt-[0.45rem] pb-[0.45rem] w-full h-9"
                />
              </div>

              <PrintButton
                onClick={handlePrint}
                label=""
                className="mt-6 pt-[0.45rem] pb-[0.45rem] h-9"
                disabled={!Array.isArray(tableData) || tableData.length === 0}
              />

              <div className="mt-6 md:mt-6 w-full">
                <ButtonLoading
                  onClick={handleResetFilters}
                  buttonLoading={false}
                  label="Reset"
                  icon=""
                  className="pt-[0.45rem] pb-[0.45rem] w-full h-9"
                />
              </div>
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
              <div>Discount: {thousandSeparator(totalDiscount, 0)}</div>
              <div>Received: {thousandSeparator(grandTotal, 0)}</div>
              <div>Balance: {thousandSeparator(totalBalance, 0)}</div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Hidden print component */}
      <div className="hidden">
        <SalesLedgerPrint
          ref={printRef}
          rows={tableData || []}
          title="Sales Ledger"
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
          startDate={startDate ? dayjs(startDate).format('YYYY-MM-DD') : ''}
          endDate={endDate ? dayjs(endDate).format('YYYY-MM-DD') : ''}
        />
        <VoucherPrintRegistry
          ref={voucherRegistryRef}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default SalesLedger;
