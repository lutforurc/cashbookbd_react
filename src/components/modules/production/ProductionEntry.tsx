import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2, FiCheckCircle, FiRotateCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import { Select } from '../../utils/fields/FormControls';
import { FIELD_SELECT } from '../../../theme/fieldStyles';
import ProductDropdown from '../../utils/utils-functions/ProductDropdown';
import WarehouseDropdown from '../../utils/utils-functions/WarehouseDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import { API_PRODUCTION_STOCK_URL } from '../../services/apiRoutes';
import { getDdlWarehouse } from '../warehouse/ddlWarehouseSlider';
import {
  destroyProduction,
  getProductionAllocatable,
  getProductionBatches,
  getProductionDetails,
  postProduction,
  reverseProduction,
  storeProduction,
  updateProduction,
} from './productionSlice';

type Option = { value: string; label: string; label_2?: string; label_3?: string; label_5?: string };

type InputLine = {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  godownId: string;
  qty: string;
};

const emptyInput = { productId: '', productName: '', unit: '', godownId: '', qty: '' };

type Tab = 'output' | 'inputs' | 'costs' | 'batches';

const today = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

/**
 * Production Entry: a batch of raw materials turned into one finished SKU.
 *
 * A DRAFT moves nothing; POST is the act that takes the inputs off the shelf,
 * puts the output on it and freezes what it cost. There is no ledger entry --
 * the larger closing stock carries the cost, and the P&L reads the allocated
 * part as a direct acquisition cost (owner's decision #12, option "গ").
 *
 * The form is split into tabs; every field lives in the one `form` state, so
 * switching tabs never loses what was typed.
 *
 * Costs are worked out by the server (FIFO layers, allocated expense) and are
 * never typed except as the choice of which expense line to spend.
 */
