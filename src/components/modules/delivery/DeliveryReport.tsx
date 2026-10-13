import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPrinter, FiRefreshCcw, FiSearch } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import { API_DELIVERY_REPORT_URL } from '../../services/apiRoutes';

/** 'YYYY-MM-DD' <-> Date, the translation the rest of the app makes. */
const asDate = (value: string) => (value ? new Date(value) : null);
const asText = (date: Date | null) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`
    : '';

const statusMeta = (status: string) => {
  switch (status) {
    case 'complete':
      return { label: 'Complete', cls: 'text-green-600 font-semibold' };
    case 'partial':
      return { label: 'Partial', cls: 'text-amber-600 font-semibold' };
    case 'none':
      return { label: 'Not delivered', cls: 'text-red-600 font-semibold' };
    default:
      return { label: 'Invoice (stock taken)', cls: 'text-gray-500' };
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

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="text-green-600">Complete: {summary.complete}</span>
          {'  ·  '}
          <span className="text-amber-600">Partial: {summary.partial}</span>
          {'  ·  '}
          <span className="text-red-600">Not delivered: {summary.none}</span>
        </div>
        <Button onClick={() => window.print()} className="print:hidden">
          <span className="flex items-center gap-1">
            <FiPrinter /> Print
          </span>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-[rgb(var(--c-table-head))]">
            <tr>
              <th className="px-2 py-2 text-center">Sl.</th>
              <th className="px-2 py-2">Invoice No.</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Customer</th>
              <th className="px-2 py-2 text-right">Ordered</th>
              <th className="px-2 py-2 text-right">Delivered</th>
              <th className="px-2 py-2 text-right">Pending</th>
              <th className="px-2 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-4 text-center text-gray-500">
                  {loading ? 'Loading...' : 'No invoices found.'}
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const meta = statusMeta(row.status);
              return (
                <tr key={row.mtm_id} className="border-b bg-[rgb(var(--c-table-body))]">
                  <td className="px-2 py-2 text-center">{index + 1}</td>
                  <td className="px-2 py-2">{row.vr_no}</td>
                  <td className="px-2 py-2">{row.vr_date}</td>
                  <td className="px-2 py-2">{row.customer_name || '-'}</td>
                  <td className="px-2 py-2 text-right">{row.ordered}</td>
                  <td className="px-2 py-2 text-right">{row.delivered}</td>
                  <td className="px-2 py-2 text-right">{row.pending}</td>
                  <td className={`px-2 py-2 text-center ${meta.cls}`}>{meta.label}</td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-semibold">
                <td className="px-2 py-2" colSpan={4}>
                  Total
                </td>
                <td className="px-2 py-2 text-right">{thousandSeparator(totals.ordered)}</td>
                <td className="px-2 py-2 text-right">{thousandSeparator(totals.delivered)}</td>
                <td className="px-2 py-2 text-right">{thousandSeparator(totals.pending)}</td>
                <td className="px-2 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
};

export default DeliveryReport;
