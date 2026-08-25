import React from 'react';
import { LayoutRoom } from './types';
import { ColourMode, lookOf } from './layoutPalette';
import { useTooltip } from '../../utils/others/useTooltip';

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
  /**
   * Cannot be picked. Only the booking screen sets it -- on the setup screen
   * a room that cannot be let is still worth opening.
   *
   * The tile is still drawn in its own colour and still carries its tooltip:
   * a greyed-out shape says "no" without saying why, and why is the whole of
   * what the clerk needs -- "sold by the bed" and "taken until Friday" want
   * different things done about them.
   */
  disabled?: boolean;
  onSelect: (room: LayoutRoom) => void;
}

/** Above this many, the pips stop being countable and a number reads better. */
const MAX_PIPS = 8;

const RoomTile: React.FC<RoomTileProps> = ({ room, mode, typeIndex, selected, disabled, onSelect }) => {
  const look = lookOf(room, mode, typeIndex);

  const active = room.active_beds ?? 0;
  const total = room.beds ?? 0;
  const switchedOff = Math.max(0, total - active);

  // Two lines, and the break is where the subject changes: which room this is,
  // then what is true of it. On one line the six facts ran to the full width of
  // the bubble and the room's own name -- the thing being pointed at -- was just
  // the first of them.
  const identity = [room.display_name, room.room_type].filter(Boolean).join(' · ');

  const facts = [
    // What is true of it on the dates being looked at, first, because on the
    // booking screen it is the only line anybody reads. Undefined on the setup
    // screen, where it simply does not appear.
    room.blocked_reason,
    room.taken_by,
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

  // The app's own bubble rather than the browser's `title=`, which draws a pale
  // system box in its own font, half a second late, wherever the pointer is.
  // It is portalled into the body -- see useTooltip -- because this tile sits in
  // a row that scrolls, and a bubble laid out beside it would be clipped by the
  // same overflow that once shaved the top off the selection ring.
  const { anchorProps, tooltip } = useTooltip<HTMLButtonElement>(
    <>
      <div>{identity}</div>
      {/* Lighter, so the eye lands on the name first and reads the rest only
          if it wants it. The pair looks backwards for the same reason the
          bubble does: it runs against the page, so on a light page this line
          is muted ON a dark bubble, and the other way round. */}
      <div className="font-normal text-slate-400 dark:text-slate-500">{facts}</div>
    </>,
  );

  return (
    <>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(room)}
      {...anchorProps}
      className={`
        relative flex w-24 shrink-0 flex-col items-start gap-1 rounded border px-2.5 py-3
        text-left transition
        ${look.className}
        ${/*
            The selection is drawn INSIDE the tile -- ring-inset, and no offset.
            An outset ring is painted outside the border box, and the floor it
            sits on scrolls sideways: `overflow-x: auto` makes the other axis
            auto too, so the row clips top and bottom. The result was a mark on
            three sides with the top edge shaved off.

            Inside the box it cannot be clipped by anything, at any tile size,
            and it reads as a highlighted tile rather than a halo around one.
         */ ''}
        ${/*
            Disabled keeps its colour and loses only its hover and its cursor.
            Fading it would take away the one thing that made the grid worth
            drawing -- the shape of the floor -- and a wall of grey tiles says
            nothing about WHY any of them cannot be taken.
         */ ''}
        ${disabled ? 'cursor-not-allowed' : ''}
        ${
          selected
            ? 'ring-2 ring-inset ring-primary'
            : disabled
              ? ''
              : 'hover:brightness-95 dark:hover:brightness-125'
        }
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

    {tooltip}
    </>
  );
};

export default RoomTile;
