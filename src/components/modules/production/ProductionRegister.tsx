import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiPrinter, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getProductionRegister } from './productionSlice';
import { branchTodayIso, monthStartIso } from './branchDate';
import routes from '../../services/appRoutes';

// The shared picker works in Date objects; the API keeps ISO, parsed locally.
const dateFromIso = (value: string): Date | null => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const isoFromDate = (date: Date | null): string =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';

// The voucher number in brackets only when the batch ref says something else;
// a blank ref is saved as the voucher number, which then read twice.
const vrNoSuffix = (row: any) => (row.vr_no && row.vr_no !== row.batch_ref ? row.vr_no : '');

// A batch may make several products: then each output is one line in the
// cell, and the master's qty and unit cost (the first product's) are not used.
const perOutput = (row: any, single: React.ReactNode, pick: (o: any) => React.ReactNode) =>
  Array.isArray(row.outputs) && row.outputs.length > 1
    ? row.outputs.map((o: any, i: number) => <div key={i}>{pick(o)}</div>)
    : single;

// Expiry is per output; a single-output batch still reads it off that output.
const expiryOf = (row: any) =>
  perOutput(
    row,
    row.outputs?.[0]?.expiry_date || '',
    (o: any) => o.expiry_date || '',
  );

// How the batch stands against the recipe it was saved with. Anything above the
// recipe -- more material, less output, more loss -- is the red case.
const varianceText = (row: any): string => {
  const variance = row.variance;

  if (!variance) return '-';

  const parts: string[] = [];

  if (Number(variance.inputs_over) > 0) {
    parts.push(`${variance.inputs_over} material${Number(variance.inputs_over) === 1 ? '' : 's'} over`);
  }

  if (variance.output_short) parts.push('output short');
  if (variance.loss_over) parts.push('loss over');

  return parts.length ? parts.join(', ') : 'On recipe';
};

/**
 * Production Register: one row per batch, with what it cost and the TRUE gross
 * profit for the period.
 *
 * The true gross profit, batch by batch. The P&L shows the same allocated
 * labour as a direct acquisition cost for the period as a whole (owner's
 * decision #12, option "গ"); this is where it is broken down by batch.
 *
 * A batch whose source voucher has since been edited or deleted is flagged red.
 */
