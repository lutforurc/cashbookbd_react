import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FiRefreshCcw, FiSearch } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputDatePicker from '../../utils/fields/DatePicker';
import { ButtonLoading, PrintButton } from '../../../pages/UiElements/CustomButtons';
import Table from '../../utils/others/Table';
import PrintRowsInput from '../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../utils/fields/PrintFontInput';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import { API_DELIVERY_REPORT_URL } from '../../services/apiRoutes';
import DeliveryReportPrint, { deliveryDate, deliveryStatusLabel } from './DeliveryReportPrint';

/** 'YYYY-MM-DD' <-> Date, the translation the rest of the app makes. */
const asDate = (value: string) => (value ? new Date(value) : null);
const asText = (date: Date | null) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`
    : '';

// The words come from the print, so the screen and the paper cannot disagree;
// only the colour is the screen's own.
const statusMeta = (status: string) => {
  const label = deliveryStatusLabel(status);
  switch (status) {
    case 'complete':
      return { label, cls: 'text-green-600 font-semibold' };
    case 'partial':
      return { label, cls: 'text-amber-600 font-semibold' };
    case 'none':
      return { label, cls: 'text-red-600 font-semibold' };
    default:
      return { label, cls: 'text-gray-500' };
  }
};

/**
 * Delivery Report: which invoices are fully delivered, which are partial, and
 * which have not gone out at all -- one row per invoice.
 *
 * Only invoices that actually deliver are listed by default (mode = delivery),
 * because an invoice that took its own stock can never be "delivered" and would
 * otherwise sit here as a permanent "not delivered". Switch to "All invoices" to
 * see them too.
 */
const DeliveryReport = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('delivery');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // The Cash Book's two print boxes: 0 rows = one block, the browser breaks it.
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(10);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Delivery Report',
  });

  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPerPage(Number.isNaN(value) ? 0 : value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSize(Number.isNaN(value) ? 10 : value);
  };

  const fetchReport = () => {
    setLoading(true);
    httpService
      .post(API_DELIVERY_REPORT_URL, {
        from: from || undefined,
        to: to || undefined,
        status: status || undefined,
        mode,
      })
      .then((res) => {
        const data = res?.data?.data?.data;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        toast.error(err?.message || 'Could not load the report');
        setRows([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleReset = () => {
    setFrom('');
    setTo('');
    setStatus('');
    setMode('delivery');
    setLoading(true);
    httpService
      .post(API_DELIVERY_REPORT_URL, { mode: 'delivery' })
      .then((res) => setRows(res?.data?.data?.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  const summary = useMemo(() => {
    const counts = { complete: 0, partial: 0, none: 0 };
    rows.forEach((row) => {
      if (counts[row.status] !== undefined) counts[row.status] += 1;
    });
    return counts;
  }, [rows]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          ordered: acc.ordered + Number(row.ordered || 0),
          delivered: acc.delivered + Number(row.delivered || 0),
          pending: acc.pending + Number(row.pending || 0),
        }),
        { ordered: 0, delivered: 0, pending: 0 },
      ),
    [rows],
  );

  const columns = [
    {
      key: 'sl',
      header: 'Sl. No',
      width: '70px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index: number) => <span>{index + 1}</span>,
    },
    { key: 'vr_no', header: 'Invoice No', width: '130px', headerClass: 'text-center', cellClass: 'text-center' },
    {
      key: 'vr_date',
      header: 'Date',
      width: '100px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => deliveryDate(row.vr_date),
    },
    {
      key: 'customer_name',
      header: 'Customer',
      render: (row: any) => <span>{row.customer_name || '-'}</span>,
    },
    {
      key: 'ordered',
      header: 'Ordered',
      width: '100px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => thousandSeparator(Number(row.ordered || 0)),
    },
    {
      key: 'delivered',
      header: 'Delivered',
      width: '100px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => thousandSeparator(Number(row.delivered || 0)),
    },
    {
      key: 'pending',
      header: 'Pending',
      width: '100px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => thousandSeparator(Number(row.pending || 0)),
    },
    {
      key: 'status',
      header: 'Status',
      width: '160px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        const meta = statusMeta(row.status);
        return <span className={meta.cls}>{meta.label}</span>;
      },
    },
  ];

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Delivery Report" screen="delivery" />
      </div>

      <div className="print:hidden mb-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-end rounded border border-[rgb(var(--c-border))] p-3">
        <InputDatePicker
          id="from"
          name="from"
          label="From"
          className="font-medium text-sm w-full"
          selectedDate={asDate(from)}
          setSelectedDate={(date: Date | null) => setFrom(asText(date))}
          setCurrentDate={() => undefined}
        />
        <InputDatePicker
          id="to"
          name="to"
          label="To"
          className="font-medium text-sm w-full"
          selectedDate={asDate(to)}
          setSelectedDate={(date: Date | null) => setTo(asText(date))}
          setCurrentDate={() => undefined}
        />
        <div>
          <label className="block text-sm">Status</label>
          <select
            className="mt-1 w-full rounded border border-[rgb(var(--c-border))] bg-transparent px-2 py-1.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="complete">Complete</option>
            <option value="partial">Partial</option>
            <option value="none">Not delivered</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Invoices</label>
          <select
            className="mt-1 w-full rounded border border-[rgb(var(--c-border))] bg-transparent px-2 py-1.5 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="delivery">Delivery invoices</option>
            <option value="all">All invoices</option>
          </select>
        </div>
        <ButtonLoading
          onClick={fetchReport}
          buttonLoading={loading}
          label="Search"
          responsiveLabel="xl"
          className="whitespace-nowrap"
          icon={<FiSearch className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={handleReset}
          buttonLoading={false}
          label="Reset"
          responsiveLabel="xl"
          className="whitespace-nowrap"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />
      </div>

      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div className="text-sm">
          <span className="text-green-600">Complete: {summary.complete}</span>
          {'  ·  '}
          <span className="text-amber-600">Partial: {summary.partial}</span>
          {'  ·  '}
          <span className="text-red-600">Not delivered: {summary.none}</span>
        </div>

        {/* Rows, Font and Print -- the Cash Book's own three controls. */}
        <div className="grid grid-cols-[minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto] items-end gap-2">
          <PrintRowsInput
            id="perPage"
            name="perPage"
            label=""
            value={perPage.toString()}
            onChange={handlePerPageChange}
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
          <PrintButton onClick={handlePrint} label="Print" className="px-6" disabled={rows.length === 0} />
        </div>
      </div>

      <Table
        columns={columns}
        data={rows}
        getRowKey={(row) => row.mtm_id}
        noDataMessage={loading ? 'Loading...' : 'No invoices found.'}
        footerRows={
          rows.length
            ? [
                [
                  { label: 'Total', colSpan: 4, className: 'text-right' },
                  { label: thousandSeparator(totals.ordered), className: 'text-right' },
                  { label: thousandSeparator(totals.delivered), className: 'text-right' },
                  { label: thousandSeparator(totals.pending), className: 'text-right' },
                  { label: '' },
                ],
              ]
            : undefined
        }
      />

      {/* === Hidden Print Component === */}
      <div className="hidden">
        <DeliveryReportPrint
          ref={printRef}
          rows={rows}
          startDate={from ? dayjs(from).format('DD/MM/YYYY') : undefined}
          endDate={to ? dayjs(to).format('DD/MM/YYYY') : undefined}
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
        />
      </div>
    </>
  );
};

export default DeliveryReport;
