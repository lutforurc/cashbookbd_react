import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import Loader from '../../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { API_REPORT_PRODUCT_LEDGER_DATA_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import Table from '../../../utils/others/Table';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import ProductLedgerDataPrint from './ProductLedgerDataPrint';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import { FiFilter } from 'react-icons/fi';

const aliasValue = (row: any, keys: string[], fallback: any = null) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return fallback;
};

const extractRows = (payload: any) => {
  if (Array.isArray(payload)) return payload;

  const detailRows =
    payload?.rows ||
    payload?.details ||
    payload?.items ||
    payload?.data ||
    payload?.transactions ||
    [];

  const rows = Array.isArray(detailRows) ? [...detailRows] : [];
  const openingRow = payload?.opening || payload?.opening_row;
  const totalRow = payload?.total || payload?.total_row;

  if (openingRow && typeof openingRow === 'object' && !Array.isArray(openingRow)) {
    rows.unshift({ label: 'Opening', ...openingRow });
  }

  if (totalRow && typeof totalRow === 'object' && !Array.isArray(totalRow)) {
    rows.push({ label: 'Total', ...totalRow });
  }

  return rows;
};

const formatDisplayDate = (value: any) => {
  if (!value) return '-';

  const parsed = dayjs(value, ['YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY/MM/DD'], true);
  if (parsed.isValid()) {
    return parsed.format('DD/MM/YYYY');
  }

  return value;
};

const formatCellNumber = (value: any) => {
  if (value === null || value === undefined || value === '') return '-';
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return value;
  return thousandSeparator(numericValue, Number.isInteger(numericValue) ? 0 : 2);
};

