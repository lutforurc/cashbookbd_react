/**
 * The five hotel master tables, as the screens see them.
 *
 * Two things here are worth reading before writing against them.
 *
 * A room and a seat are the SAME shape -- both are `HotelResource` rows in
 * `booking_resources`, and what tells them apart is `parent_id`: 0 on a room,
 * the room's id on a seat. That is not an accident of storage. The seat is the
 * inventory the booking engine will lock, and whole-room availability is
 * derived from the seats rather than counted beside them, so that the two can
 * never disagree.
 *
 * And `rent` is per row. On a room it is what the whole room costs for a night;
 * on a seat it is what that bed costs. They are never added together -- a seat
 * rate is not the room rate divided by the beds.
 */

/** What kind of thing a resource is. Shipped with the system, not editable. */
export interface ResourceKind {
  id: number;
  code: 'room' | 'seat' | 'hall' | 'community_centre' | 'ticketed_item' | string;
  name: string;
  rate_unit: 'night' | 'slot' | 'day' | 'hour' | 'piece' | string;
  default_allocation_mode: 'exclusive' | 'capacity' | string;
  is_selectable: number;
}

export interface HotelBuilding {
  id?: number;
  name: string;
  code?: string | null;
  address?: string | null;
  notes?: string | null;
  sort_order?: number;
  status: number;

  /** Read-only, from the list endpoint. */
  serial_no?: number;
  floors_count?: number;
  rooms_count?: number;
}

export interface HotelFloor {
  id?: number;
  building_id: number | null;
  name: string;
  /** Ground is 0 and a basement is -1, which is why it may be negative. */
  floor_no: number;
  notes?: string | null;
  status: number;

  serial_no?: number;
  rooms_count?: number;
  building?: { id: number; name: string; code?: string | null };
}

/**
 * A room category.
 *
 * Everything named `default_*` fills the room form in and is read nowhere else.
 * Editing "Deluxe" from 3,000 to 3,500 does not move a single room that already
 * exists -- rooms carry their own rent, and a bill will carry what it was made
 * with.
 */
export interface HotelRoomType {
  id?: number;
  name: string;
  code?: string | null;
  capacity: number;
  default_seat_count: number;
  default_sale_mode: SaleMode;
  default_whole_rent?: number | string | null;
  default_seat_rent?: number | string | null;
  description?: string | null;
  sort_order?: number;
  status: number;

  serial_no?: number;
  rooms_count?: number;
}

/** How a room is sold. A seat follows its room and is never asked. */
export type SaleMode = 'whole' | 'seat' | 'both';

/**
 * A room, a hall, a ticketed item -- or one bed inside a room.
 *
 * `seat_count` and `seat_rent` are write-only conveniences the room form sends:
 * the server turns them into seat rows. They never come back on a read, because
 * what comes back is the seats themselves.
 */
export interface HotelResource {
  id?: number;
  resource_type_id: number | null;
  parent_id?: number;
  building_id: number | null;
  floor_id?: number | null;
  room_type_id?: number | null;

  /** The room's own number -- "101", never "ANX-101". */
  code: string;
  /** Only where a name is not simply the number: "Rose Hall". */
  name?: string | null;

  allocation_mode?: string;
  sale_mode: SaleMode;
  capacity: number;
  /** What THIS row costs for one unit of its kind's rate unit. */
  rent?: number | string | null;
  notes?: string | null;
  sort_order?: number;
  status: number;

  /** Sent by the room form; the server writes the seat rows from them. */
  seat_count?: number;
  seat_rent?: number | string | null;

  /** Read-only. */
  serial_no?: number;
  display_name?: string;
  seats_count?: number;
  active_seats_count?: number;
  seats?: HotelResource[];
  type?: ResourceKind;
  building?: { id: number; name: string; code?: string | null };
  floor?: { id: number; name: string; floor_no?: number };
  room_type?: { id: number; name: string; code?: string | null };
  roomType?: { id: number; name: string; code?: string | null };
}

export interface DdlOption {
  value: number;
  label: string;
  label_2?: string | null;

  /** Room types carry their defaults down so the form can fill itself in. */
  capacity?: number;
  default_seat_count?: number;
  default_sale_mode?: SaleMode;
  default_whole_rent?: number | string | null;
  default_seat_rent?: number | string | null;
}

export interface Paged<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
}

/**
 * The elevation grid's shape — the whole property in one answer.
 *
 * A building holds floors, a floor holds rooms, and a room carries a SUMMARY of
 * its beds rather than the beds themselves. The grid only ever draws a count
 * and a price range; clicking a room fetches the beds through `resourceEdit`,
 * which already returns them.
 *
 * `unfloored` is not an oversight. A resort's cottages have no floors, and
 * neither does a room whose floor has not been said yet — they are shown in a
 * group of their own rather than under a floor invented to hold them.
 */
/**
 * What a room is doing on the dates being looked at.
 *
 * Only ever set by the availability read — the setup screen leaves it
 * undefined, and a room with no state is simply a room, which is what the
 * Layout tab draws.
 *
 * `part` is its own state rather than a kind of `booked` on purpose: a room
 * with two of its four beds sold cannot be let whole, but it is not taken
 * either, and telling a clerk "taken" would be a lie they could not act on.
 */
export type RoomState = 'free' | 'held' | 'booked' | 'checked_in' | 'part' | 'closed';

export interface LayoutRoom {
  id: number;
  code: string;
  name: string | null;
  display_name: string;
  kind: string | null;
  room_type_id: number | null;
  room_type: string | null;
  /** What the tile prints beside its colour — STD, DLX. */
  room_type_code: string | null;
  sale_mode: SaleMode;
  capacity: number;
  rent: string | number | null;
  status: number;

  beds: number;
  /** Beds still in use. The rest are switched off and kept, never deleted. */
  active_beds: number;

  /* ---- Only on the availability read. Undefined on the setup screen. ---- */

  state?: RoomState;
  /** Beds free for EVERY night asked for. */
  free_beds?: number;
  /** Why it cannot be taken, in words, or null where it can. */
  blocked_reason?: string | null;
  /** Which booking has it, for the tooltip — never for a decision. */
  taken_by?: string | null;

  /**
   * The beds, where they can be bought one at a time.
   *
   * Empty on a room sold only whole — listing its beds would invite somebody to
   * offer them for sale. So an empty array is the answer "this room is picked
   * as a room", not "this room has no beds".
   */
  seats?: LayoutSeat[];
  seat_rent_min: string | number | null;
  seat_rent_max: string | number | null;
}

/** One bed of a room sold by the bed. */
export interface LayoutSeat {
  id: number;
  code: string;
  name: string | null;
  /** Its OWN rent. Never the room's over the beds — see spec 2.8. */
  rent: string | number | null;
  state: 'free' | 'held' | 'booked' | 'checked_in';
  taken_by?: string | null;
}

export interface LayoutFloor {
  id: number;
  name: string;
  floor_no: number;
  status: number;
  rooms: LayoutRoom[];
}

export interface LayoutBuilding {
  id: number;
  name: string;
  code: string | null;
  status: number;

  /** Ground first, as the API sends it. The grid reverses it to stack upward. */
  floors: LayoutFloor[];
  unfloored: LayoutRoom[];

  rooms_count: number;
  beds_count: number;
  rent_min: number | null;
  rent_max: number | null;
  seat_rent_min: number | null;
  seat_rent_max: number | null;
}
