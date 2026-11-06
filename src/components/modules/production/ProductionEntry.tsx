import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2, FiCheckCircle, FiRotateCcw, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
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
import { getProductionRecipe, getProductionRecipes } from './productionRecipeSlice';

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

// One product the batch makes. `price` is the product's sales price, which the
// batch cost is split by; `share` is a typed override ('' = work it out).
type OutputLine = InputLine & { price: string; share: string; expiry: string };

const emptyOutput = { ...emptyInput, price: '', share: '', expiry: '' };

// What the chosen recipe expects, kept apart from the typed rows: the clerk may
// change or delete an input line, and the comparison must still say what the
// recipe wanted. baseQty is per the recipe's own yield; the target scales it.
type RecipeLineLocal = {
  productId: string;
  productName: string;
  unit: string;
  baseQty: number;
};

type RecipeCheck = {
  id: string;
  name: string;
  version: string;
  yieldQty: number;
  outputProductId: string;
  outputProductName: string;
  unit: string;
  salesPrice: string;
  lossBasis: string;
  lossTolerancePct: number;
  // The make quantity the inputs were last filled for. A changed Make has to be
  // applied with Fill, or the server would snapshot a target the rows do not
  // match.
  filledQty: number;
  lines: RecipeLineLocal[];
};

type Tab = 'output' | 'inputs' | 'costs' | 'batches';

const today = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

