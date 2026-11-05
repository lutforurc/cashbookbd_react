import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiPrinter, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getProductionRegister } from './productionSlice';
import routes from '../../services/appRoutes';

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

// A batch may make several products: then each output is one line in the
// cell, and the master's qty and unit cost (the first product's) are not used.
const perOutput = (row: any, single: React.ReactNode, pick: (o: any) => React.ReactNode) =>
  Array.isArray(row.outputs) && row.outputs.length > 1
    ? row.outputs.map((o: any, i: number) => <div key={i}>{pick(o)}</div>)
    : single;

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

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
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
        <InputElement
          id="prodRegFrom"
          name="from"
          type="date"
          label="From"
          value={from}
          onChange={(e: any) => setFrom(e.target.value)}
          className="w-full md:w-44"
        />
        <InputElement
          id="prodRegTo"
          name="to"
          type="date"
          label="To"
          value={to}
          onChange={(e: any) => setTo(e.target.value)}
          className="w-full md:w-44"
        />
        <ButtonLoading
          onClick={run}
          buttonLoading={loading}
          label="Show"
          className="whitespace-nowrap text-center mr-0 py-2"
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
              <th className="px-2 py-2 text-right">Material</th>
              <th className="px-2 py-2 text-right">Allocated</th>
              <th className="px-2 py-2 text-right">True cost</th>
              <th className="px-2 py-2 text-right">Unit cost</th>
              <th className="px-2 py-2">Loss</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-center">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b dark:border-gray-700 ${
                  row.flag ? 'bg-red-50 dark:bg-red-500/10' : 'bg-[rgb(var(--c-table-body))]'
                }`}
              >
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.batch_ref || `#${row.id}`}
                  {row.vr_no ? <span className="ml-1 text-xs text-gray-400">({row.vr_no})</span> : null}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.date}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {perOutput(row, row.output_product, (o) => o.product_name)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {perOutput(row, thousandSeparator(Number(row.output_qty), 2), (o) => thousandSeparator(Number(o.qty), 2))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.material_cost), 2)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.allocated_cost), 2)}
                </td>
                <td className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.true_cost), 2)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {perOutput(row, thousandSeparator(Number(row.unit_cost), 2), (o) => thousandSeparator(Number(o.unit_cost), 2))}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.loss_actual), 2)}
                  {Number(row.loss_abnormal) > 0 ? (
                    <span className="ml-1 text-xs text-red-600 dark:text-red-400">
                      ({thousandSeparator(Number(row.loss_abnormal), 2)} abnormal)
                    </span>
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
                <td colSpan={11} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
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
            .production-register-print, .production-register-print * { color: #000 !important; background: transparent !important; border-color: #000 !important; }
            .production-register-print table { width: 100%; border-collapse: collapse; }
            .production-register-print th, .production-register-print td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; text-align: left; }
            .production-register-print .num { text-align: right; }
          `}</style>
          <h2 style={{ textAlign: 'center', fontWeight: 700 }}>Production Register</h2>
          <p style={{ textAlign: 'center', fontSize: 12 }}>
            {from} to {to}
          </p>
          <p style={{ fontSize: 12 }}>
            Net sales {thousandSeparator(Number(summary.net_sales), 2)} | Cost (with allocated){' '}
            {thousandSeparator(Number(summary.cost_of_goods), 2)} | True gross profit{' '}
            {thousandSeparator(Number(summary.true_gross_profit), 2)} | Abnormal loss{' '}
            {thousandSeparator(Number(summary.abnormal_loss_total), 2)}
          </p>
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Date</th>
                <th>Output</th>
                <th className="num">Qty</th>
                <th className="num">Material</th>
                <th className="num">Allocated</th>
                <th className="num">True cost</th>
                <th className="num">Unit cost</th>
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
                    {perOutput(row, thousandSeparator(Number(row.output_qty), 2), (o) => thousandSeparator(Number(o.qty), 2))}
                  </td>
                  <td className="num">{thousandSeparator(Number(row.material_cost), 2)}</td>
                  <td className="num">{thousandSeparator(Number(row.allocated_cost), 2)}</td>
                  <td className="num">{thousandSeparator(Number(row.true_cost), 2)}</td>
                  <td className="num">
                    {perOutput(row, thousandSeparator(Number(row.unit_cost), 2), (o) => thousandSeparator(Number(o.unit_cost), 2))}
                  </td>
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
      {thousandSeparator(Number(value || 0), 2)}
    </p>
  </div>
);

export default ProductionRegister;
