import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getProductionCosting } from './productionSlice';
import routes from '../../services/appRoutes';

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
  // A batch may make several products; then the master's qty and unit cost
  // are only the first one's, and the output table carries each.
  const severalOutputs = new Set(outputs.map((r) => r.product_name)).size > 1;

  return (
    <div>
      <HelmetTitle title="Batch Costing" />
      <div className="mb-3">
        <ButtonLoading
          onClick={() => navigate(routes.production_register)}
          buttonLoading={false}
          label="Back to Register"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiArrowLeft className="text-lg ml-2 mr-2" />}
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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact label="Batch" value={m.batch_ref || `#${m.id}`} />
        <Fact label="Date" value={m.date} />
        <Fact label="Status" value={m.status} />
        {!severalOutputs && <Fact label="Output qty" value={thousandSeparator(Number(m.output_qty), 2)} />}
        <Fact label="Material cost" value={thousandSeparator(Number(m.material_cost), 2)} />
        <Fact label="Allocated cost" value={thousandSeparator(Number(m.allocated_cost), 2)} />
        <Fact label="True cost" value={thousandSeparator(Number(m.true_cost), 2)} />
        {!severalOutputs && <Fact label="Unit cost" value={thousandSeparator(Number(m.unit_cost), 2)} />}
        <Fact label="Normal loss" value={thousandSeparator(Number(m.loss_normal), 3)} />
        <Fact label="Abnormal loss" value={thousandSeparator(Number(m.loss_abnormal), 3)} />
        <Fact label="Abnormal cost" value={thousandSeparator(Number(m.abnormal_loss_cost), 2)} />
        <Fact label="Total cost" value={thousandSeparator(Number(m.total_cost), 2)} />
      </div>

      <Section title="Inputs">
        <Table
          cols={['Product', 'Base qty', 'FIFO cost']}
          rows={inputs.map((r) => [r.product_name, thousandSeparator(Number(r.base_qty), 2), thousandSeparator(Number(r.fifo_cost), 2)])}
        />
      </Section>

      <Section title="Consumed purchase layers (the batch's trace)">
        <Table
          cols={['Product', 'Voucher', 'Date', 'Qty', 'Rate']}
          rows={layers.map((r) => [
            r.product_name,
            r.source_voucher_no,
            r.layer_vr_date,
            thousandSeparator(Number(r.layer_qty), 2),
            thousandSeparator(Number(r.layer_rate), 2),
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
            thousandSeparator(Number(r.allocated_amount), 2),
          ])}
        />
      </Section>

      <Section title="Output layers">
        <Table
          cols={['Product', 'Cost share %', 'Qty', 'Unit cost', 'Batch', 'Rounding row']}
          rows={outputs.map((r) => [
            r.product_name,
            r.cost_share_pct != null ? Number(r.cost_share_pct).toFixed(2) : '',
            thousandSeparator(Number(r.qty), 2),
            thousandSeparator(Number(r.unit_cost), 2),
            r.batch_no,
            Number(r.is_residual) === 1 ? 'yes' : '',
          ])}
        />
      </Section>
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
