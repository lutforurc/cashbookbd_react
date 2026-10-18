import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import Loader from '../../../../common/Loader';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { API_REPORT_PRODUCT_STATEMENT_URL } from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import InputDatePicker from '../../../utils/fields/DatePicker';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import Table from '../../../utils/others/Table';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import ProductStatementPrint from './ProductStatementPrint';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import { FiCheckSquare, FiFilter, FiRotateCcw } from 'react-icons/fi';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';

const aliasValue = (row: any, keys: string[], fallback: any = null) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return fallback;
};

const formatDisplayDate = (value: any) => {
  if (!value) return '';

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
  if (numericValue === 0) return '-';

  return numericValue.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    useGrouping: true,
  });
};

const ProductStatement = (user: any) => {
  const dispatch = useDispatch();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [selectedProductOption, setSelectedProductOption] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
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

  const selectedProduct = (option: any) => {
    if (option === null) {
      setProductId(null);
      setSelectedProductOption(null);
      return;
    }

    setProductId(Number(option.value));
    setSelectedProductOption({ value: option.value, label: option.label });
  };

  const run = async (branch: number | null, product: number | null, start: Date | null, end: Date | null) => {
    if (!branch || !start || !end) {
      setError('Please select branch and date range.');
      return;
    }

    setButtonLoading(true);
    setError('');

    try {
      const startDateValue = encodeURIComponent(dayjs(start).format('DD/MM/YYYY'));
      const endDateValue = encodeURIComponent(dayjs(end).format('DD/MM/YYYY'));
      // No product = the whole company's stock, which is what the Name column
      // is for. The server treats a blank here as "all".
      const productParam = product ? `&product_id=${product}` : '';
      const response = await httpService.get(
        `${API_REPORT_PRODUCT_STATEMENT_URL}?branch_id=${branch}${productParam}&startdate=${startDateValue}&enddate=${endDateValue}`,
      );

      const payload = response?.data;
      if (payload?.success === false) {
        throw new Error(payload?.message || payload?.error?.message || 'Product statement load failed');
      }

      const rawData = payload?.data?.data ?? payload?.data ?? payload;
      setTableData(Array.isArray(rawData?.details) ? rawData.details : []);
      setTotals(rawData?.totals ?? null);
      setFilterOpen(false);
    } catch (err: any) {
      setTableData([]);
      setTotals(null);
      setError(err?.response?.data?.message || err?.message || 'Product statement load failed');
    } finally {
      setButtonLoading(false);
    }
  };

  const runReport = () => run(branchId, productId, startDate, endDate);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Product Statement',
  });

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  const columns = [
    {
      key: 'sl',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <div>{row?.sl || '-'}</div>,
    },
    {
      key: 'product_name',
      header: 'Name',
      render: (row: any) => <div>{row?.product_name || '-'}</div>,
    },
    {
      key: 'type',
      header: 'Type',
      headerClass: 'text-left',
      cellClass: 'text-left',
      render: (row: any) => <div>{row?.type || '-'}</div>,
    },
    {
      key: 'invoice_no',
      header: 'Inv. No.',
      headerClass: 'text-left',
      cellClass: 'text-left',
      render: (row: any) => (
        <div
          className={`${
            row?.is_opening
              ? 'font-medium text-slate-900 dark:text-[rgb(var(--c-text))]'
              : 'cursor-pointer hover:underline'
          }`}
          onClick={() => {
            if (row?.is_opening) return;
            handleVoucherPrint({
              ...row,
              vr_no: row?.invoice_no || '',
              mtm_id: row?.mtm_id ?? row?.mtmid,
            });
          }}
        >
          {row?.is_opening ? 'Opening' : row?.invoice_no || '-'}
        </div>
      ),
    },
    {
      key: 'invoice_date',
      header: 'Inv. Date',
      headerClass: 'text-left',
      cellClass: 'text-left',
      render: (row: any) => <div>{formatDisplayDate(row?.invoice_date)}</div>,
    },
    {
      key: 'qty',
      header: 'Qty',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <div className={Number(row?.qty) < 0 ? 'text-red-600 dark:text-red-400' : ''}>
          {thousandSeparator( Number(row?.qty) )}
        </div>
      ),
    },
    {
      key: 'purchase_price',
      header: 'Purchase Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <div>{thousandSeparator( Number(row?.purchase_price) )}</div>,
    },
    {
      key: 'sales_price',
      header: 'Sales Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <div>{thousandSeparator( Number(row?.sales_price) )}</div>,
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <div>{thousandSeparator( Number(row?.amount) )}</div>,
    },
    {
      key: 'stock',
      header: 'Stock',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <div>{thousandSeparator( Number(row?.stock) )}</div>,
    },
  ];

  const totalAmount = useMemo(
    () => tableData.reduce((sum: number, row: any) => sum + (Number(row?.amount) || 0), 0),
    [tableData],
  );
  const netQty = useMemo(
    () => tableData.reduce((sum: number, row: any) => sum + (Number(row?.qty) || 0), 0),
    [tableData],
  );

  const footerRows = tableData.length
    ? [
        [
          { label: 'Total', colSpan: 5, className: 'text-right' },
          { label: thousandSeparator(netQty), className: 'text-right' },
          { label: '-', className: 'text-right' },
          { label: '-', className: 'text-right' },
          { label: totalAmount ? thousandSeparator(totalAmount) : '-', className: 'text-right' },
          { label: thousandSeparator(totals?.closing), className: 'text-right' },
        ],
      ]
    : undefined;

  return (
    <>
      <HelmetTitle title="Product Statement" />

      <div className="">
        <div className="py-3">
          <div className={`gap-3 ${useFilterMenuEnabled ? 'flex flex-wrap items-center gap-3' : 'flex flex-wrap items-end'}`}>
            <div className={useFilterMenuEnabled ? 'relative shrink-0' : 'min-w-[320px] flex-1 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none'}>
              {useFilterMenuEnabled && (
                <Button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className={`inline-flex w-10 items-center justify-center rounded border text-sm transition ${
 filterOpen
 ?'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300':'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'}`}
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
                      ? 'absolute left-0 top-full z-1000 mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800'
                      : 'w-full'
                  }
                >
                  <div
                    className={
                      useFilterMenuEnabled
                        ? 'space-y-3'
                        : 'grid grid-cols-4 items-end gap-3'
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
                        className="w-full font-medium text-sm h-10 p-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Product</label>
                      <ProductDropdown
 onSelect={selectedProduct}
 className="appearance-none "
 value={selectedProductOption}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
                      <InputDatePicker
 label=""
 selectedDate={startDate}
 setSelectedDate={setStartDate}
 setCurrentDate={setStartDate}
 className="font-medium text-sm w-full "
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
                      <InputDatePicker
 label=""
 selectedDate={endDate}
 setSelectedDate={setEndDate}
 setCurrentDate={setEndDate}
 className="font-medium text-sm w-full "
                      />
                    </div>

                    <div
                      className={`flex gap-2 pt-1 ${
                        useFilterMenuEnabled
                          ? 'justify-end'
                          : 'hidden'
                      } ${useFilterMenuEnabled ? '' : 'md:col-span-2 xl:col-span-1'}`}
                    >
                      <ButtonLoading
                        onClick={runReport}
                        buttonLoading={buttonLoading}
                        label="Apply"
                        icon={<FiCheckSquare />}
                        className="px-6"
                      />
                      <ButtonLoading
                        onClick={handleResetFilters}
                        buttonLoading={false}
                        label="Reset"
                        icon={<FiRotateCcw />}
                        className="px-4"
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

            {useFilterMenuEnabled ? (
              <div className="ml-auto flex items-end gap-2">
                {selectedProductOption?.label ? (
                  <div className="flex h-10 min-w-[220px] max-w-[320px] items-center rounded border border-[rgb(var(--c-border))] bg-white px-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <span className="truncate" title={selectedProductOption.label}>{selectedProductOption.label}</span>
                  </div>
                ) : null}
                <PrintRowsInput
                  id="rowsPerPage"
                  name="rowsPerPage"
                  label=""
                  value={rowsPerPage.toString()}
                  onChange={(e) => setRowsPerPage(Number(e.target.value) || 0)}
                  type="text"
                  className="font-medium text-sm w-20! text-center"
                />

                <PrintFontInput
                  id="fontSize"
                  name="fontSize"
                  label=""
                  value={fontSize.toString()}
                  onChange={(e) => setFontSize(Number(e.target.value) || 12)}
                  type="text"
                  className="font-medium text-sm w-20! text-center"
                />

                <PrintButton
                  onClick={handlePrint}
                  label="Print"
                  className="px-6"
                  disabled={!Array.isArray(tableData) || tableData.length === 0}
                />
              </div>
            ) : (
              <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto xl:ml-auto">
                <div className="flex flex-nowrap items-end gap-2">
                  <ButtonLoading
                    onClick={runReport}
                    buttonLoading={buttonLoading}
                    label="Apply"
                    icon={<FiCheckSquare />}
                    className="px-6"
                  />
                  <ButtonLoading
                    onClick={handleResetFilters}
                    buttonLoading={false}
                    label="Reset"
                    icon={<FiRotateCcw />}
                    className="px-4"
                  />
                </div>

                <div className="flex flex-nowrap items-end gap-2">
                  <PrintRowsInput
                    id="rowsPerPage"
                    name="rowsPerPage"
                    label=""
                    value={rowsPerPage.toString()}
                    onChange={(e) => setRowsPerPage(Number(e.target.value) || 0)}
                    type="text"
                    className="font-medium text-sm w-20! text-center"
                  />

                  <PrintFontInput
                    id="fontSize"
                    name="fontSize"
                    label=""
                    value={fontSize.toString()}
                    onChange={(e) => setFontSize(Number(e.target.value) || 12)}
                    type="text"
                    className="font-medium text-sm w-20! text-center"
                  />

                  <PrintButton
                    onClick={handlePrint}
                    label="Print"
                    className="px-6"
                    disabled={!Array.isArray(tableData) || tableData.length === 0}
                  />
                </div>
              </div>
            )}
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
            data={tableData || []}
            footerRows={footerRows}
            noDataMessage="No data found"
            className=""
          />
        </div>
      </div>

      <div className="hidden">
        <ProductStatementPrint
          ref={printRef}
          rows={tableData}
          totals={totals}
          branchName={selectedBranchName}
          productName={aliasValue(selectedProductOption, ['label'], '')}
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

export default ProductStatement;
