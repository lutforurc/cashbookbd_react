import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiCheckSquare, FiRotateCcw } from 'react-icons/fi';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import WarehouseDropdown from '../../utils/utils-functions/WarehouseDropdown';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDdlWarehouse } from '../warehouse/ddlWarehouseSlider';
import { clearMaterialIssueReports, getMaterialIssueProductWiseReport } from './materialIssueSlice';
import MaterialIssueProductWisePrint, { describeRow } from './MaterialIssueProductWisePrint';

/**
 * Materials Issue -- Product wise Report.
 *
 * One material's purchases and issues in date order, with the balance they
 * leave behind. Purchases are the purchase invoices' lines (the owner's chosen
 * source for Total Quantity); issues are the material issue lines. The date on
 * a purchase is its voucher date, on an issue its issue date -- the same dates
 * the stock reports read.
 */
const MaterialIssueProductWiseReport = () => {
  const { t } = useTranslation('common');
  const dispatch = useDispatch<any>();
  const materialIssue = useSelector((s: any) => s.materialIssue);
  const warehouseState = useSelector((s: any) => s.activeWarehouse);
  const warehouseOptions = Array.isArray(warehouseState?.data) ? warehouseState.data : [];
  const report = materialIssue?.productWiseReport || null;

  const [fromDate, setFromDate] = useState<Date | null>(dayjs().startOf('month').toDate());
  const [toDate, setToDate] = useState<Date | null>(dayjs().toDate());
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [product, setProduct] = useState<any>(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [perPage, setPerPage] = useState(0); // 0 = All
  const [fontSize, setFontSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: report?.product?.name
      ? `MaterialsIssue-${report.product.name}`
      : 'MaterialsIssueProductWise',
  });

  useEffect(() => {
    dispatch(getDdlWarehouse());
  }, [dispatch]);

  const runReport = (opts: { from: string; to: string; productId?: string | number; warehouseId?: string }) => {
    if (!opts.from || !opts.to) {
      toast.info(t('materialIssueReport.chooseDates'));
      return;
    }
    if (!opts.productId) {
      toast.info(t('materialIssueReport.chooseMaterial'));
      return;
    }

    setLoading(true);
    dispatch(
      getMaterialIssueProductWiseReport(
        {
          product_id: opts.productId,
          from_date: opts.from,
          to_date: opts.to,
          from_warehouse_id: opts.warehouseId || undefined,
        },
        (response: any) => {
          if (!response?.success) toast.error(response?.message || t('materialIssueReport.loadFailed'));
          setLoading(false);
        },
      ),
    );
  };

  const load = () =>
    runReport({ from, to, productId: product?.value, warehouseId });

  const reset = () => {
    const start = dayjs().startOf('month');
    const end = dayjs();

    setFromDate(start.toDate());
    setToDate(end.toDate());
    setFrom(start.format('YYYY-MM-DD'));
    setTo(end.format('YYYY-MM-DD'));
    setProduct(null);
    setWarehouseId('');
    dispatch(clearMaterialIssueReports());
  };

  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const totals = report?.totals || {};
  const formatDate = (value?: string | null) =>
    value && dayjs(value).isValid() ? dayjs(value).format('DD/MM/YYYY') : '';
  const qty = (value: any) =>
    Number(value || 0) === 0 ? '0' : thousandSeparator(Number(value || 0));

  const columns = [
    {
      key: 'sl',
      header: t('materialIssueReport.sn'),
      headerClass: 'text-center w-14',
      cellClass: 'text-center w-14',
      render: (row: any, index: number) => <span>{row?.sl ?? index + 1}</span>,
    },
    {
      key: 'date',
      header: t('materialIssueReport.date'),
      headerClass: 'w-24',
      cellClass: 'w-24',
      render: (row: any) => <span>{formatDate(row?.date) || '-'}</span>,
    },
    {
      key: 'description',
      header: t('materialIssueReport.description'),
      render: (row: any) => <span>{describeRow(row, t) || '-'}</span>,
    },
    {
      key: 'unit',
      header: t('materialIssueReport.unit'),
      headerClass: 'text-center w-20',
      cellClass: 'text-center w-20',
      render: (row: any) => <span>{row?.unit_name || '-'}</span>,
    },
    {
      key: 'total_qty',
      header: t('materialIssueReport.totalQty'),
      headerClass: 'text-right w-32',
      cellClass: 'text-right w-32',
      render: (row: any) => <span>{qty(row?.total_qty)}</span>,
    },
    {
      key: 'issue_qty',
      header: t('materialIssueReport.issueQty'),
      headerClass: 'text-right w-32',
      cellClass: 'text-right w-32',
      render: (row: any) => <span>{qty(row?.issue_qty)}</span>,
    },
    {
      key: 'remaining',
      header: t('materialIssueReport.remaining'),
      headerClass: 'text-right w-32',
      cellClass: 'text-right w-32',
      render: (row: any) => <span>{qty(row?.remaining)}</span>,
    },
    {
      key: 'note',
      header: t('materialIssueReport.notes'),
      render: (row: any) => <span>{row?.note || '-'}</span>,
    },
  ];

  return (
    <div>
      <HelmetTitle title={t('materialIssueReport.titleProductWise')} />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-44">
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
            {t('materialIssueReport.warehouse')}
          </label>
          <WarehouseDropdown
            id="miReportWarehouse"
            name="miReportWarehouse"
            className="p-2"
            warehouseDdl={warehouseOptions}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWarehouseId(e.target.value)}
            defaultValue={warehouseId}
            emptyLabel={t('materialIssueReport.everyWarehouse')}
          />
        </div>

        <div className="w-full sm:w-52">
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
            {t('materialIssueReport.material')}
          </label>
          <RequisitionItemsDropdown
            id="miReportProduct"
            name="miReportProduct"
            onSelect={(option: any) => setProduct(option)}
            defaultValue={product}
            value={product}
          />
        </div>

        <div className="w-full sm:w-40">
          <InputDatePicker
            id="miFromDate"
            name="miFromDate"
            label={t('materialIssueReport.from')}
            selectedDate={fromDate}
            setSelectedDate={setFromDate}
            setCurrentDate={(date: Date | null) => {
              setFromDate(date);
              setFrom(date ? dayjs(date).format('YYYY-MM-DD') : '');
            }}
            className="w-full "
          />
        </div>

        <div className="w-full sm:w-40">
          <InputDatePicker
            id="miToDate"
            name="miToDate"
            label={t('materialIssueReport.to')}
            selectedDate={toDate}
            setSelectedDate={setToDate}
            setCurrentDate={(date: Date | null) => {
              setToDate(date);
              setTo(date ? dayjs(date).format('YYYY-MM-DD') : '');
            }}
            className="w-full "
          />
        </div>

        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto sm:flex-nowrap sm:ml-auto">
          <ButtonLoading
            label={t('materialIssueReport.apply')}
            onClick={load}
            buttonLoading={loading}
            className="px-6"
            icon={<FiCheckSquare />}
          />
          <ButtonLoading
            label={t('materialIssueReport.reset')}
            onClick={reset}
            buttonLoading={false}
            className="px-4"
            icon={<FiRotateCcw />}
          />
          <PrintRowsInput
            type="number"
            label=""
            placeholder={t('materialIssueReport.all')}
            className="w-20! text-center"
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value) || 0)}
          />
          <PrintFontInput
            type="number"
            label=""
            placeholder="10"
            className="w-20! text-center"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value) || 10)}
          />
          <PrintButton
            label={t('materialIssueReport.print')}
            onClick={handlePrint}
            className="px-6"
            disabled={rows.length === 0}
          />
        </div>
      </div>

      {report?.product?.name && (
        <div className="mb-2 text-sm text-[rgb(var(--c-text-muted))]">
          {t('materialIssueReport.materialsName')}: <b className="text-[rgb(var(--c-text))]">{report.product.name}</b>
        </div>
      )}

      <Table
        columns={columns}
        data={rows}
        perPage={perPage}
        noDataMessage={t('materialIssueReport.pickMaterial')}
      />

      {rows.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm font-semibold text-[rgb(var(--c-text))]">
          <span>{t('materialIssueReport.total')}: {qty(totals.total_qty)}</span>
          <span>{t('materialIssueReport.issued')}: {qty(totals.issue_qty)}</span>
          <span>{t('materialIssueReport.remaining')}: {qty(totals.remaining)}</span>
        </div>
      )}

      <div className="hidden">
        <MaterialIssueProductWisePrint
          ref={printRef}
          productName={report?.product?.name || ''}
          rows={rows}
          totals={totals}
          startDate={
            report?.from_date
              ? dayjs(report.from_date).format('DD/MM/YYYY')
              : from
                ? dayjs(from).format('DD/MM/YYYY')
                : ''
          }
          endDate={
            report?.to_date
              ? dayjs(report.to_date).format('DD/MM/YYYY')
              : to
                ? dayjs(to).format('DD/MM/YYYY')
                : ''
          }
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
        />
      </div>
    </div>
  );
};

export default MaterialIssueProductWiseReport;
