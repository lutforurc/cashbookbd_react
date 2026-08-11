import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { FaYoutube } from 'react-icons/fa';

import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import {
  TutorialVideo,
  createTutorialVideo,
  deleteTutorialVideo,
  fetchTutorialVideos,
  saveTutorialVideos,
  updateTutorialVideo,
} from './tutorialVideoSlice';

const emptyForm = { screen_key: '', title: '', group_name: '', url: '' };

const labelClass =
  'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';

const fieldClass =
  'w-full rounded border border-slate-300 bg-transparent px-3 py-1.5 text-sm outline-none transition focus:border-primary dark:border-slate-600 dark:text-white';

/**
 * Headings only for the groups that title-casing gets wrong.
 *
 * group_name is the first segment of a screen's route, so most of them read
 * correctly once the hyphens are spaces and the words are capitalised --
 * "approval-center" is "Approval Center" and needs no entry here. What does
 * need one is an acronym, or a segment that is shorthand for something longer.
 */
const GROUP_TITLES: Record<string, string> = {
  coal1: 'COA Level 1',
  coal2: 'COA Level 2',
  coal3: 'COA Level 3',
  coal4: 'COA Level 4',
  hrms: 'HRMS',
  sms: 'SMS',
  'vr-settings': 'Voucher Settings',
  'customer-supplier': 'Customer & Supplier',
  setup: 'Setup & Lists',
};

/** "approval-center" -> "Approval Center" */
const humaniseGroup = (group: string) =>
  GROUP_TITLES[group] ||
  group
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Editing the walkthrough link each screen offers.
 *
 * Rows are not created or deleted here. They describe screens that exist, so
 * they arrive on their own: opening a screen the list has never seen registers
 * it, and it is waiting here the next time this page is loaded. The job here is
 * filling in and retiring URLs.
 *
 * An empty box is how a video is retired -- the settings payload drops rows
 * without a URL, so the screen simply stops offering the link.
 */
