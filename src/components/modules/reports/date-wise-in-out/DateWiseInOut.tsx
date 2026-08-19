import { useEffect, useMemo, useRef, useState } from 'react';
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { FiCheckSquare, FiHome, FiRefreshCcw } from 'react-icons/fi';
import Loader from '../../../../common/Loader';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import {
  API_REPORT_DATE_WISE_IN_OUT_DETAILS_URL,
  API_REPORT_DATE_WISE_IN_OUT_URL,
} from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import Table from '../../../utils/others/Table';
import { DateWiseInOutDetailPrint, DateWiseInOutPrint } from './DateWiseInOutPrint';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { Select } from '../../../utils/fields/FormControls';

export type DateWiseInOutRow = {
  sl_no: string;
  vr_date: string;
  date_link?: string;
  product_id?: string;
  product_name: string;
  in_qty: string;
  out_qty: string;
  damage: string;
  over: string;
  stock: string;
  stockTone: 'positive' | 'negative' | 'neutral';
};

export type InOutDetailRow = {
  vr_no?: string;
  mid?: number;
  vr_date?: string;
  vehicle_no?: string;
  product_id?: number | string;
  product_name?: string;
  in_qty?: number;
  out_qty?: number;
  rate?: number;
  variance_type?: string;
  over?: number;
  damage?: number;
};

const toQuantityNumber = (value: string) => {
  const numericValue = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const calculateBalance = (inQty: string, outQty: string, damage: string, over: string) =>
  toQuantityNumber(inQty) - (toQuantityNumber(outQty) + toQuantityNumber(damage) - toQuantityNumber(over));

const formatQuantity = (value: any) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue === 0) return '-';

  return thousandSeparator(numericValue);
};

const formatReportDate = (value: any) => {
  const dateValue = String(value || '').trim();
  if (!dateValue) return '';

  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dayjs(dateValue).format('DD/MM/YYYY') : dateValue;
};

const mapDateWiseInOutRows = (payload: any): DateWiseInOutRow[] => {
  const data = Array.isArray(payload?.data?.data)
    ? payload.data.data
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

  return data.map((item: any, index: number) => {
    const inQty = formatQuantity(item?.in_qty);
    const outQty = formatQuantity(item?.out_qty);
    const damage = formatQuantity(item?.damage ?? item?.demage);
    const over = formatQuantity(item?.over);
    const balance = calculateBalance(inQty, outQty, damage, over);

    return {
      sl_no: String(item?.sl_no || index + 1),
      vr_date: formatReportDate(item?.vr_date || item?.date),
      date_link: item?.date_link,
      product_id: String(item?.product_id || item?.item_id || item?.ledger_id || '').trim(),
      product_name: String(item?.product_name || item?.item_name || item?.product || '').trim(),
      in_qty: inQty,
      out_qty: outQty,
      damage,
      over,
      stock: String(balance),
      stockTone: balance < 0 ? 'negative' : balance > 0 ? 'positive' : 'neutral',
    };
  });
};

