import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiPrinter } from 'react-icons/fi';

import Loader from '../../../common/Loader';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Checkbox from '../../utils/fields/Checkbox';
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
  const [hideInactive, setHideInactive] = useState(false);
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

  /**
   * "Hide inactive" -- draw only what can be let today.
   *
   * A room is switched off rather than deleted (spec 2.5): a stay recorded
   * against it in July must still read as that room after it is retired in
   * September. So a property that has been running a while carries rooms nobody
   * can book, and on a plan of forty they are noise.
   *
   * Off by default. The grid draws the whole property until somebody asks
   * otherwise -- a plan that quietly left rooms out of itself would be the more
   * dangerous of the two defaults.
   *
   * "Inactive" is read at every level rather than only at the room's own flag:
   * a live room on a switched-off floor cannot be let either. A floor or a
   * building left with nothing then goes with it, so the switch never leaves an
   * empty card standing where a block used to be.
   */
  const liveBuildings = useMemo(
    () =>
      buildings
        .filter(isLive)
        .map((building) => {
          const floors = building.floors
            .filter(isLive)
            .map((floor) => ({ ...floor, rooms: floor.rooms.filter(isLive) }))
            .filter((floor) => floor.rooms.length);

          const unfloored = building.unfloored.filter(isLive);

          // The API's counts and rent range describe the whole building. Once
          // rooms are being left out, a header still reading "20 rooms - 40
          // beds" over a card drawing eighteen is simply wrong, and so is a
          // range whose bottom end is the price of a room nobody can book.
          return {
            ...building,
            floors,
            unfloored,
            ...summarise([...floors.flatMap((f) => f.rooms), ...unfloored]),
          };
        })
        .filter((building) => building.floors.length || building.unfloored.length),
    [buildings],
  );

  const liveRooms = useMemo(
    () => liveBuildings.flatMap((b) => [...b.floors.flatMap((f) => f.rooms), ...b.unfloored]),
    [liveBuildings],
  );

  // Worked out whether or not the switch is on, because it is also the answer
  // to "is there anything to hide" -- and a switch offered on a property where
  // everything is live is a switch that does nothing.
  const inactiveCount = everyRoom.length - liveRooms.length;

  const drawn = hideInactive ? liveBuildings : buildings;
  const drawnRooms = hideInactive ? liveRooms : everyRoom;

  // Colours are assigned from the property's own list of room types, so that
  // renaming one does not repaint the building -- and from ALL of them, not
  // only the ones on screen, so that hiding the inactive rooms does not shift
  // every colour along by one.
  const typeIndex = useMemo(
    () => buildTypeIndex(everyRoom.map((r) => r.room_type_id).filter((id): id is number => id != null)),
    [everyRoom],
  );

  /**
   * The legend, built from what is actually drawn.
   *
   * Not a fixed list: a hotel with no dormitory should not be shown a key for
   * one. Deduplicated on the badge, which is what the tile prints.
   *
   * It follows the switch above rather than the whole property, so that hiding
   * the inactive rooms takes the grey key away with them. A legend explaining a
   * colour that is nowhere on the page is the same fault as one missing a
   * colour that is.
   */
  const legend = useMemo(() => {
    const seen = new Map<string, { className: string; badge: string; label: string }>();

    drawnRooms.forEach((room) => {
      const look = lookOf(room, mode, typeIndex);
      if (!seen.has(look.badge + look.label)) {
        seen.set(look.badge + look.label, look);
      }
    });

    return [...seen.values()];
  }, [drawnRooms, mode, typeIndex]);

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
    // The grid keeps the full width now. The room detail opens as a dialog over
    // it rather than as a column beside it, so nothing has to be given up to
    // make room for something that is only shown on a click.
    <div>
      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 print:hidden">
          <div className="flex flex-wrap items-end gap-4">
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

            {/* Drawn only where there is something to hide, the way the legend
                is built from what is on the property rather than from a fixed
                list. A hotel that has retired nothing is not offered the switch. */}
            {inactiveCount ? (
              <Checkbox
                id="hide_inactive"
                name="hide_inactive"
                label="Hide inactive"
                checked={hideInactive}
                onChange={() => setHideInactive((on) => !on)}
                className="pb-2"
                labelClassName="cursor-pointer text-sm text-gray-600 dark:text-gray-300"
              />
            ) : null}
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

          {/* This row is NOT print:hidden, and the note belongs in it rather
              than up beside the switch: a plan carried to the front desk on
              paper has to say that rooms were left out of it. */}
          {hideInactive && inactiveCount ? (
            <span className="text-xs italic text-gray-400">
              {inactiveCount} inactive {inactiveCount === 1 ? 'room' : 'rooms'} hidden
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start gap-4">
          {drawn.length ? (
            drawn.map((building) => (
              <BuildingCard
                key={building.id}
                building={building}
                mode={mode}
                typeIndex={typeIndex}
                selectedId={selected?.id ?? null}
                onSelect={openRoom}
              />
            ))
          ) : (
            // Reachable only with the switch on: a property whose every room
            // is retired. An empty grid here would read as a hotel with no
            // rooms at all.
            <p className="w-full rounded border border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
              Nothing on this property is in use. Untick <strong>Hide inactive</strong> to see
              the {inactiveCount} {inactiveCount === 1 ? 'room' : 'rooms'} that are switched off.
            </p>
          )}
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

      {/* One gap, stated once, and it governs both directions.

          The floors used to space themselves with `py-1` and a bottom border
          while the tiles inside a floor used `gap-1` -- two rules in two files
          for what the eye reads as one grid, so the space between 501 and 502
          was never the space between 501 and 401. Saying it here, as the flex
          gap of the column, leaves the rows exactly as far apart as the tiles
          are: change this number and both move together. */}
      <div className="flex flex-col gap-1 p-2">
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
  // No padding and no rule of its own. The column above spaces these, so a
  // row that also padded itself would add to that space on one axis only --
  // which is exactly how the rows came to sit further apart than the tiles.
  // The dividing line went with it: it drew a fourth horizontal edge into a
  // grid already made of bordered tiles, and the floor chip names the row far
  // better than a hairline separates it.
  <div className={`flex items-center gap-2 ${dimmed ? 'opacity-50' : ''}`}>
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

/**
 * In use. Buildings, floors and rooms all carry the same flag with the same
 * meaning, so one reading of it serves all three.
 */
const isLive = (thing: { status: number }) => Number(thing.status) === 1;

/**
 * A building's header line, worked out from a set of rooms rather than taken
 * from the API -- needed only when some of its rooms have been left out.
 *
 * Null rather than zero where there is no price, because the two do not mean
 * the same thing: a dormitory sold only by the bed carries no whole-room rent
 * at all, and a zero printed there reads as free (spec 2.8). It is why this
 * cannot be a plain Math.min over the column.
 */
const summarise = (rooms: LayoutRoom[]) => {
  const span = (values: (string | number | null)[]) => {
    const numbers = values
      .filter((v) => v !== null && v !== '')
      .map(Number)
      .filter((n) => !Number.isNaN(n));

    return numbers.length
      ? { min: Math.min(...numbers), max: Math.max(...numbers) }
      : { min: null, max: null };
  };

  const whole = span(rooms.map((r) => r.rent));
  const seat = span([
    ...rooms.map((r) => r.seat_rent_min),
    ...rooms.map((r) => r.seat_rent_max),
  ]);

  return {
    rooms_count: rooms.length,
    beds_count: rooms.reduce((total, room) => total + room.beds, 0),
    rent_min: whole.min,
    rent_max: whole.max,
    seat_rent_min: seat.min,
    seat_rent_max: seat.max,
  };
};

/** "5th Floor" is too wide for the gutter; "5F" is not. */
const shortFloor = (floor: LayoutFloor): string => {
  if (floor.floor_no === 0) return 'G';
  if (floor.floor_no < 0) return `B${Math.abs(floor.floor_no)}`;

  return `${floor.floor_no}F`;
};

export default LayoutTab;