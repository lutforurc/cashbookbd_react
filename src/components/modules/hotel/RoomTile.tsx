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

/**
 * "2026-09-02" as "2 Sep", for a tile a hand's width across.
 *
 * ⚠️ Read out by hand rather than handed to `new Date`. A bare 'YYYY-MM-DD' has
 * no zone, so it is read as UTC midnight -- east of Greenwich that is still the
 * day before, and the room would be advertised as free a day early.
 *
 * No year: the grid is being read about a fortnight, and a year on every tile
 * is four characters that never change.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * " · 3 nights", or nothing where the pair says nothing.
 *
 * ⚠️ Counted in whole days from the two dates, not from a night count sent
 * alongside them -- a number that travels separately is one that eventually
 * disagrees with the dates printed beside it.
 */
const nightsBetween = (from?: string | null, to?: string | null): string => {
  const a = asDate(from);
  const b = asDate(to);

  if (!a || !b) return '';

  const nights = Math.round((b.getTime() - a.getTime()) / 86400000);

  return nights > 0 ? ` · ${nights} night${nights === 1 ? '' : 's'}` : '';
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const shortDate = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');

  if (!parts) return '';

  return `${Number(parts[3])} ${MONTHS[Number(parts[2]) - 1] ?? ''}`.trim();
};

