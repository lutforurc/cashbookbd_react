import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPrinter } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getProductionCosting } from './productionSlice';
import routes from '../../services/appRoutes';

// The ways a batch can stand above its recipe, in the same words the register
// uses, so the red case reads the same on both screens.
const varianceNotes = (variance: any): string[] => {
  if (!variance) return [];

  const notes: string[] = [];

  if (Number(variance.inputs_over) > 0) {
    notes.push(
      `${variance.inputs_over} material${Number(variance.inputs_over) === 1 ? '' : 's'} used above the recipe`,
    );
  }

  if (variance.output_short) notes.push('the batch made less than the recipe yield');
  if (variance.loss_over) notes.push('the loss is above the recipe tolerance');

  return notes;
};

/**
 * Batch Costing: everything one batch consists of, traced to its sources.
 *
 * The inputs and the exact purchase layers they were taken from, the expense
 * lines the batch was costed from, and the output layers it was written as. A
 * batch whose source has since moved is shown flagged, for the same reason the
 * register flags it -- the snapshot no longer matches what the batch was costed
 * against.
 */
const BatchCosting = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();

  const [detail, setDetail] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Built before the early return below, so the hook order never changes.
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Batch Costing',
  });

  useEffect(() => {
    if (!id) return;
    dispatch(
      getProductionCosting(id, (response: any) => {
        if (response?.success) setDetail(response.data);
        else toast.error(response?.message || 'Could not load the batch');
      }) as any,
    );
  }, [dispatch, id]);

  if (!detail) {
    return (
      <div>
        <HelmetTitle title="Batch Costing" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  const m = detail.master ?? {};
  const inputs: any[] = detail.inputs ?? [];
  const layers: any[] = detail.layers ?? [];
  const allocations: any[] = detail.allocations ?? [];
  const outputs: any[] = detail.outputs ?? [];
  // What the recipe expected, frozen when the draft was saved.
  const recipe = detail.recipe ?? null;
  const recipeLines: any[] = detail.recipe_lines ?? [];
  const variance = detail.variance ?? null;
  // A batch may make several products; then the master's qty and unit cost
  // are only the first one's, and the output table carries each.
  const severalOutputs = new Set(outputs.map((r) => r.product_name)).size > 1;

  // The output table is drawn twice -- on the screen and on the paper -- so its
  // columns live in one place. Expiry is optional and rides on every rounded
  // row of the output.
  const outputCols = ['Product', 'Cost share %', 'Qty', 'Unit cost', 'Batch', 'Expiry', 'Rounding row'];
  const outputRows = outputs.map((r) => [
    r.product_name,
    r.cost_share_pct != null ? Number(r.cost_share_pct).toFixed(2) : '',
    thousandSeparator(Number(r.qty)),
    thousandSeparator(Number(r.unit_cost)),
    r.batch_no,
    r.expiry_date || '',
    Number(r.is_residual) === 1 ? 'yes' : '',
  ]);

  return (
    <div>
      <HelmetTitle title="Batch Costing" />
      <div className="mb-3 flex flex-wrap gap-2">
        <ButtonLoading
          onClick={() => navigate(routes.production_register)}
          buttonLoading={false}
          label="Back to Register"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiArrowLeft className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={() => handlePrint()}
          buttonLoading={false}
          label="Print"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiPrinter className="text-lg ml-2 mr-2" />}
        />
      </div>

      {m.flag && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700/50 dark:bg-red-500/10 dark:text-red-300">
          <strong>Source changed:</strong> {m.flag.message}
        </div>
      )}

      {m.status === 'reversed' && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-300">
          <strong>Reversed.</strong> The stock movement has been taken back off and the allocated expense
          released, but the batch and everything below it is kept as history
          {m.reversed_at ? ` (reversed ${m.reversed_at}${m.reversed_by ? ` by user #${m.reversed_by}` : ''})` : ''}.
        </div>
      )}

      {variance?.over && (
        <div className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700/50 dark:bg-red-500/10 dark:text-red-300">
          <strong>Above the recipe:</strong> {varianceNotes(variance).join('; ')}.
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact label="Batch" value={m.batch_ref || `#${m.id}`} />
        <Fact label="Date" value={m.date} />
        <Fact label="Status" value={m.status} />
        {!severalOutputs && <Fact label="Output qty" value={thousandSeparator(Number(m.output_qty))} />}
        <Fact label="Material cost" value={thousandSeparator(Number(m.material_cost))} />
        <Fact label="Allocated cost" value={thousandSeparator(Number(m.allocated_cost))} />
        <Fact label="True cost" value={thousandSeparator(Number(m.true_cost))} />
        {!severalOutputs && <Fact label="Unit cost" value={thousandSeparator(Number(m.unit_cost))} />}
        <Fact label="Normal loss" value={thousandSeparator(Number(m.loss_normal))} />
        <Fact label="Abnormal loss" value={thousandSeparator(Number(m.loss_abnormal))} />
        <Fact label="Abnormal cost" value={thousandSeparator(Number(m.abnormal_loss_cost))} />
        <Fact label="Total cost" value={thousandSeparator(Number(m.total_cost))} />
        {recipe ? (
          <Fact label="Recipe" value={`${recipe.name}${recipe.version ? ` v${recipe.version}` : ''}`} />
        ) : null}
        {variance ? (
          <Fact
            label="Loss allowed (recipe)"
            value={
              <span className={variance.loss_over ? 'text-red-600 dark:text-red-400' : ''}>
                {thousandSeparator(Number(variance.loss_allowed))}
              </span>
            }
          />
        ) : null}
      </div>

      {recipe ? (
        <Section title={`Recipe — ${recipe.name}${recipe.version ? ` v${recipe.version}` : ''}`}>
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            Saved against this batch on {recipe.effective_date || '-'}; it was filled for{' '}
            {thousandSeparator(Number(recipe.target_qty))}.{' '}
            {variance ? (
              <span className={variance.output_short ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
                The batch made {thousandSeparator(Number(variance.output_actual))}
                {variance.output_short ? ' — short of the recipe' : ''}.
              </span>
            ) : null}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
                <tr>
                  <th className="px-2 py-2">Material</th>
                  <th className="px-2 py-2 text-right">Recipe says</th>
                  <th className="px-2 py-2 text-right">Actually used</th>
                  <th className="px-2 py-2 text-right">Difference</th>
                </tr>
              </thead>
              <tbody>
                {recipeLines.map((row, index) => {
                  const difference = Number(row.difference) || 0;
                  // `over` comes from the server: an input outside the recipe is
                  // only red on a single-output batch, where it can belong to no
                  // other product.
                  const over = Boolean(row.over);

                  return (
                    <tr key={index} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                      <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                        {row.product_name || '-'}
                        {row.line_type === 'packaging' ? (
                          <span className="ml-1 text-xs text-gray-500">(packaging)</span>
                        ) : null}
                        {row.not_in_recipe ? (
                          <span className="ml-1 text-xs text-gray-500">(not in recipe)</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                        {thousandSeparator(Number(row.expected_qty))} {row.unit}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                        {thousandSeparator(Number(row.actual_qty))} {row.unit}
                      </td>
                      <td
                        className={`px-2 py-2 text-right ${
                          over
                            ? 'font-semibold text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-[rgb(var(--c-text))]'
                        }`}
                      >
                        {difference > 0 ? '+' : ''}
                        {difference === 0 ? '0' : thousandSeparator(difference)} {row.unit}
                        {over ? ' over' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      <Section title="Inputs">
        <Table
          cols={['Product', 'Base qty', 'FIFO cost']}
          rows={inputs.map((r) => [r.product_name, thousandSeparator(Number(r.base_qty)), thousandSeparator(Number(r.fifo_cost))])}
        />
      </Section>

      <Section title="Consumed purchase layers (the batch's trace)">
        <Table
          cols={['Product', 'Voucher', 'Date', 'Qty', 'Rate']}
          rows={layers.map((r) => [
            r.product_name,
            r.source_voucher_no,
            r.layer_vr_date,
            thousandSeparator(Number(r.layer_qty)),
            thousandSeparator(Number(r.layer_rate)),
          ])}
        />
      </Section>

      <Section title="Allocated expense lines">
        <Table
          cols={['Voucher', 'Head', 'Date', 'Amount']}
          rows={allocations.map((r) => [
            r.source_voucher_no,
            r.head_name,
            r.source_date,
            thousandSeparator(Number(r.allocated_amount)),
          ])}
        />
      </Section>

      <Section title="Output layers">
        <Table cols={outputCols} rows={outputRows} />
      </Section>

      {/* Print paper -- the whole sheet in solid black, never grey. */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} className="batch-costing-print" style={{ color: '#000', background: '#fff' }}>
          <style>{`
            .batch-costing-print, .batch-costing-print * { color: #000 !important; background: transparent !important; border-color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .batch-costing-print table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .batch-costing-print th, .batch-costing-print td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; text-align: left; }
            .batch-costing-print h3 { margin: 10px 0 4px; font-size: 12px; text-transform: uppercase; }
          `}</style>

          <h2 style={{ textAlign: 'center', fontWeight: 700 }}>Batch Costing</h2>
          <p style={{ textAlign: 'center', fontSize: 12 }}>
            {m.batch_ref || `#${m.id}`} | {m.date} | {m.status}
          </p>
          {m.flag && <p style={{ fontSize: 12 }}>Source changed: {m.flag.message}</p>}

          <table>
            <tbody>
              <tr>
                <td>Material cost</td><td>{thousandSeparator(Number(m.material_cost))}</td>
                <td>Allocated cost</td><td>{thousandSeparator(Number(m.allocated_cost))}</td>
              </tr>
              <tr>
                <td>True cost</td><td>{thousandSeparator(Number(m.true_cost))}</td>
                <td>Total cost</td><td>{thousandSeparator(Number(m.total_cost))}</td>
              </tr>
              <tr>
                <td>Normal loss</td><td>{thousandSeparator(Number(m.loss_normal))}</td>
                <td>Abnormal loss</td><td>{thousandSeparator(Number(m.loss_abnormal))}</td>
              </tr>
              <tr>
                <td>Abnormal cost</td><td>{thousandSeparator(Number(m.abnormal_loss_cost))}</td>
                <td>Unit cost</td><td>{severalOutputs ? '' : thousandSeparator(Number(m.unit_cost))}</td>
              </tr>
            </tbody>
          </table>

          {recipe ? (
            <>
              <h3>
                Recipe — {recipe.name}
                {recipe.version ? ` v${recipe.version}` : ''}
              </h3>
              <p style={{ fontSize: 12 }}>
                Saved against this batch on {recipe.effective_date || '-'}; filled for{' '}
                {recipe.target_qty}.{variance ? ` Made ${variance.output_actual}${variance.output_short ? ' (short)' : ''}.` : ''}
              </p>
              <table>
                <thead><tr><th>Material</th><th>Recipe says</th><th>Actually used</th><th>Difference</th></tr></thead>
                <tbody>
                  {recipeLines.map((r, i) => (
                    <tr key={i}>
                      <td>{r.product_name}{r.not_in_recipe ? ' (not in recipe)' : ''}</td>
                      <td>{thousandSeparator(Number(r.expected_qty))} {r.unit}</td>
                      <td>{thousandSeparator(Number(r.actual_qty))} {r.unit}</td>
                      <td>
                        {Number(r.difference) === 0
                          ? '0'
                          : `${Number(r.difference) > 0 ? '+' : ''}${thousandSeparator(Number(r.difference))}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}

          <h3>Inputs</h3>
          <table>
            <thead><tr><th>Product</th><th>Base qty</th><th>FIFO cost</th></tr></thead>
            <tbody>
              {inputs.map((r, i) => (
                <tr key={i}>
                  <td>{r.product_name}</td>
                  <td>{thousandSeparator(Number(r.base_qty))}</td>
                  <td>{thousandSeparator(Number(r.fifo_cost))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Consumed purchase layers</h3>
          <table>
            <thead><tr><th>Product</th><th>Voucher</th><th>Date</th><th>Qty</th><th>Rate</th></tr></thead>
            <tbody>
              {layers.map((r, i) => (
                <tr key={i}>
                  <td>{r.product_name}</td>
                  <td>{r.source_voucher_no}</td>
                  <td>{r.layer_vr_date}</td>
                  <td>{thousandSeparator(Number(r.layer_qty))}</td>
                  <td>{thousandSeparator(Number(r.layer_rate))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Allocated expense lines</h3>
          <table>
            <thead><tr><th>Voucher</th><th>Head</th><th>Date</th><th>Amount</th></tr></thead>
            <tbody>
              {allocations.map((r, i) => (
                <tr key={i}>
                  <td>{r.source_voucher_no}</td>
                  <td>{r.head_name}</td>
                  <td>{r.source_date}</td>
                  <td>{thousandSeparator(Number(r.allocated_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Output layers</h3>
          <table>
            <thead>
              <tr>{outputCols.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {outputRows.map((row, i) => (
                <tr key={i}>{row.map((cell, ci) => <td key={ci}>{cell ?? ''}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Fact = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded border border-[rgb(var(--c-border))] p-2">
    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">{value ?? '-'}</p>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h4>
    {children}
  </div>
);

const Table = ({ cols, rows }: { cols: string[]; rows: any[][] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
      <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
        <tr>
          {cols.map((c) => (
            <th key={c} className="px-2 py-2">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
            {row.map((cell, ci) => (
              <td key={ci} className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                {cell ?? '-'}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
            <td colSpan={cols.length} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
              None
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default BatchCosting;
