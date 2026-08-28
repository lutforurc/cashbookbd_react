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

/**
 * A sitting: the part of a day a hall is let for.
 *
 * ⚠️ The times are not decoration. Two slots that share an hour can both be
 * sold for one date, and the hall would hold two events at once -- the server
 * refuses the overlapping pair, and this is the shape it checks.
 */
export interface HotelSlot {
  id?: number;
  code: string;
  name: string;
  /** HH:mm. An evening running to 01:00 ends before it starts, hence the flag. */
  start_time: string;
  end_time: string;
  ends_next_day: boolean;
  sort_order: number;
  status: number;

  serial_no?: number;
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

/**
 * Something a room offers: AC, Wi-Fi, a balcony, a projector.
 *
 * ⚠️ THE COMPANY'S list, not a property's -- a company running two hotels ticks
 * the same word on rooms in both, and two lists would be two spellings of one
 * facility within a season. Which is why nothing about it carries a branch.
 *
 * `applies_to` keeps the two vocabularies apart. A projector is not a bedroom
 * facility and a wardrobe is not a hall one, and a form offering all of both is
 * a list nobody reads to the end.
 */
export interface HotelFacility {
  id?: number;
  code?: string | null;
  name: string;
  applies_to: 'room' | 'hall' | 'both';
  sort_order?: number;
  status: number;

  serial_no?: number;
  /** How many rooms tick it. The number that makes deleting one a decision. */
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
  /**
   * ⚠️ THE DESK'S, not the guest's -- "key sticks, engineering told". Kept
   * apart from `description` on purpose: that one rides onto the tile, the
   * booking screen and the bill, and a housekeeping remark must not take that
   * ride.
   */
  notes?: string | null;
  /** For the guest: what the room offers, in the words no tick list holds. */
  description?: string | null;
  sort_order?: number;
  status: number;

  /**
   * The tick list, by id -- what the form sends.
   *
   * ⚠️ AN EMPTY ARRAY AND UNDEFINED ARE DIFFERENT ANSWERS to the server. Empty
   * means "this room offers none of them" and clears the list; leaving the key
   * off means "I am not talking about facilities" and keeps what is there.
   */
  facility_ids?: number[];

  /** Sent by the room form; the server writes the seat rows from them. */
  seat_count?: number;
  seat_rent?: number | string | null;

  /** Read-only. */
  serial_no?: number;
  display_name?: string;
  seats_count?: number;
  active_seats_count?: number;
  seats?: HotelResource[];
  /** Read-only: the ticked rows themselves, for the chips in the list. */
  facilities?: HotelFacility[];
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

  /** A facility says which kind of thing it may be ticked on. */
  applies_to?: 'room' | 'hall' | 'both';

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

  /**
   * What the room offers and what its own sentence says.
   *
   * Both go in the TOOLTIP rather than on the tile. The tile holds three things
   * and no more -- see RoomTile -- and a fourth at that size is a tile nobody
   * can read from across a desk. `facilities` is empty rather than absent on a
   * room nothing is ticked on.
   */
  facilities?: string[];
  description?: string | null;

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

  /**
   * The parts of a day this hall is let in, or null on a room.
   *
   * ⚠️ They belong to the PROPERTY, not to the hall -- every hall on a branch
   * is let in the same sittings, and the list is repeated onto each so the tile
   * can draw it without a second lookup. An empty list on a hall means it
   * cannot be let at all.
   */
  sittings?: { id: number; name: string; label?: string }[] | null;
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

/**
 * When the day turns over at a property.
 *
 * ⚠️ check_out is always earlier than check_in, and the booking engine depends
 * on it: a stay of the 15th to the 18th holds three nights and leaves the 18th
 * for the next guest, which is honest only while the last one has gone before
 * the next arrives. The branch form refuses to save them the other way round.
 */
export interface HotelTimes {
  /** HH:MM. */
  check_in: string;
  check_out: string;

  /**
   * How long a hold keeps a room, in hours, and the longest the desk may ask
   * for.
   *
   * ⚠️ Sent so the booking form can SAY it. It read "a hold keeps the rooms for
   * seven days" in fixed words while the property held them for one hour -- a
   * sentence on the screen arguing with the sweep, and the clerk believing the
   * screen.
   */
  hold_hours?: number;
  hold_max_hours?: number;
  /** The branch as its own edit URL spells it, for the Change link. */
  branch_ref?: string;
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
  /** Halls and community centres, counted apart from the rooms. */
  halls_count?: number;
  /** Their seating, counted apart from the beds. */
  seats_count?: number;
}