const RoomTile: React.FC<RoomTileProps> = ({ room, mode, typeIndex, selected, disabled, onSelect }) => {
  const look = lookOf(room, mode, typeIndex);

  const active = room.active_beds ?? 0;
  const total = room.beds ?? 0;
  const switchedOff = Math.max(0, total - active);

  /**
   * ⚠️ A HALL HAS NO BEDS, IT HAS CHAIRS. Everything below this line was
   * written for rooms, and drawn for a hall it said "sold whole · 0 beds" --
   * which reads as a room somebody forgot to finish setting up. A function
   * space is measured by how many people sit in it, and that number is its
   * capacity.
   *
   * The kind comes from the server (booking_resource_types.code); the tile does
   * not guess it from a missing bed count, because a room with its beds not yet
   * added would look identical.
   */
  const isHall = room.kind === 'hall' || room.kind === 'community_centre';
  const seats = Number(room.capacity ?? 0);

  // ⚠️ A hall with no sittings CANNOT BE LET. The booking screen offers it
  // nothing to pick, and the only way to find that out was to go there and see
  // an empty row -- so the tile says it here, where the property is set up.
  const sittings = room.sittings ?? [];

  // What the room offers, and its own sentence. Both belong in the bubble
  // rather than on the tile: the tile holds three things and no more, and a
  // fourth at this size is a tile nobody can read from across a desk.
  const facilities = room.facilities ?? [];

  // Two lines, and the break is where the subject changes: which room this is,
  // then what is true of it. On one line the six facts ran to the full width of
  // the bubble and the room's own name -- the thing being pointed at -- was just
  // the first of them.
  const identity = [room.display_name, room.room_type].filter(Boolean).join(' · ');

  // ⚠️ THE QUESTION THE DESK ACTUALLY ASKS. A tile drawn "BKD" said the room
  // was gone and nothing else -- not for how long, not when it frees -- while
  // the commonest thing said at a counter is "when can I have it?". Null on a
  // room that is free now, so nothing is drawn for it.
  const backOn = shortDate(room.free_from);

  // The stay itself: from when to when, and how many nights that is. Read off
  // the two dates rather than sent, so it can never disagree with them.
  const stay =
    room.stay_from && room.stay_to
      ? `${shortDate(room.stay_from)} → ${shortDate(room.stay_to)}${nightsBetween(room.stay_from, room.stay_to)}`
      : '';

  const guests = room.guests ?? [];

  /**
   * ⚠️ A ROOM NOBODY CAN TAKE DOES NOT NEED DESCRIBING.
   *
   * How it is sold, how many beds it has, what it offers, the sentence about
   * the view -- all of that answers "shall I put them in here", and that
   * question is closed the moment somebody else has it. What is wanted then is
   * who has it, for which nights, and when it comes back. The rest is six lines
   * of noise between the reader and the three that matter.
   *
   * Undefined on the setup screen, where there is no state and no booking, and
   * where describing the room is the whole purpose of the tile.
   */
  const taken = Boolean(room.state) && room.state !== 'free';

  const facts = [
    // What is true of it on the dates being looked at, first, because on the
    // booking screen it is the only line anybody reads. Undefined on the setup
    // screen, where it simply does not appear.
    room.blocked_reason,
    room.taken_by,
    backOn ? `free from ${backOn}` : null,

    // ⚠️ A hall is not "sold whole" either -- it is let by the sitting, and
    // "whole" is the answer to a question about beds that a hall never asks.
    taken
      ? null
      : isHall
        ? 'let by the sitting'
        : room.sale_mode === 'seat'
          ? 'sold by the seat'
          : room.sale_mode === 'both'
            ? 'sold whole or by the seat'
            : 'sold whole',
    taken
      ? null
      : isHall
        ? (seats ? `${seats} seat${seats === 1 ? '' : 's'}` : 'no seating set')
        : `${active} bed${active === 1 ? '' : 's'}`,
    taken || isHall ? null : switchedOff ? `${switchedOff} switched off` : null,

    // Kept whatever the state: a room let out while switched off is a thing
    // somebody has to know about.
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

      {/* ⚠️ THE THREE THINGS ASKED AT THE COUNTER, in the order they are asked:
          which dates the room is gone for, who is in it, and when it comes
          back. Each on its own line -- run together they read as one long
          sentence with a fold in it, and the dates are what somebody is
          scanning for. */}
      {stay ? (
        <div className="font-normal text-slate-400 dark:text-slate-500">{stay}</div>
      ) : null}

      {guests.length ? (
        <div className="font-normal text-slate-400 dark:text-slate-500">
          {guests.join(', ')}
          {room.guests_more ? ` +${room.guests_more}` : ''}
        </div>
      ) : null}

      {/* ⚠️ A LINE OF THEIR OWN. Run in with the rest, the sittings wrapped
          mid-list -- "Morning," ending one line and "Afternoon, Evening"
          starting the next -- so the bubble read as one long sentence with a
          fold in it. They are a different KIND of fact from the seating and the
          price: those describe the hall, these are what it can be sold in. */}
      {isHall ? (
        <div className="font-normal text-slate-400 dark:text-slate-500">
          {sittings.length
            ? sittings.map((one: any) => one.name).join(', ')
            : 'no sittings set — cannot be let'}
        </div>
      ) : null}

      {/* ⚠️ LINES OF THEIR OWN, and last. What a room OFFERS is a different
          kind of fact from what it is and whether it can be taken -- and it is
          the one somebody reads only after the first two lines have answered
          "can I sell this". Absent entirely on a room nothing is ticked on:
          an empty line reads as a fact that failed to load. */}
      {/* ⚠️ Both of these describe the room, so both go once it is taken --
          see `taken` above. They are what somebody reads while choosing a room;
          nobody chooses one that is gone. */}
      {!taken && facilities.length ? (
        <div className="font-normal text-slate-400 dark:text-slate-500">
          {facilities.join(' · ')}
        </div>
      ) : null}

      {!taken && room.description ? (
        <div className="max-w-xs font-normal italic text-slate-400 dark:text-slate-500">
          {room.description}
        </div>
      ) : null}
    </>,
  );

  return (
    <>
    <button
      type="button"
      /**
       * ⚠️ aria-disabled, NOT the disabled attribute, and the tooltip is the
       * reason.
       *
       * A disabled button fires no mouse events at all -- the browser stops
       * them before React sees them -- so the hover bubble never opened on
       * exactly the tiles that need it. A free room explained itself and a
       * booked one said nothing, which is the wrong way round: the header three
       * lines up already says a free room can be taken, while "why not, and
       * until when" is the whole of what a clerk wants from a tile they cannot
       * press.
       *
       * The press is refused in the handler instead, so the tile is inert to a
       * click and alive to a pointer. It also stays in the tab order, which a
       * disabled one leaves -- a reader using the keyboard can now hear why the
       * room is unavailable rather than skipping past it in silence.
       */
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (disabled) return;

        onSelect(room);
      }}
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
        {/* ⚠️ Pips are BEDS -- one mark per bed, so a six-bed dormitory reads
            at a glance. A hall has none of them; it has chairs, and four
            hundred of those is a number rather than a row of marks. */}
        {isHall ? (
          <span className="text-[0.55rem] leading-none opacity-75">
            {seats ? `${seats} seats` : 'no seating'}
            {sittings.length
              ? ` · ${sittings.length} ${sittings.length === 1 ? 'sitting' : 'sittings'}`
              : ' · no sittings'}
          </span>
        ) : backOn ? (
          // ⚠️ INSTEAD OF THE PIPS, not beside them. The tile holds three things
          // and the bed count is the one that can go: on a room nobody can take,
          // how many beds it has is not the fact being looked for. It comes back
          // the moment the room is free again.
          <span className="text-[0.55rem] font-semibold leading-none">free {backOn}</span>
        ) : active > MAX_PIPS ? (
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
