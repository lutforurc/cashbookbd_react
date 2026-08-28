import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import ActionButtons from '../../utils/fields/ActionButton';
import SearchInput from '../../utils/fields/SearchInput';
import Checkbox from '../../utils/fields/Checkbox';
import ToggleSwitch from '../../utils/fields/ToggleSwitch';
import { FIELD_TEXTAREA, FIELD_LABEL, FIELD_HELP } from '../../../theme/fieldStyles';

import SetupShell from './SetupShell';
import SeatEditor from './SeatEditor';
import {
  buildingDdl,
  clearEditingResource,
  facilityDdl,
  floorDdl,
  resourceDelete,
  resourceEdit,
  resourceKinds,
  resourceList,
  resourceBulkSave,
  resourceSave,
  roomTypeDdl,
} from './hotelSetupSlice';
import { DdlOption, HotelResource, SaleMode } from './types';
import {
  SALE_MODE_OPTIONS,
  STATUS_OPTIONS,
  blankRoom,
  facilityFits,
  money,
  needsSeatRent,
  needsWholeRent,
  numberOrNull,
  runOfCodes,
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
 *
 * The same form describes ONE room or a whole floor of them. Rooms on a floor
 * differ only in their number -- same type, same rent, same beds -- so ticking
 * "Add a run" swaps the Name field for a count and leaves everything else
 * exactly where it was. A second screen for it would have been the same fields
 * twice, and the copy that drifts.
 */
const RoomsTab = ({ branchId, branchName }: { branchId: number; branchName?: string }) => {
  const dispatch = useDispatch<any>();
  const {
    resources,
    buildingOptions,
    floorOptions,
    roomTypeOptions,
    facilityOptions,
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

  // The run. Kept across saves rather than reset with the form, because a
  // property is set up floor after floor and unticking the box between each
  // one would be the click the feature was added to remove.
  const [several, setSeveral] = useState(false);
  const [count, setCount] = useState('4');

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
    // ⚠️ No branch_id, and asked for in full rather than per kind: the tick
    // list is the COMPANY's, and the form switches between a bedroom's and a
    // hall's the moment the Kind dropdown changes. A second request for that
    // would put a blank list on screen for as long as it took to answer.
    dispatch(facilityDdl());
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

    // A run makes one room after another; there is nothing to make when a room
    // that already exists is opened.
    setSeveral(false);

    setForm({
      ...editingResource,
      seat_count: editingResource.seats?.filter((s: any) => Number(s.status) === 1).length || 1,
      seat_rent: '',
      // ⚠️ From the ids the server sends beside the rows, never mapped back
      // from the names -- that map is the one that goes wrong the day two
      // facilities are worded alike. An older answer without them leaves the
      // ticks empty rather than undefined, so a save then clears the list it
      // could not show; see the note on facility_ids in types.ts.
      facility_ids:
        (editingResource as any).facility_ids ??
        (editingResource.facilities ?? []).map((f: any) => f.id),
      description: editingResource.description ?? '',
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

  /**
   * Which tick list this is -- a bedroom's or a hall's.
   *
   * ⚠️ Read off the KIND, never guessed from the sale mode or a missing bed
   * count. A community centre is a hall for this purpose even though its code
   * is not "hall", and a ticketed item is neither -- which is why an unknown
   * kind shows the whole list rather than an empty one. See facilityFits.
   */
  const facilityKind = useMemo(() => {
    const code = (kinds ?? []).find((k: any) => k.id === Number(form?.resource_type_id))?.code;

    if (code === 'room') return 'room';
    if (code === 'hall' || code === 'community_centre') return 'hall';

    return null;
  }, [kinds, form?.resource_type_id]);

  /**
   * The tick boxes to draw, in the list's own order.
   *
   * A projector is not a bedroom facility and a wardrobe is not a hall one; a
   * form offering all of both is a list nobody reads to the end. Anything
   * marked "either" is on both lists, which is most of them.
   */
  const facilityChoices = useMemo(
    () => (facilityOptions ?? []).filter((f: any) => facilityFits(f.applies_to, facilityKind)),
    [facilityOptions, facilityKind],
  );

  const ticked = form?.facility_ids ?? [];

  /**
   * ⚠️ Ticks are toggled, never rebuilt from what is on screen. The list drawn
   * is filtered by kind, so rebuilding it from the boxes would drop every
   * facility the current kind does not offer -- and switching a room to a hall
   * and back would quietly strip its wardrobe and its television.
   */
  const toggleFacility = (id: number) =>
    setForm((prev) => {
      if (!prev) return prev;

      const held = prev.facility_ids ?? [];

      return {
        ...prev,
        facility_ids: held.includes(id) ? held.filter((one) => one !== id) : [...held, id],
      };
    });

  const saleMode: SaleMode = (form?.sale_mode ?? 'whole') as SaleMode;

  /** Making a run, as opposed to one room. Never true over a room that exists. */
  const bulk = several && !form?.id;

  // Empty where the first number is one nothing can be counted from -- which is
  // shown as a sentence rather than as a preview of nothing.
  const run = useMemo(
    () => (bulk ? runOfCodes(form?.code ?? '', Number(count)) : []),
    [bulk, form?.code, count],
  );

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
      toast.error(bulk ? 'The run needs a number to start from' : 'The room needs a number');
      return;
    }

    if (bulk && !run.length) {
      toast.error(
        'The first room number has to end in a number — 301, or A-01 — so the rest can be counted out',
      );
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

    const described = {
      ...form,
      branch_id: branchId,
      capacity: Number(form.capacity) || 1,
      rent: numberOrNull(form.rent),
      seat_count: isRoom ? Number(form.seat_count) || 1 : undefined,
      seat_rent: isRoom ? numberOrNull(form.seat_rent) : undefined,
      // ⚠️ Sent even when nothing is ticked, and that is the point: an empty
      // array is the answer "this room offers none of them" and clears the
      // list, where leaving the key off would keep whatever is stored. The
      // server tells the two apart -- see syncFacilities in the API.
      facility_ids: form.facility_ids ?? [],
    };

    try {
      const result = bulk
        ? await dispatch(
            resourceBulkSave({
              ...described,
              // The number is counted out by the server, and a name is one
              // room's own -- a dozen rooms cannot all be the Rose Room. Both
              // are left off rather than sent to be ignored.
              code: undefined,
              name: undefined,
              start_code: form.code.trim(),
              count: run.length,
            }),
          ).unwrap()
        : await dispatch(resourceSave(described)).unwrap();

      toast.success(result.message);

      if (form.id) {
        // Stay on the room and re-read it, so the seat list underneath shows
        // what the save actually did to the beds.
        dispatch(resourceEdit(form.id));
      } else {
        // Rooms are added one floor after another. The building, floor, type
        // and rents are kept and only the number is cleared -- and the number
        // is the one thing the next floor certainly does not share.
        //
        // ⚠️ The TICKS are kept and the DESCRIPTION is not, and the split is
        // deliberate: rooms on a floor share their facilities almost by
        // definition, while "corner room, lake side" is true of exactly one of
        // them. Carried over, it would be quietly wrong on every room after
        // the first -- and wrong on their bills.
        setForm({ ...form, id: undefined, code: '', name: '', description: '', seats: [] });
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

            {/* What it offers, under what it is. Four and a count rather than
                the lot: a room with twelve ticks would be a table row three
                lines deep, and the twelfth is not what anybody is scanning
                this column for. */}
            {row.facilities?.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {row.facilities.slice(0, 4).map((f: any) => (
                  <span
                    key={f.id}
                    className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.65rem] leading-none text-gray-600 dark:bg-meta-4 dark:text-gray-300"
                  >
                    {f.name}
                  </span>
                ))}
                {row.facilities.length > 4 ? (
                  <span
                    className="text-[0.65rem] leading-none text-gray-400"
                    title={row.facilities.map((f: any) => f.name).join(', ')}
                  >
                    +{row.facilities.length - 4} more
                  </span>
                ) : null}
              </div>
            ) : null}

            {row.description ? (
              <div
                className="mt-0.5 line-clamp-1 text-[0.7rem] italic leading-snug text-gray-400"
                title={row.description}
              >
                {row.description}
              </div>
            ) : null}
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
      saveLabel={bulk && run.length ? `Create ${run.length} rooms` : undefined}
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

            {/* Drawn only while making something new: a run creates rooms one
                after another, and a room that already exists is not a run. */}
            {!form.id ? (
              <div className="mt-3">
                <Checkbox
                  id="room_several"
                  name="room_several"
                  label="Add a run of rooms — a whole floor at once"
                  checked={several}
                  onChange={() => setSeveral((on) => !on)}
                  labelClassName="cursor-pointer text-sm text-gray-600 dark:text-gray-300"
                />
              </div>
            ) : null}

            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
              <InputElement
                id="room_code"
                name="code"
                label={bulk ? 'First room number' : 'Room number'}
                placeholder={bulk ? '301' : '101'}
                title="Its own number, not 'ANX-101'. Two buildings both having a 101 is ordinary — the screens build the full name from the building."
                value={form.code}
                onChange={set('code')}
              />

              {/* One field, swapped rather than added. A run has no name to give
                  -- twelve rooms cannot all be the Rose Room -- so the box that
                  asked for one is exactly the space the count needs. */}
              {bulk ? (
                <InputElement
                  id="room_count"
                  name="count"
                  label="How many rooms"
                  type="number"
                  min={1}
                  max={100}
                  title="Counted on from the first number. Nothing is created if any number in the run is already used in this building."
                  value={count}
                  onChange={(e: any) => setCount(e.target.value)}
                />
              ) : (
                <InputElement
                  id="room_name"
                  name="name"
                  label="Name"
                  placeholder="Only if it has one — Rose Hall"
                  value={form.name ?? ''}
                  onChange={set('name')}
                />
              )}
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

            {/* ⚠️ WHAT THE ROOM IS, under what it costs. Both of these were
                being typed into the room NAME before they existed -- which is
                the one field the bill prints, so "302 (AC, balcony)" ended up
                on a guest's invoice as the room's number.

                The tick list first and the sentence after it: the list is what
                a clerk answers in four seconds, and the sentence is the part
                only some rooms need. */}
            <div className="mt-4 rounded border border-stroke p-3 dark:border-strokedark">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-black dark:text-white">
                  What {bulk ? 'these rooms offer' : 'it offers'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {ticked.length ? `${ticked.length} on` : 'none on'}
                </span>
              </div>

              {facilityChoices.length ? (
                // The app's own switch rather than a bare checkbox -- one
                // control, drawn from the SWITCH_* tokens like every other, so
                // twenty of them in a grid cannot be the one field on this form
                // that follows its own colours. gap-y-2 because a switch stands
                // taller than the box it replaced and the rows would touch.
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                  {facilityChoices.map((f: any) => (
                    <ToggleSwitch
                      key={f.value}
                      id={`room_facility_${f.value}`}
                      name={`facility_${f.value}`}
                      label={f.label}
                      checked={ticked.includes(f.value)}
                      onChange={() => toggleFacility(f.value)}
                      labelClassName="text-sm text-gray-600 dark:text-gray-300"
                    />
                  ))}
                </div>
              ) : (
                // Not an empty grid. A property that has never opened the
                // Facilities tab has nothing to tick, and a blank space here
                // reads as a screen that failed to load.
                <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
                  Nothing on the list yet. The Facilities tab has the usual
                  twenty-two — AC, Wi-Fi, a projector — in one press.
                </p>
              )}

              <div className="mt-3">
                <label htmlFor="room_description" className={FIELD_LABEL}>
                  Description
                </label>
                {/* A textarea rather than InputElement: this is the one field on
                    the form that holds a sentence, and a single-line box would
                    hide most of what was typed into it behind a caret. */}
                <textarea
                  id="room_description"
                  name="description"
                  rows={3}
                  placeholder="Corner room, lake side. Extra bed on request."
                  className={`${FIELD_TEXTAREA} w-full px-3 py-2`}
                  value={form.description ?? ''}
                  onChange={set('description')}
                />
                <p className={FIELD_HELP}>
                  For the guest — it shows on the layout and the booking screen, and on the bill
                  where the property’s paper asks for it. Anything for the desk alone is a note,
                  not this.
                </p>
              </div>

              {bulk && run.length ? (
                // Said before the run is made rather than found afterwards: a
                // description that fits one room is rarely true of twelve.
                <p className="mt-2 text-xs leading-snug text-warning">
                  All {run.length} rooms are created with these ticks and this description. Open one
                  afterwards to change its own.
                </p>
              ) : null}
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
                The beds are written when the {bulk ? 'rooms are' : 'room is'} saved. Reopen a room
                afterwards to price any of its beds on its own.
              </p>
            ) : null}

            {/* Read back before it is sent. The server counts the run out again
                and is the one that decides, but a mistyped start is far cheaper
                to see here than as twelve rooms numbered from 3011. */}
            {bulk ? (
              <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                {run.length ? (
                  <>
                    Creates <strong className="text-black dark:text-white">{run.length}</strong>{' '}
                    {run.length === 1 ? 'room' : 'rooms'} —{' '}
                    <span className="font-medium text-black dark:text-white">
                      {/* Short runs are printed out; a long one shows where it
                          starts and where it ends. The gap is drawn only where
                          numbers really are missing from the line -- an ellipsis
                          standing between 306 and 307 would read as a skip. */}
                      {run.length <= 8
                        ? run.join(', ')
                        : `${run.slice(0, 5).join(', ')} … ${run[run.length - 1]}`}
                    </span>
                    . If any of those numbers is already in this building, none of them is created.
                  </>
                ) : (
                  <>The first room number has to end in a number — 301, or A-01 — so the rest can be counted out.</>
                )}
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
