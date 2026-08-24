import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import ActionButtons from '../../utils/fields/ActionButton';
import SearchInput from '../../utils/fields/SearchInput';

import SetupShell from './SetupShell';
import SeatEditor from './SeatEditor';
import {
  buildingDdl,
  clearEditingResource,
  floorDdl,
  resourceDelete,
  resourceEdit,
  resourceKinds,
  resourceList,
  resourceSave,
  roomTypeDdl,
} from './hotelSetupSlice';
import { DdlOption, HotelResource, SaleMode } from './types';
import {
  SALE_MODE_OPTIONS,
  STATUS_OPTIONS,
  blankRoom,
  money,
  needsSeatRent,
  needsWholeRent,
  numberOrNull,
  useDebounced,
} from './setupHelpers';

/**
 * Rooms, and the beds inside them.
 *
 * The rule that shapes this whole screen: the SEAT is the inventory, not the
 * room. A four-bed dormitory is four rows pointing at their room, and selling
 * the room whole is booking all four in one booking. Whole-room availability is
 * derived from the beds rather than counted beside them, so the two numbers can
 * never disagree -- and the day they did would be a double booking with nothing
 * on screen to say which count was right.
 *
 * Which is why the form asks for a bed count rather than offering a seat
 * screen: saving a room writes its beds with it, in one go. There is no way to
 * end up with a room the availability query cannot see.
 *
 * Cutting the bed count switches the spare beds OFF; it never deletes them.
 * Raising it again revives those same numbered rows. That is what keeps a stay
 * recorded against "seat 3" in July still reading as seat 3 in December.
 */
