import React from 'react';

import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import { clockTime, money } from '../setupHelpers';

/**
 * The card a guest signs at check-in.
 *
 * ⚠️ THIS IS THE GUEST'S PAPER, NOT THE HOTEL'S. The register (RegisterPrint)
 * is what the hotel writes and a police officer reads. This is what the guest
 * puts their name to -- name, ID, address, room, rate, the dates, "I accept
 * the house rules" -- and it is the paper that settles an argument about the
 * rate or the check-out day a week later. Without it, the manager's word
 * against the guest's.
 *
 * One card per guest, two to an A4 sheet -- half a page each, which is the
 * size a desk keeps in a folder. A dormitory sold by the bed is one guest per
 * card the same way; the person signs, not the booking.
 *
 * Not on the print designer, for the reason the register is not: a card that
 * lost its NID line or its signature line because somebody dragged it off is a
 * card that fails at the only moment it matters.
 */

type Card = {
  room: string;
  rate: number | null;
  guest: {
    id?: number;
    name: string;
    mobile?: string | null;
    national_id?: string | null;
    address?: string | null;
    gender?: string | null;
    age?: number | null;
    is_child?: boolean;
    is_primary?: boolean;
  };
};

type Props = {
  data: {
    booking: {
      booking_no: string;
      booking_type: string;
      check_in_date: string;
      check_out_date: string;
      nights: number;
      booker_name?: string | null;
      booker_mobile?: string | null;
      stay_kind?: string;
    };
    times?: { check_in: string; check_out: string } | null;
    branch?: { name?: string | null; address?: string | null; phone?: string | null } | null;
    terms?: string;
    cards: Card[];
  };
};

/** Two cards to a sheet, never a card split across two. */
const pairs = <T,>(items: T[]): T[][] => {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    out.push(items.slice(index, index + 2));
  }
  return out.length ? out : [[]];
};

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="flex gap-2 border-b border-dotted border-gray-400 py-1">
    <span className="w-28 shrink-0 text-gray-600">{label}</span>
    <span className="flex-1 font-medium">{value ?? '—'}</span>
  </div>
);

const RegistrationCardPrint = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const { booking, times, branch, terms, cards } = data;

  // Paid stays print the rate; a complimentary or house-use stay prints the
  // word instead, so the guest is not asked to sign for money nobody will ask
  // them for.
  const rateLine = (card: Card) =>
    booking.stay_kind && booking.stay_kind !== 'paid'
      ? booking.stay_kind === 'house_use'
        ? 'House use — not charged'
        : 'Complimentary — not charged'
      : card.rate === null || card.rate === undefined
        ? '—'
        : `${money(card.rate)} per night`;

  return (
    <div ref={ref} className="print-root text-gray-900" style={{ fontSize: 11 }}>
      <PrintStyles />

      {pairs(cards).map((sheet, sheetIndex) => (
        <div key={sheetIndex} className="print-page">
          {sheet.map((card, index) => (
            <div
              key={card.guest.id ?? `${sheetIndex}-${index}`}
              className="avoid-break mb-6 rounded border border-gray-500 p-4"
              style={{ minHeight: '128mm' }}
            >
              {/* ⚠️ The BOOKING's branch, not the reader's -- the same rule
                  every hotel paper follows. */}
              <PadPrinting branch={branch ?? undefined} />

              <div className="mb-2 flex items-baseline justify-between">
                <h1 className="text-base font-bold uppercase tracking-wide">Guest Registration Card</h1>
                <span className="text-xs">
                  Booking <strong>{booking.booking_no}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6">
                <div>
                  <Field label="Guest" value={card.guest.name} />
                  <Field label="NID / Passport" value={card.guest.national_id || '—'} />
                  <Field label="Mobile" value={card.guest.mobile || '—'} />
                  <Field label="Address" value={card.guest.address || '—'} />
                  <Field
                    label="Gender / Age"
                    value={`${card.guest.gender ? card.guest.gender : '—'}${
                      card.guest.age !== null && card.guest.age !== undefined ? ` / ${card.guest.age}` : ''
                    }${card.guest.is_child ? ' (child)' : ''}`}
                  />
                </div>
                <div>
                  <Field label="Room" value={card.room} />
                  <Field label="Rate" value={rateLine(card)} />
                  <Field
                    label="Arrival"
                    value={`${formatDayMonthYear(booking.check_in_date)}${
                      times?.check_in ? `, from ${clockTime(times.check_in)}` : ''
                    }`}
                  />
                  <Field
                    label="Departure"
                    value={`${formatDayMonthYear(booking.check_out_date)}${
                      times?.check_out ? `, by ${clockTime(times.check_out)}` : ''
                    }`}
                  />
                  <Field
                    label="Nights"
                    value={`${booking.nights} ${Number(booking.nights) === 1 ? 'night' : 'nights'}`}
                  />
                </div>
              </div>

              {booking.booker_name && booking.booker_name !== card.guest.name ? (
                <div className="mt-2 text-xs text-gray-600">
                  Booked by {booking.booker_name}
                  {booking.booker_mobile ? ` · ${booking.booker_mobile}` : ''}
                </div>
              ) : null}

              {/* The property's own words, in whatever language it wrote them.
                  Kept as typed -- line breaks and all -- because a rule list
                  is a list. */}
              {terms?.trim() ? (
                <div className="mt-3 whitespace-pre-line border-t border-gray-300 pt-2 text-[0.85em] leading-snug text-gray-700">
                  {terms}
                </div>
              ) : null}

              <div className="mt-3 text-xs">
                I confirm the particulars above are correct and accept the rules of the house.
              </div>

              {/* Two lines, always. The guest's is the point of the paper; the
                  hotel's says who took it, which is what a dispute asks second. */}
              <div className="mt-8 flex justify-between gap-8 text-xs">
                <div className="w-56 border-t border-gray-500 pt-1 text-center">Guest's signature</div>
                <div className="w-56 border-t border-gray-500 pt-1 text-center">For the hotel</div>
              </div>
            </div>
          ))}

          {sheet.length === 0 ? (
            <div className="p-6 text-center text-sm">Nobody has been checked in yet.</div>
          ) : null}
        </div>
      ))}
    </div>
  );
});

RegistrationCardPrint.displayName = 'RegistrationCardPrint';

export default RegistrationCardPrint;