const ProductionEntry = () => {
  const dispatch = useDispatch<any>();
  const production = useSelector((s: any) => s.production);
  const warehouseState = useSelector((s: any) => s.activeWarehouse);
  const warehouseOptions = Array.isArray(warehouseState?.data) ? warehouseState.data : [];
  const batches: any[] = Array.isArray(production?.data) ? production.data : [];

  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('output');
  const [line, setLine] = useState({ ...emptyInput });
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [allocatable, setAllocatable] = useState<any[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});

  const [form, setForm] = useState({
    productionDate: today(),
    batchRef: '',
    notes: '',
    outputProductId: '',
    outputProductName: '',
    outputGodownId: '',
    outputQty: '',
    inputs: [] as InputLine[],
    lossActual: '',
    lossTolerance: '',
    lossBasis: 'kg',
    lossReason: '',
    allocations: {} as Record<string, string>,
  });
  const [editing, setEditing] = useState<{ id: number; batchRef: string } | null>(null);

  // A fresh key per new batch, so a double-click or a retried save lands once.
  const idempotencyKey = useRef<string>('');
  const newKey = () => {
    idempotencyKey.current =
      (window.crypto?.randomUUID && window.crypto.randomUUID()) || String(Date.now());
  };

  useEffect(() => {
    dispatch(getDdlWarehouse());
    dispatch(getProductionBatches({}));
  }, [dispatch]);

  // The expense lines a batch dated this day may be costed from. Re-read when
  // the date changes, because the server only offers the batch's own month.
  useEffect(() => {
    // The thunk takes no callback -- its rows come back as the action payload.
    dispatch(getProductionAllocatable({ date: form.productionDate })).then((action: any) =>
      setAllocatable(Array.isArray(action?.payload) ? action.payload : []),
    );
  }, [dispatch, form.productionDate]);

  // What the branch holds of each input, at the batch date.
  const inputProductIds = form.inputs.map((i) => i.productId).filter(Boolean).join(',');
  useEffect(() => {
    if (!inputProductIds) {
      setStock({});
      return;
    }
    httpService
      .get(API_PRODUCTION_STOCK_URL, { params: { product_ids: inputProductIds, date: form.productionDate } })
      .then((res: any) => setStock(res?.data?.data?.data ?? res?.data?.data ?? {}))
      .catch(() => setStock({}));
  }, [inputProductIds, form.productionDate]);

  const setField = (name: string, value: any) => setForm((p) => ({ ...p, [name]: value }));

  const resetForm = () => {
    setForm({
      productionDate: today(),
      batchRef: '',
      notes: '',
      outputProductId: '',
      outputProductName: '',
      outputGodownId: '',
      outputQty: '',
      inputs: [],
      lossActual: '',
      lossTolerance: '',
      lossBasis: 'kg',
      lossReason: '',
      allocations: {},
    });
    setLine({ ...emptyInput });
    setEditingLineId(null);
    setEditing(null);
    newKey();
  };

  const productOption = (id: string, label: string): Option | null =>
    id ? { value: id, label } : null;

  const handleLineProduct = (option: Option | null) => {
    setLine((p) => ({
      ...p,
      productId: option?.value || '',
      productName: option?.label || '',
      unit: option?.label_5 || '',
    }));
  };

  const addLine = () => {
    if (!line.productId) return toast.error('Pick a product');
    if (!line.qty || Number(line.qty) <= 0) return toast.error('Enter a quantity');
    setForm((p) => ({
      ...p,
      inputs: [
        ...p.inputs,
        {
          id: Date.now(),
          productId: line.productId,
          productName: line.productName,
          unit: line.unit,
          godownId: line.godownId || p.outputGodownId,
          qty: line.qty,
        },
      ],
    }));
    setLine({ ...emptyInput });
    setEditingLineId(null);
  };

  const editLine = (id: number) => {
    const found = form.inputs.find((i) => i.id === id);
    if (!found) return;
    setLine({
      productId: found.productId,
      productName: found.productName,
      unit: found.unit,
      godownId: found.godownId,
      qty: found.qty,
    });
    setEditingLineId(id);
  };

  const updateLine = () => {
    if (editingLineId === null) return;
    setForm((p) => ({
      ...p,
      inputs: p.inputs.map((i) =>
        i.id === editingLineId
          ? { ...i, productId: line.productId, productName: line.productName, unit: line.unit, godownId: line.godownId, qty: line.qty }
          : i,
      ),
    }));
    setLine({ ...emptyInput });
    setEditingLineId(null);
  };

  const deleteLine = (id: number) => {
    setForm((p) => ({ ...p, inputs: p.inputs.filter((i) => i.id !== id) }));
    if (editingLineId === id) {
      setLine({ ...emptyInput });
      setEditingLineId(null);
    }
  };

  const allocationTotal = useMemo(
    () =>
      Object.values(form.allocations).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [form.allocations],
  );

  const buildPayload = () => ({
    id: editing?.id ?? null,
    idempotency_key: idempotencyKey.current,
    production_date: form.productionDate,
    batch_ref: form.batchRef || null,
    output: {
      product_id: Number(form.outputProductId),
      godown_id: form.outputGodownId ? Number(form.outputGodownId) : null,
      qty: Number(form.outputQty),
    },
    inputs: form.inputs.map((i) => ({
      product_id: Number(i.productId),
      godown_id: i.godownId ? Number(i.godownId) : null,
      base_qty: Number(i.qty),
    })),
    loss: {
      basis: form.lossBasis,
      actual: Number(form.lossActual) || 0,
      tolerance_pct: Number(form.lossTolerance) || 0,
      reason: form.lossReason || null,
    },
    allocations: Object.entries(form.allocations)
      .filter(([, amount]) => amount !== '' && Number(amount) > 0)
      .map(([sourceId, amount]) => ({ source_acc_detail_id: Number(sourceId), amount: Number(amount) })),
  });

  // Each problem names the tab its field is on, so a save refused for a field
  // on a hidden tab opens that tab instead of leaving the clerk to hunt for it.
  const validate = (): { message: string; tab: Tab } | null => {
    if (!form.productionDate) return { message: 'Production date is required.', tab };
    if (!form.outputProductId) return { message: 'Choose the product this batch makes.', tab: 'output' };
    if (!form.outputQty || Number(form.outputQty) <= 0)
      return { message: 'Enter the good output quantity.', tab: 'output' };
    if (!form.inputs.length) return { message: 'Add at least one input.', tab: 'inputs' };
    return null;
  };

  const save = () => {
    const problem = validate();
    if (problem) {
      setTab(problem.tab);
      return toast.error(problem.message);
    }
    setSaving(true);
    const payload = buildPayload();
    const done = (response: any) => {
      setSaving(false);
      if (response?.success) {
        toast.success(response?.message || 'Saved');
        const newId = response?.data?.data?.id ?? response?.data?.id;
        resetForm();
        if (!editing && newId) {
          toast.info('Saved as a draft — press Post to move the stock.');
        }
        dispatch(getProductionBatches({}));
      } else {
        toast.error(response?.message || 'Could not save the batch');
      }
    };
    dispatch((editing ? updateProduction(payload, done) : storeProduction(payload, done)) as any);
  };

  const openBatch = (id: number) => {
    dispatch(
      getProductionDetails({ id, callback: (response: any) => {
        if (!response?.success) return toast.error(response?.message || 'Could not open the batch');
        const m = response.data?.master ?? {};
        const inputs: any[] = response.data?.inputs ?? [];
        const allocations: any[] = response.data?.allocations ?? [];
        const allocMap: Record<string, string> = {};
        allocations.forEach((a) => {
          allocMap[String(a.source_acc_detail_id)] = String(Number(a.allocated_amount));
        });
        setForm({
          productionDate: m.production_date || today(),
          batchRef: m.batch_ref || '',
          notes: m.notes || '',
          outputProductId: m.output_product_id ? String(m.output_product_id) : '',
          outputProductName: m.output_product || '',
          outputGodownId: m.output_godown_id ? String(m.output_godown_id) : '',
          outputQty: m.output_qty ? String(Number(m.output_qty)) : '',
          inputs: inputs.map((i, index) => ({
            id: Date.now() + index,
            productId: String(i.product_id),
            productName: i.product_name || '',
            unit: i.unit || '',
            godownId: i.godown_id ? String(i.godown_id) : '',
            qty: String(Number(i.base_qty)),
          })),
          lossActual: m.loss_actual ? String(Number(m.loss_actual)) : '',
          lossTolerance: m.normal_tolerance_pct ? String(Number(m.normal_tolerance_pct)) : '',
          lossBasis: m.loss_basis || 'kg',
          lossReason: m.loss_reason || '',
          allocations: allocMap,
        });
        setEditing({ id: Number(m.id), batchRef: m.batch_ref || '' });
        setTab('output');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } }) as any,
    );
  };

  const post = (id: number) => {
    dispatch(
      postProduction(id, {}, (response: any) => {
        if (response?.success) {
          toast.success(`Posted ${response?.data?.data?.vr_no || ''}`.trim());
          dispatch(getProductionBatches({}));
        } else {
          toast.error(response?.message || 'Could not post the batch');
        }
      }) as any,
    );
  };

  const reverse = (id: number) => {
    if (!window.confirm('Reverse this batch? The inputs go back on the shelf and the output comes off.')) return;
    dispatch(
      reverseProduction(id, {}, (response: any) => {
        if (response?.success) {
          toast.success('Reversed');
          dispatch(getProductionBatches({}));
        } else {
          toast.error(response?.message || 'Could not reverse the batch');
        }
      }) as any,
    );
  };

  const removeDraft = (id: number) => {
    if (!window.confirm('Delete this draft?')) return;
    dispatch(destroyProduction(id, {}, (response: any) => {
      if (response?.success) {
        toast.success('Draft deleted');
        dispatch(getProductionBatches({}));
      } else {
        toast.error(response?.message || 'Could not delete the draft');
      }
    }) as any);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300',
      posted: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
      reversed: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    };
    return `inline-block rounded px-2 py-0.5 text-xs font-medium ${map[status] || ''}`;
  };

  const allocationCount = Object.values(form.allocations).filter((v) => Number(v) > 0).length;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'output', label: 'Output' },
    { key: 'inputs', label: `Inputs (${form.inputs.length})` },
    { key: 'costs', label: `Wastage & Expense${allocationCount ? ` (${allocationCount})` : ''}` },
    { key: 'batches', label: `Recent batches (${batches.length})` },
  ];

  return (
    <div>
      <HelmetTitle title="Production Entry" />

      {editing && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-300">
          <span>
            Editing draft <strong>{editing.batchRef || `#${editing.id}`}</strong>
          </span>
          <button type="button" onClick={resetForm} className="font-medium underline">
            Cancel edit
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <InputElement
          id="productionDate"
          name="productionDate"
          type="date"
          label="Production Date"
          value={form.productionDate}
          onChange={(e: any) => setField('productionDate', e.target.value)}
          className="w-full"
        />
        <InputElement
          id="batchRef"
          name="batchRef"
          label="Batch Ref"
          placeholder="e.g. B-2611-01"
          value={form.batchRef}
          onChange={(e: any) => setField('batchRef', e.target.value)}
          className="w-full"
        />
        <InputElement
          id="notes"
          name="notes"
          label="Note"
          placeholder="Anything worth writing down"
          value={form.notes}
          onChange={(e: any) => setField('notes', e.target.value)}
          className="w-full"
        />
      </div>

      <div role="tablist" className="mb-3 flex flex-wrap gap-1 rounded border border-[rgb(var(--c-border))] bg-slate-50 p-1 dark:bg-boxdark">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`rounded px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-blue-50 text-blue-600 dark:bg-slate-700/60 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-700/40 dark:hover:text-blue-400'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ---- Output ---- */}
      {tab === 'output' && (
      <div className="rounded border border-[rgb(var(--c-border))] p-3 mb-3">
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Output
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div className="md:col-span-2">
            <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Product made</label>
            <ProductDropdown
              id="outputProduct"
              name="outputProduct"
              onSelect={(o: Option | null) => {
                setField('outputProductId', o?.value || '');
                setField('outputProductName', o?.label || '');
              }}
              defaultValue={productOption(form.outputProductId, form.outputProductName)}
              value={productOption(form.outputProductId, form.outputProductName)}
            />
          </div>
          <div>
            <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Warehouse</label>
            <WarehouseDropdown
              id="outputGodownId"
              name="outputGodownId"
              className="p-2"
              warehouseDdl={warehouseOptions}
              onChange={(e: any) => setField('outputGodownId', e.target.value)}
              defaultValue={form.outputGodownId}
            />
          </div>
          <InputElement
            id="outputQty"
            name="outputQty"
            type="number"
            step="0.01"
            label="Good output qty"
            value={form.outputQty}
            onChange={(e: any) => setField('outputQty', e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      )}

      {/* ---- Inputs ---- */}
      {tab === 'inputs' && (
      <div className="rounded border border-[rgb(var(--c-border))] p-3 mb-3">
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Inputs (come out of stock at FIFO cost)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="md:col-span-5">
            <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Product</label>
            <ProductDropdown
              id="inputProduct"
              name="inputProduct"
              onSelect={handleLineProduct}
              defaultValue={productOption(line.productId, line.productName)}
              value={productOption(line.productId, line.productName)}
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Warehouse</label>
            <WarehouseDropdown
              id="lineGodown"
              name="lineGodown"
              className="p-2"
              warehouseDdl={warehouseOptions}
              onChange={(e: any) => setLine((p) => ({ ...p, godownId: e.target.value }))}
              defaultValue={line.godownId}
            />
          </div>
          <InputElement
            id="lineQty"
            name="lineQty"
            type="number"
            step="0.01"
            label={`Quantity ${line.unit ? `(${line.unit})` : ''}`}
            value={line.qty}
            onChange={(e: any) => setLine((p) => ({ ...p, qty: e.target.value }))}
            className="w-full md:col-span-2"
          />
          <div className="md:col-span-2">
            <ButtonLoading
              onClick={editingLineId === null ? addLine : updateLine}
              buttonLoading={false}
              label={editingLineId === null ? 'Add' : 'Update'}
              className="whitespace-nowrap text-center mr-0 py-2"
              icon={
                editingLineId === null ? (
                  <FiPlus className="text-lg ml-2 mr-2" />
                ) : (
                  <FiEdit2 className="text-lg ml-2 mr-2" />
                )
              }
            />
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
              <tr>
                <th className="px-2 py-2 text-center">Sl</th>
                <th className="px-2 py-2">Product</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2 text-right">On hand</th>
                <th className="px-2 py-2 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {form.inputs.map((row, index) => {
                const onHand = stock[row.productId];
                const short = onHand !== undefined && Number(row.qty) > Number(onHand);
                return (
                  <tr key={row.id} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                    <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">{index + 1}</td>
                    <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.productName}</td>
                    <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                      {thousandSeparator(Number(row.qty))} {row.unit}
                    </td>
                    <td className={`px-2 py-2 text-right ${short ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-900 dark:text-[rgb(var(--c-text))]'}`}>
                      {onHand === undefined ? '-' : thousandSeparator(Number(onHand))}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">
                      <Button onClick={() => deleteLine(row.id)} className="text-red-500 ml-2 text-center">
                        <FiTrash2 className="cursor-pointer text-center" />
                      </Button>
                      <Button onClick={() => editLine(row.id)} className="text-green-500 ml-2 text-center">
                        <FiEdit2 className="cursor-pointer text-center" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {form.inputs.length === 0 && (
                <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                  <td colSpan={5} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                    No input added
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ---- Loss & allocations ---- */}
      {tab === 'costs' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="rounded border border-[rgb(var(--c-border))] p-3">
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Wastage
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <InputElement
              id="lossActual"
              name="lossActual"
              type="number"
              step="0.001"
              label="Actual loss"
              value={form.lossActual}
              onChange={(e: any) => setField('lossActual', e.target.value)}
              className="w-full"
            />
            <InputElement
              id="lossBasis"
              name="lossBasis"
              label="Basis"
              value={form.lossBasis}
              onChange={(e: any) => setField('lossBasis', e.target.value)}
              className="w-full"
            />
            <InputField
              id="lossTolerance"
              label="Normal tolerance %"
              value={form.lossTolerance}
              onChange={(v) => setField('lossTolerance', v)}
            />
            <InputElement
              id="lossReason"
              name="lossReason"
              label="Reason (if abnormal)"
              value={form.lossReason}
              onChange={(e: any) => setField('lossReason', e.target.value)}
              className="w-full"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Loss up to the tolerance stays in the output cost; anything beyond it is abnormal, needs a
            reason, and is excluded from the output cost.
          </p>
        </div>

        <div className="rounded border border-[rgb(var(--c-border))] p-3">
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Allocated expense (from posted vouchers)
          </h4>
          {allocatable.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No posted Factory Labour / Packing / Transport expense in this month. Enter the cost with a
              Journal or Payment voucher first, then pick its line here.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
                  <tr>
                    <th className="px-2 py-1">Voucher</th>
                    <th className="px-2 py-1">Head</th>
                    <th className="px-2 py-1 text-right">Free</th>
                    <th className="px-2 py-1 text-right w-28">Allocate</th>
                  </tr>
                </thead>
                <tbody>
                  {allocatable.map((a) => (
                    <tr key={a.source_acc_detail_id} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                      <td className="px-2 py-1 text-gray-900 dark:text-[rgb(var(--c-text))]">{a.voucher_no}</td>
                      <td className="px-2 py-1 text-gray-900 dark:text-[rgb(var(--c-text))]">{a.head_name}</td>
                      <td className="px-2 py-1 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                        {thousandSeparator(Number(a.remaining))}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={Number(a.remaining)}
                          value={form.allocations[a.source_acc_detail_id] ?? ''}
                          onChange={(e) =>
                            setField('allocations', { ...form.allocations, [a.source_acc_detail_id]: e.target.value })
                          }
                          className="w-24 rounded border border-[rgb(var(--c-border))] bg-transparent px-1 py-0.5 text-right text-gray-900 dark:text-[rgb(var(--c-text))]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-right text-sm text-gray-900 dark:text-[rgb(var(--c-text))]">
            Allocated total: <strong>{thousandSeparator(allocationTotal, 2)}</strong>
          </p>
        </div>
      </div>
      )}

      {/* Save sits outside the tabs, so a batch can be saved from any of the
          three entry tabs; the register has nothing of its own to save. */}
      {tab !== 'batches' && (
      <div className="flex flex-wrap gap-2 mb-5">
        <ButtonLoading
          onClick={save}
          buttonLoading={saving}
          label={editing ? 'Update Draft' : 'Save Draft'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSave className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={resetForm}
          buttonLoading={false}
          label="Reset"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />
      </div>
      )}

      {/* ---- The register ---- */}
      {tab === 'batches' && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
            <tr>
              <th className="px-2 py-2">Batch</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Output</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Unit cost</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2 text-center w-40">Action</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((row) => (
              <tr key={row.id} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.batch_ref || `#${row.id}`}
                  {row.vr_no ? <span className="ml-1 text-xs text-gray-400">({row.vr_no})</span> : null}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.production_date}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.output_product}</td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.output_qty), 2)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.unit_cost), 2)}
                </td>
                <td className="px-2 py-2">
                  <span className={statusBadge(row.status)}>{row.status}</span>
                </td>
                <td className="px-2 py-2 text-center">
                  {row.status === 'draft' && (
                    <>
                      <Button onClick={() => post(row.id)} className="text-green-600 ml-1 text-center" title="Post">
                        <FiCheckCircle className="cursor-pointer text-center" />
                      </Button>
                      <Button onClick={() => openBatch(row.id)} className="text-blue-600 ml-1 text-center" title="Edit draft">
                        <FiEdit2 className="cursor-pointer text-center" />
                      </Button>
                      <Button onClick={() => removeDraft(row.id)} className="text-red-500 ml-1 text-center" title="Delete draft">
                        <FiTrash2 className="cursor-pointer text-center" />
                      </Button>
                    </>
                  )}
                  {row.status === 'posted' && (
                    <Button onClick={() => reverse(row.id)} className="text-amber-600 ml-1 text-center" title="Reverse">
                      <FiRotateCcw className="cursor-pointer text-center" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td colSpan={7} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  No batch yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

// A small labelled number box that reports its own value up, for the few fields
// that are not InputElement-shaped.
const InputField = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </label>
    <input
      id={id}
      type="number"
      step="0.01"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-[rgb(var(--c-border))] bg-transparent p-2 text-sm text-gray-900 dark:text-[rgb(var(--c-text))]"
    />
  </div>
);

export default ProductionEntry;
