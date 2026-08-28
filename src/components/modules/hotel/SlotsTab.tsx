import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import ActionButtons from '../../utils/fields/ActionButton';

import SetupShell from './SetupShell';
import { slotDelete, slotList, slotSave } from './hotelSetupSlice';
import { HotelSlot } from './types';
import { STATUS_OPTIONS, blankSlot } from './setupHelpers';

/**
 * How a hall is sold: the parts of a day it is let for.
 *
 * A room goes by the NIGHT. A hall goes by the SLOT — a seminar takes the
 * morning, a wedding the evening, and the same hall earns twice on one date.
 *
 * ⚠️ THE HOURS ARE THE ONLY REAL PROTECTION, and it is worth knowing why this
 * tab is fussy about them. The database stops a hall being sold twice for one
 * date AND slot; it cannot stop two SLOTS that overlap in the clock from both
 * being sold, because their ids differ and the key is satisfied. An afternoon
 * of 3–8 beside an evening of 7–12 is a wedding on top of a seminar, and no
 * index will ever see it. The server refuses that pair when the slots are
 * written, which is the only moment anybody can.
 *
 * Touching is not overlapping: 09:00–14:00 followed by 14:00–18:00 is exactly
 * how a property that lets its hall twice a day works.
 *
 * ⚠️ A slot that has been sold cannot have its hours moved. A guest holding it
 * bought those hours, and moving them can drop the sitting on top of one sold
 * separately — the clash this screen exists to prevent, arriving by the back
 * door. Set it inactive and add the new sitting beside it.
 */
const SlotsTab = ({ branchId }: { branchId: number }) => {
  const dispatch = useDispatch<any>();
  const { slots, loading, saving } = useSelector((state: any) => state.hotelSetup);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form, setForm] = useState<HotelSlot | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(() => {
    dispatch(
      slotList({
        branch_id: branchId,
        page,
        per_page: 10,
        status: statusFilter === '' ? undefined : statusFilter,
      }),
    );
  }, [dispatch, branchId, page, statusFilter]);

  useEffect(() => {
    setStatusFilter('');
    setPage(1);
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field: keyof HotelSlot) => (e: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));

  const handleSave = async () => {
    if (!form) return;

    if (!form.code?.trim()) {
      toast.error('The slot needs a short code — morning, evening');
      return;
    }

    if (!form.name?.trim()) {
      toast.error('The slot needs a name the desk will recognise');
      return;
    }

    if (!form.start_time || !form.end_time) {
      toast.error('A sitting needs a start and an end');
      return;
    }

    try {
      const result = await dispatch(slotSave({ ...form, branch_id: branchId })).unwrap();
      toast.success(result.message);
      setForm(null);
      load();
    } catch (error: any) {
      // The server's own sentence, which names the sitting these hours run
      // into. A replacement here would say only "could not save".
      toast.error(String(error));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await dispatch(slotDelete(id)).unwrap();
      toast.success(result.message);
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const columns = useMemo(
    () => [
      { key: 'serial_no', header: '#', headerClass: 'w-14 text-center', cellClass: 'text-center' },
      { key: 'name', header: 'Sitting' },
      {
        key: 'code',
        header: 'Code',
        render: (row: any) => (
          <span className="text-gray-500 dark:text-gray-400">{row.code}</span>
        ),
      },
      {
        key: 'hours',
        header: 'Hours',
        render: (row: any) => (
          <span className="text-black dark:text-white">
            {String(row.start_time ?? '').slice(0, 5)}–{String(row.end_time ?? '').slice(0, 5)}
            {/* An evening that runs to one in the morning ends before it
                starts, and the reader has to be told rather than left to
                work it out from two times. */}
            {Number(row.ends_next_day) === 1 ? (
              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">next day</span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'sort_order',
        header: 'Order',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => row.sort_order ?? 0,
      },
      {
        key: 'status',
        header: 'Status',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) =>
          Number(row.status) === 1 ? (
            <span className="text-success">Active</span>
          ) : (
            <span className="text-gray-400">Inactive</span>
          ),
      },
      {
        key: 'action',
        header: 'Action',
        headerClass: 'text-center w-28',
        cellClass: 'text-center',
        render: (row: any) => (
          <ActionButtons
            row={row}
            showEdit
            handleEdit={(r: any) =>
              setForm({
                ...r,
                // TIME columns answer 18:00:00; the input wants 18:00.
                start_time: String(r.start_time ?? '').slice(0, 5),
                end_time: String(r.end_time ?? '').slice(0, 5),
                ends_next_day: Number(r.ends_next_day) === 1,
              })
            }
            showDelete
            handleDelete={handleDelete}
            showConfirmId={confirmId}
            setShowConfirmId={setConfirmId}
          />
        ),
      },
    ],
    [confirmId],
  );

  return (
    <SetupShell
      noun="Sitting"
      note="Only halls and community centres use these — rooms are sold by the night. Two sittings may not share an hour, or one hall could hold two events at once."
      toolbar={
        <div className="w-44">
          <DropdownCommon
            id="slot_status_filter"
            name="slot_status_filter"
            label="Status"
            data={[{ id: '', name: 'All' }, ...STATUS_OPTIONS]}
            value={statusFilter}
            onChange={(e: any) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      }
      formOpen={form !== null}
      editing={!!form?.id}
      onAdd={() => setForm(blankSlot())}
      onCancel={() => setForm(null)}
      onSave={handleSave}
      saving={saving}
      loading={loading}
      rows={slots?.data ?? []}
      columns={columns}
      total={slots?.total ?? 0}
      page={slots?.current_page ?? page}
      perPage={slots?.per_page ?? 10}
      onPage={setPage}
      emptyMessage="No sittings yet. A property that lets a hall needs at least one — an evening, usually."
      fields={
        form ? (
          <>
            <InputElement
              id="slot_name"
              name="name"
              label="Sitting"
              placeholder="Evening"
              value={form.name}
              onChange={set('name')}
            />

            <InputElement
              id="slot_code"
              name="code"
              label="Code"
              placeholder="evening"
              value={form.code}
              onChange={set('code')}
            />

            <InputElement
              id="slot_start"
              name="start_time"
              label="Starts"
              type="time"
              value={form.start_time}
              onChange={set('start_time')}
            />

            <InputElement
              id="slot_end"
              name="end_time"
              label="Ends"
              type="time"
              value={form.end_time}
              onChange={set('end_time')}
            />

            {/* A sitting that runs past midnight ends before it starts on the
                clock. Without this the server can only read it as a mistake. */}
            <DropdownCommon
              id="slot_ends_next_day"
              name="ends_next_day"
              label="Ends"
              data={[
                { id: 0, name: 'Same day' },
                { id: 1, name: 'After midnight' },
              ]}
              value={form.ends_next_day ? 1 : 0}
              onChange={(e: any) =>
                setForm((prev) => (prev ? { ...prev, ends_next_day: Number(e.target.value) === 1 } : prev))
              }
            />

            <InputElement
              id="slot_sort_order"
              name="sort_order"
              label="Order"
              type="number"
              value={form.sort_order}
              onChange={set('sort_order')}
            />

            <DropdownCommon
              id="slot_status"
              name="status"
              label="Status"
              data={STATUS_OPTIONS}
              value={form.status}
              onChange={set('status')}
            />
          </>
        ) : null
      }
    />
  );
};

export default SlotsTab;
