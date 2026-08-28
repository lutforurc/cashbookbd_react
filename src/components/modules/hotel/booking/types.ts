/**
 * What the booking screen sends and what it reads back.
 *
 * A clerk thinks in ROOMS; the database thinks in seat-nights. The API folds
 * one into the other at both ends -- these shapes are the clerk's side of that,
 * and nothing here mentions a bed.
 */

import { LayoutBuilding } from '../types';

export type BookingType = 'individual' | 'group' | 'corporate';

export type BookingStatus =
  | 'hold'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'expired';

/**
 * What is free between two dates.
 *
 * ⚠️ It answers with the PROPERTY -- building, floor, room -- and not with a
 * list. That is deliberate: the booking screen draws the same grid the setup
 * screen's Layout tab draws, so a clerk who has learned to find room 302 on one
 * does not have to learn a second arrangement to book it. Each room is an
 * ordinary LayoutRoom carrying the extra fields of RoomState.
 */
export interface Availability {
  check_in_date: string;
  check_out_date: string;
  nights: number;
  buildings: LayoutBuilding[];
  free_count: number;
}

/** One person staying, as the allotment screen sends and reads them. */
export interface Guest {
  id?: number;
  name: string;
  mobile?: string | null;
  national_id?: string | null;
  address?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  age?: number | null;
  is_child?: boolean;
  /** The one guest per room whose ID was taken — set by the server, not sent. */
  is_primary?: boolean;
  /** A link to a party that already exists. Never created from here. */
  party_id?: number | null;
}

/** One room of a booking, on the day the guests arrive. */
export interface AllotmentRoom {
  room_id: number;
  display_name: string | null;
  capacity: number;
  let_as: 'whole' | 'seat';
  guests: Guest[];

  /**
   * The two things a room still needs, said separately — they are answered
   * by different people. An ID is asked of one guest; a mobile, of the room.
   */
  needs_identified: boolean;
  needs_mobile: boolean;
}

export interface Allotment {
  booking: Booking;
  rooms: AllotmentRoom[];
  /** Both numbers, never one. Booked for twelve and ten arrived is a fact. */
  stated: number;
  arrived: number;
  rooms_outstanding: number;
}

export interface Booking {
  id?: number;
  booking_no?: string;
  booking_date?: string;
  booking_type: BookingType;
  status: BookingStatus;

  check_in_date: string;
  check_out_date: string;
  /** Worked out by the database from the two dates, never sent. */
  nights?: number;

  booker_name: string;
  booker_mobile?: string | null;
  billed_to_party_id?: number | null;
  payment_terms?: string | null;

  stated_rooms?: number;
  stated_adults: number;
  stated_children: number;

  hold_until?: string | null;
  notes?: string | null;

  nights_count?: number;

  /** Only on a single read: the rooms held, folded back up out of the seats. */
  rooms?: {
    room_id: number;
    display_name: string | null;
    let_as: 'whole' | 'seat';
    beds: number;
    nights: string[];
    rent_total: number;
  }[];
}