const ProductionRegister = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();

  const trxDt = useSelector((s: any) => s.settings?.data?.trx_dt);
  const [to, setTo] = useState(() => branchTodayIso(trxDt));
  const [from, setFrom] = useState(() => monthStartIso(to));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const rows: any[] = Array.isArray(report?.rows) ? report.rows : [];
  const summary = report?.summary ?? {};

  const run = () => {
    setLoading(true);
    dispatch(
      getProductionRegister({ from_date: from, to_date: to }, (response: any) => {
        setLoading(false);
        if (response?.success) setReport(response.data);
        else toast.error(response?.message || 'Could not load the register');
      }) as any,
    );
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Production Register',
  });

  return (
    <div>
      <HelmetTitle title="Production Register" />

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-full md:w-44">
          <InputDatePicker
            id="prodRegFrom"
            name="from"
            label="From"
            selectedDate={dateFromIso(from)}
            setSelectedDate={(date) => setFrom(isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-44">
          <InputDatePicker
            id="prodRegTo"
            name="to"
            label="To"
            selectedDate={dateFromIso(to)}
            setSelectedDate={(date) => setTo(isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>
        <ButtonLoading
          onClick={run}
          buttonLoading={loading}
          label="Show"
          className="whitespace-nowrap text-center mr-0 py-2 w-30"
          icon={<FiSearch className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={() => handlePrint()}
          buttonLoading={false}
          label="Print"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiPrinter className="text-lg ml-2 mr-2" />}
        />
      </div>

      {/* Summary -- the figures the P&L cannot show together. */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Net sales" value={summary.net_sales} />
        <SummaryCard label="Cost of goods (with allocated)" value={summary.cost_of_goods} />
        <SummaryCard label="True gross profit" value={summary.true_gross_profit} highlight />
        <SummaryCard label="Abnormal loss" value={summary.abnormal_loss_total} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
            <tr>
              <th className="px-2 py-2">Batch</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Output</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2">Expiry</th>
              <th className="px-2 py-2 text-right">Material</th>
              <th className="px-2 py-2 text-right">Allocated</th>
              <th className="px-2 py-2 text-right">True cost</th>
              <th className="px-2 py-2 text-right">Unit cost</th>
              <th className="px-2 py-2">Loss</th>
              <th className="px-2 py-2">Recipe</th>
              <th className="px-2 py-2">Variance</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-center">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b dark:border-gray-700 ${
                  row.flag || row.variance?.over
                    ? 'bg-red-50 dark:bg-red-500/10'
                    : 'bg-[rgb(var(--c-table-body))]'
                }`}
              >
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.batch_ref || `#${row.id}`}
                  {vrNoSuffix(row) ? <span className="ml-1 text-xs text-gray-400">({vrNoSuffix(row)})</span> : null}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.date}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {perOutput(row, row.output_product, (o) => o.product_name)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {perOutput(row, thousandSeparator(Number(row.output_qty)), (o) => thousandSeparator(Number(o.qty)))}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {expiryOf(row)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.material_cost))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.allocated_cost))}
                </td>
                <td className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.true_cost))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {perOutput(row, thousandSeparator(Number(row.unit_cost)), (o) => thousandSeparator(Number(o.unit_cost)))}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.loss_actual))}
                  {Number(row.loss_abnormal) > 0 ? (
                    <span className="ml-1 text-xs text-red-600 dark:text-red-400">
                      ({thousandSeparator(Number(row.loss_abnormal))} abnormal)
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.recipe
                    ? `${row.recipe.name}${row.recipe.version ? ` v${row.recipe.version}` : ''}`
                    : '-'}
                </td>
                <td
                  className={`px-2 py-2 whitespace-nowrap ${
                    row.variance?.over
                      ? 'font-semibold text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-[rgb(var(--c-text))]'
                  }`}
                >
                  {varianceText(row)}
                  {row.variance?.loss_over ? (
                    <div className="text-xs">
                      loss {thousandSeparator(Number(row.variance.loss_actual))} over{' '}
                      {thousandSeparator(Number(row.variance.loss_allowed))}
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  {row.flag ? (
                    <span
                      title={row.flag.message}
                      className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-300"
                    >
                      source changed
                    </span>
                  ) : (
                    <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700/40 dark:text-gray-300">
                      {row.status}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-center">
                  <Button
                    onClick={() => navigate(routes.production_costing.replace(':id', String(row.id)))}
                    className="text-blue-600 text-center"
                    title="Batch Costing"
                  >
                    <FiSearch className="cursor-pointer text-center" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td colSpan={14} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  No batch in this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* A flagged batch, spelled out under the table so the message is readable. */}
      {rows.some((r) => r.flag) && (
        <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700/50 dark:bg-red-500/10 dark:text-red-300">
          <p className="mb-1 font-semibold">Some batches no longer match their source:</p>
          <ul className="list-disc pl-5">
            {rows
              .filter((r) => r.flag)
              .map((r) => (
                <li key={r.id}>
                  {r.batch_ref || `#${r.id}`}: {r.flag.message}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Print paper -- solid black, no fills, the whole filtered set. */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} className="production-register-print" style={{ color: '#000', background: '#fff' }}>
          <style>{`
            .production-register-print, .production-register-print * { color: #000 !important; background: transparent !important; border-color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .production-register-print table { width: 100%; border-collapse: collapse; }
            .production-register-print th, .production-register-print td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; text-align: left; }
            .production-register-print .num { text-align: right; }
          `}</style>
          <PadPrinting />
          <h2 style={{ textAlign: 'center', fontWeight: 700 }}>Production Register</h2>
          <p style={{ textAlign: 'center', fontSize: 12 }}>
            {from} to {to}
          </p>
          <p style={{ fontSize: 12 }}>
            Net sales {thousandSeparator(Number(summary.net_sales))} | Cost (with allocated){' '}
            {thousandSeparator(Number(summary.cost_of_goods))} | True gross profit{' '}
            {thousandSeparator(Number(summary.true_gross_profit))} | Abnormal loss{' '}
            {thousandSeparator(Number(summary.abnormal_loss_total))}
          </p>
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Date</th>
                <th>Output</th>
                <th className="num">Qty</th>
                <th>Expiry</th>
                <th className="num">Material</th>
                <th className="num">Allocated</th>
                <th className="num">True cost</th>
                <th className="num">Unit cost</th>
                <th>Recipe</th>
                <th>Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.batch_ref || `#${row.id}`}</td>
                  <td>{row.date}</td>
                  <td>{perOutput(row, row.output_product, (o) => o.product_name)}</td>
                  <td className="num">
                    {perOutput(row, thousandSeparator(Number(row.output_qty)), (o) => thousandSeparator(Number(o.qty)))}
                  </td>
                  <td>{expiryOf(row)}</td>
                  <td className="num">{thousandSeparator(Number(row.material_cost))}</td>
                  <td className="num">{thousandSeparator(Number(row.allocated_cost))}</td>
                  <td className="num">{thousandSeparator(Number(row.true_cost))}</td>
                  <td className="num">
                    {perOutput(row, thousandSeparator(Number(row.unit_cost)), (o) => thousandSeparator(Number(o.unit_cost)))}
                  </td>
                  <td>
                    {row.recipe
                      ? `${row.recipe.name}${row.recipe.version ? ` v${row.recipe.version}` : ''}`
                      : '-'}
                  </td>
                  <td>{varianceText(row)}</td>
                  <td>{row.flag ? 'source changed' : row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) => (
  <div
    className={`rounded border p-3 ${
      highlight
        ? 'border-green-300 bg-green-50 dark:border-green-700/50 dark:bg-green-500/10'
        : 'border-[rgb(var(--c-border))]'
    }`}
  >
    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
      {thousandSeparator(Number(value || 0))}
    </p>
  </div>
);

export default ProductionRegister;
