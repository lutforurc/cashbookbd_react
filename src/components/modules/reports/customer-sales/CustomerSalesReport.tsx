import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';
import { FiCheckSquare, FiRotateCcw } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import InputDatePicker from '../../../utils/fields/DatePicker';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import CategoryDropdown from '../../../utils/utils-functions/CategoryDropdown';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import FilterMenuShell from '../../../utils/components/FilterMenuShell';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';

import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { getCategoryDdl } from '../../category/categorySlice';
import { fetchBrandDdl } from '../../product/brand/brandSlice';
import { getProductGroupDdl } from '../../productgroup/productGroupSlice';
import { getCustomerSales, resetCustomerSales } from './customerSalesSlice';
import type { CustomerSalesRow } from './customerSalesSlice';
import { buildCustomerSalesRows } from './customerSalesGroups';
import CustomerSalesPrint from './CustomerSalesPrint';

const toArray = (value: any) => (Array.isArray(value) ? value : []);

const cell = 'border border-stroke px-2 py-2 align-top dark:border-strokedark';

/** "CODE - NAME", and only the name where the product has no code. */
const productLabel = (row: any) => {
  const code = String(row?.product_code ?? '').trim();
  const name = row?.product_name || '-';

  return code ? `${code} - ${name}` : name;
};

/**
 * Customer Sales Report.
 *
 * Every line of every sales invoice, filed Customer -> Brand -> Group ->
 * Category -> Product, with the product's dimensions as columns and a grand
 * total at the foot. Its own endpoint, so it reads the whole sales book at once
 * rather than account by account the way the Sales Ledger does.
 */
