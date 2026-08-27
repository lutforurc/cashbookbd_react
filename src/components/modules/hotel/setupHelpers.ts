import { useEffect, useState } from 'react';
import {
  HotelBuilding,
  HotelFloor,
  HotelResource,
  HotelRoomType,
  HotelSlot,
  SaleMode,
} from './types';

/**
 * The small shared pieces of the four setup tabs.
 *
 * Here rather than repeated in each tab: a blank form that differs between two
 * tabs is how one of them ends up defaulting a new room to inactive, and
 * nobody notices until a room will not appear in a search.
 */

/** Status, as DropdownCommon wants it. Nothing here is ever deleted outright. */
export const STATUS_OPTIONS = [
  { id: 1, name: 'Active' },
  { id: 0, name: 'Inactive' },
];

/**
 * How a room is sold.
 *
 * The wording is deliberate. "By the seat" rather than "dormitory", because the
 * distinction is commercial rather than architectural -- the same four-bed room
 * can be let whole to a family in December and by the bed to four workers in
 * January, and "Either" is what that room is.
 */
export const SALE_MODE_OPTIONS = [
  { id: 'whole', name: 'Whole room only' },
  { id: 'seat', name: 'By the seat only' },
  { id: 'both', name: 'Either — whole or by the seat' },
];

/** Which rent a way of selling actually needs. */
export const needsWholeRent = (mode: SaleMode) => mode === 'whole' || mode === 'both';
export const needsSeatRent = (mode: SaleMode) => mode === 'seat' || mode === 'both';

export const blankBuilding = (): HotelBuilding => ({
  name: '',
  code: '',
  address: '',
  notes: '',
  sort_order: 0,
  status: 1,
});

export const blankSlot = (): HotelSlot => ({
  code: '',
  name: '',
  // An evening sitting, because that is the one every community centre sells
  // first -- and a form that opens on 00:00-00:00 is one nobody can save.
  start_time: '18:00',
  end_time: '23:00',
  ends_next_day: false,
  sort_order: 0,
  status: 1,
});

export const blankFloor = (buildingId: number | null = null): HotelFloor => ({
  building_id: buildingId,
  name: '',
  // Ground is 0 and a basement is -1, so this is a real value rather than a
  // stand-in for "not filled in yet".
  floor_no: 0,
  notes: '',
  status: 1,
});

export const blankRoomType = (): HotelRoomType => ({
  name: '',
  code: '',
  capacity: 2,
  default_seat_count: 1,
  default_sale_mode: 'whole',
  default_whole_rent: '',
  default_seat_rent: '',
  description: '',
  sort_order: 0,
  status: 1,
});

export const blankRoom = (kindId: number | null = null): HotelResource => ({
  resource_type_id: kindId,
  building_id: null,
  floor_id: null,
  room_type_id: null,
  code: '',
  name: '',
  sale_mode: 'whole',
  capacity: 2,
  rent: '',
  seat_count: 1,
  seat_rent: '',
  notes: '',
  sort_order: 0,
  status: 1,
});

/**
 * A value that settles before it is used.
 *
 * Typing "Deluxe" into the search box is six keystrokes and would be six
 * requests, five of whose answers arrive to be thrown away -- and, on a slow
 * line, in the wrong order, so the list ends up showing the results for "Delu".
 */
export const useDebounced = <T,>(value: T, delay = 350): T => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
};

/**
 * Money, as a bill would read it -- or a dash where there is none.
 *
 * The dash matters. A room sold only by the bed has no whole-room rent, and
 * showing that as 0.00 would read as free rather than as not-for-sale-that-way.
 */
export const money = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—';

  const number = Number(value);

  if (Number.isNaN(number)) return '—';

  return number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * The numbers a run of rooms will be given: 301, asked for four times over,
 * reads back 301, 302, 303, 304.
 *
 * ⚠️ A preview, and nothing more. The server counts the run out again from the
 * same rule and is the one that decides; this exists so that a mistyped start
 * is seen before it is sent rather than after twelve rooms exist.
 *
 * The trailing digits are what moves and anything in front of them is kept, so
 * A-01 runs A-01..A-04. So is the width they were typed at -- which is why a
 * run started at 01 reaches 10 and never 010.
 *
 * An empty list means the start is one nothing can be counted from. The caller
 * shows that as a sentence rather than as an empty preview.
 */
export const runOfCodes = (start: string, count: number): string[] => {
  const parts = /^(.*?)(\d+)$/.exec((start ?? '').trim());

  if (!parts || !Number.isFinite(count) || count < 1) return [];

  const [, prefix, digits] = parts;
  const first = Number(digits);

  return Array.from(
    { length: count },
    (_, n) => prefix + String(first + n).padStart(digits.length, '0'),
  );
};

/** Text as a number for the API, or null where the box was left empty. */
export const numberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || String(value).trim() === '') return null;

  const number = Number(value);

  return Number.isNaN(number) ? null : number;
};

/**
 * "14:00" as a person says it: 2:00 PM. Noon and midnight by name.
 *
 * The setting is stored as HH:MM because that is what a time input sends and
 * what sorts correctly; nobody at a desk says "fourteen hundred". Noon is
 * spelt out rather than shown as 12:00 PM, which reads as ambiguous to enough
 * people to be worth the two extra words.
 */
export const clockTime = (value?: string | null): string => {
  if (!value) return '—';

  const [h, m] = value.split(':').map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) return value;

  if (h === 12 && m === 0) return '12:00 noon';
  if (h === 0 && m === 0) return 'midnight';

  const hour = h % 12 === 0 ? 12 : h % 12;

  return `${hour}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
