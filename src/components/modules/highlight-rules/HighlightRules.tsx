import { useEffect, useState } from 'react';
import { FIELD_OPTION, FIELD_SELECT } from '../../../theme/fieldStyles';
import { toast } from 'react-toastify';
import { FiEdit2, FiPlus, FiRefreshCw, FiSave, FiTrash2, FiX } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import {
  HIGHLIGHT_COLORS,
  highlightLineClass,
  invalidateHighlightRulesCache,
} from '../../utils/highlight/highlightRules';
import {
  HighlightRuleRow,
  createHighlightRule,
  deleteHighlightRule,
  fetchHighlightRules,
  updateHighlightRule,
} from './highlightRulesSlice';
import { Select, Textarea } from '../../utils/fields/FormControls';

const labelClass =
  'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';

const emptyForm = {
  id: 0,
  phrase: '',
  color: 'red',
  priority: 0,
  status: 1,
  description: '',
};

const swatchFor = (color: string) =>
  HIGHLIGHT_COLORS.find((c) => c.value === color)?.swatch ?? 'bg-red-500';

const HighlightRules = () => {
  const [rows, setRows] = useState<HighlightRuleRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<HighlightRuleRow | null>(null);

  const [form, setForm] = useState({ ...emptyForm });
  const isEditing = form.id > 0;

  const loadList = async () => {
    setLoadingList(true);
    try {
      setRows(await fetchHighlightRules());
    } catch {
      setRows([]);
      toast.error('Could not load highlight rules.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const resetForm = () => setForm({ ...emptyForm });

  const startEdit = (row: HighlightRuleRow) => {
    setForm({
      id: row.id,
      phrase: row.phrase,
      color: row.color || 'red',
      priority: Number(row.priority) || 0,
      status: Number(row.status),
      description: row.description ?? '',
    });
  };

  const handleSave = async () => {
    if (!form.phrase.trim()) {
      toast.info('Please enter a phrase.');
      return;
    }

    const payload = {
      phrase: form.phrase.trim(),
      color: form.color,
      priority: Number(form.priority) || 0,
      status: Number(form.status),
      description: form.description.trim() || null,
    };

    setSaving(true);
    try {
      const response = isEditing
        ? await updateHighlightRule(form.id, payload)
        : await createHighlightRule(payload);
      toast.success(response?.data?.message || 'Saved successfully.');
      // Report screens read a cached copy of the active rules; drop it so the
      // change shows up without a hard reload.
      invalidateHighlightRulesCache();
      resetForm();
      loadList();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    const row = deleteConfirmRow;
    if (!row) return;
    setDeletingId(row.id);
    try {
      const response = await deleteHighlightRule(row.id);
      toast.success(response?.data?.message || 'Deleted successfully.');
      invalidateHighlightRulesCache();
      if (form.id === row.id) resetForm();
      setRows((current) => current.filter((item) => item.id !== row.id));
      setDeleteConfirmRow(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not delete.');
    } finally {
      setDeletingId(null);
    }
  };

  const previewClass = highlightLineClass({
    id: 0,
    phrase: '',
    color: form.color,
    priority: 0,
  });

  return (
    <div className="text-slate-900 dark:text-[rgb(var(--c-text))]">
      <HelmetTitle title="Highlight Rules" />

      {/* Form */}
      <div className="mb-6 rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4 shadow-default sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
            {isEditing ? 'Edit Highlight Rule' : 'Add Highlight Rule'}
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
          <div className="md:col-span-2">
            <label className={labelClass}>
              Phrase <span className="text-rose-500">*</span>
            </label>
            <InputElement
 id="hl-phrase"
 name="phrase"
 label=""
 value={form.phrase}
 placeholder="e.g. Not Yet Reports"
 className="w-full!"
 onChange={(e: any) =>
                setForm((f) => ({ ...f, phrase: e.target.value.slice(0, 255) }))
              }
            />
            <span className="mt-1 block text-xs text-slate-400">
              Any line that contains this text (case-insensitive) gets boxed.
            </span>
          </div>

          <div>
            <label className={labelClass}>Color</label>
            <Select
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className={`${FIELD_SELECT} w-full rounded-sm px-3 text-sm`}
            >
              {HIGHLIGHT_COLORS.map((c) => (
                <option key={c.value} value={c.value} className={FIELD_OPTION}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className={labelClass}>Priority</label>
            <InputElement
 id="hl-priority"
 name="priority"
 type="number"
 label=""
 value={form.priority}
 placeholder="0"
 className="w-full!"
 onChange={(e: any) =>
                setForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))
              }
            />
            <span className="mt-1 block text-xs text-slate-400">
              When a line matches several phrases, the highest priority wins.
            </span>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <Select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
              className={`${FIELD_SELECT} w-full rounded-sm px-3 text-sm`}
            >
              <option value={1} className={FIELD_OPTION}>Active</option>
              <option value={0} className={FIELD_OPTION}>Inactive</option>
            </Select>
          </div>

          <div>
            <label className={labelClass}>Preview</label>
            <div className="flex h-10 items-center">
              <span className={`text-sm ${previewClass}`}>
                {form.phrase.trim() || 'Sample line'}
              </span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value.slice(0, 255) }))
              }
              rows={2}
              placeholder="Optional note about this rule"
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
          <h2 className="text-lg font-bold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
            Highlight Rules
          </h2>
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
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-600 dark:bg-meta-4 dark:text-slate-200">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3 text-left">Phrase</th>
                <th className="px-4 py-3 text-left">Color</th>
                <th className="px-4 py-3 text-right">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-strokedark">
              {loadingList && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr key={row.id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3 text-center tabular-nums">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm ${highlightLineClass({
                          id: row.id,
                          phrase: row.phrase,
                          color: row.color,
                          priority: row.priority,
                        })}`}
                      >
                        {row.phrase}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 capitalize">
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full ${swatchFor(row.color)}`}
                        />
                        {row.color}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.priority}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          Number(row.status) === 1
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {Number(row.status) === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-md text-slate-500 dark:text-slate-400">
                      {row.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="inline-flex w-8 items-center justify-center rounded-sm text-sky-500 transition hover:bg-sky-50 dark:hover:bg-sky-900/20"
                          aria-label={`Edit ${row.phrase}`}
                        >
                          <FiEdit2 />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setDeleteConfirmRow(row)}
                          disabled={deletingId === row.id}
                          className="inline-flex w-8 items-center justify-center rounded-sm text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-900/20"
                          aria-label={`Delete ${row.phrase}`}
                        >
                          <FiTrash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No highlight rules yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        show={Boolean(deleteConfirmRow)}
        title="Confirm Deletion"
        message={
          <div className="text-base leading-7 text-slate-700 dark:text-slate-200">
            <div>Are you sure you want to delete this rule</div>
            <div className="font-bold text-slate-800 dark:text-[rgb(var(--c-text))]">
              {deleteConfirmRow?.phrase || ''} ?
            </div>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Confirm"
        className="bg-red-600 hover:bg-red-700 min-w-[128px]"
        loading={deletingId === deleteConfirmRow?.id}
        onCancel={() => setDeleteConfirmRow(null)}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
};

export default HighlightRules;
