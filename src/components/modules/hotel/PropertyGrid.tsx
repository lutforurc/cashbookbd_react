import { useMemo } from 'react';

import RoomTile from './RoomTile';
import { LayoutBuilding, LayoutFloor, LayoutRoom } from './types';
import { ColourMode } from './layoutPalette';
import { money } from './setupHelpers';

/**
 * The property drawn as buildings: an elevation, one card each, floors stacked.
 *
 * Extracted from the Layout tab so the booking screen draws the SAME picture.
 * That was the point of doing it: a clerk who has learned to find room 302 on
 * the setup screen should not have to learn a second layout to book it. Only
 * the colour changes -- room type there, what is free here -- and the colour
 * lives in layoutPalette.ts precisely so that this file does not.
 *
 * The top floor is drawn at the top, which is why the floors arrive
 * ground-first and are reversed here: which end is up is a fact about the
 * drawing, not about the data.
 *
 * Side by side rather than one building at a time. Three blocks fit on one
 * screen, and once they do, the difference in their heights says which is the
 * five-storey one before a single label is read.
 */

interface PropertyGridProps {
  buildings: LayoutBuilding[];
  mode: ColourMode;
  typeIndex: Record<number, number>;

  /**
   * Which rooms are marked. One id on the setup screen (the room whose panel is
   * open), many on the booking screen (the rooms being taken) -- the same ring
   * either way, because "this one" and "these ones" want the same mark.
   */
  selectedIds: number[];
  onSelect: (room: LayoutRoom) => void;

  /**
   * True while the grid is being used to pick rooms rather than to look at
   * them. It turns off the tiles that carry a blocked_reason, and it is a
   * separate prop rather than inferred from that field: on the setup screen a
   * room with a reason is still worth opening.
   */
  picking?: boolean;

  /** Drawn under the header. The booking screen puts the rent for the stay here. */
  summaryOf?: (building: LayoutBuilding) => string | null;
}

const PropertyGrid = ({
  buildings,
  mode,
  typeIndex,
  selectedIds,
  onSelect,
  picking,
  ownIds,
  summaryOf,
}: PropertyGridProps) => (
  <div className="flex flex-wrap items-start gap-4">
    {buildings.map((building) => (
      <BuildingCard
        key={building.id}
        building={building}
        mode={mode}
        typeIndex={typeIndex}
        selectedIds={selectedIds}
        onSelect={onSelect}
        picking={picking}
        ownIds={ownIds}
        summary={summaryOf?.(building) ?? null}
      />
    ))}
  </div>
);

/* ================= One building ================= */

