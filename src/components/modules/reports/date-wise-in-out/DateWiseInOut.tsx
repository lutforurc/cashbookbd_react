import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { FiCheckSquare, FiHome, FiRefreshCcw } from 'react-icons/fi';
import Loader from '../../../../common/Loader';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import {
  API_REPORT_DATE_WISE_IN_OUT_DETAILS_URL,
  API_REPORT_DATE_WISE_IN_OUT_URL,
} from '../../../services/apiRoutes';
import httpService from '../../../services/httpService';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import Table from '../../../utils/others/Table';
import { DateWiseInOutDetailPrint, DateWiseInOutPrint } from './DateWiseInOutPrint';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

export type DateWiseInOutRow = {
  sl_no: string;
  vr_date: string;
  date_link?: string;
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
  product_name?: string;
  in_qty?: number;
  out_qty?: number;
  rate?: number;
  variance_type?: string;
  over?: number;
  damage?: number;
};

const parseDateWiseInOutRows = (html: string): DateWiseInOutRow[] => {
  if (!html || typeof DOMParser === 'undefined') return [];

  const doc = new DOMParser().parseFromString(`<table><tbody>${html}</tbody></table>`, 'text/html');
  return Array.from(doc.querySelectorAll('tbody tr')).map((tr) => {
    const cells = Array.from(tr.querySelectorAll('td'));
    const dateLink = cells[1]?.querySelector('a')?.getAttribute('href') || undefined;
    const stockHtml = cells[6]?.innerHTML || '';

    return {
      sl_no: cells[0]?.textContent?.trim() || '',
      vr_date: cells[1]?.textContent?.trim() || '',
      date_link: dateLink,
      in_qty: cells[2]?.textContent?.trim() || '-',
      out_qty: cells[3]?.textContent?.trim() || '-',
      damage: cells[4]?.textContent?.trim() || '-',
      over: cells[5]?.textContent?.trim() || '-',
      stock: cells[6]?.textContent?.trim() || '-',
      stockTone: stockHtml.includes('text-red') ? 'negative' : stockHtml.includes('text-green') ? 'positive' : 'neutral',
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
  const [fontSize, setFontSize] = useState(12);
  const [detailLoadingDate, setDetailLoadingDate] = useState('');
  const [detailPrintReady, setDetailPrintReady] = useState(false);
  const [detailDate, setDetailDate] = useState('');
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
      const response = await httpService.get(API_REPORT_DATE_WISE_IN_OUT_URL, {
        params: {
          branch_id: branchId || null,
          ledger_id: productId || null,
          startdate: dayjs(startDate).format('DD/MM/YYYY'),
          enddate: dayjs(endDate).format('DD/MM/YYYY'),
        },
        responseType: 'text',
      });

      setRows(parseDateWiseInOutRows(String(response?.data || '')));
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || err?.message || 'Date wise in/out report load failed.');
    } finally {
      setButtonLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Date Wise In Out',
    removeAfterPrint: true,
  });

  const handleMainPrint = () => {
    if (!rows.length) {
      setError('Please run the report before printing.');
      return;
    }

    handlePrint();
  };

  const handleDetailPrint = useReactToPrint({
    content: () => detailPrintRef.current,
    documentTitle: `Date Wise In Out ${detailDate || ''}`.trim(),
    removeAfterPrint: true,
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
    if (!branchId || !productId) {
      setError('Please select branch and item / product before opening date details.');
      return;
    }

    setDetailLoadingDate(row.vr_date);
    setError('');

    try {
      const response = await httpService.get(API_REPORT_DATE_WISE_IN_OUT_DETAILS_URL, {
        params: {
          branch_id: branchId,
          ledger_id: productId,
          vr_date: row.vr_date,
        },
      });

      const data = response?.data?.data || {};
      setDetailDate(row.vr_date);
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
    () => [
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
          branchId && productId ? (
            <button
              type="button"
              onClick={() => handleDatePrint(row)}
              className="font-medium text-emerald-600 hover:underline disabled:cursor-wait disabled:opacity-70"
              disabled={detailLoadingDate === row.vr_date}
              title="Open React print"
            >
              {row.vr_date}
            </button>
          ) : (
            <span className="text-emerald-600">{row.vr_date}</span>
          )
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
        header: 'Demage',
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
        header: 'Stock',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: DateWiseInOutRow) => (
          <span className={row.stockTone === 'negative' ? 'font-bold text-red-700' : row.stockTone === 'positive' ? 'font-bold text-green-700' : ''}>
            {thousandSeparator(Number(row.stock))}
          </span>
        ),
      },
    ],
    [branchId, detailLoadingDate, productId],
  );

  return (
    <div>
      <HelmetTitle title="Date Wise In Out" />

      <div className="px-0 py-3">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(220px,1fr)_minmax(260px,1.5fr)_minmax(150px,0.6fr)_minmax(150px,0.6fr)_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800 dark:text-white">
              Select Branch <span className="text-red-600">*</span>
            </label>
            {branchDdlData?.isLoading ? <Loader /> : null}
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="h-10 w-full rounded-xs border border-gray-300 bg-white px-2 text-sm font-medium text-gray-900 outline-none dark:border-gray-600 dark:bg-boxdark dark:text-white"
            >
              <option value="">All Branch</option>
              {dropdownData.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <label className="block text-sm font-semibold text-slate-800 dark:text-white">Select Item / Product</label>
              <button
                type="button"
                onClick={() => selectedProduct(null)}
                className="text-slate-600 hover:text-blue-600 dark:text-slate-300"
                title="Clear product"
              >
                <FiRefreshCcw size={14} />
              </button>
            </div>
            <ProductDropdown
              onSelect={selectedProduct}
              value={selectedProductOption}
              className="appearance-none h-10"
            />
          </div>

          <InputDatePicker
            label="Start Date"
            selectedDate={startDate}
            setSelectedDate={setStartDate}
            setCurrentDate={setStartDate}
            className="h-10 w-full text-sm font-medium"
          />

          <InputDatePicker
            label="End Date"
            selectedDate={endDate}
            setSelectedDate={setEndDate}
            setCurrentDate={setEndDate}
            className="h-10 w-full text-sm font-medium"
          />

          <div className="flex items-end gap-2">
            <ButtonLoading
              onClick={runReport}
              buttonLoading={buttonLoading}
              label="OK"
              icon={<FiCheckSquare />}
              className="h-10 px-6"
            />
            <InputElement
              id="dateWiseInOutRowsPerPage"
              name="rowsPerPage"
              label="Rows"
              value={String(rowsPerPage)}
              onChange={(event) => setRowsPerPage(Number(event.target.value) || 12)}
              type="text"
              className="h-10 !w-22 text-center text-sm font-medium"
            />
            <InputElement
              id="dateWiseInOutFontSize"
              name="fontSize"
              label="Font"
              value={String(fontSize)}
              onChange={(event) => setFontSize(Number(event.target.value) || 12)}
              type="text"
              className="h-10 !w-22 text-center text-sm font-medium"
            />
            <PrintButton
              onClick={handleMainPrint}
              label="Print"
              className="h-10 px-5"
            />
            <ButtonLoading
              onClick={() => navigate('/')}
              buttonLoading={false}
              label="Home"
              icon={<FiHome />}
              className="h-10 px-5"
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
            tableClassName="table-auto border border-slate-200 text-sm"
            theadClassName="bg-slate-800 text-white dark:bg-slate-800 dark:text-white"
            tbodyClassName="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900"
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
          productName={selectedProductOption?.label}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default DateWiseInOut;
