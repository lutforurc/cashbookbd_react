import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiList, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';

import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_ASSET_CWIP_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

/**
 * What is being built: cost gathered up until there is a thing to depreciate.
 *
 * ⚠️ A HALF-BUILT WAREHOUSE IS NOT AN ASSET YET. It has no useful life to spread
 * anything over, so nothing is depreciated — the cost sits in a balance sheet
 * head of its own until the day it is finished. On that day it becomes one asset
 * at that cost, and depreciation starts from that day. Charging earlier would
 * write down a thing nobody has used; leaving it in the heap afterwards would
 * keep a working building out of the schedule for ever.
 *
 * ⚠️ THE LINES POST NOTHING, and the screen says so where the money is typed.
 * Every bill was paid through an ordinary voucher coded to the work-in-progress
 * head, so the money is in the ledger already; writing it here as well would
 * double the cost of the building. What this buys is a heap that can be read
 * line by line rather than as one figure in a trial balance — and, on the day it
 * is finished, a capitalisation somebody can check instead of take on trust.
 *
 * ⚠️ FINISHING IT IS THE ONE ACT THAT POSTS, so it is shown leg by leg first and
 * answers to the permission that writes vouchers, not the one that keeps the
 * list.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): these are calendar dates, and going
  // through UTC moves them a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '—';
};

const today = () => asText(new Date());

const blank = () => ({
  code: '',
  name: '',
  description: '',
  project_id: '',
  cwip_coa4_id: '',
  category_id: '',
  started_on: today(),
  expected_on: '',
  notes: '',
});

const AssetCwipTab = ({ branchId }: { branchId?: number | null }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  /** The heap being read line by line, and the line being added to it. */
  const [heap, setHeap] = useState<any>(null);
  const [line, setLine] = useState<any>({ on_date: today(), description: '', vendor: '', amount: '' });

  /** The work being finished, and what the entry would be. */
  const [finishing, setFinishing] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_ASSET_CWIP_URL, {
        params: { branch_id: branchId || undefined },
      });

      setData(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read what is being built');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form?.code?.trim() || !form?.name?.trim()) {
      toast.error('It needs a code and a name.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_CWIP_URL}/store`, {
        id: form.id ?? null,
        branch_id: branchId || null,
        code: form.code,
        name: form.name,
        description: form.description || null,
        project_id: form.project_id || null,
        cwip_coa4_id: form.cwip_coa4_id || null,
        category_id: form.category_id || null,
        started_on: form.started_on || null,
        expected_on: form.expected_on || null,
        notes: form.notes || null,
      });

      toast.success(res?.data?.message || 'Saved');
      setForm(null);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save it');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: any) => {
    try {
      const res = await httpService.post(`${API_ASSET_CWIP_URL}/delete/${row.id}`, {});
      toast.success(res?.data?.message || 'Removed');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not remove it');
    }
  };

  const openHeap = async (row: any) => {
    try {
      const res = await httpService.get(`${API_ASSET_CWIP_URL}/costs/${row.id}`);
      const body = res?.data?.data?.data ?? res?.data?.data ?? {};

      setHeap({ work: row, rows: body.rows ?? [], total: body.total ?? 0 });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read what has gone into it');
    }
  };

  const addLine = async () => {
    if (!line.description.trim() || !Number(line.amount)) {
      toast.error('What was it, and how much?');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_CWIP_URL}/costs/${heap.work.id}`, {
        on_date: line.on_date,
        description: line.description,
        vendor: line.vendor || null,
        amount: line.amount,
      });

      toast.success(res?.data?.message || 'Written down', { autoClose: 6000 });
      setLine({ on_date: today(), description: '', vendor: '', amount: '' });
      openHeap(heap.work);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not write it down');
    } finally {
      setSaving(false);
    }
  };

  const removeLine = async (row: any) => {
    try {
      await httpService.post(`${API_ASSET_CWIP_URL}/costs/delete/${row.id}`, {});
      openHeap(heap.work);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not take it out');
    }
  };

  /**
   * Open the finishing panel, and ask the server what the entry would be.
   *
   * ⚠️ Asked before anything is typed. Finishing moves a cost that has been
   * sitting in the balance sheet for two years and starts depreciation running
   * — neither is something to discover afterwards.
   */
  const askFinish = async (row: any) => {
    setFinishing({
      ...row,
      capitalised_on: today(),
      // Sensible starting points, both editable: the finished thing usually
      // wants a code of its own, and almost always keeps the same name.
      asset_code: '',
      asset_name: row.name,
      location: '',
      category_id: row.category_id ?? '',
    });

    try {
      const res = await httpService.get(`${API_ASSET_CWIP_URL}/plan/${row.id}`);

      setPlan(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not work it out');
      setFinishing(null);
    }
  };

  const finish = async () => {
    if (!finishing?.asset_code?.trim()) {
      toast.error('Give the finished thing a code — it goes on the sticker.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_CWIP_URL}/capitalise/${finishing.id}`, {
        capitalised_on: finishing.capitalised_on,
        code: finishing.asset_code,
        name: finishing.asset_name,
        location: finishing.location || null,
        category_id: finishing.category_id || null,
      });

      // Held longer than a toast usually is: it says when depreciation starts,
      // which is the thing somebody wants to write down.
      toast.success(res?.data?.message || 'Done', { autoClose: 10000 });
      setFinishing(null);
      setPlan(null);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not finish it');
    } finally {
      setSaving(false);
    }
  };

  const headOptions = [
    { id: '', name: 'Not chosen' },
    ...(data?.balance_sheet_heads ?? []).map((one: any) => ({
      id: one.id,
      name: `${one.name} (${one.group_name})`,
    })),
  ];

  const categoryOptions = [
    { id: '', name: 'Not chosen' },
    ...(data?.categories ?? []).map((one: any) => ({
      id: one.id,
      name: `${one.name} — ${Number(one.rate)}%${one.has_head ? '' : ' (no asset head yet)'}`,
    })),
  ];

  const columns = [
    {
      key: 'name',
      header: 'Being built',
      render: (row: any) => (
        <div>
          <div className="text-black dark:text-white">{row.name}</div>
          <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
            {row.code}
            {row.started_on ? ` · started ${onTheDay(String(row.started_on).slice(0, 10))}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'cwip_head_name',
      header: 'Cost sits in',
      render: (row: any) => (
        <div>
          <div className="text-sm text-black dark:text-white">
            {row.cwip_head_name ?? <span className="text-danger">not chosen</span>}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            becomes {row.category_name ?? 'nothing chosen'}
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Spent so far',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <button
          type="button"
          onClick={() => openHeap(row)}
          className="text-right"
          title="What the cost is made of"
        >
          <div className="font-medium text-black dark:text-white">{money(row.total)}</div>
          <div className="text-xs text-gray-500 underline dark:text-gray-400">
            {row.lines} line(s)
          </div>
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) =>
        row.status === 'capitalised' ? (
          <span className="text-xs text-success dark:text-emerald-400">
            Finished {onTheDay(String(row.capitalised_on).slice(0, 10))}
          </span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">Being built</span>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClass: 'w-40 text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => openHeap(row)}
            aria-label="What has gone into it"
            title="What has gone into it"
            className="btn btn-sm btn-outline flex h-5 w-5 cursor-pointer items-center justify-center"
          >
            <FiList className="text-lg text-primary dark:text-secondary" />
          </button>

          {row.status === 'open' ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    id: row.id,
                    code: row.code,
                    name: row.name,
                    description: row.description ?? '',
                    project_id: row.project_id ?? '',
                    cwip_coa4_id: row.cwip_coa4_id ?? '',
                    category_id: row.category_id ?? '',
                    started_on: String(row.started_on ?? '').slice(0, 10),
                    expected_on: String(row.expected_on ?? '').slice(0, 10),
                    notes: row.notes ?? '',
                  })
                }
                className="text-xs text-gray-500 underline dark:text-gray-400"
              >
                Edit
              </button>

              {/* ⚠️ Only where a head and a category are chosen: the entry
                  needs both, and a button that refuses when pressed teaches
                  nothing. The row says which is missing. */}
              <button
                type="button"
                onClick={() => askFinish(row)}
                disabled={!row.ready}
                aria-label="Finished — bring it into use"
                title={
                  row.ready
                    ? 'Finished — bring it into use as an asset'
                    : 'Choose the head its cost sits in and what it becomes first'
                }
                className="btn btn-sm btn-outline flex h-5 w-5 cursor-pointer items-center justify-center disabled:opacity-40"
              >
                <FiCheckCircle className="text-lg text-success" />
              </button>

              {!row.lines ? (
                <button
                  type="button"
                  onClick={() => remove(row)}
                  aria-label="Remove"
                  title="Remove — nothing has been spent on it yet"
                  className="btn btn-sm btn-outline flex h-5 w-5 cursor-pointer items-center justify-center"
                >
                  <FiTrash2 className="text-lg text-red-600" />
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ),
    },
  ];

  if (loading && !data) return <Loader />;

  return (
    <div>
      <p className="mb-3 rounded border border-stroke p-2 text-xs leading-snug text-gray-500 dark:border-strokedark dark:text-gray-400">
        A thing being built is not an asset yet — it wears out from the day it is finished, not from
        the day the first brick was paid for. Its cost gathers in a balance sheet head of its own,
        and the day it is finished the whole heap becomes one asset and starts to be depreciated.{' '}
        <strong className="text-black dark:text-white">Nothing on this list is posted.</strong> The
        bills went through ordinary vouchers coded to that head; this is the record of what the cost
        is made of.
      </p>

      <div className="mb-2">
        <ButtonLoading
          onClick={() => setForm(form ? null : blank())}
          label={form ? 'Close' : 'Something new is being built'}
          icon={form ? <FiX size={16} /> : <FiPlus size={16} />}
        />
      </div>

      {form ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement
              id="cwip_code"
              name="code"
              label="Code"
              placeholder="CWIP-WH-01"
              value={form.code}
              onChange={(e: any) => setForm({ ...form, code: e.target.value })}
            />
            <div className="md:col-span-2">
              <InputElement
                id="cwip_name"
                name="name"
                label="What is being built"
                placeholder="Warehouse extension, Savar"
                value={form.name}
                onChange={(e: any) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <DropdownCommon
              id="cwip_head"
              name="cwip_coa4_id"
              label="Its cost sits in"
              data={headOptions}
              value={form.cwip_coa4_id}
              onChange={(e: any) => setForm({ ...form, cwip_coa4_id: e.target.value })}
              description="A balance sheet head — not this year's expense."
            />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
            <DropdownCommon
              id="cwip_category"
              name="category_id"
              label="What it becomes"
              data={categoryOptions}
              value={form.category_id}
              onChange={(e: any) => setForm({ ...form, category_id: e.target.value })}
              description="The rate it will then wear out at."
            />

            <InputDatePicker
              id="cwip_started"
              name="started_on"
              label="Started"
              selectedDate={asDate(form.started_on)}
              setSelectedDate={(date: Date | null) => setForm({ ...form, started_on: asText(date) })}
              setCurrentDate={() => undefined}
              className="w-full"
            />

            <div>
              <InputDatePicker
                id="cwip_expected"
                name="expected_on"
                label="Expected to finish"
                selectedDate={asDate(form.expected_on)}
                setSelectedDate={(date: Date | null) =>
                  setForm({ ...form, expected_on: asText(date) })
                }
                setCurrentDate={() => undefined}
                className="w-full"
              />
              <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Shown, never enforced.
              </p>
            </div>

            {/* Only where this company keeps projects at all. A link, never a
                dependency — see the server's note. */}
            {(data?.projects ?? []).length ? (
              <DropdownCommon
                id="cwip_project"
                name="project_id"
                label="On which project"
                data={[
                  { id: '', name: 'None' },
                  ...(data.projects ?? []).map((one: any) => ({ id: one.id, name: one.name })),
                ]}
                value={form.project_id}
                onChange={(e: any) => setForm({ ...form, project_id: e.target.value })}
                description="Optional."
              />
            ) : (
              <InputElement
                id="cwip_notes"
                name="notes"
                label="Note"
                value={form.notes ?? ''}
                onChange={(e: any) => setForm({ ...form, notes: e.target.value })}
              />
            )}
          </div>

          <div className="mt-3">
            <ButtonLoading
              onClick={save}
              buttonLoading={saving}
              icon={<FiSave className="h-5 w-5" />}
              label="Save"
              variant="primary"
            />
          </div>
        </div>
      ) : null}

      {/* What the heap is made of — the reason for keeping the list at all. */}
      {heap ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm font-medium text-black dark:text-white">
              {heap.work.name} — what has gone into it
            </div>
            <button
              type="button"
              onClick={() => setHeap(null)}
              className="text-xs text-gray-500 underline dark:text-gray-400"
            >
              Close
            </button>
          </div>

          {heap.work.status === 'open' ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
              <InputDatePicker
                id="cwip_line_on"
                name="on_date"
                label="On"
                selectedDate={asDate(line.on_date)}
                setSelectedDate={(date: Date | null) => setLine({ ...line, on_date: asText(date) })}
                setCurrentDate={() => undefined}
                className="w-full"
              />
              <div className="md:col-span-2">
                <InputElement
                  id="cwip_line_what"
                  name="description"
                  label="What was it"
                  placeholder="Foundation and piling"
                  value={line.description}
                  onChange={(e: any) => setLine({ ...line, description: e.target.value })}
                />
              </div>
              <InputElement
                id="cwip_line_vendor"
                name="vendor"
                label="By whom"
                placeholder="Rahman Construction"
                value={line.vendor}
                onChange={(e: any) => setLine({ ...line, vendor: e.target.value })}
              />
              <InputElement
                id="cwip_line_amount"
                name="amount"
                label="How much"
                type="number"
                min={0}
                value={String(line.amount ?? '')}
                onChange={(e: any) => setLine({ ...line, amount: e.target.value })}
                description="Recorded, not posted."
              />
            </div>
          ) : null}

          {heap.work.status === 'open' ? (
            <div className="mt-3">
              <ButtonLoading
                onClick={addLine}
                buttonLoading={saving}
                icon={<FiPlus className="h-5 w-5" />}
                label="Write it down"
                variant="primary"
              />
            </div>
          ) : null}

          <div className="mt-3">
            {heap.rows.length ? (
              heap.rows.map((row: any) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
                >
                  <span className="text-gray-600 dark:text-gray-300">
                    {onTheDay(String(row.on_date).slice(0, 10))} · {row.description}
                    {row.vendor ? <span className="text-gray-400"> · {row.vendor}</span> : null}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-black dark:text-white">{money(row.amount)}</span>
                    {heap.work.status === 'open' ? (
                      <button
                        type="button"
                        onClick={() => removeLine(row)}
                        className="text-gray-400 underline"
                        title="Take this line out"
                      >
                        remove
                      </button>
                    ) : null}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-1 text-xs text-gray-500 dark:text-gray-400">
                Nothing written down yet.
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold">
              <span className="text-black dark:text-white">The heap so far</span>
              <span className="text-black dark:text-white">{money(heap.total)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* ⚠️ SHOWN LEG BY LEG BEFORE IT IS DONE — the one act here that posts. */}
      {finishing ? (
        <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm font-medium text-black dark:text-white">
              Finished — bring {finishing.name} into use
            </div>
            <button
              type="button"
              onClick={() => {
                setFinishing(null);
                setPlan(null);
              }}
              className="text-xs text-gray-500 underline dark:text-gray-400"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <div>
              <InputDatePicker
                id="cwip_finished_on"
                name="capitalised_on"
                label="Finished on"
                selectedDate={asDate(finishing.capitalised_on)}
                setSelectedDate={(date: Date | null) =>
                  setFinishing({ ...finishing, capitalised_on: asText(date) })
                }
                setCurrentDate={() => undefined}
                className="w-full"
              />
              <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Depreciation starts from this day.
              </p>
            </div>

            <InputElement
              id="cwip_asset_code"
              name="asset_code"
              label="The asset's code"
              placeholder="BLD-SAVAR-01"
              value={finishing.asset_code}
              onChange={(e: any) => setFinishing({ ...finishing, asset_code: e.target.value })}
              description="What goes on the sticker."
            />

            <InputElement
              id="cwip_asset_name"
              name="asset_name"
              label="The asset's name"
              value={finishing.asset_name}
              onChange={(e: any) => setFinishing({ ...finishing, asset_name: e.target.value })}
            />

            <InputElement
              id="cwip_asset_location"
              name="location"
              label="Where it stands"
              placeholder="Savar plant"
              value={finishing.location}
              onChange={(e: any) => setFinishing({ ...finishing, location: e.target.value })}
            />
          </div>

          {plan ? (
            <div className="mt-3 rounded border border-stroke p-3 text-sm dark:border-strokedark">
              <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {plan.lines} line(s) of cost ·{' '}
                <strong className="text-black dark:text-white">{money(plan.total)}</strong> becomes
                the cost of one asset
              </div>

              {(plan.legs ?? []).map((leg: any, index: number) => (
                <div
                  key={`${leg.coa4_id}-${index}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
                >
                  <span className="text-gray-600 dark:text-gray-300">
                    {leg.head ?? leg.coa4_id}{' '}
                    <span className="text-gray-400">{leg.note ? `· ${leg.note}` : ''}</span>
                  </span>
                  <span className="font-medium text-black dark:text-white">
                    {Number(leg.debit) ? `Dr ${money(leg.debit)}` : `Cr ${money(leg.credit)}`}
                  </span>
                </div>
              ))}

              {!plan.ready ? (
                <p className="mt-2 rounded border border-amber-400 bg-amber-50 p-2 text-xs leading-snug text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
                  Not ready yet — it needs a work-in-progress head, a category to become, and at
                  least one line of cost.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3">
            <ButtonLoading
              onClick={finish}
              buttonLoading={saving}
              icon={<FiCheckCircle className="h-5 w-5" />}
              label="Bring it into use"
              variant="primary"
              disabled={!plan?.ready}
            />
          </div>
        </div>
      ) : null}

      <Table
        columns={columns}
        data={data?.rows ?? []}
        noDataMessage="Nothing being built. Add one when a building, a fit-out or a machine starts costing money before it can be used."
      />
    </div>
  );
};

export default AssetCwipTab;
