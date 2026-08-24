import { useEffect, useState } from 'react';
import { HotelBuilding, HotelFloor, HotelResource, HotelRoomType, SaleMode } from './types';

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

/** Text as a number for the API, or null where the box was left empty. */
export const numberOrNull = (value: any): number | null => {
  if (value === null || value === undefined || String(value).trim() === '') return null;

  const number = Number(value);

  return Number.isNaN(number) ? null : number;
};
