import React, { useEffect, useRef, useState } from 'react';
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
import { getPurchaseLedger } from './purchaseLedgerSlice';
import dayjs from 'dayjs';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import ImagePopup from '../../../utils/others/ImagePopup';
import { FaRotateRight } from 'react-icons/fa6';
import PurchaseLedgerCalculator from '../../../utils/calculators/PurchaseLedgerCalculator';
import { getRelevantCoaName } from '../utils/ledgerNameResolver';
import PurchaseLedgerPrint from './PurchaseLedgerPrint';
import { useReactToPrint } from 'react-to-print';
import InputElement from '../../../utils/fields/InputElement';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import { FiFilter } from 'react-icons/fi';

const PurchaseLedger = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const ledgerData = useSelector((state) => state.purchaseLedger);
  const settings = useSelector((state: any) => state.settings);
  const stockReportType = settings?.data?.branch?.stock_report_type;
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]); // Initialize as an empty array

  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [selectedLedgerOption, setSelectedLedgerOption] = useState<any>(null);
  const [selectedProductOption, setSelectedProductOption] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hideIcon, setHideIcon] = useState<boolean>(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);


  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
  }, []);

  useEffect(() => {
    if (!ledgerData.isLoading) {
      setTableData(Array.isArray(ledgerData?.data) ? ledgerData.data : []);
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
    setFilterOpen(false);
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
    if (option === null) {
      setProductId(null); // Reset value
      setSelectedProductOption(null);
    } else {
      setProductId(option.value); // Normal select
      setSelectedProductOption({
        value: option.value,
        label: option.label,
      });
    }
  };

  const handleResetFilters = () => {
    setLedgerAccount(null);
    setProductId(null);
    setSelectedLedgerOption(null);
    setSelectedProductOption(null);
    setFilterOpen(false);
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
        <div
          className="cursor-pointer hover:underline"
          onClick={() =>
            handleVoucherPrint({
              ...row,
              vr_no: row?.vr_no ?? row?.challan_no,
              mtm_id:
                row?.mtm_id ??
                row?.smtm_id ??
                row?.mtmid ??
                row?.mtmId ??
                row?.mid ??
                row?.id,
            })
          }
        >
          <div>{row?.challan_no}</div>
          <div>{row?.challan_date}</div>
        </div>
      ),
    },
    
    {
      key: 'product_name',
      header: 'Product & Details',
      width: '100px',
      cellClass: 'align-center',
      render: (row: any) => {
        const coaName = getRelevantCoaName(row);
        return (
          <div className="min-w-52 break-words align-top">
            {Array.isArray(row?.purchase_master?.details) &&
              row.purchase_master.details.length > 0 &&
              row.purchase_master.details.map((detail: any, i: number) => {
                const categoryName = detail?.product?.category?.name ?? "";
                const productName = detail?.product?.name ?? "";
                return (
                  <div key={detail?.id ?? i} className="leading-normal">
                    {String(stockReportType) === "1" && categoryName ? `${categoryName} ` : ""}
                    {productName}
                    
                  </div>
                );
              })}
            {coaName && (
              <div className="text-sm mt-1 font-semibold">
                {coaName}
              </div>
            )}
            { row?.purchase_master?.notes && (
              <div>{row?.purchase_master?.notes}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'vehicle_no',
      header: 'Vehicle Number',
      width: '120px',
      render: (row: any) => {
        return (
          <div className="text-left">
            <div>{row?.purchase_master?.vehicle_no}</div>
            
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Quantity',
      headerClass: 'text-right',
      cellClass: 'text-right align-top',
      render: (row: any) => {
        return (
          <div>
            {row?.purchase_master?.details?.map(
              (detail: any, index: number) => (
                <div key={index}>
                  <span>
                    {( thousandSeparator(detail?.quantity, 2))}{' '}
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
      cellClass: 'text-right align-top',
      render: (row: any) => (
        <div>
          {row?.purchase_master?.details?.map((detail: any, index: number) => (
            <div key={index}>
              <span>{thousandSeparator(detail?.purchase_price, 2)}</span>
            </div>
          ))}
        </div>
      ),
      width: '100px',
    },

    {
      key: 'total',
      header: 'Total',
      headerClass: 'text-right',
      cellClass: 'text-right align-top',
      render: (row: any) => (
        <div>
          {row?.purchase_master?.details?.map((detail: any, index: number) => (
            <div key={index}>
              <span>
                {thousandSeparator(
                  detail?.purchase_price * detail?.quantity,
                  0,
                )}
              </span>
            </div>
          ))}
        </div>
      ),
      width: '100px',
    },
    {
      key: 'discount',
      header: 'Discount',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      render: (row: any) => {
        const transaction = row?.acc_transaction_master?.find((tm: any) =>
          tm?.acc_transaction_details?.some(
            (detail: any) => detail?.coa4_id === 40,
          ),
        );
        const creditValue = transaction?.acc_transaction_details?.find(
          (detail: any) => detail?.coa4_id === 40,
        )?.credit;

        // value format করা এবং default
        const displayValue = creditValue
          ? thousandSeparator(creditValue, 0)
          : '-';

        return <div className="text-right">{displayValue}</div>;
      },
      width: '120px',
    },
    {
      key: 'acc_transaction_master',
      header: 'Payment',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      render: (row: any) => {
        const transaction = row?.acc_transaction_master?.find((tm: any) =>
          tm?.acc_transaction_details?.some(
            (detail: any) => detail?.coa4_id === 17,
          ),
        );
        const creditValue = transaction?.acc_transaction_details?.find(
          (detail: any) => detail?.coa4_id === 17,
        )?.credit;

        // value format করা এবং default
        const displayValue = creditValue
          ? thousandSeparator(creditValue, 0)
          : '-';

        return <div className="text-right">{displayValue}</div>;
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
        return (
          <ImagePopup
            title={row?.remarks || ''}
            branchPad={row?.branch_id?.toString().padStart(4, '0') || ''} // 👈 here
            voucher_image={row?.voucher_image || ''}
          />
        );
      },
    },
  ];

  const handlePrint = useReactToPrint({
    content: () => {
      if (!printRef.current) {
        // alert("Nothing to print: Ref not ready");
        return null;
      }
      return printRef.current;
    },
    documentTitle: 'Purchase Ledger',
    // onAfterPrint: () => alert('Printed successfully!'),
    removeAfterPrint: true,
  });

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;

    // optional: min/max guard
    const safe = Math.max(1, Math.min(100, v));
    setPerPage(safe);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;

    // optional: min/max guard
    const safe = Math.max(1, Math.min(100, v));
    setFontSize(safe);
  };

  const purchaseCalc = new PurchaseLedgerCalculator(tableData || []);
  const totalQuantity = purchaseCalc.getTotalQuantity();
  const totalPayment = purchaseCalc.getTotalPayment();
  const grandTotal = purchaseCalc.getGrandTotal();
  const discountTotal = purchaseCalc.getDiscountTotal();

  return (
    <div className="">
      <HelmetTitle title={'Purchase Ledger'} />
      <div className="px-4 py-3 ">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${
                filterOpen
                  ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'
              }`}
              title="Open filters"
              aria-label="Open filters"
            >
              <FiFilter size={16} />
            </button>

            {filterOpen && (
              <div className="absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,360px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
                      onChange={handleBranchChange}
                      value={branchId == null ? '' : String(branchId)}
                      className="w-full font-medium text-sm p-2"
                      branchDdl={dropdownData}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Account</label>
                    <DdlMultiline
                      acType={''}
                      onSelect={selectedLedgerOptionHandler}
                      value={selectedLedgerOption}
                      className="h-10"
                    />
                  </div>

                  <div className="relative">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Product</label>
                    <div
                      onClick={() => selectedProduct(null)}
                      className="absolute right-2 top-9 z-10 cursor-pointer"
                      title="Clear selected product"
                    >
                      <FaRotateRight size={16} className="dark:text-white" />
                    </div>
                    <ProductDropdown
                      onSelect={selectedProduct}
                      className="appearance-none"
                      value={selectedProductOption}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <InputDatePicker
                      setCurrentDate={handleStartDate}
                      className="w-full font-medium text-sm h-10"
                      selectedDate={startDate}
                      setSelectedDate={setStartDate}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
                      setCurrentDate={handleEndDate}
                      className="w-full font-medium text-sm h-10"
                      selectedDate={endDate}
                      setSelectedDate={setEndDate}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={buttonLoading}
                      label="Apply"
                      icon=""
                      className="h-10 px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      label="Reset"
                      icon=""
                      className="h-10 px-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300">
            Use the filter
          </div>

          <div className="ml-auto flex items-end gap-2">
            <InputElement
              id="perPage"
              name="perPage"
              label=""
              value={perPage.toString()}
              onChange={handlePerPageChange}
              type="text"
              className="font-medium text-sm h-10 !w-20 text-center"
            />
            <InputElement
              id="fontSize"
              name="fontSize"
              label=""
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type="text"
              className="font-medium text-sm h-10 !w-20 text-center"
            />
            <PrintButton
              onClick={handlePrint}
              label="Print"
              className="h-10 px-6"
              disabled={!Array.isArray(tableData) || tableData.length === 0}
            />
          </div>
        </div>
      </div>
      <div className="overflow-y-auto">
        {ledgerData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />
        {/* Summary row */}
        {tableData.length > 0 && (
          <div className="mt-2 border-t font-bold">
            <div className="flex justify-end space-x-8 p-2">
              <div>Quantity: {thousandSeparator(totalQuantity, 0)}</div>
              <div>Total: {thousandSeparator(totalPayment, 0)}</div>
              <div>Discount: {thousandSeparator(discountTotal, 0)}</div>
              <div>Payment: {thousandSeparator(grandTotal, 0)}</div>
            </div>
          </div>
        )}
      </div>
      <div className="hidden">
        <PurchaseLedgerPrint
          ref={printRef}
          rows={tableData || []}
          startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
          title="Purchase Ledger"
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
        />
        <VoucherPrintRegistry
          ref={voucherRegistryRef}
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
        />

      </div>
    </div>
  );
};

export default PurchaseLedger;
