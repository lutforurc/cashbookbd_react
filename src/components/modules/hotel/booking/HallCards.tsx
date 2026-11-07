import { BOOKING_LOOKS } from '../layoutPalette';
import { money } from '../setupHelpers';
import formatDate from '../../../utils/utils-functions/formatDate';

/**
 * The halls, one card each -- on New Booking and on Hall Booking alike.
 *
 * Drawn exactly the way a BUILDING is drawn: the same heading, a grey band where
 * a floor would be, and a tile per sitting at the size of a room tile. The room
 * grid stands right above it on New Booking, so the clerk learns one picture,
 * and teal is free and rose is booked in both halves (layoutPalette).
 */

export interface HallCard {
  id: number;
  code?: string;
  name: string;
  building?: string | null;
  capacity?: number | null;
  rent: number | string | null;
  days: { date: string; sittings: any[] }[];
}

interface HallCardsProps {
  cards: HallCard[];
  isChosen: (hallId: number, slotId: number, date: string) => boolean;
  /** Sittings this booking already holds: they stay clickable, whatever they say. */
  isOurs?: (hallId: number, slotId: number, date: string) => boolean;
  onToggle: (card: HallCard, cell: any, date: string) => void;
}

/**
 * Chosen is marked the way a chosen room is: its own colour and a ring. It used
 * to borrow the checked-in purple, badge and all, and a sitting being picked read
 * "IN" as though somebody were already in the hall.
 */
const lookOfSitting = (cell: any, chosen: boolean) => {
  if (chosen || cell.state === 'free') return BOOKING_LOOKS.free;
  if (cell.state === 'closed') return BOOKING_LOOKS.closed ?? BOOKING_LOOKS.booked;

  return BOOKING_LOOKS[cell.state] ?? BOOKING_LOOKS.booked;
};

const HallCards = ({ cards, isChosen, isOurs, onToggle }: HallCardsProps) => (
  <div className="flex flex-wrap items-start gap-4">
    {cards.map((card) => (
      <div key={card.id} className="max-w-full rounded border border-stroke dark:border-strokedark">
        <div className="border-b border-stroke px-3 py-2 dark:border-strokedark">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-black dark:text-white">{card.name}</span>
            <span className="text-xs text-gray-400">{card.code}</span>
          </div>

          <div className="text-xs text-gray-700 dark:text-gray-200">
            {card.building ? `${card.building} · ` : ''}
            {card.capacity ? `${card.capacity} seats` : 'no seating set'}
            {/* §2.8: on a hall the rent is the price of ONE sitting. The room
                card beside it means the other thing by "rent". */}
            {card.rent === null ? ' · no rate set' : ` · ${money(card.rent)} a sitting`}
          </div>
        </div>

        <div className="flex flex-col gap-2 p-2">
          {card.days.map((day) => (
            <div
              key={day.date}
              className="flex flex-col gap-2 rounded-r border-l-[3px] border-primary bg-gray-50 p-1.5 dark:border-secondary dark:bg-white/5 sm:flex-row sm:items-stretch"
            >
              {/* The day sits where a floor sits on the room grid, marked the
                  same quiet way, for the same reason: the eye runs down it. The
                  weekday is what a wedding is arranged around. */}
              <span className="flex shrink-0 items-baseline gap-2 whitespace-nowrap px-1 sm:w-20 sm:flex-col sm:items-center sm:justify-center sm:gap-0 sm:px-0 sm:text-center">
                <span className="text-sm font-bold leading-tight text-primary dark:text-secondary">
                  {formatDate(day.date)}
                </span>
                <span className="text-[0.65rem] leading-tight text-gray-500 dark:text-gray-400">
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })}
                </span>
              </span>

              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {day.sittings.map((cell: any) => {
                  const chosen = isChosen(card.id, cell.slot_id, day.date);
                  const look = lookOfSitting(cell, chosen);
                  const dead =
                    cell.state !== 'free'
                    && !chosen
                    && !isOurs?.(card.id, cell.slot_id, day.date);

                  // The reason is a sentence, not a colour: "roof leak" and "held
                  // for the whole day" are different problems. With nothing
                  // against it, the line says what it costs.
                  const note =
                    cell.blocked_reason
                    || cell.taken_by
                    || (card.rent === null ? '' : money(card.rent));

                  return (
                    <button
                      key={cell.slot_id}
                      type="button"
                      disabled={dead}
                      onClick={() => onToggle(card, cell, day.date)}
                      title={cell.blocked_reason || cell.taken_by || cell.label || cell.slot}
                      className={`flex w-[calc(50%-0.1875rem)] shrink-0 flex-col items-start gap-1.5 rounded-md border px-3 py-3 text-left shadow-sm transition sm:w-32 ${look.className} ${
                        dead
                          ? 'cursor-not-allowed'
                          : 'hover:-translate-y-0.5 hover:shadow-md hover:brightness-95 dark:hover:brightness-125'
                      } ${chosen ? 'shadow-md ring-2 ring-inset ring-primary' : ''}`}
                    >
                      <span className="flex w-full items-baseline justify-between gap-1">
                        <span className="min-w-0 truncate text-sm font-semibold leading-none">
                          {cell.slot}
                        </span>
                        {/* Beside the colour, never instead of it -- the same
                            rule the room tiles follow. */}
                        <span className="text-[0.6rem] font-bold uppercase leading-none opacity-70">
                          {chosen ? 'TAKING' : look.badge}
                        </span>
                      </span>

                      <span className="block w-full truncate text-xs leading-tight opacity-80">
                        {note || ' '}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default HallCards;