const BuildingCard = ({
  building,
  mode,
  typeIndex,
  selectedIds,
  onSelect,
  picking,
  ownIds,
  summary,
}: {
  building: LayoutBuilding;
  mode: ColourMode;
  typeIndex: Record<number, number>;
  selectedIds: number[];
  onSelect: (room: LayoutRoom) => void;
  picking?: boolean;
  /**
   * Rooms this booking already holds, which stay clickable however the grid
   * marks them. Empty on a new booking.
   */
  ownIds?: number[];
  summary: string | null;
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
    <div className="max-w-full rounded border border-stroke dark:border-strokedark print:break-inside-avoid">
      <div className="border-b border-stroke px-3 py-2 dark:border-strokedark">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-black dark:text-white">{building.name}</span>
          {building.code ? <span className="text-xs text-gray-400">{building.code}</span> : null}
          {Number(building.status) !== 1 ? (
            <span className="text-xs text-gray-400">· inactive</span>
          ) : null}
        </div>

        {/* Read at a glance, this line is what shows the same Deluxe costing
            more in one block than another -- the rent lives on the room. */}
        <div className="text-xs text-gray-700 dark:text-gray-200">
          {building.rooms_count} rooms · {building.beds_count} beds
          {/* ⚠️ Halls counted apart from rooms, and their SEATS apart from
              beds. Folded in, a block with two function spaces read "22 rooms ·
              40 beds" -- two of which had no beds and looked unfinished. */}
          {building.halls_count
            ? ` · ${building.halls_count} ${building.halls_count === 1 ? 'hall' : 'halls'}`
              + (building.seats_count ? ` (${building.seats_count} seats)` : '')
            : ''}
          {rent ? ` · ${rent}` : ''}
          {seatRent ? ` · ${seatRent}` : ''}
        </div>

        {summary ? (
          <div className="text-xs font-medium text-primary dark:text-secondary">{summary}</div>
        ) : null}
      </div>

      {/* Each floor is its own band, spaced here and nowhere else. A floor can
          run to several lines now, so the space between floors has to be wider
          than the space between lines of tiles -- or the eye cannot tell where
          the second floor ends and the third begins. */}
      <div className="flex flex-col gap-2 p-2">
        {stacked.map((floor) => (
          <FloorRow
            key={floor.id}
            label={shortFloor(floor)}
            rooms={floor.rooms}
            mode={mode}
            typeIndex={typeIndex}
            selectedIds={selectedIds}
            onSelect={onSelect}
            picking={picking}
            ownIds={ownIds}
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
            selectedIds={selectedIds}
            onSelect={onSelect}
            picking={picking}
            ownIds={ownIds}
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
  selectedIds,
  onSelect,
  picking,
  ownIds,
  dimmed,
}: {
  label: string;
  title?: string;
  rooms: LayoutRoom[];
  mode: ColourMode;
  typeIndex: Record<number, number>;
  selectedIds: number[];
  onSelect: (room: LayoutRoom) => void;
  picking?: boolean;
  dimmed?: boolean;
  ownIds?: number[];
}) => (
  // A band, because a floor of twenty rooms folds onto several lines and the band
  // is what holds those lines together as one floor.
  //
  // ⚠️ THE ROOMS ARE THE POINT OF THIS ROW. A solid block naming the floor was
  // tried (2026-11-08) and it outweighed every tile beside it, so the marker is a
  // thin edge and coloured ink: enough to find the floor, never more than a room.
  <div className={`flex items-stretch gap-2 rounded-r border-l-[3px] border-primary bg-gray-50 p-1.5 dark:border-secondary dark:bg-white/5 ${dimmed ? 'opacity-50' : ''}`}>
    {/* The floor marker: big enough to find the third floor on a five-storey
        card at a glance. */}
    <span
      title={title}
      className="flex w-14 shrink-0 flex-col items-center justify-center whitespace-nowrap text-center"
    >
      <span className="text-base font-bold leading-tight text-primary dark:text-secondary">{label}</span>
      {rooms.length ? (
        <span className="text-[0.65rem] leading-tight text-gray-500 dark:text-gray-400">
          {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
        </span>
      ) : null}
    </span>

    {/* ⚠️ A FLOOR WITH MANY ROOMS FOLDS ONTO MORE LINES. It used to scroll
        sideways inside itself, and a room out of sight past the edge is a room
        nobody sells. The tiles are all one width, so they still line up into
        columns, across the lines and across the floors. */}
    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
      {rooms.length ? (
        rooms.map((room) => (
          <RoomTile
            key={room.id}
            room={room}
            mode={mode}
            typeIndex={typeIndex}
            selected={selectedIds.includes(room.id)}
            /**
             * ⚠️ A ROOM ALREADY PICKED IS ALWAYS CLICKABLE, whatever the
             * grid says about it. Blocked tiles are dead so nobody books a room
             * somebody else has -- right for a new booking, and wrong the
             * moment an EXISTING one is opened for editing: its own rooms come
             * back marked "booked" (they are -- by this booking), so the clerk
             * could not untick them and nothing could be dropped.
             *
             * Unticking never books anything. It only ever gives a room back.
             */
            disabled={
              picking
              && !!room.blocked_reason
              && !selectedIds.includes(room.id)
              && !(ownIds ?? []).includes(room.id)
            }
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
export const shortFloor = (floor: LayoutFloor): string => {
  if (floor.floor_no === 0) return 'G';
  if (floor.floor_no < 0) return `B${Math.abs(floor.floor_no)}`;

  return `${floor.floor_no}F`;
};

export default PropertyGrid;
