import { LayoutRoom } from './types';

/**
 * What a room tile is coloured by, and what it says beside the colour.
 *
 * ⚠️ Every tile carries a short BADGE as well as a colour, and that is not
 * decoration. Colour alone cannot carry the meaning here for two reasons: red
 * and green is the first pair colour blindness takes, and none of it survives a
 * black-and-white printer -- which this page is meant to be printed on. The
 * badge is what the legend and the tile agree on when the colour is gone.
 *
 * One meaning at a time. The switcher picks which; painting type, sale mode and
 * status at once would leave none of the three readable.
 *
 * The list is written to be extended in exactly one place. When bookings exist,
 * "Availability" joins it as a fourth mode and the grid that draws it does not
 * change -- which is the whole reason the colour lives here rather than inside
 * the component.
 */

export type ColourMode = 'room_type' | 'sale_mode' | 'status';

export interface TileLook {
  /** Tailwind classes for the tile: background, border, ink. Light and dark. */
  className: string;
  /** The two or three characters printed in the tile's corner. */
  badge: string;
  /** What the legend calls it. */
  label: string;
}

/**
 * Eight colours for the things there can be any number of -- room types.
 *
 * Deliberately no red/green pair among them, and each is given at a weight that
 * still reads as a colour on a dark screen rather than as a black square.
 */
const PALETTE = [
  'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-500/20 dark:border-blue-500/50 dark:text-blue-100',
  'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-500/20 dark:border-violet-500/50 dark:text-violet-100',
  'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-100',
  'bg-teal-100 border-teal-300 text-teal-900 dark:bg-teal-500/20 dark:border-teal-500/50 dark:text-teal-100',
  'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-500/20 dark:border-rose-500/50 dark:text-rose-100',
  'bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-500/20 dark:border-cyan-500/50 dark:text-cyan-100',
  'bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-500/20 dark:border-orange-500/50 dark:text-orange-100',
  'bg-indigo-100 border-indigo-300 text-indigo-900 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-100',
];

/** A room with no type at all, and the fallback for anything unrecognised. */
const NEUTRAL =
  'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-500/20 dark:border-gray-500/50 dark:text-gray-200';

const SALE_LOOKS: Record<string, { className: string; badge: string; label: string }> = {
  whole: { className: NEUTRAL, badge: 'W', label: 'Whole room only' },
  seat: {
    className:
      'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-500/20 dark:border-violet-500/50 dark:text-violet-100',
    badge: 'S',
    label: 'By the seat only',
  },
  both: {
    className:
      'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-100',
    badge: 'B',
    label: 'Either way',
  },
};

const STATUS_LOOKS = {
  active: {
    className:
      'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-100',
    badge: 'A',
    label: 'Active',
  },
  inactive: {
    // Not red. An inactive room is not a fault -- it is a room kept so that
    // last year's bookings still read, and colouring it as an error would say
    // otherwise.
    className:
      'bg-gray-100 border-gray-300 text-gray-400 dark:bg-gray-700/40 dark:border-gray-600 dark:text-gray-500',
    badge: 'I',
    label: 'Inactive — kept for older bookings',
  },
};

/**
 * Room types get their colour from where they sit in the property's own list.
 *
 * By id rather than by name, so that renaming "Deluxe" does not repaint the
 * building, and so two properties with different type lists each get a full
 * spread rather than everything landing on blue.
 */
export const buildTypeIndex = (typeIds: number[]): Record<number, number> => {
  const index: Record<number, number> = {};

  [...new Set(typeIds)]
    .sort((a, b) => a - b)
    .forEach((id, position) => {
      index[id] = position % PALETTE.length;
    });

  return index;
};

export const lookOf = (
  room: LayoutRoom,
  mode: ColourMode,
  typeIndex: Record<number, number>,
): TileLook => {
  // An inactive room is drawn as inactive whatever the switcher says. Painting
  // it in its room type's colour would put a room that cannot be sold in among
  // the ones that can, looking identical.
  if (Number(room.status) !== 1) {
    return { ...STATUS_LOOKS.inactive, badge: room.room_type_code || STATUS_LOOKS.inactive.badge };
  }

  if (mode === 'status') {
    return STATUS_LOOKS.active;
  }

  if (mode === 'sale_mode') {
    return SALE_LOOKS[room.sale_mode] ?? { className: NEUTRAL, badge: '?', label: room.sale_mode };
  }

  const position = room.room_type_id != null ? typeIndex[room.room_type_id] : undefined;

  return {
    className: position === undefined ? NEUTRAL : PALETTE[position],
    // The room type's own short code -- STD, DLX -- rather than an invented
    // letter, because "Standard" and "Suite" both begin with S.
    badge: room.room_type_code || (room.room_type_id ? '·' : '—'),
    label: room.room_type || 'No room type',
  };
};

export const COLOUR_MODES: { id: ColourMode; name: string }[] = [
  { id: 'room_type', name: 'Room type' },
  { id: 'sale_mode', name: 'How it is sold' },
  { id: 'status', name: 'Status' },
  // Availability lands here when bookings exist. Nothing else has to move.
];

export { SALE_LOOKS, STATUS_LOOKS, PALETTE, NEUTRAL };
