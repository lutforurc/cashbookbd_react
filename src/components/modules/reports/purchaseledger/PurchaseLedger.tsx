import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import PurchaseLedgerCalculator from '../../../utils/calculators/PurchaseLedgerCalculator';
import { getRelevantCoaName } from '../utils/ledgerNameResolver';
import PurchaseLedgerPrint from './PurchaseLedgerPrint';
import { useReactToPrint } from 'react-to-print';
import InputElement from '../../../utils/fields/InputElement';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import {
  useRemoveVoucherApproval,
  useVoucherPrint,
  VoucherActionButtons,
} from '../../vouchers';
import { FiBook, FiCheckSquare, FiFilter, FiRotateCcw } from 'react-icons/fi';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import { toast } from 'react-toastify';
import httpService from '../../../services/httpService';
import { API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL } from '../../../services/apiRoutes';
import { hasAnyPermission } from '../../../Sidebar/permissionUtils';
import { hasPermission } from '../../../utils/permissionChecker';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import {
  buildVoucherAutoEditState,
  getVoucherEditTarget,
} from '../../../utils/utils-functions/voucherEditNavigation';
import { formatBdShortDate } from '../../../utils/utils-functions/formatDate';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';

const PurchaseLedger = (user: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const branchDdlData = useSelector((state) => state.branchDdl);
  const ledgerData = useSelector((state) => state.purchaseLedger);
  const settings = useSelector((state: any) => state.settings);
  const stockReportType = settings?.data?.branch?.stock_report_type;
  const userPermissions = settings?.data?.permissions || [];
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
  const { removingApprovalId, removeVoucherApproval, getVoucherId } = useRemoveVoucherApproval();
  const [perPage, setPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRemoveApprovalConfirm, setShowRemoveApprovalConfirm] = useState(false);
  const [selectedApprovalRow, setSelectedApprovalRow] = useState<any | null>(null);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');
  const canApproveCashbook = hasAnyPermission(userPermissions, ['cashbook.approved']);
  const canRemoveApproval = hasPermission(userPermissions, 'remove.approval');
  const canEditVoucher = hasAnyPermission(userPermissions, [
    'purchase.edit',
    'sales.edit',
    'cash.received.edit',
    'cash.payment.edit',
  ]);


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

  const runPurchaseLedger = () => {
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

  const handleActionButtonClick = () => {
    runPurchaseLedger();
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

  const handleEditVoucher = (row: any) => {
    const voucherNo = String(row?.vr_no || '').trim();
    const editTarget = getVoucherEditTarget(voucherNo);
    const editState = buildVoucherAutoEditState(voucherNo);

    if (!voucherNo || !editTarget || !editState) {
      toast.error('Edit route not found for this voucher.');
      return;
    }

    navigate(editTarget.route, { state: editState });
  };

  const handleApprovePrompt = (row: any) => {
    setSelectedApprovalRow(row);
    setShowApproveConfirm(true);
  };

  const handleRemoveApprovalPrompt = (row: any) => {
    setSelectedApprovalRow(row);
    setShowRemoveApprovalConfirm(true);
  };

  const handleApproveClick = async () => {
    const voucherId = Number(
      selectedApprovalRow?.mtm_id ??
      selectedApprovalRow?.smtm_id ??
      selectedApprovalRow?.mtmid ??
      selectedApprovalRow?.mtmId ??
      selectedApprovalRow?.mid ??
      selectedApprovalRow?.id ??
      0,
    );

    if (!voucherId) {
      toast.error('Approval id not found.');
      return;
    }

    try {
      setApprovingId(voucherId);
      const response = await httpService.get(`${API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL}/${voucherId}`);
      const result = response?.data;

      if (result === '1' || result?.success) {
        toast.success('Voucher approved successfully.');
        setShowApproveConfirm(false);
        setSelectedApprovalRow(null);
        runPurchaseLedger();
        return;
      }

      if (result === '2') {
        toast.error('Voucher not found.');
        return;
      }

      toast.error(typeof result === 'string' ? result : 'Voucher approval failed.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Voucher approval failed.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRemoveApprovalClick = async () => {
    await removeVoucherApproval(selectedApprovalRow, {
      onSuccess: () => {
        setShowRemoveApprovalConfirm(false);
        setSelectedApprovalRow(null);
        runPurchaseLedger();
      },
    });
  };

  const buildVoucherActionRow = (row: any) => ({
    ...row,
    vr_no: row?.vr_no ?? row?.challan_no,
    mtm_id:
      row?.mtm_id ??
      row?.smtm_id ??
      row?.mtmid ??
      row?.mtmId ??
      row?.mid ??
      row?.id,
  });

  const handlePrintVoucher = (row: any) => {
    const printableRow = buildVoucherActionRow(row);

    if (!printableRow?.vr_no || !printableRow?.mtm_id) {
      toast.error('Voucher print data not found.');
      return;
    }

    handleVoucherPrint(printableRow);
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
            {row?.purchase_master?.notes && (
              <div className='text-green-500 dark:text-yellow-300'>{row?.purchase_master?.notes}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'vehicle_no',
      header: 'Vehicle & Order',
      width: '120px',
      render: (row: any) => {
        return (
          <div className="text-left">
            <span className='block'>{ formatTransportationNumber(row?.purchase_master?.vehicle_no)}</span>
             <span className='text-green-500 dark:text-yellow-300 block'>{ row?.purchase_master?.purchase_order?.order_number}</span>
             { row?.purchase_master?.purchase_order?.delivery_location && (
               <span className='text-green-500 dark:text-yellow-300 block'>{ row?.purchase_master?.purchase_order?.delivery_location}</span>
             )}
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
                    {(thousandSeparator(detail?.quantity))}{' '}
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
              <span>{thousandSeparator(detail?.purchase_price)}</span>
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
                  detail?.purchase_price * detail?.quantity)}
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

        // value format Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¾ Ã Â¦ÂÃ Â¦Â¬Ã Â¦â€š default
        const displayValue = creditValue
          ? thousandSeparator(creditValue)
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

        // value format Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¾ Ã Â¦ÂÃ Â¦Â¬Ã Â¦â€š default
        const displayValue = creditValue
          ? thousandSeparator(creditValue)
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
            branchPad={row?.branch_id?.toString().padStart(4, '0') || ''} // Ã°Å¸â€˜Ë† here
            voucher_image={row?.voucher_image || ''}
          />
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      render: (row: any) => {
        const voucherId = Number(
          row?.mtm_id ??
          row?.smtm_id ??
          row?.mtmid ??
          row?.mtmId ??
          row?.mid ??
          row?.id ??
          0,
        );
        const isApproved = Number(row?.is_approved ?? 0) === 1;
        const canShowApproveAction = canApproveCashbook && !!row?.vr_no && voucherId > 0;
        const canShowRemoveApprovalAction =
          canRemoveApproval && !!row?.vr_no && voucherId > 0 && isApproved;
        return (
          <VoucherActionButtons
            row={row}
            voucherId={voucherId}
            isApproved={isApproved}
            approvingId={approvingId}
            removingApprovalId={removingApprovalId}
            canShowApproveAction={canShowApproveAction}
            canShowRemoveApprovalAction={canShowRemoveApprovalAction}
            canShowPrintAction={canEditVoucher}
            canShowEditAction={canEditVoucher && !isApproved}
            stopPropagation
            printTitle="Print Invoice"
            onApprove={handleApprovePrompt}
            onRemoveApproval={handleRemoveApprovalPrompt}
            onPrint={handlePrintVoucher}
            onEdit={handleEditVoucher}
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
      <div className="px-0 py-6 ">
        <div className="flex flex-wrap items-start gap-3 min-[1750px]:flex-nowrap min-[1750px]:items-end">
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'min-w-0 flex-[1_1_820px]'}>
            {useFilterMenuEnabled && (
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${filterOpen
                    ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'
                  }`}
                title="Open filters"
                aria-label="Open filters"
              >
                <FiFilter size={16} />
              </button>
            )}

            {(useFilterMenuEnabled ? filterOpen : true) && (
              <div
                className={
                  useFilterMenuEnabled
                    ? 'absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,360px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                    : 'w-full'
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'space-y-3'
                      : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-3 min-[1750px]:grid-cols-[minmax(180px,1.2fr)_minmax(180px,1.2fr)_minmax(180px,1.2fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]'
                  }
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
                      onChange={handleBranchChange}
                      value={branchId == null ? '' : String(branchId)}
                      className="w-full font-medium text-sm p-2 h-10"
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
                      {/* <FaRotateRight size={16} className="dark:text-white" /> */}
                    </div>
                    <ProductDropdown
                      onSelect={selectedProduct}
                      className="appearance-none h-9.5"
                      value={selectedProductOption}
                    />
                  </div>

                  <div className="block xl:hidden min-[1750px]:block">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                    <InputDatePicker
                      setCurrentDate={handleStartDate}
                      className="w-full font-medium text-sm h-10"
                      selectedDate={startDate}
                      setSelectedDate={setStartDate}
                    />
                  </div>

                  <div className="block md:hidden xl:hidden min-[1750px]:block">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                    <InputDatePicker
                      setCurrentDate={handleEndDate}
                      className="w-full font-medium text-sm h-10"
                      selectedDate={endDate}
                      setSelectedDate={setEndDate}
                    />
                  </div>

                  {!useFilterMenuEnabled && (
                    <div className="hidden items-end gap-3 md:col-span-2 md:flex xl:hidden">
                      <div className="min-w-0 flex-[1.1]">
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                        <InputDatePicker
                          setCurrentDate={handleEndDate}
                          className="w-full font-medium text-sm h-10"
                          selectedDate={endDate}
                          setSelectedDate={setEndDate}
                        />
                      </div>

                      <div className="ml-auto flex min-w-max flex-nowrap items-end gap-2 pt-6">
                        <ButtonLoading
                          onClick={handleActionButtonClick}
                          buttonLoading={buttonLoading}
                          label="Apply"
                          icon={<FiCheckSquare />}
                          className="h-10 px-6"
                        />
                        <ButtonLoading
                          onClick={handleResetFilters}
                          buttonLoading={false}
                          label="Reset"
                          icon=""
                          className="h-10 px-4"
                        />
                        <InputElement
                          id="perPageInline"
                          name="perPageInline"
                          label=""
                          value={perPage.toString()}
                          onChange={handlePerPageChange}
                          type="text"
                          className="font-medium text-sm h-10 !w-20 min-w-[80px] text-center"
                        />
                        <InputElement
                          id="fontSizeInline"
                          name="fontSizeInline"
                          label=""
                          value={fontSize.toString()}
                          onChange={handleFontSizeChange}
                          type="text"
                          className="font-medium text-sm h-10 !w-20 min-w-[80px] text-center"
                        />
                        <PrintButton
                          onClick={handlePrint}
                          label="Print"
                          className="h-10 px-6"
                          disabled={!Array.isArray(tableData) || tableData.length === 0}
                        />
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex gap-2 pt-1 ${useFilterMenuEnabled
                        ? 'justify-end'
                        : 'hidden xl:hidden min-[1750px]:col-span-1 min-[1750px]:flex'
                      }`}
                  >
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={buttonLoading}
                      label="Apply"
                      icon={<FiCheckSquare />}
                      className="h-10 px-6"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      label="Reset"
                      icon={<FiRotateCcw />}
                      className="h-10 px-4"
                    />
                  </div>

                  {!useFilterMenuEnabled && (
                    <div className="hidden items-end gap-3 xl:col-span-3 xl:flex min-[1750px]:hidden">
                      <div className="min-w-0 flex-[1.15]">
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                        <InputDatePicker
                          setCurrentDate={handleStartDate}
                          className="w-full font-medium text-sm h-10"
                          selectedDate={startDate}
                          setSelectedDate={setStartDate}
                        />
                      </div>

                      <div className="min-w-0 flex-[1.15]">
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                        <InputDatePicker
                          setCurrentDate={handleEndDate}
                          className="w-full font-medium text-sm h-10"
                          selectedDate={endDate}
                          setSelectedDate={setEndDate}
                        />
                      </div>

                      <div className="flex items-end gap-2 pt-6">
                        <ButtonLoading
                          onClick={handleActionButtonClick}
                          buttonLoading={buttonLoading}
                          label="Apply"
                          icon={<FiCheckSquare />}
                          className="h-10 px-6"
                        />
                        <ButtonLoading
                          onClick={handleResetFilters}
                          buttonLoading={false}
                          label="Reset"
                          icon={<FiRotateCcw />}
                          className="h-10 px-4"
                        />
                      </div>

                      <div className="ml-auto flex items-end gap-2 pt-6">
                        <InputElement
                          id="perPageInlineLg"
                          name="perPageInlineLg"
                          label=""
                          value={perPage.toString()}
                          onChange={handlePerPageChange}
                          type="text"
                          className="font-medium text-sm h-10 !w-20 min-w-[80px] text-center"
                        />
                        <InputElement
                          id="fontSizeInlineLg"
                          name="fontSizeInlineLg"
                          label=""
                          value={fontSize.toString()}
                          onChange={handleFontSizeChange}
                          type="text"
                          className="font-medium text-sm h-10 !w-20 min-w-[80px] text-center"
                        />
                        <PrintButton
                          onClick={handlePrint}
                          label="Print"
                          className="h-10 px-6"
                          disabled={!Array.isArray(tableData) || tableData.length === 0}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`${useFilterMenuEnabled ? 'hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300' : 'hidden'}`}>
            Use the filter
          </div>

          <div className={`ml-auto flex w-full flex-wrap items-end justify-end gap-2 ${useFilterMenuEnabled ? 'md:ml-auto md:w-auto' : 'md:hidden xl:hidden min-[1750px]:flex min-[1750px]:w-auto min-[1750px]:flex-nowrap'}`}>
            {useFilterMenuEnabled && selectedLedgerOption?.label ? (
              <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                <span className="truncate" title={selectedLedgerOption.label}>{selectedLedgerOption.label}</span>
              </div>
            ) : null}
            {useFilterMenuEnabled && selectedProductOption?.label ? (
              <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                <span className="truncate" title={selectedProductOption.label}>{selectedProductOption.label}</span>
              </div>
            ) : null}
            {!useFilterMenuEnabled && (
              <>
                <ButtonLoading
                  onClick={handleActionButtonClick}
                  buttonLoading={buttonLoading}
                  label="Apply"
                  icon={<FiCheckSquare />}
                  className="h-10 px-6 min-[1750px]:hidden"
                />
                <ButtonLoading
                  onClick={handleResetFilters}
                  buttonLoading={false}
                  label="Reset"
                  icon={<FiRotateCcw />}
                  className="h-10 px-4 min-[1750px]:hidden"
                />
              </>
            )}
            <InputElement
              id="perPage"
              name="perPage"
              label=""
              value={perPage.toString()}
              onChange={handlePerPageChange}
              type="text"
              className="font-medium text-sm h-10 !w-20 min-w-[80px] text-center"
            />
            <InputElement
              id="fontSize"
              name="fontSize"
              label=""
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type="text"
              className="font-medium text-sm h-10 !w-20 min-w-[80px] text-center"
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
        <ConfirmModal
          show={showApproveConfirm}
          title="Confirm Voucher Approval"
          message={
            <div className="space-y-2">
              <p>Are you sure you want to approve voucher</p>
              <p className="text-lg font-semibold">{selectedApprovalRow?.vr_no || '-'}</p>
            </div>
          }
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          loading={approvingId === Number(
            selectedApprovalRow?.mtm_id ??
            selectedApprovalRow?.smtm_id ??
            selectedApprovalRow?.mtmid ??
            selectedApprovalRow?.mtmId ??
            selectedApprovalRow?.mid ??
            selectedApprovalRow?.id ??
            0,
          )}
          onCancel={() => {
            if (approvingId) return;
            setShowApproveConfirm(false);
            setSelectedApprovalRow(null);
          }}
          onConfirm={handleApproveClick}
          className="bg-green-600 hover:bg-sky-600"
        />
        <ConfirmModal
          show={showRemoveApprovalConfirm}
          title="Confirm Remove Approval"
          message={
            <div className="space-y-2">
              <p>Are you sure you want to remove approval from voucher</p>
              <p className="text-lg font-semibold">{selectedApprovalRow?.vr_no || '-'}</p>
            </div>
          }
          confirmLabel="Remove"
          cancelLabel="Cancel"
          loading={removingApprovalId === getVoucherId(selectedApprovalRow)}
          onCancel={() => {
            if (removingApprovalId) return;
            setShowRemoveApprovalConfirm(false);
            setSelectedApprovalRow(null);
          }}
          onConfirm={handleRemoveApprovalClick}
          className="bg-amber-600 hover:bg-amber-700"
        />
        {/* Summary row */}
        {tableData.length > 0 && (
          <div className="mt-2 border-t font-bold">
            <div className="flex justify-end space-x-8 p-2">
              <div>Quantity: {thousandSeparator(totalQuantity)}</div>
              <div>Total: {thousandSeparator(totalPayment)}</div>
              <div>Discount: {thousandSeparator(discountTotal)}</div>
              <div>Payment: {thousandSeparator(grandTotal)}</div>
              <div>Balance: {thousandSeparator((totalPayment - grandTotal - discountTotal))}</div>
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
