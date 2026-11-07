import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiCopy, FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import ProductDropdown from '../../utils/utils-functions/ProductDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { hasPermission } from '../../utils/permissionChecker';
import {
  destroyProductionRecipe,
  getProductionRecipe,
  getProductionRecipes,
  newProductionRecipeVersion,
  saveProductionRecipe,
} from './productionRecipeSlice';

type Option = { value: string; label: string; label_5?: string };
type LineType = 'material' | 'packaging';

type Line = {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  qty: string;
  lineType: LineType;
  note: string;
};

const today = () => new Date().toISOString().slice(0, 10);

// The shared picker works in Date objects; the form and the API keep the ISO
// string, parsed in local time so a timezone west of UTC never shifts the day.
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

const productOption = (id: string, name: string): Option | null =>
  id ? { value: id, label: name || id } : null;

const emptyForm = {
  id: null as number | null,
  name: '',
  outputProductId: '',
  outputProductName: '',
  unit: '',
  yieldQty: '',
  lossBasis: 'kg',
  lossTolerance: '',
  suggestedCost: '',
  version: '',
  effectiveDate: today(),
  note: '',
};

const emptyLine = {
  productId: '',
  productName: '',
  unit: '',
  qty: '',
  lineType: 'material' as LineType,
  note: '',
};

/**
 * Recipes — the standard materials for one output product.
 *
 * A version is dated and copied forward rather than edited in place when the
 * change is material ("New version"); a correction may be saved on the version
 * itself. Either way a batch that already saved against a version keeps its own
 * snapshot, so nothing here restates a batch already costed.
 *
 * ⚠️ ONE OUTPUT PER RECIPE. A joint batch adds its other outputs by hand on
 * Production Entry; this screen describes the product it names and its
 * materials only.
 */
