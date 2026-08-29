import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiRefreshCw, FiSave, FiX } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import ActionButtons from '../../utils/fields/ActionButton';
import { Select, Textarea } from '../../utils/fields/FormControls';
import { FIELD_OPTION, FIELD_SELECT } from '../../../theme/fieldStyles';
import {
  BusinessType as BusinessTypeRow,
  createBusinessType,
  fetchBusinessTypes,
  toggleBusinessType,
  updateBusinessType,
} from './businessTypeSlice';

/**
 * The trades a branch can be in -- the list behind two dropdowns: Select
 * Business Type on Add Branch, and the one on the registration form.
 *
 * ⚠️ DISABLING IS NOT MOVING ANYBODY. Turning a trade off takes it off those
 * two dropdowns and leaves every branch already on it exactly where it is. A
 * trade no longer sold still has customers, and re-typing their branches would
 * change which dashboard they open on tomorrow. The row says how many are on
 * it, so the decision is made with that in view rather than after it.
 *
 * ⚠️ NOTHING IS EVER DELETED HERE, and there is no button for it. The id is
 * written onto the branch and read back by code that branches on the number, so
 * removing a row leaves those branches pointing at nothing AND frees its number
 * for the next trade created, which would silently inherit them. Disabling says
 * everything deleting would and can be undone.
 */

const labelClass = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';

const emptyForm = { id: 0, name: '', status: 1, description: '' };

const BusinessType = () => {
  const [rows, setRows] = useState<BusinessTypeRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });
  const isEditing = form.id > 0;

  const loadList = async () => {
    setLoadingList(true);

    try {
      setRows(await fetchBusinessTypes());
    } catch {
      setRows([]);
      toast.error('Could not load business types.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const resetForm = () => setForm({ ...emptyForm });

  const startEdit = (row: BusinessTypeRow) =>
    setForm({
      id: row.id,
      name: row.name,
      status: Number(row.status),
      description: row.description ?? '',
    });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.info('Please enter a name.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      status: Number(form.status),
      description: form.description.trim() || null,
    };

    setSaving(true);

    try {
      const response = isEditing
        ? await updateBusinessType(form.id, payload)
        : await createBusinessType(payload);

      toast.success(response?.data?.message || 'Saved successfully.');
      resetForm();
      loadList();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: BusinessTypeRow, enabled: boolean) => {
    const next = enabled ? 1 : 0;

    // Painted before the answer comes back, because the switch is a switch: it
    // has to move under the finger. Put back below if the save is refused.
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, status: next } : item)),
    );

    try {
      const response = await toggleBusinessType(row.id, next);
      toast.success(response?.data?.message || 'Saved.');
    } catch (error: any) {
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, status: Number(row.status) } : item,
        ),
      );
      toast.error(error?.response?.data?.message || 'Could not change it.');
    }
  };

  return (
    <div className="text-slate-900 dark:text-[rgb(var(--c-text))]">
      <HelmetTitle title="Business Types" />

      {/* Form */}
      <div className="mb-6 rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4 shadow-default sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[rgb(var(--c-text))]">
            {isEditing ? 'Edit Business Type' : 'Add Business Type'}
          </h2>
          {isEditing && (
            <Button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-3 py-1 text-sm text-slate-600 transition hover:border-primary hover:text-primary dark:text-slate-300"
            >
              <FiX /> Cancel
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>
              Name <span className="text-rose-500">*</span>
            </label>
            <InputElement
              id="business-type-name"
              name="name"
              label=""
              value={form.name}
              placeholder="e.g. Hotel / Motel"
              className="w-full!"
              onChange={(e: any) =>
                setForm((f) => ({ ...f, name: e.target.value.slice(0, 128) }))
              }
            />
            {/* The name is the only thing telling two trades apart on a
                dropdown -- the id is not shown, and would not help if it were. */}
            <span className="mt-1 block text-xs text-slate-400">
              What both dropdowns show. Two trades cannot share a name.
            </span>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <Select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
              className={`${FIELD_SELECT} w-full rounded-sm px-3 text-sm`}
            >
              <option value={1} className={FIELD_OPTION}>
                Enabled
              </option>
              <option value={0} className={FIELD_OPTION}>
                Disabled
              </option>
            </Select>
            <span className="mt-1 block text-xs text-slate-400">
              Disabled takes it off the dropdowns. Branches already on it keep working.
            </span>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value.slice(0, 512) }))
              }
              rows={2}
              placeholder="Optional note about this trade"
              className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-white px-3 py-2 text-sm text-[rgb(var(--c-text))] outline-none focus:border-blue-500 dark:bg-transparent dark:text-[rgb(var(--c-text))]"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <ButtonLoading
            onClick={handleSave}
            buttonLoading={saving}
            label={saving ? 'Saving...' : isEditing ? 'Update' : 'Add'}
            icon={isEditing ? <FiSave /> : <FiPlus />}
            className="px-6"
          />
        </div>
      </div>

      {/* List */}
      <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <h2 className="text-lg font-bold text-[rgb(var(--c-text))]">Business Types</h2>
          <Button
            type="button"
            onClick={loadList}
            className="flex w-8 items-center justify-center rounded-sm border border-[rgb(var(--c-border))] text-slate-500 transition hover:border-primary hover:text-primary dark:text-slate-300"
            aria-label="Refresh list"
          >
            <FiRefreshCw className={loadingList ? 'animate-spin' : ''} />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-600 dark:bg-meta-4 dark:text-slate-200">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-center">Branches</th>
                <th className="px-4 py-3 text-center">Offered</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-strokedark">
              {loadingList && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row, index) => {
                  const inUse = Number(row.branches_count ?? 0) > 0;

                  return (
                    <tr
                      key={row.id}
                      className={`text-slate-700 dark:text-slate-200 ${
                        Number(row.status) === 1 ? '' : 'opacity-60'
                      }`}
                    >
                      <td className="px-4 py-3 text-center tabular-nums">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-[rgb(var(--c-text))]">
                        {row.name}
                      </td>
                      <td className="max-w-md px-4 py-3 text-slate-500 dark:text-slate-400">
                        {row.description || '-'}
                      </td>
                      {/* What disabling costs and what deleting is refused for,
                          on the row rather than found out afterwards. */}
                      <td className="px-4 py-3 text-center tabular-nums">
                        {inUse ? (
                          <span title="Branches running on this trade. They are untouched by disabling it.">
                            {row.branches_count}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            Number(row.status) === 1
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {Number(row.status) === 1 ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {/* The switch, the pencil and the bin the rest of the
                            app uses, so this list behaves like every other. */}
                        <ActionButtons
                          row={row as any}
                          showEdit
                          handleEdit={(r: any) => startEdit(r)}
                          showToggle
                          handleToggle={(_id: number, enabled: boolean) =>
                            handleToggle(row, enabled)
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No business types yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="border-t border-[rgb(var(--c-border))] px-4 py-3 text-xs leading-snug text-slate-500 dark:text-slate-400">
          <strong>Disabled</strong> takes a trade off the Add Branch and registration
          dropdowns; every branch already on it keeps working and keeps the screens it
          has. Nothing is deleted here — a branch stores the id, and a freed number
          would be handed to the next trade created, taking that branch with it.
        </p>
      </div>
    </div>
  );
};

export default BusinessType;