const DateWiseInOut = ({ user }: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [selectedProductOption, setSelectedProductOption] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [fontSize, setFontSize] = useState(10);
  const [detailLoadingDate, setDetailLoadingDate] = useState('');
  const [detailPrintReady, setDetailPrintReady] = useState(false);
  const [detailDate, setDetailDate] = useState('');
  const [detailProductName, setDetailProductName] = useState('');
  const [detailRows, setDetailRows] = useState<{ sales: InOutDetailRow[]; purchase: InOutDetailRow[] }>({
    sales: [],
    purchase: [],
  });
  const [rows, setRows] = useState<DateWiseInOutRow[]>([]);
  const [error, setError] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const detailPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    setBranchId(user?.branch_id ? String(user.branch_id) : '');
  }, [dispatch, user?.branch_id]);

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

  const selectedProduct = (option: any) => {
    if (!option) {
      setProductId('');
      setSelectedProductOption(null);
      return;
    }

    setProductId(String(option.value || ''));
    setSelectedProductOption({
      value: option.value,
      label: option.label,
    });
  };

  const runReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select start date and end date.');
      return;
    }

    setButtonLoading(true);
    setError('');

    try {
      const params: Record<string, any> = {
        branch_id: branchId || null,
        startdate: dayjs(startDate).format('DD/MM/YYYY'),
        enddate: dayjs(endDate).format('DD/MM/YYYY'),
        response_type: 'json',
      };

      if (productId) {
        params.ledger_id = productId;
      }

      const response = await httpService.get(API_REPORT_DATE_WISE_IN_OUT_URL, {
        params,
        headers: {
          Accept: 'application/json',
        },
      });

      setRows(mapDateWiseInOutRows(response?.data));
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || err?.message || 'Date wise in/out report load failed.');
    } finally {
      setButtonLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Date Wise In Out',
  });

  const handleMainPrint = () => {
    if (!rows.length) {
      setError('Please run the report before printing.');
      return;
    }

    handlePrint();
  };

  const handleDetailPrint = useReactToPrint({
    contentRef: detailPrintRef,
    documentTitle: `Date Wise In Out ${detailDate || ''}`.trim(),
  });

  useEffect(() => {
    if (!detailPrintReady) return;

    const timer = window.setTimeout(() => {
      handleDetailPrint();
      setDetailPrintReady(false);
    }, 100);

    return () => window.clearTimeout(timer);
  }, [detailPrintReady, handleDetailPrint]);

  const handleDatePrint = async (row: DateWiseInOutRow) => {
    setDetailLoadingDate(row.vr_date);
    setError('');

    try {
      const params: Record<string, any> = {
        vr_date: row.vr_date,
      };

      if (branchId) {
        params.branch_id = branchId;
      }

      if (productId) {
        params.ledger_id = productId;
        params.item_id = productId;
        params.product_id = productId;
      }

      const response = await httpService.get(API_REPORT_DATE_WISE_IN_OUT_DETAILS_URL, {
        params,
      });

      const data = response?.data?.data || {};
      setDetailDate(row.vr_date);
      setDetailProductName(selectedProductOption?.label || 'All Products');
      setDetailRows({
        sales: Array.isArray(data?.sales) ? data.sales : [],
        purchase: Array.isArray(data?.purchase) ? data.purchase : [],
      });
      setDetailPrintReady(true);
    } catch (err: any) {
      setDetailRows({ sales: [], purchase: [] });
      setError(err?.response?.data?.message || err?.message || 'Date details load failed.');
    } finally {
      setDetailLoadingDate('');
    }
  };

  const columns = useMemo(
    () => {
      const baseColumns = [
      {
        key: 'sl_no',
        header: 'Sl. No.',
        headerClass: 'text-center',
        cellClass: 'text-center',
      },
      {
        key: 'vr_date',
        header: 'Date',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: DateWiseInOutRow) => (
          <Button
            type="button"
            onClick={() => handleDatePrint(row)}
            className="font-medium text-emerald-600 hover:underline disabled:cursor-wait disabled:opacity-70"
            disabled={detailLoadingDate === row.vr_date}
            title="Open React print"
          >
            {row.vr_date}
          </Button>
        ),
      },
      {
        key: 'in_qty',
        header: 'In Qty',
        headerClass: 'text-right',
        cellClass: 'text-right',
      },
      {
        key: 'out_qty',
        header: 'Out Qty',
        headerClass: 'text-right',
        cellClass: 'text-right',
      },
      {
        key: 'damage',
        header: 'Damage',
        headerClass: 'text-right',
        cellClass: 'text-right',
      },
      {
        key: 'over',
        header: 'Over',
        headerClass: 'text-right',
        cellClass: 'text-right',
      },
      {
        key: 'stock',
        header: 'Balance',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: DateWiseInOutRow) => (
          <span className={row.stockTone === 'negative' ? 'font-bold text-red-700' : row.stockTone === 'positive' ? 'font-bold text-green-700' : ''}>
            {thousandSeparator(Number(row.stock))}
          </span>
        ),
      },
      ].filter(Boolean);

      return baseColumns;
    },
    [branchId, detailLoadingDate, productId],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.inQty += toQuantityNumber(row.in_qty);
          acc.outQty += toQuantityNumber(row.out_qty);
          acc.damage += toQuantityNumber(row.damage);
          acc.over += toQuantityNumber(row.over);
          acc.balance += Number(row.stock) || 0;
          return acc;
        },
        { inQty: 0, outQty: 0, damage: 0, over: 0, balance: 0 },
      ),
    [rows],
  );

  const footerRows = useMemo(() => {
    if (!rows.length) return undefined;

    const balanceTone =
      totals.balance < 0 ? 'text-red-700' : totals.balance > 0 ? 'text-green-700' : '';

    return [
      [
        { label: 'Total', colSpan: 2, className: 'text-right' },
        { label: formatQuantity(totals.inQty), className: 'text-right' },
        { label: formatQuantity(totals.outQty), className: 'text-right' },
        { label: formatQuantity(totals.damage), className: 'text-right' },
        { label: formatQuantity(totals.over), className: 'text-right' },
        {
          label: <span className={balanceTone}>{thousandSeparator(totals.balance)}</span>,
          className: 'text-right',
        },
      ],
    ];
  }, [rows.length, totals]);

  return (
    <div>
      <HelmetTitle title="Date Wise In Out" />

      <div className="px-0 py-3">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3 xl:grid-cols-4 min-[1881px]:grid-cols-[minmax(220px,1fr)_minmax(260px,1.5fr)_minmax(150px,0.6fr)_minmax(150px,0.6fr)_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-[rgb(var(--c-text))]">
              Select Branch <span className="text-red-600">*</span>
            </label>
            {branchDdlData?.isLoading ? <Loader /> : null}
            <Select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className={`${FIELD_SELECT} w-full px-2 text-sm font-medium`}
            >
              <option value="">All Branch</option>
              {dropdownData.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <label className="block text-sm font-semibold text-slate-800 dark:text-[rgb(var(--c-text))]">Select Item / Product</label>
              <Button
                type="button"
                onClick={() => selectedProduct(null)}
                className="text-slate-600 hover:text-blue-600 dark:text-slate-300"
                title="Clear product"
              >
                <FiRefreshCcw size={14} />
              </Button>
            </div>
            <ProductDropdown
 onSelect={selectedProduct}
 value={selectedProductOption}
 className="appearance-none "
            />
          </div>

          <InputDatePicker
 label="Start Date"
 selectedDate={startDate}
 setSelectedDate={setStartDate}
 setCurrentDate={setStartDate}
 className="w-full text-sm font-medium"
          />

          <InputDatePicker
 label="End Date"
 selectedDate={endDate}
 setSelectedDate={setEndDate}
 setCurrentDate={setEndDate}
 className="w-full text-sm font-medium"
          />

          <div className="flex items-end gap-2">
            <ButtonLoading
              onClick={runReport}
              buttonLoading={buttonLoading}
              label="OK"
              icon={<FiCheckSquare />}
              className="px-6"
            />
            <PrintRowsInput
              id="dateWiseInOutRowsPerPage"
              name="rowsPerPage"
              label="Rows"
              value={String(rowsPerPage)}
              onChange={(event) => setRowsPerPage(Number(event.target.value) || 12)}
              type="text"
              className="w-22! text-center text-sm font-medium"
            />
            <PrintFontInput
              id="dateWiseInOutFontSize"
              name="fontSize"
              label="Font"
              value={String(fontSize)}
              onChange={(event) => setFontSize(Number(event.target.value) || 12)}
              type="text"
              className="w-22! text-center text-sm font-medium"
            />
            <PrintButton
              onClick={handleMainPrint}
              label="Print"
              className="px-5"
            />
            <ButtonLoading
              onClick={() => navigate('/')}
              buttonLoading={false}
              label="Home"
              icon={<FiHome />}
              className="px-5"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-5">
          <Table
            columns={columns as any}
            data={rows}
            className="rounded-none"
            tableClassName="table-auto text-sm"
            theadClassName=""
            tbodyClassName="divide-y"
            footerRows={footerRows as any}
            noDataMessage="No data found"
          />
        </div>
      </div>

      <div className="fixed left-[-10000px] top-0 bg-white">
        <DateWiseInOutPrint
          ref={printRef}
          rows={rows}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>

      <div className="fixed left-[-10000px] top-0 bg-white">
        <DateWiseInOutDetailPrint
          ref={detailPrintRef}
          detailDate={detailDate}
          detailRows={detailRows}
          productName={detailProductName || selectedProductOption?.label || 'All Products'}
          showProductColumn={!productId}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default DateWiseInOut;
