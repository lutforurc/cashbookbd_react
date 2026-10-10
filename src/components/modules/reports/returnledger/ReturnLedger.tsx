import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiRotateCcw } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { useNavigate } from 'react-router-dom';

import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import Loader from '../../../../common/Loader';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import InputDatePicker from '../../../utils/fields/DatePicker';
import SearchInput from '../../../utils/fields/SearchInput';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import {
  API_REPORT_PURCHASE_RETURN_LEDGER_URL,
  API_REPORT_SALES_RETURN_LEDGER_URL,
} from '../../../services/apiRoutes';
import { hasAnyPermission } from '../../../Sidebar/permissionUtils';
import {
  buildVoucherAutoEditState,
  getEditableVoucherNo,
  getVoucherEditTarget,
} from '../../../utils/utils-functions/voucherEditNavigation';
import { VoucherActionButtons } from '../../vouchers';

import { getRelevantCoaName } from '../utils/ledgerNameResolver';
import { ledgerProductLabel } from '../utils/ledgerProductLabel';
import ReturnLedgerPrint from './ReturnLedgerPrint';
import {
  returnGrandTotals,
  returnLines,
  returnRowBalance,
  returnRowCash,
  returnRowDiscount,
  returnRowTotal,
  type ReturnLedgerConfig,
} from './returnLedgerTotals';

/**
 * Purchase Return / Sales Return.
 *
 * ⚠️ ONE SCREEN, TWO REPORTS. The two differ in exactly four facts -- which
 * relation holds the lines, which head the discount reverses against, which
 * side the cash sits on, and what the labels say -- so those four are the
 * `mode` config below and everything else is shared. A second copy of this file
 * is how the two would quietly stop agreeing.
 *
 * ⚠️ THE SHAPE IS THE LEDGER'S, DELIBERATELY. Same columns in the same order as
 * the Purchase / Sales Ledger this sits under in the menu, same filters (branch,
 * account, product, date range, search), same grand-total footer, same print.
 * Somebody who has read a ledger should be able to read this without being
 * taught a second layout.
 *
 * ⚠️ AND THE BALANCE IS THE LEDGER'S FORMULA, ON THE RETURN'S SIDES:
 * total - discount - cash. See returnLedgerTotals.ts, which is also what the
 * printed sheet reads -- the two cannot drift.
 *
 * ⚠️ EDIT, BUT NOTHING ELSE. A right-hand Action column offers the pencil the
 * Purchase / Sales Ledger offer, because a return noticed to be wrong here
 * should be fixable from here. It is the same route into the same screen those
 * ledgers use -- `voucherAutoEdit` on the return screen -- so there is still
 * one way to correct a return, not two. Print, challan and approve stay off:
 * the return screen owns those, and a second print path is a second layout to
 * keep in step.
 */

type ReturnMode = 'purchase' | 'sales';

const CONFIG: Record<ReturnMode, ReturnLedgerConfig & {
  title: string;
  cashLabel: string;
  url: string;
  storageKey: string;
  /** The permissions the return's own screen is gated on -- offering a pencil
   *  to somebody who cannot open that screen would only lead to a refusal. */
  editPermissions: string[];
}> = {
  purchase: {
    title: 'Purchase Return',
    cashLabel: 'Paid Back',
    url: API_REPORT_PURCHASE_RETURN_LEDGER_URL,
    storageKey: 'purchase-return-ledger-filter-state',
    partyRelation: 'purchase_return_master',
    discountCoa4: 40,
    discountSide: 'debit',
    cashCoa4: 17,
    cashSide: 'debit',
    editPermissions: ['purchase.create', 'purchase.return.view'],
  },
  sales: {
    title: 'Sales Return',
    cashLabel: 'Refunded',
    url: API_REPORT_SALES_RETURN_LEDGER_URL,
    storageKey: 'sales-return-ledger-filter-state',
    partyRelation: 'sales_return_master',
    discountCoa4: 23,
    discountSide: 'credit',
    cashCoa4: 17,
    cashSide: 'credit',
    editPermissions: ['sales.create', 'sales.return'],
  },
};