const numberOrZero = (value: any) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const ProductLedgerData = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled =
    String(settings?.data?.branch?.use_filter_parameter ?? '') === '1';

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [selectedLedgerOption, setSelectedLedgerOption] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(12);
  const [fontSize, setFontSize] = useState<number>(12);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    setBranchId(Number(user?.user?.branch_id) || null);
  }, []);

  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;

    if (Array.isArray(protectedData?.data)) {
      setDropdownData(protectedData.data);
    }

    if (protectedData?.transactionDate) {
      const [day, month, year] = protectedData.transactionDate.split('/');
      setStartDate(new Date(Number(year), Number(month) - 1, 1));
      setEndDate(new Date(Number(year), Number(month) - 1, Number(day)));
    }
  }, [branchDdlData?.protectedData]);

  const selectedBranchName = useMemo(() => {
    const branch = dropdownData.find((item: any) => Number(item.id) === Number(branchId));
    return branch?.name ?? '';
  }, [branchId, dropdownData]);

  const reportRows = useMemo(() => {
    const sourceRows = Array.isArray(tableData) ? tableData : [];
    let runningStock = 0;

    const openingRow = sourceRows.find((row: any) => row?.label === 'Opening');
    if (openingRow) {
      runningStock = numberOrZero(aliasValue(openingRow, ['stock', 'opening', 'opening_qty'], 0));
    }

    const details = sourceRows
      .filter((row: any) => row?.label !== 'Opening' && row?.label !== 'Total')
      .map((row: any, index: number) => {
        const purchase = numberOrZero(aliasValue(row, ['purchase', 'purchase_qty'], 0));
        const salesReturn = numberOrZero(aliasValue(row, ['sales_return', 'salesReturn', 'sale_return'], 0));
        const sales = numberOrZero(aliasValue(row, ['sales', 'sale', 'sales_qty'], 0));
        const purchaseReturn = numberOrZero(aliasValue(row, ['purchase_return', 'purchaseReturn'], 0));

        runningStock += purchase + salesReturn - sales - purchaseReturn;

        return {
          ...row,
          sl: index + 1,
          runningStock,
        };
      });

    const totalPurchase = details.reduce((sum, row) => sum + numberOrZero(row?.purchase), 0);
    const totalSalesReturn = details.reduce((sum, row) => sum + numberOrZero(row?.sales_return), 0);
    const totalSales = details.reduce((sum, row) => sum + numberOrZero(row?.sales), 0);
    const totalPurchaseReturn = details.reduce((sum, row) => sum + numberOrZero(row?.purchase_return), 0);

    return {
      opening: openingRow ?? null,
      details,
      totals: {
        purchase: totalPurchase,
        salesReturn: totalSalesReturn,
        sales: totalSales,
        purchaseReturn: totalPurchaseReturn,
      },
    };
  }, [tableData]);

  const selectedProduct = (option: any) => {
    if (option === null) {
      setLedgerId(null);
      setSelectedLedgerOption(null);
      return;
    }

    setLedgerId(Number(option.value));
    setSelectedLedgerOption({
      value: option.value,
      label: option.label,
    });
  };

  const runReport = async () => {
    if (!branchId || !ledgerId || !startDate || !endDate) {
      setError('Please select branch, item / product and date range.');
      return;
    }

    setButtonLoading(true);
    setError('');

    try {
      const startDateValue = encodeURIComponent(dayjs(startDate).format('DD/MM/YYYY'));
      const endDateValue = encodeURIComponent(dayjs(endDate).format('DD/MM/YYYY'));
      const response = await httpService.get(
        `${API_REPORT_PRODUCT_LEDGER_DATA_URL}?branch_id=${branchId}&ledger_id=${ledgerId}&startdate=${startDateValue}&enddate=${endDateValue}`,
      );

      const payload = response?.data;
      if (payload?.success === false) {
        throw new Error(payload?.message || payload?.error?.message || 'Product ledger load failed');
      }

      const rawData =
        payload?.data?.data ??
        payload?.data ??
        payload;
      setTableData(extractRows(rawData));
      setFilterOpen(false);
    } catch (err: any) {
      setTableData([]);
      setError(err?.response?.data?.message || err?.message || 'Product ledger load failed');
    } finally {
      setButtonLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Product In Out',
    removeAfterPrint: true,
  });

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  const tableRows = useMemo(() => {
    const openingData = {
      rowType: 'opening',
      sl: '',
      invoice_no: 'Opening',
      vr_date: '',
      opening: aliasValue(reportRows.opening, ['opening', 'opening_qty'], '-'),
      purchase: '-',
      sales_return: '-',
      sales: '-',
      purchase_return: '-',
      stock: aliasValue(reportRows.opening, ['stock', 'balance', 'opening'], '-'),
    };

    const detailData = reportRows.details.map((row: any) => ({
      ...row,
      rowType: 'detail',
      opening: '-',
      stock: row.runningStock,
    }));

    return [openingData, ...detailData];
  }, [reportRows]);

  const columns = [
    {
      key: 'sl',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <div>{row?.sl || '-'}</div>,
    },
    {
      key: 'invoice_no',
      header: 'Invoice No.',
      render: (row: any) => (
        <div
          className={`${row?.rowType === 'opening' ? 'font-medium text-white' : 'cursor-pointer hover:underline'}`}
          onClick={() => {
            if (row?.rowType === 'opening') return;
            handleVoucherPrint({
              ...row,
              vr_no: aliasValue(row, ['vr_no', 'invoice_no', 'invoice', 'label'], ''),
              mtm_id: row?.mtm_id ?? row?.mtmid ?? row?.mtmId ?? row?.mid ?? row?.id,
            });
          }}
        >
          {aliasValue(row, ['invoice_no', 'invoice', 'vr_no', 'label'], '-')}
        </div>
      ),
    },
    {
      key: 'vr_date',
      header: 'Vr. Date',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div>{row?.rowType === 'opening' ? '' : formatDisplayDate(aliasValue(row, ['vr_date', 'date', 'trx_date'], '-'))}</div>
      ),
    },
    {
      key: 'opening',
      header: 'Opening',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <div>{formatCellNumber(row?.opening)}</div>,
    },
    {
      key: 'purchase',
      header: 'Purchase',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div>{formatCellNumber(aliasValue(row, ['purchase', 'purchase_qty'], row?.purchase))}</div>
      ),
    },
    {
      key: 'sales_return',
      header: 'Sales Return',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div>{formatCellNumber(aliasValue(row, ['sales_return', 'salesReturn', 'sale_return'], row?.sales_return))}</div>
      ),
    },
    {
      key: 'sales',
      header: 'Sales',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div>{formatCellNumber(aliasValue(row, ['sales', 'sale', 'sales_qty'], row?.sales))}</div>
      ),
    },
    {
      key: 'purchase_return',
      header: 'Purchase Return',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div>{formatCellNumber(aliasValue(row, ['purchase_return', 'purchaseReturn'], row?.purchase_return))}</div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <div>{formatCellNumber(row?.stock)}</div>,
    },
  ];

  const footerRows = reportRows.details.length || reportRows.opening
    ? [
        [
          {
            label: 'Total',
            colSpan: 3,
            className: 'text-right',
          },
          {
            label: '-',
            className: 'text-right',
          },
          {
            label: formatCellNumber(reportRows.totals.purchase > 0 ? reportRows.totals.purchase : '-'),
            className: 'text-right',
          },
          {
            label: formatCellNumber(reportRows.totals.salesReturn > 0 ? reportRows.totals.salesReturn : '-'),
            className: 'text-right',
          },
          {
            label: formatCellNumber(reportRows.totals.sales > 0 ? reportRows.totals.sales : '-'),
            className: 'text-right',
          },
          {
            label: formatCellNumber(reportRows.totals.purchaseReturn > 0 ? reportRows.totals.purchaseReturn : '-'),
            className: 'text-right',
          },
          {
            label: '-',
            className: 'text-right',
          },
        ],
      ]
    : undefined;

  return (
    <>
      <HelmetTitle title="Product In Out" />

      <div className="">
        <div className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'min-w-[320px] flex-1'}>
              {useFilterMenuEnabled && (
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
              )}

              {(useFilterMenuEnabled ? filterOpen : true) && (
                <div
                  className={
                    useFilterMenuEnabled
                      ? 'absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                      : 'w-full'
                  }
                >
                  <div
                    className={
                      useFilterMenuEnabled
                        ? 'space-y-3'
                        : 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(220px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]'
                    }
                  >
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                      {branchDdlData?.isLoading ? <Loader /> : ''}
                      <BranchDropdown
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setBranchId(e.target.value ? Number(e.target.value) : null)
                        }
                        branchDdl={dropdownData}
                        value={branchId ? String(branchId) : undefined}
                        className="w-full font-medium text-sm p-1.5"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Item / Product</label>
                      <ProductDropdown
                        onSelect={selectedProduct}
                        className="appearance-none h-10"
                        value={selectedLedgerOption}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                      <InputDatePicker
                        label=""
                        selectedDate={startDate}
                        setSelectedDate={setStartDate}
                        setCurrentDate={setStartDate}
                        className="font-medium text-sm w-full h-10"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                      <InputDatePicker
                        label=""
                        selectedDate={endDate}
                        setSelectedDate={setEndDate}
                        setCurrentDate={setEndDate}
                        className="font-medium text-sm w-full h-10"
                      />
                    </div>

                    <div
                      className={`flex gap-2 pt-1 ${
                        useFilterMenuEnabled
                          ? 'justify-end'
                          : 'justify-start self-end'
                      } ${useFilterMenuEnabled ? '' : 'md:col-span-2 xl:col-span-1'}`}
                    >
                      <ButtonLoading
                        onClick={runReport}
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

            <div
              className={`${
                useFilterMenuEnabled
                  ? 'hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300'
                  : 'hidden'
              }`}
            >
              Use the filter
            </div>

            <div className="ml-auto flex items-end gap-2">
              <InputElement
                id="rowsPerPage"
                name="rowsPerPage"
                label=""
                value={rowsPerPage.toString()}
                onChange={(e) => setRowsPerPage(Number(e.target.value) || 12)}
                type="text"
                className="font-medium text-sm h-10 !w-20 text-center"
              />

              <InputElement
                id="fontSize"
                name="fontSize"
                label=""
                value={fontSize.toString()}
                onChange={(e) => setFontSize(Number(e.target.value) || 12)}
                type="text"
                className="font-medium text-sm h-10 !w-20 text-center"
              />

              <PrintButton
                onClick={handlePrint}
                label="Print"
                className="h-10 px-6"
                disabled={!Array.isArray(tableRows) || tableRows.length === 0}
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="overflow-y-auto">
          {buttonLoading ? <Loader /> : ''}
          <Table
            columns={columns}
            data={tableRows || []}
            footerRows={footerRows}
            noDataMessage="No data found"
            className=""
          />
        </div>
      </div>

      <div className="hidden">
        <ProductLedgerDataPrint
          ref={printRef}
          rows={tableData}
          branchName={selectedBranchName}
          ledgerName={selectedLedgerOption?.label || ''}
          startDate={startDate ? dayjs(startDate).format('DD/MM/YYYY') : '-'}
          endDate={endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'}
          fontSize={fontSize}
          rowsPerPage={rowsPerPage}
        />
        <VoucherPrintRegistry
          ref={voucherRegistryRef}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </>
  );
};

export default ProductLedgerData;
