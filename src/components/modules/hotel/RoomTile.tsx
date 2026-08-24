import React from 'react';
import { LayoutRoom } from './types';
import { ColourMode, lookOf } from './layoutPalette';

/**
 * One room in the elevation.
 *
 * Three things and no more. A fourth would make a tile this size unreadable,
 * and the panel that opens on a click is where detail belongs:
 *
 *   1. the room number, large enough to find from across a desk
 *   2. a badge -- the room type's code, or a letter for the mode in use --
 *      standing beside the colour so the tile survives being printed in grey
 *   3. the beds, as pips, because a six-bed dormitory and a two-bed room
 *      must not look the same from a step back
 *
 * The pips are the part worth keeping. The seat is the inventory a booking
 * locks, so a grid that showed only rooms would draw a hotel with a third of
 * its beds missing.
 */

interface RoomTileProps {
  room: LayoutRoom;
  mode: ColourMode;
  typeIndex: Record<number, number>;
  selected: boolean;
  onSelect: (room: LayoutRoom) => void;
}

/** Above this many, the pips stop being countable and a number reads better. */
const MAX_PIPS = 8;

const RoomTile: React.FC<RoomTileProps> = ({ room, mode, typeIndex, selected, onSelect }) => {
  const look = lookOf(room, mode, typeIndex);

  const active = room.active_beds ?? 0;
  const total = room.beds ?? 0;
  const switchedOff = Math.max(0, total - active);

  const title = [
    room.display_name,
    room.room_type,
    room.sale_mode === 'seat'
      ? 'sold by the seat'
      : room.sale_mode === 'both'
        ? 'sold whole or by the seat'
        : 'sold whole',
    `${active} bed${active === 1 ? '' : 's'}`,
    switchedOff ? `${switchedOff} switched off` : null,
    Number(room.status) !== 1 ? 'inactive' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={() => onSelect(room)}
      title={title}
      className={`
        relative flex w-24 shrink-0 flex-col items-start gap-1 rounded border px-2.5 py-3
        text-left transition
        ${look.className}
        ${selected ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-boxdark' : 'hover:brightness-95 dark:hover:brightness-125'}
        print:break-inside-avoid
      `}
    >
      <div className="flex w-full items-baseline justify-between gap-1">
        <span className="text-[1rem] font-semibold leading-none">{room.code}</span>
        {/* Beside the colour, never instead of it -- see layoutPalette.ts */}
        <span className="text-[0.55rem] font-bold uppercase leading-none opacity-70">
          {look.badge}
        </span>
      </div>

      <div className="flex w-full items-center gap-0.5">
        {active > MAX_PIPS ? (
          <span className="text-[0.55rem] leading-none opacity-75">{active} beds</span>
        ) : (
          <>
            {Array.from({ length: active }).map((_, i) => (
              <span key={`on-${i}`} className="h-2 w-[3px] rounded-sm bg-current opacity-70" />
            ))}
            {/* Kept rows, drawn hollow. A room cut from four beds to two still
                has four, and the grid should not disagree with its own form. */}
            {Array.from({ length: Math.min(switchedOff, MAX_PIPS - active) }).map((_, i) => (
              <span
                key={`off-${i}`}
                className="h-2 w-[3px] rounded-sm border border-current opacity-30"
              />
            ))}
          </>
        )}
      </div>
    </button>
  );
};

export default RoomTile;
