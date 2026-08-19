import { useEffect, useState } from 'react';
import { FIELD_OPTION, FIELD_SELECT } from '../../../theme/fieldStyles';
import { toast } from 'react-toastify';
import { FiEdit2, FiLock, FiPlus, FiRefreshCw, FiSave, FiTrash2, FiX } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import {
  InventorySystem as InventorySystemType,
  createInventorySystem,
  deleteInventorySystem,
  fetchInventorySystems,
  updateInventorySystem,
} from './inventorySystemSlice';

const labelClass =
  'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const emptyForm = { id: 0, name: '', slug: '', status: 1, description: '', isCore: false };

const InventorySystem = () => {
  const [rows, setRows] = useState<InventorySystemType[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [form, setForm] = useState({ ...emptyForm });
  const isEditing = form.id > 0;

  const loadList = async () => {
    setLoadingList(true);
    try {
      setRows(await fetchInventorySystems());
    } catch {
      setRows([]);
      toast.error('Could not load inventory systems.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const resetForm = () => setForm({ ...emptyForm });

  const startEdit = (row: InventorySystemType) => {
    setForm({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: Number(row.status),
      description: row.description ?? '',
      isCore: Boolean(row.is_core),
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.info('Please enter a name.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      // Fall back to a slug derived from the name; the server normalises it too.
      slug: form.slug.trim() || slugify(form.name),
      status: Number(form.status),
      description: form.description.trim() || null,
    };

    setSaving(true);
    try {
      const response = isEditing
        ? await updateInventorySystem(form.id, payload)
        : await createInventorySystem(payload);
      toast.success(response?.data?.message || 'Saved successfully.');
      resetForm();
      loadList();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: InventorySystemType) => {
    if (!window.confirm(`Delete "${row.name}"?`)) {
      return;
    }
    setDeletingId(row.id);
    try {
      const response = await deleteInventorySystem(row.id);
      toast.success(response?.data?.message || 'Deleted successfully.');
      if (form.id === row.id) resetForm();
      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not delete.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="text-slate-900 dark:text-white">
      <HelmetTitle title="Inventory Systems" />

      {/* Form */}
      <div className="mb-6 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-black dark:text-white">
            {isEditing ? 'Edit Inventory System' : 'Add Inventory System'}
          </h2>
          {isEditing && (
            <Button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-sm border border-stroke px-3 py-1 text-sm text-slate-600 transition hover:border-primary hover:text-primary dark:border-strokedark dark:text-slate-300"
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
              id="inv-name"
              name="name"
              label=""
              value={form.name}
              placeholder="e.g. Trading Inventory"
              className="h-10 w-full!"
              onChange={(e: any) =>
                setForm((f) => ({ ...f, name: e.target.value.slice(0, 128) }))
              }
            />
          </div>

          <div>
            <label className={labelClass}>Slug</label>
            <InputElement
              id="inv-slug"
              name="slug"
              label=""
              value={form.slug}
              placeholder={form.name ? slugify(form.name) : 'auto from name'}
              className="h-10 w-full!"
              disabled={form.isCore}
              onChange={(e: any) =>
                setForm((f) => ({ ...f, slug: e.target.value.slice(0, 64) }))
              }
            />
            <span className="mt-1 block text-xs text-slate-400">
              {form.isCore
                ? 'Core system — the slug is locked because routing depends on it.'
                : 'Code branches on this. Leave blank to derive it from the name.'}
            </span>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
              className={`${FIELD_SELECT} h-10 w-full rounded-sm px-3 text-sm`}
            >
              <option value={1} className={FIELD_OPTION}>Active</option>
              <option value={0} className={FIELD_OPTION}>Inactive</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value.slice(0, 512) }))
              }
              rows={2}
              placeholder="Optional note about this inventory system"
              className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-blue-500 dark:border-form-strokedark dark:bg-transparent dark:text-white"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <ButtonLoading
            onClick={handleSave}
            buttonLoading={saving}
            label={saving ? 'Saving...' : isEditing ? 'Update' : 'Add'}
            icon={isEditing ? <FiSave /> : <FiPlus />}
            className="h-10 px-6"
          />
        </div>
      </div>

      {/* List */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
          <h2 className="text-lg font-bold text-black dark:text-white">
            Inventory Systems
          </h2>
          <Button
            type="button"
            onClick={loadList}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-stroke text-slate-500 transition hover:border-primary hover:text-primary dark:border-strokedark dark:text-slate-300"
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
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Description</th>
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
                rows.map((row, index) => (
                  <tr key={row.id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3 text-center tabular-nums">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-black dark:text-white">
                      {row.name}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-meta-4">
                        {row.slug}
                      </code>
                    </td>
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-sky-500 transition hover:bg-sky-50 dark:hover:bg-sky-900/20"
                          aria-label={`Edit ${row.name}`}
                        >
                          <FiEdit2 />
                        </Button>
                        {row.is_core ? (
                          <span
                            className="inline-flex h-8 w-8 items-center justify-center text-slate-300 dark:text-slate-600"
                            title="Core system — cannot be deleted"
                            aria-label={`${row.name} is a core system and cannot be deleted`}
                          >
                            <FiLock />
                          </span>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => handleDelete(row)}
                            disabled={deletingId === row.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-900/20"
                            aria-label={`Delete ${row.name}`}
                          >
                            <FiTrash2 />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No inventory systems yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventorySystem;
