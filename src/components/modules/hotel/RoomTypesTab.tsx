import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import ActionButtons from '../../utils/fields/ActionButton';

import SetupShell from './SetupShell';
import { roomTypeDelete, roomTypeList, roomTypeSave } from './hotelSetupSlice';
import { HotelRoomType, SaleMode } from './types';
import {
  SALE_MODE_OPTIONS,
  STATUS_OPTIONS,
  blankRoomType,
  money,
  needsSeatRent,
  needsWholeRent,
  numberOrNull,
} from './setupHelpers';

/**
 * Room categories -- Standard, Deluxe, Suite, Dormitory.
 *
 * Every rent on this tab is a SUGGESTION. It is copied into the room form when
 * a type is chosen, and from that moment the room owns its own number: rooms
 * 101 and 102 can both be Deluxe and cost different money, which is exactly why
 * the price lives on the room.
 *
 * So changing 3,000 to 3,500 here reprices nothing. That is the point rather
 * than a shortcoming -- a type whose rent WAS the price would silently reprice
 * a whole hotel the moment somebody corrected a typo in it, and every bill
 * already printed against those rooms would stop reconciling. The screen says
 * so out loud, because somebody editing this number is very often trying to do
 * exactly the thing it will not do.
 */
const RoomTypesTab = ({ branchId }: { branchId: number }) => {
  const dispatch = useDispatch<any>();
  const { roomTypes, loading, saving } = useSelector((state: any) => state.hotelSetup);

  const [page, setPage] = useState(1);
  const [form, setForm] = useState<HotelRoomType | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(() => {
    dispatch(roomTypeList({ branch_id: branchId, page, per_page: 10 }));
  }, [dispatch, branchId, page]);

  useEffect(() => {
    setPage(1);
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field: keyof HotelRoomType) => (e: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));

  const saleMode: SaleMode = (form?.default_sale_mode ?? 'whole') as SaleMode;

  const handleSave = async () => {
    if (!form) return;

    if (!form.name?.trim()) {
      toast.error('The room type needs a name');
      return;
    }

    try {
      const result = await dispatch(
        roomTypeSave({
          ...form,
          branch_id: branchId,
          capacity: Number(form.capacity) || 1,
          default_seat_count: Number(form.default_seat_count) || 1,
          // Left empty stays empty rather than becoming a zero: a dormitory
          // never sold whole has no whole-room price, and a zero would read as
          // free on the first bill that used it.
          default_whole_rent: numberOrNull(form.default_whole_rent),
          default_seat_rent: numberOrNull(form.default_seat_rent),
        }),
      ).unwrap();

      // The server says whether any rooms were left at their own rent. That
      // sentence is the whole answer here and is shown as it arrived.
      toast.success(result.message, { autoClose: 6000 });
      setForm(form.id ? null : blankRoomType());
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await dispatch(roomTypeDelete(id)).unwrap();
      toast.success(result.message);
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const columns = useMemo(
    () => [
      { key: 'serial_no', header: '#', headerClass: 'w-14 text-center', cellClass: 'text-center' },
      { key: 'name', header: 'Room type' },
      {
        key: 'capacity',
        header: 'Holds',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => `${row.capacity} guest${Number(row.capacity) === 1 ? '' : 's'}`,
      },
      {
        key: 'default_sale_mode',
        header: 'Sold',
        render: (row: any) =>
          SALE_MODE_OPTIONS.find((o) => o.id === row.default_sale_mode)?.name ?? row.default_sale_mode,
      },
      {
        key: 'default_seat_count',
        header: 'Beds',
        headerClass: 'text-center',
        cellClass: 'text-center',
      },
      {
        key: 'default_whole_rent',
        header: 'Whole room',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => money(row.default_whole_rent),
      },
      {
        key: 'default_seat_rent',
        header: 'Per seat',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => money(row.default_seat_rent),
      },
      {
        key: 'rooms_count',
        header: 'Rooms',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => row.rooms_count ?? 0,
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
            handleEdit={(r: any) => setForm({ ...r })}
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
      noun="Room Type"
      note="These rents fill the room form in. They are not prices — each room keeps its own, so editing a type here never repriced a room that already exists."
      formOpen={form !== null}
      editing={!!form?.id}
      onNew={() => setForm(blankRoomType())}
      onCancel={() => setForm(null)}
      onSave={handleSave}
      saving={saving}
      form={
        form && (
          <>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <InputElement
                id="type_name"
                name="name"
                label="Room type"
                placeholder="Deluxe"
                value={form.name}
                onChange={set('name')}
              />
              <InputElement
                id="type_code"
                name="code"
                label="Short code"
                placeholder="DLX"
                value={form.code ?? ''}
                onChange={set('code')}
              />
              <InputElement
                id="capacity"
                name="capacity"
                label="Holds (guests)"
                type="number"
                min={1}
                title="Going over this warns at the desk; it never blocks a booking. A clerk who cannot record the extra mattress records a smaller number instead, which destroys the very figure this is kept for."
                value={String(form.capacity ?? 1)}
                onChange={set('capacity')}
              />
              <DropdownCommon
                id="type_status"
                name="status"
                label="Status"
                data={STATUS_OPTIONS}
                value={String(form.status)}
                onChange={set('status')}
              />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
              <DropdownCommon
                id="default_sale_mode"
                name="default_sale_mode"
                label="How it is sold"
                data={SALE_MODE_OPTIONS}
                value={saleMode}
                onChange={set('default_sale_mode')}
              />
              <InputElement
                id="default_seat_count"
                name="default_seat_count"
                label="Beds in the room"
                type="number"
                min={1}
                title="How many seat rows a new room of this type is split into. The seat is what a booking actually locks, so a four-bed room is four of them."
                value={String(form.default_seat_count ?? 1)}
                onChange={set('default_seat_count')}
              />
              <InputElement
                id="default_whole_rent"
                name="default_whole_rent"
                label="Whole room, per night"
                type="number"
                min={0}
                placeholder={needsWholeRent(saleMode) ? '3000' : 'Not sold whole'}
                disabled={!needsWholeRent(saleMode)}
                value={String(form.default_whole_rent ?? '')}
                onChange={set('default_whole_rent')}
              />
              <InputElement
                id="default_seat_rent"
                name="default_seat_rent"
                label="One seat, per night"
                type="number"
                min={0}
                placeholder={needsSeatRent(saleMode) ? '500' : 'Not sold by the seat'}
                disabled={!needsSeatRent(saleMode)}
                title="Not the room rent divided by the beds. What one bed sells for is a commercial decision of its own."
                value={String(form.default_seat_rent ?? '')}
                onChange={set('default_seat_rent')}
              />
            </div>

            <div className="mt-2">
              <InputElement
                id="type_description"
                name="description"
                label="Description"
                placeholder="Optional"
                value={form.description ?? ''}
                onChange={set('description')}
              />
            </div>

            {form.id && Number(form.rooms_count ?? 0) > 0 ? (
              <p className="mt-2 text-xs leading-snug text-warning">
                {form.rooms_count} room(s) are already this type. They keep their own rent and
                capacity — change those on the Rooms tab.
              </p>
            ) : null}
          </>
        )
      }
      columns={columns}
      rows={roomTypes?.data ?? []}
      loading={loading}
      emptyMessage="No room types yet. Add the kinds of room this property has — Standard, Deluxe, Dormitory."
      page={page}
      totalPages={Math.ceil((roomTypes?.total ?? 0) / (roomTypes?.per_page || 10))}
      onPageChange={setPage}
    />
  );
};

export default RoomTypesTab;