const TutorialVideos = () => {
  const [rows, setRows] = useState<TutorialVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // screen_key -> edited value, so an untouched row is not sent as a change and
  // a reload after saving comes back to a clean slate.
  const [edits, setEdits] = useState<Record<string, Partial<TutorialVideo>>>({});

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  // The row being corrected, or 0 while adding a new one. One panel serves both
  // -- the fields are the same, and only the verb changes.
  const [editingId, setEditingId] = useState(0);
  const [adding, setAdding] = useState(false);
  const [removeRow, setRemoveRow] = useState<TutorialVideo | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await fetchTutorialVideos());
      setEdits({});
    } catch {
      setRows([]);
      toast.error('Could not load tutorial videos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const buckets = new Map<string, TutorialVideo[]>();

    rows.forEach((row) => {
      const key = row.group_name || 'other';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(row);
    });

    // The serial runs unbroken across the groups rather than restarting in
    // each, so the last number on the page is the number of screens there are.
    let counted = 0;

    return Array.from(buckets.entries()).map(([group, items]) => {
      const startIndex = counted;
      counted += items.length;
      return { group, items, startIndex };
    });
  }, [rows]);

  /** Groups already in use, offered to the add form so headings stay tidy. */
  const groupNames = useMemo(
    () => Array.from(new Set(rows.map((row) => row.group_name))).sort(),
    [rows],
  );

  const valueOf = (row: TutorialVideo) =>
    edits[row.screen_key]?.url ?? row.url ?? '';

  const statusOf = (row: TutorialVideo) =>
    Number(edits[row.screen_key]?.status ?? row.status);

  const dirtyCount = Object.keys(edits).length;

  const setEdit = (row: TutorialVideo, patch: Partial<TutorialVideo>) => {
    setEdits((current) => ({
      ...current,
      [row.screen_key]: { ...current[row.screen_key], ...patch },
    }));
  };

  /**
   * The server's own sentence beats a generic one here: it is the thing that
   * knows the key is taken or the link is not a URL.
   */
  const reportFailure = (error: any, fallback: string) => {
    const validation = error?.response?.data?.errors;
    const first = validation && Object.values(validation)[0];

    toast.error(
      (Array.isArray(first) ? first[0] : null) ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        fallback,
    );
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(0);
    setForm({ ...emptyForm });
  };

  const startEdit = (row: TutorialVideo) => {
    setEditingId(row.id);
    setForm({
      screen_key: row.screen_key,
      title: row.title,
      group_name: row.group_name || '',
      // Whatever is in the row's box right now, so opening the panel does not
      // quietly undo a URL typed but not yet saved.
      url: valueOf(row),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdd = async () => {
    if (!form.screen_key.trim() || !form.title.trim()) {
      toast.info('Screen key and title are both needed.');
      return;
    }

    const payload = {
      screen_key: form.screen_key.trim(),
      title: form.title.trim(),
      group_name: form.group_name.trim() || undefined,
      url: form.url.trim() || null,
    };

    setAdding(true);
    try {
      const response = editingId
        ? await updateTutorialVideo(editingId, payload)
        : await createTutorialVideo(payload);

      if (response?.data?.success) {
        toast.success(editingId ? 'Screen updated.' : 'Screen added.');
        closeForm();
        await load();
      } else {
        toast.error(
          response?.data?.error?.message ||
            (editingId ? 'Could not update the screen.' : 'Could not add the screen.'),
        );
      }
    } catch (error) {
      reportFailure(
        error,
        editingId ? 'Could not update the screen.' : 'Could not add the screen.',
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removeRow) return;

    setRemoving(true);
    try {
      await deleteTutorialVideo(removeRow.id);
      toast.success('Screen removed.');
      setRemoveRow(null);
      await load();
    } catch (error) {
      reportFailure(error, 'Could not remove the screen.');
    } finally {
      setRemoving(false);
    }
  };

  const handleSave = async () => {
    if (!dirtyCount) {
      toast.info('Nothing has changed.');
      return;
    }

    const payload = rows
      .filter((row) => edits[row.screen_key])
      .map((row) => ({
        id: row.id,
        url: valueOf(row).trim() || null,
        status: statusOf(row),
      }));

    setSaving(true);
    try {
      const response = await saveTutorialVideos(payload);

      if (response?.data?.success) {
        toast.success(response?.data?.data?.message || 'Tutorial videos saved.');
        await load();
      } else {
        toast.error(response?.data?.error?.message || 'Could not save.');
      }
    } catch (error) {
      reportFailure(error, 'Could not save tutorial videos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Tutorial Videos" />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">
          {rows.filter((row) => row.url).length} of {rows.length} screens have a
          video
        </span>

        <div className="grid grid-cols-3 gap-x-1 gap-y-1">
          <ButtonLoading
            onClick={() => (showForm ? closeForm() : setShowForm(true))}
            label={showForm ? 'Close' : 'Add New'}
            className="whitespace-nowrap text-center mr-0 py-1.5"
            icon={
              showForm ? (
                <FiX className="text-white text-lg ml-2 mr-2" />
              ) : (
                <FiPlus className="text-white text-lg ml-2 mr-2" />
              )
            }
          />
          <ButtonLoading
            onClick={load}
            buttonLoading={loading}
            label="Reload"
            className="whitespace-nowrap text-center mr-0 py-1.5"
            icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
          />
          <ButtonLoading
            onClick={handleSave}
            buttonLoading={saving}
            label={dirtyCount ? `Save (${dirtyCount})` : 'Save'}
            className="whitespace-nowrap text-center mr-0 py-1.5"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
          />
        </div>
      </div>

      {/* One panel for both jobs: adding by hand and correcting a row. The
          fields are the same either way, so only the wording changes. Both are
          the exception -- most screens arrive and stay correct on their own --
          so it stays folded away until asked for. */}
      {showForm ? (
        <div className="mb-4 border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
          <h3 className="mb-1 text-sm font-bold text-slate-700 dark:text-slate-100">
            {editingId ? 'Edit screen' : 'Add a screen'}
          </h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            {editingId
              ? 'Change what this row is called and where it files. The key binds it to a screen, so change that only if it is wrong.'
              : 'Only needed for a screen that never registers itself. Open the screen first and check this list — if it is already here, there is nothing to add.'}
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={labelClass}>Screen key</label>
              <input
                type="text"
                value={form.screen_key}
                placeholder="/reports/new-report"
                onChange={(e) => setForm({ ...form, screen_key: e.target.value })}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                The screen&rsquo;s route, with any record number written as
                <code className="px-1">:id</code>.
              </p>
            </div>

            <div>
              <label className={labelClass}>Title</label>
              <input
                type="text"
                value={form.title}
                placeholder="New Report"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                What this list calls it. Nothing reads it but you.
              </p>
            </div>

            <div>
              <label className={labelClass}>Group</label>
              <input
                type="text"
                value={form.group_name}
                placeholder="reports"
                list="tutorial-video-groups"
                onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                className={fieldClass}
              />
              {/* Existing groups offered rather than enforced -- a new part of
                  the app is allowed a heading of its own. */}
              <datalist id="tutorial-video-groups">
                {groupNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-slate-400">
                Leave empty to file it under the first part of the route.
              </p>
            </div>

            <div>
              <label className={labelClass}>Video URL</label>
              <input
                type="url"
                value={form.url}
                placeholder="https://www.youtube.com/watch?v=..."
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className={fieldClass}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Optional. Can be filled in later from the list.
              </p>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <div className="grid grid-cols-2 gap-x-1 gap-y-1">
              <ButtonLoading
                onClick={closeForm}
                label="Cancel"
                className="whitespace-nowrap text-center mr-0 py-1.5"
                icon={<FiX className="text-white text-lg ml-2 mr-2" />}
              />
              <ButtonLoading
                onClick={handleAdd}
                buttonLoading={adding}
                label={editingId ? 'Update' : 'Add New'}
                className="whitespace-nowrap text-center mr-0 py-1.5"
                icon={
                  editingId ? (
                    <FiEdit2 className="text-white text-lg ml-2 mr-2" />
                  ) : (
                    <FiPlus className="text-white text-lg ml-2 mr-2" />
                  )
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {loading && <Loader />}

      {/* One table for every group, not one per group.
          A table sizes its columns from its own contents, so a group whose
          screen names happen to be long pushed its URL box further right than
          the next group's -- the boxes stopped lining up down the page. A
          single fixed layout gives every row the same column edges, and the
          group names become bands inside it. */}
      {!loading && rows.length ? (
        <div className="overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] table-fixed text-sm">
              <colgroup>
                <col className="w-14" />
                <col className="w-80" />
                <col />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-20" />
              </colgroup>

              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                  <th className="px-4 py-2 text-right font-semibold">Sl.</th>
                  <th className="px-4 py-2 font-semibold">Screen</th>
                  <th className="px-4 py-2 font-semibold">Video URL</th>
                  <th className="px-4 py-2 text-center font-semibold">Show</th>
                  <th className="px-4 py-2 text-center font-semibold">Open</th>
                  <th className="px-4 py-2 text-center font-semibold">Edit</th>
                  <th className="px-4 py-2 text-center font-semibold">Remove</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {grouped.map(({ group, items, startIndex }) => (
                  <Fragment key={group}>
                    <tr className="bg-slate-50 dark:bg-gray-700/40">
                      <td
                        className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-100"
                        colSpan={7}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{humaniseGroup(group)}</span>
                          <span className="text-xs font-semibold text-slate-400">
                            {items.filter((item) => item.url).length} / {items.length}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {items.map((row, index) => {
                    const url = valueOf(row);
                    const shown = statusOf(row) === 1;

                    return (
                      <tr
                        className="transition hover:bg-slate-50 dark:hover:bg-gray-700/40"
                        key={row.screen_key}
                      >
                        <td className="px-4 py-2 text-right text-xs tabular-nums text-slate-400">
                          {startIndex + index + 1}
                        </td>

                        <td className="px-4 py-2">
                          {/* The column is a fixed width now, so anything long
                              has to wrap rather than push the layout out. */}
                          <div className="break-words font-semibold text-slate-700 dark:text-slate-100">
                            {row.title}
                          </div>
                          {/* The key is what the source is pinned to, so it is
                              shown but never editable. */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="break-all">{row.screen_key}</span>
                            {row.is_auto ? (
                              <span
                                className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-gray-700 dark:text-slate-300"
                                title="Registered automatically when this screen was first opened"
                              >
                                auto
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-2">
                          <input
                            type="url"
                            value={url}
                            placeholder="https://www.youtube.com/watch?v=..."
                            onChange={(e) => setEdit(row, { url: e.target.value })}
                            className="w-full rounded border border-slate-300 bg-transparent px-3 py-1.5 text-sm outline-none transition focus:border-primary dark:border-slate-600 dark:text-white"
                          />
                        </td>

                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setEdit(row, { status: shown ? 0 : 1 })}
                            aria-label={shown ? 'Hide this video' : 'Show this video'}
                            title={shown ? 'Hide this video' : 'Show this video'}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${
                              shown
                                ? 'bg-success/10 text-success'
                                : 'bg-slate-200 text-slate-500 dark:bg-gray-700 dark:text-slate-400'
                            }`}
                          >
                            {shown ? <FiEye /> : <FiEyeOff />}
                          </button>
                        </td>

                        <td className="px-4 py-2 text-center">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open the ${row.title} video`}
                              title={`Open the ${row.title} video`}
                              className="inline-flex h-8 w-8 items-center justify-center text-red-600 transition dark:text-red-400"
                            >
                              <FaYoutube className="text-base" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">&mdash;</span>
                          )}
                        </td>

                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            aria-label={`Edit ${row.title}`}
                            title="Edit this screen's name, group or key"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary transition hover:bg-primary/20"
                          >
                            <FiEdit2 />
                          </button>
                        </td>

                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setRemoveRow(row)}
                            aria-label={`Remove ${row.title}`}
                            title="Remove this screen from the list"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-danger/10 text-danger transition hover:bg-danger/20"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && !rows.length ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No screens are registered for tutorial videos yet.
        </p>
      ) : null}

      <ConfirmModal
        show={Boolean(removeRow)}
        title="Remove screen"
        loading={removing}
        confirmLabel="Remove"
        onCancel={() => setRemoveRow(null)}
        onConfirm={handleRemove}
        message={
          <div className="text-sm">
            <p>
              Remove <span className="font-semibold">{removeRow?.title}</span>{' '}
              and its video link from the list?
            </p>
            {/* Worth saying: a live screen simply comes back, so this is not
                the way to stop one offering a video. Clearing its URL is. */}
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              If the screen still exists in the app it will register itself again
              the next time you open it. To stop a screen offering a video,
              clear its URL instead.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default TutorialVideos;