const RoomsTab = ({ branchId, branchName }: { branchId: number; branchName?: string }) => {
  const dispatch = useDispatch<any>();
  const {
    resources,
    buildingOptions,
    floorOptions,
    roomTypeOptions,
    kinds,
    editingResource,
    loading,
    saving,
  } = useSelector((state: any) => state.hotelSetup);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [form, setForm] = useState<HotelResource | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const debouncedSearch = useDebounced(search);

  // The Layout tab hands a room over through the URL. Honoured once and then
  // cleared, so that a later Close does not have the room spring back open on
  // the next render.
  const [params, setParams] = useSearchParams();
  const handedOver = params.get('room');

  useEffect(() => {
    if (!handedOver) return;

    dispatch(resourceEdit(Number(handedOver)));

    const next = new URLSearchParams(params);
    next.delete('room');
    setParams(next, { replace: true });
  }, [handedOver]);

  const load = useCallback(() => {
    dispatch(
      resourceList({
        branch_id: branchId,
        page,
        per_page: 10,
        q: debouncedSearch,
        building_id: buildingFilter || undefined,
      }),
    );
  }, [dispatch, branchId, page, debouncedSearch, buildingFilter]);

  useEffect(() => {
    dispatch(resourceKinds());
  }, [dispatch]);

  useEffect(() => {
    dispatch(buildingDdl({ branch_id: branchId }));
    dispatch(roomTypeDdl({ branch_id: branchId }));
    setBuildingFilter('');
    setPage(1);
  }, [dispatch, branchId]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  // The floor list belongs to one building, so it is fetched when that changes
  // -- and emptied first, so a floor from the previous block cannot linger in
  // the list long enough to be chosen.
  useEffect(() => {
    if (form?.building_id) {
      dispatch(floorDdl({ building_id: form.building_id }));
    }
  }, [dispatch, form?.building_id]);

  // An edit arrives from the server with its beds attached; the form is filled
  // from that rather than from the table row, which carries only counts.
  useEffect(() => {
    if (!editingResource) return;

    setForm({
      ...editingResource,
      seat_count: editingResource.seats?.filter((s: any) => Number(s.status) === 1).length || 1,
      seat_rent: '',
    });
  }, [editingResource]);

  const asChoices = (options: DdlOption[]) =>
    (options ?? []).map((o) => ({ id: o.value, name: o.label }));

  const buildingChoices = useMemo(() => asChoices(buildingOptions), [buildingOptions]);
  const floorChoices = useMemo(() => asChoices(floorOptions), [floorOptions]);
  const roomTypeChoices = useMemo(() => asChoices(roomTypeOptions), [roomTypeOptions]);

  const kindChoices = useMemo(
    () => (kinds ?? []).map((k: any) => ({ id: k.id, name: k.name })),
    [kinds],
  );

  const roomKind = useMemo(() => (kinds ?? []).find((k: any) => k.code === 'room'), [kinds]);

  /** True while the form is describing a room, as opposed to a hall or a ticket. */
  const isRoom = useMemo(
    () => (kinds ?? []).find((k: any) => k.id === Number(form?.resource_type_id))?.code === 'room',
    [kinds, form?.resource_type_id],
  );

  const saleMode: SaleMode = (form?.sale_mode ?? 'whole') as SaleMode;

  const set = (field: keyof HotelResource) => (e: any) =>
    setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));

  const openNew = () => {
    dispatch(clearEditingResource());
    setForm({
      ...blankRoom(roomKind?.id ?? null),
      building_id: buildingFilter ? Number(buildingFilter) : null,
    });
  };

  const closeForm = () => {
    dispatch(clearEditingResource());
    setForm(null);
  };

  /**
   * Choosing a room type fills the form in from its defaults.
   *
   * Only the fields the clerk has not already typed into would be worth
   * protecting, and they are not: picking a type is a deliberate act that means
   * "start from this". Anything filled in stays overwritable afterwards, which
   * is the whole reason the rent lives on the room.
   */
  const chooseRoomType = (id: string) => {
    const chosen = (roomTypeOptions ?? []).find((o: DdlOption) => String(o.value) === id);

    setForm((prev) => {
      if (!prev) return prev;

      if (!chosen) return { ...prev, room_type_id: null };

      return {
        ...prev,
        room_type_id: chosen.value,
        capacity: chosen.capacity ?? prev.capacity,
        sale_mode: (chosen.default_sale_mode ?? prev.sale_mode) as SaleMode,
        seat_count: chosen.default_seat_count ?? prev.seat_count,
        rent: chosen.default_whole_rent ?? '',
        seat_rent: chosen.default_seat_rent ?? '',
      };
    });
  };

  const handleSave = async () => {
    if (!form) return;

    if (!form.resource_type_id) {
      toast.error('Choose what kind of resource this is');
      return;
    }

    if (!form.building_id) {
      toast.error('Choose which building it is in');
      return;
    }

    if (!form.code?.trim()) {
      toast.error('The room needs a number');
      return;
    }

    // Checked here as well as on the server. The server is the one that counts
    // -- a request can arrive from anywhere -- but a message that appears the
    // moment the field is wrong beats one that appears after a round trip.
    if (isRoom && needsWholeRent(saleMode) && numberOrNull(form.rent) === null) {
      toast.error('This room is sold whole, so it needs a whole-room rent');
      return;
    }

    if (isRoom && needsSeatRent(saleMode) && numberOrNull(form.seat_rent) === null && !form.id) {
      toast.error('This room is sold by the seat, so its beds need a rent');
      return;
    }

    try {
      const result = await dispatch(
        resourceSave({
          ...form,
          branch_id: branchId,
          capacity: Number(form.capacity) || 1,
          rent: numberOrNull(form.rent),
          seat_count: isRoom ? Number(form.seat_count) || 1 : undefined,
          seat_rent: isRoom ? numberOrNull(form.seat_rent) : undefined,
        }),
      ).unwrap();

      toast.success(result.message);

      if (form.id) {
        // Stay on the room and re-read it, so the seat list underneath shows
        // what the save actually did to the beds.
        dispatch(resourceEdit(form.id));
      } else {
        // Rooms are added in a run -- 101, 102, 103. The building, floor, type
        // and rents are kept and only the number is cleared.
        setForm({ ...form, id: undefined, code: '', name: '', seats: [] });
      }

      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const result = await dispatch(resourceDelete(id)).unwrap();
      toast.success(result.message);
      if (form?.id === id) closeForm();
      load();
    } catch (error: any) {
      toast.error(String(error));
    }
  };

  const columns = useMemo(
    () => [
      { key: 'serial_no', header: '#', headerClass: 'w-14 text-center', cellClass: 'text-center' },
      {
        key: 'display_name',
        header: 'Room',
        render: (row: any) => (
          <div>
            <div className="font-medium text-black dark:text-white">{row.display_name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {row.type?.name}
              {row.room_type?.name ? ` · ${row.room_type.name}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'location',
        header: 'Where',
        render: (row: any) => (
          <div className="text-xs">
            <div>{row.building?.name ?? '—'}</div>
            {/* No floor is a real answer, not a gap: cottages have none. */}
            <div className="text-gray-500 dark:text-gray-400">{row.floor?.name ?? 'no floor'}</div>
          </div>
        ),
      },
      {
        key: 'sale_mode',
        header: 'Sold',
        render: (row: any) =>
          SALE_MODE_OPTIONS.find((o) => o.id === row.sale_mode)?.name ?? row.sale_mode,
      },
      {
        key: 'rent',
        header: 'Whole room',
        headerClass: 'text-right',
        cellClass: 'text-right',
        render: (row: any) => money(row.rent),
      },
      {
        key: 'seats',
        header: 'Beds',
        headerClass: 'text-center',
        cellClass: 'text-center',
        render: (row: any) => {
          const active = row.active_seats_count ?? 0;
          const all = row.seats_count ?? 0;

          return (
            <span title={all > active ? `${all - active} switched off, kept for older bookings` : undefined}>
              {active}
              {all > active ? <span className="text-gray-400"> / {all}</span> : null}
            </span>
          );
        },
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
            handleEdit={(r: any) => dispatch(resourceEdit(r.id))}
            showDelete
            handleDelete={handleDelete}
            showConfirmId={confirmId}
            setShowConfirmId={setConfirmId}
          />
        ),
      },
    ],
    [confirmId, form?.id],
  );

  return (
    <SetupShell
      noun="Room"
      note={`Every room is split into beds, because a bed is what a booking locks. Selling a room whole is booking all of its beds at once — there is no second count to keep in step.${branchName ? ` Setting up: ${branchName}.` : ''}`}
      toolbar={
        <>
          <SearchInput search={search} setSearchValue={setSearch} className="w-56" />
          <div className="w-52">
            <DropdownCommon
              id="room_building_filter"
              name="room_building_filter"
              label="Building"
              data={[{ id: '', name: 'All buildings' }, ...buildingChoices]}
              value={buildingFilter}
              onChange={(e: any) => {
                setBuildingFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </>
      }
      formOpen={form !== null}
      editing={!!form?.id}
      onNew={openNew}
      onCancel={closeForm}
      onSave={handleSave}
      saving={saving}
      form={
        form && (
          <>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <DropdownCommon
                id="resource_type_id"
                name="resource_type_id"
                label="Kind"
                data={[{ id: '', name: 'Choose' }, ...kindChoices]}
                value={form.resource_type_id ? String(form.resource_type_id) : ''}
                onChange={(e: any) =>
                  setForm({
                    ...form,
                    resource_type_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
                description="A seat is not on this list — beds are made by splitting a room."
              />
              <DropdownCommon
                id="room_building_id"
                name="building_id"
                label="Building"
                data={[{ id: '', name: 'Choose a building' }, ...buildingChoices]}
                value={form.building_id ? String(form.building_id) : ''}
                onChange={(e: any) =>
                  setForm({
                    ...form,
                    building_id: e.target.value ? Number(e.target.value) : null,
                    // The floor belonged to the old building. Clearing it is
                    // what stops a room claiming to be on the annexe's first
                    // floor while sitting in the main block.
                    floor_id: null,
                  })
                }
              />
              <DropdownCommon
                id="room_floor_id"
                name="floor_id"
                label="Floor"
                data={[{ id: '', name: 'No floor' }, ...floorChoices]}
                value={form.floor_id ? String(form.floor_id) : ''}
                onChange={(e: any) =>
                  setForm({ ...form, floor_id: e.target.value ? Number(e.target.value) : null })
                }
                description="Optional — cottages have none."
              />
              <DropdownCommon
                id="room_type_id"
                name="room_type_id"
                label="Room type"
                data={[{ id: '', name: 'None' }, ...roomTypeChoices]}
                value={form.room_type_id ? String(form.room_type_id) : ''}
                onChange={(e: any) => chooseRoomType(e.target.value)}
                description="Fills the rest in. Everything it fills stays editable."
              />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
              <InputElement
                id="room_code"
                name="code"
                label="Room number"
                placeholder="101"
                title="Its own number, not 'ANX-101'. Two buildings both having a 101 is ordinary — the screens build the full name from the building."
                value={form.code}
                onChange={set('code')}
              />
              <InputElement
                id="room_name"
                name="name"
                label="Name"
                placeholder="Only if it has one — Rose Hall"
                value={form.name ?? ''}
                onChange={set('name')}
              />
              <InputElement
                id="room_capacity"
                name="capacity"
                label="Holds (guests)"
                type="number"
                min={1}
                title="Over capacity warns at the desk; it never blocks."
                value={String(form.capacity ?? 1)}
                onChange={set('capacity')}
              />
              <DropdownCommon
                id="room_status"
                name="status"
                label="Status"
                data={STATUS_OPTIONS}
                value={String(form.status)}
                onChange={set('status')}
              />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
              <DropdownCommon
                id="room_sale_mode"
                name="sale_mode"
                label="How it is sold"
                data={SALE_MODE_OPTIONS}
                value={saleMode}
                onChange={set('sale_mode')}
                className={isRoom ? '' : 'pointer-events-none opacity-60'}
              />
              <InputElement
                id="room_rent"
                name="rent"
                label={isRoom ? 'Whole room, per night' : 'Rent'}
                type="number"
                min={0}
                placeholder={needsWholeRent(saleMode) || !isRoom ? '3000' : 'Not sold whole'}
                disabled={isRoom && !needsWholeRent(saleMode)}
                value={String(form.rent ?? '')}
                onChange={set('rent')}
              />
              <InputElement
                id="room_seat_count"
                name="seat_count"
                label="Beds in the room"
                type="number"
                min={1}
                disabled={!isRoom}
                title="Lowering this switches the spare beds off; it never deletes them. Raising it again brings the same numbered beds back."
                value={String(form.seat_count ?? 1)}
                onChange={set('seat_count')}
              />
              <InputElement
                id="room_seat_rent"
                name="seat_rent"
                label="Rent for a new bed"
                type="number"
                min={0}
                placeholder={needsSeatRent(saleMode) ? '500' : 'Not sold by the seat'}
                disabled={!isRoom || !needsSeatRent(saleMode)}
                title="What a bed added from here starts at. Beds already priced keep their own — set those in the list below."
                value={String(form.seat_rent ?? '')}
                onChange={set('seat_rent')}
              />
            </div>

            {isRoom && form.id ? (
              <div className="mt-4 rounded border border-stroke p-3 dark:border-strokedark">
                <div className="mb-2 text-sm font-medium text-black dark:text-white">
                  Beds in {form.display_name ?? `room ${form.code}`}
                </div>
                <SeatEditor
                  seats={editingResource?.seats ?? []}
                  onSaved={() => {
                    dispatch(resourceEdit(form.id!));
                    load();
                  }}
                />
              </div>
            ) : null}

            {isRoom && !form.id ? (
              <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
                The beds are written when the room is saved. Reopen the room afterwards to price any
                of them on its own.
              </p>
            ) : null}
          </>
        )
      }
      columns={columns}
      rows={resources?.data ?? []}
      loading={loading}
      emptyMessage="No rooms yet. Add a building and a room type first, then the rooms."
      page={page}
      totalPages={Math.ceil((resources?.total ?? 0) / (resources?.per_page || 10))}
      onPageChange={setPage}
    />
  );
};

export default RoomsTab;