type SavedFilters = {
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
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const parseStoredDate = (value?: string | null) => {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const ReturnLedger = ({ user, mode }: { user: any; mode: ReturnMode }) => {
  const cfg = CONFIG[mode];
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const userPermissions = settings?.data?.permissions || [];
  const canEditVoucher = hasAnyPermission(userPermissions, cfg.editPermissions);
  const stockReportType = settings?.data?.branch?.stock_report_type;
  // Branch > Invoice Setup > "Show Product Information in Ledger Details".
  // Unset reads as on, exactly as the ledgers beside this read it.
  const showProductDetails =
    String(settings?.data?.branch?.ledger_show_product_details ?? '1') !== '0';

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [selectedLedgerOption, setSelectedLedgerOption] = useState<any>(null);
  const [selectedProductOption, setSelectedProductOption] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [search, setSearchValue] = useState('');
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const restoredFilterRef = useRef(false);
  const printRef = useRef<HTMLDivElement>(null);

  const printSheet = useReactToPrint({
    contentRef: printRef,
    documentTitle: cfg.title,
  });

  // The branch the report actually runs for. The state above starts empty and
  // fills from the logged-in user, but that is not always there -- the ledgers
  // beside this one fall back to the branch the app is working in, and the box
  // shows the same value so the name on screen is the name in the data.
  const effectiveBranchId = branchId ?? settings?.data?.branch?.id ?? null;

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user?.user?.branch_id);
  }, []);

  // Filters survive a trip to another report and back, per report -- the
  // ledgers' own behaviour, and the reason the two keys differ.
  useEffect(() => {
    let saved: SavedFilters | null = null;

    try {
      const raw = window.sessionStorage.getItem(cfg.storageKey);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }

    if (!saved) return;

    restoredFilterRef.current = true;
    setBranchId(toNullableNumber(saved.branchId) ?? user?.user?.branch_id);
    setLedgerId(toNullableNumber(saved.ledgerId));
    setProductId(toNullableNumber(saved.productId));
    setSelectedLedgerOption(saved.selectedLedgerOption || null);
    setSelectedProductOption(saved.selectedProductOption || null);
    setStartDate(parseStoredDate(saved.startDate));
    setEndDate(parseStoredDate(saved.endDate));
    setSearchValue(saved.search || '');
  }, []);

  // The branch's transaction date, which is where the ledgers start too.
  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;

    if (!protectedData?.data || !protectedData?.transactionDate) return;

    setDropdownData(protectedData.data);

    if (restoredFilterRef.current) return;

    const [day, month, year] = String(protectedData.transactionDate).split('/');
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));

    setStartDate(parsed);
    setEndDate(parsed);
    setBranchId(user?.user?.branch_id);
  }, [branchDdlData?.protectedData]);

  const load = async () => {
    const save: SavedFilters = {
      branchId,
      ledgerId,
      productId,
      selectedLedgerOption,
      selectedProductOption,
      startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : null,
      endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : null,
      search,
    };

    try {
      window.sessionStorage.setItem(cfg.storageKey, JSON.stringify(save));
    } catch {
      // A browser that refuses storage still gets the report.
    }

    setLoading(true);

    try {
      const res = await httpService.get(cfg.url, {
        params: {
          branch_id: effectiveBranchId,
          ledger_id: ledgerId,
          item_id: productId,
          startdate: dayjs(startDate).format('YYYY-MM-DD'),
          enddate: dayjs(endDate).format('YYYY-MM-DD'),
          search,
        },
      });

      const payload = res?.data?.data?.data;

      setRows(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      // ⚠️ A RETURN WITH NOTHING IN THE RANGE IS NOT AN ERROR. The API answers
      // `notFound()` rather than an empty list -- the ledgers do the same -- so
      // a 404 here means "no returns in this range", which is a blank table.
      // Saying it out loud matters because a report with no data is a fact the
      // reader came to establish, not a failure to tell them about.
      setRows([]);
      toast.info(`${cfg.title}: এই সময়ের মধ্যে কোনো রিটার্ন নেই`);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => returnGrandTotals(rows, cfg), [rows, cfg]);

  const selectedLedgerOptionHandler = (option: any) => {
    if (!option) {
      setLedgerId(null);
      setSelectedLedgerOption(null);
      return;
    }

    setLedgerId(option.value);
    setSelectedLedgerOption({ value: option.value, label: option.label });
  };

  const selectedProductOptionHandler = (option: any) => {
    if (option === null) {
      setProductId(null);
      setSelectedProductOption(null);
      return;
    }

    setProductId(option.value);
    setSelectedProductOption({ value: option.value, label: option.label });
  };

  const handleResetFilters = () => {
    setLedgerId(null);
    setProductId(null);
    setSelectedLedgerOption(null);
    setSelectedProductOption(null);
    setSearchValue('');
  };

  /**
   * Open the return this row reports, on its own screen.
   *
   * ⚠️ THE SAME HAND-OFF THE LEDGERS USE, on purpose: the return screen reads
   * `voucherAutoEdit` off the route state and searches for the number itself. A
   * query string or a second edit screen would be a second way in, and the two
   * would drift the first time the screen changed how it loads.
   */
  const handleEditVoucher = (row: any) => {
    const voucherNo = getEditableVoucherNo(row);
    const editTarget = getVoucherEditTarget(voucherNo);
    const editState = buildVoucherAutoEditState(voucherNo);

    if (!voucherNo || !editTarget || !editState) {
      toast.error('Edit route not found for this voucher.');
      return;
    }

    navigate(editTarget.route, { state: editState });
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value)) return;

    setPerPage(Math.max(0, Math.min(100, value)));
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!Number.isFinite(value)) return;

    setFontSize(Math.max(7, Math.min(24, value)));
  };

  const amountOrZero = (value: number) =>
    Number(value) === 0 ? '-' : thousandSeparator(value);

  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      headerClass: 'text-center',
      cellClass: 'text-center',
      width: '90px',
    },
    {
      key: 'challan_no',
      header: 'Chal. No. & Date',
      width: '140px',
      render: (row: any) => (
        <div>
          <div>{row?.challan_no}</div>
          <div>{row?.challan_date}</div>
          {/* What the return is against, when it says -- the returned bill. */}
          {row?.ref_invoice_no ? (
            <div className="text-xs text-bodydark2">{row.ref_invoice_no}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'product_name',
      header: 'Product & Details',
      cellClass: 'align-center',
      render: (row: any) => {
        const coaName = getRelevantCoaName(row);
        const lines = returnLines(row, cfg);

        return (
          <div className="min-w-52 wrap-break-word align-top">
            {coaName ? <div className="text-sm font-semibold">{coaName}</div> : null}

            {showProductDetails &&
              lines.map((line: any, i: number) => (
                <div key={line?.id ?? i} className="leading-normal">
                  {ledgerProductLabel(line, String(stockReportType) === '1')}
                </div>
              ))}

            {row?.[cfg.partyRelation]?.notes ? (
              <div className="text-green-500">{row[cfg.partyRelation].notes}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'vehicle_no',
      header: 'Vehicle',
      width: '120px',
      render: (row: any) => (
        <div className="text-left">
          {/* ⚠️ Off the bill the return is against: the return screen never
              asks for a vehicle, so blank is the honest answer and a common one. */}
          {formatTransportationNumber(row?.vehicle_no)}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      width: '120px',
      render: (row: any) =>
        showProductDetails ? (
          <div>
            {returnLines(row, cfg).map((line: any, index: number) => (
              <div key={index}>
                <span>
                  {thousandSeparator(line?.quantity)} {line?.product?.unit?.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div>-</div>
        ),
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      width: '120px',
      render: (row: any) =>
        showProductDetails ? (
          <div>
            {returnLines(row, cfg).map((line: any, index: number) => (
              <div key={index}>
                <span>{amountOrZero(line?.return_price)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div>-</div>
        ),
    },
    {
      key: 'total',
      header: 'Total',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      width: '130px',
      render: (row: any) => {
        if (!showProductDetails) {
          return <div>{amountOrZero(returnRowTotal(row, cfg))}</div>;
        }

        return (
          <div>
            {returnLines(row, cfg).map((line: any, index: number) => (
              <div key={index}>
                <span>
                  {amountOrZero(
                    (Number(line?.return_price) || 0) * (Number(line?.quantity) || 0),
                  )}
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: 'discount',
      header: 'Discount',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      width: '110px',
      render: (row: any) => (
        <div className="text-right">{amountOrZero(returnRowDiscount(row, cfg))}</div>
      ),
    },
    {
      key: 'cash',
      header: cfg.cashLabel,
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      width: '120px',
      render: (row: any) => (
        <div className="text-right">{amountOrZero(returnRowCash(row, cfg))}</div>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right align-center',
      width: '120px',
      render: (row: any) => (
        <div className="text-right">{amountOrZero(returnRowBalance(row, cfg))}</div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        const isApproved = Number(row?.is_approved ?? 0) === 1;

        return (
          <VoucherActionButtons
            // The buttons read `vr_no`; this report calls the same voucher
            // `challan_no`, as the ledgers beside it do.
            row={{ ...row, vr_no: row?.vr_no ?? row?.challan_no }}
            voucherId={Number(row?.mtmid ?? row?.smtm_id ?? 0)}
            isApproved={isApproved}
            canShowEditAction={canEditVoucher && !isApproved}
            canEditVoucher={canEditVoucher}
            stopPropagation
            editTitle="Edit Return"
            onEdit={handleEditVoucher}
          />
        );
      },
    },
  ];

  return (
    <div>
      <HelmetTitle title={cfg.title} />

      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-black dark:text-white">{cfg.title}</h2>
      </div>

      {/* The filters sit straight on the page, with no card of their own -- the
          Purchase / Sales Ledger beside these reports have none either. */}
      <div className="mb-3 w-full min-w-0">
        <div className="grid grid-cols-1 items-end gap-3 min-[1180px]:grid-cols-4">
          <div className="order-1 min-w-0 min-[1180px]:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Branch
            </label>
            {branchDdlData?.isLoading ? <Loader /> : null}
            <BranchDropdown
              onChange={(e: any) => setBranchId(e.target.value)}
              value={effectiveBranchId == null ? '' : String(effectiveBranchId)}
              className="w-full font-medium text-sm p-2 "
              branchDdl={dropdownData}
            />
          </div>

          <div className="order-2 min-w-0 min-[1180px]:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Account
            </label>
            <DdlMultiline
              acType={''}
              onSelect={selectedLedgerOptionHandler}
              value={selectedLedgerOption}
              className=""
            />
          </div>

          <div className="order-3 min-w-0 min-[1180px]:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Product
            </label>
            <ProductDropdown
              onSelect={selectedProductOptionHandler}
              className="appearance-none "
              value={selectedProductOption}
            />
          </div>

          <div className="order-4 min-w-0 min-[1180px]:col-span-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Search
            </label>
            <SearchInput search={search} setSearchValue={setSearchValue} className="w-full" />
          </div>

          <div className="order-5 grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:col-span-2">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Start Date
              </label>
              <InputDatePicker
                setCurrentDate={setStartDate}
                className="w-full font-medium text-sm "
                selectedDate={startDate}
                setSelectedDate={setStartDate}
              />
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                End Date
              </label>
              <InputDatePicker
                setCurrentDate={setEndDate}
                className="w-full font-medium text-sm "
                selectedDate={endDate}
                setSelectedDate={setEndDate}
              />
            </div>
          </div>

          <div className="order-6 flex min-w-max flex-nowrap items-end gap-2 min-[1180px]:col-span-2">
            <ButtonLoading
              onClick={load}
              buttonLoading={loading}
              label="Apply"
              icon={<FiCheckSquare />}
              className="px-6"
            />
            <ButtonLoading
              onClick={handleResetFilters}
              buttonLoading={false}
              label="Reset"
              className="px-4"
              icon={<FiRotateCcw />}
            />
            <PrintRowsInput
              id="returnLedgerRows"
              name="returnLedgerRows"
              label=""
              value={perPage.toString()}
              onChange={handlePerPageChange}
              type="text"
              className="font-medium text-sm w-20! min-w-[80px] text-center"
            />
            <PrintFontInput
              id="returnLedgerFont"
              name="returnLedgerFont"
              label=""
              value={fontSize.toString()}
              onChange={handleFontSizeChange}
              type="text"
              className="font-medium text-sm w-20! min-w-[80px] text-center"
            />
            <PrintButton
              onClick={printSheet}
              label="Print"
              className="px-6"
              disabled={rows.length === 0}
            />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto">
        {loading ? <Loader /> : null}

        {/* ⚠️ THE SUMMARY IS THE TABLE'S OWN FOOT, not a strip under it -- see
            PurchaseLedger.tsx, where a footer outside the table ruled itself in
            the browser's default border colour with no sides. */}
        <Table
          columns={columns}
          data={rows}
          footerRows={
            rows.length > 0
              ? [
                  [
                    {
                      colSpan: columns.length,
                      label: (
                        <div className="flex items-center justify-end space-x-8 whitespace-nowrap font-bold">
                          <div>Grand Total</div>
                          <div className="flex space-x-8">
                            <div>Quantity: {thousandSeparator(totals.quantity)}</div>
                            <div>Total: {thousandSeparator(totals.total)}</div>
                            <div>Discount: {thousandSeparator(totals.discount)}</div>
                            <div>
                              {cfg.cashLabel}: {thousandSeparator(totals.cash)}
                            </div>
                            <div>Balance: {thousandSeparator(totals.balance)}</div>
                          </div>
                        </div>
                      ),
                    },
                  ],
                ]
              : undefined
          }
          noDataMessage="এই সময়ের মধ্যে কোনো রিটার্ন পাওয়া যায়নি।"
        />
      </div>

      <div className="hidden">
        <ReturnLedgerPrint
          ref={printRef}
          rows={rows}
          cfg={cfg}
          title={cfg.title}
          cashLabel={cfg.cashLabel}
          startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : undefined}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : undefined}
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
        />
      </div>
    </div>
  );
};

export default ReturnLedger;
