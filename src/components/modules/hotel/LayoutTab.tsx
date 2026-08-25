import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiPrinter } from 'react-icons/fi';

import Loader from '../../../common/Loader';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import Checkbox from '../../utils/fields/Checkbox';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import PropertyGrid from './PropertyGrid';
import RoomPanel from './RoomPanel';
import { clearEditingResource, layoutRead, resourceEdit } from './hotelSetupSlice';
import { LayoutBuilding, LayoutRoom } from './types';
import { ColourMode, COLOUR_MODES, buildTypeIndex, lookOf } from './layoutPalette';

/**
 * The property drawn as buildings, with a switcher over it.
 *
 * The drawing itself is PropertyGrid, shared with the booking screen so that a
 * clerk who has learned to find room 302 here does not have to learn a second
 * layout to book it. What stays in this file is the tab's own business: which
 * colour is being shown, whether the switched-off rooms are drawn, and the
 * panel that opens on a click.
 *
 * The colour means ONE thing at a time, chosen above. "What is free" joined
 * that list as a fourth entry when the booking screen was built, and nothing
 * here changed to allow it -- which is what the colour living in
 * layoutPalette.ts rather than in the component bought.
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

        {drawn.length ? (
          <PropertyGrid
            buildings={drawn}
            mode={mode}
            typeIndex={typeIndex}
            // One room at a time here: the id of whichever has its panel open.
            // The booking screen passes many.
            selectedIds={selected ? [selected.id] : []}
            onSelect={openRoom}
          />
        ) : (
          // Reachable only with the switch on: a property whose every room is
          // retired. An empty grid here would read as a hotel with no rooms.
          <p className="rounded border border-stroke p-6 text-center text-sm text-gray-500 dark:border-strokedark dark:text-gray-400">
            Nothing on this property is in use. Untick <strong>Hide inactive</strong> to see the{' '}
            {inactiveCount} {inactiveCount === 1 ? 'room' : 'rooms'} that are switched off.
          </p>
        )}
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


export default LayoutTab;