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

  const printRef = useRef<HTMLDivElement>(null);

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
        <div className={row?.rowType === 'opening' ? 'font-medium text-white' : ''}>
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
        <div className="flex justify-between mb-1">
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full gap-2">
            <div>
              <div>
                <label htmlFor="">Select Branch</label>
              </div>
              <div className="w-full">
                {branchDdlData?.isLoading ? <Loader /> : ''}
                <BranchDropdown
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setBranchId(e.target.value ? Number(e.target.value) : null)
                  }
                  branchDdl={dropdownData}
                  value={branchId ? String(branchId) : undefined}
                  className="w-60 font-medium text-sm p-1.5"
                />
              </div>
            </div>

            <div className="w-full">
              <label htmlFor="">Select Item / Product</label>
              <ProductDropdown
                onSelect={selectedProduct}
                className="appearance-none h-8"
                value={selectedLedgerOption}
              />
            </div>

            <div className="w-full">
              <label htmlFor="">Start Date</label>
              <InputDatePicker
                label=""
                selectedDate={startDate}
                setSelectedDate={setStartDate}
                setCurrentDate={setStartDate}
                className="font-medium text-sm w-full h-8"
              />
            </div>

            <div className="w-full flex">
              <div className="w-full mr-2">
                <label htmlFor="">End Date</label>
                <InputDatePicker
                  label=""
                  selectedDate={endDate}
                  setSelectedDate={setEndDate}
                  setCurrentDate={setEndDate}
                  className="font-medium text-sm w-full h-8"
                />
              </div>

              <div className="mr-2">
                <InputElement
                  id="rowsPerPage"
                  name="rowsPerPage"
                  label="Rows"
                  value={rowsPerPage.toString()}
                  onChange={(e) => setRowsPerPage(Number(e.target.value) || 12)}
                  type="text"
                  className="font-medium text-sm h-8 w-12"
                />
              </div>

              <div className="mr-2">
                <InputElement
                  id="fontSize"
                  name="fontSize"
                  label="Font"
                  value={fontSize.toString()}
                  onChange={(e) => setFontSize(Number(e.target.value) || 12)}
                  type="text"
                  className="font-medium text-sm h-8 w-12"
                />
              </div>

              <ButtonLoading
                onClick={runReport}
                buttonLoading={buttonLoading}
                label="Run"
                icon=""
                className="mt-6 pt-[0.45rem] pb-[0.45rem] h-8"
              />
              <PrintButton
                onClick={handlePrint}
                label=""
                className="ml-2 mt-6 pt-[0.45rem] pb-[0.45rem] h-8"
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
      </div>
    </>
  );
};

export default ProductLedgerData;
