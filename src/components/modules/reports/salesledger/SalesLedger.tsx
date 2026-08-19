import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import { useHighlightRules } from '../../../utils/highlight/useHighlightRules';
import { matchHighlightRule, highlightLineClass } from '../../../utils/highlight/highlightRules';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import { getSalesLedger } from './salesLedgerSlice';
import dayjs from 'dayjs';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import ImagePopup from '../../../utils/others/ImagePopup';
import SalesLedgerCalculator from '../../../utils/calculators/SalesLedgerCalculator';
import { getRelevantCoaName } from '../utils/ledgerNameResolver';
import { useReactToPrint } from 'react-to-print';
import SalesLedgerPrint from './SalesLedgerPrint';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import {
  useRemoveVoucherApproval,
  useVoucherPrint,
  VoucherActionButtons,
} from '../../vouchers';
import { FiCheckSquare, FiFilter, FiRotateCcw } from 'react-icons/fi';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import { toast } from 'react-toastify';
import httpService from '../../../services/httpService';
import { API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL } from '../../../services/apiRoutes';
import { hasAnyPermission } from '../../../Sidebar/permissionUtils';
import { hasPermission } from '../../../utils/permissionChecker';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import {
  buildVoucherAutoEditState,
  getCombinedVoucherOpenState,
  getVoucherEditTarget,
} from '../../../utils/utils-functions/voucherEditNavigation';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';
import routes from '../../../services/appRoutes';
import SearchInput from '../../../utils/fields/SearchInput';
import OrderTypes from '../../../utils/utils-functions/OrderTypes';

const SALES_LEDGER_FILTER_STORAGE_KEY = 'sales-ledger-filter-state';

type SalesLedgerSavedFilters = {
  branchId?: number | string | null;
  ledgerId?: number | string | null;
  productId?: number | string | null;
  selectedLedgerOption?: any;
  selectedProductOption?: any;
  startDate?: string | null;
  endDate?: string | null;
  search?: string;
};

const toNullableNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const parseStoredDate = (value?: string | null) => {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const readSavedSalesLedgerFilters = (): SalesLedgerSavedFilters | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(SALES_LEDGER_FILTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const isZeroAmount = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue === 0;
};

const formatAmountOrZeroMark = (value: unknown) => (
  isZeroAmount(value) ? '-' : thousandSeparator(value)
);

const joinedZeroMarkClass =
  'block -mx-3 border-red-600 px-3 leading-5 text-red-600';

const SalesLedger = (user: any) => {
  const dispatch = useDispatch();
  const highlightRules = useHighlightRules();
  const navigate = useNavigate();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const ledgerData = useSelector((state: any) => state.salesLedger);
  const settings = useSelector((state: any) => state.settings);
  const stockReportType = settings?.data?.branch?.stock_report_type;
  const showVoucherImage = String(settings?.data?.branch?.show_voucher_image) === '1';
  const userPermissions = settings?.data?.permissions || [];

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [buttonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);

  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerAccount] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [selectedLedgerOption, setSelectedLedgerOption] = useState<any>(null);
  const [selectedProductOption, setSelectedProductOption] = useState<any>(null);
  const [orderType, setOrderType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRemoveApprovalConfirm, setShowRemoveApprovalConfirm] = useState(false);
  const [selectedApprovalRow, setSelectedApprovalRow] = useState<any | null>(null);
  const [search, setSearchValue] = useState('');
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');
  const canApproveCashbook = hasAnyPermission(userPermissions, ['cashbook.approved']);
  const canRemoveApproval = hasPermission(userPermissions, 'remove.approval');
  const canEditVoucher = hasAnyPermission(userPermissions, [
    'sales.edit',
    'cash.received.edit',
    'cash.payment.edit',
  ]);

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Rows + Font controls (like your screenshot)
  const [rowsPerPage, setRowsPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(10);

  // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Print
  const printRef = useRef<HTMLDivElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const restoredFilterRef = useRef(false);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  const { removingApprovalId, removeVoucherApproval, getVoucherId } = useRemoveVoucherApproval();
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Sales Ledger',
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user.user.branch_id);
  }, []);

  const saveSalesLedgerFilters = () => {
    if (typeof window === 'undefined') return;

    const filters: SalesLedgerSavedFilters = {
      branchId,
      ledgerId,
      productId,
      selectedLedgerOption,
      selectedProductOption,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : null,
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : null,
      search,
    };

    window.sessionStorage.setItem(
      SALES_LEDGER_FILTER_STORAGE_KEY,
      JSON.stringify(filters),
    );
  };

  useEffect(() => {
    const savedFilters = readSavedSalesLedgerFilters();
    if (!savedFilters) return;

    restoredFilterRef.current = true;
    setBranchId(toNullableNumber(savedFilters.branchId) ?? user.user.branch_id);
    setLedgerAccount(toNullableNumber(savedFilters.ledgerId));
    setProductId(toNullableNumber(savedFilters.productId));
    setSelectedLedgerOption(savedFilters.selectedLedgerOption || null);
    setSelectedProductOption(savedFilters.selectedProductOption || null);
    setStartDate(parseStoredDate(savedFilters.startDate));
    setEndDate(parseStoredDate(savedFilters.endDate));
    setSearchValue(savedFilters.search || '');
  }, []);

  useEffect(() => {
    if (!ledgerData.isLoading) {
      if (Array.isArray(ledgerData?.data)) {
        setTableData(ledgerData.data);
      } else {
        setTableData([]); // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â¥ CLEAR OLD DATA
      }
    }
  }, [ledgerData.isLoading, ledgerData.data]);

  const handleBranchChange = (e: any) => {
    setBranchId(e.target.value);
  };

  const handleOrderTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setOrderType(event.target.value);
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

    saveSalesLedgerFilters();

    dispatch(
      getSalesLedger({
        branchId,
        ledgerId,
        productId,
        startDate: startD,
        endDate: endD,
        search,
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
      if (!restoredFilterRef.current) {
        setStartDate(parsedDate);
        setEndDate(parsedDate);
        setBranchId(user.user.branch_id);
      }
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
    setFilterOpen(false);
  };

  const handleEditVoucher = (row: any) => {
    saveSalesLedgerFilters();

    const combinedNumber = String(row?.combined_number || '').trim();
    if (combinedNumber) {
      const combinedOpenState = getCombinedVoucherOpenState(row);
      if (combinedOpenState.hasApprovedVoucher) {
        if (!combinedOpenState.editableVoucherNo) {
          toast.error('Approved voucher cannot be opened.');
          return;
        }

        const editTarget = getVoucherEditTarget(combinedOpenState.editableVoucherNo);
        const editState = buildVoucherAutoEditState(combinedOpenState.editableVoucherNo);

        if (!editTarget || !editState) {
          toast.error('Edit route not found for this voucher.');
          return;
        }

        navigate(editTarget.route, { state: editState });
        return;
      }

      navigate(routes.inv_trading_combined, {
        state: {
          combinedAutoEdit: true,
          combinedNumber,
        },
      });
      return;
    }

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

  const handleApproveClick = async (rowArg?: any) => {
    const targetRow = rowArg ?? selectedApprovalRow;
    const voucherId = Number(
      targetRow?.mtm_id ??
      targetRow?.smtm_id ??
      targetRow?.mtmid ??
      targetRow?.mtmId ??
      targetRow?.mid ??
      targetRow?.id ??
      0,
    );

    if (!voucherId) {
      toast.error('Approval id not found.');
      return;
    }

    try {
      setApprovingId(voucherId);
      const response = await httpService.post(`${API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL}/${voucherId}`, {});
      const result = response?.data;

      if (result === '1' || result?.success) {
        toast.success('Voucher approved successfully.');
        setShowApproveConfirm(false);
        setSelectedApprovalRow(null);
        handleActionButtonClick();
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

  const handleRemoveApprovalClick = async (rowArg?: any) => {
    await removeVoucherApproval(rowArg ?? selectedApprovalRow, {
      onSuccess: () => {
        setShowRemoveApprovalConfirm(false);
        setSelectedApprovalRow(null);
        handleActionButtonClick();
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
          row?.acc_transaction_master?.[0]?.acc_transaction_details?.[0]?.remarks ?? '';
        const detailText = notes || remarks;

        return (
          <div className="min-w-52 wrap-break-word align-top">
            {coaName && (
              <div className="text-sm mt-1 font-semibold">{coaName}</div>
            )}

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
            {detailText ? (
              <div className="text-green-500 dark:text-yellow-300">
                <span
                  className={highlightLineClass(
                    matchHighlightRule(detailText, highlightRules),
                  )}
                >
                  {detailText}
                </span>
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'vhicle',
      header: 'Vehicle & Order',
      headerClass: 'text-left',
      cellClass: 'text-left align-top',
      width: '120px',
      render: (row: any) =>
        <div>
          <span className='block'>{formatTransportationNumber(row?.sales_master?.vehicle_no)}</span>
          <span className='text-green-500 dark:text-yellow-300 block'>{row?.sales_master?.sales_order?.order_number}</span>
          {row?.sales_master?.sales_order?.delivery_location && (
            <span className='text-green-500 dark:text-yellow-300 block '>{row?.sales_master?.sales_order?.delivery_location}</span>
          )}
        </div>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      width: '120px',
      render: (row: any) => (
        <>
          {(row?.sales_master?.details ?? []).map((detail: any, index: number) => (
            <div key={detail?.id ?? index}>
              {thousandSeparator(detail?.quantity)} {detail?.product?.unit?.name}
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
      cellClass: 'text-right align-center',
      render: (row: any) => (
        <>
          {(row?.sales_master?.details ?? []).map((detail: any, index: number) => {
            const rate = detail?.sales_price;
            const total = Math.floor((detail?.quantity || 0) * (detail?.sales_price || 0));
            const shouldJoinZeroMark = isZeroAmount(rate) && isZeroAmount(total);

            return (
              <div key={detail?.id ?? index}>
                <span className={shouldJoinZeroMark ? `${joinedZeroMarkClass} border-y border-l` : undefined}>
                  {formatAmountOrZeroMark(rate)}
                </span>
              </div>
            );
          })}
        </>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      width: '130px',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      render: (row: any) => (
        <>
          {(row?.sales_master?.details ?? []).map((detail: any, index: number) => {
            const rate = detail?.sales_price;
            const total = Math.floor((detail?.quantity || 0) * (detail?.sales_price || 0));
            const shouldJoinZeroMark = isZeroAmount(rate) && isZeroAmount(total);

            return (
              <div key={detail?.id ?? index}>
                <span className={shouldJoinZeroMark ? `${joinedZeroMarkClass} border-y border-r` : undefined}>
                  {formatAmountOrZeroMark(total)}
                </span>
              </div>
            );
          })}
        </>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      headerClass: 'text-right',
      cellClass: 'text-right v-middle',
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

        return <div className="text-right">{totalDiscount ? thousandSeparator(totalDiscount) : '-'}</div>;
      },
    },
    {
      key: 'received',
      header: 'Received',
      headerClass: 'text-right',
      cellClass: 'text-right v-middle',
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

        return <div className="text-right">{totalReceived ? thousandSeparator(totalReceived) : '-'}</div>;
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right v-middle',
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

        return <div className="text-right">{thousandSeparator(balance)}</div>;
      },
    },
    // Branch > Feature Controls > Show Voucher Image.
    ...(showVoucherImage
      ? [
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
                branchPad={row?.branch_id?.toString().padStart(4, '0') || ''}
                voucher_image={row?.voucher_image || ''}
              />
            );
          },
        },
      ]
      : []),
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
            canEditVoucher={canEditVoucher}
            stopPropagation
            printTitle="Print Invoice"
            editTitle="Edit Invoice"
            confirmInline
            onApprove={handleApproveClick}
            onRemoveApproval={handleRemoveApprovalClick}
            onPrint={handlePrintVoucher}
            onEdit={(actionRow) => handleEditVoucher(buildVoucherActionRow(actionRow))}
          />
        );
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
      <div className="px-0 py-6">
        <div className="flex flex-wrap items-start gap-3 min-[1750px]:flex-nowrap min-[1750px]:items-end">
          <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'w-full min-w-0'}>
            {useFilterMenuEnabled && (
              <Button
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
              </Button>
            )}

            {(useFilterMenuEnabled ? filterOpen : true) && (
              <div
                className={
                  useFilterMenuEnabled
                    ? 'absolute left-0 top-full z-1000 mt-2 w-[min(92vw,360px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                    : 'w-full'
                }
              >
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'space-y-3'
                      : 'grid grid-cols-1 items-end gap-3 min-[1180px]:grid-cols-4'
                  }
                >
                  <div className={useFilterMenuEnabled ? '' : 'order-1 min-w-0 min-[1180px]:col-span-1'}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                    {branchDdlData.isLoading == true ? <Loader /> : ''}
                    <BranchDropdown
                      onChange={handleBranchChange}
                      value={branchId == null ? '' : String(branchId)}
                      className="w-full font-medium text-sm p-2 h-10"
                      branchDdl={dropdownData}
                    />
                  </div>

                  <div className={useFilterMenuEnabled ? '' : 'order-2 min-w-0 min-[1180px]:col-span-1'}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Account</label>
                    <DdlMultiline
                      acType={''}
                      onSelect={selectedLedgerOptionHandler}
                      value={selectedLedgerOption}
                      className="h-10"
                    />
                  </div>

                  <div className={`relative ${useFilterMenuEnabled ? '' : 'order-4 min-w-0 min-[1180px]:col-span-1'}`}>
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
                      value={selectedProductOption}
                      className="appearance-none h-10"
                    />
                  </div>

                  <div className={useFilterMenuEnabled ? 'space-y-3' : 'order-6 grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:col-span-2'}>
                    <div className="min-w-0">
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                      <InputDatePicker
 setCurrentDate={handleStartDate}
 className="w-full font-medium text-sm "
 selectedDate={startDate}
 setSelectedDate={setStartDate}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                      <InputDatePicker
 setCurrentDate={handleEndDate}
 className="w-full font-medium text-sm "
 selectedDate={endDate}
 setSelectedDate={setEndDate}
                      />
                    </div>
                  </div>
                  <div className={useFilterMenuEnabled ? '' : 'order-5 min-w-0 min-[1180px]:col-span-1'}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Search
                    </label>
                    <SearchInput
 search={search}
 setSearchValue={setSearchValue}
 className="w-full"
                    />
                  </div>
                  {!useFilterMenuEnabled && (
                    <div className="hidden">
                      <div className="min-w-0 flex-[1.1]">
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                        <InputDatePicker
 setCurrentDate={handleEndDate}
 className="w-full font-medium text-sm "
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
                          className="h-9 px-6"
                        />
                        <ButtonLoading
                          onClick={handleResetFilters}
                          buttonLoading={false}
                          label="Reset"
                          icon={<FiRotateCcw />}
                          className="h-9 px-4"
                        />
                        <PrintRowsInput
 id="perPageInlineMd"
 name="perPageInlineMd"
 label=""
 value={rowsPerPage.toString()}
 onChange={handleRowsPerPageChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
                        />
                        <PrintFontInput
 id="fontSizeInlineMd"
 name="fontSizeInlineMd"
 label=""
 value={fontSize.toString()}
 onChange={handleFontSizeChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
                        />
                        <PrintButton
                          onClick={handlePrint}
                          label="Print"
                          className="h-9 px-6"
                          disabled={!Array.isArray(tableData) || tableData.length === 0}
                        />
                      </div>
                    </div>
                  )}

                  {/* ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Rows + Font + Run + Print (like your screenshot) */}
                  <div
                    className={`${useFilterMenuEnabled
                      ? 'flex flex-wrap justify-end gap-2'
                      : 'order-7 flex w-full flex-wrap items-end gap-2 min-[1180px]:col-span-1 min-[1180px]:min-w-0 min-[1180px]:flex-nowrap min-[1180px]:justify-start min-[1180px]:gap-1'
                      }`}
                  >
                    <ButtonLoading
                      onClick={handleActionButtonClick}
                      buttonLoading={buttonLoading}
                      label="Apply"
                      icon={<FiCheckSquare />}
                      className="h-9 px-2"
                    />
                    <ButtonLoading
                      onClick={handleResetFilters}
                      buttonLoading={false}
                      label="Reset"
                      icon={<FiRotateCcw />}
                      className="h-9 px-2"
                    />
                    {!useFilterMenuEnabled && (
                      <>
                        <PrintRowsInput
 id="perPageInline"
 name="perPageInline"
 label=""
 value={rowsPerPage.toString()}
 onChange={handleRowsPerPageChange}
 type="text"
 className="font-medium text-sm w-14! text-center"
                        />
                        <PrintFontInput
 id="fontSizeInline"
 name="fontSizeInline"
 label=""
 value={fontSize.toString()}
 onChange={handleFontSizeChange}
 type="text"
 className="font-medium text-sm w-14! text-center"
                        />
                        {/* Icon only, for want of room beside Apply and Reset --
                            hence the tooltip, which is all the name it has. */}
                        <PrintButton
                          onClick={handlePrint}
                          label=""
                          title="Print"
                          className="h-9 px-2"
                          disabled={!Array.isArray(tableData) || tableData.length === 0}
                        />
                      </>
                    )}
                  </div>

                  {!useFilterMenuEnabled && (
                    <div className="hidden">
                      <div className="min-w-0 flex-[1.15]">
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                        <InputDatePicker
 setCurrentDate={handleStartDate}
 className="w-full font-medium text-sm "
 selectedDate={startDate}
 setSelectedDate={setStartDate}
                        />
                      </div>

                      <div className="min-w-0 flex-[1.15]">
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                        <InputDatePicker
 setCurrentDate={handleEndDate}
 className="w-full font-medium text-sm "
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
                        <PrintRowsInput
 id="perPageInline"
 name="perPageInline"
 label=""
 value={rowsPerPage.toString()}
 onChange={handleRowsPerPageChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
                        />

                        <PrintFontInput
 id="fontSizeInline"
 name="fontSizeInline"
 label=""
 value={fontSize.toString()}
 onChange={handleFontSizeChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
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

          {useFilterMenuEnabled && (
            <div className="ml-auto flex w-full flex-wrap items-end justify-end gap-2 md:ml-auto md:w-auto">
              {selectedLedgerOption?.label ? (
                <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                  <span className="truncate" title={selectedLedgerOption.label}>{selectedLedgerOption.label}</span>
                </div>
              ) : null}
              {selectedProductOption?.label ? (
                <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                  <span className="truncate" title={selectedProductOption.label}>{selectedProductOption.label}</span>
                </div>
              ) : null}
              <PrintRowsInput
 id="perPage"
 name="perPage"
 label=""
 value={rowsPerPage.toString()}
 onChange={handleRowsPerPageChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
              />

              <PrintFontInput
 id="fontSize"
 name="fontSize"
 label=""
 value={fontSize.toString()}
 onChange={handleFontSizeChange}
 type="text"
 className="font-medium text-sm w-20! text-center"
              />

              <PrintButton
                onClick={handlePrint}
                label=""
                className="h-10 px-6"
                disabled={!Array.isArray(tableData) || tableData.length === 0}
              />
            </div>
          )}
        </div>
      </div>

      <div className="overflow-y-auto">
        {ledgerData.isLoading && <Loader />}
        <Table columns={columns} data={tableData || []} />

        {tableData.length > 0 && (
          <div className="mt-2 border-t font-bold">
            <div className="flex justify-end space-x-8 p-2">
              <div>Quantity: {thousandSeparator(totalQuantity)}</div>
              <div>Total: {thousandSeparator(totalPayment)}</div>
              <div>Discount: {thousandSeparator(totalDiscount)}</div>
              <div>Received: {thousandSeparator(grandTotal)}</div>
              <div>Balance: {thousandSeparator(totalBalance)}</div>
            </div>
          </div>
        )}
      </div>

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
