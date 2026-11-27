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
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDdlWarehouse } from '../warehouse/ddlWarehouseSlider';
import { clearMaterialIssueReports, getMaterialIssueSummaryReport } from './materialIssueSlice';
import MaterialIssueSummaryPrint from './MaterialIssueSummaryPrint';

/**
 * Materials Issue -- Summary Report.
 *
 * Every material's purchases and issues in the period, side by side. The list
 * is the materials that have ever moved, so one with nothing in this window
 * still prints a zeroed row -- the paper a site office expects.
 */
const MaterialIssueSummaryReport = () => {
  const { t } = useTranslation('common');
  const dispatch = useDispatch<any>();
  const materialIssue = useSelector((s: any) => s.materialIssue);
  const warehouseState = useSelector((s: any) => s.activeWarehouse);
  const warehouseOptions = Array.isArray(warehouseState?.data) ? warehouseState.data : [];
  const report = materialIssue?.summaryReport || null;

  const [fromDate, setFromDate] = useState<Date | null>(dayjs().startOf('month').toDate());
  const [toDate, setToDate] = useState<Date | null>(dayjs().toDate());
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [warehouseId, setWarehouseId] = useState('');
  const [perPage, setPerPage] = useState(0); // 0 = All
  const [fontSize, setFontSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'MaterialsIssueSummary',
  });

  const runReport = (opts: { from: string; to: string; warehouseId?: string }) => {
    if (!opts.from || !opts.to) {
      toast.info(t('materialIssueReport.chooseDates'));
      return;
    }

    setLoading(true);
    dispatch(
      getMaterialIssueSummaryReport(
        {
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

  const load = () => runReport({ from, to, warehouseId });

  const reset = () => {
    const start = dayjs().startOf('month');
    const end = dayjs();

    setFromDate(start.toDate());
    setToDate(end.toDate());
    setFrom(start.format('YYYY-MM-DD'));
    setTo(end.format('YYYY-MM-DD'));
    setWarehouseId('');
    // Reset puts the filters back to their defaults AND takes the result off
    // the screen, so the click has something to show for itself. It must not
    // run the report: Apply is the only thing that loads (running it here lit
    // Apply's spinner and re-queried, which is what "Reset is not working"
    // looked like).
    dispatch(clearMaterialIssueReports());
  };

  useEffect(() => {
    dispatch(getDdlWarehouse());
    // First look: this month, every material. Apply refreshes it.
    runReport({
      from: dayjs().startOf('month').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const totals = report?.totals || {};
  // Kilos and pieces do not add up: a grand total only when every row shares one unit.
  const oneUnit = new Set(rows.map((r: any) => r?.unit_name || '')).size <= 1;
  const qty = (value: any) => thousandSeparator(Number(value || 0));

  const columns = [
    {
      key: 'sl',
      header: t('materialIssueReport.sn'),
      headerClass: 'text-center w-14',
      cellClass: 'text-center w-14',
      render: (row: any, index: number) => <span>{row?.sl ?? index + 1}</span>,
    },
    {
      key: 'product_name',
      header: t('materialIssueReport.materialsName'),
      render: (row: any) => <span>{row?.product_name || '-'}</span>,
    },
    {
      key: 'unit',
      header: t('materialIssueReport.unit'),
      headerClass: 'text-center w-24',
      cellClass: 'text-center w-24',
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
  ];

  return (
    <div>
      <HelmetTitle title={t('materialIssueReport.titleSummary')} />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-56">
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
            {t('materialIssueReport.warehouse')}
          </label>
          <WarehouseDropdown
            id="miSummaryWarehouse"
            name="miSummaryWarehouse"
            className="p-2"
            warehouseDdl={warehouseOptions}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWarehouseId(e.target.value)}
            defaultValue={warehouseId}
            emptyLabel={t('materialIssueReport.everyWarehouse')}
          />
        </div>

        <div className="w-full sm:w-44">
          <InputDatePicker
            id="miSummaryFromDate"
            name="miSummaryFromDate"
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

        <div className="w-full sm:w-44">
          <InputDatePicker
            id="miSummaryToDate"
            name="miSummaryToDate"
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

      <Table
        columns={columns}
        data={rows}
        perPage={perPage}
        noDataMessage={report ? t('materialIssueReport.nothingInPeriod') : t('materialIssueReport.pressApply')}
      />

      {rows.length > 0 && !oneUnit && (
        <p className="mt-2 text-right text-sm italic text-[rgb(var(--c-text-muted))]">
          {t('materialIssueReport.mixedUnits')}
        </p>
      )}

      {rows.length > 0 && oneUnit && (
        <div className="mt-2 flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm font-semibold text-[rgb(var(--c-text))]">
          <span>{t('materialIssueReport.total')}: {qty(totals.total_qty)}</span>
          <span>{t('materialIssueReport.issued')}: {qty(totals.issue_qty)}</span>
          <span>{t('materialIssueReport.remaining')}: {qty(totals.remaining)}</span>
        </div>
      )}

      <div className="hidden">
        <MaterialIssueSummaryPrint
          ref={printRef}
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

export default MaterialIssueSummaryReport;