const Recipe = () => {
  const dispatch = useDispatch<any>();
  const productionRecipe = useSelector((s: any) => s.productionRecipe);
  const productionRecipePermissions = useSelector(
    (s: any) => s.settings?.data?.permissions ?? [],
  );
  // Writing a recipe is production.create; the screen is readable with
  // production.view, so a reader sees the list and the form but cannot save.
  const canCreate = hasPermission(productionRecipePermissions, 'production.create');
  const recipes: any[] = Array.isArray(productionRecipe?.recipes) ? productionRecipe.recipes : [];

  const [form, setForm] = useState({ ...emptyForm });
  const [lines, setLines] = useState<Line[]>([]);
  const [line, setLine] = useState({ ...emptyLine });
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(getProductionRecipes());
  }, [dispatch]);

  const setField = (key: string, value: any) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const clearForm = () => {
    setForm({ ...emptyForm });
    setLines([]);
    setLine({ ...emptyLine });
    setEditingLineId(null);
  };

  const openRecipe = (id: number) => {
    setLoading(true);
    dispatch(
      getProductionRecipe({
        id,
        callback: (response: any) => {
          setLoading(false);

          if (!response?.success) {
            toast.error(response?.message || 'Could not open the recipe');
            return;
          }

          const recipe = response.data?.recipe ?? {};
          const recipeLines: any[] = Array.isArray(response.data?.lines) ? response.data.lines : [];

          setForm({
            id: Number(recipe.id),
            name: recipe.name || '',
            outputProductId: recipe.output_product_id ? String(recipe.output_product_id) : '',
            outputProductName: recipe.output_product_name || recipe.output_product || '',
            unit: recipe.unit || '',
            yieldQty: recipe.yield_qty != null ? String(Number(recipe.yield_qty)) : '',
            lossBasis: recipe.loss_basis || 'kg',
            lossTolerance:
              recipe.loss_tolerance_pct != null ? String(Number(recipe.loss_tolerance_pct)) : '',
            suggestedCost:
              recipe.suggested_cost != null ? String(Number(recipe.suggested_cost)) : '',
            version: recipe.version != null ? String(recipe.version) : '',
            effectiveDate: recipe.effective_date ? String(recipe.effective_date).slice(0, 10) : today(),
            note: recipe.note || '',
          });

          setLines(
            recipeLines.map((row: any, index: number) => ({
              id: Date.now() + index,
              productId: String(row.product_id),
              productName: row.product_name || '',
              unit: row.unit || '',
              qty: String(Number(row.base_qty)),
              lineType: row.line_type === 'packaging' ? 'packaging' : 'material',
              note: row.note || '',
            })),
          );

          setLine({ ...emptyLine });
          setEditingLineId(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      }) as any,
    );
  };

  const handleOutputProduct = (option: Option | null) => {
    setForm((previous) => ({
      ...previous,
      outputProductId: option?.value || '',
      outputProductName: option?.label || '',
      unit: option?.label_5 || previous.unit,
    }));
  };

  const handleLineProduct = (option: Option | null) => {
    setLine((previous) => ({
      ...previous,
      productId: option?.value || '',
      productName: option?.label || '',
      unit: option?.label_5 || '',
    }));
  };

  const duplicateLine = (productId: string, ignoreId: number | null) =>
    lines.some((row) => row.productId === productId && row.id !== ignoreId);

  const addLine = () => {
    if (!line.productId) return toast.error('Choose a material');
    if (!(Number(line.qty) > 0)) return toast.error('Every material needs a quantity');
    if (line.productId === form.outputProductId)
      return toast.error('The product the recipe makes cannot also be one of its materials');
    if (duplicateLine(line.productId, null)) return toast.error('That material is already listed');

    setLines((previous) => [...previous, { ...line, id: Date.now() }]);
    setLine({ ...emptyLine });
  };

  const updateLine = () => {
    if (editingLineId === null) return;
    if (!line.productId) return toast.error('Choose a material');
    if (!(Number(line.qty) > 0)) return toast.error('Every material needs a quantity');
    if (line.productId === form.outputProductId)
      return toast.error('The product the recipe makes cannot also be one of its materials');
    if (duplicateLine(line.productId, editingLineId)) return toast.error('That material is already listed');

    setLines((previous) =>
      previous.map((row) => (row.id === editingLineId ? { ...line, id: editingLineId } : row)),
    );
    setLine({ ...emptyLine });
    setEditingLineId(null);
  };

  const editLine = (row: Line) => {
    setLine({
      productId: row.productId,
      productName: row.productName,
      unit: row.unit,
      qty: row.qty,
      lineType: row.lineType,
      note: row.note,
    });
    setEditingLineId(row.id);
  };

  const removeLine = (id: number) => {
    setLines((previous) => previous.filter((row) => row.id !== id));
    if (editingLineId === id) {
      setLine({ ...emptyLine });
      setEditingLineId(null);
    }
  };

  const save = () => {
    if (!form.name.trim()) return toast.error('Give the recipe a name');
    if (!form.outputProductId) return toast.error('Choose the product this recipe makes');
    if (!(Number(form.yieldQty) > 0)) return toast.error('The yield must be more than nothing');
    if (!form.effectiveDate) return toast.error('Choose the date this version takes effect');
    if (!lines.length) return toast.error('Add at least one material');

    setSaving(true);
    dispatch(
      saveProductionRecipe(
        form.id,
        {
          name: form.name.trim(),
          output_product_id: Number(form.outputProductId),
          yield_qty: Number(form.yieldQty),
          loss_basis: form.lossBasis || null,
          loss_tolerance_pct: Number(form.lossTolerance) || 0,
          suggested_cost: form.suggestedCost === '' ? null : Number(form.suggestedCost),
          effective_date: form.effectiveDate,
          note: form.note || null,
          lines: lines.map((row) => ({
            product_id: Number(row.productId),
            base_qty: Number(row.qty),
            line_type: row.lineType,
            note: row.note || null,
          })),
        },
        (response: any) => {
          if (response?.success) {
            toast.success(response?.message || 'Saved');
            clearForm();
            dispatch(getProductionRecipes());
          } else {
            toast.error(response?.message || 'Save failed');
          }
          setSaving(false);
        },
      ) as any,
    );
  };

  const saveAsNewVersion = () => {
    if (!form.id) return toast.error('Open a version first');
    if (!window.confirm('Copy this version into a new one, effective from the date on the form?')) return;

    dispatch(
      newProductionRecipeVersion(form.id, form.effectiveDate || null, (response: any) => {
        if (response?.success) {
          toast.success(response?.message || 'New version saved');
          dispatch(getProductionRecipes());
          const newId = response?.data?.data?.id ?? response?.data?.id;
          if (newId) openRecipe(Number(newId));
        } else {
          toast.error(response?.message || 'Could not copy the version');
        }
      }) as any,
    );
  };

  const [removeRow, setRemoveRow] = useState<any | null>(null);
  const [removing, setRemoving] = useState(false);

  const removeRecipe = () => {
    if (!removeRow) return;

    setRemoving(true);
    dispatch(
      destroyProductionRecipe(removeRow.id, (response: any) => {
        if (response?.success) {
          toast.success(response?.message || 'Removed');
          if (form.id === Number(removeRow.id)) clearForm();
          dispatch(getProductionRecipes());
        } else {
          toast.error(response?.message || 'Remove failed');
        }
        setRemoving(false);
        setRemoveRow(null);
      }) as any,
    );
  };

  const th = 'px-3 py-2 font-medium';
  const td = 'px-3 py-2 text-[rgb(var(--c-text))]';
  const rowCls = 'border-t border-[rgb(var(--c-border))] bg-[rgb(var(--c-table-body))]';
  const headCls = 'bg-[rgb(var(--c-table-head))] text-xs text-[rgb(var(--c-text))]';
  const iconBtn =
    'rounded p-1.5 transition hover:bg-[rgb(var(--c-page))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--c-primary))]';

  return (
    <div className="pb-6">
      <HelmetTitle title="Recipe" />

      <section className="mb-4 rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-[rgb(var(--c-text))]">Recipe</h1>
          {form.id ? (
            <span className="flex items-center gap-3 rounded-full bg-[rgb(var(--c-warning)/0.15)] px-3 py-1 text-sm text-[rgb(var(--c-text))]">
              Editing <strong>{form.name || `#${form.id}`}</strong>
              {form.version ? <span>version {form.version}</span> : null}
              <button type="button" onClick={clearForm} className="font-medium text-[rgb(var(--c-primary))] underline">
                Cancel
              </button>
            </span>
          ) : (
            <span className="rounded-full bg-[rgb(var(--c-primary)/0.1)] px-3 py-1 text-sm font-medium text-[rgb(var(--c-primary))]">
              New recipe
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <InputElement
            id="recipeName"
            name="recipeName"
            label="Recipe name"
            placeholder="e.g. Spice mix 1 kg"
            value={form.name}
            onChange={(event: any) => setField('name', event.target.value)}
            className="w-full"
          />
          <div>
            <label className="text-sm text-[rgb(var(--c-text))]">Product it makes</label>
            <ProductDropdown
              id="outputProduct"
              name="outputProduct"
              onSelect={handleOutputProduct}
              defaultValue={productOption(form.outputProductId, form.outputProductName)}
              value={productOption(form.outputProductId, form.outputProductName)}
            />
          </div>
          <InputElement
            id="yieldQty"
            name="yieldQty"
            type="number"
            step="0.01"
            label={`Yield${form.unit ? ` (${form.unit})` : ''}`}
            placeholder="95"
            value={form.yieldQty}
            onChange={(event: any) => setField('yieldQty', event.target.value)}
            className="w-full"
          />
          <InputDatePicker
            id="effectiveDate"
            name="effectiveDate"
            label="Effective from"
            selectedDate={dateFromIso(form.effectiveDate)}
            setSelectedDate={(date) => setField('effectiveDate', isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
          <InputElement
            id="lossTolerance"
            name="lossTolerance"
            type="number"
            step="0.01"
            label="Normal loss %"
            placeholder="5"
            value={form.lossTolerance}
            onChange={(event: any) => setField('lossTolerance', event.target.value)}
            className="w-full"
          />
          <InputElement
            id="lossBasis"
            name="lossBasis"
            label="Loss measured in"
            placeholder="kg"
            value={form.lossBasis}
            onChange={(event: any) => setField('lossBasis', event.target.value)}
            className="w-full"
          />
          <InputElement
            id="suggestedCost"
            name="suggestedCost"
            type="number"
            step="0.01"
            label="Suggested cost (optional)"
            placeholder="A reminder only"
            value={form.suggestedCost}
            onChange={(event: any) => setField('suggestedCost', event.target.value)}
            className="w-full"
          />
          <InputElement
            id="version"
            name="version"
            label="Version"
            value={form.version}
            onChange={() => undefined}
            disabled
            className="w-full"
          />
          <div className="md:col-span-4">
            <InputElement
              id="recipeNote"
              name="recipeNote"
              label="Note"
              placeholder="Anything worth writing down"
              value={form.note}
              onChange={(event: any) => setField('note', event.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4">
        <h2 className="text-base font-semibold text-[rgb(var(--c-text))]">Materials</h2>
        <p className="mb-3 mt-0.5 text-sm text-[rgb(var(--c-text-muted))]">
          Per batch of the yield above. Empty packets, labels and cartons are materials too — mark
          them as packaging so the count stays visible.
        </p>

        <div className="mb-4 grid grid-cols-1 items-end gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="text-sm text-[rgb(var(--c-text))]">Material</label>
            <ProductDropdown
              id="recipeLineProduct"
              name="recipeLineProduct"
              onSelect={handleLineProduct}
              defaultValue={productOption(line.productId, line.productName)}
              value={productOption(line.productId, line.productName)}
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
              onChange={(event: any) => setLine((p) => ({ ...p, qty: event.target.value }))}
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-[rgb(var(--c-text))]">Kind</label>
            <select
              id="lineType"
              name="lineType"
              value={line.lineType}
              onChange={(event) => setLine((p) => ({ ...p, lineType: event.target.value as LineType }))}
              className="h-9.5 w-full rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-2 text-sm text-[rgb(var(--c-text))]"
            >
              <option value="material">Material</option>
              <option value="packaging">Packaging</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <InputElement
              id="lineNote"
              name="lineNote"
              label="Note"
              placeholder="Optional"
              value={line.note}
              onChange={(event: any) => setLine((p) => ({ ...p, note: event.target.value }))}
              className="w-full"
            />
          </div>
          <div className="md:col-span-1">
            <ButtonLoading
              onClick={editingLineId === null ? addLine : updateLine}
              buttonLoading={false}
              label={editingLineId === null ? 'Add' : 'Update'}
              className="w-full whitespace-nowrap text-center mr-0 py-2"
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={headCls}>
              <tr>
                <th className={th}>Sl</th>
                <th className={th}>Material</th>
                <th className={`${th} text-right`}>Qty per batch</th>
                <th className={th}>Kind</th>
                <th className={th}>Note</th>
                <th className={`${th} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr className={rowCls}>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-[rgb(var(--c-text-muted))]">
                    No material yet
                  </td>
                </tr>
              ) : (
                lines.map((row, index) => (
                  <tr key={row.id} className={rowCls}>
                    <td className={td}>{index + 1}</td>
                    <td className={td}>{row.productName || '-'}</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {thousandSeparator(Number(row.qty))} {row.unit}
                    </td>
                    <td className={td}>{row.lineType === 'packaging' ? 'Packaging' : 'Material'}</td>
                    <td className={td}>{row.note || '-'}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => editLine(row)}
                          className={`${iconBtn} text-[rgb(var(--c-primary))]`}
                          aria-label="Edit material"
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(row.id)}
                          className={`${iconBtn} text-[rgb(var(--c-danger))]`}
                          aria-label="Remove material"
                          title="Remove"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        <ButtonLoading
          onClick={save}
          buttonLoading={saving}
          disabled={!canCreate}
          title={!canCreate ? 'You do not have production.create' : undefined}
          label={form.id ? 'Update recipe' : 'Save recipe'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSave className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={saveAsNewVersion}
          buttonLoading={false}
          disabled={!canCreate}
          title={!canCreate ? 'You do not have production.create' : undefined}
          label="New version"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiCopy className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={clearForm}
          buttonLoading={false}
          label="Clear"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />
      </div>

      <section className="rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4">
        <h2 className="mb-3 text-base font-semibold text-[rgb(var(--c-text))]">
          Recipes {loading ? <span className="text-sm font-normal">(opening…)</span> : null}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={headCls}>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Makes</th>
                <th className={`${th} text-right`}>Yield</th>
                <th className={`${th} text-right`}>Normal loss %</th>
                <th className={th}>Version</th>
                <th className={th}>Effective</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 ? (
                <tr className={rowCls}>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-[rgb(var(--c-text-muted))]">
                    No recipe yet
                  </td>
                </tr>
              ) : (
                recipes.map((row) => (
                  <tr key={row.id} className={rowCls}>
                    <td className={td}>{row.name || '-'}</td>
                    <td className={td}>{row.output_product || '#' + row.output_product_id}</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {thousandSeparator(Number(row.yield_qty))} {row.unit || ''}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {Number(row.loss_tolerance_pct)}% {row.loss_basis ? `of ${row.loss_basis}` : ''}
                    </td>
                    <td className={td}>{row.version}</td>
                    <td className={td}>{row.effective_date ? String(row.effective_date).slice(0, 10) : '-'}</td>
                    <td className={td}>{row.status === 'retired' ? 'Retired' : 'Active'}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openRecipe(Number(row.id))}
                          className={`${iconBtn} text-[rgb(var(--c-primary))]`}
                          aria-label="Edit recipe"
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        {canCreate ? (
                          <button
                            type="button"
                            onClick={() => setRemoveRow(row)}
                            className={`${iconBtn} text-[rgb(var(--c-danger))]`}
                            aria-label="Remove recipe"
                            title="Remove"
                          >
                            <FiTrash2 />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal
        show={removeRow !== null}
        title="Remove recipe"
        message={
          <>
            Remove <span className="font-bold">{removeRow?.name}</span> version {removeRow?.version}?
            <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400">
              A version a batch has already saved against is retired, not deleted.
            </span>
          </>
        }
        confirmLabel="Remove"
        loading={removing}
        onCancel={() => setRemoveRow(null)}
        onConfirm={removeRecipe}
        className="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default Recipe;