const CustomerSalesReport = (user: any) => {
  const dispatch = useDispatch<any>();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const categoryData: any = useSelector((state: any) => state.category);
  const brandData: any = useSelector((state: any) => state.brand);
  const productGroupData: any = useSelector((state: any) => state.productGroup);
  const report: any = useSelector((state: any) => state.customerSales);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [branchId, setBranchId] = useState<number | string | null>(null);
  const [customerId, setCustomerId] = useState<number | string | null>(null);
  const [selectedCustomerOption, setSelectedCustomerOption] = useState<any>(null);
  const [brandId, setBrandId] = useState<number | string | null>(null);
  const [groupId, setGroupId] = useState<number | string | null>(null);
  const [categoryId, setCategoryId] = useState<number | string | null>(null);
  const [productId, setProductId] = useState<number | string | null>(null);
  const [selectedProductOption, setSelectedProductOption] = useState<any>(null);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [rowsPerPage, setRowsPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(10);

  const printRef = useRef<HTMLDivElement>(null);
  // What the branch's own transaction date settled the boxes to, and whether
  // the report has run itself on it once.
  const defaultDateRef = useRef<Date | null>(null);
  const autoRanRef = useRef(false);

  // Dictionaries
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(getCategoryDdl());
    dispatch(fetchBrandDdl());
    dispatch(getProductGroupDdl());
  }, []);

  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;

    if (Array.isArray(protectedData?.data)) {
      setDropdownData(protectedData.data);
    }

    let from: Date | null = defaultDateRef.current;
    let to: Date | null = defaultDateRef.current;

    if (protectedData?.transactionDate) {
      const [day, month, year] = protectedData.transactionDate.split('/');
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      setStartDate(parsed);
      setEndDate(parsed);
      defaultDateRef.current = parsed;
      from = parsed;
      to = parsed;
    }

    // Opens on the branch's own transaction day rather than on an empty sheet,
    // once, and never again -- a reader who has since changed the filters is not
    // overruled by a late-arriving dropdown.
    if (!autoRanRef.current) {
      autoRanRef.current = true;
      const branch = user?.user?.branch_id ?? null;
      setBranchId(branch);

      if (branch && from && to) {
        dispatch(
          getCustomerSales({
            branchId: branch,
            startDate: dayjs(from).format('YYYY-MM-DD'),
            endDate: dayjs(to).format('YYYY-MM-DD'),
          }),
        );
      }
    }
  }, [branchDdlData?.protectedData]);

  // Options, each with an "all" row at the head.
  const brandOptions = useMemo(
    () => [{ id: '', name: 'All Brands' }, ...toArray(brandData?.brandDdl?.data)],
    [brandData?.brandDdl],
  );
  const groupOptions = useMemo(
    () => [{ id: '', name: 'All Groups' }, ...toArray(productGroupData?.ddlData?.data)],
    [productGroupData?.ddlData],
  );
  const categoryOptions = useMemo(
    () => [
      { id: '', name: 'All Categories' },
      ...toArray(categoryData?.ddlData?.data?.category),
    ],
    [categoryData?.ddlData],
  );

  const nameOf = (id: any, options: { id: any; name: string }[]) =>
    options.find((option) => String(option.id) === String(id ?? ''))?.name || '';

  const rows: CustomerSalesRow[] = toArray(report?.data);
  const built = useMemo(() => buildCustomerSalesRows(rows), [rows]);

  const buildParams = (overrides?: Record<string, any>) => ({
    branchId,
    customerId,
    brandId,
    groupId,
    categoryId,
    productId,
    startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
    endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
    ...overrides,
  });

  const run = (overrides?: Record<string, any>) => {
    const params = buildParams(overrides);

    if (!params.branchId || !params.startDate || !params.endDate) return;

    setFilterOpen(false);
    dispatch(getCustomerSales(params));
  };

  const handleReset = () => {
    const fallback = defaultDateRef.current;

    setCustomerId(null);
    setSelectedCustomerOption(null);
    setBrandId(null);
    setGroupId(null);
    setCategoryId(null);
    setProductId(null);
    setSelectedProductOption(null);
    setStartDate(fallback);
    setEndDate(fallback);
    setRowsPerPage(0);
    setFontSize(10);
    setFilterOpen(false);
    dispatch(resetCustomerSales());
  };

  const handleStartDate = (date: Date | null) => setStartDate(date);
  const handleEndDate = (date: Date | null) => setEndDate(date);

  const onCustomerSelect = (option: any) => {
    if (!option) {
      setCustomerId(null);
      setSelectedCustomerOption(null);
      return;
    }

    setCustomerId(option.value);
    setSelectedCustomerOption({ value: option.value, label: option.label });
  };

  const onProductSelect = (option: any) => {
    if (!option) {
      setProductId(null);
      setSelectedProductOption(null);
      return;
    }

    setProductId(option.value);
    setSelectedProductOption({ value: option.value, label: option.label });
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Customer Sales Report',
  });

  // What the sheet says it is showing, so a printed copy carries its own filters.
  const filterLine = [
    `Branch: ${nameOf(branchId, dropdownData.map((b: any) => ({ id: b.id, name: b.name }))) || '-'}`,
    `Customer: ${selectedCustomerOption?.label || 'All Customers'}`,
    `Brand: ${nameOf(brandId, brandOptions)}`,
    `Group: ${nameOf(groupId, groupOptions)}`,
    `Category: ${nameOf(categoryId, categoryOptions)}`,
    `Product: ${selectedProductOption?.label || 'All Products'}`,
    `Date: ${startDate ? dayjs(startDate).format('DD/MM/YYYY') : '-'} - ${endDate ? dayjs(endDate).format('DD/MM/YYYY') : '-'}`,
  ].join('  |  ');

  const filterFields = (
    <>
      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch</label>
        {branchDdlData?.isLoading ? (
          <Loader />
        ) : (
          <BranchDropdown
            onChange={(e: any) => setBranchId(e.target.value)}
            value={branchId == null ? '' : String(branchId)}
            branchDdl={dropdownData}
            className="w-full font-medium text-sm p-2"
          />
        )}
      </div>

      <div className="min-w-[240px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Customer</label>
        <DdlMultiline
          acType={''}
          onSelect={onCustomerSelect}
          value={selectedCustomerOption}
          className="w-full"
        />
      </div>

      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Brand</label>
        <CategoryDropdown
          onChange={(option: any) => setBrandId(option?.value ?? null)}
          categoryDdl={brandOptions}
          placeholder="All Brands"
          value={brandId ?? ''}
          className="w-full text-sm"
        />
      </div>

      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Group</label>
        <CategoryDropdown
          onChange={(option: any) => setGroupId(option?.value ?? null)}
          categoryDdl={groupOptions}
          placeholder="All Groups"
          value={groupId ?? ''}
          className="w-full text-sm"
        />
      </div>

      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
        <CategoryDropdown
          onChange={(option: any) => setCategoryId(option?.value ?? null)}
          categoryDdl={categoryOptions}
          placeholder="All Categories"
          value={categoryId ?? ''}
          className="w-full text-sm"
        />
      </div>

      <div className="min-w-[240px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Product</label>
        <ProductDropdown
          onSelect={onProductSelect}
          value={selectedProductOption}
          className="appearance-none"
        />
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">From Date</label>
        <InputDatePicker
          selectedDate={startDate}
          setSelectedDate={setStartDate}
          setCurrentDate={handleStartDate}
          className="font-medium text-sm w-full"
        />
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">To Date</label>
        <InputDatePicker
          selectedDate={endDate}
          setSelectedDate={setEndDate}
          setCurrentDate={handleEndDate}
          className="font-medium text-sm w-full"
        />
      </div>
    </>
  );

  const controlButtons = (
    <>
      <ButtonLoading
        onClick={() => run()}
        buttonLoading={report?.loading}
        label="Apply"
        icon={<FiCheckSquare />}
        className="px-6"
      />
      <ButtonLoading
        onClick={handleReset}
        buttonLoading={false}
        label="Reset"
        icon={<FiRotateCcw />}
        className="px-4"
      />
    </>
  );

  return (
    <div>
      <HelmetTitle title="Customer Sales Report" />

      <div className="px-0 py-3">
        <div className="flex flex-wrap items-end gap-3">
          {useFilterMenuEnabled ? (
            <FilterMenuShell
              enabled
              isOpen={filterOpen}
              onToggle={() => setFilterOpen((prev) => !prev)}
              menuWidthClassName="w-[min(92vw,360px)]"
            >
              {filterFields}
              <div className="flex justify-end gap-2 pt-1">{controlButtons}</div>
            </FilterMenuShell>
          ) : (
            filterFields
          )}

          {useFilterMenuEnabled ? (
            <div className="ml-auto flex items-end gap-2">
              <PrintRowsInput
                id="rowsPerPage"
                name="rowsPerPage"
                label="Rows"
                value={rowsPerPage.toString()}
                onChange={(e: any) => setRowsPerPage(Number(e.target.value) || 0)}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintFontInput
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={(e: any) => setFontSize(Number(e.target.value) || 10)}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!rows.length} />
            </div>
          ) : (
            <div className="flex items-end gap-2 max-md:ml-0 md:ml-auto">
              {controlButtons}
              <PrintRowsInput
                id="rowsPerPage"
                name="rowsPerPage"
                label="Rows"
                value={rowsPerPage.toString()}
                onChange={(e: any) => setRowsPerPage(Number(e.target.value) || 0)}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintFontInput
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={(e: any) => setFontSize(Number(e.target.value) || 10)}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={!rows.length} />
            </div>
          )}
        </div>
      </div>

      {report?.error ? (
        <div className="mt-2 border border-red-500/60 bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {report.error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        {report?.loading ? <Loader /> : null}

        {/*
          Customer and Invoice are heading ROWS, not columns. The customer heads
          its block once, and each invoice heads its lines once -- number and
          date on the one row. Both span the table so they read as bands.
        */}
        <table className="min-w-full table-fixed border-collapse text-left text-sm text-gray-700 dark:text-gray-300">
          <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-800 dark:text-gray-300">
            <tr>
              <th className={`${cell} w-[60px] text-center font-semibold`}>SL</th>
              <th className={`${cell} w-[130px] text-left font-semibold`}>Brand</th>
              <th className={`${cell} w-[130px] text-left font-semibold`}>Group</th>
              <th className={`${cell} w-[130px] text-left font-semibold`}>Category</th>
              <th className={`${cell} text-left font-semibold`}>Product</th>
              <th className={`${cell} w-[90px] text-right font-semibold`}>Qty</th>
              <th className={`${cell} w-[90px] text-right font-semibold`}>Rate</th>
              <th className={`${cell} w-[110px] text-right font-semibold`}>Amount</th>
            </tr>
          </thead>

          <tbody className="bg-[rgb(var(--c-table-body))]">
            {built.rows.length ? (
              built.rows.map((row) => {
                if (row.__type === 'CUSTOMER') {
                  return (
                    <tr key={row.key} className="bg-slate-200 font-bold dark:bg-slate-900/70">
                      <td colSpan={8} className={cell}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{row.customer_name}</span>
                          <span className="whitespace-nowrap text-xs font-semibold">
                            Qty: {thousandSeparator(row.quantity)} | Amount: {thousandSeparator(row.amount)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // The invoice heads its lines once: number and date on the one
                // row, with the invoice's own subtotal beside them.
                if (row.__type === 'INVOICE') {
                  return (
                    <tr key={row.key} className="bg-slate-100 font-semibold dark:bg-slate-900/40">
                      <td colSpan={8} className={cell}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="whitespace-nowrap">
                            <span className="font-semibold">Invoice: {row.invoice_no}</span>
                            {row.invoice_date && row.invoice_date !== '-' ? (
                              <span className="ml-3">Date: {row.invoice_date}</span>
                            ) : null}
                          </span>
                          <span className="whitespace-nowrap text-xs font-semibold">
                            Qty: {thousandSeparator(row.quantity)} | Amount: {thousandSeparator(row.amount)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const line = row.row;

                return (
                  <tr key={row.key} className="hover:bg-indigo-50 dark:hover:bg-gray-700">
                    <td className={`${cell} text-center`}>{row.sl}</td>
                    <td className={cell}>{line.brand_name || '-'}</td>
                    <td className={cell}>{line.group_name || '-'}</td>
                    <td className={cell}>{line.category_name || '-'}</td>
                    <td className={cell}>{productLabel(line)}</td>
                    <td className={`${cell} text-right`}>{thousandSeparator(line.quantity)}</td>
                    <td className={`${cell} text-right`}>{thousandSeparator(line.rate)}</td>
                    <td className={`${cell} text-right`}>{thousandSeparator(line.amount)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-4 text-center text-gray-500 dark:text-gray-400">
                  No data found
                </td>
              </tr>
            )}
          </tbody>

          {built.rows.length ? (
            <tfoot className="bg-slate-200 font-bold text-slate-900 dark:bg-slate-900/70 dark:text-slate-100">
              <tr>
                <td colSpan={5} className={`${cell} text-right`}>Grand Total</td>
                <td className={`${cell} text-right`}>{thousandSeparator(built.totalQuantity)}</td>
                <td className={cell}></td>
                <td className={`${cell} text-right`}>{thousandSeparator(built.totalAmount)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {/* PRINT -- the `hidden` belongs on this wrapper, never on the node the
          ref points at (react-to-print clones the ref'd node). */}
      <div className="hidden">
        <CustomerSalesPrint
          ref={printRef}
          rows={built.rows}
          totalQuantity={built.totalQuantity}
          totalAmount={built.totalAmount}
          filterLine={filterLine}
          fontSize={fontSize}
          rowsPerPage={rowsPerPage}
        />
      </div>
    </div>
  );
};

export default CustomerSalesReport;
