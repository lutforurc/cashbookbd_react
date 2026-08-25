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
  summary,
}: {
  building: LayoutBuilding;
  mode: ColourMode;
  typeIndex: Record<number, number>;
  selectedIds: number[];
  onSelect: (room: LayoutRoom) => void;
  picking?: boolean;
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
    <div className="rounded border border-stroke dark:border-strokedark print:break-inside-avoid">
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
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {building.rooms_count} rooms · {building.beds_count} beds
          {rent ? ` · ${rent}` : ''}
          {seatRent ? ` · ${seatRent}` : ''}
        </div>

        {summary ? (
          <div className="text-xs font-medium text-primary">{summary}</div>
        ) : null}
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
            selectedIds={selectedIds}
            onSelect={onSelect}
            picking={picking}
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
        the tiles are painted by room type, sale mode, status or availability,
        and the legend above explains that scheme. A filled chip in the gutter
        joins that conversation without having anything to say. Ink alone says
        "label", not "data". */}
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
            selected={selectedIds.includes(room.id)}
            disabled={picking && !!room.blocked_reason}
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
