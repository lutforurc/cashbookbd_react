import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiPrinter } from 'react-icons/fi';

import Loader from '../../../common/Loader';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import RoomTile from './RoomTile';
import RoomPanel from './RoomPanel';
import { clearEditingResource, layoutRead, resourceEdit } from './hotelSetupSlice';
import { LayoutBuilding, LayoutFloor, LayoutRoom } from './types';
import { ColourMode, COLOUR_MODES, buildTypeIndex, lookOf } from './layoutPalette';
import { money } from './setupHelpers';

/**
 * The property drawn as buildings: an elevation, one card each, floors stacked.
 *
 * The top floor is drawn at the top, which is why the floors arrive
 * ground-first and are reversed here -- which end is up is a fact about the
 * drawing, not about the data.
 *
 * Side by side rather than one building at a time. Three blocks fit on one
 * screen, and once they do, the difference in their heights says which is the
 * five-storey one before a single label is read. More than a handful and the
 * cards simply wrap; there is no second mode to maintain.
 *
 * The colour means ONE thing at a time, chosen above. When bookings exist,
 * "Availability" becomes a fourth entry in that list and this component does
 * not change -- which is the reason the colour lives in layoutPalette.ts rather
 * than in here.
 */
const LayoutTab = ({ branchId }: { branchId: number }) => {
  const dispatch = useDispatch<any>();
  const { layout, layoutLoading, editingResource } = useSelector((state: any) => state.hotelSetup);

  const [mode, setMode] = useState<ColourMode>('room_type');
  const [selected, setSelected] = useState<LayoutRoom | null>(null);

  const load = useCallback(() => {
    dispatch(layoutRead({ branch_id: branchId }));
  }, [dispatch, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  // A room selected in one property has no meaning in another.
  useEffect(() => {
    setSelected(null);
    dispatch(clearEditingResource());
  }, [dispatch, branchId]);

  const buildings: LayoutBuilding[] = layout ?? [];

  const everyRoom = useMemo(
    () =>
      buildings.flatMap((b) => [...b.floors.flatMap((f) => f.rooms), ...b.unfloored]),
    [buildings],
  );

  // Colours are assigned from the property's own list of room types, so that
  // renaming one does not repaint the building.
  const typeIndex = useMemo(
    () => buildTypeIndex(everyRoom.map((r) => r.room_type_id).filter((id): id is number => id != null)),
    [everyRoom],
  );

  /**
   * The legend, built from what is actually on the property.
   *
   * Not a fixed list: a hotel with no dormitory should not be shown a key for
   * one. Deduplicated on the badge, which is what the tile prints.
   */
  const legend = useMemo(() => {
    const seen = new Map<string, { className: string; badge: string; label: string }>();

    everyRoom.forEach((room) => {
      const look = lookOf(room, mode, typeIndex);
      if (!seen.has(look.badge + look.label)) {
        seen.set(look.badge + look.label, look);
      }
    });

    return [...seen.values()];
  }, [everyRoom, mode, typeIndex]);

  // The panel is fed from the grid's own row, so a reload has to hand it the
  // new one. Without this, repricing a bed refreshes the grid underneath while
  // the panel above goes on showing the rent range it opened with.
  useEffect(() => {
    if (!selected) return;

    const fresh = everyRoom.find((room) => room.id === selected.id);

    // Gone means deleted elsewhere -- close rather than show a room that is not
    // there any more.
    if (!fresh) {
      setSelected(null);
      return;
    }

    if (fresh !== selected) {
      setSelected(fresh);
    }
  }, [everyRoom]);

  const openRoom = (room: LayoutRoom) => {
    setSelected(room);
    // The beds themselves are not in the layout payload -- the grid never draws
    // them individually. This is the endpoint that already returns them.
    dispatch(resourceEdit(room.id));
  };

  const closePanel = () => {
    setSelected(null);
    dispatch(clearEditingResource());
  };

  if (layoutLoading && !buildings.length) {
    return (
      <div className="relative min-h-40">
        <Loader />
      </div>
    );
  }

  if (!buildings.length) {
    // A sentence, not an empty grid. An empty grid reads as a hotel with
    // nothing in it rather than as a property nobody has described yet.
    return (
      <div className="rounded border border-stroke p-8 text-center dark:border-strokedark">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nothing to draw yet. Add a building on the <strong>Buildings</strong> tab, then its
          floors and rooms.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 print:hidden">
          <div className="w-56">
            <DropdownCommon
              id="colour_mode"
              name="colour_mode"
              label="Colour by"
              data={COLOUR_MODES}
              value={mode}
              onChange={(e: any) => setMode(e.target.value as ColourMode)}
            />
          </div>

          <ButtonLoading onClick={() => window.print()} label="Print" icon={<FiPrinter size={16} />} />
        </div>

        {/* The key. It carries the badge as well as the colour, because the
            colour is the half that does not survive a grey printer. */}
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {legend.map((entry) => (
            <span key={entry.badge + entry.label} className="flex items-center gap-1.5 text-xs">
              <span
                className={`flex h-4 w-6 items-center justify-center rounded border text-[0.5rem] font-bold ${entry.className}`}
              >
                {entry.badge}
              </span>
              <span className="text-gray-600 dark:text-gray-300">{entry.label}</span>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-start gap-4">
          {buildings.map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              mode={mode}
              typeIndex={typeIndex}
              selectedId={selected?.id ?? null}
              onSelect={openRoom}
            />
          ))}
        </div>
      </div>

      {selected ? (
        <RoomPanel
          summary={selected}
          detail={editingResource}
          onClose={closePanel}
          onChanged={() => {
            load();
            dispatch(resourceEdit(selected.id));
          }}
        />
      ) : null}
    </div>
  );
};

/* ================= One building ================= */

const BuildingCard = ({
  building,
  mode,
  typeIndex,
  selectedId,
  onSelect,
}: {
  building: LayoutBuilding;
  mode: ColourMode;
  typeIndex: Record<number, number>;
  selectedId: number | null;
  onSelect: (room: LayoutRoom) => void;
}) => {
  // Top floor first. The API sends them ground-first because that is their
  // natural order; standing them up is the drawing's business.
  const stacked = useMemo(() => [...building.floors].reverse(), [building.floors]);

  const rent =
    building.rent_min === null
      ? null
      : building.rent_min === building.rent_max
        ? `${money(building.rent_min)}`
        : `${money(building.rent_min)} – ${money(building.rent_max)}`;

  const seatRent =
    building.seat_rent_min === null
      ? null
      : building.seat_rent_min === building.seat_rent_max
        ? `${money(building.seat_rent_min)}/bed`
        : `${money(building.seat_rent_min)} – ${money(building.seat_rent_max)}/bed`;

  return (
    <div className="rounded border border-stroke dark:border-strokedark print:break-inside-avoid">
      <div className="border-b border-stroke px-3 py-2 dark:border-strokedark">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-black dark:text-white">{building.name}</span>
          {building.code ? (
            <span className="text-xs text-gray-400">{building.code}</span>
          ) : null}
          {Number(building.status) !== 1 ? (
            <span className="text-xs text-gray-400">· inactive</span>
          ) : null}
        </div>
        {/* Read at a glance, this line is what shows the same Deluxe costing
            more in one block than another -- the rent lives on the room. */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {building.rooms_count} rooms · {building.beds_count} beds
          {rent ? ` · ${rent}` : ''}
          {seatRent ? ` · ${seatRent}` : ''}
        </div>
      </div>

      <div className="p-2">
        {stacked.map((floor) => (
          <FloorRow
            key={floor.id}
            label={shortFloor(floor)}
            rooms={floor.rooms}
            mode={mode}
            typeIndex={typeIndex}
            selectedId={selectedId}
            onSelect={onSelect}
            dimmed={Number(floor.status) !== 1}
          />
        ))}

        {building.unfloored.length ? (
          <FloorRow
            label="—"
            title="Rooms with no floor. A resort's cottages have none, and none is invented for them."
            rooms={building.unfloored}
            mode={mode}
            typeIndex={typeIndex}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ) : null}

        {!stacked.length && !building.unfloored.length ? (
          <p className="px-2 py-4 text-xs text-gray-400">No rooms in this building yet.</p>
        ) : null}
      </div>
    </div>
  );
};

/* ================= One floor ================= */

const FloorRow = ({
  label,
  title,
  rooms,
  mode,
  typeIndex,
  selectedId,
  onSelect,
  dimmed,
}: {
  label: string;
  title?: string;
  rooms: LayoutRoom[];
  mode: ColourMode;
  typeIndex: Record<number, number>;
  selectedId: number | null;
  onSelect: (room: LayoutRoom) => void;
  dimmed?: boolean;
}) => (
  <div className={`flex items-center gap-2 border-b border-stroke/60 py-1 last:border-b-0 dark:border-strokedark/60 ${dimmed ? 'opacity-50' : ''}`}>
    {/* The floor marker: large and bold, and carrying no colour of its own.
        Big enough to find the third floor on a five-storey card at a glance,
        which the old grey whisper in the margin was not.

        No background, and no accent. On this screen colour MEANS something --
        the tiles are painted by room type, sale mode or status, and the legend
        above explains that scheme. A filled chip in the gutter joins that
        conversation without having anything to say: its blue sat in the same
        family as the Standard tiles and read as though the floor were being
        coded too. Ink alone says "label", not "data". */}
    <span
      title={title}
      className="w-10 shrink-0 text-center text-sm font-bold text-gray-700 dark:text-gray-200"
    >
      {label}
    </span>

    {/* A floor with many rooms scrolls inside itself rather than widening the
        card -- and rather than paging, which a plan cannot be read in.

        Note that `overflow-x: auto` makes the vertical axis auto as well, so
        this row clips anything a tile paints above or below itself. That is why
        the selected tile marks itself on the inside -- see RoomTile. */}
    <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto print:overflow-visible print:flex-wrap">
      {rooms.length ? (
        rooms.map((room) => (
          <RoomTile
            key={room.id}
            room={room}
            mode={mode}
            typeIndex={typeIndex}
            selected={selectedId === room.id}
            onSelect={onSelect}
          />
        ))
      ) : (
        <span className="py-2 text-[0.65rem] text-gray-400">no rooms</span>
      )}
    </div>
  </div>
);

/** "5th Floor" is too wide for the gutter; "5F" is not. */
const shortFloor = (floor: LayoutFloor): string => {
  if (floor.floor_no === 0) return 'G';
  if (floor.floor_no < 0) return `B${Math.abs(floor.floor_no)}`;

  return `${floor.floor_no}F`;
};

export default LayoutTab;