// The shared picker works in Date objects; the form and the API keep the
// ISO yyyy-mm-dd string. Parse/build in local time so a timezone west of UTC
// never turns 2026-11-06 into the 5th.
const dateFromIso = (value: string | null | undefined): Date | null => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const isoFromDate = (date: Date | null): string => {
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

// The row keeps ISO for the payload; the table reads it the way every other
// date in the app reads.
const displayDate = (value: string | null | undefined): string => {
  const date = dateFromIso(value);
  if (!date) return '—';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

/**
 * Production Entry: a batch of raw materials turned into one or more finished
 * products. With several, the batch cost is split by sales value (qty x sales
 * price) unless the shares are typed (owner, 5 Nov 2026).
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
  const [tab, setTab] = useState<Tab>('inputs');
  const [line, setLine] = useState({ ...emptyInput });
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [outLine, setOutLine] = useState({ ...emptyOutput });
  const [editingOutId, setEditingOutId] = useState<number | null>(null);
  const [allocatable, setAllocatable] = useState<any[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [recipes, setRecipes] = useState<any[]>([]);
  const [recipeCheck, setRecipeCheck] = useState<RecipeCheck | null>(null);

  const [form, setForm] = useState({
    productionDate: today(),
    batchRef: '',
    notes: '',
    outputs: [] as OutputLine[],
    inputs: [] as InputLine[],
    lossActual: '',
    lossTolerance: '',
    lossBasis: 'kg',
    lossReason: '',
    allocations: {} as Record<string, string>,
    recipeId: '',
    recipeQty: '',
    recipeName: '',
    recipeVersion: '',
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

  // The recipe versions in force on the batch date. Re-read with the date, the
  // same way the expense picker is: a version dated later is not offered.
  useEffect(() => {
    dispatch(getProductionRecipes({ date: form.productionDate })).then((action: any) =>
      setRecipes(Array.isArray(action?.payload) ? action.payload : []),
    );
  }, [dispatch, form.productionDate]);

  // What the branch holds of each input, at the batch date. The recipe's own
  // materials are included even before their lines are applied, so the check
  // table can name a shortage the clerk has not added yet.
  const inputProductIds = [
    ...new Set([
      ...form.inputs.map((i) => i.productId).filter(Boolean),
      ...(recipeCheck?.lines.map((l) => l.productId) ?? []),
    ]),
  ].join(',');
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
      outputs: [],
      inputs: [],
      lossActual: '',
      lossTolerance: '',
      lossBasis: 'kg',
      lossReason: '',
      allocations: {},
      recipeId: '',
      recipeQty: '',
      recipeName: '',
      recipeVersion: '',
    });
    setLine({ ...emptyInput });
    setEditingLineId(null);
    setOutLine({ ...emptyOutput });
    setEditingOutId(null);
    setRecipeCheck(null);
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

  const round2 = (value: number) => Math.round(value * 100) / 100;

  // Fill the batch from a recipe. The inputs are replaced (a recipe is the
  // material set), the recipe's own output row is added or updated at the target,
  // and the tolerance comes across. Every row stays editable, and any other
  // output the batch makes is left alone.
  const applyRecipe = (meta: any, lines: any[], targetQty: number) => {
    const yieldQty = Number(meta.yield_qty) || 0;

    if (yieldQty <= 0) {
      toast.error('This recipe has no yield, so its quantities cannot be scaled.');
      return;
    }

    const target = Number(targetQty) > 0 ? round2(Number(targetQty)) : round2(yieldQty);
    const factor = target / yieldQty;
    const now = Date.now();
    const recipeProductId = String(meta.output_product_id || '');

    setForm((prev) => {
      const existing = prev.outputs.find((o) => o.productId === recipeProductId);
      const outputs: OutputLine[] = existing
        ? prev.outputs.map((o) => (o.productId === recipeProductId ? { ...o, qty: String(target) } : o))
        : [
            ...prev.outputs,
            {
              ...emptyOutput,
              id: now + 500,
              productId: recipeProductId,
              productName: meta.output_product_name || '',
              unit: meta.unit || '',
              godownId: prev.outputs[0]?.godownId || '',
              qty: String(target),
              price: meta.sales_price != null ? String(Number(meta.sales_price)) : '',
            },
          ];

      const godownId = outputs[0]?.godownId || '';

      return {
        ...prev,
        recipeId: String(meta.id),
        recipeQty: String(target),
        recipeName: meta.name || '',
        recipeVersion: meta.version != null ? String(meta.version) : '',
        lossTolerance: String(Number(meta.loss_tolerance_pct) || 0),
        lossBasis: meta.loss_basis || prev.lossBasis,
        inputs: lines.map((row, index) => ({
          id: now + index,
          productId: String(row.product_id),
          productName: row.product_name || '',
          unit: row.unit || '',
          godownId,
          qty: String(round2(Number(row.base_qty) * factor)),
        })),
        outputs,
      };
    });

    setRecipeCheck({
      id: String(meta.id),
      name: meta.name || '',
      version: meta.version != null ? String(meta.version) : '',
      yieldQty,
      outputProductId: recipeProductId,
      outputProductName: meta.output_product_name || '',
      unit: meta.unit || '',
      salesPrice: meta.sales_price != null ? String(Number(meta.sales_price)) : '',
      lossBasis: meta.loss_basis || '',
      lossTolerancePct: Number(meta.loss_tolerance_pct) || 0,
      filledQty: target,
      lines: lines.map((row) => ({
        productId: String(row.product_id),
        productName: row.product_name || '',
        unit: row.unit || '',
        baseQty: Number(row.base_qty),
      })),
    });
  };

  const chooseRecipe = (id: string) => {
    if (!id) {
      setRecipeCheck(null);
      setForm((p) => ({ ...p, recipeId: '', recipeQty: '', recipeName: '', recipeVersion: '' }));
      return;
    }

    dispatch(
      getProductionRecipe({
        id,
        callback: (response: any) => {
          if (!response?.success) {
            toast.error(response?.message || 'Could not open the recipe');
            return;
          }

          const recipe = response.data?.recipe ?? {};
          const lines: any[] = Array.isArray(response.data?.lines) ? response.data.lines : [];

          applyRecipe(recipe, lines, Number(recipe.yield_qty));
          toast.success(`Filled from ${recipe.name} v${recipe.version}. Change anything you need.`);
        },
      }) as any,
    );
  };

  // Re-apply the same recipe at the make quantity on the form. Uses what was
  // filled, not the recipe as it stands now -- a saved batch keeps its snapshot.
  const refillRecipe = () => {
    if (!recipeCheck) {
      toast.error('Choose a recipe first, then press Fill.');
      return;
    }

    applyRecipe(
      {
        id: recipeCheck.id,
        name: recipeCheck.name,
        version: recipeCheck.version,
        yield_qty: recipeCheck.yieldQty,
        output_product_id: recipeCheck.outputProductId,
        output_product_name: recipeCheck.outputProductName,
        unit: recipeCheck.unit,
        sales_price: recipeCheck.salesPrice,
        loss_basis: recipeCheck.lossBasis,
        loss_tolerance_pct: recipeCheck.lossTolerancePct,
      },
      recipeCheck.lines.map((row) => ({
        product_id: row.productId,
        product_name: row.productName,
        unit: row.unit,
        base_qty: row.baseQty,
      })),
      Number(form.recipeQty),
    );
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
          godownId: line.godownId || p.outputs[0]?.godownId || '',
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

  // ---- Outputs: the products the batch makes ----

  const handleOutProduct = (option: any) =>
    setOutLine((p) => ({
      ...p,
      productId: option?.value || '',
      productName: option?.label || '',
      unit: option?.label_5 || '',
      price: option?.label_4 != null ? String(option.label_4) : '',
    }));

  const saveOut = () => {
    if (!outLine.productId) return toast.error('Pick the product made');
    if (!outLine.qty || Number(outLine.qty) <= 0) return toast.error('Enter the good output quantity');
    if (outLine.expiry && form.productionDate && outLine.expiry < form.productionDate)
      return toast.error("The expiry date cannot be before the production date");
    if (form.outputs.some((o) => o.productId === outLine.productId && o.id !== editingOutId))
      return toast.error('This product is already an output');
    setForm((p) => ({
      ...p,
      outputs:
        editingOutId === null
          ? [...p.outputs, { ...outLine, id: Date.now() }]
          : p.outputs.map((o) => (o.id === editingOutId ? { ...outLine, id: o.id } : o)),
    }));
    setOutLine({ ...emptyOutput });
    setEditingOutId(null);
  };

  const editOut = (id: number) => {
    const found = form.outputs.find((o) => o.id === id);
    if (!found) return;
    setOutLine({ ...found });
    setEditingOutId(id);
  };

  const deleteOut = (id: number) => {
    setForm((p) => ({ ...p, outputs: p.outputs.filter((o) => o.id !== id) }));
    if (editingOutId === id) {
      setOutLine({ ...emptyOutput });
      setEditingOutId(null);
    }
  };

  // The batch cost is split by sales value: qty x sales price (owner, 5 Nov
  // 2026). This is the share the server will work out; a typed share replaces
  // it, and once one is typed every output carries one, adding to 100.
  const autoShares = useMemo(() => {
    const weights = form.outputs.map((o) => Number(o.qty) * Number(o.price) || 0);
    const sum = weights.reduce((s, w) => s + w, 0);
    return weights.map((w) => (sum > 0 ? (w / sum) * 100 : 0));
  }, [form.outputs]);
  const sharesTyped = form.outputs.some((o) => o.share !== '');
  const shareTotal = sharesTyped ? form.outputs.reduce((s, o) => s + (Number(o.share) || 0), 0) : 100;

  const setShare = (id: number, value: string) =>
    setForm((p) => ({
      ...p,
      outputs: p.outputs.map((o, i) =>
        o.id === id ? { ...o, share: value } : { ...o, share: o.share !== '' ? o.share : autoShares[i].toFixed(2) },
      ),
    }));

  const clearShares = () => setForm((p) => ({ ...p, outputs: p.outputs.map((o) => ({ ...o, share: '' })) }));

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
    // The recipe the batch was filled from, and the make quantity. The server
    // freezes both in its own snapshot; a batch entered by hand sends null.
    recipe_id: form.recipeId ? Number(form.recipeId) : null,
    recipe_qty: form.recipeQty ? Number(form.recipeQty) : null,
    outputs: form.outputs.map((o) => ({
      product_id: Number(o.productId),
      godown_id: o.godownId ? Number(o.godownId) : null,
      qty: Number(o.qty),
      share_pct: sharesTyped && form.outputs.length > 1 ? Number(o.share) || 0 : null,
      expiry_date: o.expiry || null,
    })),
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
    if (!form.outputs.length) return { message: 'Add the product this batch makes.', tab: 'output' };
    if (form.outputs.length > 1 && sharesTyped && Math.abs(shareTotal - 100) > 0.01)
      return { message: `The cost shares add up to ${shareTotal.toFixed(2)}%, not 100%.`, tab: 'output' };
    if (form.outputs.length > 1 && !sharesTyped && form.outputs.some((o) => !(Number(o.price) > 0)))
      return { message: 'An output has no sales price, so its cost share cannot be worked out. Type the shares.', tab: 'output' };
    if (form.productionDate && form.outputs.some((o) => o.expiry && o.expiry < form.productionDate))
      return { message: 'An output expiry date is before the production date.', tab: 'output' };
    if (!form.inputs.length) return { message: 'Add at least one input.', tab: 'inputs' };
    return null;
  };

  const save = () => {
    if (recipeQtyChanged) {
      setTab('inputs');
      return toast.error('The make quantity changed. Press Fill to apply it before saving.');
    }

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
        const outputs: any[] = response.data?.outputs ?? [];
        const allocations: any[] = response.data?.allocations ?? [];
        const snapshot = response.data?.recipe ?? null;
        const typed = outputs.length > 1 && outputs.every((o) => o.cost_share_pct != null);
        const allocMap: Record<string, string> = {};
        allocations.forEach((a) => {
          allocMap[String(a.source_acc_detail_id)] = String(Number(a.allocated_amount));
        });
        setForm({
          productionDate: m.production_date || today(),
          batchRef: m.batch_ref || '',
          notes: m.notes || '',
          outputs: outputs.map((o, index) => ({
            id: Date.now() + 1000 + index,
            productId: String(o.product_id),
            productName: o.product_name || '',
            unit: o.unit || '',
            godownId: o.godown_id ? String(o.godown_id) : '',
            qty: String(Number(o.qty)),
            price: o.sales_price != null ? String(Number(o.sales_price)) : '',
            share: typed ? String(Number(o.cost_share_pct)) : '',
            expiry: o.expiry_date ? String(o.expiry_date).slice(0, 10) : '',
          })),
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
          recipeId: snapshot?.recipe_id ? String(snapshot.recipe_id) : m.recipe_id ? String(m.recipe_id) : '',
          recipeQty: m.recipe_qty != null ? String(Number(m.recipe_qty)) : snapshot?.target_qty ? String(Number(snapshot.target_qty)) : '',
          recipeName: snapshot?.name || '',
          recipeVersion: snapshot?.version != null ? String(snapshot.version) : '',
        });

        // The check table comes from the frozen snapshot, not the recipe as it
        // stands today -- that is what the batch was saved against.
        if (snapshot) {
          const factor = Number(snapshot.factor) || 1;
          const output = outputs.find((o) => String(o.product_id) === String(snapshot.output_product_id));

          setRecipeCheck({
            id: String(snapshot.recipe_id),
            name: snapshot.name || '',
            version: snapshot.version != null ? String(snapshot.version) : '',
            yieldQty: Number(snapshot.yield_qty) || 0,
            outputProductId: snapshot.output_product_id ? String(snapshot.output_product_id) : '',
            outputProductName: output?.product_name || '',
            unit: output?.unit || '',
            salesPrice: output?.sales_price != null ? String(Number(output.sales_price)) : '',
            lossBasis: snapshot.loss_basis || '',
            lossTolerancePct: Number(snapshot.loss_tolerance_pct) || 0,
            // A reopened draft is filled for the quantity it was saved with, so
            // it is not stale on open.
            filledQty: Number(m.recipe_qty ?? snapshot.target_qty ?? 0),
            lines: (snapshot.lines ?? []).map((row: any) => ({
              productId: String(row.product_id),
              productName: row.product_name || '',
              unit: row.unit || '',
              // expected_qty is at the snapshot's target; divide out the factor
              // so a re-fill at another target scales from the per-yield figure.
              baseQty: factor > 0 ? Number(row.expected_qty) / factor : Number(row.expected_qty),
            })),
          });
        } else {
          setRecipeCheck(null);
        }

        setEditing({ id: Number(m.id), batchRef: m.batch_ref || '' });
        setTab('inputs');
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
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  // The batch reads as the work does: materials go in, some is lost and labour
  // is spent, products come out. The three steps are that sequence; each one
  // carries a running summary so the whole batch can be read without opening
  // them. The register sits apart -- it is the list, not a step.
  const steps: { key: Tab; title: string; summary: string; filled: boolean }[] = [
    {
      key: 'inputs',
      title: 'Materials in',
      summary: form.inputs.length ? plural(form.inputs.length, 'material', 'materials') : 'Nothing added yet',
      filled: form.inputs.length > 0,
    },
    {
      key: 'costs',
      title: 'Waste and labour',
      summary:
        [
          allocationTotal > 0 ? `${thousandSeparator(allocationTotal)} expense` : '',
          Number(form.lossActual) > 0 ? `${form.lossActual} ${form.lossBasis} lost` : '',
        ]
          .filter(Boolean)
          .join(', ') || 'No expense or loss',
      filled: allocationCount > 0 || Number(form.lossActual) > 0,
    },
    {
      key: 'output',
      title: 'Products out',
      summary: form.outputs.length ? plural(form.outputs.length, 'product', 'products') : 'Nothing added yet',
      filled: form.outputs.length > 0,
    },
  ];

  const th = 'px-3 py-2 font-medium';
  const td = 'px-3 py-2 text-[rgb(var(--c-text))]';
  const rowCls = 'border-t border-[rgb(var(--c-border))] bg-[rgb(var(--c-table-body))]';
  const headCls = 'bg-[rgb(var(--c-table-head))] text-xs text-[rgb(var(--c-text))]';
  const iconBtn = 'rounded p-1.5 transition hover:bg-[rgb(var(--c-page))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--c-primary))]';

  const panel = (title: string, hint: string, children: React.ReactNode) => (
    <section className="mb-4 rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4">
      <h2 className="text-base font-semibold text-[rgb(var(--c-text))]">{title}</h2>
      <p className="mb-3 mt-0.5 text-sm text-[rgb(var(--c-text-muted))]">{hint}</p>
      {children}
    </section>
  );

  const emptyRow = (cols: number, text: string) => (
    <tr className={rowCls}>
      <td colSpan={cols} className="px-3 py-6 text-center text-sm text-[rgb(var(--c-text-muted))]">
        {text}
      </td>
    </tr>
  );

  const rowActions = (onEdit: () => void, onDelete: () => void) => (
    <div className="flex justify-end gap-1">
      <button type="button" onClick={onEdit} className={`${iconBtn} text-[rgb(var(--c-primary))]`} aria-label="Edit row" title="Edit">
        <FiEdit2 />
      </button>
      <button type="button" onClick={onDelete} className={`${iconBtn} text-[rgb(var(--c-danger))]`} aria-label="Remove row" title="Remove">
        <FiTrash2 />
      </button>
    </div>
  );

  const addButton = (onClick: () => void, editingRow: boolean) => (
    <ButtonLoading
      onClick={onClick}
      buttonLoading={false}
      label={editingRow ? 'Update' : 'Add'}
      className="w-full whitespace-nowrap text-center mr-0 py-2"
      icon={editingRow ? <FiEdit2 className="text-lg ml-2 mr-2" /> : <FiPlus className="text-lg ml-2 mr-2" />}
    />
  );

  // A reopened draft may name a recipe the picker no longer offers (retired, or
  // no longer in force on the date). Keep it visible rather than silently drop.
  const recipeOptions = [...recipes];

  if (form.recipeId && !recipeOptions.some((r) => String(r.id) === form.recipeId)) {
    recipeOptions.unshift({
      id: form.recipeId,
      name: form.recipeName || `Recipe #${form.recipeId}`,
      version: form.recipeVersion,
      output_product: '',
    });
  }

  // What the recipe needs at the make quantity on the form.
  const recipeFactor =
    recipeCheck && recipeCheck.yieldQty > 0
      ? (Number(form.recipeQty) > 0 ? Number(form.recipeQty) : recipeCheck.yieldQty) / recipeCheck.yieldQty
      : 0;

  // The Make box no longer matches the quantity the rows were filled for. The
  // save is held back until Fill applies it -- otherwise the server would freeze
  // a target the inputs were never scaled to.
  const recipeQtyChanged =
    !!recipeCheck &&
    Math.abs(
      (Number(form.recipeQty) > 0 ? Number(form.recipeQty) : recipeCheck.yieldQty) - recipeCheck.filledQty,
    ) > 0.005;

  return (
    <div className="pb-6">
      <HelmetTitle title="Production Entry" />

      {/* ---- The batch ---- */}
      <section className="mb-4 rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-[rgb(var(--c-text))]">Production Entry</h1>
          {editing ? (
            <span className="flex items-center gap-3 rounded-full bg-[rgb(var(--c-warning)/0.15)] px-3 py-1 text-sm text-[rgb(var(--c-text))]">
              Editing draft <strong>{editing.batchRef || `#${editing.id}`}</strong>
              <button type="button" onClick={resetForm} className="font-medium text-[rgb(var(--c-primary))] underline">
                Cancel
              </button>
            </span>
          ) : (
            <span className="rounded-full bg-[rgb(var(--c-primary)/0.1)] px-3 py-1 text-sm font-medium text-[rgb(var(--c-primary))]">
              New batch
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <InputDatePicker
            id="productionDate"
            name="productionDate"
            label="Production date"
            selectedDate={dateFromIso(form.productionDate)}
            setSelectedDate={(date) => setField('productionDate', isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
          <InputElement
            id="batchRef"
            name="batchRef"
            label="Batch ref"
            placeholder="Left blank, the voucher number is used"
            value={form.batchRef}
            onChange={(e: any) => setField('batchRef', e.target.value)}
            className="w-full"
          />
          <div className="md:col-span-2">
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
        </div>

        {/* A recipe fills the batch: materials, tolerance and its own output.
            Everything stays editable, and other outputs are left alone. */}
        <div className="mt-3 grid grid-cols-1 items-end gap-3 border-t border-[rgb(var(--c-border))] pt-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-sm text-[rgb(var(--c-text))]">Recipe (optional)</label>
            <select
              id="recipeId"
              name="recipeId"
              value={form.recipeId}
              onChange={(event) => chooseRecipe(event.target.value)}
              className="h-9.5 w-full rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-2 text-sm text-[rgb(var(--c-text))]"
            >
              <option value="">Enter by hand</option>
              {recipeOptions.map((recipe: any) => (
                <option key={String(recipe.id)} value={String(recipe.id)}>
                  {recipe.name}
                  {recipe.version ? ` v${recipe.version}` : ''}
                  {recipe.output_product ? ` — ${recipe.output_product}` : ''}
                </option>
              ))}
            </select>
          </div>
          <InputElement
            id="recipeQty"
            name="recipeQty"
            type="number"
            step="0.01"
            label="Make"
            placeholder="The recipe's own yield"
            value={form.recipeQty}
            onChange={(e: any) => setField('recipeQty', e.target.value)}
            className="w-full"
          />
          <div className="flex gap-2">
            <ButtonLoading
              onClick={refillRecipe}
              buttonLoading={false}
              label="Fill"
              className="w-full whitespace-nowrap text-center mr-0 py-2"
              icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
            />
            {form.recipeId ? (
              <ButtonLoading
                onClick={() => chooseRecipe('')}
                buttonLoading={false}
                label="Clear"
                className="w-full whitespace-nowrap text-center mr-0 py-2"
                icon={<FiTrash2 className="text-lg ml-2 mr-2" />}
              />
            ) : null}
          </div>
        </div>
        {recipeCheck ? (
          <p className="mt-2 text-sm text-[rgb(var(--c-text-muted))]">
            Filled from <strong className="text-[rgb(var(--c-text))]">{recipeCheck.name}</strong>
            {recipeCheck.version ? ` v${recipeCheck.version}` : ''} — the batch is still yours to change.
          </p>
        ) : null}
        {recipeQtyChanged ? (
          <p role="alert" className="mt-2 text-sm font-medium text-[rgb(var(--c-danger))]">
            The make quantity changed. Press <strong>Fill</strong> to apply it before saving.
          </p>
        ) : null}
      </section>

      {/* ---- The flow: materials in, waste and labour, products out ---- */}
      <nav role="tablist" aria-label="Batch steps" className="mb-4 flex flex-wrap items-stretch gap-2">
        {steps.map((s, i) => {
          const active = tab === s.key;
          return (
            <React.Fragment key={s.key}>
              {i > 0 && (
                <FiChevronRight aria-hidden className="hidden self-center text-xl text-[rgb(var(--c-text-muted))] md:block" />
              )}
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(s.key)}
                className={`flex min-w-[12rem] flex-1 flex-col items-start rounded-md border px-4 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--c-primary))] md:flex-none ${
                  active
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-primary)/0.08)] shadow-[inset_0_-3px_0_rgb(var(--c-primary))]'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] hover:border-[rgb(var(--c-primary)/0.5)]'
                }`}
              >
                <span className={`flex items-center gap-2 text-sm font-semibold ${active ? 'text-[rgb(var(--c-primary))]' : 'text-[rgb(var(--c-text))]'}`}>
                  <span
                    aria-hidden
                    className={`h-2 w-2 rounded-full ${s.filled ? 'bg-[rgb(var(--c-success))]' : 'bg-[rgb(var(--c-border-strong))] ring-1 ring-[rgb(var(--c-text-muted)/0.4)]'}`}
                  />
                  {s.title}
                </span>
                <span className="mt-0.5 text-xs text-[rgb(var(--c-text-muted))]">{s.summary}</span>
              </button>
            </React.Fragment>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'batches'}
          onClick={() => setTab('batches')}
          className={`ml-auto self-center rounded px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--c-primary))] ${
            tab === 'batches'
              ? 'text-[rgb(var(--c-primary))] underline underline-offset-4'
              : 'text-[rgb(var(--c-text-muted))] hover:text-[rgb(var(--c-primary))]'
          }`}
        >
          Recent batches ({batches.length})
        </button>
      </nav>

      {/* ---- Materials in ---- */}
      {tab === 'inputs' &&
        panel(
          'Materials in',
          'Raw materials, bulk packs and empty packets this batch uses. They leave stock at their purchase cost, oldest first.',
          <>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
              <div className="md:col-span-5">
                <label className="text-sm text-[rgb(var(--c-text))]">Material</label>
                <ProductDropdown
                  id="inputProduct"
                  name="inputProduct"
                  onSelect={handleLineProduct}
                  defaultValue={productOption(line.productId, line.productName)}
                  value={productOption(line.productId, line.productName)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-sm text-[rgb(var(--c-text))]">Warehouse</label>
                <WarehouseDropdown
                  id="lineGodown"
                  name="lineGodown"
                  className="p-2"
                  warehouseDdl={warehouseOptions}
                  onChange={(e: any) => setLine((p) => ({ ...p, godownId: e.target.value }))}
                  defaultValue={line.godownId}
                />
              </div>
              <div className="md:col-span-2">
                <InputElement
                  id="lineQty"
                  name="lineQty"
                  type="number"
                  step="0.01"
                  label={`Quantity${line.unit ? ` (${line.unit})` : ''}`}
                  value={line.qty}
                  onChange={(e: any) => setLine((p) => ({ ...p, qty: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div className="md:col-span-2">{addButton(editingLineId === null ? addLine : updateLine, editingLineId !== null)}</div>
            </div>

            <div className="mt-4 overflow-x-auto rounded border border-[rgb(var(--c-border))]">
              <table className="w-full text-left text-sm">
                <thead className={headCls}>
                  <tr>
                    <th className={`${th} w-12`}>#</th>
                    <th className={th}>Material</th>
                    <th className={`${th} text-right`}>Quantity</th>
                    <th className={`${th} text-right`}>In stock on the date</th>
                    <th className={`${th} w-24`} />
                  </tr>
                </thead>
                <tbody>
                  {form.inputs.map((row, index) => {
                    const onHand = stock[row.productId];
                    const short = onHand !== undefined && Number(row.qty) > Number(onHand);
                    return (
                      <tr key={row.id} className={rowCls}>
                        <td className={`${td} text-[rgb(var(--c-text-muted))]`}>{index + 1}</td>
                        <td className={td}>{row.productName}</td>
                        <td className={`${td} text-right tabular-nums`}>
                          {thousandSeparator(Number(row.qty))} {row.unit}
                        </td>
                        <td className={`${td} text-right tabular-nums ${short ? 'font-semibold !text-[rgb(var(--c-danger))]' : ''}`}>
                          {onHand === undefined ? '-' : thousandSeparator(Number(onHand))}
                          {short && <span className="ml-2 text-xs">short</span>}
                        </td>
                        <td className={td}>{rowActions(() => editLine(row.id), () => deleteLine(row.id))}</td>
                      </tr>
                    );
                  })}
                  {form.inputs.length === 0 && emptyRow(5, 'Pick a material above and press Add.')}
                </tbody>
              </table>
            </div>

            {/* Required against what the branch holds, for the recipe as
                chosen -- so a shortage is named even if the clerk has not
                added that material yet. */}
            {recipeCheck ? (
              <div className="mt-4 rounded border border-[rgb(var(--c-border))] p-3">
                <h3 className="text-sm font-semibold text-[rgb(var(--c-text))]">
                  Recipe needs at {thousandSeparator(Number(form.recipeQty) || recipeCheck.yieldQty)}{' '}
                  {recipeCheck.unit}
                </h3>
                <p className="mb-2 mt-0.5 text-xs text-[rgb(var(--c-text-muted))]">
                  Required by {recipeCheck.name}
                  {recipeCheck.version ? ` v${recipeCheck.version}` : ''}, against what the branch holds
                  on {form.productionDate}.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className={headCls}>
                      <tr>
                        <th className={th}>Material</th>
                        <th className={`${th} text-right`}>Recipe needs</th>
                        <th className={`${th} text-right`}>In stock on the date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipeCheck.lines.map((row) => {
                        const required = round2(row.baseQty * recipeFactor);
                        const onHand = stock[row.productId];
                        const short = onHand !== undefined && required > Number(onHand);

                        return (
                          <tr key={row.productId} className={rowCls}>
                            <td className={td}>{row.productName || '-'}</td>
                            <td className={`${td} text-right tabular-nums`}>
                              {thousandSeparator(required)} {row.unit}
                            </td>
                            <td className={`${td} text-right tabular-nums ${short ? 'font-semibold !text-[rgb(var(--c-danger))]' : ''}`}>
                              {onHand === undefined ? '-' : thousandSeparator(Number(onHand))}
                              {short && <span className="ml-2 text-xs">short</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>,
        )}

      {/* ---- Waste and labour ---- */}
      {tab === 'costs' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {panel(
              'Waste',
              'Loss up to the normal tolerance stays in the product cost. Anything beyond it is abnormal, needs a reason, and is left out of the cost.',
              <div className="grid grid-cols-2 gap-3">
                <InputElement
                  id="lossActual"
                  name="lossActual"
                  type="number"
                  step="0.001"
                  label="Lost in this batch"
                  value={form.lossActual}
                  onChange={(e: any) => setField('lossActual', e.target.value)}
                  className="w-full"
                />
                <InputElement
                  id="lossBasis"
                  name="lossBasis"
                  label="Measured in"
                  placeholder="kg"
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
                  label="Reason, if abnormal"
                  value={form.lossReason}
                  onChange={(e: any) => setField('lossReason', e.target.value)}
                  className="w-full"
                />
              </div>,
            )}
          </div>

          <div className="lg:col-span-3">
            {panel(
              'Labour and factory expense',
              'Spend posted Factory Labour, Packing Labour or Factory Transport from this month on this batch.',
              <>
                <div className="max-h-72 overflow-auto rounded border border-[rgb(var(--c-border))]">
                  <table className="w-full text-left text-sm">
                    <thead className={`${headCls} sticky top-0`}>
                      <tr>
                        <th className={th}>Voucher</th>
                        <th className={th}>Expense</th>
                        <th className={`${th} text-right`}>Still free</th>
                        <th className={`${th} w-32 text-right`}>Spend on batch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocatable.map((a) => (
                        <tr key={a.source_acc_detail_id} className={rowCls}>
                          <td className={td}>{a.voucher_no}</td>
                          <td className={td}>{a.head_name}</td>
                          <td className={`${td} text-right tabular-nums`}>{thousandSeparator(Number(a.remaining))}</td>
                          <td className={`${td} text-right`}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={Number(a.remaining)}
                              aria-label={`Spend from ${a.voucher_no}`}
                              value={form.allocations[a.source_acc_detail_id] ?? ''}
                              onChange={(e) =>
                                setField('allocations', { ...form.allocations, [a.source_acc_detail_id]: e.target.value })
                              }
                              className="w-28 rounded border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-right tabular-nums text-[rgb(var(--c-text))] focus:border-[rgb(var(--c-primary))] focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                      {allocatable.length === 0 &&
                        emptyRow(
                          4,
                          'No posted labour or factory expense in this month. Enter it with a Payment Voucher or Journal first, dated in the same month as the batch.',
                        )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-right text-sm text-[rgb(var(--c-text))]">
                  Spent on this batch <strong className="ml-2 tabular-nums">{thousandSeparator(allocationTotal)}</strong>
                </p>
              </>,
            )}
          </div>
        </div>
      )}

      {/* ---- Products out ---- */}
      {tab === 'output' &&
        panel(
          'Products out',
          'What the batch made. With more than one product, the cost is shared by sales value; type a share to set it yourself.',
          <>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className="text-sm text-[rgb(var(--c-text))]">Product made</label>
                <ProductDropdown
                  id="outputProduct"
                  name="outputProduct"
                  onSelect={handleOutProduct}
                  defaultValue={productOption(outLine.productId, outLine.productName)}
                  value={productOption(outLine.productId, outLine.productName)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-[rgb(var(--c-text))]">Warehouse</label>
                <WarehouseDropdown
                  id="outputGodownId"
                  name="outputGodownId"
                  className="p-2"
                  warehouseDdl={warehouseOptions}
                  onChange={(e: any) => setOutLine((p) => ({ ...p, godownId: e.target.value }))}
                  defaultValue={outLine.godownId}
                />
              </div>
              <div className="md:col-span-2">
                <InputElement
                  id="outputQty"
                  name="outputQty"
                  type="number"
                  step="0.01"
                  label={`Good quantity${outLine.unit ? ` (${outLine.unit})` : ''}`}
                  value={outLine.qty}
                  onChange={(e: any) => setOutLine((p) => ({ ...p, qty: e.target.value }))}
                  className="w-full"
                />
              </div>
              <div className="md:col-span-2">
                <InputDatePicker
                  id="outputExpiry"
                  name="outputExpiry"
                  label="Expiry (optional)"
                  selectedDate={dateFromIso(outLine.expiry)}
                  setSelectedDate={(date) => setOutLine((p) => ({ ...p, expiry: isoFromDate(date) }))}
                  setCurrentDate={() => undefined}
                  minDate={dateFromIso(form.productionDate)}
                  isClearable
                  className="w-full"
                />
              </div>
              <div className="md:col-span-2">{addButton(saveOut, editingOutId !== null)}</div>
            </div>

            <div className="mt-4 overflow-x-auto rounded border border-[rgb(var(--c-border))]">
              <table className="w-full text-left text-sm">
                <thead className={headCls}>
                  <tr>
                    <th className={`${th} w-12`}>#</th>
                    <th className={th}>Product</th>
                    <th className={`${th} text-right`}>Good quantity</th>
                    <th className={`${th}`}>Expiry</th>
                    <th className={`${th} text-right`}>Sales price</th>
                    <th className={`${th} w-36 text-right`}>Share of cost %</th>
                    <th className={`${th} w-24`} />
                  </tr>
                </thead>
                <tbody>
                  {form.outputs.map((row, index) => (
                    <tr key={row.id} className={rowCls}>
                      <td className={`${td} text-[rgb(var(--c-text-muted))]`}>{index + 1}</td>
                      <td className={td}>{row.productName}</td>
                      <td className={`${td} text-right tabular-nums`}>
                        {thousandSeparator(Number(row.qty))} {row.unit}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        {row.expiry ? displayDate(row.expiry) : <span className="text-[rgb(var(--c-text-muted))]">—</span>}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {Number(row.price) > 0 ? (
                          thousandSeparator(Number(row.price))
                        ) : (
                          <span className="text-[rgb(var(--c-danger))]">Not set</span>
                        )}
                      </td>
                      <td className={`${td} text-right`}>
                        {form.outputs.length === 1 ? (
                          <span className="tabular-nums">100.00</span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            aria-label={`Share of cost for ${row.productName}`}
                            value={row.share !== '' ? row.share : autoShares[index].toFixed(2)}
                            onChange={(e) => setShare(row.id, e.target.value)}
                            className={`w-24 rounded border bg-transparent px-2 py-1 text-right tabular-nums focus:border-[rgb(var(--c-primary))] focus:outline-none ${
                              row.share !== ''
                                ? 'border-[rgb(var(--c-primary))] font-semibold text-[rgb(var(--c-primary))]'
                                : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-text))]'
                            }`}
                          />
                        )}
                      </td>
                      <td className={td}>{rowActions(() => editOut(row.id), () => deleteOut(row.id))}</td>
                    </tr>
                  ))}
                  {form.outputs.length === 0 && emptyRow(7, 'Pick the product this batch made and press Add. Add more than one if the batch made several.')}
                </tbody>
              </table>
            </div>

            {form.outputs.length > 1 && (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-4 text-sm text-[rgb(var(--c-text))]">
                <span className={Math.abs(shareTotal - 100) > 0.01 ? 'font-semibold text-[rgb(var(--c-danger))]' : ''}>
                  Shares add up to <strong className="tabular-nums">{shareTotal.toFixed(2)}%</strong>
                  <span className="ml-1 text-[rgb(var(--c-text-muted))]">{sharesTyped ? '(typed)' : '(by sales value)'}</span>
                </span>
                {sharesTyped && (
                  <button type="button" onClick={clearShares} className="font-medium text-[rgb(var(--c-primary))] underline">
                    Share by sales value again
                  </button>
                )}
              </div>
            )}
          </>,
        )}

      {/* Save sits under every step, so a batch can be saved from any of
          them; the register has nothing of its own to save. */}
      {tab !== 'batches' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-4 py-3">
          <p className="text-sm text-[rgb(var(--c-text-muted))]">
            A draft moves no stock. Post it from Recent batches when the batch is done.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-[rgb(var(--c-text-muted))] hover:text-[rgb(var(--c-text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--c-primary))]"
            >
              <FiRefreshCcw /> Start over
            </button>
            <ButtonLoading
              onClick={save}
              buttonLoading={saving}
              label={editing ? 'Update draft' : 'Save draft'}
              className="whitespace-nowrap text-center mr-0 py-2"
              icon={<FiSave className="text-lg ml-2 mr-2" />}
            />
          </div>
        </div>
      )}

      {/* ---- The register ---- */}
      {tab === 'batches' &&
        panel(
          'Recent batches',
          'Post a draft to move its stock. A posted batch can be reversed until any of its products is sold or moved.',
          <div className="overflow-x-auto rounded border border-[rgb(var(--c-border))]">
            <table className="w-full text-left text-sm">
              <thead className={headCls}>
                <tr>
                  <th className={th}>Batch</th>
                  <th className={th}>Date</th>
                  <th className={th}>Products</th>
                  <th className={th}>Expiry</th>
                  <th className={`${th} text-right`}>Unit cost</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`} />
                </tr>
              </thead>
              <tbody>
                {batches.map((row) => {
                  const made: any[] = Array.isArray(row.outputs) ? row.outputs : [];
                  return (
                    <tr key={row.id} className={rowCls}>
                      <td className={td}>
                        <span className="font-medium">{row.batch_ref || `#${row.id}`}</span>
                        {row.vr_no && <span className="block text-xs text-[rgb(var(--c-text-muted))]">{row.vr_no}</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{row.production_date}</td>
                      <td className={td}>
                        {made.length
                          ? made.map((o) => (
                              <div key={o.product_id}>
                                {o.product_name}
                                <span className="ml-2 text-[rgb(var(--c-text-muted))] tabular-nums">{thousandSeparator(Number(o.qty))}</span>
                              </div>
                            ))
                          : row.output_product}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        {made.length
                          ? made.map((o) => <div key={o.product_id}>{displayDate(o.expiry_date)}</div>)
                          : '—'}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {made.length > 1
                          ? made.map((o) => <div key={o.product_id}>{thousandSeparator(Number(o.unit_cost))}</div>)
                          : thousandSeparator(Number(row.unit_cost))}
                      </td>
                      <td className={td}>
                        <span className={statusBadge(row.status)}>{row.status}</span>
                      </td>
                      <td className={td}>
                        <div className="flex items-center justify-end gap-1">
                          {row.status === 'draft' && (
                            <>
                              <button
                                type="button"
                                onClick={() => post(row.id)}
                                className="mr-1 flex items-center gap-1.5 rounded bg-[rgb(var(--c-success))] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--c-success))]"
                              >
                                <FiCheckCircle /> Post
                              </button>
                              {rowActions(() => openBatch(row.id), () => removeDraft(row.id))}
                            </>
                          )}
                          {row.status === 'posted' && (
                            <button
                              type="button"
                              onClick={() => reverse(row.id)}
                              className="flex items-center gap-1.5 rounded border border-[rgb(var(--c-border))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-warning))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--c-primary))]"
                            >
                              <FiRotateCcw /> Reverse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {batches.length === 0 && emptyRow(7, 'No batch yet. Save a draft and it appears here.')}
              </tbody>
            </table>
          </div>,
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
