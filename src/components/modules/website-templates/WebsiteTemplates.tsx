import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiCopy, FiEdit2, FiPlus, FiRefreshCw, FiTrash2, FiUploadCloud, FiEyeOff } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import {
  WebsiteTemplateSummary,
  createWebsiteTemplate,
  deleteWebsiteTemplate,
  duplicateWebsiteTemplate,
  fetchWebsiteTemplates,
  publishWebsiteTemplate,
  unpublishWebsiteTemplate,
} from './websiteTemplateSlice';

/**
 * Admin → Website Templates.
 *
 * The platform's master website templates. Publishing one here is what puts it
 * in front of every company (in every installation, once the catalogue is
 * synced) -- a draft is visible to nobody but this screen.
 *
 * ⚠️ PLATFORM ADMINS ONLY. The server enforces it with `platform.admin`; this
 * menu is only the way in, not the lock.
 */
const WebsiteTemplates = () => {
  const [rows, setRows] = useState<WebsiteTemplateSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await fetchWebsiteTemplates());
    } catch (error: any) {
      setRows([]);
      toast.error(error?.response?.data?.error?.message || 'Could not load website templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.info('Give the template a name.');
      return;
    }
    setCreating(true);
    try {
      const response = await createWebsiteTemplate({ name: newName.trim() });
      toast.success('Template created. Open it to start editing.');
      setNewName('');
      const id = response?.data?.template?.id;
      if (id) {
        window.location.hash = '';
        window.location.assign(`/admin/website-templates/${id}`);
        return;
      }
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Could not create the template.');
    } finally {
      setCreating(false);
    }
  };

  const run = async (id: number, action: () => Promise<unknown>, okMessage: string) => {
    setBusyId(id);
    try {
      await action();
      toast.success(okMessage);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'The request was refused.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (row: WebsiteTemplateSummary) => {
    if (!window.confirm(`Delete "${row.name}"? Companies that already used it keep their own copies.`)) return;
    run(row.id, () => deleteWebsiteTemplate(row.id), 'Template deleted.');
  };

  return (
    <div className="text-slate-900 dark:text-[rgb(var(--c-text))]">
      <HelmetTitle title="Website Templates" />

      <div className="mb-6 rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4 shadow-default sm:p-6">
        <h2 className="mb-1 text-lg font-bold text-[rgb(var(--c-text))]">Create a template</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          A template is the platform's own: companies copy it into their own website and may change
          their copy freely — the master and every other company are unaffected. Nothing is offered to
          companies until you publish it.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Name</label>
            <input
              data-testid="new-template-name"
              className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-white px-3 py-2 text-sm text-[rgb(var(--c-text))] outline-none focus:border-blue-500 dark:bg-transparent dark:text-[rgb(var(--c-text))]"
              value={newName}
              placeholder="e.g. Restaurant & Cafe"
              onChange={(e) => setNewName(e.target.value.slice(0, 150))}
            />
          </div>
          <ButtonLoading
            onClick={handleCreate}
            buttonLoading={creating}
            label={creating ? 'Creating…' : 'Create blank'}
            icon={<FiPlus />}
            className="px-6"
          />
        </div>
      </div>

      <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <h2 className="text-lg font-bold text-[rgb(var(--c-text))]">Master templates</h2>
          <Button
            type="button"
            onClick={load}
            className="flex w-8 items-center justify-center rounded-sm border border-[rgb(var(--c-border))] text-slate-500 transition hover:border-primary hover:text-primary dark:text-slate-300"
            aria-label="Refresh list"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-600 dark:bg-meta-4 dark:text-slate-200">
              <tr>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-center">Pages</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Published</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-strokedark">
              {loading && rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
              ) : rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr key={row.id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3 text-center tabular-nums">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[rgb(var(--c-text))]">{row.name}</div>
                      <div className="text-xs text-slate-400">{row.key}</div>
                      {row.description && <div className="text-xs text-slate-500">{row.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{row.pages}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        row.is_published
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {row.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {row.published_at ? new Date(row.published_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/website-templates/${row.id}`}
                          className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-2 py-1 text-xs text-slate-600 hover:border-primary hover:text-primary dark:text-slate-300"
                        >
                          <FiEdit2 /> Edit
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => run(row.id, () => duplicateWebsiteTemplate(row.id), 'Duplicated as a draft.')}
                          className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-2 py-1 text-xs text-slate-600 hover:border-primary hover:text-primary dark:text-slate-300"
                        >
                          <FiCopy /> Duplicate
                        </button>
                        {row.is_published ? (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => run(row.id, () => unpublishWebsiteTemplate(row.id), 'Unpublished — companies can no longer select it.')}
                            className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-2 py-1 text-xs text-amber-700 hover:border-amber-500 dark:text-amber-300"
                          >
                            <FiEyeOff /> Unpublish
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => run(row.id, () => publishWebsiteTemplate(row.id), 'Published — companies can select it now.')}
                            className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-2 py-1 text-xs text-emerald-700 hover:border-emerald-500 dark:text-emerald-300"
                          >
                            <FiUploadCloud /> Publish
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleDelete(row)}
                          className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-2 py-1 text-xs text-rose-600 hover:border-rose-500"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No templates yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="border-t border-[rgb(var(--c-border))] px-4 py-3 text-xs leading-snug text-slate-500 dark:text-slate-400">
          <strong>Draft</strong> templates are invisible to companies. Publishing copies your draft across;
          unpublishing withdraws the template without deleting it or disturbing any company that already
          copied it. Each installation keeps its own copy of this catalogue — distribute a publish with
          <code className="mx-1">php artisan website-templates:export</code> and
          <code className="mx-1">website-templates:sync</code>.
        </p>
      </div>
    </div>
  );
};

export default WebsiteTemplates;
